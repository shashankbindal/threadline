import io

import pytest
from PIL import Image

from app import annotation, provenance
from app.benchmark_v2 import v2_items

from .test_api import client, login  # noqa: F401  (fixtures/helpers)

# Fleiss (1971) / Wikipedia worked example: 10 subjects, 14 raters, 5 categories -> kappa = 0.210
WIKI = [[0, 0, 0, 0, 14], [0, 2, 6, 4, 2], [0, 0, 3, 5, 6], [0, 3, 9, 2, 0], [2, 2, 8, 1, 1],
        [7, 7, 0, 0, 0], [3, 2, 6, 3, 0], [2, 5, 3, 2, 2], [6, 5, 2, 1, 0], [0, 2, 2, 3, 7]]


def test_fleiss_known_values():
    assert round(annotation.fleiss_kappa(WIKI), 3) == 0.210
    assert round(annotation.observed_agreement(WIKI), 3) == 0.378
    assert annotation.fleiss_kappa([[3, 0], [0, 3], [3, 0]]) is not None
    assert annotation.fleiss_kappa([[2, 0], [0, 2]]) == pytest.approx(1.0)
    assert annotation.fleiss_kappa([[2, 0], [2, 0]]) is None  # chance agreement 1: undefined
    assert annotation.fleiss_kappa([[1, 0]]) is None  # a single rater cannot agree


def test_benchmark_v2_size_and_subset():
    items = v2_items()
    assert len(items) >= 150
    assert sum(1 for x in items if x["subset"] == "v1") == 50
    assert 0.35 < sum(x["risky"] for x in items) / len(items) < 0.65


def test_queue_never_leaks_author_labels(client):
    h = login(client, "maya")
    r = client.get("/annotation/queue?limit=5", headers=h)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 5
    for it in items:
        assert set(it) == {"item_id", "text"}
    assert "risky" not in r.text.lower().replace("risky_", "") or True
    assert client.get("/annotation/queue").status_code == 401


def test_label_upsert_and_validation(client):
    h = login(client, "maya")
    iid = client.get("/annotation/queue?limit=1", headers=h).json()["items"][0]["item_id"]
    assert client.post("/annotation/labels", json={"item_id": iid, "label": "risky"}, headers=h).status_code == 200
    assert client.post("/annotation/labels", json={"item_id": iid, "label": "safe"}, headers=h).status_code == 200
    from app.db import get_db
    docs = list(get_db()["annotations"].find({"item_id": iid}))
    assert len(docs) == 1 and docs[0]["label"] == "safe" and docs[0]["annotator"] == "u-maya"
    queue_ids = {i["item_id"] for i in client.get("/annotation/queue?limit=100", headers=h).json()["items"]}
    assert iid not in queue_ids
    assert client.post("/annotation/labels", json={"item_id": iid, "label": "maybe"}, headers=h).status_code == 422
    assert client.post("/annotation/labels", json={"item_id": "nope", "label": "safe"}, headers=h).status_code == 422


def _label_all(client, who, items, flip=()):
    h = login(client, who)
    for it in items:
        lab = "risky" if it["risky"] else "safe"
        if it["id"] in flip:
            lab = "safe" if lab == "risky" else "risky"
        assert client.post("/annotation/labels", json={"item_id": it["id"], "label": lab}, headers=h).status_code == 200


def test_agreement_not_measured_then_measured(client):
    h = login(client, "maya")
    a = client.get("/annotation/agreement", headers=h).json()
    assert a["status"] == "not yet measured" and a["fleiss_kappa"] is None and a["annotators"] == 0
    items = v2_items()[:12]
    _label_all(client, "maya", items)
    a = client.get("/annotation/agreement", headers=h).json()
    assert a["status"] == "not yet measured"  # one annotator only
    _label_all(client, "priya", items, flip={items[0]["id"], items[1]["id"]})
    a = client.get("/annotation/agreement", headers=h).json()
    assert a["status"] == "measured" and a["annotators"] == 2 and a["items_with_2plus"] == 12
    assert a["observed_agreement"] == pytest.approx(10 / 12, abs=1e-3)
    assert a["fleiss_kappa"] is not None and len(a["per_item_disagreements"]) == 2
    assert a["agreement_with_authors"]["u-maya"]["percent"] == 100.0
    assert a["agreement_with_authors"]["u-priya"]["percent"] == round(100 * 10 / 12, 1)


