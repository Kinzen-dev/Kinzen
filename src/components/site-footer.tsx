import type { Locale } from "@/content/schema";
import { lastUpdated } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { Colophon } from "./colophon";

const BUILT = new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-10-06");

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = BUILT.getFullYear();

  return (
    <footer className="mt-24 border-t border-rule">
      <div className="shell grid gap-4 py-8 text-sm text-ink-3 md:grid-cols-[1fr_auto] md:items-end">
        <Colophon locale={locale} dict={dict} />
        <p className="readout md:text-right">
          © {year} {dict.footer.rights}
          {locale === "th" ? " " : ". "}
          {dict.footer.updated} {lastUpdated}
          {locale === "th" ? "" : "."}
        </p>
      </div>
    </footer>
  );
}
