"use client";
import { api, apiEnabled, setToken, getToken, setUnauthorizedHandler, explain, ApiError } from "@/lib/api";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Btn } from "./ui";

export type Persona = { id: string; name: string; initials: string; title: string; role: "Brand" | "Legal" | "Compliance" | "Viewer"; canDecide: boolean };
type Ctx = { user: Persona | null; ready: boolean; authError: string; notice: string; retryAuth: () => void; signOut: (notice?: string) => void; login: (email: string, password: string) => Promise<void> };
const C = createContext<Ctx>({ user: null, ready: false, authError: "", notice: "", retryAuth: () => {}, signOut: () => {}, login: async () => {} });
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Persona | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");

  const signOut = useCallback((msg?: string) => { setToken(null); setUser(null); setNotice(msg ?? ""); }, []);
  useEffect(() => {
    setUnauthorizedHandler(() => signOut("Your session expired. Please sign in again."));
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const boot = useCallback(() => {
    if (!apiEnabled || !getToken()) { setReady(true); return; }
    setAuthError("");
    api.me().then(u => { setUser(u); setReady(true); })
      .catch(e => {
        // 401 is handled globally (token cleared, notice shown). Any other failure keeps the session and offers a retry.
        if ((e as ApiError).status === 401) setReady(true); else { setAuthError(explain(e)); setReady(true); }
      });
  }, []);
  useEffect(() => { boot(); }, [boot]);

  const login = async (email: string, password: string) => { const r = await api.login(email, password); setToken(r.token); setNotice(""); setUser(r.user); };
  return <C.Provider value={{ user, ready, authError, notice, retryAuth: boot, signOut, login }}>{children}</C.Provider>;
}

type Demo = { password_hint: string; accounts: { email: string; name: string; title: string; role: string }[] };
function ApiLogin() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<Demo | null>(null);
  useEffect(() => { api.demoAccounts().then(setDemo).catch(() => {}); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try { await login(email.trim(), password); }
    catch (x) { const s = (x as ApiError).status; setErr(s === 401 ? "Incorrect email or password." : s === 0 ? explain(x) + ". If the server was asleep, wait a moment and try again." : explain(x)); }
    setBusy(false);
  };
  return (
    <div className="grid min-h-screen place-items-center bg-ivory p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-[#FCF8F1] p-6">
        <img src="/logo-full.png" alt="Threadline" className="mx-auto mb-5 h-28 w-auto mix-blend-multiply" />
        <h1 className="text-base font-semibold">Sign in</h1>
        <p className="mt-1 text-[12px] text-muted">Pick a demo account below to try Threadline as Legal, Brand, Compliance or a read-only Viewer.</p>
        {notice && <p role="status" className="mt-2 rounded-md bg-navy/10 px-2 py-1.5 text-[12px]">{notice}</p>}
        <label className="mt-3 block text-[13px]">Email<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1.5" /></label>
        <label className="mt-3 block text-[13px]">Password<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1.5" /></label>
        {err && <p role="alert" className="mt-2 text-[12px] text-terra">{err}</p>}
        <button type="submit" disabled={busy} className="mt-4 w-full rounded-md bg-navy py-2 text-[13px] font-medium text-white disabled:opacity-50">{busy ? "Signing in..." : "Sign in"}</button>
        {demo && <div className="mt-4 text-[12px] text-muted">Demo accounts (click to fill):
          <ul className="mt-1 space-y-0.5">{demo.accounts.map(a => <li key={a.email}><button type="button" className="underline" onClick={() => { setEmail(a.email); setPassword(demo.password_hint); setErr(""); }}>{a.email}</button> ({a.role})</li>)}</ul></div>}
        <p className="mt-3 text-[11px] text-muted">AI recommends. People decide. All data is fictional (Nimbus Shield).</p>
      </form>
    </div>
  );
}

export function AuthFailed() {
  const { authError, retryAuth, signOut } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-ivory p-4">
      <div role="alert" className="max-w-sm rounded-lg border border-line bg-paper p-6 text-center">
        <h1 className="font-semibold">Can&apos;t reach the server</h1>
        <p className="mt-1 text-[13px] text-muted">{authError}. You are still signed in; this is usually a sleeping free-tier server.</p>
        <div className="mt-4 flex justify-center gap-2"><Btn variant="primary" onClick={retryAuth}>Retry</Btn><Btn onClick={() => signOut()}>Sign out</Btn></div>
      </div>
    </div>
  );
}

export function LoginScreen() {
  return apiEnabled ? <ApiLogin /> : (
    <div className="grid min-h-screen place-items-center bg-ivory p-4"><p className="max-w-sm text-center text-[13px] text-muted">Backend not connected. Set NEXT_PUBLIC_API_URL to the Threadline API to sign in.</p></div>
  );
}
