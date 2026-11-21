"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Menu, Search, LogOut, X } from "lucide-react";
import { NAV, WORKFLOW } from "@/lib/nav";
import { NetBanner } from "./ui";
import { useAuth, LoginScreen, AuthFailed } from "./Auth";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, ready, authError, signOut } = useAuth(); const [menu, setMenu] = useState(false);
  const path = usePathname(); const [open, setOpen] = useState(false); const [q, setQ] = useState("");
  const cur = NAV.find(n => n.href === "/" ? path === "/" : path.startsWith(n.href));
  useEffect(() => { setOpen(false); setMenu(false); }, [path]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setMenu(false); setQ(""); } };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, []);
  const banner = <NetBanner />;
  if (!ready) return <div className="grid min-h-screen place-items-center bg-ivory">{banner}<p role="status" className="text-[13px] text-muted">Loading Threadline…</p></div>;
  if (authError && !user) return <>{banner}<AuthFailed /></>;
  if (!user) return <>{banner}<LoginScreen /></>;
  const matches = q ? NAV.filter(n => n.label.toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <div className="flex min-h-screen">
      {banner}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded focus:bg-paper focus:px-3 focus:py-1.5">Skip to content</a>
      <aside id="sidebar" aria-label="Sidebar" className={clsx("fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-line bg-ivory transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full max-lg:invisible")}>
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <img src="/logo-mark.png" alt="" className="h-8 w-auto mix-blend-multiply" />
          <span className="text-[13px] font-semibold uppercase tracking-[0.22em]">Threadline</span>
          <button className="ml-auto lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} aria-hidden /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Primary">{NAV.map(n => { const on = n === cur; return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
            className={clsx("mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px]", on ? "bg-white font-medium shadow-[0_0_0_1px_#E6E2D6]" : "text-muted hover:bg-black/5 hover:text-ink")}>
            <n.icon size={16} aria-hidden className={on ? "text-terra" : ""} />{n.label}</Link>); })}</nav>
        <div className="shrink-0 border-t border-line p-4 text-[11px] text-muted">
          <div className="mb-1 font-medium text-ink">Nimbus Shield (fictional)</div>AI recommends. People decide.</div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" aria-hidden onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-ivory/90 px-4 backdrop-blur">
          <button className="lg:hidden" aria-label="Open menu" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen(true)}><Menu size={18} aria-hidden /></button>
          <span className="hidden text-[13px] text-muted sm:inline">Workspace / <span className="text-ink">{cur?.label ?? "Not found"}</span></span>
          <div className="relative ml-auto max-w-sm flex-1"><Search size={14} aria-hidden className="absolute left-2.5 top-2.5 text-muted" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Jump to a page…" aria-label="Search pages"
              className="w-full rounded-md border border-line bg-white py-1.5 pl-8 pr-3 text-[13px]" />
            {q && <div className="absolute mt-1 w-full rounded-md border border-line bg-white p-2 shadow-lg">{matches.map(n =>
              <Link key={n.href} href={n.href} onClick={() => setQ("")} className="block rounded px-2 py-1.5 text-[13px] hover:bg-black/5">{n.label}</Link>)}
              {matches.length === 0 && <p className="px-2 py-1.5 text-[13px] text-muted">No page matches &ldquo;{q}&rdquo;.</p>}</div>}</div>
          <div className="relative"><button aria-label={`Account menu for ${user.name}`} aria-expanded={menu} onClick={() => setMenu(m => !m)} className="grid h-7 w-7 place-items-center rounded-full bg-navy text-[11px] text-white">{user.initials}</button>
            {menu && <div className="absolute right-0 mt-2 w-56 rounded-md border border-line bg-white p-2 shadow-lg"><div className="px-2 py-1 text-[13px] font-medium">{user.name}</div><div className="px-2 pb-2 text-[12px] text-muted">{user.title} · {user.role}</div>
              <button onClick={() => { setMenu(false); signOut(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-black/5"><LogOut size={14} aria-hidden />Sign out</button></div>}</div>
        </header>
        <div className="border-b border-line bg-white/50 px-4 py-2"><ol aria-label="Governance workflow" className="flex flex-wrap gap-x-1 gap-y-0.5 text-[11px] text-muted">{WORKFLOW.map((w, i) =>
          <li key={w}>{i > 0 && "→ "}{w}</li>)}</ol></div>
        <main id="main" className="mx-auto max-w-[1280px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