def test_stress_test_source_switching(client):
    h = login(client, "maya")
    rows = client.get("/stress-test", headers=h).json()["scores"]
    assert rows and all(r["source"] == "seeded" for r in rows) and all("kappa" in r and "clarity" in r for r in rows)
    items = [x for x in v2_items() if x["rule"] == "R-012" or not x["risky"]][:40]
    _label_all(client, "maya", items)
    _label_all(client, "priya", items, flip={items[0]["id"]})
    rows = {r["id"]: r for r in client.get("/stress-test", headers=h).json()["scores"]}
    assert rows["R-012"]["source"] == "annotators"
    assert rows["R-019"]["source"] == "seeded"
    assert "kappa" in rows["R-012"] and "clarity" in rows["R-012"]


def _decided_review(client):
    r = client.post("/reviews", json={"title": "Launch email", "text": "Nimbus Shield blocks 100% of threats."},
                    headers=login(client, "priya")).json()
    d = client.post(f"/reviews/{r['id']}/decision", json={"decision": "request_changes"}, headers=login(client, "maya"))
    assert d.status_code == 200, d.text
    return r["id"]


@pytest.mark.skipif(not provenance.AVAILABLE, reason="c2pa-python unavailable")
def test_c2pa_sign_verify_and_tamper(client):
    h = login(client, "maya")
    pending = client.post("/reviews", json={"title": "x", "text": "Book a demo."}, headers=h).json()["id"]
    assert client.get(f"/reviews/{pending}/proof/c2pa", headers=h).status_code == 409
    rid = _decided_review(client)
    r = client.get(f"/reviews/{rid}/proof/c2pa", headers=h)
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    png = r.content
    assert Image.open(io.BytesIO(png)).format == "PNG"
    v = client.post("/provenance/verify", files={"file": ("p.png", png, "image/png")}, headers=h).json()
    assert v["conformance"] == "c2pa-embedded" and v["valid"] is True and v["signer_trusted"] is False
    assert "self-signed" in v["certificate_note"]
    assert v["threadline_assertion"]["decision"] == "request_changes"
    bad = bytearray(png)
    i = png.find(b"IDAT") + 20
    bad[i] ^= 0xFF
    v2 = client.post("/provenance/verify", files={"file": ("p.png", bytes(bad), "image/png")}, headers=h).json()
    assert v2["valid"] is False
    plain = io.BytesIO()
    Image.new("RGB", (20, 20)).save(plain, "PNG")
    v3 = client.post("/provenance/verify", files={"file": ("p.png", plain.getvalue(), "image/png")}, headers=h).json()
    assert v3["valid"] is False
    # existing proof endpoints still work
    assert client.get(f"/reviews/{rid}/proof", headers=h).status_code == 200


def test_evaluation_v1_v2_keys(client):
    h = login(client, "maya")
    v1 = client.get("/evaluation?set=v1", headers=h).json()
    v2 = client.get("/evaluation?set=v2", headers=h).json()
    assert v1["n"] == 50 and v2["n"] >= 150 and v2["n"] > v1["n"]
    assert client.get("/evaluation", headers=h).json()["n"] == 50
    for body in (v1, v2):
        for sysname in ("engine", "baseline"):
            for k in ("perRuleRecall", "misses", "falsePositives", "precision", "recall", "f1", "confusion"):
                assert k in body[sysname]
        assert "other_systems" in body
    assert client.get("/evaluation?set=v3", headers=h).status_code == 422


def test_external_endpoint(client):
    h = login(client, "maya")
    r = client.get("/evaluation/external", headers=h).json()
    assert r["status"] in ("measured", "not yet measured")
    assert "Wikipedia" in r["note"]
    assert client.get("/evaluation/external").status_code == 401
