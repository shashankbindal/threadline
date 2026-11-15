"""Collection names and document shapes (MongoDB is schemaless; shapes documented here).

users:        {id, email, name, initials, title, role, canDecide, password_hash}
rules:        {id, kind, title, body, status}
content:      {id, title, channel, owner, risk, status, updated, excerpt, claims}
reviews:      {id, title, text, content_hash, findings, severity, routing, status,
               submitted_by, created_at, comments[], decision, proof}
audit_events: {id, review_id, seq, action, actor_id, actor_name, actor_role, detail, at}
              (append-only: the code only ever inserts)
keys:         {_id:'proof-ed25519', private_b64}
"""
USERS = "users"
RULES = "rules"
CONTENT = "content"
REVIEWS = "reviews"
AUDIT = "audit_events"
KEYS = "keys"
TREND = "trend"
ACTIVITY = "activity"
PRECEDENTS = "precedents"
STRESS_SCORES = "stress_scores"
STRESS_AMBIGUOUS = "stress_ambiguous"
EVIDENCE_NODES = "evidence_nodes"
EVIDENCE_EDGES = "evidence_edges"
BLAST_DEPS = "blast_deps"

ROLES = ("Legal", "Brand", "Compliance", "Viewer")
