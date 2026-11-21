export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const apiEnabled = !!API_URL;
const TOKEN_KEY = "threadline.token";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch {} };

export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export const isAbort = (e: unknown) => (e as Error)?.name === "AbortError";

/** Global connectivity state: "waking" while a request is being retried (Render free tier cold start), "down" once retries are exhausted. */
export type NetState = "ok" | "waking" | "down";
let netState: NetState = "ok";
const netSubs = new Set<(s: NetState) => void>();
const setNet = (s: NetState) => { if (s !== netState) { netState = s; netSubs.forEach(f => f(s)); } };
export const getNet = () => netState;
export const subscribeNet = (f: (s: NetState) => void) => { netSubs.add(f); return () => { netSubs.delete(f); }; };

/** Called on any 401 from an authenticated call (not the login call). */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (f: (() => void) | null) => { onUnauthorized = f; };

export type ApiUser = { id: string; name: string; initials: string; title: string; role: "Brand" | "Legal" | "Compliance" | "Viewer"; canDecide: boolean };
export type Finding = { id: string; rule: string; match: string; start: number; end: number; belief: string; kind: string; conf: number; status: string; source?: string; severity: string; fix: string; replacement: string };
export type Analysis = { findings: Finding[]; severity: string; routing: string[]; engine: string };
export type Actor = { id?: string; name?: string; role?: string };
export type Comment = { author?: Actor | string; who?: string; text: string; created_at?: string; at?: string };
export type Claim = { id: string; text: string; start: number; end: number; label: string; confidence: number; source: "rules" | "llm" | "retrieval"; rationale: string; evidence: { id: string; title: string; score: number }[] };
export type IngestionInfo = { chars: number; sanitised: boolean; warnings: { type: string; detail: string }[] };
export type PrecedentMatch = { id: string; title: string; decision: string | null; similarity: number; rule: string; conflict: boolean };
export type LlmInfo = { status: string; model: string | null };
export type Conflict = { rule: string; allowed: string[]; rejected: string[] };
export type DeepAnalysis = { engine: string; llm: LlmInfo; ingestion: IngestionInfo; claims: Claim[]; findings: Finding[]; severity: string; routing: string[]; precedents: PrecedentMatch[]; conflicts: Conflict[] };
export type DeepStored = { claims: Claim[]; precedents: PrecedentMatch[]; conflicts: Conflict[]; ingestion: IngestionInfo; llm: LlmInfo };
export type Decision = { decision: string; note?: string; reviewer?: Actor; at?: string };
export type Review = { id: string; title: string; text: string; findings: Finding[]; severity: string; routing: string[]; status: string; comments: Comment[]; created_at: string; decision?: Decision | null; deep?: DeepStored };
export type LlmStatus = { configured: boolean; provider: string; model: string; retrieval: string };
export type Sev = "Low" | "Medium" | "High" | "Critical";
export type ContentItem = { id: string; title: string; channel: string; owner: string; risk: Sev; status: "Draft" | "In review" | "Approved" | "Needs fix"; updated: string; excerpt: string; claims: string[] };
export type Rule = { id: string; kind: "Guideline" | "Fact" | "Term" | "Asset"; title: string; body: string; status: string; linked?: string[]; history?: { v: string; date: string; note: string; by: string }[] };
export type Overview = {
  kpis: { key: string; label: string; value: number; delta: string; tone: "teal" | "terra"; live: boolean }[];
  riskMix: { name: Sev; v: number }[];
  trend: { m: string; reviewed: number; flagged: number; approved: number }[];
  topRisky: ContentItem[];
  activity: { who: string; what: string; target: string; at: string; source: "seed" | "audit" }[];
};
export type Precedent = { id: string; date: string; rule: string; decision: "Allowed" | "Allowed with exception" | "Rejected"; reviewer: string; sim: number; claim: string; rationale: string; expires?: string };
export type PrecedentsOut = { precedents: Precedent[]; conflicts: [string, string][] };
export type StressOut = {
  scores: { id: string; clarity: number; kappa: number; source?: "annotators" | "seeded"; annotated_items?: number }[];
  ambiguous: { id: string; title: string; probe: string; votes: { who: string; vote: string }[]; before: string; after: string }[];
};
export type EvidenceGraph = {
  nodes: { id: string; kind: "Claim" | "Belief" | "Source"; label: string; detail: string; x: number; y: number }[];
  edges: { id: string; source: string; target: string; status: "supported" | "contradicted" | "gap"; label: string }[];
};
export type BlastRadius = { content_id: string; change: string; affected: ContentItem[] };
export type AuditEvent = { [k: string]: unknown };
export type ProofCard = { content_hash: string; findings: unknown; routing: unknown; decision: string; reviewer: unknown; timestamp: string; algorithm: string; public_key: string; signature: string; [k: string]: unknown };
export type Metrics = { precision: number; recall: number; f1: number; accuracy: number; confusion: { tp: number; fp: number; fn: number; tn: number } };
export type SystemRow = { system?: string; status?: string; reason?: string; definition?: string; n?: number } & Partial<Metrics> & { perRuleRecall?: Record<string, { recall?: number }>; misses?: string[]; falsePositives?: string[] };
export type EvalSet = "v1" | "v2";
export type Evaluation = { set: EvalSet; note: string; n: number; risky: number; subsets: Record<string, number>; engine: SystemRow & Metrics; baseline: SystemRow & Metrics; other_systems: SystemRow[]; other_systems_status: string };
export type ExternalEval = { status: string; note: string; detail?: string; reason?: string; n?: number; accuracy?: number; macro_f1?: number; per_class_f1?: Record<string, number>; majority_baseline?: { accuracy: number; macro_f1: number; predicts: string; n: number; note?: string } | null; [k: string]: unknown };
export type QueueItem = { item_id: string; text: string };
export type Agreement = { annotators: number; items_labelled: number; items_with_2plus: number; fleiss_kappa: number | null; observed_agreement: number | null; per_item_disagreements: { item_id: string; text: string; risky: number; safe: number }[]; status: string; agreement_with_authors: Record<string, { percent: number; n: number }>; note: string };
export type ProvenanceResult = { valid: boolean; reason: string; signer_trusted: boolean; certificate_note?: string; conformance?: string; threadline_assertion?: Record<string, unknown> | null; failures?: { code?: string; explanation?: string }[] };

