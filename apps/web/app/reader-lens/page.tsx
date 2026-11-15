"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, ImagePlus, Play, XCircle } from "lucide-react";
import { Badge, Btn, Card, DemoTag, PageHeader, Tabs } from "@/components/ui";
import { BELIEFS, CONTENT, type Belief } from "@/lib/data";

const SAMPLE = CONTENT[0].excerpt;
const EV: Record<Belief["evidence"], { tone: "teal" | "navy" | "terra"; icon: JSX.Element }> = {
  Supported: { tone: "teal", icon: <CheckCircle2 size={12} /> },
  Partial: { tone: "navy", icon: <CircleHelp size={12} /> },
  Gap: { tone: "navy", icon: <CircleHelp size={12} /> },
  Contradicted: { tone: "terra", icon: <XCircle size={12} /> },
};

export default function ReaderLens() {
  const [tab, setTab] = useState<"Text" | "Image">("Text");
  const [text, setText] = useState(SAMPLE);
  const [file, setFile] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [proposed, setProposed] = useState(false);
  const implied = BELIEFS.filter(b => b.kind === "Implied");
  const gaps = BELIEFS.filter(b => b.evidence === "Gap" || b.evidence === "Partial");

  return (
    <div>
      <PageHeader title="Reader Lens" sub="See what a reader is likely to believe after reading your content, before it ships." actions={<DemoTag />} />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Content" className="lg:col-span-2 self-start">
          <Tabs tabs={["Text", "Image"] as const} value={tab} onChange={setTab} />
          {tab === "Text" ? (
            <label className="block"><span className="sr-only">Content text</span>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={7} className="w-full rounded-md border border-line bg-ivory p-3 text-[13px] outline-none focus:border-navy" />
            </label>
          ) : (
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-ivory text-muted">
              <ImagePlus size={20} />
              <span>{file ?? "Choose an image (mock, nothing is uploaded)"}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={e => setFile(e.target.files?.[0]?.name ?? null)} />
            </label>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-muted">Content is treated as data, never instructions.</span>
            <Btn variant="primary" onClick={() => { setRan(true); setProposed(false); }}><Play size={13} /> Run Reader Lens</Btn>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {!ran ? (
            <Card><p className="text-muted">Run Reader Lens to see predicted reader beliefs. Output is a recommendation; a person decides.</p></Card>
          ) : (
            <>
              <Card title="Predicted reader beliefs" action={<DemoTag text="Demo prediction" />}>
                <ul className="space-y-4">
                  {BELIEFS.map(b => (
                    <li key={b.text}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{b.text}</span>
                        <span className="flex gap-1.5"><Badge>{b.kind}</Badge><Badge tone={EV[b.evidence].tone}>{EV[b.evidence].icon} {b.evidence}</Badge></span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded bg-black/5" role="progressbar" aria-valuenow={Math.round(b.conf * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence for ${b.text}`}>
                          <div className="h-full rounded bg-navy" style={{ width: `${b.conf * 100}%` }} />
                        </div>
                        <span className="w-10 text-right text-[12px] tabular-nums text-muted">{Math.round(b.conf * 100)}%</span>
                      </div>
                      {b.source && <div className="mt-1 text-[12px] text-muted">Source: {b.source}</div>}
                    </li>
                  ))}
                </ul>
              </Card>
              <div className="grid gap-4 md:grid-cols-2">
                <Card title="Implied claims">
                  <ul className="list-disc space-y-1 pl-4">{implied.map(b => <li key={b.text}>{b.text}</li>)}</ul>
                </Card>
                <Card title="Evidence gaps">
                  <ul className="space-y-2">
                    {gaps.map(b => <li key={b.text} className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-terra" /><span>{b.text} <span className="text-muted">({b.evidence === "Gap" ? "no approved evidence" : "partial evidence"})</span></span></li>)}
                  </ul>
                </Card>
              </div>
              <Card title="Suggested minimal edit" action={<DemoTag />}>
                <pre className="overflow-auto rounded-md border border-line bg-ivory p-3 text-[13px] leading-6 whitespace-pre-wrap">
                  <span className="text-terra">- Nimbus Shield blocks 100% of threats, guaranteed. No setup needed.</span>{"\n"}
                  <span className="text-teal">+ Nimbus Shield detected 97.2% of threats in a third-party benchmark. Setup takes about 20 minutes.</span>
                </pre>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[12px] text-muted">Nothing is applied automatically. Accepting only sends this to human review.</span>
                  <Btn onClick={() => setProposed(true)} disabled={proposed}>{proposed ? "Proposed for human review" : "Accept suggestion"}</Btn>
                </div>
                {proposed && <p role="status" className="mt-2 text-[12px] text-teal">Proposed edit queued for a human reviewer. Original content is unchanged.</p>}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
