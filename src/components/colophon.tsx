"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";

/** Sum of bytes actually transferred for this page, from Resource Timing. */
function measurePageWeight(): number {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const bytes = (e: PerformanceResourceTiming) => e.transferSize || e.encodedBodySize || 0;
  return (nav ? bytes(nav) : 0) + resources.reduce((sum, r) => sum + bytes(r), 0);
}

const BUILT = new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-10-06");

function formatKB(bytes: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-GB", { maximumFractionDigits: 0 }).format(bytes / 1024);
}

export function Colophon({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [weight, setWeight] = useState<number | null>(null);
  const commit = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "local";
  const built = BUILT;
  const builtLabel = new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-gregory" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(built);

  useEffect(() => {
    const update = () => setWeight(measurePageWeight());
    // Measure after load settles, then once more when lazy assets have arrived.
    const first = window.setTimeout(update, 1200);
    const second = window.setTimeout(update, 6000);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, []);

  return (
    <p className="readout max-w-prose">
      {dict.colophon.weighs}{" "}
      <span className="text-ink" aria-live="polite">
        {weight === null ? dict.colophon.measuring : `${formatKB(weight, locale)} KB`}
      </span>
      . {dict.colophon.built} {builtLabel} {dict.colophon.from}{" "}
      <a className="link" href={`https://github.com/Kinzen-dev/Kinzen/commit/${commit}`}>
        {commit}
      </a>
      . {dict.colophon.fonts}
    </p>
  );
}
