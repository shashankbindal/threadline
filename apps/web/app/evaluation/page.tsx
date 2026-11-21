"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Alert, Badge, Card, Empty, ErrorNote, NotConnected, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { api, apiEnabled, type EvalSet, type ExternalEval, type Metrics, type SystemRow } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const pct = (n?: number) => (typeof n === "number" ? (n * 100).toFixed(1) + "%" : "–");
const KEYS = ["precision", "recall", "f1", "accuracy"] as const;
const NAMES: Record<string, string> = { engine: "Rules engine", baseline: "Keyword baseline", "rules+retrieval": "Rules + retrieval", "rules+llm": "Rules + LLM" };

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

function External({ ext }: { ext: ExternalEval }) {
  const measured = ext.status === "measured";
  const mb = ext.majority_baseline;
  return (
    <Card title="External check: VitaminC (independent public data)" action={<Badge tone={measured ? "teal" : "navy"}>{measured ? "Measured" : "Not yet measured"}</Badge>}>
      <div className="space-y-2 text-[13px]">
        <Alert tone="navy"><b>Domain caveat:</b> VitaminC is Wikipedia text (claim + evidence), not marketing copy. It checks only the claim-verification stage on independently labelled data. It does not show how well Threadline performs on real brand content.</Alert>
        {measured ? (
          <p>Accuracy <b>{pct(ext.accuracy)}</b>, macro-F1 <b>{pct(ext.macro_f1)}</b> on {ext.n} claims.{ext.per_class_f1 && <> Per class F1: {Object.entries(ext.per_class_f1).map(([k, v]) => `${k} ${pct(v)}`).join(", ")}.</>}</p>
        ) : (
          <p>The language-model verifier has not been run on this data, so there is no external result to show. {ext.detail ?? ext.reason}</p>
        )}
        {mb && <p className="text-muted">For reference, a trivial baseline that always answers &ldquo;{mb.predicts}&rdquo; scores accuracy {pct(mb.accuracy)} and macro-F1 {pct(mb.macro_f1)} on {mb.n} claims.</p>}
        <p className="text-[12px] text-muted">{ext.note}</p>
      </div>
    </Card>
  );
}

