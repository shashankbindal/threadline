"""Fictional Nimbus Shield reference data seeded into MongoDB (never shipped in the frontend).

Everything here is DEMO seed data: historical trend points, precedents, stress-test scores, the evidence
graph and blast-radius dependency map are not computed from live traffic.
"""

RULE_LINKED = {
    "R-012": ["Launch blog: Unbreakable detection (flagged)", "Homepage hero v3", "Sales deck Q4"],
    "R-019": ["Security page draft", "Press release: SOC 2 renewal"],
    "R-021": ["Pricing page hero"],
    "F-07": ["Onboarding email series", "Pricing FAQ"],
    "F-11": ["About page", "Investor one-pager"],
    "T-03": ["Product docs index", "Social campaign Nov"],
    "T-05": ["Threat report 2026", "Newsletter #41"],
    "A-02": ["Launch blog", "Sales deck Q4", "Webinar slides"],
    "A-05": ["Partner kit", "Homepage hero v3"],
}
RULE_HISTORY = [
    {"v": "v3", "date": "Oct 28, 2026", "note": "Wording clarified", "by": "M. Okafor"},
    {"v": "v2", "date": "Aug 04, 2026", "note": "Added examples", "by": "L. Brandt"},
    {"v": "v1", "date": "Mar 12, 2026", "note": "Initial entry", "by": "M. Okafor"},
]

TREND_SEED = [  # historical monthly points (demo, not computed)
    {"m": m, "reviewed": r, "flagged": f, "approved": a, "order": i}
    for i, (m, r, f, a) in enumerate([("Jun", 42, 14, 26), ("Jul", 55, 16, 35), ("Aug", 61, 15, 42),
                                       ("Sep", 74, 19, 50), ("Oct", 88, 17, 66), ("Nov", 97, 16, 76)])
]
ACTIVITY_SEED = [  # ISO timestamps so the UI can render relative times
    {"id": "a1", "who": "Priya N.", "what": "ran Reader Lens on", "target": "Spring launch email", "at": "2026-11-12T07:00:00+00:00"},
    {"id": "a2", "who": "Maya R. (Legal)", "what": "requested changes on", "target": "Case study: Harbor Clinic", "at": "2026-11-12T06:00:00+00:00"},
    {"id": "a3", "who": "Tom K.", "what": "accepted a suggested edit in", "target": "Pricing page hero", "at": "2026-11-11T04:00:00+00:00"},
    {"id": "a4", "who": "Ana L.", "what": "approved and exported Proof Card for", "target": "Partner webinar deck", "at": "2026-11-10T09:00:00+00:00"},
    {"id": "a5", "who": "Dev S.", "what": "filed an exception on", "target": "Rule R-012", "at": "2026-11-09T09:00:00+00:00"},
]

PRECEDENT_SEED = [
    {"id": "P-118", "date": "2026-09-14", "rule": "R-012 No absolute security claims", "decision": "Rejected", "reviewer": "M. Okafor", "sim": 0.93, "claim": "Unbreakable detection for every endpoint", "rationale": "Absolute wording cannot be substantiated by the benchmark (A-02)."},
    {"id": "P-121", "date": "2026-09-30", "rule": "R-012 No absolute security claims", "decision": "Allowed with exception", "reviewer": "L. Brandt", "sim": 0.81, "claim": "Guaranteed 24/7 monitoring", "expires": "2027-01-31", "rationale": "Refers to service availability under SLA, not detection. Exception until SLA wording is revised."},
    {"id": "P-124", "date": "2026-10-05", "rule": "R-019 Compliance claims need Legal sign-off", "decision": "Allowed", "reviewer": "S. Idowu", "sim": 0.76, "claim": "SOC 2 Type II audited", "rationale": "Legal attached current audit report; claim matches scope."},
    {"id": "P-097", "date": "2026-06-18", "rule": "R-012 No absolute security claims", "decision": "Allowed", "reviewer": "J. Vance", "sim": 0.72, "claim": "100% guaranteed detection of known malware signatures", "rationale": "Scoped to signature matching in a technical doc with a cited test."},
    {"id": "P-130", "date": "2026-10-22", "rule": "T-03 Use Nimbus Shield, not NS", "decision": "Allowed with exception", "reviewer": "L. Brandt", "sim": 0.64, "claim": "NS in a character-limited ad", "expires": "2026-12-31", "rationale": "Paid social 30-char headline limit; expires after holiday campaign."},
    {"id": "P-133", "date": "2026-11-02", "rule": "T-05 Prefer threat, avoid hack", "decision": "Rejected", "reviewer": "S. Idowu", "sim": 0.58, "claim": "Stop hackers before they strike", "rationale": "Informal vocabulary conflicts with professional tone."},
    {"id": "P-088", "date": "2026-04-09", "rule": "F-07 Onboarding takes about 20 minutes", "decision": "Allowed", "reviewer": "M. Okafor", "sim": 0.55, "claim": "Up and running in under 30 minutes", "rationale": "Consistent with the verified median and conservative."},
]

