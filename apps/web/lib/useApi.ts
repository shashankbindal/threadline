"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiEnabled, explain, isAbort } from "./api";

/** Fetch from the API on mount, when `deps` change, and on reload(). Ignores stale responses and unmounted components. */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(apiEnabled);
  const seq = useRef(0);
  const fn = useRef(fetcher);
  fn.current = fetcher;
  const load = useCallback(() => {
    if (!apiEnabled) return;
    const n = ++seq.current;
    setLoading(true); setError("");
    fn.current().then(d => { if (n === seq.current) setData(d); })
      .catch(e => { if (n === seq.current && !isAbort(e)) setError(explain(e)); })
      .finally(() => { if (n === seq.current) setLoading(false); });
  }, []);
  useEffect(() => { load(); return () => { seq.current++; }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);
  return { data, error, loading, reload: load, connected: apiEnabled };
}
