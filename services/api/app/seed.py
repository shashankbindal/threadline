"""Idempotent seed of fictional Nimbus Shield demo data (copied from apps/web/lib/data.ts;
R-021 added for the superlative rule the engine checks)."""
from .auth import hash_password
from . import seed_data as sd
from .models import (ACTIVITY, BLAST_DEPS, CONTENT, EVIDENCE_EDGES, EVIDENCE_NODES, PRECEDENTS, RULES,
                     STRESS_AMBIGUOUS, STRESS_SCORES, TREND, USERS)

DEMO_PASSWORD = "demo1234"  # demo accounts only; fictional users

USER_SEED = [
    ("u-maya", "maya@threadline.demo", "Maya R.", "MR", "Legal Counsel", "Legal"),
    ("u-priya", "priya@threadline.demo", "Priya N.", "PN", "Brand Manager", "Brand"),
    ("u-ken", "ken@threadline.demo", "Ken O.", "KO", "Compliance Officer", "Compliance"),
    ("u-tom", "tom@threadline.demo", "Tom K.", "TK", "Marketing Associate", "Viewer"),
]
RULE_SEED = [
    ("R-012", "Guideline", "No absolute security claims", "Never say unbreakable, 100% or guaranteed about detection.", "Active"),
    ("R-019", "Guideline", "Compliance claims need Legal sign-off", "HIPAA, SOC 2 and ISO claims require approved evidence.", "Active"),
    ("R-021", "Guideline", "No unsubstantiated superlatives", "Avoid 'best', '#1', 'enterprise-grade' without approved evidence.", "Active"),
    ("F-07", "Fact", "Onboarding takes about 20 minutes", "Agent install plus IdP connection; median 20 min.", "Verified"),
    ("F-11", "Fact", "Customer count: 4,200 teams", "As of Oct 2026, finance-confirmed.", "Verified"),
    ("T-03", "Term", "Use Nimbus Shield, not NS", "Product name is always written in full.", "Active"),
    ("T-05", "Term", "Prefer threat, avoid hack", "Neutral, professional vocabulary.", "Active"),
    ("A-02", "Asset", "Detection Benchmark 2026", "Third-party test: 97.2% detection on curated set.", "Approved"),
    ("A-05", "Asset", "Primary logo pack", "Clear space 1x, min width 24px.", "Approved"),
]
CONTENT_SEED = [
    ("C-101", "Spring launch email", "Email", "Priya N.", "High", "Needs fix", "2h ago", "Nimbus Shield blocks 100% of threats, guaranteed. No setup needed.", ["CL-1", "CL-2"]),
    ("C-102", "Pricing page hero", "Web", "Tom K.", "Medium", "In review", "5h ago", "Enterprise-grade protection that fits any budget.", ["CL-3"]),
    ("C-103", "Partner webinar deck", "Slides", "Ana L.", "Low", "Approved", "1d ago", "Nimbus Shield helps reduce phishing exposure for distributed teams.", ["CL-4"]),
    ("C-104", "Case study: Harbor Clinic", "PDF", "Priya N.", "Critical", "Needs fix", "1d ago", "Harbor Clinic stayed HIPAA compliant thanks to Nimbus Shield.", ["CL-5", "CL-6"]),
    ("C-105", "Social: Zero-day post", "Social", "Dev S.", "Medium", "Draft", "2d ago", "Zero-day attacks? Nimbus Shield sees them coming.", ["CL-7"]),
    ("C-106", "Onboarding guide v3", "Docs", "Ana L.", "Low", "Approved", "3d ago", "Install the agent and connect your identity provider in about 20 minutes.", ["CL-8"]),
    ("C-107", "Q3 newsletter", "Email", "Tom K.", "Medium", "In review", "4d ago", "Trusted by over 10,000 teams worldwide.", ["CL-9"]),
    ("C-108", "Billboard concept", "Image", "Dev S.", "High", "In review", "5d ago", "Image: shield icon with the line Unbreakable.", ["CL-10"]),
]


def seed(db) -> None:
    for uid, email, name, ini, title, role in USER_SEED:
        if not db[USERS].find_one({"id": uid}):  # never overwrite existing users/passwords
            db[USERS].insert_one({"id": uid, "email": email, "name": name, "initials": ini, "title": title,
                                  "role": role, "canDecide": role != "Viewer",
                                  "password_hash": hash_password(DEMO_PASSWORD)})
    for rid, kind, title, body, status in RULE_SEED:
        db[RULES].update_one({"id": rid}, {"$setOnInsert": {"id": rid, "kind": kind, "title": title, "body": body, "status": status},
                                                  "$set": {"linked": sd.RULE_LINKED.get(rid, []), "history": sd.RULE_HISTORY}}, upsert=True)
    for cid, title, ch, owner, risk, status, upd, exc, claims in CONTENT_SEED:
        db[CONTENT].update_one({"id": cid}, {"$setOnInsert": {"id": cid, "title": title, "channel": ch, "owner": owner, "risk": risk,
                                                              "status": status, "updated": upd, "excerpt": exc, "claims": claims}}, upsert=True)

    # Reference collections: pure seed data, keyed upserts only (idempotent, never touches other DBs).
    for coll, rows, key in ((TREND, sd.TREND_SEED, "m"), (ACTIVITY, sd.ACTIVITY_SEED, "id"),
                            (PRECEDENTS, sd.PRECEDENT_SEED, "id"), (STRESS_SCORES, sd.STRESS_SCORES, "id"),
                            (STRESS_AMBIGUOUS, sd.STRESS_AMBIGUOUS, "id"), (EVIDENCE_NODES, sd.EVIDENCE_NODES, "id"),
                            (EVIDENCE_EDGES, sd.EVIDENCE_EDGES, "id"), (BLAST_DEPS, sd.BLAST_DEPS, "content_id")):
        for row in rows:
            db[coll].update_one({key: row[key]}, {"$set": row}, upsert=True)
