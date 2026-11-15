"use client";
import { useCallback, useEffect, useState } from "react";
import { apiEnabled } from "./api";

/** Fetch from the API once (and on retry). `connected` is false when NEXT_PUBLIC_API_URL is unset. */
export function useApi<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(apiEnabled);
  const load = useCallback(() => {
    if (!apiEnabled) return;
    setLoading(true); setError("");
    fetcher().then(setData).catch(e => setError((e as Error).message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, connected: apiEnabled };
}
