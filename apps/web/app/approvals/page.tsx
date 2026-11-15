"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, MessageSquare, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { Badge, Btn, Card, Modal, NotConnected, PageHeader, Tabs } from "@/components/ui";
import { api, apiEnabled, type AuditEvent, type ProofCard, type Review } from "@/lib/api";

const sevTone = (s: string) => (/crit|high/i.test(s) ? "terra" : /med/i.test(s) ? "navy" : "teal") as "terra" | "navy" | "teal";
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : JSON.stringify(v));
const when = (v: unknown) => { const s = str(v); const d = new Date(s); return s && !isNaN(+d) ? d.toLocaleString() : s; };

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Review[]>([]);
  const [selId, setSelId] = useState("");
  const [tab, setTab] = useState<"Review" | "Audit trail">("Review");
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [card, setCard] = useState<ProofCard | null>(null);
  const [tamper, setTamper] = useState(false);
  const [vres, setVres] = useState<{ valid: boolean; reason: string } | null>(null);

  const load = useCallback(async (keep?: string) => {
    try { const r = await api.reviews(); setItems(r); setSelId(s => keep ?? (r.some(x => x.id === s) ? s : r[0]?.id ?? "")); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { if (apiEnabled) load(); }, [load]);
  useEffect(() => { if (apiEnabled && selId) api.audit(selId).then(setAudit).catch(() => setAudit([])); }, [selId, items]);

  if (!apiEnabled) return <div><PageHeader title="Approvals" /><NotConnected /></div>;
  const sel = items.find(i => i.id === selId);
  const canDecide = !!user?.canDecide;

  const openProof = async (id: string) => {
    try { setCard(await api.proof(id)); setTamper(false); setVres(null); } catch (e) { setErr((e as Error).message); }
  };
  const decide = async (d: "approve" | "request_changes") => {
    if (!sel) return;
    setErr("");
    try { await api.decide(sel.id, d, note); setNote(""); await load(sel.id); await openProof(sel.id); } catch (e) { setErr((e as Error).message); }
  };
  const addComment = async () => {
    if (!sel || !draft.trim()) return;
    try { await api.comment(sel.id, draft.trim()); setDraft(""); await load(sel.id); } catch (e) { setErr((e as Error).message); }
  };
  const shown: ProofCard | null = card && (tamper ? { ...card, decision: card.decision === "approve" || card.decision === "approved" ? "request_changes" : "approved" } : card);
  const verify = async () => { if (!shown) return; try { setVres(await api.verify(shown)); } catch (e) { setVres({ valid: false, reason: (e as Error).message }); } };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(shown, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `proof-card-${selId}.json`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Approvals" sub="AI recommends routing and flags findings. Only a human reviewer can approve or request changes." />
      {err && <p role="alert" className="mb-3 rounded-md border border-terra/40 bg-terra/10 px-3 py-2 text-[13px] text-terra">Error: {err}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card title={`Reviews (${items.length})`}>
          <ul className="space-y-2">{items.map(i => (
            <li key={i.id}><button onClick={() => setSelId(i.id)} aria-current={i.id === selId} className={`w-full rounded-md border p-2.5 text-left ${i.id === selId ? "border-navy bg-navy/5" : "border-line hover:bg-black/[.02]"}`}>
              <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">{i.title}</span><Badge tone={sevTone(i.severity)}>Severity: {i.severity}</Badge></div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1"><Badge>{i.status}</Badge>{i.routing.map(x => <Badge key={x} tone="navy">{x}</Badge>)}</div>
            </button></li>))}
            {items.length === 0 && <li className="text-[12px] text-muted">No reviews yet. Send one from Reader Lens.</li>}</ul>
        </Card>

        {sel && (
          <Card title={sel.title} action={<Btn onClick={() => openProof(sel.id)}><ShieldCheck size={14} /> Proof Card</Btn>}>
            <Tabs tabs={["Review", "Audit trail"] as const} value={tab} onChange={setTab} />
            {tab === "Review" ? (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap rounded border border-line bg-ivory p-3 text-[13px]">{sel.text}</div>
                <div><div className="mb-1 text-[12px] text-muted">Routing</div><div className="flex flex-wrap gap-1">{sel.routing.length ? sel.routing.map(x => <Badge key={x} tone="navy">{x}</Badge>) : <span className="text-[13px] text-muted">None</span>}</div></div>
                <div><div className="mb-1 text-[12px] text-muted">Findings ({sel.findings.length})</div>
                  <ul className="space-y-1">{sel.findings.map(f => <li key={f.id} className="text-[13px]">&ldquo;{f.match}&rdquo; <span className="font-mono text-[11px] text-muted">{f.rule}</span> <Badge tone={sevTone(f.severity)}>Severity: {f.severity}</Badge> <span className="text-muted">{f.status}</span></li>)}</ul></div>
                <div>
                  <label className="block text-[12px] text-muted">Decision note<input value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]" /></label>
                  <div className="mt-2 flex gap-2">
                    <Btn variant="primary" disabled={!canDecide} onClick={() => decide("approve")}>Approve</Btn>
                    <Btn disabled={!canDecide} onClick={() => decide("request_changes")}>Request changes</Btn>
                  </div>
                  {!canDecide && <p className="mt-1 text-[12px] text-muted">Your role ({user?.role ?? "unknown"}) cannot decide. Only Brand, Legal or Compliance reviewers can. Threadline never approves automatically.</p>}
                </div>
                <div><div className="mb-1 flex items-center gap-1 text-[12px] text-muted"><MessageSquare size={12} /> Comments</div>
                  <ul className="mb-2 space-y-2">{sel.comments.map((c, k) => <li key={k} className="rounded border border-line p-2 text-[13px]"><span className="font-medium">{c.author ?? c.who ?? "Reviewer"}</span> <span className="text-[12px] text-muted">{when(c.created_at ?? c.at)}</span><div>{c.text}</div></li>)}
                    {sel.comments.length === 0 && <li className="text-[12px] text-muted">No comments yet.</li>}</ul>
                  <div className="flex gap-2"><input aria-label="Add comment" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} placeholder="Add a comment" className="flex-1 rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]" /><Btn onClick={addComment}>Post</Btn></div></div>
              </div>
            ) : (
              <ol className="space-y-3 border-l border-line pl-4">{audit.map((e, k) => (
                <li key={k} className="relative text-[13px]"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-navy" aria-hidden />
                  <div>{str(e.action ?? e.what ?? e.event)} {str(e.detail ?? "")}</div>
                  <div className="text-[12px] text-muted">{str(e.actor ?? e.who ?? e.user)} · {when(e.created_at ?? e.timestamp ?? e.at)}</div></li>))}
                {audit.length === 0 && <li className="text-[12px] text-muted">No events.</li>}</ol>
            )}
          </Card>
        )}
      </div>

      <Modal open={!!shown} onClose={() => setCard(null)} title="Proof Card">
        {shown && (
          <div className="space-y-3 text-[13px]">
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              <dt className="text-muted">Content hash</dt><dd className="break-all font-mono text-[11px]">{shown.content_hash}</dd>
              <dt className="text-muted">Decision</dt><dd>{shown.decision}{tamper && <span className="ml-2 text-terra">(tampered)</span>}</dd>
              <dt className="text-muted">Reviewer</dt><dd>{str(shown.reviewer)}</dd>
              <dt className="text-muted">Routing</dt><dd>{str(shown.routing)}</dd>
              <dt className="text-muted">Timestamp</dt><dd>{shown.timestamp}</dd>
              <dt className="text-muted">Algorithm</dt><dd>{shown.algorithm}</dd>
              <dt className="text-muted">Signature</dt><dd className="break-all font-mono text-[11px]">{shown.signature}</dd>
            </dl>
            <label className="flex items-center gap-2"><input type="checkbox" checked={tamper} onChange={e => { setTamper(e.target.checked); setVres(null); }} /> Tamper with card (edits the decision field)</label>
            <div className="flex gap-2"><Btn variant="primary" onClick={verify}>Verify</Btn><Btn onClick={download}><Download size={14} /> Download JSON</Btn></div>
            {vres && <p role="status" className={`rounded-md border px-3 py-2 ${vres.valid ? "border-teal/40 bg-teal/10 text-teal" : "border-terra/40 bg-terra/10 text-terra"}`}>{vres.valid ? "Valid signature" : "INVALID"}: {vres.reason}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
