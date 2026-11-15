"use client";
import { useState } from "react";
import { useAuth } from "@/components/Auth";
import { Check, Download, MessageSquare, ShieldCheck, X } from "lucide-react";
import { Badge, Btn, Card, DemoTag, Modal, PageHeader, SevBadge, Tabs } from "@/components/ui";
import { CONTENT, ContentItem, Sev } from "@/lib/data";

type Col = "Needs review" | "Changes requested" | "Approved";
type Role = "Brand" | "Legal" | "Compliance";
const COLS: Col[] = ["Needs review", "Changes requested", "Approved"];
const COL_OF: Record<ContentItem["status"], Col> = { Draft: "Needs review", "In review": "Needs review", "Needs fix": "Changes requested", Approved: "Approved" };

// Demo routing result (the real matrix lives in the backend engines/routing.py).
function route(c: ContentItem): { roles: Role[]; why: string } {
  if (c.risk === "Critical") return { roles: ["Brand", "Legal", "Compliance"], why: "Critical risk with regulated claim (HIPAA) requires all three roles" };
  if (c.risk === "High") return { roles: ["Brand", "Legal"], why: "High risk absolute/guarantee claim requires Brand and Legal" };
  if (c.risk === "Medium") return { roles: ["Brand"], why: "Medium risk requires Brand review" };
  return { roles: ["Brand"], why: "Low risk: Brand sign-off only" };
}
const FINDINGS: Record<Sev, { t: string; ok: boolean }[]> = {
  Low: [{ t: "Claims supported by evidence on file", ok: true }, { t: "Tone within brand voice", ok: true }],
  Medium: [{ t: "Claim partially supported; source needed", ok: false }, { t: "Tone within brand voice", ok: true }],
  High: [{ t: "Absolute claim contradicts rule R-012", ok: false }, { t: "No evidence for guarantee", ok: false }, { t: "Tone within brand voice", ok: true }],
  Critical: [{ t: "Regulated compliance claim contradicts fact F-07", ok: false }, { t: "Customer quote lacks consent record", ok: false }, { t: "Absolute claim contradicts rule R-012", ok: false }],
};
type Ev = { who: string; what: string; at: string };
type Comment = { who: string; text: string; at: string };

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
}

