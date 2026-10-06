"use client";

import { useRef } from "react";

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

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="grid size-9 place-items-center text-ink-2 hover:text-ink lg:hidden"
        aria-label={labels.open}
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

      <dialog
        ref={ref}
        aria-label={labels.nav}
        className="mobile-nav m-0 h-dvh max-h-none w-full max-w-none border-0 bg-ground p-0 text-ink backdrop:bg-transparent lg:hidden"
      >
        <div className="shell flex h-[var(--header-h)] items-center justify-between border-b border-rule">
          <span className="font-semibold tracking-[-0.02em]">KINZEN</span>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="grid size-9 place-items-center text-ink-2 hover:text-ink"
            aria-label={labels.close}
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
        <nav aria-label={labels.nav} className="shell">
          <ul>
            {items.map((item) => (
              <li key={item.href} className="border-b border-rule">
                <a
                  href={item.href}
                  onClick={() => ref.current?.close()}
                  className="mobile-nav-link block py-4 text-2xl font-semibold tracking-[-0.03em]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
}
