"use client";
import { api, apiEnabled, setToken, getToken } from "@/lib/api";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Persona = { id: string; name: string; initials: string; title: string; role: "Brand" | "Legal" | "Compliance" | "Viewer"; canDecide: boolean };
type Ctx = { user: Persona | null; ready: boolean; signOut: () => void; login: (email: string, password: string) => Promise<void> };
const C = createContext<Ctx>({ user: null, ready: false, signOut: () => {}, login: async () => {} });
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Persona | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!apiEnabled || !getToken()) { setReady(true); return; }
    api.me().then(u => setUser(u)).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  const login = async (email: string, password: string) => { const r = await api.login(email, password); setToken(r.token); setUser(r.user); };
  const signOut = () => { setToken(null); setUser(null); };
  return <C.Provider value={{ user, ready, signOut, login }}>{children}</C.Provider>;
}

type Demo = { password_hint: string; accounts: { email: string; name: string; title: string; role: string }[] };
function ApiLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<Demo | null>(null);
  useEffect(() => { fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/demo-accounts`).then(r => r.json()).then(setDemo).catch(() => {}); }, []);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(""); try { await login(email, password); } catch (x) { setErr((x as Error).message); } setBusy(false); };
  return (
    <div className="grid min-h-screen place-items-center bg-ivory p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-[#FCF8F1] p-6">
        <img src="/logo-full.png" alt="Threadline" className="mx-auto mb-5 h-28 w-auto mix-blend-multiply" />
        <h1 className="text-base font-semibold">Sign in</h1>
        <label className="mt-3 block text-[13px]">Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1.5" /></label>
        <label className="mt-3 block text-[13px]">Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1.5" /></label>
        {err && <p role="alert" className="mt-2 text-[12px] text-terra">Error: {err}</p>}
        <button type="submit" disabled={busy} className="mt-4 w-full rounded-md bg-navy py-2 text-[13px] font-medium text-white disabled:opacity-50">{busy ? "Signing in..." : "Sign in"}</button>
        {demo && <div className="mt-4 text-[12px] text-muted">Demo accounts (click to fill):
          <ul className="mt-1 space-y-0.5">{demo.accounts.map(a => <li key={a.email}><button type="button" className="underline" onClick={() => { setEmail(a.email); setPassword(demo.password_hint); }}>{a.email}</button> ({a.role})</li>)}</ul></div>}
        <p className="mt-3 text-[11px] text-muted">AI recommends. People decide. All data is fictional (Nimbus Shield).</p>
      </form>
    </div>
  );
}

export function LoginScreen() {
  return apiEnabled ? <ApiLogin /> : (
    <div className="grid min-h-screen place-items-center bg-ivory p-4"><p className="max-w-sm text-center text-[13px] text-muted">Backend not connected. Set NEXT_PUBLIC_API_URL to the Threadline API to sign in.</p></div>
  );
}
