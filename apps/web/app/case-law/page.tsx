"use client";
import { useMemo, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Card, PageHeader, Badge, DemoTag } from "@/components/ui";

type Decision = "Allowed" | "Allowed with exception" | "Rejected";
type Prec = { id: string; date: string; rule: string; decision: Decision; rationale: string; reviewer: string; sim: number; expires?: string; claim: string };

const PRECS: Prec[] = [
  { id: "P-118", date: "2026-09-14", rule: "R-012 No absolute security claims", decision: "Rejected", reviewer: "M. Okafor", sim: 0.93, claim: "Unbreakable detection for every endpoint", rationale: "Absolute wording cannot be substantiated by the benchmark (A-02)." },
  { id: "P-121", date: "2026-09-30", rule: "R-012 No absolute security claims", decision: "Allowed with exception", reviewer: "L. Brandt", sim: 0.81, claim: "Guaranteed 24/7 monitoring", expires: "2027-01-31", rationale: "Refers to service availability under SLA, not detection. Exception until SLA wording is revised." },
  { id: "P-124", date: "2026-10-05", rule: "R-019 Compliance claims need Legal sign-off", decision: "Allowed", reviewer: "S. Idowu", sim: 0.76, claim: "SOC 2 Type II audited", rationale: "Legal attached current audit report; claim matches scope." },
  { id: "P-097", date: "2026-06-18", rule: "R-012 No absolute security claims", decision: "Allowed", reviewer: "J. Vance", sim: 0.72, claim: "100% guaranteed detection of known malware signatures", rationale: "Scoped to signature matching in a technical doc with a cited test." },
  { id: "P-130", date: "2026-10-22", rule: "T-03 Use Nimbus Shield, not NS", decision: "Allowed with exception", reviewer: "L. Brandt", sim: 0.64, claim: "NS in a character-limited ad", expires: "2026-12-31", rationale: "Paid social 30-char headline limit; expires after holiday campaign." },
  { id: "P-133", date: "2026-11-02", rule: "T-05 Prefer threat, avoid hack", decision: "Rejected", reviewer: "S. Idowu", sim: 0.58, claim: "Stop hackers before they strike", rationale: "Informal vocabulary conflicts with professional tone." },
  { id: "P-088", date: "2026-04-09", rule: "F-07 Onboarding takes about 20 minutes", decision: "Allowed", reviewer: "M. Okafor", sim: 0.55, claim: "Up and running in under 30 minutes", rationale: "Consistent with the verified median and conservative." },
];
const CONFLICT: [string, string] = ["P-097", "P-118"];
const DEC_TONE = { Allowed: "teal", "Allowed with exception": "navy", Rejected: "terra" } as const;
const DEC_ICON = { Allowed: "✓", "Allowed with exception": "◐", Rejected: "✕" } as const;
const DECS = ["All", "Allowed", "Allowed with exception", "Rejected"];

export default function CaseLawPage() {
  const [q, setQ] = useState("");
  const [dec, setDec] = useState("All");
  const [selId, setSelId] = useState("P-118");
  const rows = useMemo(
    () => PRECS.filter(p => (dec === "All" || p.decision === dec) && (p.id + p.rule + p.claim + p.rationale).toLowerCase().includes(q.toLowerCase())),
    [q, dec],
  );
  const sel = PRECS.find(p => p.id === selId) ?? PRECS[0];
  const isConflict = CONFLICT.includes(sel.id);

  return (
    <div>
      <PageHeader title="Case law" sub="Past reviewer decisions, matched to new findings by similarity. Precedents inform reviewers; they never approve content automatically."
        actions={<DemoTag />} />
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-terra/40 bg-terra/5 p-3 text-[13px]" role="note">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-terra" aria-hidden />
        <div><b>Conflict detected:</b> {CONFLICT[0]} (Allowed) and {CONFLICT[1]} (Rejected) reach opposite decisions on near-identical absolute claims under R-012.
          A human reviewer should resolve this and record a superseding precedent.</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <label className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted" aria-hidden />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search precedents" aria-label="Search precedents"
                className="w-56 rounded-md border border-line bg-paper py-1.5 pl-8 pr-3 text-[13px] outline-none focus:border-navy" />
            </label>
            <select value={dec} onChange={e => setDec(e.target.value)} aria-label="Filter by decision" className="rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]">
              {DECS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <Card>
            <ul className="divide-y divide-line">
              {rows.map(p => (
                <li key={p.id}>
                  <button onClick={() => setSelId(p.id)} aria-current={p.id === sel.id}
                    className={"flex w-full items-start justify-between gap-3 px-1 py-2.5 text-left text-[13px] hover:bg-black/[.03] " + (p.id === sel.id ? "bg-black/[.04]" : "")}>
                    <span>
                      <span className="font-mono text-[12px]">{p.id}</span> <span className="text-muted">· {p.date}</span>
                      <span className="block font-medium">{p.claim}</span>
                      <span className="block text-muted">{p.rule}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={DEC_TONE[p.decision]}>{DEC_ICON[p.decision]} {p.decision}</Badge>
                      <span className="text-[12px] text-muted">sim {p.sim.toFixed(2)}</span>
                    </span>
                  </button>
                </li>
              ))}
              {rows.length === 0 && <li className="py-6 text-center text-muted">No matching precedents.</li>}
            </ul>
          </Card>
        </div>
        <Card title={`${sel.id} detail`}>
          <div className="space-y-3 text-[13px]">
            <div className="flex flex-wrap gap-2">
              <Badge tone={DEC_TONE[sel.decision]}>{DEC_ICON[sel.decision]} {sel.decision}</Badge>
              {isConflict && <Badge tone="terra">▲ In conflict</Badge>}
            </div>
            <p className="font-medium">{sel.claim}</p>
            <dl className="grid grid-cols-[90px_1fr] gap-y-1.5">
              <dt className="text-muted">Rule</dt><dd>{sel.rule}</dd>
              <dt className="text-muted">Date</dt><dd>{sel.date}</dd>
              <dt className="text-muted">Reviewer</dt><dd>{sel.reviewer}</dd>
              <dt className="text-muted">Similarity</dt><dd>{sel.sim.toFixed(2)} <DemoTag /></dd>
              {sel.expires && <><dt className="text-muted">Expires</dt><dd>{sel.expires} <span className="text-muted">(re-review required)</span></dd></>}
            </dl>
            <div>
              <h4 className="mb-1 text-[12px] font-semibold text-muted">Rationale</h4>
              <p>{sel.rationale}</p>
            </div>
            {sel.decision === "Allowed with exception" && <p className="rounded-md bg-navy/5 p-2 text-[12px]">Exceptions are time-boxed and are not reused after expiry.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
