import type { Locale, Project } from "@/content/schema";

export function monthYear(value: string, locale: Locale) {
  const [y, m] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-gregory" : "en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(y, m - 1, 1));
}

/** "May 2026 → present", "Jul 2026 → Aug 2026", or a single month. */
export function periodLabel(period: Project["period"], locale: Locale, present: string) {
  const start = monthYear(period.start, locale);
  if (!period.end || period.end === period.start) return start;
  return `${start} → ${period.end === "present" ? present : monthYear(period.end, locale)}`;
}
