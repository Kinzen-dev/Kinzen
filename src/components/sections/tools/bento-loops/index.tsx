"use client";

import { useEffect, useRef } from "react";
import { loadMotion } from "@/motion/gsap";
import type { GroupId, ViewProps } from "../types";
import { BentoMarkup } from "./markup";
import { BUILDERS, type Timeline } from "./loops";

type Loop = { tl: Timeline | null; visible: boolean; held: boolean; started: boolean };

/**
 * Bento of the six tool groups; every tile loops a small fictional product demo (one GSAP
 * timeline per pass, rebuilt from the finished state each time, so a pass never rewinds).
 * Loops run only in view, start staggered, and pause while hovered, focused or tapped.
 * Reduced motion: the markup is the finished frame, so nothing runs and nothing is missing.
 */
export default function BentoLoops({ locale, groups }: ViewProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dead = false;
    const cleanups: (() => void)[] = [];

    void loadMotion().then(({ gsap }) => {
      if (dead) return;
      const tiles = Array.from(el.querySelectorAll<HTMLElement>("[data-tile]"));
      tiles.forEach((tile, i) => {
        const id = tile.dataset.tile as GroupId;
        const chips = Array.from(tile.querySelectorAll<HTMLElement>("[data-tool]"));
        const bar = tile.querySelector<HTMLElement>('[data-x="progress"]');
        const light = (keys: string[]) => {
          for (const chip of chips) chip.toggleAttribute("data-lit", keys.includes(chip.dataset.tool ?? ""));
        };
        const loop: Loop = { tl: null, visible: false, held: false, started: false };
        const sync = () => {
          const run = loop.visible && !loop.held;
          tile.toggleAttribute("data-held", loop.held);
          if (run && !loop.started) {
            loop.started = true;
            pass(0.35 + i * 0.55);
          } else loop.tl?.paused(!run);
        };
        const pass = (delay: number) => {
          loop.tl?.kill();
          const tl = BUILDERS[id](gsap, tile, light);
          tl.delay(delay);
          tl.eventCallback("onUpdate", () => bar && gsap.set(bar, { scaleX: tl.progress() }));
          tl.eventCallback("onComplete", () => pass(0));
          loop.tl = tl;
          tl.paused(!(loop.visible && !loop.held));
        };
        const io = new IntersectionObserver(([e]) => {
          loop.visible = e.isIntersecting;
          sync();
        });
        io.observe(tile);
        const hold = () => {
          loop.held = true;
          sync();
        };
        const release = () => {
          loop.held = tile.matches(":hover") || tile.contains(document.activeElement);
          sync();
        };
        const onPointerEnter = (e: PointerEvent) => e.pointerType === "mouse" && hold();
        const onPointerLeave = (e: PointerEvent) => e.pointerType === "mouse" && release();
        // Touch: a tap toggles the pause (there is no hover to leave).
        const onPointerUp = (e: PointerEvent) => {
          if (e.pointerType === "mouse") return;
          loop.held = !loop.held;
          sync();
        };
        const onFocusOut = () => requestAnimationFrame(release);
        tile.addEventListener("pointerenter", onPointerEnter);
        tile.addEventListener("pointerleave", onPointerLeave);
        tile.addEventListener("pointerup", onPointerUp);
        tile.addEventListener("focusin", hold);
        tile.addEventListener("focusout", onFocusOut);
        cleanups.push(() => {
          io.disconnect();
          tile.removeEventListener("pointerenter", onPointerEnter);
          tile.removeEventListener("pointerleave", onPointerLeave);
          tile.removeEventListener("pointerup", onPointerUp);
          tile.removeEventListener("focusin", hold);
          tile.removeEventListener("focusout", onFocusOut);
          loop.tl?.kill();
        });
      });
    });

    return () => {
      dead = true;
      for (const fn of cleanups) fn();
    };
  }, []);

  return <BentoMarkup locale={locale} groups={groups} rootRef={root} />;
}
