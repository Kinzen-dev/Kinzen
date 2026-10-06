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
            <span aria-hidden="true" className="px-1.5 text-ink-3">
              /
            </span>
          )}
          <Link
            href={localePath(target, path)}
            onClick={(e) => {
              // Keep the reader's place: land on the section they are reading now (not a
              // stale #hash from an earlier jump, and not the top of the page).
              const sections = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));
              const line = window.innerHeight * 0.35;
              const current = sections.filter((el) => el.getBoundingClientRect().top <= line).pop();
              if (!current || window.scrollY < 80) return;
              e.preventDefault();
              router.push(`${localePath(target, path)}#${current.id}`);
            }}
            hrefLang={target}
            lang={target}
            aria-current={target === locale ? "true" : undefined}
            className={target === locale ? "text-ink" : "text-ink-3 transition-colors duration-200 hover:text-ink"}
          >
            {target === "en" ? "EN" : "TH"}
            <span className="sr-only"> {labels[target]}</span>
          </Link>
        </span>
      ))}
    </nav>
  );
}
