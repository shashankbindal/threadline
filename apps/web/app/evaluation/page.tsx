"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, NotConnected, PageHeader } from "@/components/ui";
import { api, apiEnabled, type Evaluation, type Metrics } from "@/lib/api";

const pct = (n: number) => (n * 100).toFixed(1) + "%";
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

function Confusion({ name, m }: { name: string; m: Metrics }) {
  const c = m.confusion;
  const cell = (label: string, v: number, bad = false) => <td className={`border border-line p-3 text-center ${bad ? "text-terra" : "text-teal"}`}><div className="text-lg font-semibold">{v}</div><div className="text-[11px] text-muted">{label}</div></td>;
  return (
    <Card title={`Confusion matrix: ${name}`}>
      <table className="w-full table-fixed text-[12px]"><thead><tr><th /><th className="font-medium text-muted">Predicted violation</th><th className="font-medium text-muted">Predicted clean</th></tr></thead>
        <tbody><tr><th className="text-left font-medium text-muted">Actual violation</th>{cell("true positive", c.tp)}{cell("false negative (miss)", c.fn, true)}</tr>
          <tr><th className="text-left font-medium text-muted">Actual clean</th>{cell("false positive", c.fp, true)}{cell("true negative", c.tn)}</tr></tbody></table>
    </Card>
  );
}

export default function EvaluationPage() {
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (apiEnabled) api.evaluation().then(setEv).catch(e => setErr(e.message)); }, []);
  if (!apiEnabled) return <div><PageHeader title="Evaluation" /><NotConnected /></div>;

  const keys = ["precision", "recall", "f1", "accuracy"] as const;
  const data = ev ? keys.map(k => ({ metric: k, Engine: +(ev.engine[k] * 100).toFixed(1), Baseline: +(ev.baseline[k] * 100).toFixed(1) })) : [];
  const pr = ev?.per_rule;
  const perRule: { rule: string; recall: number | null }[] = !pr ? [] : Array.isArray(pr)
    ? pr.map((r: any) => ({ rule: r.rule ?? r.id, recall: r.recall ?? r.engine ?? null }))
    : Object.entries(pr).map(([rule, v]: [string, any]) => ({ rule, recall: typeof v === "number" ? v : v?.recall ?? null }));

  return (
    <div>
      <PageHeader title="Evaluation" sub="Rules engine versus a naive keyword baseline on a labelled set." actions={<Badge tone="teal">&#10003; Measured</Badge>} />
      {err && <p role="alert" className="mb-3 rounded-md border border-terra/40 bg-terra/10 px-3 py-2 text-[13px] text-terra">Error: {err}</p>}
      {ev && (
        <div className="space-y-4">
          <Card title={`Engine vs baseline (n = ${ev.n})`}>
            <div className="h-72" role="img" aria-label="Grouped bar chart of precision, recall, F1 and accuracy for engine and baseline">
              <ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="metric" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Legend />
                <Bar dataKey="Engine" fill="#233342" /><Bar dataKey="Baseline" fill="#D8754D" /></BarChart></ResponsiveContainer>
            </div>
            <table className="mt-3 w-full text-left text-[13px]"><thead className="text-[12px] text-muted"><tr><th>System</th>{keys.map(k => <th key={k} className="font-medium">{k}</th>)}</tr></thead>
              <tbody>{(["engine", "baseline"] as const).map(s => <tr key={s} className="border-t border-line"><td className="py-1.5 capitalize">{s}</td>{keys.map(k => <td key={k}>{pct(ev[s][k])}</td>)}</tr>)}</tbody></table>
          </Card>
          <div className="grid gap-4 md:grid-cols-2"><Confusion name="Engine" m={ev.engine} /><Confusion name="Baseline" m={ev.baseline} /></div>
          <Card title="Per-rule recall (engine)">
            {perRule.length === 0 ? <p className="text-muted">No per-rule data.</p> : (
              <div className="h-64" role="img" aria-label="Bar chart of recall per rule"><ResponsiveContainer><BarChart data={perRule.map(r => ({ rule: r.rule, recall: r.recall == null ? 0 : +(r.recall * 100).toFixed(1) }))}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="rule" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Bar dataKey="recall" fill="#299D8F" /></BarChart></ResponsiveContainer></div>)}
          </Card>
          <Card title={`Every miss and false positive (${ev.errors.length})`}>
            {ev.errors.length === 0 ? <p className="text-muted">None.</p> : (
              <table className="w-full text-left text-[13px]"><thead className="text-[12px] text-muted"><tr><th className="pb-2 font-medium">System</th><th className="font-medium">Type</th><th className="font-medium">Rule</th><th className="font-medium">Text</th></tr></thead>
                <tbody>{ev.errors.map((e, i) => <tr key={i} className="border-t border-line align-top"><td className="py-1.5">{str(e.system ?? e.engine)}</td><td>{str(e.kind ?? e.type ?? e.error)}</td><td className="font-mono text-[12px]">{str(e.rule)}</td><td>{str(e.text ?? e.detail ?? e.text_id)}</td></tr>)}</tbody></table>)}
          </Card>
          <Card title="Caveats">
            <p className="text-[13px]">These numbers come from a small, fictional, hand-labelled set ({ev.n} items) written alongside the rules, so the engine is likely to look better here than on real brand content. Treat it as a regression check and a baseline comparison, not as evidence of real-world accuracy. Misses and false positives are listed in full above.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
