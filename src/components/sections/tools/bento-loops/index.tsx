"use client";

import { useEffect, useRef } from "react";
import { frameLoop, idleMode, onModeChange } from "@/motion/frame-governor";
import { loadMotion } from "@/motion/gsap";
import type { GroupId, ViewProps } from "../types";
import { BentoMarkup } from "./markup";
import { BUILDERS, type Timeline } from "./loops";

type Loop = { tl: Timeline | null; visible: boolean; held: boolean; started: boolean; wait: number };

/**
 * Bento of the six tool groups; every tile loops a small fictional product demo (one GSAP
 * timeline per pass, rebuilt from the finished state each time, so a pass never rewinds).
 * Loops run only in view, start staggered, and pause while hovered, focused or tapped, and while
 * the visitor is idle (the frame governor's light mode: 45 s without input; any input resumes).
 * Each timeline is driven by the frame governor, not GSAP's ticker: 60 fps on phones (a demo loop
 * is a heavy scene there), display rate on desktops, and no frames at all while it is paused.
 * Reduced motion: the markup is the finished frame, so nothing runs and nothing is missing.
 */
export default function BentoLoops({ locale, groups }: ViewProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dead = false;
    const cleanups: (() => void)[] = [];
    const syncs: (() => void)[] = [];
    cleanups.push(onModeChange(() => syncs.forEach((sync) => sync())));

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
        const loop: Loop = { tl: null, visible: false, held: false, started: false, wait: 0 };
        const running = () => loop.visible && !loop.held && idleMode() === "full";
        const pass = (delay: number) => {
          loop.tl?.kill();
          const tl = BUILDERS[id](gsap, tile, light);
          tl.paused(true);
          tl.eventCallback("onUpdate", () => bar && gsap.set(bar, { scaleX: tl.progress() }));
          loop.tl = tl;
          loop.wait = delay;
        };
        const frames = frameLoop({ name: `tools/bento/${id}`, host: tile, heavy: true, wakeOn: null }, ({ dt }) => {
          const tl = loop.tl;
          if (!tl || !running()) return false;
          if (loop.wait > 0) {
            loop.wait -= dt;
            return;
          }
          tl.totalTime(Math.min(tl.totalDuration(), tl.totalTime() + dt));
          if (tl.totalTime() >= tl.totalDuration()) pass(0);
        });
        const sync = () => {
          tile.toggleAttribute("data-held", loop.held);
          if (!running()) return;
          if (!loop.started) {
            loop.started = true;
            pass(0.35 + i * 0.55);
          }
          frames.wake();
        };
        syncs.push(sync);
        // A quarter of the tile in view: a strip left under the header after scrolling on is not
        // worth animating.
        const io = new IntersectionObserver(
          ([e]) => {
            loop.visible = e.isIntersecting && e.intersectionRatio >= 0.25;
            sync();
          },
          { threshold: [0, 0.25] },
        );
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
          frames.stop();
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
