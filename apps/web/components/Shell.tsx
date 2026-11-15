"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Menu, Search, Bell, LogOut } from "lucide-react";
import { NAV, WORKFLOW } from "@/lib/nav";
import { DemoTag } from "./ui";
import { useAuth, LoginScreen } from "./Auth";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, ready, signOut } = useAuth(); const [menu, setMenu] = useState(false);
  const path = usePathname(); const [open, setOpen] = useState(false); const [q, setQ] = useState("");
  const cur = NAV.find(n => n.href === "/" ? path === "/" : path.startsWith(n.href));
  if (!ready) return <div className="min-h-screen bg-ivory" />;
  if (!user) return <LoginScreen />;
  return (
    <div className="flex min-h-screen">
      <aside className={clsx("fixed inset-y-0 z-40 w-60 shrink-0 border-r border-line bg-ivory transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-14 items-center gap-2 px-4">
          <img src="/logo-mark.png" alt="" className="h-8 w-auto mix-blend-multiply" />
          <span className="text-[13px] font-semibold uppercase tracking-[0.22em]">Threadline</span>
        </div>
        <nav className="px-2 py-2" aria-label="Primary">{NAV.map(n => { const on = n === cur; return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={on ? "page" : undefined}
            className={clsx("mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px]", on ? "bg-white font-medium shadow-[0_0_0_1px_#E6E2D6]" : "text-muted hover:bg-black/5 hover:text-ink")}>
            <n.icon size={16} className={on ? "text-terra" : ""} />{n.label}</Link>); })}</nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-line p-4 text-[11px] text-muted">
          <div className="mb-1 font-medium text-ink">Nimbus Shield (fictional)</div>AI recommends. People decide.</div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-ivory/90 px-4 backdrop-blur">
          <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen(true)}><Menu size={18} /></button>
          <span className="hidden text-[13px] text-muted sm:inline">Workspace / <span className="text-ink">{cur?.label}</span></span>
          <label className="relative ml-auto max-w-sm flex-1"><Search size={14} className="absolute left-2.5 top-2.5 text-muted" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search pages…" aria-label="Search"
              className="w-full rounded-md border border-line bg-white py-1.5 pl-8 pr-3 text-[13px]" />
            {q && <div className="absolute mt-1 w-full rounded-md border border-line bg-white p-2 shadow-lg">{NAV.filter(n => n.label.toLowerCase().includes(q.toLowerCase())).map(n =>
              <Link key={n.href} href={n.href} onClick={() => setQ("")} className="block rounded px-2 py-1.5 text-[13px] hover:bg-black/5">{n.label}</Link>)}</div>}</label>
          <DemoTag /><button aria-label="Notifications"><Bell size={16} /></button>
          <div className="relative"><button aria-label="Account menu" aria-expanded={menu} onClick={() => setMenu(m => !m)} className="grid h-7 w-7 place-items-center rounded-full bg-navy text-[11px] text-white">{user.initials}</button>
            {menu && <div className="absolute right-0 mt-2 w-52 rounded-md border border-line bg-white p-2 shadow-lg"><div className="px-2 py-1 text-[13px] font-medium">{user.name}</div><div className="px-2 pb-2 text-[12px] text-muted">{user.title}</div>
              <button onClick={() => { setMenu(false); signOut(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-black/5"><LogOut size={14} />Sign out</button></div>}</div>
        </header>
        <div className="border-b border-line bg-white/50 px-4 py-2"><ol className="flex flex-wrap gap-x-1 gap-y-0.5 text-[11px] text-muted">{WORKFLOW.map((w, i) =>
          <li key={w}>{i > 0 && "→ "}{w}</li>)}</ol></div>
        <main className="mx-auto max-w-[1280px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
