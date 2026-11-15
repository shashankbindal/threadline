<p align="center"><img src="apps/web/public/logo-full.png" alt="Threadline" width="320" /></p>

# Threadline

**Impression-first brand governance.** Most brand checks ask "does this text break a rule?". Threadline asks the question that actually carries the risk: *what will a reader walk away believing, and can we prove it?*

**Live demo:** https://threadline.shashankbindal.me (demo accounts are listed on the sign-in screen)  
**API:** https://threadline-api-425e.onrender.com/health (Render free tier; the first request after idle can take ~30 s)

> **Scope of this build.** A full-stack prototype: Next.js front end plus a FastAPI + MongoDB back end with real authentication, role-based access control, an append-only audit log, Ed25519-signed Proof Cards and a measured evaluation. The Reader Lens uses a deterministic rules engine, **not an LLM**. Brand data, content and metrics on the dashboards are fictional demo data (Nimbus Shield); the evaluation numbers are measured on a 50-example benchmark we wrote ourselves. See [Current limitations](#current-limitations).

---

## 1. Understanding the problem

Brand, legal and compliance teams review marketing content against long guideline documents, one rule at a time. That approach fails in four ways:

1. **It checks words, not impressions.** "No setup needed" or "protects against everything" may match no banned phrase, yet readers will believe it. The risk lives in the *implied* claim.
2. **Reviews are inconsistent.** Two reviewers read the same rule differently, and past exceptions are forgotten, so identical cases get different answers.
3. **Nobody knows the blast radius.** When a fact or rule changes (a benchmark number, a customer count), there is no quick way to find every asset that depends on it.
4. **There is no evidence trail.** Approvals are an email thread. Months later nobody can show what was checked, against which source, or who decided.

Threadline's answer is a workflow that treats every claim as something to be *traced to evidence*, and keeps a person in charge of every decision.

## 2. Solution workflow

The same pipeline is shown in the app's top bar on every page:

```
Brand Graph → Intent → Ingest → Reader Lens → Evidence Check → Precedents → Fix & Route → Approval → Proof Card
```

| Stage | Purpose |
|---|---|
| **Brand Graph** | Approved guidelines (R-), facts (F-), terminology (T-) and assets (A-) with stable IDs. The single source of truth. |
| **Intent** | What the content is meant to achieve and for whom. |
| **Ingest** | Bring in text or images to review. |
| **Reader Lens** | Predict the beliefs a reader forms, stated or implied, each with a confidence score. |
| **Evidence Check** | Match each belief to an approved source: *supported, partial, gap, contradicted*. |
| **Precedents (Case Law)** | Surface earlier decisions and exceptions so similar cases are treated alike; flag conflicts. |
| **Fix & Route** | Suggest a minimal edit and route to Brand, Legal or Compliance by severity. |
| **Approval** | A human reviewer decides, with comments and an audit trail. |
| **Proof Card** | An evidence-backed report of what was checked and who approved it. |

### Core principle: AI recommends, people decide

There is no code path that approves content or applies an edit automatically. Suggestions are proposals. The Approve and Request changes buttons are enabled only for a signed-in human reviewer role, and the read-only role cannot use them.

---

## 3. Application tour

| Page | Route | What it does |
|---|---|---|
| Overview | `/` | KPI tiles, risk-mix donut, six-month review trend, activity feed, riskiest content |
| Reader Lens | `/reader-lens` | Text/image review view: predicted beliefs, implied claims, confidence, evidence gaps, suggested minimal edit |
| Evidence Threads | `/evidence-threads` | Interactive graph from claims to beliefs to approved sources, with status filters and a detail panel |
| Brand Graph | `/brand-graph` | Browse guidelines, facts, terms and assets with tabs, search and detail views |
| Brand Case Law | `/case-law` | Past decisions and exceptions with rationale, similarity score and conflict warnings |
| Stress Test | `/stress-test` | Clarity score and reviewer agreement per guideline, ambiguous-rule probes, rewrite proposals |
| Content Library | `/content` | Table/grid, filters, previews, and a blast-radius graph of what a rule change affects |
| Approvals & Proof Cards | `/approvals` | Role-routed queue, comments, evidence checklist, audit trail, downloadable Proof Card |

**Two-minute walkthrough**

1. Sign in as **Maya R. (Legal Counsel)**.
2. **Reader Lens**: open the sample launch email and look at the beliefs marked *contradicted*.
3. **Evidence Threads**: click a contradicted belief to see the source that disproves it.
4. **Content Library**: open "Spring launch email" and view its blast radius.
5. **Approvals & Proof Cards**: approve an item and download its Proof Card.
6. Sign out, then sign in as **Tom K. (read-only)**: the decision buttons stay locked.

---

## 3a. How to use

**As a reviewer (Legal / Brand / Compliance)**
1. Sign in at the live URL with a demo account (see the table below; password `demo1234`).
2. Open **Reader Lens**, paste or type a draft. `POST /analyze` runs on each change and highlights flagged spans with rule code, predicted belief, confidence, evidence status, source and a suggested replacement.
3. Click **Apply suggested edit** to change *your draft* (never applied automatically), then **Send for human review**. The server re-analyses the text and creates a review with a severity and routed roles.
4. Open **Approvals & Proof Cards**, select the review, read the findings, comment, then **Approve** or **Request changes**. Only a role routed to that review may decide; others receive `403`.
5. After a decision, open the **Proof Card**. Use **Verify signature**, then **Tamper with card** to see verification fail.
6. Open **Evaluation** to see the engine vs keyword-baseline metrics and every miss and false positive.

**Demo accounts** (all fictional, password `demo1234`)

| Email | Role | Can decide |
|---|---|---|
| `maya@threadline.demo` | Legal | Yes, when routed |
| `priya@threadline.demo` | Brand | Yes, when routed |
| `ken@threadline.demo` | Compliance | Yes, when routed |
| `tom@threadline.demo` | Viewer | No |

**Try this text in Reader Lens:** `Nimbus Shield blocks 100% of threats, guaranteed. No setup needed. Trusted by 10,000 teams.` It triggers R-012 (absolute claim), F-07 (onboarding fact) and F-11 (customer count) and routes to Legal + Compliance.

## 4. Architecture

### 4.1 Overview

Two deployable units share one repository:

- **`apps/web`**: Next.js 14 App Router client (Vercel). It holds no business data; every screen fetches JSON from the API with a Bearer token.
- **`services/api`**: FastAPI service (Render) backed by MongoDB. It owns authentication, RBAC, analysis, routing, the audit log, Proof Card signing and the seeded demo dataset.

```
 Browser (Next.js, Vercel)                         FastAPI (Render)                 MongoDB (Atlas)
 ┌───────────────────────────────┐   HTTPS + JWT   ┌──────────────────────┐        ┌──────────────────┐
 │ AuthProvider  (token in       │ ───────────────►│ auth / RBAC          │        │ users            │
 │   localStorage, /auth/me)     │                 │ engine (rules)       │ ◄────► │ rules  content   │
 │ Shell (nav, search, gate)     │ ◄───────────────│ routing / severity   │        │ reviews          │
 │ 9 route segments (useApi)     │      JSON       │ proof (Ed25519)      │        │ audit_events     │
 └───────────────────────────────┘                 │ seed (idempotent)    │        │ precedents ...   │
                                                   └──────────────────────┘        └──────────────────┘
```

### 4.2 Repository layout

```
apps/web/
  app/                     one route segment per screen: / (Overview), reader-lens, evidence-threads,
                           brand-graph, case-law, stress-test, evaluation, content, approvals
  components/
    Shell.tsx              sidebar, top navigation, page search, pipeline strip, sign-in gate
    Auth.tsx               API login form, session context (useAuth), demo accounts fetched from the API
    ui.tsx                 Card, Badge, Btn, Tabs, Modal, Stat, Skeleton, ErrorNote, NotConnected
  lib/
    api.ts                 typed fetch helpers, token storage, NEXT_PUBLIC_API_URL
    useApi.ts              data-loading hook (loading / error / data)
    nav.ts                 route table and pipeline stages
services/api/
  app/
    main.py                FastAPI routes, CORS, startup seed
    auth.py                bcrypt hashing, JWT, role dependency
    engine.py              Reader Lens rules, rule metadata, severity -> routing
    proof.py               canonical JSON, SHA-256, Ed25519 sign/verify
    benchmark.py           50 labelled examples, keyword baseline, metrics
    seed.py, seed_data.py  idempotent seed of users, rules, content, precedents, graph, history
    db.py, models.py, schemas.py
  tests/                   pytest (mongomock): auth, RBAC, routing, audit, tamper detection, reference data
render.yaml                Render blueprint for the API
```

### 4.3 Key design decisions

- **Server-side authority.** Analysis, routing, RBAC and signing run in the API. The client never supplies findings and cannot decide a review it isn't routed to (`403`), so the human-in-the-loop rule holds even if the UI is bypassed.
- **No data in the client.** All content, rules, precedents, graphs and metrics come from MongoDB via the API. When `NEXT_PUBLIC_API_URL` is unset the UI shows a "Backend not connected" notice instead of fabricated data.
- **One routing engine.** Severity-to-role routing lives only in `engine.py`.
- **Idempotent seeding.** Startup upserts the Nimbus Shield dataset into the app's own database and never overwrites existing users or passwords.
- **Tamper evidence.** Proof Cards are canonical JSON signed with Ed25519; `/proof/verify` recomputes the bytes and also rejects foreign public keys.
- **Accessibility.** Status is never colour-only; modals handle Escape and use dialog roles; tabs use `role="tablist"`; focus rings are visible.
- **Tokens, not magic colours.** Palette in `tailwind.config.ts`: ivory `#F8F6EF`, charcoal `#202124`, terracotta `#D8754D`, teal `#299D8F`, navy `#233342`.

### 4.4 Data model (MongoDB collections)

| Collection | Key fields | Used by |
|---|---|---|
| `users` | id, email, name, role, password_hash | Auth, RBAC |
| `rules` | id (`R-012`, `F-07`, `T-03`, `A-02`), kind, title, body, status, linked, history | Brand Graph, engine metadata |
| `content` | id (`C-101`), title, channel, owner, risk, status, excerpt, claims | Content Library, Overview |
| `reviews` | id, title, text, content_hash, findings, severity, routing, status, comments, decision | Reader Lens, Approvals |
| `audit_events` | review_id, actor, role, action, timestamp (append-only) | Audit trail, activity feed |
| `precedents`, `stress_*`, `evidence_*`, `blast_deps`, `activity`, `trend` | seeded reference data | Case Law, Stress Test, Evidence Threads, Overview |

### 4.5 Back end (`services/api`)

```
Next.js UI ──HTTPS+JWT──► FastAPI ──► MongoDB (pymongo)
                           ├─ auth.py      bcrypt password hashes, HS256 JWT, require_role()
                           ├─ engine.py    deterministic Reader Lens rules + routing (single source of truth)
                           ├─ proof.py     canonical JSON, SHA-256 content hash, Ed25519 sign/verify
                           ├─ benchmark.py 50 labelled sentences, keyword baseline, metrics
                           └─ audit_events append-only log written on every state change
```

| Endpoint | Purpose |
|---|---|
| `POST /auth/login`, `GET /auth/me`, `GET /auth/demo-accounts` | Email/password login, JWT session, public list of seeded demo users |
| `GET /rules`, `GET /content`, `GET /content/{id}/blast-radius` | Brand Graph, content library, rule-change dependency fan-out |
| `GET /overview`, `GET /precedents`, `GET /stress-test`, `GET /evidence-graph` | Dashboard (live KPIs plus seeded history), case law, stress-test scores, claim-belief-source graph |
| `POST /analyze` | Run the rules engine on text, returns findings, severity, routing |
| `POST /reviews`, `GET /reviews[/id]` | Submit content for review (the server re-runs analysis; it never trusts client findings) |
| `POST /reviews/{id}/comments` | Comment thread |
| `POST /reviews/{id}/decision` | Approve / request changes. `403` unless the caller's role is routed to the review; `409` if already decided. Never automatic |
| `GET /reviews/{id}/audit` | Append-only audit trail |
| `GET /reviews/{id}/proof`, `POST /proof/verify` | Ed25519-signed Proof Card and tamper-detecting verification |
| `GET /evaluation` | Engine vs keyword-baseline metrics on the seeded benchmark |

Storage falls back to an in-memory `mongomock` database when `MONGODB_URL` is not set, so the API runs and tests pass with no setup. Demo users and data are seeded idempotently at startup.

---

## 5. Tech stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS · Recharts · React Flow · Lucide · Vercel

## 5a. Implementation notes

- **Rendering model:** App Router with `"use client"` screens. The shell and auth gate are client components because the JWT is read from `localStorage` after hydration (a `ready` flag avoids a hydration mismatch and a login flash).
- **Data loading:** a `useApi` hook returns `{data, loading, error}`; screens render skeletons and error notes, and derived views (filters, sorting, aggregates) are memoised over API responses.
- **Graph layer:** React Flow with custom node renderers; Evidence Threads renders `/evidence-graph` nodes and edges styled by evidence status (`supported | partial | gap | contradicted`). Blast radius is a one-hop fan-out from a changed rule/fact to dependent content.
- **Charts:** Recharts `ResponsiveContainer` area/bar/pie charts with text labels and tooltips so values never depend on colour.
- **Human-in-the-loop invariant:** enforced in the API (`/reviews/{id}/decision` checks role and routing, returns `403`/`409`); the UI mirrors it by disabling the buttons.
- **Proof Card:** the API canonicalises the report (sorted-key JSON), hashes the content with SHA-256 and signs with Ed25519; the UI can verify it and demonstrate tamper detection.
- **Build/deploy:** web on Vercel, API on Render (`render.yaml`), MongoDB on Atlas.

## 6. Run locally

```bash
# API  (MONGODB_URL optional; in-memory fallback otherwise)
cd services/api
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # Linux/macOS: .venv/bin/pip
JWT_SECRET=change-me .venv/Scripts/python -m uvicorn app.main:app --port 8000
.venv/Scripts/python -m pytest -q

# Web
cd apps/web && pnpm install
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev      # http://localhost:3000
```

Demo accounts (password `demo1234`): `maya@threadline.demo` (Legal), `priya@threadline.demo` (Brand), `ken@threadline.demo` (Compliance), `tom@threadline.demo` (read-only). Environment variables: `MONGODB_URL`, `MONGODB_DB`, `JWT_SECRET`, `PROOF_PRIVATE_KEY` (optional), `ALLOWED_ORIGINS`. Deployment of the API is described by `render.yaml`.

## 7. Configuration and deployment

### API environment variables (Render)

| Variable | Required | Example / value | Purpose |
|---|---|---|---|
| `MONGODB_URL` | Yes (production) | `mongodb+srv://<user>:<password>@<cluster>/?retryWrites=true&w=majority` | MongoDB connection string. If unset the API uses in-memory `mongomock` and loses data on restart |
| `MONGODB_DB` | No | `threadline` | Database name (default `threadline`) |
| `JWT_SECRET` | Yes | long random string (Render generates it via `render.yaml`) | HS256 signing key for session tokens; use 32+ bytes |
| `ALLOWED_ORIGINS` | Yes | `https://threadline.shashankbindal.me` | CORS allow-list, comma separated (`*` allows all) |
| `PROOF_PRIVATE_KEY` | No | base64 Ed25519 private key | Proof Card signing key. If unset, a key is generated once and stored in the `keys` collection so signatures stay verifiable across restarts |
| `PYTHON_VERSION` | Yes (Render) | `3.13.9` | Python runtime for the build |

In MongoDB Atlas, add Render's outbound IPs to the Network Access list (or `0.0.0.0/0` for a demo) and use a database user with read/write access.

### Web environment variable (Vercel)

| Variable | Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-service>.onrender.com` | Base URL the browser calls. When unset, API-backed pages show a "Backend not connected" notice |

### Deploy

1. **API on Render:** New → Blueprint → select this repo. `render.yaml` defines a free Python web service (`rootDir: services/api`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/health`). Add `MONGODB_URL` and `ALLOWED_ORIGINS` in the dashboard. Free instances sleep when idle, so the first request can take around 30 seconds.
2. **Web on Vercel:** project Root Directory `apps/web`; set `NEXT_PUBLIC_API_URL` to the Render URL and redeploy.
3. **Verify:** `GET https://<service>.onrender.com/health` returns `{"status":"ok","engine":"heuristic-rules"}`.

