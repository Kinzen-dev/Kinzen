"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { plain } from "@/lib/thai";

/**
 * Full-screen phone menu as a modal <dialog>: the page behind is inert (focus stays in
 * the menu), Esc closes, focus returns to the trigger, scrolling the page is locked
 * (see `html:has(dialog[open])` in globals.css), and any link closes it.
 */
export function MobileNav({
  items,
  labels,
}: {
  items: { href: string; label: string }[];
  labels: { open: string; close: string; nav: string };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          ref.current?.showModal();
          setOpen(true);
        }}
        aria-expanded={open}
        className="nav-icon grid text-ink-2 hover:text-ink lg:hidden"
        aria-label={plain(labels.open)}
        aria-haspopup="dialog"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 8h16M4 16h16" />
        </svg>
      </button>

      <dialog ref={ref} aria-label={plain(labels.nav)} className="mobile-nav lg:hidden" data-scene="page">
        {/* Bottom sheet (v3): grab handle, title row, big tap targets, safe-area aware. */}
        <span aria-hidden="true" className="mobile-nav-handle" />
        <div className="flex items-center justify-between px-[var(--inset-card)] pt-2 pb-3">
          <span className="font-semibold tracking-[-0.02em]">KINZEN</span>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="grid size-11 place-items-center rounded-full text-ink-2 hover:text-ink"
            aria-label={plain(labels.close)}
          >
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
        <nav
          aria-label={plain(labels.nav)}
          className="px-[var(--inset-card)] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <ul>
            {items.map((item) => (
              <li key={item.href} className="border-b border-rule">
                {/* next/link, not <a>: a native hash navigation adds a history entry the router
                    cannot restore, so Back from a project page would leave the old page on screen. */}
                <Link
                  href={item.href}
                  onClick={() => ref.current?.close()}
                  className="mobile-nav-link block py-4 text-2xl font-semibold tracking-[-0.03em]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
}
