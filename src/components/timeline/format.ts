import type { Locale } from "@/content/schema";

/** "Oct 2019" / "ต.ค. 2019" from a YYYY-MM string. Gregorian years on both locales. */
export function monthYear(value: string, locale: Locale) {
  const [y, m] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-gregory" : "en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(Date.UTC(y, m - 1, 1))
    .replace(" ", "\u00a0"); // month and year never split across lines
}
