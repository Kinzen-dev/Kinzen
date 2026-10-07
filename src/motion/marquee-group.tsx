"use client";

import { useEffect, useState, type ReactNode } from "react";
import "./marquee.css";

const KEY = "kz-marquee-paused";

/**
 * A set of marquees with a visible pause/resume button (WCAG 2.2.2): hover and focus already
 * pause a row, but only while the pointer or focus stays on it. The choice holds for the tab
 * (session storage, never sent anywhere) and does not undo itself when focus moves on. Under
 * reduced motion the rows are static and the button is hidden.
 */
export function MarqueeGroup({
  children,
  className,
  labels,
}: {
  children: ReactNode;
  className?: string;
  labels: { pause: ReactNode; resume: ReactNode };
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    try {
      // Restoring persisted UI state after hydration is a sync from an external store.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (sessionStorage.getItem(KEY) === "1") setPaused(true);
    } catch {
      /* storage blocked: starts moving, the button still works */
    }
  }, []);

  const toggle = () => {
    const next = !paused;
    setPaused(next);
    try {
      if (next) sessionStorage.setItem(KEY, "1");
      else sessionStorage.removeItem(KEY);
    } catch {
      /* storage blocked: the choice lasts for this page only */
    }
  };

  return (
    <div className="marquee-group" data-paused={paused || undefined}>
      <div className="shell marquee-controls">
        <button type="button" onClick={toggle} className="marquee-toggle">
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true" fill="currentColor">
            {paused ? <path d="M4 2.5v11l9-5.5z" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />}
          </svg>
          {paused ? labels.resume : labels.pause}
        </button>
      </div>
      <div aria-hidden="true" className={className}>
        {children}
      </div>
    </div>
  );
}
