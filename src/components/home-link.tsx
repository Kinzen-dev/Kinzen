"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
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
        // Through the router so the history entry stays restorable by Back.
        if (window.location.hash) router.push(href, { scroll: false });
        document.getElementById("main")?.focus({ preventScroll: true });
      }}
    >
      {children}
    </Link>
  );
}
