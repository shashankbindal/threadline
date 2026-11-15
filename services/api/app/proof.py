"""Proof Card: canonical JSON, SHA-256 content hash, Ed25519 signature.

Signing key: env PROOF_PRIVATE_KEY (base64 of the 32 raw seed bytes) else generated
once and persisted in the 'keys' collection so it is stable across restarts.
"""
import base64
import hashlib
import json
import os

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from .db import get_db

ALGORITHM = "Ed25519"


def canonical(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _raw_private(key: Ed25519PrivateKey) -> bytes:
    return key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())


def _private_key() -> Ed25519PrivateKey:
    env = os.environ.get("PROOF_PRIVATE_KEY", "").strip()
    if env:
        return Ed25519PrivateKey.from_private_bytes(base64.b64decode(env))
    keys = get_db().keys
    doc = keys.find_one({"_id": "proof-ed25519"})
    if doc:
        return Ed25519PrivateKey.from_private_bytes(base64.b64decode(doc["private_b64"]))
    key = Ed25519PrivateKey.generate()
    try:
        keys.insert_one({"_id": "proof-ed25519", "private_b64": base64.b64encode(_raw_private(key)).decode()})
    except Exception:  # lost a race with another worker: use the stored key
        return Ed25519PrivateKey.from_private_bytes(
            base64.b64decode(keys.find_one({"_id": "proof-ed25519"})["private_b64"]))
    return key


def public_key_b64() -> str:
    raw = _private_key().public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return base64.b64encode(raw).decode()


def issue(content_hash_: str, findings: list, routing: list, decision: str, reviewer: dict, timestamp: str) -> dict:
    card = {
        "content_hash": content_hash_, "findings": findings, "routing": routing,
        "decision": decision, "reviewer": reviewer, "timestamp": timestamp,
        "algorithm": ALGORITHM, "public_key": public_key_b64(),
    }
    card["signature"] = base64.b64encode(_private_key().sign(canonical(card))).decode()
    return card


def verify(card: dict) -> tuple[bool, str]:
    try:
        sig = card.get("signature")
        if not sig or card.get("algorithm") != ALGORITHM or not card.get("public_key"):
            return False, "Malformed card"
        if card["public_key"] != public_key_b64():
            return False, "Unknown signer (public key does not match this server)"
        body = {k: v for k, v in card.items() if k != "signature"}
        Ed25519PublicKey.from_public_bytes(base64.b64decode(card["public_key"])).verify(base64.b64decode(sig), canonical(body))
        return True, "Signature valid; card has not been altered"
    except (InvalidSignature, ValueError, TypeError):
        return False, "Signature does not match content (card altered or malformed)"
