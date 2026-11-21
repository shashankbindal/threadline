"""Minimal OpenAI-compatible chat client over httpx. Never raises; never logs keys or prompts.

The model is given NO tools and its output is only ever parsed as data by verify.py.
"""
import json
import os
from typing import Any

import httpx

DEFAULT_BASE = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = "openai/gpt-oss-20b"
TIMEOUT = 25.0
RETRIES = 1


def _key() -> str:
    return (os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY") or "").strip()


def _base() -> str:
    return (os.environ.get("LLM_BASE_URL") or DEFAULT_BASE).rstrip("/")


def model() -> str:
    return os.environ.get("LLM_MODEL") or DEFAULT_MODEL


def configured() -> bool:
    return bool(_key())


def provider() -> str:
    host = _base().split("//")[-1].split("/")[0]
    return "groq" if "groq.com" in host else host


def chat_json(messages: list[dict]) -> dict[str, Any]:
    """Return {status: 'ok'|'unavailable'|'error', model, data: dict|None}. Never raises."""
    out: dict[str, Any] = {"status": "unavailable", "model": model(), "data": None}
    if not configured():
        return out
    body = {"model": model(), "messages": messages, "temperature": 0,
            "response_format": {"type": "json_object"}}
    headers = {"Authorization": f"Bearer {_key()}", "Content-Type": "application/json"}
    out["status"] = "error"
    for _ in range(RETRIES + 1):
        try:
            r = httpx.post(f"{_base()}/chat/completions", json=body, headers=headers, timeout=TIMEOUT)
            if r.status_code != 200:
                continue
            data = json.loads(r.json()["choices"][0]["message"]["content"])
            if isinstance(data, dict):
                out.update(status="ok", data=data)
                return out
        except Exception:  # network, JSON, shape: all degrade to 'error'
            continue
    return out
