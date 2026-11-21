"""Evidence index over rules/facts/assets/terms (collection 'rules') and precedents.

Default: pure-Python TF-IDF cosine over word + char 3-5 gram features. Optional EMBEDDINGS=fastembed
uses BAAI/bge-small-en-v1.5 when installed, else falls back to tfidf.
"""
import math
import os
import re
import threading
from collections import Counter

from .db import get_db
from .models import PRECEDENTS, RULES

_WORD = re.compile(r"\w+")
_lock = threading.Lock()
_cache: dict = {}
_embedder = None


def _features(text: str) -> Counter:
    c: Counter = Counter()
    for w in _WORD.findall(text.lower()):
        c["w:" + w] += 1
        p = f" {w} "
        for n in (3, 4, 5):
            for i in range(len(p) - n + 1):
                c[f"c{n}:" + p[i:i + n]] += 1
    return c


def _get_embedder():
    global _embedder
    if os.environ.get("EMBEDDINGS", "").lower() != "fastembed":
        return None
    if _embedder is None:
        try:
            from fastembed import TextEmbedding  # optional dependency

            _embedder = TextEmbedding("BAAI/bge-small-en-v1.5")
        except Exception:
            _embedder = False
    return _embedder or None


def backend() -> str:
    return "bge-small-en-v1.5" if _get_embedder() else "tfidf"


def _docs(collection: str) -> list[dict]:
    db = get_db()
    if collection == "precedents":
        return [{"id": d["id"], "title": d.get("claim", d["id"]),
                 "text": " ".join(str(d.get(k, "")) for k in ("claim", "rule", "rationale"))}
                for d in db[PRECEDENTS].find({}, {"_id": 0})]
    return [{"id": d["id"], "title": d.get("title", d["id"]),
             "text": " ".join(str(d.get(k, "")) for k in ("id", "kind", "title", "body"))}
            for d in db[RULES].find({}, {"_id": 0})]


def _norm(vec: dict) -> dict:
    n = math.sqrt(sum(v * v for v in vec.values())) or 1.0
    return {k: v / n for k, v in vec.items()}


def _index(collection: str) -> dict:
    db = get_db()
    name = PRECEDENTS if collection == "precedents" else RULES
    key = (id(db), db[name].count_documents({}), backend())
    with _lock:
        idx = _cache.get(collection)
        if idx and idx["key"] == key:
            return idx
        docs = _docs(collection)
        emb = _get_embedder()
        if emb:
            idx = {"key": key, "docs": docs, "dense": [list(map(float, v)) for v in emb.embed([d["text"] for d in docs])]}
        else:
            feats = [_features(d["text"]) for d in docs]
            df: Counter = Counter()
            for f in feats:
                df.update(f.keys())
            n = len(docs)
            idf = {t: math.log((1 + n) / (1 + c)) + 1 for t, c in df.items()}
            vecs = [_norm({t: (1 + math.log(c)) * idf[t] for t, c in f.items()}) for f in feats]
            idx = {"key": key, "docs": docs, "idf": idf, "vecs": vecs}
        _cache[collection] = idx
        return idx


def top_k(query: str, collection: str, k: int = 3) -> list[dict]:
    """Return [{id, title, score}] best-first. collection: 'rules' or 'precedents'."""
    idx = _index(collection)
    if not idx["docs"] or not query.strip():
        return []
    if "dense" in idx:
        q = list(map(float, next(iter(_get_embedder().embed([query])))))
        qn = math.sqrt(sum(x * x for x in q)) or 1.0
        scores = [sum(a * b for a, b in zip(q, v)) / (qn * (math.sqrt(sum(x * x for x in v)) or 1.0)) for v in idx["dense"]]
    else:
        qv = _norm({t: (1 + math.log(c)) * idx["idf"][t] for t, c in _features(query).items() if t in idx["idf"]})
        scores = [sum(w * v.get(t, 0.0) for t, w in qv.items()) for v in idx["vecs"]]
    ranked = sorted(zip(scores, idx["docs"]), key=lambda x: -x[0])[:k]
    return [{"id": d["id"], "title": d["title"], "score": round(max(0.0, min(1.0, s)), 4)} for s, d in ranked]
