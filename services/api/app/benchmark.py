"""Seeded benchmark: 50 hand-written, hand-labelled sentences (fictional Nimbus Shield).

Labels were written by the prototype authors, not independently adjudicated, and the
set is small. It deliberately includes paraphrases the regex engine misses and benign
sentences it wrongly flags. Treat results as a smoke test, not a general accuracy claim.
"""
from .engine import analyze

# (text, risky?, expected_rule_id or None)
BENCHMARK: list[tuple[str, bool, str | None]] = [
    # --- risky (25) ---
    ("Nimbus Shield blocks 100% of threats.", True, "R-012"),
    ("Our detection is unbreakable.", True, "R-012"),
    ("Guaranteed protection against ransomware.", True, "R-012"),
    ("Nothing gets past Nimbus Shield.", True, "R-012"),
    ("Breaches become impossible with our agent.", True, "R-012"),
    ("It stops every attack before it lands.", True, "R-012"),
    ("A foolproof shield for your inbox.", True, "R-012"),
    ("Impenetrable defense for modern teams.", True, "R-012"),
    ("Zero-day attacks? Nimbus Shield sees them coming.", True, "R-012"),
    ("Harbor Clinic stayed HIPAA compliant thanks to Nimbus Shield.", True, "R-019"),
    ("Nimbus Shield is SOC 2 certified.", True, "R-019"),
    ("Get ISO 27001 compliance out of the box.", True, "R-019"),
    ("We make you GDPR-proof overnight.", True, "R-019"),
    ("Fully PCI compliant from day one.", True, "R-019"),
    ("No setup needed.", True, "F-07"),
    ("Instant deployment, zero configuration.", True, "F-07"),
    ("You will be up and running in five minutes.", True, "F-07"),
    ("Trusted by over 10,000 teams worldwide.", True, "F-11"),
    ("Join 50,000 customers who switched this year.", True, "F-11"),
    ("NS keeps your inbox clean.", True, "T-03"),
    ("Stop hackers in their tracks.", True, "T-05"),
    ("The best email security on the market.", True, "R-021"),
    ("Enterprise-grade protection that fits any budget.", True, "R-021"),
    ("The #1 choice for CISOs.", True, "R-021"),
    ("Our customers never have to worry about phishing again.", True, "R-012"),
    # --- safe (25) ---
    ("Nimbus Shield helps reduce phishing exposure for distributed teams.", False, None),
    ("Install the agent and connect your identity provider in about 20 minutes.", False, None),
    ("Nimbus Shield scored 97.2% detection in the 2026 Detection Benchmark.", False, None),
    ("We serve 4,200 teams as of October 2026.", False, None),
    ("Our SOC 2 Type II report is available under NDA.", False, None),
    ("Read the Detection Benchmark summary for methodology.", False, None),
    ("The logo needs one logo-width of clear space on every side.", False, None),
    ("Nimbus Shield flags suspicious sign-ins for review.", False, None),
    ("Book a demo to see the dashboard.", False, None),
    ("Threat reports are emailed every Monday.", False, None),
    ("Admins can connect an identity provider from the settings page.", False, None),
    ("Our support team replies within one business day.", False, None),
    ("Pricing tiers are listed on the plans page.", False, None),
    ("Nimbus Shield works alongside your existing email gateway.", False, None),
    ("Learn how to report a phishing message.", False, None),
    ("The agent supports Windows, macOS and Linux.", False, None),
    ("Security researchers can disclose issues through our program.", False, None),
    ("Ask Legal whether you need to be HIPAA compliant before writing about it.", False, None),
    ("We never claim Nimbus Shield is unbreakable; no product is.", False, None),
    ("Hack Week is our annual internal engineering event.", False, None),
    ("In our staff survey, participation reached 100% of the support team.", False, None),
    ("We do not offer a money-back guarantee on custom plans.", False, None),
    ("Customers rated onboarding 4.6 out of 5 in the October survey.", False, None),
    ("Join the webinar on Thursday to hear from our product team.", False, None),
    ("Documentation covers installation, configuration and upgrades.", False, None),
]

# Baseline: naive case-insensitive keyword matcher (keyword -> rule it is meant to catch).
BASELINE_KEYWORDS = {
    "unbreakable": "R-012", "100%": "R-012", "guarantee": "R-012",
    "hipaa": "R-019", "soc 2": "R-019", "hack": "T-05", "best": "R-021",
}


def baseline_rules(text: str) -> set[str]:
    t = text.lower()
    return {rule for kw, rule in BASELINE_KEYWORDS.items() if kw in t}


def engine_rules(text: str) -> set[str]:
    return {f["ruleId"] for f in analyze(text)["findings"]}


def _metrics(rows: list[dict]) -> dict:
    tp = sum(r["label"] and r["pred"] for r in rows)
    fp = sum((not r["label"]) and r["pred"] for r in rows)
    fn = sum(r["label"] and not r["pred"] for r in rows)
    tn = sum((not r["label"]) and (not r["pred"]) for r in rows)
    div = lambda a, b: round(a / b, 3) if b else 0.0  # noqa: E731
    p, r = div(tp, tp + fp), div(tp, tp + fn)
    per_rule = {}
    for rule in sorted({x["rule"] for x in rows if x["rule"]}):
        rs = [x for x in rows if x["rule"] == rule]
        hit = sum(x["rule"] in x["rules"] for x in rs)
        per_rule[rule] = {"recall": div(hit, len(rs)), "hit": hit, "total": len(rs)}
    return {
        "precision": p, "recall": r, "f1": div(2 * p * r, p + r) if p + r else 0.0,
        "accuracy": div(tp + tn, len(rows)),
        "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "perRuleRecall": per_rule,
        "misses": [x["text"] for x in rows if x["label"] and not x["pred"]],
        "falsePositives": [x["text"] for x in rows if not x["label"] and x["pred"]],
    }


def evaluate() -> dict:
    out = {}
    for name, fn in (("engine", engine_rules), ("baseline", baseline_rules)):
        rows = []
        for text, label, rule in BENCHMARK:
            rules = fn(text)
            rows.append({"text": text, "label": label, "rule": rule, "rules": rules, "pred": bool(rules)})
        out[name] = _metrics(rows)
    return {
        "note": "Measured on the 50-example seeded benchmark (hand-labelled by the authors; small and not independent).",
        "n": len(BENCHMARK), "risky": sum(1 for b in BENCHMARK if b[1]),
        "engine": out["engine"], "baseline": out["baseline"],
    }
