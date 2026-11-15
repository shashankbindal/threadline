from .test_api import RISKY_HIGH, client, login  # noqa: F401  (client is a fixture)


def test_overview_computed_and_activity(client):
    h = login(client, "priya")
    assert client.get("/overview").status_code == 401
    o = client.get("/overview", headers=h).json()
    assert [r["name"] for r in o["riskMix"]] == ["Low", "Medium", "High", "Critical"]
    assert sum(r["v"] for r in o["riskMix"]) == 8
    k = {x["key"]: x for x in o["kpis"]}
    assert k["flagged"]["value"] == 3 and k["approved"]["value"] == 2 and k["fixes"]["value"] == 2
    assert all(x["live"] for x in o["kpis"])
    assert [t["m"] for t in o["trend"]] == ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]
    assert len(o["topRisky"]) == 5 and o["topRisky"][0]["risk"] == "Critical"
    assert all(a["source"] == "seed" for a in o["activity"])
    client.post("/reviews", json={"title": "Live review", "text": RISKY_HIGH}, headers=h)
    first = client.get("/overview", headers=h).json()["activity"][0]
    assert first["source"] == "audit" and first["target"] == "Live review" and first["what"] == "submitted for review"


def test_reference_endpoints(client):
    for p in ("/precedents", "/stress-test", "/evidence-graph", "/content/C-101/blast-radius", "/overview"):
        assert client.get(p).status_code == 401
    h = login(client, "maya")
    p = client.get("/precedents", headers=h).json()
    assert len(p["precedents"]) == 7 and p["conflicts"] == [["P-118", "P-097"]]
    s = client.get("/stress-test", headers=h).json()
    assert len(s["scores"]) == 6 and len(s["ambiguous"]) == 2 and s["ambiguous"][0]["votes"][0]["who"]
    g = client.get("/evidence-graph", headers=h).json()
    ids = {n["id"] for n in g["nodes"]}
    assert len(g["nodes"]) == 10 and all(e["source"] in ids and e["target"] in ids for e in g["edges"])
    b = client.get("/content/C-101/blast-radius", headers=h).json()
    assert [c["id"] for c in b["affected"]] == ["C-101", "C-108", "C-105"]
    assert [c["id"] for c in client.get("/content/C-106/blast-radius", headers=h).json()["affected"]] == ["C-106"]
    assert client.get("/content/NOPE/blast-radius", headers=h).status_code == 404
    rules = client.get("/rules", headers=h).json()
    assert next(r for r in rules if r["id"] == "R-012")["linked"] and rules[0]["history"]
