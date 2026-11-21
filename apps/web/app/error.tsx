"use client";
import { useEffect } from "react";
import { Btn } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div role="alert" className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-paper p-6 text-center">
      <h1 className="text-lg font-semibold">This page hit a problem</h1>
      <p className="mt-1 text-[13px] text-muted">Something unexpected went wrong while showing this page. Nothing was changed.</p>
      <div className="mt-4 flex justify-center gap-2"><Btn variant="primary" onClick={reset}>Try again</Btn><a href="/" className="rounded-md border border-line px-3 py-1.5 text-[13px] font-medium">Go to Overview</a></div>
    </div>
  );
}