export default function EvaluationPage() {
  const [set, setSet] = useState<EvalSet>("v2");
  const ev = useApi(() => api.evaluation(set), [set]);
  const ext = useApi(api.evaluationExternal);
  if (!apiEnabled) return <div><PageHeader title="Evaluation" /><NotConnected /></div>;

  const head = (
    <PageHeader title="Evaluation" sub="How well do the checks work? Pick a benchmark set, compare systems, and read every miss and false positive. Labels here were written by the prototype authors; independent labels come from the Annotate page." />
  );
  const setTabs = <Tabs tabs={["v1", "v2"] as const} value={set} onChange={setSet} />;
  const d = ev.data;
  const ready = d && d.set === set && !ev.loading;

  const systems: (SystemRow & { key: string })[] = d ? [{ ...d.engine, key: "engine", status: "ran" }, { ...d.baseline, key: "baseline", status: "ran" }, ...d.other_systems.map(s => ({ ...s, key: s.system ?? "?" }))] : [];
  const chartSystems = systems.filter(s => s.status === "ran" && typeof s.f1 === "number");
  const chart = KEYS.map(k => Object.fromEntries([["metric", k], ...chartSystems.map(s => [NAMES[s.key] ?? s.key, +((s[k] ?? 0) * 100).toFixed(1)])]));
  const COLORS = ["#233342", "#D8754D", "#299D8F", "#8A8678"];
  const eng = d?.engine as (SystemRow & Metrics) | undefined;
  const prr = eng?.perRuleRecall ?? {};
  const perRule = Object.entries(prr).map(([rule, v]) => ({ rule, recall: typeof v?.recall === "number" ? +(v.recall * 100).toFixed(1) : 0 }));
  const errors = systems.flatMap(s => s.status === "ran" ? [
    ...(s.misses ?? []).map(text => ({ system: NAMES[s.key] ?? s.key, kind: "Miss", text })),
    ...(s.falsePositives ?? []).map(text => ({ system: NAMES[s.key] ?? s.key, kind: "False positive", text })),
  ] : []);

  return (
    <div>
      {head}
      {setTabs}
      {ev.error ? <ErrorNote message={ev.error} onRetry={ev.reload} /> : !ready ? <div className="space-y-4"><Skeleton className="h-72" /><Skeleton className="h-40" /></div> : (
        <div className="space-y-4">
          <p className="text-[13px]"><b>Set {d.set}:</b> {d.n} sentences ({d.risky} risky, {d.n - d.risky} safe){Object.keys(d.subsets).length > 0 && <> · {Object.entries(d.subsets).map(([k, v]) => `${k}: ${v}`).join(", ")}</>}</p>
          <Card title="Systems compared">
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-[13px]"><thead className="text-[12px] text-muted"><tr><th className="pb-2 font-medium">System</th><th className="font-medium">Status</th>{KEYS.map(k => <th key={k} className="font-medium capitalize">{k}</th>)}</tr></thead>
              <tbody>{systems.map(s => (
                <tr key={s.key} className="border-t border-line align-top">
                  <td className="py-1.5 pr-2">{NAMES[s.key] ?? s.key}{s.definition && <div className="text-[11px] text-muted">{s.definition}</div>}</td>
                  {s.status === "ran"
                    ? <><td><Badge tone="teal">ran</Badge></td>{KEYS.map(k => <td key={k}>{pct(s[k])}</td>)}</>
                    : <><td><Badge tone="neutral">not run</Badge></td><td colSpan={4} className="text-muted">Not run{s.reason ? `: ${s.reason}` : ""}. No numbers are shown because none were measured.</td></>}
                </tr>))}</tbody></table></div>
            <p className="mt-2 text-[12px] text-muted">{d.other_systems_status}. Rules engine and keyword baseline are computed live on every request; the other systems come from the committed run in evals/results/latest.json.</p>
          </Card>
          {chartSystems.length > 0 && (
            <Card title={`Metrics by system (n = ${d.n})`}>
              <div className="h-72" role="img" aria-label={`Grouped bar chart of ${KEYS.join(", ")} for ${chartSystems.map(s => NAMES[s.key] ?? s.key).join(", ")}`}>
                <ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="metric" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Legend />
                  {chartSystems.map((s, i) => <Bar key={s.key} dataKey={NAMES[s.key] ?? s.key} fill={COLORS[i % COLORS.length]} />)}</BarChart></ResponsiveContainer>
              </div>
            </Card>)}
          <div className="grid gap-4 md:grid-cols-2"><Confusion name="Rules engine" m={d.engine} /><Confusion name="Keyword baseline" m={d.baseline} /></div>
          <Card title="Per-rule recall (rules engine)">
            {perRule.length === 0 ? <Empty>No per-rule data.</Empty> : (
              <div className="h-64" role="img" aria-label="Bar chart of recall per rule"><ResponsiveContainer><BarChart data={perRule}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="rule" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Bar dataKey="recall" name="Recall" fill="#299D8F" /></BarChart></ResponsiveContainer></div>)}
          </Card>
          <Card title={`Every miss and false positive (${errors.length})`}>
            {errors.length === 0 ? <Empty>None.</Empty> : (
              <div className="max-h-96 overflow-auto"><table className="w-full text-left text-[13px]"><thead className="sticky top-0 bg-paper text-[12px] text-muted"><tr><th className="pb-2 font-medium">System</th><th className="font-medium">Type</th><th className="font-medium">Text</th></tr></thead>
                <tbody>{errors.map((e, i) => <tr key={i} className="border-t border-line align-top"><td className="py-1.5 pr-2">{e.system}</td><td className="pr-2">{e.kind}</td><td>{e.text}</td></tr>)}</tbody></table></div>)}
          </Card>
          <Card title="Caveats"><p className="text-[13px]">{d.note} The sentences were written alongside the rules, so the engine is likely to look better here than on real brand content. Treat this as a regression check and a baseline comparison, not as evidence of real-world accuracy.</p></Card>
        </div>
      )}
      <div className="mt-4">
        {ext.error ? <ErrorNote message={ext.error} onRetry={ext.reload} /> : ext.data ? <External ext={ext.data} /> : <Skeleton className="h-32" />}
      </div>
    </div>
  );
}
