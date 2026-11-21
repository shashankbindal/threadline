<p align="center"><img src="apps/web/public/logo-full.png" alt="Threadline" width="320" /></p>

# Threadline

**Impression-first brand governance.** Most brand checks ask "does this text break a rule?". Threadline asks the question that carries the risk: *what will a reader walk away believing, and can we prove it?* Every claim is traced to approved evidence, routed to the right reviewer, decided by a person, and sealed in a signed Proof Card.

| | |
|---|---|
| **Live product** | https://threadline.shashankbindal.me |
| **API** | https://threadline-api-425e.onrender.com/health (Render free tier: the first request after idle can take 30-60 s; the UI shows a "Waking the server" state) |
| **Demo accounts** | listed on the sign-in screen (fictional users, shared demo password) |

> **Read this first: what is real and what is not.** The product runs end to end on a deployed stack with a real database and real authentication. The brand, content and precedent data is fictional (Nimbus Shield). Model-backed verification uses a hosted LLM when `LLM_API_KEY` is set; without a key the UI says so and the app falls back to rules + retrieval. See [Honest limitations](#12-honest-limitations).

---

## 1. The problem

Brand, legal and compliance teams review marketing content against long guideline documents, one rule at a time. That fails in four ways:

1. **It checks words, not impressions.** "Nothing gets past Nimbus Shield" matches no banned phrase, yet readers will believe it. The risk is the *implied* claim.
2. **Reviews are inconsistent.** Two reviewers read the same rule differently, and past exceptions are forgotten.
3. **Nobody knows the blast radius.** When a fact changes (a benchmark, a customer count) there is no quick way to find every asset that depends on it.
4. **There is no evidence trail.** Approvals live in email. Months later nobody can show what was checked, against which source, or who decided.

**Principle: AI recommends, people decide.** No code path approves content or applies an edit automatically, and the server enforces it (see [Security](#7-security-and-safety-design)).

## 2. Workflow

```
Brand Graph > Intent > Ingest > Reader Lens > Evidence Check > Precedents > Fix & Route > Approval > Proof Card
```

| Stage | What happens in the product |
|---|---|
| Brand Graph | Approved rules (R-), facts (F-), terms (T-) and assets (A-), stored in MongoDB |
| Ingest | Text is sanitised and bounded (20,000 chars); instruction-like text is flagged, never obeyed |
| Reader Lens | The draft is split into atomic claims; rules and an optional LLM judge label each claim |
| Evidence Check | Each claim is matched to retrieved Brand Graph evidence: Supported / Partial / Gap / Contradicted |
| Precedents | Similar past decisions are retrieved; conflicting rulings are flagged |
| Fix & Route | A minimal edit is suggested; severity routes to Brand, Legal or Compliance |
| Approval | Only a routed human role can approve or request changes (server-enforced) |
| Proof Card | Signed report (Ed25519) plus a C2PA-signed PNG, both tamper-evident |

## 3. Complete feature list

**Core product**
- Email/password login (bcrypt hashes, JWT); the session survives refresh and signs out cleanly on expiry
- Four RBAC roles: Legal, Brand, Compliance, read-only Viewer
- **Reader Lens**: live deep analysis with highlighted spans, per-claim label, confidence, rationale, cited evidence, source badge (rules / llm / retrieval), and a suggested minimal edit that applies to your draft only when you click
- **Evidence Threads**: interactive claim, belief and source graph (React Flow) with status filters and a detail panel
- **Brand Graph**: guidelines, facts, terms and assets with search, filters, linked content and history
- **Brand Case Law**: precedents with decisions, rationale, similarity and conflict detection
- **Stress Test**: per-guideline clarity and reviewer agreement, computed from real annotator disagreement when enough labels exist, otherwise badged as seeded demo data
- **Content Library**: table/grid, filters, previews, and a blast-radius graph of what a rule change affects
- **Approvals**: role-routed queue, comments, evidence checklist, append-only audit trail, human-only decisions, stored deep-analysis results
- **Proof Cards**: canonical-JSON Ed25519 signature, in-app verification, tamper demo, **C2PA-signed PNG download and upload verification**
- **Overview**: live KPIs and risk mix from real data, a "Start here" guided journey, helper text on every page

**Round 3 improvements** (details in [section 5](#5-the-three-round-3-improvements))
- Model-backed claim verification with deterministic validation of model output
- Injection-resistant ingestion and precedent retrieval
- A larger benchmark, an annotation workflow with real inter-annotator agreement (Fleiss' kappa), an external public-dataset check, and standards-based C2PA provenance

**Reliability and usability**
- Cold-start handling: a global "Waking the server" banner with automatic retry/backoff, and a "can't reach" state with Retry
- Loading, empty and error states with Retry on every page; error boundary and 404 page
- Double-submit guards, friendly 403/409/422/429 messages, input validation with a character counter
- Responsive layout, collapsible mobile sidebar, keyboard labelling (R / S) on Annotate, status never colour-only

## 4. How to use it (no walkthrough needed)

1. Open the live link and sign in with one of the listed demo accounts (for example the Legal user).
2. The Overview "Start here" card lists the steps below.
3. **Reader Lens**: pick a sample or paste a draft, e.g. `Nimbus Shield blocks 100% of threats, guaranteed. No setup needed. Trusted by 10,000 teams.` Review the claims table, evidence, precedents and the model-status chip.
4. Click **Send for human review**. The server re-analyses the text and routes it by severity.
5. **Approvals**: open the review, read the findings, comment, then **Approve** or **Request changes**. A Viewer, or a role not routed to the review, is told why it cannot decide.
6. Open the **Proof Card**: verify the signature, try **Tamper with card**, download the **C2PA-signed PNG**, and re-upload it to verify (a modified copy fails).
7. **Evaluation** shows measured results. **Annotate** lets you label items Risky/Safe to build real agreement data.

## 5. The three Round 3 improvements

Each entry states what was committed at Round 2 and what was delivered.

### Improvement 1: Model-backed claim verification
- **Committed:** a vision-capable model behind the rules engine for implied claims; decompose drafts into atomic claims; verify each against Brand Graph sources; use an NLI verifier plus an LLM second pass.
- **Delivered:** claim decomposition; retrieval of top evidence per claim; an LLM judge over an OpenAI-compatible API (default Groq `openai/gpt-oss-20b`, configurable through `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`) returning strict JSON; **deterministic validation** of every model answer (schema, label enum, cited evidence IDs must be a subset of the retrieved IDs, confidence clamped); a safe fallback to rules + retrieval when the model is off or answers badly, with the source honestly badged. Rule findings stay authoritative for hard rules.
- **Not delivered as committed:** (a) a dedicated NLI model is not deployed (a torch or ONNX NLI model does not fit the 512 MB free Render instance), so the validated LLM judge takes its place; (b) image/vision analysis is not implemented; (c) with no API key configured, the live deployment runs the retrieval + rules fallback and shows "Model verification: off".

### Improvement 2: Injection-resistant ingestion and precedent retrieval
- **Committed:** treat uploaded content as untrusted data (delimited blocks, no tools for the reading model, deterministic validation of outputs, human approval for every decision) and add retrieval over past decisions with conflict flags.
- **Delivered:** Unicode normalisation, control/zero-width/bidi stripping, length bounds and rate limiting (429); heuristic injection detection that warns the user and is audited; a per-request **random nonce delimiter** so content cannot close its own data block; a tool-less model call whose output cannot change state; server-enforced human-only decisions. `POST /precedents/match` retrieves similar precedents (TF-IDF over word and character n-grams) and flags same-rule Allowed/Rejected conflicts; precedents appear in Reader Lens and are stored on reviews. A 15-string hostile corpus is covered by tests.
- **Not delivered as committed:** retrieval is lexical TF-IDF by default. Embedding retrieval (`bge-small-en-v1.5` through fastembed) exists as an optional path (`EMBEDDINGS=fastembed`, `requirements-optional.txt`) but was **not run or deployed**, because of the free host's memory limit.

### Improvement 3: Independent evaluation and standards-based provenance
- **Committed:** a larger benchmark labelled by separate annotators with agreement (Fleiss' kappa), a Stress Test built from real disagreement, and C2PA-compatible Proof Cards verified with standard tooling.
- **Delivered:**
  - Benchmark v2 with **157** hand-written examples (v1 is the original 50) and an offline harness, `services/api/evals/run_evals.py`, that writes only computed numbers to `evals/results/latest.json`.
  - A real **annotation workflow** (`/annotation/queue`, `/annotation/labels`, `/annotation/agreement`) that never shows annotators the author label and computes **Fleiss' kappa** (unit-tested against the textbook example). Stress Test switches to annotator-derived values once enough labels exist.
  - An **external public-data check** on 300 VitaminC rows (CC BY-SA 3.0, Hugging Face `tals/vitaminc`, attribution in `evals/data/VITAMINC_LICENSE.md`), mapping SUPPORTS / REFUTES / NOT ENOUGH INFO to Supported / Contradicted / Gap.
  - **C2PA**: Proof Cards are rendered as PNGs with a real embedded C2PA manifest (c2pa-python, ES256), downloadable and verifiable; tampered or plain images fail verification.
- **Not delivered as committed:** (a) inter-annotator agreement is **"not yet measured"**: it needs at least two real people to label at least 10 shared items, and no annotations are fabricated; (b) the C2PA signer uses a **self-signed demo certificate**, so validators report the signer as untrusted (the signature and content binding are still verified); (c) the VitaminC verifier run and the `rules+llm` rows are **"not run"** until an LLM key is configured and `run_evals.py` is executed.

## 6. Architecture

```
 Browser: Next.js 14 (Vercel)                      FastAPI (Render)                        MongoDB Atlas
 +--------------------------------+  HTTPS+JWT   +----------------------------------+    +------------------+
 | AuthProvider, Shell, 11 routes |------------->| auth.py       bcrypt, JWT, RBAC  |    | users   rules    |
 | api.ts: timeouts, retry,       |<-------------| ingest.py     sanitise, nonce    |<-->| content reviews  |
 |  cold-start banner, 401 flow   |     JSON     | retrieval.py  TF-IDF (opt. bge)  |    | precedents       |
 +--------------------------------+              | verify.py     claims + LLM judge |    | annotations      |
                                                 | llm.py        OpenAI-compatible  |    | audit_events     |
              Groq / any OpenAI-style API  <-----| engine.py     rules + routing    |    | keys (signing)   |
                                                 | proof.py      Ed25519 Proof Card |    +------------------+
                                                 | provenance.py C2PA sign/verify   |
                                                 | annotation.py Fleiss' kappa      |
                                                 | benchmark*.py, routes_eval.py    |
                                                 +----------------------------------+
```

**Data flow of the main journey.** The browser sends the draft to `POST /analyze/deep`. The API sanitises it, splits claims, retrieves evidence and precedents, optionally asks the LLM judge (inside a nonce-delimited data block), validates the answer, merges with rule findings, and returns claims, findings, severity, routing and precedents. `POST /reviews` re-runs the entire analysis server-side (the client's findings are never trusted) and writes an audit event. `POST /reviews/{id}/decision` checks the caller's role against the review's routing, then writes the decision and an audit event. `GET /reviews/{id}/proof` and `/proof/c2pa` issue the signed artifacts.

**Hardest problem solved.** Keeping the human-in-the-loop guarantee true under adversarial input, where untrusted text, a probabilistic model and a state-changing workflow share one request path. The design separates them: the model can only emit a validated label for a claim; it has no tools; its output is checked against the retrieved evidence set; and state changes happen only through role-checked endpoints.

### Repository layout
```
apps/web/        Next.js app (app/ routes, components/, lib/api.ts, lib/useApi.ts, e2e/journey.mjs)
services/api/    FastAPI service (app/, tests/, evals/)
render.yaml      Render blueprint for the API
```

### API reference (JSON, Bearer JWT unless noted)
| Endpoint | Purpose |
|---|---|
| `POST /auth/login`, `GET /auth/me`, `GET /auth/demo-accounts` (public) | Session and demo users |
| `GET /rules`, `/content`, `/content/{id}/blast-radius`, `/overview`, `/precedents`, `/stress-test`, `/evidence-graph` | Reference data from MongoDB |
| `GET /llm/status` | Model configured, provider, model, retrieval backend |
| `POST /analyze` | Rules-only analysis |
| `POST /analyze/deep` | Sanitise, claims, evidence, optional LLM, validate, merge; returns claims, findings, ingestion warnings, precedents |
| `POST /precedents/match` | Similar precedents and conflicts |
| `POST /reviews`, `GET /reviews[/id]`, `POST /reviews/{id}/comments` | Review lifecycle (the server re-analyses) |
| `POST /reviews/{id}/decision` | Approve / request changes; `403` unless a routed role, `409` if already decided |
| `GET /reviews/{id}/audit` | Append-only audit trail |
| `GET /reviews/{id}/proof`, `POST /proof/verify` (public) | Ed25519-signed Proof Card and verification |
| `GET /reviews/{id}/proof/c2pa`, `POST /provenance/verify` | C2PA-signed PNG and verification |
| `GET /annotation/queue`, `POST /annotation/labels`, `GET /annotation/agreement` | Annotation workflow and Fleiss' kappa |
| `GET /evaluation?set=v1` or `v2`, `GET /evaluation/external` | Measured results (computed, never hard-coded) |

## 7. Security and safety design
- bcrypt password hashes; JWT with a server secret; role checks on every state-changing route, server-side.
- Untrusted input: NFKC normalisation, control/zero-width/bidi stripping, length cap, nonce-delimited data block, tool-less model, output schema validation with an evidence-ID subset check, injection warnings audited.
- Rate limiting on analysis endpoints (in-memory, per process), `429` on excess.
- Secrets live only in environment variables; none are stored in the repository.
- Proof Cards are canonical JSON signed with Ed25519; verification rejects altered content and foreign public keys.

## 8. Evaluation results (measured, with limits)

Computed by `services/api/evals/run_evals.py` and committed in `services/api/evals/results/latest.json`. Labels are written by the authors, so they are **not independent**.

| System | v1 (n=50) F1 | v2 (n=157) precision / recall / F1 |
|---|---|---|
| Keyword baseline | 0.368 | 0.515 / 0.215 / 0.303 |
| Rules engine | 0.800 | 0.791 / 0.671 / 0.726 |
| Rules + retrieval | 0.754 | F1 0.673 (see latest.json) |
| Rules + LLM | not run (no key at run time) | not run |

Honest reading: the rules engine roughly doubles the keyword baseline's F1 but misses paraphrases and flags some benign mentions. Adding retrieval **lowered** F1 on this benchmark (more false positives), which is why rule findings stay authoritative and retrieval is used for evidence and precedents, not as a standalone gate. The external VitaminC verifier result is **not yet measured**; the sample, licence note and a majority-class baseline (accuracy 0.333) are committed.

## 9. Testing

| Layer | What | Result |
|---|---|---|
| Unit and integration (pytest, 39 tests) | auth and RBAC, routing, audit trail, tamper detection, reference endpoints, Fleiss' kappa (textbook example), annotation queue never leaking author labels, 15-string injection corpus (warns, never changes state, never escapes the data block), invalid LLM JSON and foreign evidence IDs falling back safely, rate limit, C2PA sign/verify/tamper, evaluation shapes | 39 passed |
| End-to-end in real Chrome (`apps/web/e2e/journey.mjs`) | wrong password, all routes without page errors, deep analysis, injection string, validation, double-click send (exactly one review), approve, tamper detection, C2PA download/verify/tamper, viewer 403, stale double-approve, annotate, stress-test badge, evaluation, refresh persistence, expired token, API-down banner and recovery, mobile sidebar | 20 of 20 passed |
| Live smoke test (Render API) | login, role checks, deep analysis with injection text, decision, C2PA PNG verify and tamper | passed |

Bugs the testing found and fixed: an Evaluation page crash from an API shape mismatch; Approvals crashing on an undefined review; comment author objects crashing rendering; blank audit actors; the Proof Card button erroring on undecided reviews; auth wiping the token on non-401 errors; a fast double click creating two reviews.

Known imperfections: only Chrome was tested; the in-memory rate limiter is per process; see [limitations](#12-honest-limitations).

## 10. Run it locally

```bash
# API (without MONGODB_URL it uses an in-memory database)
cd services/api
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt     # Linux/macOS: .venv/bin/pip
JWT_SECRET=change-me-32-bytes-minimum .venv/Scripts/python -m uvicorn app.main:app --port 8000
.venv/Scripts/python -m pytest -q                                          # 39 tests

# Web
cd apps/web && pnpm install        # or npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev                          # http://localhost:3000

# End-to-end browser journey (see apps/web/e2e/README.md)
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm build && NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm start -p 3222
node e2e/journey.mjs               # needs puppeteer-core and Chrome

# Offline evaluation (writes evals/results/latest.json; LLM rows run only if LLM_API_KEY is set)
cd services/api && .venv/Scripts/python evals/run_evals.py
```

Demo accounts and the demo password are shown on the sign-in screen (served by `GET /auth/demo-accounts`).

## 11. Configuration and deployment

| Variable | Where | Purpose |
|---|---|---|
| `MONGODB_URL` | API | MongoDB connection string; unset means in-memory `mongomock` (data lost on restart) |
| `MONGODB_DB` | API | Database name (default `threadline`) |
| `JWT_SECRET` | API | Session signing key (32+ bytes) |
| `ALLOWED_ORIGINS` | API | CORS allow-list, comma separated |
| `PROOF_PRIVATE_KEY` | API, optional | Ed25519 key (base64); otherwise generated once and stored in `keys` |
| `LLM_API_KEY` (or `GROQ_API_KEY`) | API, optional | Enables model-backed verification |
| `LLM_BASE_URL`, `LLM_MODEL` | API, optional | Default `https://api.groq.com/openai/v1` and `openai/gpt-oss-20b` |
| `EMBEDDINGS` | API, optional | `fastembed` to try bge-small embeddings (install `requirements-optional.txt`) |
| `NEXT_PUBLIC_API_URL` | Web (build time) | Base URL of the API |

Deploy: the API on Render via `render.yaml` (Python 3.13, health check `/health`); the web app on Vercel with Root Directory `apps/web`; MongoDB Atlas (allow Render's IPs in Network Access).

## 12. Honest limitations
- The live deployment has **no LLM key configured**, so model-backed verification runs in fallback mode (rules + retrieval) and says so in the UI. Setting `LLM_API_KEY` enables it with no code change.
- No dedicated NLI model and no image/vision analysis (see Improvements 1 above).
- Evaluation labels are written by the authors; inter-annotator agreement is **not yet measured** until real annotators label items; the external VitaminC and `rules+llm` results are **not run**.
- The C2PA certificate is self-signed (an untrusted signer, by design for a demo).
- Seeded reference data (monthly trend, precedents, stress-test scores, evidence graph) is demo data and labelled as such; KPIs, risk mix, reviews and annotations are live.
- Demo authentication has no sign-up, password reset or per-IP login throttling.
- Render's free tier sleeps when idle; the first request can take up to a minute.

## 13. Roadmap

| Order | Next step | Who it is for | What it takes |
|---|---|---|---|
| 1 | Turn on and measure model-backed verification: set the key, run `run_evals.py`, publish `rules+llm` and VitaminC results | Compliance and Legal reviewers who need paraphrased claims caught | One API key and a few hours, then a regression gate in CI |
| 2 | A real inter-annotator study: 3+ reviewers label the 157-item set, publish kappa, rebuild Stress Test from it | Brand governance leads tuning ambiguous rules | About 2 hours per reviewer, no new code |
| 3 | A dedicated NLI verifier and embedding retrieval on a larger instance (2 GB or more), compared against the LLM judge | Teams with high review volume and cost limits | A paid host tier, model hosting, an evaluation re-run |
| 4 | Vision-capable image review for creatives and PDFs | Design and social teams | A multimodal model, image ingestion with the same untrusted-data controls |
| 5 | Trusted provenance: a CA-backed C2PA certificate and signed audit exports | Regulated customers and agencies sharing proof with clients | A certificate from a C2PA-conformant CA, key management |
| 6 | Integrations and scale: SSO (OIDC), CMS/DAM webhooks, persistent rate limiting, multi-tenancy | Enterprise rollouts | An auth provider integration, Redis, a tenancy model |

## 14. Data and privacy
All brand, content and user data is fictional ("Nimbus Shield"). The only external data is the public VitaminC sample (CC BY-SA 3.0, attribution included). No real personal data and no secrets are stored in this repository.
