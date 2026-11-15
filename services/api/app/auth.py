"""Password hashing (bcrypt), JWT (HS256) and FastAPI dependencies."""
import os
import secrets
import time
from typing import Callable

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .db import get_db

# If JWT_SECRET is unset (local dev only) use a per-process random secret.
_FALLBACK_SECRET = secrets.token_urlsafe(32)
TOKEN_TTL = 12 * 3600
_bearer = HTTPBearer(auto_error=False)


def _secret() -> str:
    return os.environ.get("JWT_SECRET") or _FALLBACK_SECRET


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: str) -> str:
    now = int(time.time())
    return jwt.encode({"sub": user_id, "iat": now, "exp": now + TOKEN_TTL}, _secret(), algorithm="HS256")


def public_user(u: dict) -> dict:
    return {k: u[k] for k in ("id", "name", "initials", "title", "role", "canDecide")}


def get_user(cred: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if cred is None:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(cred.credentials, _secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = get_db().users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Unknown user")
    return user


def require_role(*roles: str) -> Callable:
    def dep(user: dict = Depends(get_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, "Role not permitted")
        return user

    return dep
