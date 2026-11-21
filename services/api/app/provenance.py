"""C2PA provenance for Proof Cards: a PNG of the card with a real, embedded C2PA manifest (c2pa-python).

Signing certificate: a SELF-SIGNED DEMO certificate chain (demo root + leaf, ES256) generated once and
stored in the 'keys' collection. It is NOT issued by a trusted CA, so C2PA validators report the signer
as untrusted; the signature and content binding are still cryptographically checked.
"""
import io
import json
from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID
from PIL import Image, ImageDraw, ImageFont

from .db import get_db

try:
    import c2pa
    AVAILABLE = True
except Exception:  # noqa: BLE001
    c2pa = None
    AVAILABLE = False

KEY_ID = "c2pa-es256-demo"
CONFORMANCE = "c2pa-embedded"
CERT_NOTE = ("Signed with a self-signed demo certificate, not a trusted CA. Validators will report the signer "
             "as untrusted; the signature and the binding to the image bytes are still verified.")


def _name(cn: str) -> x509.Name:
    return x509.Name([x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
                      x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Threadline Demo"),
                      x509.NameAttribute(NameOID.COMMON_NAME, cn)])


def _generate() -> tuple[bytes, bytes]:
    now = datetime.now(timezone.utc)
    ca, leaf_k = ec.generate_private_key(ec.SECP256R1()), ec.generate_private_key(ec.SECP256R1())

    def base(sub, iss, pub):
        return (x509.CertificateBuilder().subject_name(sub).issuer_name(iss).public_key(pub)
                .serial_number(x509.random_serial_number())
                .not_valid_before(now - timedelta(days=1)).not_valid_after(now + timedelta(days=3650)))

    root_name = _name("Threadline Demo Root (self-signed, untrusted)")
    root = (base(root_name, root_name, ca.public_key())
            .add_extension(x509.BasicConstraints(ca=True, path_length=None), True)
            .add_extension(x509.KeyUsage(False, False, False, False, False, True, True, False, False), True)
            .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca.public_key()), False)
            .sign(ca, hashes.SHA256()))
    leaf = (base(_name("Threadline Demo Signer"), root_name, leaf_k.public_key())
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), True)
            .add_extension(x509.KeyUsage(True, False, False, False, False, False, False, False, False), True)
            .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.EMAIL_PROTECTION]), False)
            .add_extension(x509.SubjectKeyIdentifier.from_public_key(leaf_k.public_key()), False)
            .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca.public_key()), False)
            .sign(ca, hashes.SHA256()))
    chain = leaf.public_bytes(serialization.Encoding.PEM) + root.public_bytes(serialization.Encoding.PEM)
    key = leaf_k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                               serialization.NoEncryption())
    return chain, key


def _credentials() -> tuple[bytes, bytes]:
    keys = get_db().keys
    doc = keys.find_one({"_id": KEY_ID})
    if not doc:
        chain, key = _generate()
        try:
            keys.insert_one({"_id": KEY_ID, "chain_pem": chain.decode(), "key_pem": key.decode(),
                             "note": "self-signed demo certificate, not a trusted CA"})
        except Exception:  # noqa: BLE001  lost a race: use the stored one
            pass
        doc = keys.find_one({"_id": KEY_ID})
    return doc["chain_pem"].encode(), doc["key_pem"].encode()


def render_card_png(card: dict, title: str) -> bytes:
    img = Image.new("RGB", (900, 520), "#fbfaf7")
    d = ImageDraw.Draw(img)
    try:
        big, mid, small = (ImageFont.truetype("DejaVuSans.ttf", s) for s in (30, 20, 15))
    except Exception:  # noqa: BLE001
        big = mid = small = ImageFont.load_default()
    approved = card["decision"] == "approve"
    d.rectangle([0, 0, 900, 12], fill="#1f7a6d" if approved else "#b5532f")
    d.text((40, 36), "Threadline Proof Card", fill="#1b1b1b", font=big)
    d.text((40, 82), title[:70], fill="#444", font=mid)
    rows = [("Decision", "Approved" if approved else "Changes requested"),
            ("Reviewer", f"{card['reviewer']['name']} ({card['reviewer']['role']})"),
            ("Decided at", card["timestamp"]),
            ("Findings", str(len(card["findings"]))),
            ("Routing", ", ".join(card["routing"])),
            ("Content SHA-256", card["content_hash"][:32]),
            ("", card["content_hash"][32:])]
    y = 140
    for k, v in rows:
        d.text((40, y), k, fill="#777", font=small)
        d.text((220, y), v, fill="#1b1b1b", font=mid)
        y += 44
    d.text((40, 470), "Rules-based review; a person made the decision. Provenance: C2PA, self-signed demo certificate.",
           fill="#777", font=small)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def sign_card(card: dict, title: str) -> bytes:
    if not AVAILABLE:
        raise RuntimeError("c2pa-python is not available on this platform")
    chain, key = _credentials()
    signer = c2pa.Signer.from_info(c2pa.C2paSignerInfo(c2pa.C2paSigningAlg.ES256, chain, key, None))
    manifest = {
        "claim_generator_info": [{"name": "Threadline", "version": "0.1"}],
        "title": f"Proof Card: {title}"[:120],
        "assertions": [
            {"label": "c2pa.actions", "data": {"actions": [{
                "action": "c2pa.created",
                "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation"}]}},
            {"label": "org.threadline.proof", "data": {
                "content_sha256": card["content_hash"], "decision": card["decision"],
                "findings_count": len(card["findings"]), "routing": card["routing"],
                "reviewer_role": card["reviewer"]["role"], "decided_at": card["timestamp"],
                "proof_card_signature": card["signature"], "engine": "heuristic-rules (not an LLM)"}},
        ],
    }
    png = render_card_png(card, title)
    out = io.BytesIO()
    b = c2pa.Builder(json.dumps(manifest))
    try:
        b.sign(signer, "image/png", io.BytesIO(png), out)
    finally:
        b.close()
    return out.getvalue()


def verify_png(data: bytes) -> dict:
    base = {"conformance": CONFORMANCE, "signer_trusted": False, "certificate_note": CERT_NOTE}
    if not AVAILABLE:
        return {**base, "conformance": "unavailable", "valid": False, "reason": "c2pa reader not available"}
    try:
        reader = c2pa.Reader("image/png", io.BytesIO(data))
    except Exception as e:  # noqa: BLE001
        return {**base, "valid": False, "reason": f"No readable C2PA manifest: {type(e).__name__}"}
    try:
        res = reader.get_validation_results() or {}
        active = res.get("activeManifest") or {}
        failures = [{"code": f.get("code"), "explanation": f.get("explanation")} for f in active.get("failure", [])]
        hard = [f for f in failures if f["code"] != "signingCredential.untrusted"]
        parsed = json.loads(reader.json())
        m = parsed.get("manifests", {}).get(parsed.get("active_manifest"), {})
        proof = next((a["data"] for a in m.get("assertions", []) if a.get("label") == "org.threadline.proof"), None)
        ok = not hard and bool(m)
        return {**base, "valid": ok,
                "reason": "Signature and content binding valid (signer untrusted: self-signed demo certificate)"
                if ok else "Manifest validation failed: " + "; ".join(f["code"] or "?" for f in hard),
                "validation_state": str(reader.get_validation_state()), "failures": failures,
                "claim_generator": m.get("claim_generator_info"), "title": m.get("title"),
                "signature_info": m.get("signature_info"), "threadline_assertion": proof,
                "assertion_labels": [a.get("label") for a in m.get("assertions", [])]}
    finally:
        reader.close()
