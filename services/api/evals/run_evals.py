"""Run every evaluation system offline and write evals/results/latest.json.

Usage (from services/api):
    .venv/Scripts/python evals/run_evals.py            # Linux/macOS: .venv/bin/python
    LLM_API_KEY=... .venv/Scripts/python evals/run_evals.py   # also runs the LLM systems

Systems: engine, baseline (always); rules+retrieval (always, retrieval only, no LLM);
rules+llm (only if an LLM key is set and app.verify exists); external VitaminC track (needs the LLM and
evals/data/vitaminc_sample.jsonl from evals/fetch_external.py). Anything not run is recorded as
status 'not run' with the reason. Every number in the output file is computed by this script.
The script uses an in-memory database only; it never touches MongoDB.
"""
import hashlib
import json
import os
import platform
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
os.environ.pop("MONGODB_URL", None)  # force in-memory mongomock: never write to a real database

from app.benchmark import _metrics, baseline_rules, engine_rules  # noqa: E402
from app.benchmark_v2 import items_for  # noqa: E402

LABEL_MAP = {"SUPPORTS": "Supported", "REFUTES": "Contradicted", "NOT ENOUGH INFO": "Gap"}
CLASSES = ["Supported", "Contradicted", "Gap"]


def _import_pipeline():
    try:
        from app import llm, verify
        return llm, verify, None
    except Exception as e:  # noqa: BLE001
        return None, None, f"app.verify not importable ({type(e).__name__})"


def _rules_pred(fn):
    return lambda text: (fn(text), bool(fn(text)))


def run_system(items, predict):
    rows = []
    for x in items:
        rules, flagged = predict(x["text"])
        rows.append({"text": x["text"], "label": x["risky"], "rule": x["rule"], "rules": rules, "pred": flagged})
    return _metrics(rows)


def _pipeline_predict(verify, flag_labels=("Contradicted", "Gap")):
    from app.engine import analyze

    def predict(text):
        findings = analyze(text)["findings"]
        claims, _status = verify.verify_claims(text, findings)
        rules = {f["ruleId"] for f in findings}
        flagged = bool(findings) or any(c["label"] in flag_labels for c in claims)
        return rules, flagged
    return predict


def macro_metrics(gold, pred):
    conf = {g: Counter() for g in CLASSES}
    for g, p in zip(gold, pred):
        conf[g][p] += 1
    f1s = {}
    for c in CLASSES:
        tp = conf[c][c]
        fp = sum(conf[g][c] for g in CLASSES if g != c)
        fn = sum(v for p, v in conf[c].items() if p != c)
        pr, rc = (tp / (tp + fp) if tp + fp else 0.0), (tp / (tp + fn) if tp + fn else 0.0)
        f1s[c] = round(2 * pr * rc / (pr + rc), 3) if pr + rc else 0.0
    acc = sum(g == p for g, p in zip(gold, pred)) / len(gold)
    cols = CLASSES + sorted({p for p in pred if p not in CLASSES})
    return {"accuracy": round(acc, 3), "macro_f1": round(sum(f1s.values()) / len(f1s), 3), "per_class_f1": f1s,
            "confusion_matrix": {"rows_are": "gold", "columns": cols,
                                 "matrix": {g: {c: conf[g][c] for c in cols} for g in CLASSES}}}


def external_track(llm, verify, now_meta):
    path = HERE / "data" / "vitaminc_sample.jsonl"
    if not path.exists():
        return {"status": "not run", "reason": "evals/data/vitaminc_sample.jsonl missing; run evals/fetch_external.py"}
    raw = path.read_bytes()
    rows = [json.loads(l) for l in raw.decode("utf-8").splitlines() if l.strip()]
    gold = [LABEL_MAP[r["label"]] for r in rows]
    maj = Counter(gold).most_common(1)[0][0]
    majority = {**macro_metrics(gold, [maj] * len(gold)), "predicts": maj, "n": len(gold),
                "note": "Trivial baseline: always predict the most frequent gold label of the sample."}
    base = {"n": len(rows), "gold_distribution": dict(Counter(gold)), "majority_baseline": majority,
            "dataset": "tals/vitaminc test split sample", "sample_sha256": hashlib.sha256(raw).hexdigest(),
            "label_mapping": LABEL_MAP}
    if llm is None or verify is None or not llm.configured():
        return {**base, "status": "not run", "reason": "no LLM key set or app.verify missing; verifier not run"}
    from app import ingest

    def judge(r):
        ev = [{"id": "E1", "title": r["evidence"], "score": 1.0}]  # the row's evidence is the ONLY evidence
        msgs, _ = ingest.build_messages(r["claim"], ev)
        res = llm.chat_json(msgs)
        if res.get("status") != "ok":
            return "error"
        j = verify.validate_judgement(res.get("data"), {"E1"})
        return j["label"] if j else "invalid"

    with ThreadPoolExecutor(max_workers=4) as ex:
        pred = list(ex.map(judge, rows))
    failed = sum(p in ("error", "invalid") for p in pred)
    return {**base, "status": "measured", "model": llm.model(), "provider": llm.provider(),
            "unusable_outputs": failed, "verifier": {
                **macro_metrics(gold, pred),
                "note": "Predictions Partial/error/invalid are counted as wrong (they match no gold label)."}}


def main() -> int:
    llm, verify, why = _import_pipeline()
    have_llm = bool(llm and llm.configured())
    sets = {}
    for which in ("v1", "v2"):
        items = items_for(which)
        systems = {
            "engine": {"status": "ran", **run_system(items, _rules_pred(engine_rules))},
            "baseline": {"status": "ran", **run_system(items, _rules_pred(baseline_rules))},
        }
        if verify:
            from app import llm as llm_mod
            real = llm_mod.configured
            llm_mod.configured = lambda: False  # retrieval-only run: no LLM
            try:
                systems["rules+retrieval"] = {
                    "status": "ran", "n": len(items),
                    "definition": "risky if a rule fires OR any claim is labelled Contradicted/Gap by retrieval similarity",
                    **run_system(items, _pipeline_predict(verify))}
            finally:
                llm_mod.configured = real
        else:
            systems["rules+retrieval"] = {"status": "not run", "reason": why}
        if verify and have_llm:
            systems["rules+llm"] = {
                "status": "ran", "n": len(items),
                "definition": "risky if a rule fires OR any claim is labelled Contradicted/Gap by the LLM judge",
                **run_system(items, _pipeline_predict(verify))}
        else:
            systems["rules+llm"] = {"status": "not run", "reason": why or "no LLM key set"}
        sets[which] = {"n": len(items), "systems": systems}
    meta = {"date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "model": llm.model() if have_llm else None, "llm_used": have_llm,
            "python": platform.python_version(), "script": "evals/run_evals.py",
            "n": {k: v["n"] for k, v in sets.items()}}
    out = {"run_meta": meta, "sets": sets, "external": external_track(llm, verify, meta)}
    dest = HERE / "results" / "latest.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    for k, s in sets.items():
        for name, v in s["systems"].items():
            print(k, name, v["status"], v.get("f1", v.get("reason", "")))
    print("external:", out["external"]["status"], out["external"].get("reason", ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
