"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { localePath, neutralPath } from "@/lib/site-url";
import { rank } from "./fuzzy";
import type { PaletteCommand, PaletteData } from "./palette-data";
import "./palette.css";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']") !== null;
}

function currentTheme(): "light" | "dark" {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === "light" || pinned === "dark") return pinned;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}

/**
 * Cmd/Ctrl+K or "/" opens a native modal dialog holding an ARIA combobox and
 * listbox. Additive only: every command here also exists as a visible link or
 * control elsewhere on the site.
 */
export function CommandPalette({ data }: { data: PaletteData }) {
  const { labels } = data;
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (cmd: PaletteCommand) => `${uid}-${cmd.id}`;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [announcement, setAnnouncement] = useState("");

  const commands = useMemo(
    () =>
      data.commands.map((cmd) =>
        cmd.id === "toggle-theme" ? { ...cmd, label: theme === "dark" ? labels.themeLight : labels.themeDark } : cmd,
      ),
    [data.commands, theme, labels.themeLight, labels.themeDark],
  );
  const results = useMemo(() => rank(commands, query), [commands, query]);
  const searching = query.trim().length > 0;
  const activeCmd = results[Math.min(active, results.length - 1)];

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    const focused = document.activeElement;
    returnFocusRef.current = focused instanceof HTMLElement && focused !== document.body ? focused : triggerRef.current;
    setQuery("");
    setActive(0);
    setTheme(currentTheme());
    dialog.showModal();
    inputRef.current?.focus();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Global shortcuts: Cmd/Ctrl+K anywhere, "/" when not typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dialog = dialogRef.current;
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        if (dialog?.open) close();
        else open();
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !dialog?.open && !isTypingTarget(e.target)) {
        e.preventDefault();
        open();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Return focus to where the visitor was (the trigger when opened from it).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onClose() {
      const target = returnFocusRef.current ?? triggerRef.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
      else triggerRef.current?.focus({ preventScroll: true });
    }
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  // Keep the active option in view while arrowing through a long list.
  useEffect(() => {
    if (!activeCmd) return;
    document.getElementById(optionId(activeCmd))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCmd]);

  async function run(cmd: PaletteCommand | undefined) {
    if (!cmd) return;
    const here = neutralPath(pathname);

    if (cmd.href) {
      // Nothing to come back to after navigating: land focus on the page, not the old spot.
      returnFocusRef.current = triggerRef.current;
      close();
      router.push(cmd.href);
      return;
    }

    switch (cmd.action) {
      case "copy-email": {
        close();
        if (!data.email) return;
        try {
          await navigator.clipboard.writeText(data.email);
          setAnnouncement("");
          window.setTimeout(() => setAnnouncement(labels.emailCopied), 30);
        } catch {
          window.location.assign(`mailto:${data.email}`);
        }
        return;
      }
      case "toggle-theme":
        toggleTheme();
        close();
        return;
      case "switch-language":
        returnFocusRef.current = triggerRef.current;
        close();
        router.push(localePath(data.otherLocale, here) + window.location.hash);
        return;
      case "print-cv":
        close();
        if (here === "/cv") window.setTimeout(() => window.print(), 60);
        else router.push(`${data.cvPath}?print=1`);
        return;
    }
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Home" && e.ctrlKey) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && e.ctrlKey) {
      e.preventDefault();
      setActive(results.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(activeCmd);
    }
  }

  const option = (cmd: PaletteCommand) => {
    const selected = cmd === activeCmd;
    return (
      <div
        key={cmd.id}
        id={optionId(cmd)}
        role="option"
        aria-selected={selected}
        data-active={selected ? "" : undefined}
        className="palette-option"
        onPointerMove={() => setActive(results.indexOf(cmd))}
        onClick={() => run(cmd)}
      >
        <span className="truncate">{cmd.label}</span>
        {cmd.hint ? <span className="palette-hint">{cmd.hint}</span> : null}
        {searching && !cmd.hint ? <span className="palette-hint">{labels.groups[cmd.group]}</span> : null}
      </div>
    );
  };

  const groups = (["sections", "projects", "actions"] as const)
    .map((group) => ({ group, items: results.filter((c) => c.group === group) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={labels.trigger}
        title={`${labels.trigger} (Ctrl K, /)`}
        className="flex h-9 items-center gap-2 px-2 text-ink-2 transition-colors duration-200 hover:text-ink"
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
          <kbd className="palette-kbd">/</kbd>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="palette"
        aria-label={labels.title}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="palette-panel">
          <div className="palette-field">
            <svg
              viewBox="0 0 24 24"
              className="size-[18px] shrink-0 text-ink-3"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="10.5" cy="10.5" r="6" />
              <path d="m15 15 4.5 4.5" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeCmd ? optionId(activeCmd) : undefined}
              aria-label={labels.placeholder}
              placeholder={labels.placeholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKey}
              className="palette-input"
            />
            <button type="button" onClick={close} className="palette-close" aria-label={labels.close}>
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div id={listId} role="listbox" aria-label={labels.title} className="palette-list">
            {searching
              ? results.map(option)
              : groups.map(({ group, items }) => (
                  <div key={group} role="group" aria-labelledby={`${uid}-g-${group}`}>
                    <div id={`${uid}-g-${group}`} aria-hidden="true" className="palette-group">
                      {labels.groups[group]}
                    </div>
                    {items.map(option)}
                  </div>
                ))}
          </div>
          {results.length === 0 ? <p className="palette-empty">{labels.empty}</p> : null}

          <p role="status" className="sr-only">
            {searching
              ? results.length === 1
                ? labels.resultsOne
                : labels.results.replace("{count}", String(results.length))
              : ""}
          </p>

          <p aria-hidden="true" className="palette-foot readout">
            <span>
              <kbd className="palette-kbd">↑</kbd>
              <kbd className="palette-kbd">↓</kbd> {labels.hintMove}
            </span>
            <span>
              <kbd className="palette-kbd">↵</kbd> {labels.hintRun}
            </span>
            <span>
              <kbd className="palette-kbd">esc</kbd> {labels.hintClose}
            </span>
          </p>
        </div>
      </dialog>

      <span role="status" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
