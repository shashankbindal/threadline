"""Heuristic Reader Lens engine.

IMPORTANT: this is a deterministic, RULES-BASED (regex) engine. It is NOT an LLM and
does not understand meaning; paraphrased risky claims can be missed and benign
mentions can be flagged (see /evaluation for measured numbers). It only produces
findings and a routing suggestion; people make every decision.

Routing (single source of truth): Low -> Brand; Medium -> Brand+Legal;
High/Critical -> Legal+Compliance.
"""
import re
from typing import Callable

SEVERITIES = ["Low", "Medium", "High", "Critical"]
ROUTING = {
    "None": ["Brand"],
    "Low": ["Brand"],
    "Medium": ["Brand", "Legal"],
    "High": ["Legal", "Compliance"],
    "Critical": ["Legal", "Compliance"],
}
ENGINE_NAME = "heuristic-rules"

_COMPLIANCE = r"(?:HIPAA|SOC ?2|ISO ?27001|GDPR|PCI(?:-DSS)?)"
_I = re.IGNORECASE


def _wrong_customer_count(m: re.Match) -> bool:
    return int(m.group(1).replace(",", "")) != 4200  # F-11: 4,200 teams is the verified figure


# (rule_id, title, severity, compiled regex, message, suggestion, optional predicate)
RULES: list[tuple[str, str, str, re.Pattern, str, str, Callable | None]] = [
    ("R-012", "No absolute security claims", "High",
     re.compile(r"\b(?:unbreakable|impenetrable|foolproof|bulletproof|guarantee[ds]?|completely secure|(?:every|all) (?:threats?|attacks?))\b|\b100\s?%", _I),
     "Absolute security claim.", "Use qualified wording such as 'helps reduce risk'.", None),
    ("R-012", "No absolute security claims", "Medium",
     re.compile(r"\b(?:sees? (?:them|it|threats?) coming|predicts? (?:every |all )?(?:attacks?|threats?)|before (?:they|it) happens?)\b", _I),
     "Implies predictive certainty.", "Describe detection of known patterns instead of foresight.", None),
    ("R-019", "Compliance claims need Legal sign-off", "Critical",
     re.compile(rf"\b{_COMPLIANCE}\b[^.]{{0,40}}?\b(?:compliant|compliance|certified|certification)\b|\b(?:compliant|certified)\b[^.]{{0,20}}\b{_COMPLIANCE}\b", _I),
     "Compliance claim without approved evidence.", "Remove or attach approved evidence and get Legal sign-off.", None),
    ("F-07", "Onboarding takes about 20 minutes", "Medium",
     re.compile(r"\b(?:no|zero) (?:set-?up|configuration|install(?:ation)?)\b|\binstant(?:ly)? (?:deploy\w*|install\w*|protect\w*)|\bzero config\w*", _I),
     "Contradicts verified onboarding fact (about 20 minutes).", "Say 'about 20 minutes to install and connect'.", None),
    ("F-11", "Customer count: 4,200 teams", "Medium",
     re.compile(r"\b(\d{1,3}(?:,\d{3})+|\d{4,})\+?\s+(?:teams|customers|companies|organi[sz]ations)\b", _I),
     "Customer count differs from the verified figure (4,200).", "Use 4,200 teams (as of Oct 2026).", _wrong_customer_count),
    ("R-021", "No unsubstantiated superlatives", "Medium",
     re.compile(r"(?<!\w)(?:the best|best-in-class|industry-leading|world-class|#1|number one|enterprise-grade|unmatched|unrivaled)(?!\w)", _I),
     "Unsubstantiated superlative.", "Cite approved evidence or soften the claim.", None),
    ("T-03", "Use Nimbus Shield, not NS", "Low",
     re.compile(r"\bNS\b"), "Product name abbreviated.", "Write 'Nimbus Shield'.", None),
    ("T-05", "Prefer threat, avoid hack", "Low",
     re.compile(r"\bhack(?:s|ed|er|ers|ing)?\b", _I), "Non-preferred vocabulary.", "Use 'threat' or 'attack'.", None),
]


# Reader-facing metadata per rule: (belief a reader forms, kind, confidence, evidence status, source, replacement)
META = {
    "R-012": ("The product stops every threat or predicts attacks", "Implied", 0.9, "Contradicted", "A-02 Detection Benchmark 2026: 97.2% on a curated set", "helps detect threats (97.2% in a third-party benchmark)"),
    "R-019": ("Compliance is guaranteed by the product", "Implied", 0.82, "Gap", None, "supports customers' compliance programs"),
    "F-07": ("No setup is required", "Stated", 0.88, "Contradicted", "F-07 Onboarding takes about 20 minutes", "setup takes about 20 minutes"),
    "F-11": ("Customer count is as stated", "Stated", 0.8, "Contradicted", "F-11 Customer count: 4,200 teams (Oct 2026)", "4,200 teams"),
    "R-021": ("The product is the best in its category", "Implied", 0.7, "Gap", None, "a leading option (cite approved evidence)"),
    "T-03": ("Product name abbreviated", "Stated", 0.95, "Contradicted", "T-03 Use 'Nimbus Shield'", "Nimbus Shield"),
    "T-05": ("Informal vocabulary", "Stated", 0.9, "Contradicted", "T-05 Prefer 'threat', avoid 'hack'", "threat"),
}


def analyze(text: str) -> dict:
    findings = []
    for rule_id, title, sev, rx, msg, sug, pred in RULES:
        for m in rx.finditer(text):
            if pred and not pred(m):
                continue
            findings.append({
                "ruleId": rule_id, "ruleTitle": title, "severity": sev,
                "excerpt": m.group(0), "start": m.start(), "end": m.end(),
                "message": msg, "suggestion": sug,
                # aliases used by the web client
                "id": f"{rule_id}-{m.start()}", "rule": rule_id, "match": m.group(0), "fix": sug,
                **dict(zip(("belief", "kind", "conf", "status", "source", "replacement"), META[rule_id])),
            })
    findings.sort(key=lambda f: f["start"])
    severity = "None"
    for f in findings:
        if severity == "None" or SEVERITIES.index(f["severity"]) > SEVERITIES.index(severity):
            severity = f["severity"]
    return {"findings": findings, "severity": severity, "routing": list(ROUTING[severity]), "engine": ENGINE_NAME}
