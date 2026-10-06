"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { neutralPath } from "@/lib/site-url";

/** The logo link. Already home: scroll back to the top instead of doing nothing. */
export function HomeLink({
  href,
  className,
  label,
  children,
}: {
  href: string;
  className?: string;
  label: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      onClick={(e) => {
        if (neutralPath(pathname) !== "/") return;
        e.preventDefault();
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        if (window.location.hash) window.history.replaceState(null, "", href);
        document.getElementById("main")?.focus({ preventScroll: true });
      }}
    >
      {children}
    </Link>
  );
}
