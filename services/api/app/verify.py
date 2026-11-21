"""Model-backed claim verification with deterministic validation and fallback.

Rule findings (engine.analyze) stay authoritative. The model only judges claims not already
covered by a rule finding; its output is schema-validated and any failure falls back to a
retrieval-only label that never claims LLM involvement.
"""
import re

from . import ingest, llm, retrieval

LABELS = ("Supported", "Partial", "Gap", "Contradicted")
MAX_LLM_CLAIMS = 12
_SPLIT = re.compile(r"[^.!?;\n]+(?:[.!?;]+|\n|$)")
_SEV = ["Low", "Medium", "High", "Critical"]


def split_claims(text: str) -> list[dict]:
    out = []
    for m in _SPLIT.finditer(text):
        raw = m.group(0)
        s = raw.strip().rstrip(".!?;").strip()
        if len(s) < 3:
            continue
        start = m.start() + raw.index(s[0])
        out.append({"id": f"C-{len(out) + 1}", "text": s, "start": start, "end": start + len(s)})
    return out


def retrieval_label(evidence: list[dict]) -> tuple[str, float]:
    top = evidence[0]["score"] if evidence else 0.0
    if top >= 0.55:
        return "Supported", round(top, 2)
    if top >= 0.25:
        return "Partial", round(top, 2)
    return "Gap", round(1 - top, 2)


def validate_judgement(data, allowed_ids: set[str]) -> dict | None:
    """Deterministic schema check of untrusted model output. Returns a clean dict or None."""
    if not isinstance(data, dict):
        return None
    label, conf, rat, ids = data.get("label"), data.get("confidence"), data.get("rationale"), data.get("evidence_ids", [])
    if label not in LABELS or isinstance(conf, bool) or not isinstance(conf, (int, float)):
        return None
    if not isinstance(rat, str) or not isinstance(ids, list):
        return None
    return {"label": label, "confidence": round(max(0.0, min(1.0, float(conf))), 2),
            "rationale": re.sub(r"\s+", " ", rat).strip()[:200],
            "evidence_ids": [i for i in ids if isinstance(i, str) and i in allowed_ids]}


def verify_claims(text: str, findings: list[dict]) -> tuple[list[dict], str]:
    """Return (claims, llm_status). llm_status: unavailable | ok | error | invalid_output."""
    claims = split_claims(text)
    status = "ok" if llm.configured() else "unavailable"
    used = 0
    for c in claims:
        ev = retrieval.top_k(c["text"], "rules", 3)
        c["evidence"] = ev
        hit = [f for f in findings if f["start"] < c["end"] and f["end"] > c["start"]]
        if hit:  # hard rule findings stay authoritative; the model is not consulted
            w = max(hit, key=lambda f: _SEV.index(f["severity"]))
            c.update(label=w["status"], confidence=w["conf"], source="rules",
                     rationale=f"{w['ruleId']}: {w['message']}"[:200])
            seen = {}
            for f in hit:
                seen.setdefault(f["ruleId"], f["ruleTitle"])
            c["evidence"] = [{"id": i, "title": t, "score": 1.0} for i, t in seen.items()]
            continue
        label, conf = retrieval_label(ev)
        c.update(label=label, confidence=conf, source="retrieval",
                 rationale="Retrieval similarity only; not model-assessed.")
        if llm.configured() and used < MAX_LLM_CLAIMS:
            used += 1
            msgs, _ = ingest.build_messages(c["text"], ev)
            res = llm.chat_json(msgs)
            if res.get("status") != "ok":
                status = "error" if res.get("status") == "error" else res.get("status", "error")
                continue
            j = validate_judgement(res.get("data"), {e["id"] for e in ev})
            if not j:
                status = "invalid_output"
                continue
            keep = set(j["evidence_ids"])
            c.update(label=j["label"], confidence=j["confidence"], rationale=j["rationale"], source="llm")
            c["evidence"] = [e for e in ev if e["id"] in keep] or ev
    return claims, status
