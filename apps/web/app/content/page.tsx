"use client";
import { useMemo, useState } from "react";
import ReactFlow, { Background, Edge, Node } from "reactflow";
import "reactflow/dist/style.css";
import { LayoutGrid, List, Search, GitBranch } from "lucide-react";
import { Badge, Btn, Card, DemoTag, Modal, PageHeader, SevBadge } from "@/components/ui";
import { CONTENT, ContentItem, Sev } from "@/lib/data";

const SEV_ORDER: Record<Sev, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };
const STATUS_TONE = { Draft: "neutral", "In review": "navy", Approved: "teal", "Needs fix": "terra" } as const;
// Demo rule/fact changes and the content they touch.
const CHANGES: Record<string, { label: string; hits: string[] }> = {
  "C-101": { label: "R-012 No absolute claims ('100%', 'guaranteed')", hits: ["C-101", "C-108", "C-105"] },
  "C-104": { label: "F-07 HIPAA compliance is customer-controlled", hits: ["C-104", "C-102"] },
};
const DEFAULT_CHANGE = { label: "R-004 Claims need evidence on file", hits: [] as string[] };

function Thumb({ item }: { item: ContentItem }) {
  return (
    <div className="flex h-24 flex-col justify-between rounded border border-line bg-ivory p-2" aria-hidden>
      <div className="h-2 w-1/3 rounded bg-navy/30" />
      <div className="space-y-1"><div className="h-1.5 w-full rounded bg-ink/15" /><div className="h-1.5 w-4/5 rounded bg-ink/15" /><div className="h-1.5 w-3/5 rounded bg-ink/10" /></div>
      <div className="h-3 w-12 rounded bg-terra/40" />
    </div>
  );
}

function BlastGraph({ item }: { item: ContentItem }) {
  const change = CHANGES[item.id] ?? { ...DEFAULT_CHANGE, hits: [item.id] };
  const affected = change.hits.map(id => CONTENT.find(c => c.id === id)).filter((c): c is ContentItem => !!c);
  const nodes: Node[] = [
    { id: "root", position: { x: 0, y: Math.max(0, (affected.length - 1) * 35) }, data: { label: change.label }, style: { width: 170, fontSize: 11, border: "1px solid #C2502E", background: "#fff" } },
    ...affected.map((c, i) => ({ id: c.id, position: { x: 260, y: i * 70 }, data: { label: `${c.id} ${c.title}` }, style: { width: 170, fontSize: 11, border: c.id === item.id ? "2px solid #1F2A44" : "1px solid #ddd", background: "#fff" } })),
  ];
  const edges: Edge[] = affected.map(c => ({ id: `e-${c.id}`, source: "root", target: c.id }));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between"><span className="text-[12px] text-muted">If this changes, affected items:</span><Badge tone="terra"><GitBranch size={11} /> {affected.length} affected</Badge></div>
      <div className="h-56 rounded border border-line bg-ivory" aria-label="Blast radius graph">
        <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} nodesConnectable={false} proOptions={{ hideAttribution: true }}><Background /></ReactFlow>
      </div>
    </div>
  );
}

