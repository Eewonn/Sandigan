"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sandigan] global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6fb",
          color: "#101627",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: 520,
            textAlign: "center",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#0d2254",
              margin: 0,
            }}
          >
            Sandigan could not render this page.
          </h1>
          <p style={{ color: "#5a6478", margin: 0, lineHeight: 1.55 }}>
            An unrecoverable error occurred in the root layout. You can try
            reloading — if it persists, the underlying error is in the dev
            console.
          </p>
          {error.message && (
            <pre
              style={{
                margin: "0.5rem 0",
                padding: "0.6rem 0.8rem",
                borderRadius: 10,
                background: "#fff",
                boxShadow: "inset 0 0 0 1px rgba(13,34,84,0.1)",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: "0.78rem",
                textAlign: "left",
                overflowX: "auto",
              }}
            >
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>
          )}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              marginTop: "0.25rem",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#0d2254",
                color: "#fff",
                border: 0,
                padding: "0.6rem 0.9rem",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
