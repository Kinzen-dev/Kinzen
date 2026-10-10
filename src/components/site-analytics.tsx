"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** Set on the owner's own devices (open any page with ?notrack=1; ?notrack=0 undoes it). */
const KEY = "kz-notrack";

/**
 * Visits that are not a visitor never reach the counts: the owner's own devices (flagged once
 * per browser) and automated browsers (navigator.webdriver: the lab, e2e and review runs).
 * Decided per event, so the flag holds from the first page view of the visit that sets it.
 */
function counted(): boolean {
  try {
    if (navigator.webdriver) return false;
    const param = new URLSearchParams(window.location.search).get("notrack");
    if (param === "1") localStorage.setItem(KEY, "1");
    if (param === "0") localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) !== "1";
  } catch {
    // Storage blocked: an automated browser is still left out above; a person is counted.
    return true;
  }
}

function keep<E>(event: E): E | null {
  return counted() ? event : null;
}

export function SiteAnalytics() {
  // A quiet confirmation for the owner when the switch is used, so the phone shows it took.
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("notrack");
    if (param !== "1" && param !== "0") return;
    counted();
    // After hydration, never during it: the server rendered no note.
    const show = window.setTimeout(
      () =>
        setNote(param === "1" ? "This browser is no longer counted in analytics." : "This browser is counted again."),
      0,
    );
    const hide = window.setTimeout(() => setNote(null), 5000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  return (
    <>
      <Analytics beforeSend={keep} />
      <SpeedInsights beforeSend={keep} />
      {note ? (
        <p role="status" className="site-analytics-note">
          {note}
        </p>
      ) : null}
    </>
  );
}
