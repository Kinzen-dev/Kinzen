import Link from "next/link";
import type { Locale } from "@/content/schema";
import { lastUpdated } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath, prefetchFor } from "@/lib/site-url";
import { Colophon } from "./colophon";

const BUILT = new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-10-06");

/** "2026-10" as "Oct 2026" / "ต.ค. 2026" (AD years, short Thai month); the machine value stays on <time>. */
function monthLabel(yearMonth: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-gregory" : "en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${yearMonth.slice(0, 7)}-01T00:00:00Z`));
}

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = BUILT.getFullYear();
  const privacy = localePath(locale, "/privacy");

  return (
    <footer className="mt-24 border-t border-rule">
      <div className="shell grid gap-4 py-8 text-sm text-ink-3 md:grid-cols-[1fr_auto] md:items-end">
        <Colophon locale={locale} labels={dict.colophon} />
        <p className="readout md:text-right">
          © {year} {dict.footer.rights}
          {locale === "th" ? " " : ". "}
          {dict.footer.updated} <time dateTime={lastUpdated}>{monthLabel(lastUpdated, locale)}</time>
          {locale === "th" ? " " : ". "}
          <Link href={privacy} prefetch={prefetchFor(privacy)} className="link">
            {dict.colophon.privacy}
          </Link>
        </p>
      </div>
    </footer>
  );
}
