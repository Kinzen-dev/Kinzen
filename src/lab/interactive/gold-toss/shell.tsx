"use client";

import type { ReactNode, Ref } from "react";
import { nobr } from "@/lib/thai-nodes";
import "./ix.css";

export type ShellCopy = {
  kicker: string;
  title: string;
  lede: string;
  soundOn: string;
  soundOff: string;
  stage: string;
};

/**
 * The section frame both lab-ix-b toys share: a kicker, the heading, one line of instruction, and
 * the dark stage card with the sound toggle in its corner. Sound is off until the visitor turns it on.
 */
export function ToyShell({
  id,
  copy,
  sound,
  onSound,
  stageRef,
  hint,
  children,
  className,
}: {
  id: string;
  copy: ShellCopy;
  sound: boolean;
  onSound: () => void;
  stageRef: Ref<HTMLDivElement>;
  /** A small caption over the stage (the in-world prompt). */
  hint?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={["ix shell", className].filter(Boolean).join(" ")} aria-labelledby={`${id}-title`}>
      <header className="ix-head">
        <p className="ix-kicker">
          <i aria-hidden="true" />
          {nobr(copy.kicker)}
        </p>
        <h2 id={`${id}-title`} className="ix-title">
          {nobr(copy.title)}
        </h2>
        <p className="ix-lede">{nobr(copy.lede)}</p>
      </header>
      <div className="ix-card scene-card" data-scene="dark">
        <div ref={stageRef} className="ix-stage" role="application" aria-label={copy.stage} tabIndex={0} />
        {hint ? (
          <p className="ix-hint" aria-hidden="true">
            {hint}
          </p>
        ) : null}
        <button type="button" className="ix-sound" aria-pressed={sound} onClick={onSound}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
            {sound ? (
              <path className="ix-wave" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />
            ) : (
              <path className="ix-wave" d="M16 9.5l5 5M21 9.5l-5 5" />
            )}
          </svg>
          <span>{sound ? copy.soundOn : copy.soundOff}</span>
        </button>
        {children}
      </div>
    </section>
  );
}
