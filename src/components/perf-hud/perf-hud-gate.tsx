"use client";

import { useEffect, useState, type ComponentType } from "react";

type Hud = ComponentType<{ onClose: () => void }>;

const KEY = "kz-perf";

/** ?perf=1 turns the HUD on for this tab, ?perf=0 (or Hide) turns it off; sessionStorage keeps it across loads. */
function wanted(): boolean {
  const q = new URLSearchParams(window.location.search).get("perf");
  try {
    if (q === "1") sessionStorage.setItem(KEY, "1");
    else if (q === "0") sessionStorage.removeItem(KEY);
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return q === "1";
  }
}

/**
 * Mounts the field perf HUD only when asked for. Off (every normal visit) it costs one URL and
 * storage read at mount: no listeners, no timers, no rAF, and the HUD chunk is never fetched.
 */
export function PerfHudGate() {
  const [Hud, setHud] = useState<Hud | null>(null);

  useEffect(() => {
    if (!wanted()) return;
    let live = true;
    import("./perf-hud").then(
      (m) => live && setHud(() => m.PerfHud),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);

  if (!Hud) return null;
  return (
    <Hud
      onClose={() => {
        try {
          sessionStorage.removeItem(KEY);
        } catch {
          // Storage blocked: hiding still works for this page.
        }
        setHud(null);
      }}
    />
  );
}
