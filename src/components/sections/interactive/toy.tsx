"use client";

import type { ReactNode, Ref } from "react";
import { nobr } from "@/lib/thai-nodes";
import "./toy.css";

/**
 * The dark stage gold-toss and thock share: the engine mounts its canvas into `stageRef`, which is
 * also the keyboard target (role application, so its keys reach the toy); a quiet in-world prompt
 * sits bottom left.
 */
export function ToyStage({
  label,
  stageRef,
  hint,
  children,
}: {
  label: string;
  stageRef: Ref<HTMLDivElement>;
  hint: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="ix-card" data-scene="dark">
      <div ref={stageRef} className="ix-stage" role="application" aria-label={label} tabIndex={0} />
      <p className="ix-hint" aria-hidden="true">
        {hint}
      </p>
      {children}
    </div>
  );
}

export const hintText = (text: string, gone: boolean) => <span data-gone={gone || undefined}>{nobr(text)}</span>;
