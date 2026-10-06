"use client";

import { useEffect } from "react";

/**
 * "Print or save as PDF". Also honours `?print=1` (the palette's "Print CV"
 * command from another page): strip the flag, then open the print dialog once.
 */
export function PrintButton({ label }: { label: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("print") !== "1") return;
    url.searchParams.delete("print");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-cv-print
      className="inline-flex h-11 items-center gap-2 border border-rule-strong px-4 text-sm font-medium transition-colors duration-200 hover:bg-ink hover:text-ground"
    >
      <svg
        viewBox="0 0 20 20"
        className="size-4"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M5.5 7.5V3h9v4.5M5.5 14.5h-2v-7h13v7h-2M5.5 12h9v5h-9Z" />
      </svg>
      {label}
    </button>
  );
}
