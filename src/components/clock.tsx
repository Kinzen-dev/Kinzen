"use client";

import { useSyncExternalStore } from "react";
import "@/motion/primitives.css";

/**
 * Live clock store shared by every clock on the page. `?at=<ISO date>` freezes
 * time so every state can be checked in QA. Server snapshot is null, so the
 * server renders a fixed-width placeholder and nothing shifts on hydration.
 */
let frozen: number | null | undefined;
function frozenTime(): number | null {
  if (frozen !== undefined) return frozen;
  const at = new URLSearchParams(window.location.search).get("at");
  const parsed = at ? Date.parse(at) : NaN;
  frozen = Number.isNaN(parsed) ? null : parsed;
  return frozen;
}

let now = 0;
const listeners = new Set<() => void>();
let timer: number | undefined;

function tick() {
  now = frozenTime() ?? Date.now();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
    if (frozenTime() === null) timer = window.setInterval(tick, 15_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.clearInterval(timer);
  };
}

export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now || null,
    () => null,
  );
}

const BANGKOK = "Asia/Bangkok";

export function BangkokTime({ locale }: { locale: string }) {
  const t = useNow();
  const text =
    t === null
      ? "--:--"
      : new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: BANGKOK,
        }).format(t);
  return (
    <time className="tabular" dateTime={t === null ? undefined : new Date(t).toISOString()}>
      {text}
    </time>
  );
}

/**
 * Bangkok time as odometer digits: each digit is a column that rolls to the new value when the
 * minute changes (and rolls in from 00:00 on first paint). The <time> text is what assistive
 * tech reads; the columns are decorative. Reduced motion: the digits just change.
 */
export function BangkokClockDigits({ locale, className }: { locale: string; className?: string }) {
  const t = useNow();
  const text =
    t === null
      ? null
      : new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: BANGKOK,
        }).format(t);
  const shown = text ?? "00:00";
  return (
    <span className={["odometer tabular", className].filter(Boolean).join(" ")} data-rolled="">
      <time className="sr-only" dateTime={t === null ? undefined : new Date(t).toISOString()}>
        {text ?? "--:--"}
      </time>
      <span aria-hidden="true" className="odometer-digits" data-pending={text === null || undefined}>
        {[...shown].map((ch, i) =>
          /\d/.test(ch) ? (
            <span
              key={i}
              className="odometer-col"
              style={{ ["--d" as string]: ch, ["--i" as string]: shown.length - i }}
            >
              <span className="odometer-strip">0 1 2 3 4 5 6 7 8 9</span>
            </span>
          ) : (
            <span key={i} className="odometer-sep">
              {ch}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

function offsetMinutes(timeZone: string, at: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUTC - Math.floor(at / 60_000) * 60_000) / 60_000);
}

/** "5h ahead of you" relative to the visitor's own time zone. */
export function OffsetFromVisitor({
  labels,
}: {
  labels: { ahead: string; behind: string; same: string; hours: string };
}) {
  const t = useNow();
  if (t === null) return <span aria-hidden="true">&nbsp;</span>;
  const visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const diff = (offsetMinutes(BANGKOK, t) - offsetMinutes(visitorZone, t)) / 60;
  if (diff === 0) return <span>{labels.same}</span>;
  const hours = Math.abs(diff);
  const value = Number.isInteger(hours) ? hours : hours.toFixed(1);
  return (
    <span>
      {value}
      {labels.hours} {diff > 0 ? labels.ahead : labels.behind}
    </span>
  );
}
