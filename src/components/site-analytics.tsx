"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { counted, loadPostHog, PH_KEY } from "@/lib/analytics";

function keep<E>(event: E): E | null {
  return counted() ? event : null;
}

export function SiteAnalytics() {
  useEffect(() => {
    if (!PH_KEY) return;
    const start = () => loadPostHog();
    const ric = window.requestIdleCallback;
    if (ric) {
      const id = ric(start, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(start, 2500);
    return () => window.clearTimeout(t);
  }, []);

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