STRESS_SCORES = [
    {"id": "R-012", "clarity": 62, "kappa": 0.41}, {"id": "R-019", "clarity": 88, "kappa": 0.79},
    {"id": "T-03", "clarity": 94, "kappa": 0.91}, {"id": "T-05", "clarity": 57, "kappa": 0.33},
    {"id": "R-024", "clarity": 81, "kappa": 0.72}, {"id": "R-031", "clarity": 70, "kappa": 0.55},
]
STRESS_AMBIGUOUS = [
    {"id": "R-012", "title": "No absolute security claims", "probe": "\"Guaranteed 24/7 monitoring\"",
     "votes": [{"who": "Reviewer A", "vote": "Violation"}, {"who": "Reviewer B", "vote": "Compliant"}, {"who": "Reviewer C", "vote": "Violation"}],
     "before": "Never say unbreakable, 100% or guaranteed about detection.",
     "after": "Never use absolute words (unbreakable, 100%, guaranteed) about detection or protection outcomes. Service-level commitments backed by an SLA may use them."},
    {"id": "T-05", "title": "Prefer threat, avoid hack", "probe": "\"Hackers hate this one trick\"",
     "votes": [{"who": "Reviewer A", "vote": "Violation"}, {"who": "Reviewer B", "vote": "Violation"}, {"who": "Reviewer C", "vote": "Compliant"}],
     "before": "Neutral, professional vocabulary.",
     "after": "Use threat, attacker or adversary. Avoid hack, hacker and slang in customer-facing copy; quoting a third party is allowed with attribution."},
]

EVIDENCE_NODES = [
    {"id": "c1", "kind": "Claim", "label": "Blocks 100% of threats", "detail": "From C-101 Spring launch email.", "x": 0, "y": 0},
    {"id": "c2", "kind": "Claim", "label": "No setup needed", "detail": "From C-101 Spring launch email.", "x": 0, "y": 130},
    {"id": "c3", "kind": "Claim", "label": "Fits any budget", "detail": "From C-102 Pricing page hero.", "x": 0, "y": 260},
    {"id": "b1", "kind": "Belief", "label": "Stops every threat", "detail": "Implied, 91% confidence.", "x": 280, "y": 0},
    {"id": "b2", "kind": "Belief", "label": "Zero configuration", "detail": "Stated, 88% confidence.", "x": 280, "y": 130},
    {"id": "b3", "kind": "Belief", "label": "Suits small budgets", "detail": "Implied, 52% confidence.", "x": 280, "y": 260},
    {"id": "s1", "kind": "Source", "label": "A-02 Detection Benchmark", "detail": "Third-party test: 97.2% detection on curated set.", "x": 560, "y": 0},
    {"id": "s2", "kind": "Source", "label": "F-07 Onboarding ~20 min", "detail": "Agent install plus IdP connection; median 20 min.", "x": 560, "y": 130},
    {"id": "s3", "kind": "Source", "label": "P-118 Pricing tiers", "detail": "Starter tier exists; not all budgets covered.", "x": 560, "y": 220},
    {"id": "s4", "kind": "Source", "label": "No approved source", "detail": "No evidence found for a guaranteed outcome.", "x": 560, "y": 320},
]
EVIDENCE_EDGES = [
    {"id": "e1", "source": "c1", "target": "b1", "status": "supported", "label": "implies"},
    {"id": "e2", "source": "c2", "target": "b2", "status": "supported", "label": "states"},
    {"id": "e3", "source": "c3", "target": "b3", "status": "supported", "label": "implies"},
    {"id": "e4", "source": "b1", "target": "s1", "status": "contradicted", "label": "contradicted"},
    {"id": "e5", "source": "b2", "target": "s2", "status": "contradicted", "label": "contradicted"},
    {"id": "e6", "source": "b3", "target": "s3", "status": "supported", "label": "partial support"},
    {"id": "e7", "source": "b3", "target": "s4", "status": "gap", "label": "gap"},
]

BLAST_DEPS = [  # rule/fact change -> content that depends on it
    {"content_id": "C-101", "label": "R-012 No absolute claims ('100%', 'guaranteed')", "hits": ["C-101", "C-108", "C-105"]},
    {"content_id": "C-104", "label": "F-07 HIPAA compliance is customer-controlled", "hits": ["C-104", "C-102"]},
]
DEFAULT_BLAST_LABEL = "R-004 Claims need evidence on file"