---

## Current limitations

- Reader Lens is a regex rules engine, not a language model. It misses paraphrases and can flag benign mentions (see `/evaluation` for the measured misses and false positives). Image review is a preview only.
- Evaluation is measured on 50 examples we wrote and labelled ourselves; it is a sanity check, not an independent benchmark.
- Seeded reference data (monthly trend, precedents, stress-test scores, evidence graph) is demo data, not measured results and is labelled "Demo data" in the UI; KPIs, risk mix and approvals are computed live and labelled "Live".
- Proof Cards are signed with a server-held Ed25519 key. There is no certificate chain and no C2PA export yet.
- Authentication uses seeded demo accounts. There is no sign-up, password reset or rate limiting.
- Top-bar search navigates between pages; it does not search content.

## Roadmap

1. **Model-backed Reader Lens:** add a vision-capable model behind the rules engine, with user content isolated in delimited data blocks, structured output, and each claim decomposed and checked against Brand Graph sources with an NLI verifier.
2. **Independent evaluation:** a larger, separately labelled benchmark with inter-annotator agreement, and the Stress Test computed from real reviewer disagreement instead of fixtures.
3. **Standards-based provenance:** C2PA-compatible manifests with a certificate-backed signer, plus precedent retrieval so past decisions are suggested automatically.

## Data and privacy

All data is fictional ("Nimbus Shield", its people and customers). No real brand, customer or personal data is used, and no secrets are stored in this repository.
