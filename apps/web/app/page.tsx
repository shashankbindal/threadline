"use client";
import { Card, PageHeader, Stat, DemoTag, SevBadge, Badge } from "@/components/ui";
import { ACTIVITY, CONTENT, RISK_MIX, TREND } from "@/lib/data";
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const RISK_COLORS: Record<string, string> = { Low: "#2A7F7A", Medium: "#1F3A5F", High: "#C8643C", Critical: "#8A2E12" };
const ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

export default function Overview() {
  const top = [...CONTENT].sort((a, b) => ORDER[a.risk] - ORDER[b.risk]).slice(0, 5);
  const total = RISK_MIX.reduce((s, r) => s + r.v, 0);
  return (
    <div>
      <PageHeader title="Overview" sub="Brand governance at a glance. AI recommends; people approve." actions={<DemoTag />} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="relative"><Stat label="Items reviewed (Nov)" value="97" delta="+10% vs Oct" tone="teal" /><div className="absolute right-3 top-3"><DemoTag /></div></div>
        <div className="relative"><Stat label="Flagged for human review" value="16" delta="Needs attention" tone="terra" /><div className="absolute right-3 top-3"><DemoTag /></div></div>
        <div className="relative"><Stat label="Approved by people" value="76" delta="78% of reviewed" tone="teal" /><div className="absolute right-3 top-3"><DemoTag /></div></div>
        <div className="relative"><Stat label="Open fix tasks" value="9" delta="3 critical or high" tone="terra" /><div className="absolute right-3 top-3"><DemoTag /></div></div>
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Risk mix" action={<DemoTag />}>
          <div className="h-52" role="img" aria-label={"Risk mix: " + RISK_MIX.map(r => `${r.name} ${r.v}%`).join(", ")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={RISK_MIX} dataKey="v" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
                  {RISK_MIX.map(r => <Cell key={r.name} fill={RISK_COLORS[r.name]} />)}
                </Pie>
                <Tooltip /><Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-[12px] text-muted">
            {RISK_MIX.map(r => <li key={r.name}>{r.name}: {r.v} ({Math.round((r.v / total) * 100)}%)</li>)}
          </ul>
        </Card>
        <Card title="Review trend" action={<DemoTag />} className="lg:col-span-2">
          <div className="h-60" role="img" aria-label="Monthly reviewed, approved and flagged items, June to November">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND}>
                <CartesianGrid stroke="#E7E3DA" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="reviewed" name="Reviewed" stroke="#1F3A5F" fill="#1F3A5F" fillOpacity={0.1} />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#2A7F7A" fill="#2A7F7A" fillOpacity={0.1} strokeDasharray="4 3" />
                <Area type="monotone" dataKey="flagged" name="Flagged" stroke="#C8643C" fill="#C8643C" fillOpacity={0.15} strokeDasharray="1 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top risky content" action={<DemoTag />}>
          <ul className="divide-y divide-line">
            {top.map(c => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0"><div className="truncate font-medium">{c.title}</div><div className="text-[12px] text-muted">{c.id} · {c.channel} · {c.owner}</div></div>
                <div className="flex shrink-0 items-center gap-2"><Badge>{c.status}</Badge><SevBadge s={c.risk} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent activity" action={<DemoTag />}>
          <ul className="divide-y divide-line">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                <span><b className="font-medium">{a.who}</b> <span className="text-muted">{a.what}</span> {a.target}</span>
                <span className="shrink-0 text-[12px] text-muted">{a.t}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
