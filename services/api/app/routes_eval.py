"""Independent evaluation, annotation and provenance routes (Improvement 3).

Included in main.py before the legacy handlers so /evaluation and /stress-test here take precedence.
"""
import json
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from . import annotation, provenance
from .auth import get_user
from .benchmark import _metrics, baseline_rules, engine_rules
from .benchmark_v2 import items_for
from .db import get_db
from .models import REVIEWS, STRESS_AMBIGUOUS, STRESS_SCORES

router = APIRouter()
LATEST = Path(__file__).resolve().parent.parent / "evals" / "results" / "latest.json"
NO_ID = {"_id": 0}


def load_latest() -> dict | None:
    try:
        return json.loads(LATEST.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _run_live(items: list[dict]) -> dict:
    out = {}
    for name, fn in (("engine", engine_rules), ("baseline", baseline_rules)):
        rows = []
        for x in items:
            rules = fn(x["text"])
            rows.append({"text": x["text"], "label": x["risky"], "rule": x["rule"], "rules": rules, "pred": bool(rules)})
        out[name] = _metrics(rows)
    return out


@router.get("/evaluation")
def evaluation(set: Literal["v1", "v2"] = "v1", user: dict = Depends(get_user)):
    items = items_for(set)
    live = _run_live(items)
    latest = load_latest()
    others, meta = [], None
    if latest:
        meta = latest.get("run_meta")
        sysd = (latest.get("sets", {}).get(set) or {}).get("systems", {})
        others = [{"system": k, **v} for k, v in sysd.items() if k not in ("engine", "baseline")]
    return {
        "set": set,
        "note": (f"Measured on the {len(items)}-example seeded benchmark ({set}; fictional Nimbus Shield). Labels were written by the "
                 "prototype authors, not independent annotators; see /annotation/agreement for real inter-annotator "
                 "agreement. engine and baseline are computed live; other systems come from the committed "
                 "evals/results/latest.json."),
        "n": len(items), "risky": sum(1 for x in items if x["risky"]),
        "subsets": {s: sum(1 for x in items if x["subset"] == s) for s in sorted({x["subset"] for x in items})},
        "engine": live["engine"], "baseline": live["baseline"],
        "other_systems": others, "other_systems_run_meta": meta,
        "other_systems_status": "from latest.json" if latest else "not run: no evals/results/latest.json committed",
    }


@router.get("/evaluation/external")
def evaluation_external(user: dict = Depends(get_user)):
    latest = load_latest()
    ext = (latest or {}).get("external")
    note = ("External check on VitaminC (Wikipedia claim + evidence, labels SUPPORTS/REFUTES/NOT ENOUGH INFO). Domain "
            "caveat: this is Wikipedia text, not marketing copy; it is used only to check the verification stage on "
            "independently labelled data. No training or fine-tuning was done. Dataset: CC BY-SA 3.0, Schuster et al., "
            "NAACL 2021.")
    if not ext or ext.get("status") != "measured":
        return {"status": "not yet measured", "note": note,
                "detail": (ext or {}).get("reason", "No external run recorded; run evals/run_evals.py"),
                "majority_baseline": (ext or {}).get("majority_baseline"), "run_meta": (latest or {}).get("run_meta")}
    return {**ext, "note": note, "run_meta": latest.get("run_meta")}


# ---------------------------------------------------------------- annotation
class LabelIn(BaseModel):
    item_id: str
    label: Literal["risky", "safe"]


@router.get("/annotation/queue")
def annotation_queue(limit: int = Query(20, ge=1, le=100), user: dict = Depends(get_user)):
    return {"items": annotation.queue(user["id"], limit)}  # text only: no author label, no rule


@router.post("/annotation/labels")
def annotation_label(body: LabelIn, user: dict = Depends(get_user)):
    if body.item_id not in {x["id"] for x in items_for("v2")}:
        raise HTTPException(422, "Unknown item_id")
    return annotation.upsert_label(user["id"], body.item_id, body.label)


@router.get("/annotation/agreement")
def annotation_agreement(user: dict = Depends(get_user)):
    return annotation.agreement()


@router.get("/stress-test")
def stress_test(user: dict = Depends(get_user)):
    db = get_db()
    scores = list(db[STRESS_SCORES].find({}, NO_ID))
    real = annotation.per_rule_kappa() if annotation.agreement()["status"] == "measured" else {}
    out = []
    for s in scores:
        r = real.get(s["id"])
        if r:
            out.append({**s, "kappa": r["kappa"], "source": "annotators", "annotated_items": r["items"],
                        "clarity_source": "seeded"})
        else:
            out.append({**s, "source": "seeded"})
    return {"scores": out, "ambiguous": list(db[STRESS_AMBIGUOUS].find({}, NO_ID))}


# ---------------------------------------------------------------- provenance
@router.get("/reviews/{rid}/proof/c2pa")
def proof_c2pa(rid: str, user: dict = Depends(get_user)):
    r = get_db()[REVIEWS].find_one({"id": rid}, NO_ID)
    if not r:
        raise HTTPException(404, "Review not found")
    if not r.get("proof"):
        raise HTTPException(409, "No proof card: review has not been decided")
    if not provenance.AVAILABLE:
        raise HTTPException(501, "c2pa-python is not available on this platform")
    png = provenance.sign_card(r["proof"], r["title"])
    return Response(png, media_type="image/png", headers={
        "Content-Disposition": f'attachment; filename="proof-card-{rid[:8]}.png"',
        "X-Conformance": provenance.CONFORMANCE,
        "X-Certificate-Note": "self-signed demo certificate, not a trusted CA"})


@router.post("/provenance/verify")
async def provenance_verify(file: UploadFile = File(...), user: dict = Depends(get_user)):
    data = await file.read()
    if not data or len(data) > 8_000_000:
        raise HTTPException(422, "Upload a PNG up to 8 MB")
    return provenance.verify_png(data)
