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
from .models import AUDIT, CONTENT, REVIEWS, RULES, USERS
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


@app.get("/auth/me")
def me(user: dict = Depends(get_user)):
    return public_user(user)


@app.get("/rules")
def rules(user: dict = Depends(get_user)):
    return list(get_db()[RULES].find({}, NO_ID))


@app.get("/content")
def content(user: dict = Depends(get_user)):
    return list(get_db()[CONTENT].find({}, NO_ID))


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