export default function ContentPage() {
  const [view, setView] = useState<"table" | "grid">("table");
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("All");
  const [channel, setChannel] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("risk");
  const [sel, setSel] = useState<ContentItem | null>(null);
  const [proposed, setProposed] = useState<Record<string, number>>({});

  const channels = useMemo(() => Array.from(new Set(CONTENT.map(c => c.channel))), []);
  const rows = useMemo(() => {
    const r = CONTENT.filter(c => (risk === "All" || c.risk === risk) && (channel === "All" || c.channel === channel) && (status === "All" || c.status === status)
      && (c.title + c.excerpt + c.id).toLowerCase().includes(q.toLowerCase()));
    return [...r].sort((a, b) => sort === "risk" ? SEV_ORDER[b.risk] - SEV_ORDER[a.risk] : sort === "title" ? a.title.localeCompare(b.title) : a.id.localeCompare(b.id));
  }, [q, risk, channel, status, sort]);

  const sc = "rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]";
  const affectedCount = sel ? (CHANGES[sel.id]?.hits.length ?? 1) : 0;

  return (
    <div>
      <PageHeader title="Content" sub="Every asset with its risk, status and claims. Select one to see its blast radius." actions={<DemoTag />} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative"><span className="sr-only">Search</span><Search size={14} className="absolute left-2 top-2 text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search content" className={`${sc} pl-7`} /></label>
        <select aria-label="Risk" className={sc} value={risk} onChange={e => setRisk(e.target.value)}>{["All", "Low", "Medium", "High", "Critical"].map(o => <option key={o}>{o}</option>)}</select>
        <select aria-label="Channel" className={sc} value={channel} onChange={e => setChannel(e.target.value)}>{["All", ...channels].map(o => <option key={o}>{o}</option>)}</select>
        <select aria-label="Status" className={sc} value={status} onChange={e => setStatus(e.target.value)}>{["All", "Draft", "In review", "Approved", "Needs fix"].map(o => <option key={o}>{o}</option>)}</select>
        <select aria-label="Sort" className={sc} value={sort} onChange={e => setSort(e.target.value)}><option value="risk">Sort: risk</option><option value="title">Sort: title</option><option value="id">Sort: ID</option></select>
        <div className="ml-auto flex gap-1">
          <Btn aria-pressed={view === "table"} onClick={() => setView("table")}><List size={14} /> Table</Btn>
          <Btn aria-pressed={view === "grid"} onClick={() => setView("grid")}><LayoutGrid size={14} /> Grid</Btn>
        </div>
      </div>

      {rows.length === 0 && <p className="text-muted">No content matches these filters.</p>}
      {view === "table" ? (
        <Card className="overflow-hidden"><div className="-m-4 overflow-x-auto"><table className="w-full text-left text-[13px]">
          <thead className="border-b border-line text-[12px] text-muted"><tr>{["", "ID", "Title", "Channel", "Owner", "Risk", "Status", "Updated"].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map(c => (
            <tr key={c.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-black/[.02]" onClick={() => setSel(c)}>
              <td className="w-16 px-3 py-2"><div className="h-8 w-12 rounded border border-line bg-ivory" aria-hidden /></td>
              <td className="px-3 py-2 text-muted">{c.id}</td>
              <td className="px-3 py-2"><button className="font-medium hover:underline" onClick={() => setSel(c)}>{c.title}</button></td>
              <td className="px-3 py-2">{c.channel}</td><td className="px-3 py-2">{c.owner}</td>
              <td className="px-3 py-2"><SevBadge s={c.risk} /></td>
              <td className="px-3 py-2"><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
              <td className="px-3 py-2 text-muted">{c.updated}</td>
            </tr>))}</tbody></table></div></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{rows.map(c => (
          <button key={c.id} onClick={() => setSel(c)} className="rounded-lg border border-line bg-paper p-3 text-left hover:border-ink/30">
            <Thumb item={c} />
            <div className="mt-2 text-[13px] font-medium">{c.title}</div>
            <div className="mt-0.5 text-[12px] text-muted">{c.id} · {c.channel}</div>
            <div className="mt-2 flex gap-1"><SevBadge s={c.risk} /><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></div>
          </button>))}</div>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.id} · ${sel.title}` : ""}>
        {sel && (
          <div className="space-y-4">
            <div className="flex gap-2"><SevBadge s={sel.risk} /><Badge tone={STATUS_TONE[sel.status]}>{sel.status}</Badge><Badge>{sel.channel}</Badge></div>
            <div><div className="mb-1 text-[12px] text-muted">Excerpt</div><p className="rounded border border-line bg-ivory p-3">{sel.excerpt}</p></div>
            <div><div className="mb-1 text-[12px] text-muted">Claims</div><div className="flex flex-wrap gap-1">{sel.claims.map(cl => <Badge key={cl}>{cl}</Badge>)}</div></div>
            <BlastGraph item={sel} />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] text-muted">Creates proposals only. Nothing is changed or approved until a person reviews it.</p>
              <Btn variant="primary" onClick={() => setProposed(p => ({ ...p, [sel.id]: affectedCount }))}>Create fix tasks</Btn>
            </div>
            {proposed[sel.id] !== undefined && <Badge tone="teal">✓ {proposed[sel.id]} fix proposals created, awaiting human review</Badge>}
          </div>
        )}
      </Modal>
    </div>
  );
}
