# End-to-end journey test

`journey.mjs` drives a real Chrome (puppeteer-core) through the whole product: login (bad password), all routes, Reader Lens deep
analysis (including a prompt-injection string), send for review, approve as Legal, viewer/unrouted 403 messages, double-approve,
Proof Card verify + tamper, C2PA PNG download + upload verification + tampered image, annotation, refresh persistence, expired
session, API-down banner and recovery, and the mobile sidebar.

## Run

1. Start the API (in-memory DB; no `MONGODB_URL`):
   `cd services/api && .venv/Scripts/python -m uvicorn app.main:app --port 8000`
2. Build and serve the web app against it:
   `cd apps/web && NEXT_PUBLIC_API_URL=http://localhost:8000 npx next build && NEXT_PUBLIC_API_URL=http://localhost:8000 npx next start -p 3222`
3. Install puppeteer-core somewhere (`npm i --no-save puppeteer-core`), then:
   `node e2e/journey.mjs`

Environment variables: `WEB_URL` (default `http://localhost:3222`), `API_URL` (default `http://localhost:8000`),
`CHROME_PATH` (default the Windows Chrome path), `PUPPETEER_DIR` (a folder whose `node_modules` contains puppeteer-core, if it is not
installed next to the repo). Exit code is 0 only if every step passes.

The test creates reviews and annotation labels. Point it only at a local in-memory API (restart the API to reset); never at a shared
or production database. The API-down step sets `localStorage["threadline.retryBudgetMs"]` to shorten the client's 90 s retry budget.
