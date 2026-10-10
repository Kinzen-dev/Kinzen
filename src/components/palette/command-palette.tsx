"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PaletteData } from "./palette-data";
import type { PaletteDialog, PaletteHandle } from "./palette-dialog";
import "./palette.css";
import { plain } from "@/lib/thai-plain";
import { track } from "@/lib/analytics";

const loadDialog = () => import("./palette-dialog");
/** Fetch the dialog early (page idle, hover, focus, a held Cmd/Ctrl), so the first open only renders it. */
const warm = () => void loadDialog().catch(() => {});

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

const noSubscribe = () => () => {};
/** Apple keyboards say Cmd; the server (and everyone else) says Ctrl. */
const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * Cmd/Ctrl+K or the header button opens the command palette. No single-character shortcut
 * (WCAG 2.1.4: a printable key must not fire a feature from anywhere on the page). Only the
 * trigger and the shortcut are in the page bundle; the dialog (palette-dialog.tsx) is fetched once
 * the page is idle (or on intent) and rendered on the first open request.
 */
export function CommandPalette({ data }: { data: PaletteData }) {
  const { labels } = data;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const handle = useRef<PaletteHandle>(null);
  const [Dialog, setDialog] = useState<typeof PaletteDialog | null>(null);
  const apple = useSyncExternalStore(noSubscribe, isApple, () => false);
  const shortcut = apple ? "⌘K" : "Ctrl K";

  const open = useCallback(() => {
    track("palette_open");
    // Mounting the dialog opens it; once mounted, it opens through its handle. A chunk that
    // fails to load (offline) leaves the trigger inert, like any other unreachable page.
    if (handle.current) handle.current.open();
    else loadDialog().then((m) => setDialog(() => m.PaletteDialog), () => {});
  }, []);

  // Off the critical path: once the page is idle (Safari has no idle callback: a timer).
  useEffect(() => {
    const w = window as IdleWindow;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(warm, 2000);
    return () => window.clearTimeout(id);
  }, []);

  // Cmd/Ctrl+K anywhere (a modified key, so it never collides with typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Meta" || e.key === "Control") warm();
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        if (dialogRef.current?.open) dialogRef.current.close();
        else open();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        onPointerEnter={warm}
        onFocus={warm}
        aria-haspopup="dialog"
        aria-label={plain(labels.trigger)}
        aria-keyshortcuts="Meta+K Control+K"
        title={`${plain(labels.trigger)} (${shortcut})`}
        className="flex h-9 items-center gap-2 rounded-full px-2.5 text-ink-2 transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--ink)_7%,transparent)] hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[18px]"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="m15 15 4.5 4.5" />
        </svg>
        <span aria-hidden="true" className="hidden lg:inline">
          {/* Both chords share one grid cell, so swapping to ⌘K after hydration never resizes the header. */}
          <kbd className="palette-kbd palette-kbd-chord">
            <span data-on={apple ? undefined : ""}>Ctrl K</span>
            <span data-on={apple ? "" : undefined}>⌘K</span>
          </kbd>
        </span>
      </button>

      {Dialog ? <Dialog data={data} handle={handle} dialogRef={dialogRef} triggerRef={triggerRef} /> : null}
    </>
  );
}
