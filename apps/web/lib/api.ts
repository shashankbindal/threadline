export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const apiEnabled = !!API_URL;
const TOKEN_KEY = "threadline.token";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch {} };

export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

export type ApiUser = { id: string; name: string; initials: string; title: string; role: "Brand" | "Legal" | "Compliance" | "Viewer"; canDecide: boolean };
export type Finding = { id: string; rule: string; match: string; start: number; end: number; belief: string; kind: string; conf: number; status: string; source?: string; severity: string; fix: string; replacement: string };
export type Analysis = { findings: Finding[]; severity: string; routing: string[]; engine: string };
export type Comment = { author?: string; who?: string; text: string; created_at?: string; at?: string };
export type Review = { id: string; title: string; text: string; findings: Finding[]; severity: string; routing: string[]; status: string; comments: Comment[]; created_at: string };
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
  scores: { id: string; clarity: number; kappa: number }[];
  ambiguous: { id: string; title: string; probe: string; votes: { who: string; vote: string }[]; before: string; after: string }[];
};
export type EvidenceGraph = {
  nodes: { id: string; kind: "Claim" | "Belief" | "Source"; label: string; detail: string; x: number; y: number }[];
  edges: { id: string; source: string; target: string; status: "supported" | "contradicted" | "gap"; label: string }[];
};
export type BlastRadius = { content_id: string; change: string; affected: ContentItem[] };
export type AuditEvent = { [k: string]: unknown };
export type ProofCard = { content_hash: string; findings: unknown; routing: unknown; decision: string; reviewer: string; timestamp: string; algorithm: string; public_key: string; signature: string; [k: string]: unknown };
export type Metrics = { precision: number; recall: number; f1: number; accuracy: number; confusion: { tp: number; fp: number; fn: number; tn: number } };
export type Evaluation = { engine: Metrics; baseline: Metrics; per_rule: any; errors: Record<string, any>[]; n: number; [k: string]: unknown };

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, "Backend not connected");
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res: Response;
  try { res = await fetch(API_URL + path, { ...init, headers }); } catch { throw new ApiError(0, "Cannot reach the backend"); }
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); const d = j.detail ?? j.message; msg = typeof d === "string" ? d : d ? JSON.stringify(d) : msg; } catch {}
    throw new ApiError(res.status, msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
function post<T>(p: string, body: unknown) { return req<T>(p, { method: "POST", body: JSON.stringify(body) }); }

export const api = {
  login: (email: string, password: string) => post<{ token: string; user: ApiUser }>("/auth/login", { email, password }),
  me: () => req<ApiUser>("/auth/me"),
  rules: () => req<Rule[]>("/rules"),
  content: () => req<ContentItem[]>("/content"),
  overview: () => req<Overview>("/overview"),
  precedents: () => req<PrecedentsOut>("/precedents"),
  stressTest: () => req<StressOut>("/stress-test"),
  evidenceGraph: () => req<EvidenceGraph>("/evidence-graph"),
  blastRadius: (id: string) => req<BlastRadius>(`/content/${encodeURIComponent(id)}/blast-radius`),
  analyze: (text: string) => post<Analysis>("/analyze", { text }),
  createReview: (title: string, text: string) => post<Review>("/reviews", { title, text }),
  reviews: () => req<Review[]>("/reviews"),
  review: (id: string) => req<Review>(`/reviews/${id}`),
  comment: (id: string, text: string) => post<any>(`/reviews/${id}/comments`, { text }),
  decide: (id: string, decision: "approve" | "request_changes", note: string) => post<any>(`/reviews/${id}/decision`, { decision, note }),
  audit: (id: string) => req<AuditEvent[]>(`/reviews/${id}/audit`),
  proof: (id: string) => req<ProofCard>(`/reviews/${id}/proof`),
  verify: (card: unknown) => post<{ valid: boolean; reason: string }>("/proof/verify", { card }),
  evaluation: () => req<Evaluation>("/evaluation"),
};
