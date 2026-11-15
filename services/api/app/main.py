"""Threadline API. Rules-based Reader Lens (not an LLM); people make every decision."""
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import proof
from .auth import create_token, get_user, public_user, verify_password
from .benchmark import evaluate
from .db import get_db
from .engine import analyze
from . import seed_data as sd
from .models import (ACTIVITY, AUDIT, BLAST_DEPS, CONTENT, EVIDENCE_EDGES, EVIDENCE_NODES, PRECEDENTS, REVIEWS, RULES,
                     STRESS_AMBIGUOUS, STRESS_SCORES, TREND, USERS)
from .schemas import AnalyzeIn, CommentIn, DecisionIn, LoginIn, ReviewIn, VerifyIn

NO_ID = {"_id": 0}


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_db()  # connect + idempotent seed
    yield


app = FastAPI(title="Threadline API", version="0.1.0", lifespan=lifespan)
_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["*"], allow_headers=["*"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def audit(review_id: str, action: str, user: dict, detail: dict | None = None) -> None:
    """Append-only: audit events are only ever inserted, never updated or deleted."""
    db = get_db()
    seq = db[AUDIT].count_documents({"review_id": review_id}) + 1
    db[AUDIT].insert_one({"id": str(uuid.uuid4()), "review_id": review_id, "seq": seq, "action": action,
                          "actor_id": user["id"], "actor_name": user["name"], "actor_role": user["role"],
                          "detail": detail or {}, "at": now()})


def _review_or_404(rid: str) -> dict:
    r = get_db()[REVIEWS].find_one({"id": rid}, NO_ID)
    if not r:
        raise HTTPException(404, "Review not found")
    return r


@app.get("/health")
def health():
    return {"status": "ok", "engine": "heuristic-rules"}


@app.post("/auth/login")
def login(body: LoginIn):
    u = get_db()[USERS].find_one({"email": body.email.strip().lower()})
    if not u or not verify_password(body.password, u["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return {"token": create_token(u["id"]), "user": public_user(u)}


@app.get("/auth/demo-accounts")
def demo_accounts():
    """Public list of the seeded fictional demo users (emails and roles only, never hashes)."""
    return {"password_hint": "demo1234", "accounts": [
        {"email": u["email"], "name": u["name"], "title": u["title"], "role": u["role"]}
        for u in get_db()[USERS].find({}, NO_ID)]}


@app.get("/auth/me")
def me(user: dict = Depends(get_user)):
    return public_user(user)


@app.get("/rules")
def rules(user: dict = Depends(get_user)):
    return list(get_db()[RULES].find({}, NO_ID))


@app.get("/content")
def content(user: dict = Depends(get_user)):
    return list(get_db()[CONTENT].find({}, NO_ID))


_RISKS = ["Low", "Medium", "High", "Critical"]


def _audit_text(e: dict, titles: dict) -> tuple[str, str]:
    d = e.get("detail") or {}
    what = {"submitted": "submitted for review", "comment": "commented on", "proof_issued": "issued a Proof Card for",
            "decision": "approved" if d.get("decision") == "approve" else "requested changes on"}.get(e["action"], e["action"])
    return what, titles.get(e["review_id"], "a review")


@app.get("/overview")
def overview(user: dict = Depends(get_user)):
    db = get_db()
    items = list(db[CONTENT].find({}, NO_ID))
    reviews = list(db[REVIEWS].find({}, {"_id": 0, "id": 1, "title": 1, "status": 1}))
    n = len(items)
    flagged = sum(1 for c in items if c["risk"] in ("High", "Critical"))
    approved = sum(1 for c in items if c["status"] == "Approved")
    fixes = sum(1 for c in items if c["status"] == "Needs fix")
    pending = sum(1 for r in reviews if r["status"] == "pending")
    decided = sum(1 for r in reviews if r["status"] in ("approved", "changes_requested"))
    kpis = [
        {"key": "content", "label": "Content items tracked", "value": n, "delta": f"{pending} reviews awaiting a person", "tone": "teal", "live": True},
        {"key": "flagged", "label": "Flagged for human review", "value": flagged, "delta": "High or Critical risk", "tone": "terra", "live": True},
        {"key": "approved", "label": "Approved by people", "value": approved, "delta": f"{round(100 * approved / n) if n else 0}% of content; {decided} reviews decided", "tone": "teal", "live": True},
        {"key": "fixes", "label": "Open fix tasks", "value": fixes, "delta": "Content marked Needs fix", "tone": "terra", "live": True},
    ]
    risk_mix = [{"name": r, "v": sum(1 for c in items if c["risk"] == r)} for r in _RISKS]
    trend = [{k: t[k] for k in ("m", "reviewed", "flagged", "approved")} for t in db[TREND].find({}, NO_ID).sort("order", 1)]
    top = sorted(items, key=lambda c: -_RISKS.index(c["risk"]))[:5]
    titles = {r["id"]: r["title"] for r in reviews}
    activity = [{"who": a["who"], "what": a["what"], "target": a["target"], "at": a["at"], "source": "seed"}
                for a in db[ACTIVITY].find({}, NO_ID)]
    for e in db[AUDIT].find({}, NO_ID).sort("at", -1).limit(20):
        what, target = _audit_text(e, titles)
        activity.append({"who": f"{e['actor_name']} ({e['actor_role']})", "what": what, "target": target, "at": e["at"], "source": "audit"})
    activity.sort(key=lambda a: a["at"], reverse=True)
    return {"kpis": kpis, "riskMix": risk_mix, "trend": trend, "topRisky": top, "activity": activity[:8]}


@app.get("/precedents")
def precedents(user: dict = Depends(get_user)):
    rows = list(get_db()[PRECEDENTS].find({}, NO_ID).sort("sim", -1))
    conflicts = []  # same rule, one Allowed and one Rejected, both reasonably similar: a human must resolve
    for i, a in enumerate(rows):
        for b in rows[i + 1:]:
            if a["rule"] == b["rule"] and {a["decision"], b["decision"]} == {"Allowed", "Rejected"} and min(a["sim"], b["sim"]) >= 0.7:
                conflicts.append([a["id"], b["id"]])
    return {"precedents": rows, "conflicts": conflicts}


@app.get("/stress-test")
def stress_test(user: dict = Depends(get_user)):
    db = get_db()
    return {"scores": list(db[STRESS_SCORES].find({}, NO_ID)), "ambiguous": list(db[STRESS_AMBIGUOUS].find({}, NO_ID))}


@app.get("/evidence-graph")
def evidence_graph(user: dict = Depends(get_user)):
    db = get_db()
    return {"nodes": list(db[EVIDENCE_NODES].find({}, NO_ID)), "edges": list(db[EVIDENCE_EDGES].find({}, NO_ID))}


@app.get("/content/{cid}/blast-radius")
def blast_radius(cid: str, user: dict = Depends(get_user)):
    db = get_db()
    if not db[CONTENT].find_one({"id": cid}, NO_ID):
        raise HTTPException(404, "Content not found")
    dep = db[BLAST_DEPS].find_one({"content_id": cid}, NO_ID) or {"label": sd.DEFAULT_BLAST_LABEL, "hits": [cid]}
    affected = [c for h in dep["hits"] if (c := db[CONTENT].find_one({"id": h}, NO_ID))]
    return {"content_id": cid, "change": dep["label"], "affected": affected}


@app.post("/analyze")
def analyze_ep(body: AnalyzeIn, user: dict = Depends(get_user)):
    return analyze(body.text)


@app.post("/reviews", status_code=201)
def create_review(body: ReviewIn, user: dict = Depends(get_user)):
    result = analyze(body.text)  # server-side only; client-supplied findings are never trusted
    review = {
        "id": str(uuid.uuid4()), "title": body.title, "text": body.text,
        "content_hash": proof.content_hash(body.text),
        "findings": result["findings"], "severity": result["severity"], "routing": result["routing"],
        "engine": result["engine"], "status": "pending",
        "submitted_by": {"id": user["id"], "name": user["name"], "role": user["role"]},
        "created_at": now(), "comments": [], "decision": None, "proof": None,
    }
    get_db()[REVIEWS].insert_one(dict(review))
    audit(review["id"], "submitted", user, {"severity": result["severity"], "routing": result["routing"],
                                           "findings": len(result["findings"])})
    return review


@app.get("/reviews")
def list_reviews(user: dict = Depends(get_user)):
    return list(get_db()[REVIEWS].find({}, NO_ID).sort("created_at", -1))


@app.get("/reviews/{rid}")
def get_review(rid: str, user: dict = Depends(get_user)):
    return _review_or_404(rid)


@app.post("/reviews/{rid}/comments", status_code=201)
def add_comment(rid: str, body: CommentIn, user: dict = Depends(get_user)):
    _review_or_404(rid)
    c = {"id": str(uuid.uuid4()), "author": {"id": user["id"], "name": user["name"], "role": user["role"]},
         "text": body.text, "at": now()}
    get_db()[REVIEWS].update_one({"id": rid}, {"$push": {"comments": c}})
    audit(rid, "comment", user, {"comment_id": c["id"]})
    return c


@app.post("/reviews/{rid}/decision")
def decide(rid: str, body: DecisionIn, user: dict = Depends(get_user)):
    r = _review_or_404(rid)
    # Only a human reviewer whose role is in the routed roles can decide. Never automatic.
    if not user["canDecide"] or user["role"] not in r["routing"]:
        raise HTTPException(403, f"Only {', '.join(r['routing'])} reviewers can decide this review")
    if r["decision"] is not None:
        raise HTTPException(409, "Review already decided")
    ts = now()
    reviewer = {"id": user["id"], "name": user["name"], "role": user["role"]}
    decision = {"decision": body.decision, "note": body.note, "reviewer": reviewer, "at": ts}
    card = proof.issue(r["content_hash"], r["findings"], r["routing"], body.decision, reviewer, ts)
    status = "approved" if body.decision == "approve" else "changes_requested"
    res = get_db()[REVIEWS].update_one({"id": rid, "decision": None},
                                       {"$set": {"decision": decision, "status": status, "proof": card}})
    if res.modified_count != 1:
        raise HTTPException(409, "Review already decided")
    audit(rid, "decision", user, {"decision": body.decision, "note": body.note})
    audit(rid, "proof_issued", user, {"content_hash": r["content_hash"]})
    return _review_or_404(rid)


@app.get("/reviews/{rid}/audit")
def review_audit(rid: str, user: dict = Depends(get_user)):
    _review_or_404(rid)
    return list(get_db()[AUDIT].find({"review_id": rid}, NO_ID).sort("seq", 1))


@app.get("/reviews/{rid}/proof")
def review_proof(rid: str, user: dict = Depends(get_user)):
    r = _review_or_404(rid)
    if not r.get("proof"):
        raise HTTPException(409, "No proof card: review has not been decided")
    return r["proof"]


@app.post("/proof/verify")
def verify_proof(body: VerifyIn):
    valid, reason = proof.verify(body.card)
    return {"valid": valid, "reason": reason}


@app.get("/evaluation")
def evaluation(user: dict = Depends(get_user)):
    return evaluate()
