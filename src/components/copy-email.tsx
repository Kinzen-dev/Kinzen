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

  const icon = (done: boolean) => (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      {done ? <path d="m4.5 10.5 3.5 3.5 7.5-8" /> : <path d="M7 7V4.5h8.5V13H13M4.5 7H13v8.5H4.5Z" />}
    </svg>
  );
  // Every state (icon + label) sits in the same grid cell: the button keeps the width of the
  // widest state, and the visible one is centred in it, so both insets stay equal.
  const states = [
    { key: "idle", on: state === "idle", done: false, text: labels.copy },
    { key: "copied", on: copied, done: true, text: labels.copied },
  ];

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={plain(labels.copy)}
      className="group inline-grid h-11 place-items-center rounded-full border border-rule-strong px-[var(--inset-btn)] text-sm font-medium transition-colors duration-200 hover:bg-ink hover:text-ground"
    >
      {states.map((s) => (
        <span
          key={s.key}
          aria-hidden="true"
          className={`inline-flex items-center gap-2 [grid-area:1/1] ${s.on ? "" : "invisible"}`}
        >
          {icon(s.done)}
          {s.text}
        </span>
      ))}
      {state === "failed" ? (
        <span aria-hidden="true" className="inline-flex items-center gap-2 [grid-area:1/1]">
          {icon(false)}
          {labels.failed}
        </span>
      ) : null}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? labels.copied : state === "failed" ? labels.failed : ""}
      </span>
    </button>
  );
}
