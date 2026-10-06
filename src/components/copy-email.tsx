"use client";

import { useState } from "react";
import { plain } from "@/lib/thai";

export function CopyEmail({
  email,
  labels,
}: {
  email: string;
  labels: { copy: string; copied: string; failed: string };
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copied = state === "copied";

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2400);
    } catch {
      // In-app browsers (LINE, Facebook) often block the clipboard: say so, keep the address visible.
      setState("failed");
      window.setTimeout(() => setState("idle"), 5000);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={plain(labels.copy)}
      className="group inline-flex h-11 min-w-[12.5rem] items-center justify-center gap-2 border border-rule-strong px-4 text-sm font-medium transition-colors duration-200 hover:bg-ink hover:text-ground"
    >
      <svg
        viewBox="0 0 20 20"
        className="size-4"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {copied ? <path d="m4.5 10.5 3.5 3.5 7.5-8" /> : <path d="M7 7V4.5h8.5V13H13M4.5 7H13v8.5H4.5Z" />}
      </svg>
      <span aria-hidden="true">{copied ? labels.copied : state === "failed" ? labels.failed : labels.copy}</span>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? labels.copied : state === "failed" ? labels.failed : ""}
      </span>
    </button>
  );
}
