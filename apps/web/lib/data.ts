// All values below are DEMO data (fictional Nimbus Shield). Not measured results.
export type Sev = "Low" | "Medium" | "High" | "Critical";
export type ContentItem = { id: string; title: string; channel: string; owner: string; risk: Sev; status: "Draft" | "In review" | "Approved" | "Needs fix"; updated: string; excerpt: string; claims: string[] };
export const CONTENT: ContentItem[] = [
  { id: "C-101", title: "Spring launch email", channel: "Email", owner: "Priya N.", risk: "High", status: "Needs fix", updated: "2h ago", excerpt: "Nimbus Shield blocks 100% of threats, guaranteed. No setup needed.", claims: ["CL-1", "CL-2"] },
  { id: "C-102", title: "Pricing page hero", channel: "Web", owner: "Tom K.", risk: "Medium", status: "In review", updated: "5h ago", excerpt: "Enterprise-grade protection that fits any budget.", claims: ["CL-3"] },
  { id: "C-103", title: "Partner webinar deck", channel: "Slides", owner: "Ana L.", risk: "Low", status: "Approved", updated: "1d ago", excerpt: "Nimbus Shield helps reduce phishing exposure for distributed teams.", claims: ["CL-4"] },
  { id: "C-104", title: "Case study: Harbor Clinic", channel: "PDF", owner: "Priya N.", risk: "Critical", status: "Needs fix", updated: "1d ago", excerpt: "Harbor Clinic stayed HIPAA compliant thanks to Nimbus Shield.", claims: ["CL-5", "CL-6"] },
  { id: "C-105", title: "Social: Zero-day post", channel: "Social", owner: "Dev S.", risk: "Medium", status: "Draft", updated: "2d ago", excerpt: "Zero-day attacks? Nimbus Shield sees them coming.", claims: ["CL-7"] },
  { id: "C-106", title: "Onboarding guide v3", channel: "Docs", owner: "Ana L.", risk: "Low", status: "Approved", updated: "3d ago", excerpt: "Install the agent and connect your identity provider in about 20 minutes.", claims: ["CL-8"] },
  { id: "C-107", title: "Q3 newsletter", channel: "Email", owner: "Tom K.", risk: "Medium", status: "In review", updated: "4d ago", excerpt: "Trusted by over 10,000 teams worldwide.", claims: ["CL-9"] },
  { id: "C-108", title: "Billboard concept", channel: "Image", owner: "Dev S.", risk: "High", status: "In review", updated: "5d ago", excerpt: "Image: shield icon with the line Unbreakable.", claims: ["CL-10"] },
];
export const TREND = ["Jun","Jul","Aug","Sep","Oct","Nov"].map((m, i) => ({ m, reviewed: [42,55,61,74,88,97][i], flagged: [14,16,15,19,17,16][i], approved: [26,35,42,50,66,76][i] }));
export const RISK_MIX = [{ name: "Low", v: 46 }, { name: "Medium", v: 31 }, { name: "High", v: 15 }, { name: "Critical", v: 8 }];
export const ACTIVITY = [
  { who: "Priya N.", what: "ran Reader Lens on", target: "Spring launch email", t: "2h ago" },
  { who: "Maya R. (Legal)", what: "requested changes on", target: "Case study: Harbor Clinic", t: "3h ago" },
  { who: "Tom K.", what: "accepted a suggested edit in", target: "Pricing page hero", t: "5h ago" },
  { who: "Ana L.", what: "approved and exported Proof Card for", target: "Partner webinar deck", t: "1d ago" },
  { who: "Dev S.", what: "filed an exception on", target: "Rule R-012", t: "2d ago" },
];
export type Belief = { text: string; kind: "Stated" | "Implied"; conf: number; evidence: "Supported" | "Partial" | "Gap" | "Contradicted"; source?: string };
export const BELIEFS: Belief[] = [
  { text: "Nimbus Shield stops every threat", kind: "Implied", conf: 0.91, evidence: "Contradicted", source: "A-02 Detection Benchmark: 97.2% on test set" },
  { text: "No setup or configuration is required", kind: "Stated", conf: 0.88, evidence: "Contradicted", source: "F-07 Onboarding takes ~20 min" },
  { text: "Product is a guaranteed outcome", kind: "Implied", conf: 0.74, evidence: "Gap" },
  { text: "Protection suits small budgets", kind: "Implied", conf: 0.52, evidence: "Partial", source: "P-118 Pricing tiers" },
];
export const RULES = [
  { id: "R-012", kind: "Guideline", title: "No absolute security claims", body: "Never say unbreakable, 100% or guaranteed about detection.", status: "Active" },
  { id: "R-019", kind: "Guideline", title: "Compliance claims need Legal sign-off", body: "HIPAA, SOC 2 and ISO claims require approved evidence.", status: "Active" },
  { id: "F-07", kind: "Fact", title: "Onboarding takes about 20 minutes", body: "Agent install plus IdP connection; median 20 min.", status: "Verified" },
  { id: "F-11", kind: "Fact", title: "Customer count: 4,200 teams", body: "As of Oct 2026, finance-confirmed.", status: "Verified" },
  { id: "T-03", kind: "Term", title: "Use Nimbus Shield, not NS", body: "Product name is always written in full.", status: "Active" },
  { id: "T-05", kind: "Term", title: "Prefer threat, avoid hack", body: "Neutral, professional vocabulary.", status: "Active" },
  { id: "A-02", kind: "Asset", title: "Detection Benchmark 2026", body: "Third-party test: 97.2% detection on curated set.", status: "Approved" },
  { id: "A-05", kind: "Asset", title: "Primary logo pack", body: "Clear space 1x, min width 24px.", status: "Approved" },
];
