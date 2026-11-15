"use client";
import { Card, PageHeader, Stat, DemoTag, LiveTag, SevBadge, Badge, NotConnected, Skeleton, ErrorNote } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const RISK_COLORS: Record<string, string> = { Low: "#2A7F7A", Medium: "#1F3A5F", High: "#C8643C", Critical: "#8A2E12" };
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (isNaN(m)) return "";
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

export default function Overview() {
  const { data, error, loading, reload, connected } = useApi(api.overview);
  if (!connected) return <div><PageHeader title="Overview" /><NotConnected /></div>;
  const head = <PageHeader title="Overview" sub="Brand governance at a glance. AI recommends; people approve." />;
  if (error) return <div>{head}<ErrorNote message={error} onRetry={reload} /></div>;
  if (loading || !data) return (
    <div>{head}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64 lg:col-span-2" /></div>
    </div>
  );
  const { kpis, riskMix, trend, topRisky, activity } = data;
  const total = riskMix.reduce((s, r) => s + r.v, 0);
  return (
    <div>
      {head}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(k => <div key={k.key} className="relative"><Stat label={k.label} value={String(k.value)} delta={k.delta} tone={k.tone} /><div className="absolute right-3 top-3">{k.live ? <LiveTag /> : <DemoTag />}</div></div>)}
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Risk mix" action={<LiveTag />}>
          <div className="h-52" role="img" aria-label={"Risk mix: " + riskMix.map(r => `${r.name} ${r.v}`).join(", ")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskMix} dataKey="v" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={2}>
                  {riskMix.map(r => <Cell key={r.name} fill={RISK_COLORS[r.name]} />)}
                </Pie>
                <Tooltip /><Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-[12px] text-muted">
            {riskMix.map(r => <li key={r.name}>{r.name}: {r.v} ({total ? Math.round((r.v / total) * 100) : 0}%)</li>)}
          </ul>
        </Card>
        <Card title="Review trend" action={<DemoTag text="Demo data (historical)" />} className="lg:col-span-2">
          <div className="h-60" role="img" aria-label="Monthly reviewed, approved and flagged items">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
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
        <Card title="Top risky content" action={<LiveTag />}>
          <ul className="divide-y divide-line">
            {topRisky.map(c => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0"><div className="truncate font-medium">{c.title}</div><div className="text-[12px] text-muted">{c.id} · {c.channel} · {c.owner}</div></div>
                <div className="flex shrink-0 items-center gap-2"><Badge>{c.status}</Badge><SevBadge s={c.risk} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent activity" action={<span className="flex gap-1"><LiveTag /><DemoTag text="Seeded history" /></span>}>
          <ul className="divide-y divide-line">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                <span><b className="font-medium">{a.who}</b> <span className="text-muted">{a.what}</span> {a.target}{a.source === "audit" && <> <Badge tone="teal">audit log</Badge></>}</span>
                <span className="shrink-0 text-[12px] text-muted">{ago(a.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
