"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { localePath, neutralPath } from "@/lib/site-url";
import { rank } from "./fuzzy";
import type { PaletteCommand, PaletteData } from "./palette-data";
import "./palette-dialog.css";
import { plain } from "@/lib/thai-plain";

export type PaletteHandle = { open: () => void };

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
 * The palette itself: a native modal dialog holding an ARIA combobox and listbox. Loaded on the
 * first open request (command-palette.tsx owns the trigger and the shortcut), and opens as it
 * mounts. Additive only: every command here also exists as a visible link or control elsewhere
 * on the site.
 */
export function PaletteDialog({
  data,
  handle,
  dialogRef,
  triggerRef,
}: {
  data: PaletteData;
  handle: RefObject<PaletteHandle | null>;
  dialogRef: RefObject<HTMLDialogElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { labels } = data;
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (cmd: PaletteCommand) => `${uid}-${cmd.id}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  /** Set when a command moves focus itself (same-page section jump). */
  const skipReturnRef = useRef(false);

  // Only ever rendered on the client (after an open request), so the first render can read the theme.
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme);
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

  /** Show the dialog; the state it shows is already fresh (first mount, or `open` reset it). */
  const show = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    const focused = document.activeElement;
    returnFocusRef.current = focused instanceof HTMLElement && focused !== document.body ? focused : triggerRef.current;
    dialog.showModal();
    inputRef.current?.focus();
  }, [dialogRef, triggerRef]);

  const open = useCallback(() => {
    if (dialogRef.current?.open) return;
    setQuery("");
    setActive(0);
    setTheme(currentTheme());
    show();
  }, [dialogRef, show]);

  useImperativeHandle(handle, () => ({ open }), [open]);

  // Mounting is the first open request.
  useEffect(() => show(), [show]);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, [dialogRef]);

  // Return focus to where the visitor was (the trigger when opened from it).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onClose() {
      if (skipReturnRef.current) {
        skipReturnRef.current = false;
        return;
      }
      const target = returnFocusRef.current ?? triggerRef.current;
      if (target?.isConnected) target.focus({ preventScroll: true });
      else triggerRef.current?.focus({ preventScroll: true });
    }
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [dialogRef, triggerRef]);

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
      const url = new URL(cmd.href, window.location.href);
      if (url.pathname === window.location.pathname && url.hash) {
        // Same page: close first (the dialog would otherwise hand focus back to the
        // trigger), then jump; the hashchange moves focus to the section.
        skipReturnRef.current = true;
        close();
        // Through the router (not location.assign): native hash entries break Back later.
        router.push(cmd.href);
        window.setTimeout(() => {
          const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
          if (!target) return;
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }, 80);
        return;
      }
      // Another page: no focus to come back to. Focus starts at the top of the new page (like a
      // link click), never on the header palette button.
      skipReturnRef.current = true;
      close();
      (document.activeElement as HTMLElement | null)?.blur();
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
          // Sighted users see it too (the palette has closed), then it clears.
          window.setTimeout(() => setAnnouncement(""), 3200);
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
      <dialog
        ref={dialogRef}
        className="palette"
        data-scene="page"
        aria-label={plain(labels.title)}
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
              aria-label={plain(labels.placeholder)}
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
            <button type="button" onClick={close} className="palette-close" aria-label={plain(labels.close)}>
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

          <div id={listId} role="listbox" aria-label={plain(labels.title)} className="palette-list">
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

      <span role="status" className={announcement ? "palette-toast" : "sr-only"}>
        {announcement}
      </span>
    </>
  );
}