export default function ApprovalsPage() {
  const [items, setItems] = useState(() => CONTENT.map(c => ({ ...c, col: COL_OF[c.status] as Col })));
  const [selId, setSelId] = useState(items[0].id);
  const { user } = useAuth();
  const [human, setHuman] = useState(!!user?.canDecide);
  const [role, setRole] = useState<Role>(user && user.role !== "Viewer" ? (user.role as Role) : "Brand");
  const [tab, setTab] = useState<"Review" | "Audit trail">("Review");
  const [comments, setComments] = useState<Record<string, Comment[]>>({ "C-101": [{ who: "Priya N.", text: "Rewriting the guarantee line now.", at: "1h ago" }] });
  const [audit, setAudit] = useState<Record<string, Ev[]>>({});
  const [draft, setDraft] = useState("");
  const [card, setCard] = useState<{ hash: string; ts: string } | null>(null);

  const sel = items.find(i => i.id === selId)!;
  const r = route(sel);
  const trail: Ev[] = [
    ...(audit[sel.id] ?? []).slice().reverse(),
    { who: "Threadline AI", what: "Recommended routing: " + r.roles.join(" + "), at: "demo" },
    { who: "Threadline AI", what: `Ran evidence check (${FINDINGS[sel.risk].length} findings)`, at: "demo" },
    { who: sel.owner, what: "Submitted for review", at: sel.updated },
  ];
  const decide = (col: Col, label: string) => {
    if (!human) return;
    setItems(l => l.map(i => i.id === sel.id ? { ...i, col } : i));
    setAudit(a => ({ ...a, [sel.id]: [...(a[sel.id] ?? []), { who: `${role} reviewer (human)`, what: label, at: "just now" }] }));
  };
  const addComment = () => {
    if (!draft.trim()) return;
    setComments(c => ({ ...c, [sel.id]: [...(c[sel.id] ?? []), { who: human ? `${role} reviewer` : "Viewer", text: draft.trim(), at: "just now" }] }));
    setDraft("");
  };
  const openCard = async () => {
    const hash = await sha256(JSON.stringify({ id: sel.id, excerpt: sel.excerpt, claims: sel.claims }));
    setCard({ hash, ts: new Date().toISOString() });
  };
  const reviewer = (audit[sel.id] ?? []).slice(-1)[0]?.who ?? "Not yet reviewed";
  const cardJson = card && {
    content_id: sel.id, content_sha256: card.hash,
    findings: FINDINGS[sel.risk].map(f => ({ text: f.t, passed: f.ok })),
    routing: r, decision: sel.col, reviewer, timestamp: card.ts,
    signature: { alg: "Ed25519", value: "DEMO-SIGNATURE-NOT-VALID", note: "demo signature" },
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(cardJson, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `proof-card-${sel.id}.json`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Approvals" sub="AI recommends routing and flags findings. Only a human reviewer can approve or request changes." actions={<DemoTag />} />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2">
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={human} disabled={!user?.canDecide} onChange={e => setHuman(e.target.checked)} /> Act as human reviewer</label>
        <select aria-label="Reviewer role" disabled={!human} value={role} onChange={e => setRole(e.target.value as Role)} className="rounded-md border border-line bg-paper px-2 py-1 text-[13px] disabled:opacity-50">
          {(["Brand", "Legal", "Compliance"] as Role[]).map(x => <option key={x}>{x}</option>)}</select>
        <span className="text-[12px] text-muted">{human ? "Decision buttons enabled" : "Viewing as observer: decisions disabled"}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          {COLS.map(col => (
            <Card key={col} title={`${col} (${items.filter(i => i.col === col).length})`}>
              <ul className="space-y-2">{items.filter(i => i.col === col).map(i => { const rt = route(i); return (
                <li key={i.id}><button onClick={() => setSelId(i.id)} aria-current={i.id === selId} className={`w-full rounded-md border p-2.5 text-left ${i.id === selId ? "border-navy bg-navy/5" : "border-line hover:bg-black/[.02]"}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">{i.id} {i.title}</span><SevBadge s={i.risk} /></div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">{rt.roles.map(x => <Badge key={x}>{x}</Badge>)}</div>
                  <div className="mt-1 text-[12px] text-muted">{rt.why}</div>
                </button></li>); })}
                {items.every(i => i.col !== col) && <li className="text-[12px] text-muted">Nothing here.</li>}</ul>
            </Card>))}
        </div>

        <div>
          <Card title={`${sel.id} · ${sel.title}`} action={<Btn onClick={openCard}><ShieldCheck size={14} /> Proof Card</Btn>}>
            <Tabs tabs={["Review", "Audit trail"] as const} value={tab} onChange={setTab} />
            {tab === "Review" ? (
              <div className="space-y-4">
                <div className="rounded border border-line bg-ivory p-3 text-[13px]">{sel.excerpt}</div>
                <div><div className="mb-1 text-[12px] text-muted">Routing result</div>
                  <div className="flex flex-wrap items-center gap-1">{r.roles.map(x => <Badge key={x} tone="navy">{x}</Badge>)}</div>
                  <p className="mt-1 text-[12px] text-muted">{r.why}</p></div>
                <div><div className="mb-1 text-[12px] text-muted">Evidence findings</div>
                  <ul className="space-y-1">{FINDINGS[sel.risk].map(f => (
                    <li key={f.t} className="flex items-start gap-2 text-[13px]">
                      {f.ok ? <Check size={14} className="mt-0.5 text-teal" aria-label="Pass" /> : <X size={14} className="mt-0.5 text-terra" aria-label="Fail" />}
                      <span>{f.t} <span className="text-muted">({f.ok ? "pass" : "needs attention"})</span></span></li>))}</ul></div>
                <div className="flex gap-2">
                  <Btn variant="primary" disabled={!human || sel.col === "Approved"} onClick={() => decide("Approved", "Approved")}><Check size={14} /> Approve</Btn>
                  <Btn disabled={!human || sel.col === "Changes requested"} onClick={() => decide("Changes requested", "Requested changes")}>Request changes</Btn>
                </div>
                {!human && <p className="text-[12px] text-muted">Enable human reviewer mode to decide. Threadline never approves automatically.</p>}
                <div><div className="mb-1 flex items-center gap-1 text-[12px] text-muted"><MessageSquare size={12} /> Comments</div>
                  <ul className="mb-2 space-y-2">{(comments[sel.id] ?? []).map((c, k) => <li key={k} className="rounded border border-line p-2 text-[13px]"><span className="font-medium">{c.who}</span> <span className="text-[12px] text-muted">{c.at}</span><div>{c.text}</div></li>)}
                    {!(comments[sel.id]?.length) && <li className="text-[12px] text-muted">No comments yet.</li>}</ul>
                  <div className="flex gap-2"><input aria-label="Add comment" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} placeholder="Add a comment" className="flex-1 rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]" />
                    <Btn onClick={addComment}>Post</Btn></div></div>
              </div>
            ) : (
              <ol className="space-y-3 border-l border-line pl-4">{trail.map((e, k) => (
                <li key={k} className="relative text-[13px]"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-navy" aria-hidden />
                  <div>{e.what}</div><div className="text-[12px] text-muted">{e.who} · {e.at}</div></li>))}</ol>
            )}
          </Card>
        </div>
      </div>

      <Modal open={!!card} onClose={() => setCard(null)} title="Proof Card">
        {card && cardJson && (
          <div className="space-y-3 text-[13px]">
            <Badge tone="navy">demo signature, not cryptographically valid</Badge>
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              <dt className="text-muted">Content</dt><dd>{sel.id} {sel.title}</dd>
              <dt className="text-muted">SHA-256</dt><dd className="break-all font-mono text-[11px]">{card.hash}</dd>
              <dt className="text-muted">Findings</dt><dd>{FINDINGS[sel.risk].filter(f => !f.ok).length} need attention, {FINDINGS[sel.risk].filter(f => f.ok).length} passed</dd>
              <dt className="text-muted">Decision</dt><dd>{sel.col}</dd>
              <dt className="text-muted">Reviewer</dt><dd>{reviewer}</dd>
              <dt className="text-muted">Timestamp</dt><dd>{card.ts}</dd>
              <dt className="text-muted">Signature</dt><dd className="font-mono text-[11px]">Ed25519 · DEMO-SIGNATURE-NOT-VALID</dd>
            </dl>
            <Btn variant="primary" onClick={download}><Download size={14} /> Download JSON</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
