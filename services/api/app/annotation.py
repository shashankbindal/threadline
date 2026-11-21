"""Independent annotation: label storage and inter-annotator agreement (Fleiss' kappa).

Nothing here is seeded or simulated: agreement is computed only from labels people submit.
"""
import hashlib
from datetime import datetime, timezone

from .benchmark_v2 import v2_items
from .db import get_db

ANNOTATIONS = "annotations"
CATS = ("risky", "safe")
MIN_ITEMS_FOR_KAPPA = 10


def fleiss_kappa(rows: list[list[int]]) -> float | None:
    """Fleiss' kappa from per-item category counts (rows[i][j] = raters putting item i in category j).

    Uses P_i = (sum_j n_ij^2 - n_i) / (n_i (n_i - 1)) per item, which equals the classic formula when every
    item has the same number of raters and is the usual generalisation when counts differ (items need >= 2
    raters). Returns None if undefined (no items, or chance agreement is 1).
    """
    rows = [r for r in rows if sum(r) >= 2]
    if not rows:
        return None
    pis = [(sum(c * c for c in r) - sum(r)) / (sum(r) * (sum(r) - 1)) for r in rows]
    pbar = sum(pis) / len(pis)
    total = sum(sum(r) for r in rows)
    pe = sum((sum(r[j] for r in rows) / total) ** 2 for j in range(len(rows[0])))
    if pe >= 1:
        return None
    return (pbar - pe) / (1 - pe)


def observed_agreement(rows: list[list[int]]) -> float | None:
    rows = [r for r in rows if sum(r) >= 2]
    if not rows:
        return None
    return sum((sum(c * c for c in r) - sum(r)) / (sum(r) * (sum(r) - 1)) for r in rows) / len(rows)


def _items() -> dict[str, dict]:
    return {x["id"]: x for x in v2_items()}


def queue(user_id: str, limit: int) -> list[dict]:
    """Items this user has not labelled: id and text only. Items with fewest labels first (to build overlap)."""
    mine = {a["item_id"] for a in get_db()[ANNOTATIONS].find({"annotator": user_id})}
    counts: dict[str, int] = {}
    for a in get_db()[ANNOTATIONS].find({}):
        counts[a["item_id"]] = counts.get(a["item_id"], 0) + 1
    todo = [x for x in v2_items() if x["id"] not in mine]
    todo.sort(key=lambda x: ({1: 0, 0: 1}.get(counts.get(x["id"], 0), 2),
                             hashlib.sha256((user_id + x["id"]).encode()).hexdigest()))
    return [{"item_id": x["id"], "text": x["text"]} for x in todo[:limit]]


def upsert_label(user_id: str, item_id: str, label: str) -> dict:
    doc = {"item_id": item_id, "annotator": user_id, "label": label, "ts": datetime.now(timezone.utc).isoformat()}
    get_db()[ANNOTATIONS].update_one({"item_id": item_id, "annotator": user_id}, {"$set": doc}, upsert=True)
    return doc


def _by_item() -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for a in get_db()[ANNOTATIONS].find({}):
        out.setdefault(a["item_id"], {})[a["annotator"]] = a["label"]
    return out


def _counts(labels: dict[str, str]) -> list[int]:
    return [sum(1 for v in labels.values() if v == c) for c in CATS]


def agreement() -> dict:
    items = _items()
    by = _by_item()
    by = {k: v for k, v in by.items() if k in items}
    annotators = sorted({u for v in by.values() for u in v})
    multi = {k: v for k, v in by.items() if len(v) >= 2}
    rows = [_counts(v) for v in multi.values()]
    measured = len(annotators) >= 2 and len(multi) >= MIN_ITEMS_FOR_KAPPA
    kappa = fleiss_kappa(rows) if measured else None
    obs = observed_agreement(rows) if measured else None
    dis = [{"item_id": k, "text": items[k]["text"], "risky": _counts(v)[0], "safe": _counts(v)[1]}
           for k, v in multi.items() if len(set(v.values())) > 1]
    dis.sort(key=lambda d: (-min(d["risky"], d["safe"]), d["item_id"]))
    vs_authors = {}
    for u in annotators:
        mine = [(items[k]["risky"], v[u] == "risky") for k, v in by.items() if u in v]
        vs_authors[u] = {"percent": round(100 * sum(a == b for a, b in mine) / len(mine), 1), "n": len(mine)}
    return {
        "annotators": len(annotators), "items_labelled": len(by), "items_with_2plus": len(multi),
        "fleiss_kappa": None if kappa is None else round(kappa, 3),
        "observed_agreement": None if obs is None else round(obs, 3),
        "per_item_disagreements": dis[:10],
        "status": "measured" if kappa is not None else "not yet measured",
        "agreement_with_authors": vs_authors,
        "note": (f"Computed only from labels submitted through /annotation/labels. Kappa needs >= 2 annotators and "
                 f">= {MIN_ITEMS_FOR_KAPPA} items with >= 2 labels. Annotators are application users, so this "
                 "is only as independent as those people are; it is not a claim about a large or expert panel."),
    }


def per_rule_kappa() -> dict[str, dict]:
    """Per-rule Fleiss kappa over (items authored for that rule) + (author-safe items), needing >= 5 multi-labelled items.

    This measures whether annotators agree on rule-flagged vs benign sentences; the author labels are only used
    to choose which items belong to which rule, never as annotator input.
    """
    items = _items()
    by = {k: v for k, v in _by_item().items() if k in items and len(v) >= 2}
    out = {}
    for rule in sorted({x["rule"] for x in items.values() if x["rule"]}):
        sel = [v for k, v in by.items() if items[k]["rule"] == rule or not items[k]["risky"]]
        n_rule = sum(1 for k in by if items[k]["rule"] == rule)
        if n_rule < 3 or len(sel) < 5:
            continue
        k = fleiss_kappa([_counts(v) for v in sel])
        if k is not None:
            out[rule] = {"kappa": round(k, 2), "items": len(sel), "rule_items": n_rule}
    return out