const RETRY_MS = [1000, 2000, 3000, 5000, 8000, 10000, 10000, 10000, 10000, 10000];
/** Total time to keep retrying a failing request. Override for testing with localStorage["threadline.retryBudgetMs"]. */
const budgetMs = () => { try { const v = Number(localStorage.getItem("threadline.retryBudgetMs")); if (v > 0) return v; } catch {} return 90000; };
const abortErr = () => new DOMException("Aborted", "AbortError");
const sleep = (ms: number, signal?: AbortSignal | null) => new Promise<void>((res, rej) => {
  if (signal?.aborted) return rej(abortErr());
  const t = setTimeout(res, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); rej(abortErr()); }, { once: true });
});

type Opts = RequestInit & { timeoutMs?: number };
const UNREACHABLE = "Cannot reach the server";

async function once(path: string, init: Opts, headers: Record<string, string>): Promise<Response> {
  const ctl = new AbortController();
  const ext = init.signal;
  if (ext) { if (ext.aborted) ctl.abort(); else ext.addEventListener("abort", () => ctl.abort(), { once: true }); }
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, init.timeoutMs ?? 25000);
  try { return await fetch(API_URL + path, { ...init, headers, signal: ctl.signal }); }
  catch {
    if (ext?.aborted) throw abortErr();
    throw new ApiError(0, timedOut ? "The server took too long to respond" : UNREACHABLE);
  } finally { clearTimeout(timer); }
}

async function request(path: string, init: Opts = {}): Promise<Response> {
  if (!API_URL) throw new ApiError(0, "Backend not connected");
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body !== undefined && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const idempotent = !init.method || init.method === "GET";
  const started = Date.now(), budget = budgetMs();
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null, fail: ApiError | null = null;
    try { res = await once(path, init, headers); } catch (e) { if (isAbort(e)) throw e; fail = e as ApiError; }
    const gateway = !!res && [502, 503, 504].includes(res.status);
    // POSTs are retried only when the request provably never ran (connection failure or gateway error), never after a timeout.
    const retryable = gateway || (!!fail && (idempotent || fail.message === UNREACHABLE));
    if (res && !gateway) {
      setNet("ok");
      if (res.status === 401 && path !== "/auth/login") onUnauthorized?.();
      return res;
    }
    if (!retryable || Date.now() - started > budget) {
      setNet("down");
      throw fail ?? new ApiError(res!.status, "The server is temporarily unavailable");
    }
    setNet("waking");
    await sleep(RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)], init.signal);
  }
}

