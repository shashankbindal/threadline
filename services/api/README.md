# Threadline API

FastAPI backend for the Threadline prototype (fictional Nimbus Shield data). The Reader Lens is a
**rules-based regex engine, not an LLM**. People make every decision; nothing is auto-approved.

## Run locally
```
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt     # Windows (use .venv/bin/pip elsewhere)
.venv\Scripts\uvicorn app.main:app --reload
.venv\Scripts\python -m pytest
```
Docs at http://localhost:8000/docs. Demo logins (password `demo1234`): maya@ (Legal), priya@ (Brand),
ken@ (Compliance), tom@ (Viewer) `@threadline.demo`.

## Storage
MongoDB via `MONGODB_URL` (database `MONGODB_DB`, default `threadline`). If `MONGODB_URL` is unset an
in-memory mongomock DB is used (data lost on restart). Demo users, rules and content are seeded
idempotently at startup in whichever DB is active. The URL is never logged.

## Environment
| Var | Purpose |
|---|---|
| `MONGODB_URL` | Mongo connection string (unset = in-memory) |
| `MONGODB_DB` | database name (default `threadline`) |
| `JWT_SECRET` | HS256 secret (random per process if unset: set it in production) |
| `ALLOWED_ORIGINS` | comma-separated CORS origins (default `*`) |
| `PROOF_PRIVATE_KEY` | optional base64 Ed25519 32-byte seed; otherwise generated and stored in the `keys` collection |

## Endpoints
`GET /health`, `POST /auth/login`, `GET /auth/me`, `GET /rules`, `GET /content`, `POST /analyze`,
`POST|GET /reviews`, `GET /reviews/{id}`, `POST /reviews/{id}/comments`, `POST /reviews/{id}/decision`,
`GET /reviews/{id}/audit`, `GET /reviews/{id}/proof`, `POST /proof/verify`, `GET /evaluation`.

Frontend data endpoints (auth required; no fixtures live in the web app):
`GET /overview` (kpis, riskMix computed live from `content`/`reviews`; trend is seeded history; activity merges seeded
entries with real `audit_events`), `GET /precedents` (conflicts computed), `GET /stress-test`, `GET /evidence-graph`,
`GET /content/{id}/blast-radius`; `GET /rules` also returns `linked` and `history`. Seed data lives in
`app/seed_data.py` and is upserted idempotently at startup (only into the app database).

Routing: Low -> Brand; Medium -> Brand+Legal; High/Critical -> Legal+Compliance. A decision needs a
role that can decide and is in the review's routed roles (else 403).
`/evaluation` is measured on the 50-example seeded benchmark (author-labelled, small, not independent).
