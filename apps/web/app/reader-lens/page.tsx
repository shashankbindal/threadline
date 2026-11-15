"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Badge, Btn, Card, NotConnected, PageHeader, SevBadge } from "@/components/ui";
import { api, apiEnabled, type Analysis, type Finding } from "@/lib/api";
import { CONTENT } from "@/lib/data";

const sevTone = (s: string) => (/crit|high/i.test(s) ? "terra" : /med/i.test(s) ? "navy" : "teal") as "terra" | "navy" | "teal";
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

function Highlighted({ text, findings }: { text: string; findings: Finding[] }) {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  const parts: JSX.Element[] = [];
  let pos = 0;
  sorted.forEach((f, i) => {
    if (f.start < pos || f.end > text.length) return;
    parts.push(<Fragment key={"t" + i}>{text.slice(pos, f.start)}</Fragment>);
    parts.push(<mark key={"m" + i} className="rounded bg-terra/20 px-0.5 underline decoration-terra decoration-2 underline-offset-2">{text.slice(f.start, f.end)}<sup className="ml-0.5 font-mono text-[10px] font-semibold text-terra">[{f.rule}]</sup></mark>);
    pos = f.end;
  });
  parts.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <p className="whitespace-pre-wrap rounded-md border border-line bg-ivory p-3 text-[13px] leading-6" aria-label="Text with flagged phrases marked">{parts}</p>;
}

export default function ReaderLens() {
  const [text, setText] = useState(CONTENT[0].excerpt);
  const [res, setRes] = useState<Analysis | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Draft for review");
  const [sent, setSent] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    if (!apiEnabled || !text.trim()) { setRes(null); return; }
    const n = ++seq.current;
    const t = setTimeout(() => {
      setBusy(true);
      api.analyze(text).then(r => { if (n === seq.current) { setRes(r); setErr(""); } })
        .catch(e => { if (n === seq.current) setErr(e.message); })
        .finally(() => { if (n === seq.current) setBusy(false); });
    }, 500);
    return () => clearTimeout(t);
  }, [text]);

  if (!apiEnabled) return <div><PageHeader title="Reader Lens" /><NotConnected /></div>;

  const apply = (f: Finding) => {
    if (text.slice(f.start, f.end) !== f.match) return;
    setText(text.slice(0, f.start) + f.replacement + text.slice(f.end));
  };
  const send = async () => {
    setSent("");
    try { const r = await api.createReview(title.trim() || "Untitled draft", text); setSent(`Sent for human review (${r.id}). Routing: ${r.routing.join(", ") || "none"}.`); }
    catch (e) { setSent("Could not send: " + (e as Error).message); }
  };

  return (
    <div>
      <PageHeader title="Reader Lens" sub="See what a reader is likely to believe after reading your content, before it ships." />
      <div role="note" className="mb-4 rounded-md border border-teal/40 bg-teal/10 px-3 py-2 text-[13px]">Rules engine (deterministic), not an LLM. Same text always gives the same findings.</div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Content" className="self-start lg:col-span-2">
          <label className="block"><span className="sr-only">Content text</span>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={9} className="w-full rounded-md border border-line bg-ivory p-3 text-[13px] outline-none focus:border-navy" /></label>
          <p className="mt-1 text-[12px] text-muted">Content is treated as data, never instructions. {busy && "Analyzing..."}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input aria-label="Review title" value={title} onChange={e => setTitle(e.target.value)} className="min-w-0 flex-1 rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]" />
            <Btn variant="primary" onClick={send} disabled={!text.trim()}><Send size={13} /> Send for human review</Btn>
          </div>
          {sent && <p role="status" className="mt-2 text-[12px]">{sent}</p>}
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {err && <p role="alert" className="rounded-md border border-terra/40 bg-terra/10 px-3 py-2 text-[13px] text-terra">Error: {err}</p>}
          {res && (
            <>
              <Card title="Overall" action={<span className="text-[12px] text-muted">Engine: {res.engine}</span>}>
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span>Severity</span><Badge tone={sevTone(res.severity)}>{cap(res.severity)}</Badge>
                  <span className="ml-3">Routing</span>{res.routing.length ? res.routing.map(r => <Badge key={r} tone="navy">{r}</Badge>) : <span className="text-muted">No review required</span>}
                </div>
                <div className="mt-3"><Highlighted text={text} findings={res.findings} /></div>
              </Card>
              <Card title={`Findings (${res.findings.length})`}>
                {res.findings.length === 0 && <p className="text-muted">No findings.</p>}
                <ul className="space-y-4">{res.findings.map(f => (
                  <li key={f.id} className="border-b border-line pb-3 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">&ldquo;{f.match}&rdquo; <span className="font-mono text-[11px] text-muted">{f.rule}</span></span>
                      <span className="flex gap-1.5"><Badge>{f.kind}</Badge><Badge tone={f.status === "Contradicted" ? "terra" : "navy"}>{f.status}</Badge><Badge tone={sevTone(f.severity)}>Severity: {cap(f.severity)}</Badge></span>
                    </div>
                    <p className="mt-1 text-[13px]">Reader may believe: {f.belief} <span className="text-muted">({Math.round(f.conf * 100)}%)</span></p>
                    {f.source && <p className="text-[12px] text-muted">Source: {f.source}</p>}
                    <p className="mt-1 text-[13px]"><span className="text-muted">Suggested fix:</span> {f.fix}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="text-[12px] text-teal">{f.replacement}</code>
                      <Btn onClick={() => apply(f)} disabled={text.slice(f.start, f.end) !== f.match}>Apply suggested edit</Btn>
                    </div>
                  </li>))}</ul>
                <p className="mt-2 text-[12px] text-muted">Edits change only your draft when you click. Nothing is sent or approved automatically.</p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
