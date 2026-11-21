"""AI-assisted endpoints. All require auth. The model has no tools; its output changes no state."""
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from . import ingest, llm, retrieval, verify
from .auth import get_user
from .db import get_db
from .engine import analyze
from .models import PRECEDENTS, REVIEWS

router = APIRouter()
RATE_LIMIT = 30
WINDOW = 60.0
_hits: dict[str, deque] = defaultdict(deque)
MIN_MATCH = 0.15


def reset_rate_limits() -> None:
    _hits.clear()


def rate_limit(user: dict) -> None:
    now, q = time.monotonic(), _hits[user["id"]]
    while q and now - q[0] > WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(429, "Rate limit exceeded: 30 analyses per minute")
    q.append(now)


class TextIn(BaseModel):
    text: str  # length/emptiness validated in ingest.sanitise (422)


class DeepReviewIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=20000)
    deep: bool = False


def match_precedents(text: str, k: int = 5) -> dict:
    db = get_db()
    matches, by_rule = [], {}
    for hit in retrieval.top_k(text, "precedents", k):
        if hit["score"] < MIN_MATCH:
            continue
        p = db[PRECEDENTS].find_one({"id": hit["id"]}, {"_id": 0}) or {}
        rule = str(p.get("rule", "")).split(" ")[0]
        m = {"id": hit["id"], "title": hit["title"], "decision": p.get("decision"),
             "similarity": hit["score"], "rule": rule, "conflict": False}
        matches.append(m)
        by_rule.setdefault(rule, []).append(m)
    conflicts = []
    for rule, ms in by_rule.items():
        allowed = [m["id"] for m in ms if str(m["decision"]).startswith("Allowed")]
        rejected = [m["id"] for m in ms if m["decision"] == "Rejected"]
        if allowed and rejected:
            conflicts.append({"rule": rule, "allowed": allowed, "rejected": rejected})
            for m in ms:
                m["conflict"] = True
    return {"matches": matches, "conflicts": conflicts}


def deep_analyze(raw: str) -> dict:
    ing = ingest.sanitise(raw)
    text = ing["text"]
    base = analyze(text)
    claims, status = verify.verify_claims(text, base["findings"])
    prec = match_precedents(text)
    return {
        "engine": base["engine"],
        "llm": {"status": status, "model": llm.model() if llm.configured() else None},
        "ingestion": {"chars": ing["chars"], "sanitised": ing["sanitised"], "warnings": ing["warnings"]},
        "claims": claims, "findings": base["findings"], "severity": base["severity"],
        "routing": base["routing"], "precedents": prec["matches"], "conflicts": prec["conflicts"],
    }


@router.get("/llm/status")
def llm_status(user: dict = Depends(get_user)):
    return {"configured": llm.configured(), "provider": llm.provider(), "model": llm.model(),
            "retrieval": retrieval.backend()}


@router.post("/analyze/deep")
def analyze_deep(body: TextIn, user: dict = Depends(get_user)):
    rate_limit(user)
    return deep_analyze(body.text)


@router.post("/precedents/match")
def precedents_match(body: TextIn, user: dict = Depends(get_user)):
    rate_limit(user)
    return match_precedents(ingest.sanitise(body.text)["text"])


@router.post("/reviews", status_code=201)
def create_review_ai(body: DeepReviewIn, user: dict = Depends(get_user)):
    """Shadows the plain POST /reviews: delegates to it, then (deep only) re-runs everything server-side."""
    from . import main  # lazy: main includes this router
    from .schemas import ReviewIn

    deep = None
    if body.deep:
        rate_limit(user)
        deep = deep_analyze(body.text)  # 422 before anything is stored
    review = main.create_review(ReviewIn(title=body.title, text=body.text), user)
    if deep is None:
        return review
    extra = {"deep": {"claims": deep["claims"], "precedents": deep["precedents"], "conflicts": deep["conflicts"],
                      "ingestion": deep["ingestion"], "llm": deep["llm"]}}
    get_db()[REVIEWS].update_one({"id": review["id"]}, {"$set": extra})
    if deep["ingestion"]["warnings"]:
        main.audit(review["id"], "ingestion_warnings", user, {"warnings": deep["ingestion"]["warnings"]})
    review.update(extra)
    return review
