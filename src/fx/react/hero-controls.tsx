"use client";

import { useSyncExternalStore } from "react";
import { stageStore } from "../sequence/store";

/**
 * The hero sequence's quiet controls, top right of the hero under the header: one dot per scene
 * (the one on stage drawn as a short gold bar) and a pause/play button, so the looping motion can
 * be stopped (WCAG 2.2.2). Rendered only while the sequence runs: nothing without scripting or
 * under reduced motion, where the hero is a still picture. Absolutely placed: no layout shift.
 */
export function HeroControls({ pause, play }: { pause: string; play: string }) {
  const s = useSyncExternalStore(stageStore.subscribe, stageStore.get, stageStore.server);
  if (!s.running) return null;
  return (
    <div className="hero-stage-controls" data-hero-controls="">
      {s.scenes.length > 1 ? (
        <ol className="hero-stage-dots" aria-hidden="true">
          {s.scenes.map((id, i) => (
            <li key={id} data-on={i === s.index ? "" : undefined} />
          ))}
        </ol>
      ) : null}
      <button
        type="button"
        className="hero-stage-toggle"
        aria-label={s.paused ? play : pause}
        onClick={() => stageStore.set({ paused: !s.paused })}
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
          {s.paused ? (
            <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" />
          ) : (
            <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </div>
  );
}
