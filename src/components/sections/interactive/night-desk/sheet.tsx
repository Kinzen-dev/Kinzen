"use client";

import { useEffect, useRef, useState } from "react";
import { nobr } from "@/lib/thai-nodes";
import { AGENTS, SCRIPT, type Copy } from "./copy";

/**
 * The monitor as a full-screen sheet (phones and reduced motion): the same three agents and
 * script as the 3D screen, typed line by line (all at once under reduced motion).
 */
export function AgentSheet({ copy, still, onClose }: { copy: Copy; still: boolean; onClose: () => void }) {
  const [task, setTask] = useState(0);
  const [shown, setShown] = useState(still ? SCRIPT[0].length : 0);
  const close = useRef<HTMLButtonElement>(null);
  const lines = SCRIPT[task];

  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    if (still) return;
    const id = window.setTimeout(
      () => {
        if (shown < lines.length) setShown(shown + 1);
        else {
          setTask((task + 1) % SCRIPT.length);
          setShown(0);
        }
      },
      shown < lines.length ? (lines[shown]?.kind === "hand" ? 900 : 520) : 2600,
    );
    return () => window.clearTimeout(id);
  }, [shown, task, lines, still]);

  const busy = lines[Math.max(0, shown - 1)]?.pane ?? 0;
  return (
    <div className="nd-sheet" role="dialog" aria-modal="true" aria-labelledby="nd-sheet-title">
      <div className="nd-sheet-head">
        <div>
          <h3 id="nd-sheet-title">{nobr(copy.agentsTitle)}</h3>
          <p>{nobr(copy.agentsNote)}</p>
        </div>
        <button ref={close} type="button" className="nd-sheet-close" onClick={onClose} aria-label={copy.close}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5l9 9m0-9l-9 9" />
          </svg>
        </button>
      </div>
      <div className="nd-panes">
        {AGENTS.map((a, p) => (
          <section key={a} className="nd-pane" data-busy={p === busy || undefined} aria-label={a}>
            <header>
              <i aria-hidden="true" />
              {a}
            </header>
            <ol>
              {lines.slice(0, shown).map((l, i) =>
                l.pane === p ? (
                  <li key={`${task}-${i}`} data-kind={l.kind}>
                    {l.kind === "cmd" ? "$ " : ""}
                    {l.text}
                  </li>
                ) : null,
              )}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
