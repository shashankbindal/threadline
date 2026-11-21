"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, PageHeader, Badge, Tabs, Modal, Skeleton, ErrorNote, NotConnected } from "@/components/ui";
import { api, type Rule } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const TABS = ["Guidelines", "Facts", "Terms", "Assets"] as const;
type Tab = (typeof TABS)[number];
const KIND: Record<Tab, string> = { Guidelines: "Guideline", Facts: "Fact", Terms: "Term", Assets: "Asset" };
const STATUSES = ["All", "Active", "Verified", "Approved"];

export default function BrandGraphPage() {
  const [tab, setTab] = useState<Tab>("Guidelines");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [sel, setSel] = useState<Rule | null>(null);
  const { data, error, loading, reload, connected } = useApi(api.rules);

  const rows = useMemo(
    () => (data ?? []).filter(r => r.kind === KIND[tab] && (status === "All" || r.status === status) &&
      (r.id + r.title + r.body).toLowerCase().includes(q.toLowerCase())),
    [data, tab, q, status],
  );

  if (!connected) return <div><PageHeader title="Brand Graph" /><NotConnected /></div>;
  return (
    <div>
      <PageHeader title="Brand Graph" sub="The guidelines, facts, terms and assets every review is checked against. Pick a tab, search, and click a row to see its linked content and version history." />
      {error && <div className="mb-3"><ErrorNote message={error} onRetry={reload} /></div>}
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted" aria-hidden />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by ID, title or text" aria-label="Search brand graph"
            className="w-64 rounded-md border border-line bg-paper py-1.5 pl-8 pr-3 text-[13px] outline-none focus:border-navy" />
        </label>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status"
          className="rounded-md border border-line bg-paper px-2 py-1.5 text-[13px]">
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Card>
        {loading ? <Skeleton className="h-40" /> : (
          <table className="w-full text-left text-[13px]">
            <thead className="text-[12px] text-muted">
              <tr><th className="pb-2 font-medium">ID</th><th className="pb-2 font-medium">Title</th><th className="pb-2 font-medium">Detail</th><th className="pb-2 font-medium">Status</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="cursor-pointer border-t border-line hover:bg-black/[.03]" tabIndex={0}
                  onClick={() => setSel(r)} onKeyDown={e => e.key === "Enter" && setSel(r)}>
                  <td className="py-2 font-mono text-[12px]">{r.id}</td>
                  <td className="py-2 font-medium">{r.title}</td>
                  <td className="py-2 text-muted">{r.body}</td>
                  <td className="py-2"><Badge tone="teal">✓ {r.status}</Badge></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted">No matching entries.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.id} · ${sel.title}` : ""}>
        {sel && (
          <div className="space-y-4 text-[13px]">
            <p>{sel.body}</p>
            <div className="flex gap-2"><Badge>{sel.kind}</Badge><Badge tone="teal">✓ {sel.status}</Badge></div>
            <div>
              <h4 className="mb-1 text-[12px] font-semibold text-muted">Linked content</h4>
              <ul className="list-inside list-disc">{(sel.linked ?? []).map(l => <li key={l}>{l}</li>)}</ul>
              {(sel.linked ?? []).length === 0 && <p className="text-muted">None recorded.</p>}
            </div>
            <div>
              <h4 className="mb-1 text-[12px] font-semibold text-muted">Version history</h4>
              <ul className="divide-y divide-line rounded-md border border-line">
                {(sel.history ?? []).map(v => (
                  <li key={v.v} className="flex justify-between px-3 py-2"><span><b>{v.v}</b> · {v.note}</span><span className="text-muted">{v.date} · {v.by}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
