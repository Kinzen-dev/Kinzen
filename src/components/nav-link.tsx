"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { prefetchFor } from "@/lib/site-url";
import type { ComponentProps } from "react";

/** Header link that marks itself as the current page (CV); section anchors never do. */
export function NavLink({ href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const pathname = usePathname();
  const current = !href.includes("#") && pathname === href;
  return <Link href={href} prefetch={prefetchFor(href)} aria-current={current ? "page" : undefined} {...rest} />;
}
