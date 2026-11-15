"""MongoDB access. Uses MONGODB_URL (pymongo) or, if unset, an in-memory mongomock DB.

The URL is never logged or printed (it may contain credentials).
"""
import os
import threading

_lock = threading.Lock()
_db = None
IN_MEMORY = False


def _connect():
    global IN_MEMORY
    name = os.environ.get("MONGODB_DB", "threadline")
    url = os.environ.get("MONGODB_URL", "").strip()
    if url:
        from pymongo import MongoClient

        IN_MEMORY = False
        return MongoClient(url, serverSelectionTimeoutMS=8000, tz_aware=True)[name]
    import mongomock

    IN_MEMORY = True
    return mongomock.MongoClient(tz_aware=True)[name]


def get_db():
    """Return the active database, connecting and seeding (idempotently) on first use."""
    global _db
    if _db is None:
        with _lock:
            if _db is None:
                db = _connect()
                from .seed import seed

                seed(db)
                _db = db
    return _db


def reset_for_tests() -> None:
    global _db
    _db = None
