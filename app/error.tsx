"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, ShieldAlert } from "lucide-react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sandigan] route error boundary caught:", error);
  }, [error]);

  return (
    <main
      role="alert"
      className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 py-12 text-center"
    >
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-inset ring-red-100"
      >
        <ShieldAlert className="h-6 w-6" />
      </span>

      <div>
        <h1 className="font-display text-[1.6rem] font-semibold text-navy-700">
          Something went wrong on this page.
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-[color:var(--color-ink-muted)]">
          Sandigan caught an unexpected error while rendering. You can try again
          below, and the details are in the dev console.
        </p>
      </div>

      {error.message && (
        <pre className="max-w-full overflow-x-auto rounded-lg bg-white px-3 py-2 text-left font-mono text-[0.78rem] leading-snug text-navy-800 ring-hairline">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          <RotateCcw className="h-4 w-4" aria-hidden /> Try again
        </button>
        <Link href="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </main>
  );
}
