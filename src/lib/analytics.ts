// Who is counted, and the named product events. Shared by the analytics component and by the
// sections that report an action (a view picked, a scene played, the palette opened).

/** Set on the owner's own devices (open any page with ?notrack=1; ?notrack=0 undoes it). */
const KEY = "kz-notrack";

/**
 * Visits that are not a visitor never reach the counts: the owner's own devices (flagged once
 * per browser), automated browsers (navigator.webdriver: the lab, e2e and review runs) and
 * browsers sending Global Privacy Control.
 * Decided per event, so the flag holds from the first page view of the visit that sets it.
 */
export function counted(): boolean {
  try {
    if (navigator.webdriver) return false;
    // Global Privacy Control: the visitor asked not to be tracked.
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return false;
    const param = new URLSearchParams(window.location.search).get("notrack");
    if (param === "1") localStorage.setItem(KEY, "1");
    if (param === "0") localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) !== "1";
  } catch {
    // Storage blocked: an automated browser is still left out above; a person is counted.
    return true;
  }
}

/**
 * PostHog (detailed actions: clicks, view switches, scenes played, scroll depth). Inert unless
 * NEXT_PUBLIC_POSTHOG_KEY is set at build time. Cookieless (no cookie, no storage; PostHog counts
 * visitors with a server-side hash), no person profiles, no session recording. Loaded after the
 * page is idle so it never costs the first paint; the owner and automated browsers are dropped.
 */
export const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

type Track = (event: string, props?: Record<string, string | number | boolean>) => void;
let send: Track | null = null;
const early: [string, Record<string, string | number | boolean> | undefined][] = [];

/** Named product events (a view picked, a scene played). Queued until PostHog has loaded. */
export const track: Track = (event, props) => {
  if (!PH_KEY) return;
  if (send) send(event, props);
  else if (early.length < 50) early.push([event, props]);
};

export function loadPostHog() {
  // Production only: previews and local builds never reach the numbers.
  if (!PH_KEY || !counted() || window.location.hostname !== "www.kinzen.dev") return;
  void import("posthog-js").then(({ default: posthog }) => {
    posthog.init(PH_KEY, {
      api_host: PH_HOST,
      defaults: "2026-08-30",
      cookieless_mode: "always",
      person_profiles: "never",
      persistence: "memory",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      advanced_disable_flags: true,
      capture_performance: false,
      before_send: (event) => (counted() ? event : null),
    });
    // One PostHog project holds both sites (kinzen.dev, vesperwerk.com): every event says which.
    posthog.register({ site: "kinzen.dev" });
    send = (event, props) => void posthog.capture(event, props);
    for (const [event, props] of early.splice(0)) send(event, props);
  });
}
