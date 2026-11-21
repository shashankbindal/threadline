"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ShieldAlert } from "lucide-react";
import { Alert, Badge, Btn, Card, Empty, ErrorNote, NotConnected, PageHeader, Skeleton } from "@/components/ui";
import { api, apiEnabled, explain, type Agreement, type QueueItem } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const kappaWord = (k: number) => (k >= 0.8 ? "almost perfect" : k >= 0.6 ? "substantial" : k >= 0.4 ? "moderate" : k >= 0.2 ? "fair" : "slight or none");

function AgreementPanel({ a, loading, error, reload }: { a: Agreement | null; loading: boolean; error: string; reload: () => void }) {
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!a) return <Skeleton className="h-32" />;
  const measured = a.status === "measured" && a.fleiss_kappa != null;
  const needLabels = Math.max(0, 10 - a.items_with_2plus);
  return (
    <Card title="Inter-annotator agreement" action={<Btn onClick={reload} disabled={loading} aria-label="Refresh agreement">Refresh</Btn>}>
      {measured ? (
        <div className="space-y-2 text-[13px]">
          <p><span className="text-2xl font-semibold">{a.fleiss_kappa!.toFixed(2)}</span> <span className="text-muted">Fleiss&apos; kappa ({kappaWord(a.fleiss_kappa!)} agreement)</span></p>
          {a.observed_agreement != null && <p>Observed agreement: {(a.observed_agreement * 100).toFixed(0)}%</p>}
        </div>
      ) : (
        <div className="space-y-2 text-[13px]">
          <p><Badge tone="navy">Not yet measured</Badge></p>
          <p>Agreement is only computed from real labels, and there are not enough yet. It needs at least <b>2 annotators</b> who have both labelled the same <b>10 items</b>
            {" "}(currently {a.annotators} annotator{a.annotators === 1 ? "" : "s"}, {a.items_with_2plus} item{a.items_with_2plus === 1 ? "" : "s"} with 2+ labels{needLabels > 0 ? `; ${needLabels} more shared item${needLabels === 1 ? "" : "s"} needed` : a.annotators < 2 ? "; one more annotator needed" : ""}).
            Ask a colleague to sign in with a different account and label the same queue.</p>
        </div>
      )}
      <dl className="mt-3 grid grid-cols-[150px_1fr] gap-y-1 text-[12px]">
        <dt className="text-muted">Annotators</dt><dd>{a.annotators}</dd>
        <dt className="text-muted">Items labelled</dt><dd>{a.items_labelled}</dd>
        <dt className="text-muted">Items with 2+ labels</dt><dd>{a.items_with_2plus}</dd>
      </dl>
      {Object.keys(a.agreement_with_authors).length > 0 && <p className="mt-2 text-[12px] text-muted">Agreement with the prototype authors&apos; labels: {Object.values(a.agreement_with_authors).map((v, i) => `${v.percent}% (${v.n} items)`).join(", ")}</p>}
      {a.per_item_disagreements.length > 0 && (
        <div className="mt-3"><h4 className="mb-1 text-[12px] font-semibold">Items annotators disagree on</h4>
          <ul className="space-y-1 text-[12px]">{a.per_item_disagreements.map(d => <li key={d.item_id} className="rounded border border-line p-1.5">&ldquo;{d.text}&rdquo; <span className="text-muted">{d.risky} risky / {d.safe} safe</span></li>)}</ul></div>
      )}
      <p className="mt-3 text-[12px] text-muted">{a.note}</p>
    </Card>
  );
}

export default function AnnotatePage() {
  const queue = useApi(() => api.annotationQueue(20));
  const agree = useApi(api.agreement);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [done, setDone] = useState(0);
  const [pending, setPending] = useState<"" | "risky" | "safe">("");
  const [err, setErr] = useState("");
  const lock = useRef(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => { if (queue.data) setItems(queue.data.items.filter(i => !seen.current.has(i.item_id))); }, [queue.data]);
  const cur = items[0];

  const submit = useCallback(async (label: "risky" | "safe") => {
    if (!cur || lock.current) return;
    lock.current = true; setPending(label); setErr("");
    try {
      await api.annotate(cur.item_id, label);
      seen.current.add(cur.item_id);
      setItems(q => q.filter(i => i.item_id !== cur.item_id));
      setDone(d => d + 1);
      agree.reload();
    } catch (e) { setErr(explain(e)); }
    lock.current = false; setPending("");
  }, [cur, agree]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "r" || e.key === "R") submit("risky"); else if (e.key === "s" || e.key === "S") submit("safe");
    };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, [submit]);

  if (!apiEnabled) return <div><PageHeader title="Annotate" /><NotConnected /></div>;
  return (
    <div>
      <PageHeader title="Annotate" sub="Label each sentence as Risky (an unsupported or absolute marketing claim a brand reviewer should flag) or Safe. Your independent labels are the only input to the agreement score; they are never pre-filled." />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card title="Label queue" action={<span className="text-[12px] text-muted" aria-live="polite">{done} labelled this session · {items.length} left in this batch</span>}>
            {queue.error ? <ErrorNote message={queue.error} onRetry={queue.reload} /> : queue.loading && !queue.data ? <Skeleton className="h-40" /> : !cur ? (
              <div className="space-y-3"><Empty>{done > 0 ? "Batch complete. Thank you! Load more to keep labelling." : "No items left for you to label right now."}</Empty>
                <Btn onClick={queue.reload} disabled={queue.loading}>Load more items</Btn></div>
            ) : (
              <div>
                <p className="mb-1 text-[12px] text-muted">Item {done + 1}</p>
                <blockquote className="rounded-md border border-line bg-ivory p-4 text-[15px] leading-6" aria-live="polite">{cur.text}</blockquote>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Label this sentence">
                  <Btn variant="primary" className="!bg-terra" disabled={!!pending} onClick={() => submit("risky")} aria-keyshortcuts="R"><ShieldAlert size={14} aria-hidden /> {pending === "risky" ? "Saving…" : "Risky"} <kbd className="rounded bg-white/25 px-1 text-[11px]">R</kbd></Btn>
                  <Btn variant="primary" className="!bg-teal" disabled={!!pending} onClick={() => submit("safe")} aria-keyshortcuts="S"><Check size={14} aria-hidden /> {pending === "safe" ? "Saving…" : "Safe"} <kbd className="rounded bg-white/25 px-1 text-[11px]">S</kbd></Btn>
                </div>
                <p className="mt-2 text-[12px] text-muted">Keyboard: press <b>R</b> for Risky or <b>S</b> for Safe. Go with your own judgement; there is no right answer shown.</p>
              </div>
            )}
            {err && <div className="mt-3"><Alert>Could not save that label: {err} Your answer was not recorded; press the button again to retry.</Alert></div>}
          </Card>
        </div>
        <div className="lg:col-span-2"><AgreementPanel a={agree.data} loading={agree.loading} error={agree.error} reload={agree.reload} /></div>
      </div>
    </div>
  );
}
