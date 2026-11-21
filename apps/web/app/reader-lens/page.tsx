"use client";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Alert, Badge, Btn, Card, Empty, NotConnected, PageHeader } from "@/components/ui";
import { ClaimsTable, IngestionPanel, LlmChip, LlmRunNote, PrecedentsList, cap, sevTone } from "@/components/Deep";
import { api, apiEnabled, explain, isAbort, MAX_CHARS, type DeepAnalysis, type Finding } from "@/lib/api";
import { useApi } from "@/lib/useApi";

/** Finding offsets refer to the sanitised text; fall back to locating the matched phrase if the draft differs. */
function locate(text: string, f: Finding, used: number): [number, number] | null {
  if (f.start >= used && text.slice(f.start, f.end) === f.match) return [f.start, f.end];
  const i = text.indexOf(f.match, used);
  return i >= 0 && f.match ? [i, i + f.match.length] : null;
}

function Highlighted({ text, findings }: { text: string; findings: Finding[] }) {
  const parts: JSX.Element[] = [];
  let pos = 0;
  [...findings].sort((a, b) => a.start - b.start).forEach((f, i) => {
    const at = locate(text, f, pos);
    if (!at) return;
    parts.push(<Fragment key={"t" + i}>{text.slice(pos, at[0])}</Fragment>);
    parts.push(<mark key={"m" + i} className="rounded bg-terra/20 px-0.5 underline decoration-terra decoration-2 underline-offset-2">{text.slice(at[0], at[1])}<sup className="ml-0.5 font-mono text-[10px] font-semibold text-terra">[flagged {f.rule}, {cap(f.severity)}]</sup></mark>);
    pos = at[1];
  });
  parts.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <p className="whitespace-pre-wrap break-words rounded-md border border-line bg-ivory p-3 text-[13px] leading-6" aria-label="Text with flagged phrases marked">{parts}</p>;
}

