"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { TextCycler } from "@/motion/text-cycler";
import { DrawPath } from "@/motion/draw-path";
import { Sweep } from "@/motion/loops";

/** A marker stroke with a small return flick: hand-drawn, wider than tall (viewBox 600 x 28). */
const UNDERLINE = "M6 17 C 120 9 250 6 390 9 C 470 11 540 13 594 9 M520 21 C 548 19 570 18 588 16";

/**
 * "I build" + a cycling phrase with a gold underline that draws itself under each new phrase.
 * The underline follows the visible phrase's last line (x, width, baseline) with transforms only:
 * it is measured once per phrase change (a MutationObserver on the cycler) and on resize, never per
 * frame. Every phrase change remounts the stroke so it draws again. Reduced motion: the cycler
 * holds the first phrase and the stroke is drawn from the start.
 */
export function HeroKinetic({
  lead,
  word,
  join,
  phrases,
}: {
  lead: ReactNode;
  word: ReactNode;
  join: string;
  phrases: ReactNode[];
}) {
  const box = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useLayoutEffect(() => {
    const host = box.current;
    const u = line.current;
    const stack = host?.querySelector<HTMLElement>(".cycler-stack");
    if (!host || !u || !stack) return;
    const items = Array.from(stack.querySelectorAll<HTMLElement>(".cycler-item"));
    const range = document.createRange();
    const place = () => {
      const on = stack.querySelector<HTMLElement>(".cycler-item[data-on]") ?? items[0];
      if (!on) return;
      range.selectNodeContents(on);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
      if (!rects.length) return;
      // Relative to the phrase's own box: the box is stretched to the stack's cell, and both carry
      // the same entrance translate and hero scale, so the result is in layout terms.
      const b = on.getBoundingClientRect();
      const k = on.offsetWidth ? b.width / on.offsetWidth : 1;
      const bottom = Math.max(...rects.map((r) => r.bottom));
      const last = rects.filter((r) => r.bottom > bottom - 4);
      const left = Math.min(...last.map((r) => r.left));
      const right = Math.max(...last.map((r) => r.right));
      const base = u.offsetWidth || 1;
      u.style.transform = `translate(${(left - b.left) / k}px, ${(bottom - b.bottom) / k}px) scaleX(${(right - left) / k / base})`;
      setN(Math.max(0, items.indexOf(on)));
    };
    place();
    const mo = new MutationObserver(place);
    mo.observe(stack, { subtree: true, attributes: true, attributeFilter: ["data-on"] });
    const ro = new ResizeObserver(place);
    ro.observe(stack);
    void document.fonts?.ready.then(place);
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <p className="hero-kinetic" data-hero-kinetic>
      <span className="hero-kinetic-lead">
        {lead}
        {join}
        <Sweep>{word}</Sweep>
      </span>{" "}
      {/* One display line when it fits ("I build" + the widest phrase); otherwise the phrase box
          wraps as a whole, the same for every phrase, so cycling never reflows. */}
      <span ref={box} className="hero-kinetic-phrase">
        <TextCycler phrases={phrases} ms={2800} />
        <span ref={line} className="hero-underline" aria-hidden="true">
          <DrawPath
            key={n}
            d={UNDERLINE}
            viewBox="0 0 600 28"
            strokeWidth={5}
            ms={650}
            delay={160}
            className="text-gold"
          />
        </span>
      </span>
    </p>
  );
}