async function failure(res: Response): Promise<ApiError> {
  let msg = res.statusText;
  try {
    const j = await res.json(); const d = j.detail ?? j.message;
    msg = typeof d === "string" ? d : Array.isArray(d) ? d.map((x: any) => x?.msg ?? JSON.stringify(x)).join("; ") : d ? JSON.stringify(d) : msg;
  } catch {}
  return new ApiError(res.status, msg || `HTTP ${res.status}`);
}
async function req<T>(path: string, init: Opts = {}): Promise<T> {
  const res = await request(path, init);
  if (!res.ok) throw await failure(res);
  return res.json() as Promise<T>;
}
function post<T>(p: string, body: unknown, o: Opts = {}) { return req<T>(p, { ...o, method: "POST", body: JSON.stringify(body) }); }

/** Friendly wording for an API error ("" for an intentional abort). */
export function explain(e: unknown): string {
  if (isAbort(e)) return "";
  const x = e as ApiError, m = x?.message || "Something went wrong";
  if (x?.status === 401) return "Your session expired. Please sign in again.";
  if (x?.status === 403) return `Not allowed: ${m}`;
  if (x?.status === 409) return /already decided/i.test(m) ? "This review was already decided (possibly by someone else). The latest status is shown." : m;
  if (x?.status === 429) return "Too many analyses in a short time. Wait a few seconds, then edit the text or press Retry.";
  return m;
}

export const MAX_CHARS = 20000;

export const api = {
  login: (email: string, password: string) => post<{ token: string; user: ApiUser }>("/auth/login", { email, password }),
  demoAccounts: () => req<{ password_hint: string; accounts: { email: string; name: string; title: string; role: string }[] }>("/auth/demo-accounts"),
  me: () => req<ApiUser>("/auth/me"),
  rules: () => req<Rule[]>("/rules"),
  content: () => req<ContentItem[]>("/content"),
  overview: () => req<Overview>("/overview"),
  precedents: () => req<PrecedentsOut>("/precedents"),
  stressTest: () => req<StressOut>("/stress-test"),
  evidenceGraph: () => req<EvidenceGraph>("/evidence-graph"),
  blastRadius: (id: string) => req<BlastRadius>(`/content/${encodeURIComponent(id)}/blast-radius`),
  analyzeDeep: (text: string, signal?: AbortSignal) => post<DeepAnalysis>("/analyze/deep", { text }, { signal, timeoutMs: 60000 }),
  llmStatus: () => req<LlmStatus>("/llm/status"),
  createReview: (title: string, text: string) => post<Review>("/reviews", { title, text, deep: true }, { timeoutMs: 60000 }),
  reviews: () => req<Review[]>("/reviews"),
  comment: (id: string, text: string) => post<any>(`/reviews/${id}/comments`, { text }),
  decide: (id: string, decision: "approve" | "request_changes", note: string) => post<Review>(`/reviews/${id}/decision`, { decision, note }),
  audit: (id: string) => req<AuditEvent[]>(`/reviews/${id}/audit`),
  proof: (id: string) => req<ProofCard>(`/reviews/${id}/proof`),
  verify: (card: unknown) => post<{ valid: boolean; reason: string }>("/proof/verify", { card }),
  c2pa: async (id: string): Promise<Blob> => { const r = await request(`/reviews/${id}/proof/c2pa`, { timeoutMs: 60000 }); if (!r.ok) throw await failure(r); return r.blob(); },
  verifyImage: (file: File) => { const f = new FormData(); f.append("file", file); return req<ProvenanceResult>("/provenance/verify", { method: "POST", body: f, timeoutMs: 60000 }); },
  evaluation: (set: EvalSet = "v1") => req<Evaluation>(`/evaluation?set=${set}`),
  evaluationExternal: () => req<ExternalEval>("/evaluation/external"),
  annotationQueue: (limit = 20) => req<{ items: QueueItem[] }>(`/annotation/queue?limit=${limit}`),
  annotate: (item_id: string, label: "risky" | "safe") => post<{ item_id: string; label: string }>("/annotation/labels", { item_id, label }),
  agreement: () => req<Agreement>("/annotation/agreement"),
};
