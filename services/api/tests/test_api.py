import copy

import pytest
from fastapi.testclient import TestClient

from app import db as dbmod
from app.engine import analyze


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.delenv("MONGODB_URL", raising=False)  # force in-memory mongomock
    monkeypatch.setenv("JWT_SECRET", "test-secret-for-tests-only-0123456789")
    dbmod.reset_for_tests()
    from app.main import app

    with TestClient(app) as c:
        yield c
    dbmod.reset_for_tests()


def login(client, who):
    r = client.post("/auth/login", json={"email": f"{who}@threadline.demo", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


RISKY_HIGH = "Nimbus Shield blocks 100% of threats, guaranteed."
LOW = "Stop hackers in their tracks."
MED = "Trusted by over 10,000 teams worldwide."


def test_seed_idempotent_and_public_data(client):
    h = login(client, "maya")
    assert len(client.get("/content", headers=h).json()) == 8
    n = len(client.get("/rules", headers=h).json())
    from app.seed import seed

    seed(dbmod.get_db())
    seed(dbmod.get_db())
    assert len(client.get("/rules", headers=h).json()) == n
    assert client.get("/health").json()["status"] == "ok"


def test_auth(client):
    assert client.post("/auth/login", json={"email": "maya@threadline.demo", "password": "bad"}).status_code == 401
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401
    r = client.get("/auth/me", headers=login(client, "priya"))
    assert r.json()["role"] == "Brand" and r.json()["canDecide"] is True
    assert "password_hash" not in r.json()
    assert client.get("/auth/me", headers=login(client, "tom")).json()["canDecide"] is False


def test_routing():
    assert analyze(LOW)["routing"] == ["Brand"]
    assert analyze(MED)["routing"] == ["Brand", "Legal"]
    a = analyze(RISKY_HIGH)
    assert a["severity"] == "High" and a["routing"] == ["Legal", "Compliance"] and a["engine"] == "heuristic-rules"
    assert analyze("Harbor Clinic stayed HIPAA compliant.")["severity"] == "Critical"
    assert analyze("A calm sentence.")["findings"] == []


def test_review_flow_rbac_audit_proof(client):
    tom, priya, maya, ken = (login(client, w) for w in ("tom", "priya", "maya", "ken"))
    # client-supplied findings are ignored
    r = client.post("/reviews", headers=priya, json={"title": "Email", "text": RISKY_HIGH, "findings": [], "routing": ["Brand"]})
    assert r.status_code == 201
    rid = r.json()["id"]
    assert r.json()["routing"] == ["Legal", "Compliance"] and r.json()["findings"]
    assert r.json()["status"] == "pending"

    d = {"decision": "approve", "note": "ok"}
    assert client.post(f"/reviews/{rid}/decision", headers=tom, json=d).status_code == 403  # viewer
    assert client.post(f"/reviews/{rid}/decision", headers=priya, json=d).status_code == 403  # Brand not routed
    assert client.get(f"/reviews/{rid}/proof", headers=maya).status_code == 409  # undecided
    assert client.post(f"/reviews/{rid}/decision", headers=maya, json={"decision": "nope"}).status_code == 422
    assert client.get(f"/reviews/{rid}", headers=maya).json()["decision"] is None  # never auto-approved

    assert client.post(f"/reviews/{rid}/comments", headers=tom, json={"text": "please check"}).status_code == 201
    assert client.post(f"/reviews/{rid}/decision", headers=maya, json={"decision": "request_changes", "note": "remove 100%"}).status_code == 200
    assert client.post(f"/reviews/{rid}/decision", headers=ken, json=d).status_code == 409

    actions = [e["action"] for e in client.get(f"/reviews/{rid}/audit", headers=maya).json()]
    assert actions == ["submitted", "comment", "decision", "proof_issued"]
    assert [r["id"] for r in client.get("/reviews", headers=maya).json()] == [rid]

    card = client.get(f"/reviews/{rid}/proof", headers=maya).json()
    assert card["algorithm"] == "Ed25519" and card["decision"] == "request_changes"
    assert card["reviewer"]["role"] == "Legal"
    v = client.post("/proof/verify", json={"card": card}).json()
    assert v["valid"] is True


def test_tamper_detection(client):
    priya, maya = login(client, "priya"), login(client, "maya")
    rid = client.post("/reviews", headers=priya, json={"title": "t", "text": LOW}).json()["id"]
    client.post(f"/reviews/{rid}/decision", headers=priya, json={"decision": "approve", "note": ""})
    card = client.get(f"/reviews/{rid}/proof", headers=priya).json()
    assert client.post("/proof/verify", json={"card": card}).json()["valid"] is True
    for field, val in (("decision", "request_changes"), ("content_hash", "0" * 64), ("routing", ["Legal"])):
        bad = copy.deepcopy(card)
        bad[field] = val
        assert client.post("/proof/verify", json={"card": bad}).json()["valid"] is False
    bad = copy.deepcopy(card)
    bad["signature"] = "AAAA"
    assert client.post("/proof/verify", json={"card": bad}).json()["valid"] is False
    assert client.post("/proof/verify", json={"card": {}}).json()["valid"] is False


def test_analyze_and_evaluation(client):
    h = login(client, "tom")
    a = client.post("/analyze", headers=h, json={"text": RISKY_HIGH}).json()
    assert a["engine"] == "heuristic-rules" and a["routing"] == ["Legal", "Compliance"]
    ev = client.get("/evaluation", headers=h).json()
    assert ev["n"] == 50 and ev["risky"] == 25 and "50-example seeded benchmark" in ev["note"]
    for k in ("precision", "recall", "f1", "accuracy", "confusion", "perRuleRecall", "misses", "falsePositives"):
        assert k in ev["engine"] and k in ev["baseline"]
    c = ev["engine"]["confusion"]
    assert sum(c.values()) == 50
    assert ev["engine"]["recall"] > ev["baseline"]["recall"]
    assert ev["engine"]["misses"] and ev["engine"]["falsePositives"]  # honest: imperfect
