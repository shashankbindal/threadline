<p align="center"><img src="apps/web/public/logo-full.png" alt="Threadline" width="320" /></p>

# Threadline

**Impression-first brand governance.** Most brand checks ask "does this text break a rule?". Threadline asks the question that actually carries the risk: *what will a reader walk away believing, and can we prove it?*

**Live demo:** https://threadline.shashankbindal.me (pick any demo team member on the sign-in screen; no password)

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

## 4. Architecture

### 4.1 Overview

The prototype is a single Next.js application (`apps/web`) that runs entirely in the browser on typed fixture data. It is structured so the fixtures can later be replaced by API calls without touching the screens.

```
                    ┌──────────────────────────────────────────┐
                    │  app/layout.tsx                          │
                    │  <AuthProvider>  <Shell> {page} </Shell> │
                    └──────────────┬───────────────────────────┘
                                   │
            ┌──────────────────────┼───────────────────────┐
            │                      │                       │
     components/Auth.tsx    components/Shell.tsx     app/<route>/page.tsx  (x8)
     persona session        sidebar, top bar,        feature screens
     (React context +       search, pipeline         (client components)
      localStorage)         strip, sign-in gate              │
                                                             │ read
                                       ┌─────────────────────┴───────────────┐
                                       │ lib/data.ts  typed demo fixtures    │
                                       │ lib/nav.ts   routes + pipeline      │
                                       │ components/ui.tsx shared primitives │
                                       └─────────────────────────────────────┘
```

### 4.2 Repository layout

```
apps/web/
  app/
    layout.tsx              root layout: AuthProvider + Shell
    page.tsx                Overview
    reader-lens/            Reader Lens
    evidence-threads/       Evidence Threads (React Flow)
    brand-graph/            Brand Graph
    case-law/               Brand Case Law
    stress-test/            Stress Test
    content/                Content Library + blast-radius (React Flow)
    approvals/              Approvals + Proof Card
    globals.css             Tailwind base + focus styles
  components/
    Shell.tsx               persistent sidebar, top navigation, search, pipeline strip
    Auth.tsx                persona sign-in/sign-out, AuthProvider, useAuth()
    ui.tsx                  Card, Badge, Btn, Tabs, Modal, Stat, SevBadge, DemoTag
  lib/
    data.ts                 typed fixtures (content, beliefs, rules, trends)
    nav.ts                  route table and workflow stages
  public/                   logo assets
  tailwind.config.ts        brand palette tokens
```

### 4.3 Key design decisions

- **Auth gate in the shell, role in context.** `Shell` renders `LoginScreen` until `useAuth()` returns a persona. The Approvals page reads `user.canDecide` and `user.role`, so the human-in-the-loop rule is enforced where the buttons live, not only described in copy.
- **One fixture module, many views.** `lib/data.ts` exports typed arrays (`CONTENT`, `BELIEFS`, `RULES`, `TREND`, ...). Screens import types from it, so replacing fixtures with API responses later is a contained change.
- **Reusable primitives.** `components/ui.tsx` keeps cards, badges, tabs, modals and stat tiles consistent across all eight screens.
- **Graphs as data.** Evidence Threads and the blast-radius view build React Flow nodes and edges from data; edge colour and label encode evidence status (supported / contradicted / gap), and nodes open a detail panel.
- **Accessibility.** Status is never colour-only (text and symbols accompany every colour); modals trap Escape and use dialog roles; tabs use `role="tablist"`; focus rings are visible.
- **Tokens, not magic colours.** The palette lives in `tailwind.config.ts`: ivory `#F8F6EF`, charcoal `#202124`, terracotta `#D8754D`, teal `#299D8F`, navy `#233342`.

### 4.4 Data model (fixtures)

| Type | Fields (abridged) | Used by |
|---|---|---|
| `ContentItem` | id (`C-101`), title, channel, owner, risk, status, excerpt, claims[] | Overview, Content Library, Approvals |
| `Belief` | text, kind (Stated/Implied), confidence, evidence status, source | Reader Lens, Evidence Threads |
| Rule | id (`R-012`, `F-07`, `T-03`, `A-02`), kind, title, body, status | Brand Graph, Stress Test |
| Trend / risk mix | month, reviewed, flagged, approved | Overview charts |

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
| `POST /auth/login`, `GET /auth/me` | Email/password login, JWT session |
| `GET /rules`, `GET /content` | Brand Graph and content library |
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

- **Rendering model:** App Router with `"use client"` feature screens; the shell and auth gate are client components because session state is read from `localStorage` after hydration (a `ready` flag avoids a hydration mismatch and a login flash).
- **State:** React context for session; local `useState`/`useMemo` for filters, sorting and selection. Derived views (filtered lists, KPI aggregates) are computed with memoised selectors over the fixtures.
- **Graph layer:** React Flow with custom node renderers; edges are generated from claim to belief to source tuples and styled by evidence status (`supported | partial | gap | contradicted`). Blast radius is a one-hop fan-out from a changed rule/fact node to dependent content nodes.
- **Charts:** Recharts `ResponsiveContainer` area/bar/pie charts with text labels and tooltips so values never depend on colour.
- **Human-in-the-loop invariant:** decision handlers are only bound when `user.canDecide` is true; suggestion actions mutate local proposal state and never content.
- **Proof Card (prototype):** serialised report (content hash, findings, reviewer, timestamp) exported as JSON via `Blob` + object URL; the signature field is a labelled placeholder.
- **Build/deploy:** `next build` static prerender of all routes; deployed to Vercel from `apps/web`.

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

---

## Current limitations

- Reader Lens is a regex rules engine, not a language model. It misses paraphrases and can flag benign mentions (see `/evaluation` for the measured misses and false positives). Image review is a preview only.
- Evaluation is measured on 50 examples we wrote and labelled ourselves; it is a sanity check, not an independent benchmark.
- Overview charts, clarity scores, precedents and the case-law library are demo data, not measured results.
- Proof Cards are signed with a server-held Ed25519 key. There is no certificate chain and no C2PA export yet.
- Authentication uses seeded demo accounts. There is no sign-up, password reset or rate limiting.
- Top-bar search navigates between pages; it does not search content.

## Roadmap

1. **Model-backed Reader Lens:** add a vision-capable model behind the rules engine, with user content isolated in delimited data blocks, structured output, and each claim decomposed and checked against Brand Graph sources with an NLI verifier.
2. **Independent evaluation:** a larger, separately labelled benchmark with inter-annotator agreement, and the Stress Test computed from real reviewer disagreement instead of fixtures.
3. **Standards-based provenance:** C2PA-compatible manifests with a certificate-backed signer, plus precedent retrieval so past decisions are suggested automatically.

## Data and privacy

All data is fictional ("Nimbus Shield", its people and customers). No real brand, customer or personal data is used, and no secrets are stored in this repository.
