"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, PageHeader, Badge, Tabs, Modal } from "@/components/ui";
import { RULES } from "@/lib/data";

const TABS = ["Guidelines", "Facts", "Terms", "Assets"] as const;
type Tab = (typeof TABS)[number];
const KIND: Record<Tab, string> = { Guidelines: "Guideline", Facts: "Fact", Terms: "Term", Assets: "Asset" };
const STATUSES = ["All", "Active", "Verified", "Approved"];

const LINKED: Record<string, string[]> = {
  "R-012": ["Launch blog: Unbreakable detection (flagged)", "Homepage hero v3", "Sales deck Q4"],
  "R-019": ["Security page draft", "Press release: SOC 2 renewal"],
  "F-07": ["Onboarding email series", "Pricing FAQ"],
  "F-11": ["About page", "Investor one-pager"],
  "T-03": ["Product docs index", "Social campaign Nov"],
  "T-05": ["Threat report 2026", "Newsletter #41"],
  "A-02": ["Launch blog", "Sales deck Q4", "Webinar slides"],
  "A-05": ["Partner kit", "Homepage hero v3"],
};

export default function BrandGraphPage() {
  const [tab, setTab] = useState<Tab>("Guidelines");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [sel, setSel] = useState<(typeof RULES)[number] | null>(null);

  const rows = useMemo(
    () => RULES.filter(r => r.kind === KIND[tab] && (status === "All" || r.status === status) &&
      (r.id + r.title + r.body).toLowerCase().includes(q.toLowerCase())),
    [tab, q, status],
  );

  return (
    <div>
      <PageHeader title="Brand Graph" sub="Guidelines, facts, terms and assets that every review is checked against. Changes are proposed and approved by people." />
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
      </Card>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.id} · ${sel.title}` : ""}>
        {sel && (
          <div className="space-y-4 text-[13px]">
            <p>{sel.body}</p>
            <div className="flex gap-2"><Badge>{sel.kind}</Badge><Badge tone="teal">✓ {sel.status}</Badge></div>
            <div>
              <h4 className="mb-1 text-[12px] font-semibold text-muted">Linked content</h4>
              <ul className="list-inside list-disc">{(LINKED[sel.id] ?? []).map(l => <li key={l}>{l}</li>)}</ul>
            </div>
            <div>
              <h4 className="mb-1 text-[12px] font-semibold text-muted">Version history</h4>
              <ul className="divide-y divide-line rounded-md border border-line">
                {[["v3", "Oct 28, 2026", "Wording clarified", "M. Okafor"], ["v2", "Aug 04, 2026", "Added examples", "L. Brandt"], ["v1", "Mar 12, 2026", "Initial entry", "M. Okafor"]].map(v => (
                  <li key={v[0]} className="flex justify-between px-3 py-2"><span><b>{v[0]}</b> · {v[2]}</span><span className="text-muted">{v[1]} · {v[3]}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
