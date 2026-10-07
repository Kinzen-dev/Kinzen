"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { locales, type Locale } from "@/content/schema";
import { localePath, neutralPath } from "@/lib/site-url";
import { plain } from "@/lib/thai";

export function LanguageSwitch({
  locale,
  labels,
  label,
}: {
  locale: Locale;
  labels: Record<Locale, string>;
  label: string;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const path = neutralPath(pathname);

  return (
    <nav aria-label={plain(label)} className="flex items-center text-sm">
      {locales.map((target, i) => (
        <span key={target} className="flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="text-ink-3">
              /
            </span>
          )}
          <Link
            href={localePath(target, path)}
            onClick={(e) => {
              // Keep the reader's place on every page: same scroll position, no jump to the
              // top and no stale #hash from an earlier jump.
              e.preventDefault();
              router.push(localePath(target, path), { scroll: false });
            }}
            hrefLang={target}
            lang={target}
            aria-current={target === locale ? "true" : undefined}
            className={`relative inline-grid h-9 min-w-9 place-items-center rounded-full px-1.5 ${target === locale ? "text-ink" : "text-ink-3 transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--ink)_7%,transparent)] hover:text-ink"}`}
          >
            {target === "en" ? "EN" : "TH"}
            <span className="sr-only"> {labels[target]}</span>
          </Link>
        </span>
      ))}
    </nav>
  );
}
