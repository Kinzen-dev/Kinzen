"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { plain } from "@/lib/thai";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/** Browser chrome (address bar) colour must follow a chosen theme, not only the system one. */
export const THEME_COLOR = { dark: "#14120f", light: "#f5f1ea" } as const;
function paintThemeColor(theme: Theme) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = THEME_COLOR[theme];
  });
}

function currentTheme(): Theme {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === "light" || pinned === "dark") return pinned;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ labels }: { labels: { toggle: string; light: string; dark: string } }) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);

  // Switching language swaps the root layout on the client, which rebuilds <html> without
  // re-running the pre-paint theme script: re-apply the stored choice before paint.
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if ((stored === "light" || stored === "dark") && document.documentElement.dataset.theme !== stored) {
        document.documentElement.dataset.theme = stored;
      }
      if (stored === "light" || stored === "dark") paintThemeColor(stored);
    } catch {
      /* storage blocked: follow the system */
    }
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    paintThemeColor(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: the choice lasts for this page only */
    }
  }

  const label = theme === "dark" ? labels.light : labels.dark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={plain(theme ? label : labels.toggle)}
      title={plain(theme ? label : labels.toggle)}
      className="nav-icon grid text-ink-2 transition-colors duration-200 hover:text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[18px]"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="8.25" />
        <path d="M12 3.75a8.25 8.25 0 0 1 0 16.5Z" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
