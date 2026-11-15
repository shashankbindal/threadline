"use client";
import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, MiniMap, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { Badge, Btn, Card, DemoTag, PageHeader } from "@/components/ui";

type St = "supported" | "contradicted" | "gap";
const COL: Record<St, string> = { supported: "#2A7F7A", contradicted: "#C8643C", gap: "#8A8678" };
const SYM: Record<St, string> = { supported: "✓ Supported", contradicted: "✕ Contradicted", gap: "? Gap" };
type D = { label: string; kind: "Claim" | "Belief" | "Source"; detail: string };

const base: Record<string, { d: D; x: number; y: number }> = {
  c1: { d: { label: "Blocks 100% of threats", kind: "Claim", detail: "From C-101 Spring launch email." }, x: 0, y: 0 },
  c2: { d: { label: "No setup needed", kind: "Claim", detail: "From C-101 Spring launch email." }, x: 0, y: 130 },
  c3: { d: { label: "Fits any budget", kind: "Claim", detail: "From C-102 Pricing page hero." }, x: 0, y: 260 },
  b1: { d: { label: "Stops every threat", kind: "Belief", detail: "Implied, 91% confidence." }, x: 280, y: 0 },
  b2: { d: { label: "Zero configuration", kind: "Belief", detail: "Stated, 88% confidence." }, x: 280, y: 130 },
  b3: { d: { label: "Suits small budgets", kind: "Belief", detail: "Implied, 52% confidence." }, x: 280, y: 260 },
  s1: { d: { label: "A-02 Detection Benchmark", kind: "Source", detail: "Third-party test: 97.2% detection on curated set." }, x: 560, y: 0 },
  s2: { d: { label: "F-07 Onboarding ~20 min", kind: "Source", detail: "Agent install plus IdP connection; median 20 min." }, x: 560, y: 130 },
  s3: { d: { label: "P-118 Pricing tiers", kind: "Source", detail: "Starter tier exists; not all budgets covered." }, x: 560, y: 220 },
  s4: { d: { label: "No approved source", kind: "Source", detail: "No evidence found for a guaranteed outcome." }, x: 560, y: 320 },
};
const links: { id: string; s: string; t: string; st: St; label: string }[] = [
  { id: "e1", s: "c1", t: "b1", st: "supported", label: "implies" },
  { id: "e2", s: "c2", t: "b2", st: "supported", label: "states" },
  { id: "e3", s: "c3", t: "b3", st: "supported", label: "implies" },
  { id: "e4", s: "b1", t: "s1", st: "contradicted", label: "contradicted" },
  { id: "e5", s: "b2", t: "s2", st: "contradicted", label: "contradicted" },
  { id: "e6", s: "b3", t: "s3", st: "supported", label: "partial support" },
  { id: "e7", s: "b3", t: "s4", st: "gap", label: "gap" },
];

export default function EvidenceThreads() {
  const [filter, setFilter] = useState<"all" | St>("all");
  const [sel, setSel] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const el = links.filter(l => filter === "all" || l.st === filter);
    const ids = new Set(el.flatMap(l => [l.s, l.t]));
    const nodes: Node[] = Object.entries(base).filter(([id]) => filter === "all" || ids.has(id)).map(([id, n]) => ({
      id, position: { x: n.x, y: n.y }, data: { label: `${n.d.kind}: ${n.d.label}` }, draggable: true,
      style: { fontSize: 12, width: 200, borderRadius: 8, border: `${sel === id ? 2 : 1}px solid ${n.d.kind === "Claim" ? "#1F3A5F" : n.d.kind === "Belief" ? "#C8643C" : "#2A7F7A"}`, background: "#FFFFFF" },
    }));
    const edges: Edge[] = el.map(l => ({
      id: l.id, source: l.s, target: l.t, label: `${SYM[l.st].split(" ")[0]} ${l.label}`,
      style: { stroke: COL[l.st], strokeWidth: 2, strokeDasharray: l.st === "gap" ? "5 4" : l.st === "contradicted" ? "2 3" : undefined },
      labelStyle: { fontSize: 11, fill: COL[l.st] }, markerEnd: { type: MarkerType.ArrowClosed, color: COL[l.st] },
    }));
    return { nodes, edges };
  }, [filter, sel]);

  const cur = sel ? base[sel] : null;
  const rel = sel ? links.filter(l => l.s === sel || l.t === sel) : [];

  return (
    <div>
      <PageHeader title="Evidence Threads" sub="Trace claims to reader beliefs to the sources that support, contradict or fail to cover them." actions={<DemoTag />} />
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
              <div><Badge tone="navy">{cur.d.kind}</Badge><div className="mt-2 font-medium">{cur.d.label}</div><p className="mt-1 text-muted">{cur.d.detail}</p></div>
              <div>
                <div className="mb-1 text-[12px] font-medium">Connections</div>
                <ul className="space-y-1 text-[12px]">
                  {rel.map(l => <li key={l.id}>{base[l.s].d.label} {"->"} {base[l.t].d.label} <Badge tone={l.st === "supported" ? "teal" : l.st === "contradicted" ? "terra" : "neutral"}>{SYM[l.st]}</Badge></li>)}
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
