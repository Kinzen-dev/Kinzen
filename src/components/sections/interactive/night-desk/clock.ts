/**
 * Bangkok time for the window. `?bkk=HH:MM` in the URL pins the clock (lab QA and King's
 * preview); otherwise it is the real Asia/Bangkok wall clock.
 */

export type Phase = "night" | "dawn" | "day" | "dusk";

/** Light at the window for one moment, all 0..1. */
export type Sky = {
  /** Hours since Bangkok midnight, fractional. */
  hours: number;
  /** 1 at full day, 0 at full night. */
  day: number;
  /** Peaks at sunrise and sunset (warm tint). */
  glow: number;
  /** Rain on the glass: heavier deep in the night. */
  rain: number;
  phase: Phase;
};

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function pinned(): number | null {
  if (typeof location === "undefined") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get("bkk") ?? "");
  return m ? (Number(m[1]) % 24) + Number(m[2]) / 60 : null;
}

const PIN = pinned();

/** Fractional Bangkok hours right now (or the pinned time). */
export function bangkokHours(now = new Date()): number {
  if (PIN !== null) return PIN;
  const parts = fmt.formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") + get("minute") / 60 + get("second") / 3600;
}

export function clockText(hours: number): string {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Bangkok sits near 14°N: sunrise about 06:10, sunset about 18:10 all year. */
export function skyAt(hours: number): Sky {
  const h = ((hours % 24) + 24) % 24;
  const day = smooth(5.6, 7.0, h) * (1 - smooth(17.7, 19.1, h));
  const glow = Math.max(Math.exp(-(((h - 6.3) / 0.7) ** 2)), Math.exp(-(((h - 18.3) / 0.7) ** 2)));
  // Rain builds through the night and eases off before dawn.
  const night = 1 - day;
  const rain = night * (0.55 + 0.45 * Math.max(smooth(20, 23.5, h), 1 - smooth(1, 5.5, h)));
  const phase: Phase = day > 0.85 ? "day" : glow > 0.35 ? (h < 12 ? "dawn" : "dusk") : "night";
  return { hours: h, day, glow, rain, phase };
}
