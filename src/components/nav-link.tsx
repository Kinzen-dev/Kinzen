"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { prefetchFor } from "@/lib/site-url";
import type { ComponentProps } from "react";

/**
 * Where a header item points from the current page: a home-section anchor ("/#work") on the
 * home page, its `elsewhere` page (the /work index) on every other page.
 */
export function navTarget(pathname: string | null, href: string, elsewhere?: string): string {
  if (!elsewhere || !href.includes("#")) return href;
  const home = href.split("#")[0] || "/";
  return pathname === home ? href : elsewhere;
}

/** Header link that marks itself as the current page (CV, the /work index); anchors never do. */
export function NavLink({
  href,
  elsewhere,
  ...rest
}: ComponentProps<typeof Link> & { href: string; elsewhere?: string }) {
  const pathname = usePathname();
  const target = navTarget(pathname, href, elsewhere);
  const current = !target.includes("#") && pathname === target;
  return <Link href={target} prefetch={prefetchFor(target)} aria-current={current ? "page" : undefined} {...rest} />;
}