export default function ReaderLens() {
  const library = useApi(api.content);
  const llm = useApi(api.llmStatus);
  const [text, setText] = useState("");
  const [res, setRes] = useState<DeepAnalysis | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [title, setTitle] = useState("Draft for review");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ ok: boolean; msg: string; id?: string } | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const sendLock = useRef(false);
  const [sentKey, setSentKey] = useState("");
  const key = JSON.stringify([title.trim(), text]);

  const len = text.length;
  const tooLong = len > MAX_CHARS;
  const empty = !text.trim();
  const titleBad = !title.trim() || title.length > 200;

  useEffect(() => {
    ctl.current?.abort();
    if (!apiEnabled || empty || tooLong) { setRes(null); setBusy(false); setErr(""); return; }
    const c = new AbortController(); ctl.current = c;
    const t = setTimeout(() => {
      setBusy(true); setErr("");
      api.analyzeDeep(text, c.signal)
        .then(r => { setRes(r); setAnalyzedText(text); })
        .catch(e => { if (!isAbort(e)) setErr(explain(e)); })
        .finally(() => { if (!c.signal.aborted) setBusy(false); });
    }, 600);
    return () => { clearTimeout(t); c.abort(); };
  }, [text, empty, tooLong, tick]);

  const stale = !!res && analyzedText !== text;
  const view = res;

  if (!apiEnabled) return <div><PageHeader title="Reader Lens" /><NotConnected /></div>;

  const apply = (f: Finding) => {
    const at = locate(text, f, 0);
    if (!at) return;
    setText(text.slice(0, at[0]) + f.replacement + text.slice(at[1]));
  };
  const send = async () => {
    if (sendLock.current || empty || tooLong || titleBad || key === sentKey) return;
    sendLock.current = true; setSending(true); setSent(null);
    try { const r = await api.createReview(title.trim(), text); setSentKey(key); setSent({ ok: true, id: r.id, msg: `Sent for human review. Routing: ${r.routing.join(", ") || "none"}.` }); }
    catch (e) { setSent({ ok: false, msg: "Could not send: " + explain(e) }); }
    sendLock.current = false; setSending(false);
  };

  return (
    <div>
      <PageHeader title="Reader Lens" sub="Step 1: paste marketing copy (or load an example) to see what a reader may believe and which rules it breaks. Step 2: send it for human review." />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-teal/40 bg-teal/10 px-3 py-2 text-[13px]">
        <span>Rule findings are deterministic: the same text always gives the same findings. Claim labels combine rules, retrieval and, when enabled, a language model.</span>
        <LlmChip status={llm.data} error={!!llm.error} />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Content" className="self-start lg:col-span-2">
          <label className="mb-2 block text-[12px] text-muted">Load an example from the content library
            <select value="" onChange={e => { const c = library.data?.find(x => x.id === e.target.value); if (c) { setText(c.excerpt); setTitle(c.title); setSent(null); } }}
              disabled={!library.data} className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]">
              <option value="">{library.loading ? "Loading..." : library.error ? "Library unavailable" : "Choose an item"}</option>
              {(library.data ?? []).map(c => <option key={c.id} value={c.id}>{c.id} {c.title}</option>)}
            </select></label>
          {library.error && <div className="mb-2"><button className="text-[12px] underline" onClick={library.reload}>Retry loading the library</button></div>}
          <label className="block"><span className="sr-only">Content text</span>
            <textarea placeholder="Paste or type content here, or load an example above" value={text} onChange={e => { setText(e.target.value); setSent(null); }} rows={9}
              aria-invalid={tooLong} aria-describedby="rl-count" className={`w-full rounded-md border bg-ivory p-3 text-[13px] outline-none focus:border-navy ${tooLong ? "border-terra" : "border-line"}`} /></label>
          <p id="rl-count" className={`mt-1 text-[12px] ${tooLong ? "font-medium text-terra" : "text-muted"}`}>
            {len.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters{tooLong && `: ${(len - MAX_CHARS).toLocaleString()} too many. Shorten the text to analyze it.`}
            {empty && !tooLong && " · Enter some text to analyze."}
          </p>
          <p className="text-[12px] text-muted">Content is treated as data, never instructions. {busy && <span role="status">Analyzing…</span>}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="min-w-0 flex-1"><span className="sr-only">Review title</span>
              <input aria-label="Review title" aria-invalid={titleBad} maxLength={220} value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]" /></label>
            <Btn variant="primary" onClick={send} disabled={empty || tooLong || titleBad || sending || key === sentKey}><Send size={13} aria-hidden /> {sending ? "Sending…" : key === sentKey ? "Sent" : "Send for human review"}</Btn>
          </div>
          {titleBad && <p className="mt-1 text-[12px] text-terra">{title.trim() ? "Title must be 200 characters or fewer." : "Give the review a title."}</p>}
          {sent && (sent.ok
            ? <div className="mt-2"><Alert tone="teal">{sent.msg} <Link href="/approvals" className="font-medium underline">Open Approvals</Link> to approve it as a Legal, Compliance or Brand reviewer.</Alert></div>
            : <div className="mt-2"><Alert>{sent.msg}</Alert></div>)}
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {err && <Alert>{err} <button className="ml-2 rounded border border-terra/40 bg-paper px-2 py-0.5 font-medium underline" onClick={() => setTick(t => t + 1)}>Retry</button></Alert>}
          {!view && !err && <Empty>{busy ? "Analyzing…" : "Results appear here as you type: severity, flagged phrases, claim verification and similar past decisions."}</Empty>}
          {view && (
            <>
              {stale && <Alert tone="navy">Text changed. Updating the analysis…</Alert>}
              <Card title="Overall" action={<span className="text-[12px] text-muted">Engine: {view.engine}</span>}>
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span>Severity</span><Badge tone={sevTone(view.severity)}>{cap(view.severity)}</Badge>
                  <span className="ml-3">Routing</span>{view.routing.length ? view.routing.map(r => <Badge key={r} tone="navy">{r}</Badge>) : <span className="text-muted">No review required</span>}
                </div>
                <div className="mt-3"><Highlighted text={analyzedText} findings={view.findings} /></div>
              </Card>
              <IngestionPanel ing={view.ingestion} />
              <Card title={`Claims (${view.claims.length})`}>
                <ClaimsTable claims={view.claims} />
                <div className="mt-2"><LlmRunNote llm={view.llm} /></div>
              </Card>
              <Card title={`Rule findings (${view.findings.length})`}>
                {view.findings.length === 0 && <Empty>No rule findings. The text passes the deterministic rules.</Empty>}
                <ul className="space-y-4">{view.findings.map(f => (
                  <li key={f.id} className="border-b border-line pb-3 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">&ldquo;{f.match}&rdquo; <span className="font-mono text-[11px] text-muted">{f.rule}</span></span>
                      <span className="flex flex-wrap gap-1.5"><Badge>{f.kind}</Badge><Badge tone={f.status === "Contradicted" ? "terra" : "navy"}>{f.status}</Badge><Badge tone={sevTone(f.severity)}>Severity: {cap(f.severity)}</Badge></span>
                    </div>
                    <p className="mt-1 text-[13px]">Reader may believe: {f.belief} <span className="text-muted">({Math.round(f.conf * 100)}%)</span></p>
                    {f.source && <p className="text-[12px] text-muted">Source: {f.source}</p>}
                    <p className="mt-1 text-[13px]"><span className="text-muted">Suggested fix:</span> {f.fix}</p>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <code className="text-[12px] text-teal">{f.replacement}</code>
                      <Btn onClick={() => apply(f)} disabled={stale || !locate(text, f, 0)}>Apply suggested edit</Btn>
                    </div>
                  </li>))}</ul>
                <p className="mt-2 text-[12px] text-muted">Edits change only your draft when you click. Nothing is sent or approved automatically.</p>
              </Card>
              <Card title={`Similar past decisions (${view.precedents.length})`}><PrecedentsList precedents={view.precedents} conflicts={view.conflicts} /></Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
