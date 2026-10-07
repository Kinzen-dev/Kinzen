import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";

const BUILT = new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-10-06");

/** Only a real git SHA is linked (next.config leaves the variable empty when none is known). */
const RAW_COMMIT = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "";
const COMMIT = /^[0-9a-f]{7,40}$/.test(RAW_COMMIT) ? RAW_COMMIT : null;

/** Build date, the commit it was built from (when known) and the fonts. Server-rendered. */
export function Colophon({ locale, labels }: { locale: Locale; labels: Dictionary["colophon"] }) {
  // Thai separates sentences with a space, not a full stop.
  const stop = locale === "th" ? " " : ". ";
  const builtLabel = new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-gregory" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(BUILT);

  return (
    <p className="readout max-w-prose">
      {labels.built} <time dateTime={BUILT.toISOString()}>{builtLabel}</time>
      {COMMIT ? (
        <>
          {" "}
          {labels.from}{" "}
          <a className="link" href={`https://github.com/Kinzen-dev/Kinzen/commit/${COMMIT}`}>
            {COMMIT.slice(0, 7)}
          </a>
        </>
      ) : null}
      {stop}
      {labels.fonts}
    </p>
  );
}
