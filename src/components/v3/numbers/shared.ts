"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * How long each of the four stats holds in the one-at-a-time views (ms): the replay gets longer,
 * its picture takes about five seconds to play. The sum matches the section's 20 s auto-advance,
 * so a view tells its whole story once before the next one takes the stage.
 */
export const STEP_MS = [4500, 4500, 4500, 6500];

/** True when the visitor asks for less motion (live: the setting can change while on the page). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The step clock of a story view: moves 0, 1, 2, 3, 0 ... after STEP_MS[i], counting only while
 * `play` is true (a pause keeps the time already spent on the step). `go(i)` jumps and restarts
 * that step's time. Never moves under reduced motion.
 */
export function useStep(play: boolean, reduced: boolean): [number, (i: number) => void] {
  const [step, setStep] = useState(0);
  // Time already spent on a step before a pause; only counts for that same step.
  const spent = useRef({ step: 0, ms: 0 });
  useEffect(() => {
    if (!play || reduced) return;
    const t0 = performance.now();
    const before = spent.current.step === step ? spent.current.ms : 0;
    let fired = false;
    const id = window.setTimeout(
      () => {
        fired = true;
        setStep((s) => (s + 1) % STEP_MS.length);
      },
      Math.max(0, STEP_MS[step] - before),
    );
    return () => {
      window.clearTimeout(id);
      spent.current = { step, ms: fired ? 0 : before + performance.now() - t0 };
    };
  }, [play, reduced, step]);
  const go = useCallback((i: number) => {
    spent.current = { step: -1, ms: 0 };
    setStep(i);
  }, []);
  return [step, go];
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number) => x * x * (3 - 2 * x);
