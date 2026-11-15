"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// DEMO authentication only: no passwords, nothing is verified server-side. The session lives in this browser's localStorage.
export type Persona = { id: string; name: string; initials: string; title: string; role: "Brand" | "Legal" | "Compliance" | "Viewer"; canDecide: boolean };
export const PERSONAS: Persona[] = [
  { id: "maya", name: "Maya R.", initials: "MR", title: "Legal Counsel", role: "Legal", canDecide: true },
  { id: "priya", name: "Priya N.", initials: "PN", title: "Brand Manager", role: "Brand", canDecide: true },
  { id: "ken", name: "Ken O.", initials: "KO", title: "Compliance Lead", role: "Compliance", canDecide: true },
  { id: "tom", name: "Tom K.", initials: "TK", title: "Content Author (read-only reviews)", role: "Viewer", canDecide: false },
];
const KEY = "threadline.demo.session";
type Ctx = { user: Persona | null; ready: boolean; signIn: (id: string) => void; signOut: () => void };
const C = createContext<Ctx>({ user: null, ready: false, signIn: () => {}, signOut: () => {} });
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Persona | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const id = localStorage.getItem(KEY); setUser(PERSONAS.find(p => p.id === id) ?? null); } catch {}
    setReady(true);
  }, []);
  const signIn = (id: string) => { try { localStorage.setItem(KEY, id); } catch {} setUser(PERSONAS.find(p => p.id === id) ?? null); };
  const signOut = () => { try { localStorage.removeItem(KEY); } catch {} setUser(null); };
  return <C.Provider value={{ user, ready, signIn, signOut }}>{children}</C.Provider>;
}

export function LoginScreen() {
  const { signIn } = useAuth();
  const [id, setId] = useState(PERSONAS[0].id);
  return (
    <div className="grid min-h-screen place-items-center bg-ivory p-4">
      <form onSubmit={e => { e.preventDefault(); signIn(id); }} className="w-full max-w-sm rounded-lg border border-line bg-[#FCF8F1] p-6">
        <img src="/logo-full.png" alt="Threadline" className="mx-auto mb-5 h-28 w-auto mix-blend-multiply" />
        <h1 className="text-base font-semibold">Sign in to the demo workspace</h1>
        <p className="mb-4 mt-1 text-[13px] text-muted">Pick a team member to explore Threadline as. Demo sign-in only, no password needed. Reviewer roles can approve; the viewer cannot.</p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Team member</legend>
          {PERSONAS.map(p => (
            <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 ${id === p.id ? "border-navy bg-navy/5" : "border-line"}`}>
              <input type="radio" name="persona" value={p.id} checked={id === p.id} onChange={() => setId(p.id)} />
              <span className="grid h-7 w-7 place-items-center rounded-full bg-navy text-[11px] text-white">{p.initials}</span>
              <span className="text-[13px]"><span className="font-medium">{p.name}</span><br /><span className="text-muted">{p.title}</span></span>
            </label>
          ))}
        </fieldset>
        <button type="submit" className="mt-5 w-full rounded-md bg-navy py-2 text-[13px] font-medium text-white hover:bg-navy/90">Sign in</button>
        <p className="mt-3 text-[11px] text-muted">AI recommends. People decide. All data is fictional (Nimbus Shield).</p>
      </form>
    </div>
  );
}
