"use client";

import { useEffect } from "react";

const HOLD_MS = 2500;

/**
 * Touch has no hover: a tap on a tool (an element with `data-tool-host`) shows its brand colour
 * for a moment. Tapping it again, tapping another tool or tapping elsewhere clears it. One
 * delegated listener per page; renders nothing.
 */
export function ToolMarkTap() {
  useEffect(() => {
    let on: HTMLElement | null = null;
    let timer = 0;
    const clear = () => {
      window.clearTimeout(timer);
      on?.removeAttribute("data-tool-on");
      on = null;
    };
    // A click carries no pointer type in every browser yet; the pointerdown before it does.
    let touch = false;
    const onDown = (e: PointerEvent) => {
      touch = e.pointerType === "touch" || e.pointerType === "pen";
    };
    const onClick = (e: MouseEvent) => {
      // Mouse users already have hover; only taps (and pens) toggle.
      if (!touch) return;
      const host = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-tool-host]") : null;
      const same = host === on;
      clear();
      if (!host || same) return;
      on = host;
      host.setAttribute("data-tool-on", "");
      timer = window.setTimeout(clear, HOLD_MS);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("click", onClick);
      clear();
    };
  }, []);
  return null;
}
