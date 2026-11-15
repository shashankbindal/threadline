"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCw } from "lucide-react";
import { Card, PageHeader, Badge, Btn, DemoTag, Skeleton, ErrorNote, NotConnected } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const kappaLabel = (k: number) => (k >= 0.8 ? "Strong" : k >= 0.6 ? "Substantial" : k >= 0.4 ? "Moderate" : "Poor");

export default function StressTestPage() {
  const { data, error, loading, reload, connected } = useApi(api.stressTest);
  const head = (
    <PageHeader title="Guideline stress test" sub="Simulated reviewers apply each rule to probe cases. Low agreement means the rule wording is ambiguous."
      actions={<><DemoTag text="Demo data (seeded scores)" /><Btn onClick={reload} disabled={loading}><RefreshCw size={13} aria-hidden />Reload results</Btn></>} />
  );
  if (!connected) return <div><PageHeader title="Guideline stress test" /><NotConnected /></div>;
  if (error) return <div>{head}<ErrorNote message={error} onRetry={reload} /></div>;
  if (loading || !data) return <div>{head}<div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div></div>;
  const { scores, ambiguous } = data;

  return (
    <div>
      {head}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Clarity score per rule" action={<DemoTag />}>
          <div className="h-56" role="img" aria-label="Bar chart of clarity score per rule">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scores} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke="#e5e5e0" />
                <XAxis dataKey="id" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="clarity" name="Clarity" radius={[3, 3, 0, 0]}>
                  {scores.map(s => <Cell key={s.id} fill={s.clarity < 75 ? "#c8553d" : "#1f3a5f"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[12px] text-muted">Rules below 75 are flagged as ambiguous.</p>
        </Card>
        <Card title="Reviewer agreement (Fleiss' kappa)" action={<DemoTag />}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[12px] text-muted"><tr><th className="pb-2 font-medium">Rule</th><th className="pb-2 font-medium">Kappa</th><th className="pb-2 font-medium">Agreement</th></tr></thead>
            <tbody>
              {scores.map(s => (
                <tr key={s.id} className="border-t border-line">
                  <td className="py-1.5 font-mono text-[12px]">{s.id}</td>
                  <td className="py-1.5">{s.kappa.toFixed(2)}</td>
                  <td className="py-1.5"><Badge tone={s.kappa >= 0.6 ? "teal" : "terra"}>{s.kappa >= 0.6 ? "✓" : "▲"} {kappaLabel(s.kappa)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <h2 className="mb-2 mt-6 text-[13px] font-semibold">Ambiguous rules</h2>
      <div className="space-y-4">
        {ambiguous.map(a => (
          <Card key={a.id} title={`${a.id} · ${a.title}`} action={<Badge tone="navy">Proposal only</Badge>}>
            <div className="mb-3 text-[13px]">
              <span className="text-muted">Probe: </span>{a.probe}
              <ul className="mt-2 flex flex-wrap gap-2">
                {a.votes.map(v => <li key={v.who}><Badge tone={v.vote === "Violation" ? "terra" : "teal"}>{v.vote === "Violation" ? "✕" : "✓"} {v.who}: {v.vote}</Badge></li>)}
              </ul>
              <p className="mt-1 text-[12px] text-muted">Reviewers disagree on the same text.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-line p-3"><div className="mb-1 text-[12px] font-semibold text-muted">Before</div><p className="text-[13px]">{a.before}</p></div>
              <div className="rounded-md border border-teal/40 bg-teal/5 p-3"><div className="mb-1 text-[12px] font-semibold text-teal">Suggested rewrite</div><p className="text-[13px]">{a.after}</p></div>
            </div>
            <p className="mt-2 text-[12px] text-muted">Suggestion only. A brand owner must review and approve any change to the guideline.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
