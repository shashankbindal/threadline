"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Play } from "lucide-react";
import { Card, PageHeader, Badge, Btn, DemoTag } from "@/components/ui";

const SCORES = [
  { id: "R-012", clarity: 62, kappa: 0.41 },
  { id: "R-019", clarity: 88, kappa: 0.79 },
  { id: "T-03", clarity: 94, kappa: 0.91 },
  { id: "T-05", clarity: 57, kappa: 0.33 },
  { id: "R-024", clarity: 81, kappa: 0.72 },
  { id: "R-031", clarity: 70, kappa: 0.55 },
];
const kappaLabel = (k: number) => (k >= 0.8 ? "Strong" : k >= 0.6 ? "Substantial" : k >= 0.4 ? "Moderate" : "Poor");

const AMBIGUOUS = [
  {
    id: "R-012", title: "No absolute security claims",
    probe: "\"Guaranteed 24/7 monitoring\"",
    votes: [["Reviewer A", "Violation"], ["Reviewer B", "Compliant"], ["Reviewer C", "Violation"]],
    before: "Never say unbreakable, 100% or guaranteed about detection.",
    after: "Never use absolute words (unbreakable, 100%, guaranteed) about detection or protection outcomes. Service-level commitments backed by an SLA may use them.",
  },
  {
    id: "T-05", title: "Prefer threat, avoid hack",
    probe: "\"Hackers hate this one trick\"",
    votes: [["Reviewer A", "Violation"], ["Reviewer B", "Violation"], ["Reviewer C", "Compliant"]],
    before: "Neutral, professional vocabulary.",
    after: "Use threat, attacker or adversary. Avoid hack, hacker and slang in customer-facing copy; quoting a third party is allowed with attribution.",
  },
];

export default function StressTestPage() {
  const [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    if (progress === null || progress >= 100) return;
    const t = setTimeout(() => setProgress(p => Math.min(100, (p ?? 0) + 10)), 250);
    return () => clearTimeout(t);
  }, [progress]);
  const running = progress !== null && progress < 100;

  return (
    <div>
      <PageHeader title="Guideline stress test" sub="Simulated reviewers apply each rule to probe cases. Low agreement means the rule wording is ambiguous."
        actions={<><DemoTag /><Btn variant="primary" disabled={running} onClick={() => setProgress(0)}><Play size={13} aria-hidden />{running ? `Running ${progress}%` : "Run stress test"}</Btn></>} />
      {progress !== null && (
        <div className="mb-4" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Stress test progress">
          <div className="h-1.5 overflow-hidden rounded bg-black/5"><div className="h-full bg-navy transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-1 text-[12px] text-muted">{progress < 100 ? "Simulating reviewers (demo, no model calls)" : "Complete (demo results)"}</p>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Clarity score per rule" action={<DemoTag />}>
          <div className="h-56" role="img" aria-label="Bar chart of clarity score per rule">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SCORES} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke="#e5e5e0" />
                <XAxis dataKey="id" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="clarity" name="Clarity" radius={[3, 3, 0, 0]}>
                  {SCORES.map(s => <Cell key={s.id} fill={s.clarity < 75 ? "#c8553d" : "#1f3a5f"} />)}
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
              {SCORES.map(s => (
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
        {AMBIGUOUS.map(a => (
          <Card key={a.id} title={`${a.id} · ${a.title}`} action={<Badge tone="navy">Proposal only</Badge>}>
            <div className="mb-3 text-[13px]">
              <span className="text-muted">Probe: </span>{a.probe}
              <ul className="mt-2 flex flex-wrap gap-2">
                {a.votes.map(([who, v]) => <li key={who}><Badge tone={v === "Violation" ? "terra" : "teal"}>{v === "Violation" ? "✕" : "✓"} {who}: {v}</Badge></li>)}
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
