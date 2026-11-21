"use client";
import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, MiniMap, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { Badge, Btn, Card, DemoTag, ErrorNote, NotConnected, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

type St = "supported" | "contradicted" | "gap";
const COL: Record<St, string> = { supported: "#2A7F7A", contradicted: "#C8643C", gap: "#8A8678" };
const SYM: Record<St, string> = { supported: "✓ Supported", contradicted: "✕ Contradicted", gap: "? Gap" };

export default function EvidenceThreads() {
  const { data, error, loading, reload, connected } = useApi(api.evidenceGraph);
  const [filter, setFilter] = useState<"all" | St>("all");
  const [sel, setSel] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] };
    const el = data.edges.filter(l => filter === "all" || l.status === filter);
    const ids = new Set(el.flatMap(l => [l.source, l.target]));
    const nodes: Node[] = data.nodes.filter(n => filter === "all" || ids.has(n.id)).map(n => ({
      id: n.id, position: { x: n.x, y: n.y }, data: { label: `${n.kind}: ${n.label}` }, draggable: true,
      style: { fontSize: 12, width: 200, borderRadius: 8, border: `${sel === n.id ? 2 : 1}px solid ${n.kind === "Claim" ? "#1F3A5F" : n.kind === "Belief" ? "#C8643C" : "#2A7F7A"}`, background: "#FFFFFF" },
    }));
    const edges: Edge[] = el.map(l => ({
      id: l.id, source: l.source, target: l.target, label: `${SYM[l.status].split(" ")[0]} ${l.label}`,
      style: { stroke: COL[l.status], strokeWidth: 2, strokeDasharray: l.status === "gap" ? "5 4" : l.status === "contradicted" ? "2 3" : undefined },
      labelStyle: { fontSize: 11, fill: COL[l.status] }, markerEnd: { type: MarkerType.ArrowClosed, color: COL[l.status] },
    }));
    return { nodes, edges };
  }, [data, filter, sel]);

  const head = <PageHeader title="Evidence Threads" sub="Trace each claim to the reader belief it creates and the sources that support, contradict or fail to cover it. Click a node for details; use the buttons to filter by status." actions={<DemoTag />} />;
  if (!connected) return <div><PageHeader title="Evidence Threads" /><NotConnected /></div>;
  if (error) return <div>{head}<ErrorNote message={error} onRetry={reload} /></div>;
  if (loading || !data) return <div>{head}<Skeleton className="h-[520px]" /></div>;

  const byId = Object.fromEntries(data.nodes.map(n => [n.id, n]));
  const cur = sel ? byId[sel] : null;
  const rel = sel ? data.edges.filter(l => l.source === sel || l.target === sel) : [];

  return (
    <div>
      {head}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["all", "supported", "contradicted", "gap"] as const).map(f => (
          <Btn key={f} variant={filter === f ? "primary" : "default"} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All" : SYM[f]}</Btn>
        ))}
        <span className="ml-auto flex items-center gap-3 text-[12px] text-muted">
          {(Object.keys(COL) as St[]).map(s => <span key={s} className="flex items-center gap-1"><span className="inline-block h-0.5 w-5" style={{ background: COL[s] }} />{SYM[s]}</span>)}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="h-[520px] overflow-hidden rounded-lg border border-line bg-paper lg:col-span-3">
          <ReactFlow nodes={nodes} edges={edges} fitView nodesConnectable={false} onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)}>
            <Background color="#E7E3DA" /><Controls showInteractive={false} /><MiniMap pannable zoomable />
          </ReactFlow>
        </div>
        <Card title="Details">
          {!cur ? <p className="text-muted">Select a node to see details.</p> : (
            <div className="space-y-3">
              <div><Badge tone="navy">{cur.kind}</Badge><div className="mt-2 font-medium">{cur.label}</div><p className="mt-1 text-muted">{cur.detail}</p></div>
              <div>
                <div className="mb-1 text-[12px] font-medium">Connections</div>
                <ul className="space-y-1 text-[12px]">
                  {rel.map(l => <li key={l.id}>{byId[l.source]?.label} {"->"} {byId[l.target]?.label} <Badge tone={l.status === "supported" ? "teal" : l.status === "contradicted" ? "terra" : "neutral"}>{SYM[l.status]}</Badge></li>)}
                </ul>
              </div>
              <p className="text-[12px] text-muted">Recommendation only. A reviewer decides any change.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
