"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en"><body style={{ fontFamily: "system-ui, sans-serif", background: "#F8F6EF", color: "#202124", display: "grid", minHeight: "100vh", placeItems: "center", margin: 0 }}>
      <div role="alert" style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 18 }}>Threadline hit an unexpected problem</h1>
        <p style={{ fontSize: 13, color: "#6B6F76" }}>Nothing was changed. Try again, or reload the page.</p>
        <button onClick={reset} style={{ marginTop: 12, padding: "6px 14px", borderRadius: 6, border: 0, background: "#233342", color: "#fff", fontSize: 13 }}>Try again</button>
      </div>
    </body></html>
  );
}
