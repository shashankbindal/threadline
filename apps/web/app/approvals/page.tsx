"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileImage, MessageSquare, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { Alert, Badge, Btn, Card, Empty, ErrorNote, Modal, NotConnected, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { ClaimsTable, IngestionPanel, PrecedentsList, LlmRunNote, sevTone } from "@/components/Deep";
import { api, apiEnabled, explain, type ApiError, type AuditEvent, type ProofCard, type ProvenanceResult, type Review } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
const when = (v: unknown) => { const s = str(v); const d = new Date(s); return s && !isNaN(+d) ? d.toLocaleString() : s; };
const who = (a: unknown) => (a && typeof a === "object" ? (() => { const x = a as { name?: string; role?: string }; return `${x.name ?? "Unknown"}${x.role ? ` (${x.role})` : ""}`; })() : str(a));
const statusLabel = (s: string) => ({ pending: "Pending review", approved: "Approved", changes_requested: "Changes requested" } as Record<string, string>)[s] ?? s;
const decisionLabel = (d: string) => (d === "approve" || d === "approved" ? "Approved" : d === "request_changes" ? "Changes requested" : d);
const detailText = (d: unknown) => { if (!d || typeof d !== "object") return ""; return Object.entries(d as Record<string, unknown>).filter(([k]) => k !== "content_hash").map(([k, v]) => `${k}: ${str(v)}`).join(" · "); };

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const list = useApi(api.reviews);
  const items = list.data ?? [];
  const [selId, setSelId] = useState("");
  const [tab, setTab] = useState<"Review" | "Audit trail">("Review");
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditErr, setAuditErr] = useState("");
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState<"" | "approve" | "request_changes" | "comment">("");
  const lock = useRef(false);
  const [card, setCard] = useState<ProofCard | null>(null);
  const [cardErr, setCardErr] = useState("");
  const [tamper, setTamper] = useState(false);
  const [vres, setVres] = useState<{ valid: boolean; reason: string } | null>(null);
  const [c2paBusy, setC2paBusy] = useState(false);
  const [c2paMsg, setC2paMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [img, setImg] = useState<ProvenanceResult | null>(null);
  const [imgName, setImgName] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [imgErr, setImgErr] = useState("");

  useEffect(() => { if (items.length && !items.some(x => x.id === selId)) setSelId(items[0].id); }, [items, selId]);
  const sel = items.find(i => i.id === selId);
  const decidedAt = sel?.decision?.at;
  const loadAudit = useCallback(() => {
    if (!apiEnabled || !selId) return;
    setAuditErr("");
    api.audit(selId).then(setAudit).catch(e => { setAudit([]); setAuditErr(explain(e)); });
  }, [selId]);
  useEffect(loadAudit, [loadAudit, sel?.comments.length, sel?.status, decidedAt]);

  if (!apiEnabled) return <div><PageHeader title="Approvals & Proof Cards" /><NotConnected /></div>;
  const head = <PageHeader title="Approvals & Proof Cards" sub="Step 3: pick a review, read its findings and approve or request changes (only Legal, Compliance or Brand reviewers routed on it can). Step 4: open the Proof Card to verify or download the signed record." />;
  if (list.error) return <div>{head}<ErrorNote message={list.error} onRetry={list.reload} /></div>;
  if (list.loading && !list.data) return <div>{head}<div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div></div>;

  const role = user?.role ?? "Viewer";
  const decided = !!sel?.decision;
  const routed = !!sel && sel.routing.includes(role);
  const canDecide = !!user?.canDecide && routed && !decided;
  const why = !sel ? "" : decided ? `Already decided: ${decisionLabel(sel!.decision!.decision)} by ${who(sel!.decision!.reviewer)}.`
    : !user?.canDecide ? `Your role (${role}) is read-only: only Brand, Legal or Compliance reviewers can decide. Threadline never approves automatically.`
    : !routed ? `This review is routed to ${sel!.routing.join(" + ") || "no one"}. Your role (${role}) is not one of them, so you can comment but not decide.` : "";

  const openProof = async (id: string) => {
    setCardErr(""); setC2paMsg(null); setImg(null); setImgName(""); setImgErr("");
    try { setCard(await api.proof(id)); setTamper(false); setVres(null); } catch (e) { setCard(null); setErr(explain(e)); }
  };
  const decide = async (d: "approve" | "request_changes") => {
    if (!sel || lock.current) return;
    lock.current = true; setPending(d); setErr("");
    try { await api.decide(sel.id, d, note.trim()); setNote(""); list.reload(); await openProof(sel.id); }
    catch (e) { setErr(explain(e)); if ((e as ApiError).status === 409 || (e as ApiError).status === 403) list.reload(); }
    lock.current = false; setPending("");
  };
  const addComment = async () => {
    if (!sel || !draft.trim() || lock.current) return;
    lock.current = true; setPending("comment"); setErr("");
    try { await api.comment(sel.id, draft.trim()); setDraft(""); list.reload(); } catch (e) { setErr(explain(e)); }
    lock.current = false; setPending("");
  };
  const shown: ProofCard | null = card && (tamper ? { ...card, decision: card.decision === "approve" || card.decision === "approved" ? "request_changes" : "approve" } : card);
  const verify = async () => { if (!shown) return; try { setVres(await api.verify(shown)); } catch (e) { setVres({ valid: false, reason: explain(e) }); } };
  const download = () => saveBlob(new Blob([JSON.stringify(shown, null, 2)], { type: "application/json" }), `proof-card-${selId.slice(0, 8)}.json`);
  const downloadC2pa = async () => {
    if (!sel || c2paBusy) return;
    setC2paBusy(true); setC2paMsg(null);
    try { const b = await api.c2pa(sel.id); saveBlob(b, `proof-card-${sel.id.slice(0, 8)}.png`); setC2paMsg({ ok: true, msg: `Downloaded proof-card-${sel.id.slice(0, 8)}.png (${Math.round(b.size / 1024)} KB). Verify it below.` }); }
    catch (e) { setC2paMsg({ ok: false, msg: explain(e) }); }
    setC2paBusy(false);
  };
  const verifyImage = async (f: File | undefined) => {
    if (!f) return;
    setImg(null); setImgErr(""); setImgName(f.name);
    if (f.size > 8_000_000) { setImgErr("That file is larger than 8 MB. Choose a Proof Card PNG."); return; }
    setImgBusy(true);
    try { setImg(await api.verifyImage(f)); } catch (e) { setImgErr(explain(e)); }
    setImgBusy(false);
  };

  return (
    <div>
      {head}
      {err && <div className="mb-3"><Alert>{err}</Alert></div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card title={`Reviews (${items.length})`} action={<Btn onClick={list.reload} disabled={list.loading} aria-label="Refresh reviews">Refresh</Btn>}>
          <ul className="space-y-2">{items.map(i => (
            <li key={i.id}><button onClick={() => { setSelId(i.id); setErr(""); }} aria-current={i.id === selId} className={`w-full rounded-md border p-2.5 text-left ${i.id === selId ? "border-navy bg-navy/5" : "border-line hover:bg-black/[.02]"}`}>
              <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">{i.title}</span><Badge tone={sevTone(i.severity)}>Severity: {i.severity}</Badge></div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1"><Badge tone={i.status === "approved" ? "teal" : i.status === "changes_requested" ? "terra" : "neutral"}>{statusLabel(i.status)}</Badge>{i.routing.map(x => <Badge key={x} tone="navy">{x}</Badge>)}</div>
            </button></li>))}</ul>
          {items.length === 0 && <Empty>No reviews yet. Go to Reader Lens, paste some text and choose &ldquo;Send for human review&rdquo;.</Empty>}
        </Card>

        {sel && (
          <Card title={sel.title} action={decided ? <Btn onClick={() => openProof(sel.id)}><ShieldCheck size={14} aria-hidden /> Proof Card</Btn> : undefined}>
            <Tabs tabs={["Review", "Audit trail"] as const} value={tab} onChange={setTab} />
            {tab === "Review" ? (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap break-words rounded border border-line bg-ivory p-3 text-[13px]">{sel.text}</div>
                <div><div className="mb-1 text-[12px] text-muted">Routing</div><div className="flex flex-wrap gap-1">{sel.routing.length ? sel.routing.map(x => <Badge key={x} tone="navy">{x}</Badge>) : <span className="text-[13px] text-muted">None</span>}</div></div>
                <div><div className="mb-1 text-[12px] text-muted">Rule findings ({sel.findings.length})</div>
                  {sel.findings.length === 0 && <p className="text-[13px] text-muted">No rule findings.</p>}
                  <ul className="space-y-1">{sel.findings.map(f => <li key={f.id} className="text-[13px]">&ldquo;{f.match}&rdquo; <span className="font-mono text-[11px] text-muted">{f.rule}</span> <Badge tone={sevTone(f.severity)}>Severity: {f.severity}</Badge> <span className="text-muted">{f.status}</span></li>)}</ul></div>

                {sel.deep ? (
                  <div className="space-y-3 rounded-md border border-line p-3">
                    <h4 className="text-[13px] font-semibold">Deep analysis stored with this review</h4>
                    <IngestionPanel ing={sel.deep.ingestion} />
                    <div><div className="mb-1 text-[12px] text-muted">Claims</div><ClaimsTable claims={sel.deep.claims} /><div className="mt-1"><LlmRunNote llm={sel.deep.llm} /></div>
                      <p className="mt-1 text-[12px] text-muted">Model verification at submission: {sel.deep.llm.model ? `on (${sel.deep.llm.model})` : "off: retrieval + rules only"}.</p></div>
                    <div><div className="mb-1 text-[12px] text-muted">Similar past decisions</div><PrecedentsList precedents={sel.deep.precedents} conflicts={sel.deep.conflicts} /></div>
                  </div>
                ) : <p className="text-[12px] text-muted">No deep analysis was stored for this review (it was created before deep analysis existed).</p>}

                <div>
                  {decided ? <Alert tone={sel.decision!.decision === "approve" ? "teal" : "navy"}><b>{decisionLabel(sel.decision!.decision)}</b> by {who(sel.decision!.reviewer)} · {when(sel.decision!.at)}{sel.decision!.note ? ` · Note: ${sel.decision!.note}` : ""}</Alert> : (
                    <>
                      <label className="block text-[12px] text-muted">Decision note (optional)<input value={note} maxLength={500} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]" /></label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Btn variant="primary" disabled={!canDecide || !!pending} onClick={() => decide("approve")}>{pending === "approve" ? "Approving…" : "Approve"}</Btn>
                        <Btn disabled={!canDecide || !!pending} onClick={() => decide("request_changes")}>{pending === "request_changes" ? "Sending…" : "Request changes"}</Btn>
                      </div>
                    </>
                  )}
                  {why && !decided && <p className="mt-1 text-[12px] text-muted">{why}</p>}
                </div>
                <div><div className="mb-1 flex items-center gap-1 text-[12px] text-muted"><MessageSquare size={12} aria-hidden /> Comments</div>
                  <ul className="mb-2 space-y-2">{sel.comments.map((c, k) => <li key={k} className="rounded border border-line p-2 text-[13px]"><span className="font-medium">{who(c.author ?? c.who ?? "Reviewer")}</span> <span className="text-[12px] text-muted">{when(c.created_at ?? c.at)}</span><div className="break-words">{c.text}</div></li>)}
                    {sel.comments.length === 0 && <li className="text-[12px] text-muted">No comments yet.</li>}</ul>
                  <div className="flex gap-2"><input aria-label="Add comment" value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} placeholder="Add a comment" className="min-w-0 flex-1 rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]" /><Btn onClick={addComment} disabled={!draft.trim() || pending === "comment"}>Post comment</Btn></div></div>
              </div>
            ) : (
              <div>
                {auditErr && <ErrorNote message={auditErr} onRetry={loadAudit} />}
                <ol className="space-y-3 border-l border-line pl-4">{audit.map((e, k) => (
                  <li key={k} className="relative text-[13px]"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-navy" aria-hidden />
                    <div className="font-medium">{str(e.action).replace(/_/g, " ")} <span className="font-normal text-muted">{detailText(e.detail)}</span></div>
                    <div className="text-[12px] text-muted">{str(e.actor_name)} ({str(e.actor_role)}) · {when(e.at)}</div></li>))}
                  {audit.length === 0 && !auditErr && <li className="text-[12px] text-muted">No events.</li>}</ol>
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal open={!!shown} onClose={() => setCard(null)} title="Proof Card">
        {shown && (
          <div className="space-y-3 text-[13px]">
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              <dt className="text-muted">Content hash</dt><dd className="break-all font-mono text-[11px]">{shown.content_hash}</dd>
              <dt className="text-muted">Decision</dt><dd>{decisionLabel(shown.decision)}{tamper && <span className="ml-2 text-terra">(tampered)</span>}</dd>
              <dt className="text-muted">Reviewer</dt><dd>{who(shown.reviewer)}</dd>
              <dt className="text-muted">Routing</dt><dd>{Array.isArray(shown.routing) ? (shown.routing as string[]).join(", ") : str(shown.routing)}</dd>
              <dt className="text-muted">Timestamp</dt><dd>{shown.timestamp}</dd>
              <dt className="text-muted">Algorithm</dt><dd>{shown.algorithm}</dd>
              <dt className="text-muted">Signature</dt><dd className="break-all font-mono text-[11px]">{shown.signature}</dd>
            </dl>
            <label className="flex items-center gap-2"><input type="checkbox" checked={tamper} onChange={e => { setTamper(e.target.checked); setVres(null); }} /> Tamper with card (changes the decision field, to show verification failing)</label>
            <div className="flex flex-wrap gap-2"><Btn variant="primary" onClick={verify}>Verify signature</Btn><Btn onClick={download}><Download size={14} aria-hidden /> Download JSON</Btn>
              <Btn onClick={downloadC2pa} disabled={c2paBusy}><FileImage size={14} aria-hidden /> {c2paBusy ? "Preparing…" : "Download C2PA-signed PNG"}</Btn></div>
            {vres && <p role="status" className={`rounded-md border px-3 py-2 ${vres.valid ? "border-teal/40 bg-teal/10 text-teal" : "border-terra/40 bg-terra/10 text-terra"}`}>{vres.valid ? "Valid signature" : "INVALID"}: {vres.reason}</p>}
            {c2paMsg && <Alert tone={c2paMsg.ok ? "teal" : "terra"}>{c2paMsg.msg}</Alert>}

            <div className="rounded-md border border-line p-3">
              <h3 className="text-[13px] font-semibold">Verify a Proof Card image</h3>
              <p className="mt-1 text-[12px] text-muted">Upload a C2PA-signed Proof Card PNG. Threadline checks that the signature is intact and that the image and its embedded decision have not been changed.</p>
              <label className="mt-2 block text-[12px]"><span className="sr-only">Proof Card PNG file</span>
                <input type="file" accept="image/png" aria-label="Proof Card PNG file" onChange={e => { verifyImage(e.target.files?.[0]); e.target.value = ""; }} className="w-full text-[12px]" /></label>
              {imgBusy && <p role="status" className="mt-2 text-[12px] text-muted">Verifying {imgName}…</p>}
              {imgErr && <div className="mt-2"><Alert>{imgErr}</Alert></div>}
              {img && (
                <div role="status" className={`mt-2 rounded-md border px-3 py-2 ${img.valid ? "border-teal/40 bg-teal/10" : "border-terra/40 bg-terra/10"}`}>
                  <p className={`font-medium ${img.valid ? "text-teal" : "text-terra"}`}>{img.valid ? "Image verified: signature and content binding are intact" : "NOT VALID"} <span className="font-normal text-muted">({imgName})</span></p>
                  <p className="mt-1 text-[12px]">{img.reason}</p>
                  <p className="mt-1 text-[12px]"><Badge tone={img.signer_trusted ? "teal" : "navy"}>Signer trusted: {img.signer_trusted ? "true" : "false"}</Badge>{" "}
                    {!img.signer_trusted && "This image is signed with a self-signed demo certificate, not one issued by a public certificate authority. The integrity check still applies; real deployments would use a trusted certificate."}</p>
                  {img.threadline_assertion && <p className="mt-1 break-words text-[12px] text-muted">Embedded record: {JSON.stringify(img.threadline_assertion).slice(0, 300)}</p>}
                  {!!img.failures?.length && <ul className="mt-1 list-inside list-disc text-[12px]">{img.failures.filter(f => f.code !== "signingCredential.untrusted").map((f, i) => <li key={i}>{f.code}{f.explanation ? `: ${f.explanation}` : ""}</li>)}</ul>}
                </div>
              )}
            </div>
            {cardErr && <Alert>{cardErr}</Alert>}
          </div>
        )}
      </Modal>
    </div>
  );
}
