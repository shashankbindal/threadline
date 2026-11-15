"use client";
import clsx from "clsx";
import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-lg border border-line bg-paper", className)}>
      {title && <header className="flex items-center justify-between border-b border-line px-4 py-3"><h3 className="text-[13px] font-semibold">{title}</h3>{action}</header>}
      <div className="p-4">{children}</div>
    </section>
  );
}
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-muted">{sub}</p>}</div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}
const TONES: Record<string, string> = {
  neutral: "bg-black/5 text-ink", teal: "bg-teal/10 text-teal", terra: "bg-terra/10 text-terra", navy: "bg-navy/10 text-navy",
};
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "teal" | "terra" | "navy" }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium", TONES[tone])}>{children}</span>;
}
export function Btn({ children, variant = "default", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" }) {
  return <button {...p} className={clsx("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50",
    variant === "primary" ? "bg-navy text-white hover:bg-navy/90" : variant === "ghost" ? "hover:bg-black/5" : "border border-line bg-paper hover:bg-black/[.03]", className)}>{children}</button>;
}
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: readonly T[]; value: T; onChange: (t: T) => void }) {
  return <div role="tablist" className="mb-4 flex gap-1 border-b border-line">{tabs.map(t =>
    <button key={t} role="tab" aria-selected={t === value} onClick={() => onChange(t)}
      className={clsx("-mb-px border-b-2 px-3 py-2 text-[13px]", t === value ? "border-terra font-medium" : "border-transparent text-muted hover:text-ink")}>{t}</button>)}</div>;
}
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-lg border border-line bg-paper shadow-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="font-semibold">{title}</h2><button aria-label="Close" onClick={onClose}><X size={16} /></button></header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
export function Stat({ label, value, delta, tone = "neutral" }: { label: string; value: string; delta?: string; tone?: "neutral" | "teal" | "terra" }) {
  return <div className="rounded-lg border border-line bg-paper p-4"><div className="text-[12px] text-muted">{label}</div>
    <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>{delta && <div className={clsx("mt-1 text-[12px]", tone === "teal" ? "text-teal" : tone === "terra" ? "text-terra" : "text-muted")}>{delta}</div>}</div>;
}
export const DemoTag = ({ text = "Demo data" }: { text?: string }) => <Badge tone="navy">◌ {text}</Badge>;
export const SevBadge = ({ s }: { s: "Low" | "Medium" | "High" | "Critical" }) =>
  <Badge tone={s === "Low" ? "teal" : s === "Medium" ? "navy" : "terra"}>{s === "Critical" ? "▲▲" : s === "High" ? "▲" : s === "Medium" ? "●" : "○"} {s}</Badge>;
export const NotConnected = () => (
  <div role="status" className="rounded-lg border border-line bg-paper p-6">
    <h2 className="font-semibold">Backend not connected</h2>
    <p className="mt-1 text-muted">This page needs the Threadline API. Set NEXT_PUBLIC_API_URL (see .env.example) and restart the web app.</p>
  </div>
);
