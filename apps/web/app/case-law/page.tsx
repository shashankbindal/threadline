"use client";
import { useMemo, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Card, PageHeader, Badge, DemoTag, Skeleton, ErrorNote, NotConnected } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const DEC_TONE = { Allowed: "teal", "Allowed with exception": "navy", Rejected: "terra" } as const;
const DEC_ICON = { Allowed: "✓", "Allowed with exception": "◐", Rejected: "✕" } as const;
const DECS = ["All", "Allowed", "Allowed with exception", "Rejected"];

export default function CaseLawPage() {
  const { data, error, loading, reload, connected } = useApi(api.precedents);
  const [q, setQ] = useState("");
  const [dec, setDec] = useState("All");
  const [selId, setSelId] = useState("");
  const precs = data?.precedents ?? [];
  const conflicts = data?.conflicts ?? [];
  const rows = useMemo(
    () => precs.filter(p => (dec === "All" || p.decision === dec) && (p.id + p.rule + p.claim + p.rationale).toLowerCase().includes(q.toLowerCase())),
    [precs, q, dec],
  );
  const sel = precs.find(p => p.id === selId) ?? precs[0];
  const inConflict = (id: string) => conflicts.some(c => c.includes(id));

  const head = <PageHeader title="Brand Case Law" sub="Browse past reviewer decisions and click one for its rationale. Reader Lens matches new text to these by similarity; precedents inform reviewers and never approve anything automatically." actions={<DemoTag />} />;
  if (!connected) return <div><PageHeader title="Brand Case Law" /><NotConnected /></div>;
  if (error) return <div>{head}<ErrorNote message={error} onRetry={reload} /></div>;
  if (loading || !data) return <div>{head}<div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div></div>;

  return (
    <div>
      {head}
      {conflicts.map(([a, b]) => (
        <div key={a + b} className="mb-4 flex items-start gap-2 rounded-lg border border-terra/40 bg-terra/5 p-3 text-[13px]" role="note">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-terra" aria-hidden />
          <div><b>Conflict detected:</b> {a} and {b} reach opposite decisions on near-identical claims under the same rule.
            A human reviewer should resolve this and record a superseding precedent.</div>
        </div>
      ))}
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
                  <button onClick={() => setSelId(p.id)} aria-current={p.id === sel?.id}
                    className={"flex w-full items-start justify-between gap-3 px-1 py-2.5 text-left text-[13px] hover:bg-black/[.03] " + (p.id === sel?.id ? "bg-black/[.04]" : "")}>
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
        {sel && (
          <Card title={`${sel.id} detail`}>
            <div className="space-y-3 text-[13px]">
              <div className="flex flex-wrap gap-2">
                <Badge tone={DEC_TONE[sel.decision]}>{DEC_ICON[sel.decision]} {sel.decision}</Badge>
                {inConflict(sel.id) && <Badge tone="terra">▲ In conflict</Badge>}
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
        )}
      </div>
    </div>
  );
}
