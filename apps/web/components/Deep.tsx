"use client";
import { Badge, Card, Empty } from "./ui";
import type { Claim, Conflict, IngestionInfo, LlmInfo, LlmStatus, PrecedentMatch } from "@/lib/api";

export const sevTone = (s: string) => (/crit|high/i.test(s) ? "terra" : /med/i.test(s) ? "navy" : "teal") as "terra" | "navy" | "teal";
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

const WARNING_TEXT = "Possible instruction-like text detected; treated as data only";

export function LlmChip({ status, error }: { status: LlmStatus | null; error?: boolean }) {
  if (!status) return <Badge>{error ? "Model verification: status unavailable" : "Model verification: checking…"}</Badge>;
  return status.configured
    ? <Badge tone="teal">Model verification: on ({status.model})</Badge>
    : <Badge tone="navy">Model verification: off: no API key, using retrieval + rules</Badge>;
}

const SOURCE: Record<string, { label: string; tone: "teal" | "navy" | "neutral"; tip: string }> = {
  rules: { label: "rules", tone: "navy", tip: "Decided by a deterministic rule finding" },
  llm: { label: "llm", tone: "teal", tip: "Judged by the language model against retrieved evidence" },
  retrieval: { label: "retrieval", tone: "neutral", tip: "Retrieval similarity only; not model-assessed" },
};
export const SourceBadge = ({ s }: { s: string }) => { const x = SOURCE[s] ?? { label: s, tone: "neutral" as const, tip: "" }; return <span title={x.tip}><Badge tone={x.tone}>{x.label}</Badge></span>; };

const labelTone = (l: string) => (l === "Supported" ? "teal" : l === "Contradicted" ? "terra" : l === "Gap" ? "neutral" : "navy") as "teal" | "terra" | "neutral" | "navy";

export function IngestionPanel({ ing }: { ing: IngestionInfo }) {
  return (
    <Card title="Ingestion">
      <p className="text-[13px]">{ing.chars.toLocaleString()} characters read. Sanitised: <b>{ing.sanitised ? "yes (hidden or control characters removed)" : "no changes needed"}</b>.</p>
      {ing.warnings.length > 0 ? (
        <div role="alert" className="mt-2 rounded-md border border-terra/40 bg-terra/10 px-3 py-2 text-[13px]">
          <p className="font-medium text-terra">{WARNING_TEXT}.</p>
          <ul className="mt-1 list-inside list-disc text-[12px]">{ing.warnings.map((w, i) => <li key={i}><span className="font-mono">{w.type}</span>: {w.detail}</li>)}</ul>
          <p className="mt-1 text-[12px] text-muted">Nothing in your text can change the analysis, routing or any decision. Warnings are recorded in the audit trail.</p>
        </div>
      ) : <p className="mt-1 text-[12px] text-muted">No instruction-like text detected.</p>}
    </Card>
  );
}

export function ClaimsTable({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) return <Empty>No claims were found in this text.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="text-[12px] text-muted"><tr><th className="pb-2 font-medium">Claim</th><th className="pb-2 font-medium">Label</th><th className="pb-2 font-medium">Confidence</th><th className="pb-2 font-medium">Rationale</th><th className="pb-2 font-medium">Evidence</th><th className="pb-2 font-medium">Source</th></tr></thead>
        <tbody>{claims.map(c => (
          <tr key={c.id} className="border-t border-line align-top">
            <td className="py-2 pr-2">{c.text}</td>
            <td className="py-2 pr-2"><Badge tone={labelTone(c.label)}>{c.label}</Badge></td>
            <td className="py-2 pr-2">{Math.round(c.confidence * 100)}%</td>
            <td className="py-2 pr-2 text-muted">{c.rationale}</td>
            <td className="py-2 pr-2"><ul className="space-y-0.5">{c.evidence.map(e => <li key={e.id} className="text-[12px]"><span className="font-mono">{e.id}</span> {e.title}</li>)}{c.evidence.length === 0 && <li className="text-[12px] text-muted">none</li>}</ul></td>
            <td className="py-2"><SourceBadge s={c.source} /></td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

export function PrecedentsList({ precedents, conflicts }: { precedents: PrecedentMatch[]; conflicts: Conflict[] }) {
  return (
    <div>
      {conflicts.map(c => <p key={c.rule} role="note" className="mb-2 rounded-md border border-terra/40 bg-terra/5 px-3 py-2 text-[13px]"><b>Conflicting precedents for {c.rule}:</b> {c.allowed.join(", ")} allowed, {c.rejected.join(", ")} rejected. A human reviewer should resolve this.</p>)}
      {precedents.length === 0 ? <Empty>No similar past decisions found.</Empty> : (
        <ul className="divide-y divide-line">{precedents.map(p => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
            <span><span className="font-mono text-[12px]">{p.id}</span> {p.title} <span className="text-muted">· {p.rule}</span></span>
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge tone={p.decision === "Rejected" ? "terra" : "teal"}>{p.decision ?? "unknown"}</Badge>
              <span className="text-[12px] text-muted">similarity {p.similarity.toFixed(2)}</span>
              {p.conflict && <Badge tone="terra">▲ Conflict</Badge>}
            </span>
          </li>))}</ul>)}
    </div>
  );
}

export function LlmRunNote({ llm }: { llm: LlmInfo }) {
  if (llm.status === "ok" || llm.status === "unavailable") return null;
  return <p role="status" className="text-[12px] text-terra">The model could not verify some claims in this run ({llm.status}); those claims fall back to retrieval + rules.</p>;
}
