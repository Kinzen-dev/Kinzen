"use client";

import { useEffect, useId, useRef } from "react";
import type { Locale } from "@/content/schema";
import { loadMotion } from "@/motion/gsap";
import { Banner } from "../b-banner/banner";
import { useFpsProbe, useReducedMotion, watchVisible } from "../b-banner/hooks";
import { CONTOURS, VIEW, type Group } from "./art-data";
import "./ink-desk.css";

/* ------------------------------------------------------------------
   The site's own ink portrait (public/art/portrait-laptop.svg) draws
   itself. The art is one traced, filled path; split into its contours,
   each contour becomes a thick white stroke inside a mask, and drawing
   those strokes (DrawSVG) uncovers the ink exactly along the lines, so
   the fill appears as if inked by hand. A gold pen tip eases after the
   stroke being drawn. Then a hand-drawn phone rings (anticipation:
   wiggle, squash), a gold line shoots from it into a LINE bubble that
   pops with overshoot. Idle: the line boils like the site's doodles and
   a gold pulse runs from the phone to the bubble now and then.
   ------------------------------------------------------------------ */

const W = 700;
const H = 440;
/** Where the portrait sits inside the composition. */
const ART_X = 24;
const ART_Y = 104;

/** Per-region pacing: how long the hand spends on the region (strokes start evenly inside it), and
 *  the hold after it (a breath before the next region; longest before the face). */
const PACE: Record<Exclude<Group, "outline">, { total: number; hold: number }> = {
  laptop: { total: 0.85, hold: 0.18 },
  body: { total: 1.3, hold: 0.38 },
  head: { total: 1.15, hold: 0.22 },
  props: { total: 0.4, hold: 0.08 },
  robot: { total: 0.5, hold: 0.05 },
  accent: { total: 0.2, hold: 0.15 },
};

const ALL = CONTOURS.map(([d]) => d).join("");

/* Hand-drawn props in composition units (strokes, drawn with DrawSVG). */
const DESK = "M496 368 C 560 367 620 369 690 366";
const PHONE = "M606 300 C 604 298 641 296 643 300 L 646 362 C 646 366 612 368 609 364 Z";
const PHONE_SCREEN = "M612 309 L 639 307 L 641 352 L 614 354 Z M621 302 L 630 301.5";
const RINGS = ["M654 312 C 659 318 659 326 655 332", "M662 306 C 670 316 670 330 663 339"];
const LINE = "M622 298 C 618 262 676 246 672 206 C 668 168 610 176 580 156 C 566 147 560 140 560 132";
const BUBBLE =
  "M540 46 C 540 36 548 30 560 30 L 668 28 C 680 28 688 36 688 46 L 689 98 C 689 110 681 116 670 116 L 584 117 L 566 131 L 568 117 L 559 117 C 548 117 541 110 541 100 Z";
const BUBBLE_TEXT = ["M560 64 C 585 63 610 64 628 63", "M560 84 C 578 83 594 84 606 84"];
const CHECK = "M650 70 L 657 78 L 671 60";

function InkDesk() {
  const root = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const maskId = `ink-m-${uid}`;
  const boilId = `ink-b-${uid}`;
  useFpsProbe("ink-desk");

  useEffect(() => {
    const svg = root.current;
    if (!svg || reduced === null) return;
    if (reduced) {
      svg.dataset.state = "done";
      return;
    }
    let dead = false;
    let revert = () => {};
    let stopBoil = () => {};

    void Promise.all([loadMotion(), import("gsap/DrawSVGPlugin")]).then(([{ gsap }, { DrawSVGPlugin }]) => {
      if (dead) return;
      gsap.registerPlugin(DrawSVGPlugin);
      const q = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
      const strokes = q<SVGPathElement>("[data-stroke]");
      const pen = svg.querySelector<SVGGElement>(".ink-pen");
      const flood = svg.querySelector<SVGRectElement>(".ink-flood");
      const phone = svg.querySelector<SVGGElement>(".ink-phone");
      const bubble = svg.querySelector<SVGGElement>(".ink-bubble");
      const line = svg.querySelector<SVGPathElement>(".ink-line");
      const pulse = svg.querySelector<SVGPathElement>(".ink-pulse");
      const blink = svg.querySelector<SVGCircleElement>(".ink-antenna");
      const turb = svg.querySelector<SVGFETurbulenceElement>("feTurbulence");
      if (!pen || !flood || !phone || !bubble || !line || !pulse || !blink) return;

      // The pen eases after its target (a hand travelling between strokes, never a jump).
      const target = { x: ART_X + 160, y: ART_Y + 10 };
      const at = { x: target.x, y: target.y };
      const follow = () => {
        at.x += (target.x - at.x) * 0.32;
        at.y += (target.y - at.y) * 0.32;
        pen.setAttribute("transform", `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`);
      };
      const lengths = new Map<SVGPathElement, number>();
      const aim = (p: SVGPathElement, progress: number, ox: number, oy: number) => {
        let len = lengths.get(p);
        if (len === undefined) {
          len = p.getTotalLength();
          lengths.set(p, len);
        }
        const pt = p.getPointAtLength(len * progress);
        target.x = pt.x + ox;
        target.y = pt.y + oy;
      };

      const ctx = gsap.context(() => {
        gsap.set(strokes, { drawSVG: "0%" });
        gsap.set(".ink-prop", { drawSVG: "0%" });
        gsap.set(line, { drawSVG: "0%" });
        gsap.set(pulse, { drawSVG: "0% 0%", opacity: 0 });
        gsap.set(bubble, { scale: 0, svgOrigin: "566 131" });
        gsap.set(".ink-check", { scale: 0, svgOrigin: "660 70" });
        gsap.set(".ink-ring", { opacity: 0 });
        gsap.set(flood, { opacity: 0 });
        gsap.set(pen, { opacity: 0 });
        gsap.set(blink, { scale: 0, transformOrigin: "50% 50%", transformBox: "fill-box" });
        svg.dataset.state = "drawing";
        gsap.ticker.add(follow);

        const tl = gsap.timeline({ delay: 0.35 });
        tl.to(pen, { opacity: 1, duration: 0.25 });

        // 1. The outer contour in one long stroke.
        const outline = strokes.filter((s) => s.dataset.group === "outline");
        for (const s of outline) {
          tl.to(s, {
            drawSVG: "100%",
            duration: 1.3,
            ease: "power1.inOut",
            onUpdate() {
              aim(s, this.progress(), ART_X, ART_Y);
            },
          });
        }
        tl.to({}, { duration: 0.2 });

        // 2. Each region in turn, strokes overlapping like a quick hand, a hold between regions.
        for (const g of Object.keys(PACE) as (keyof typeof PACE)[]) {
          const list = strokes.filter((s) => s.dataset.group === g);
          const pace = PACE[g];
          let t = tl.duration();
          const step = pace.total / Math.max(1, list.length);
          for (const s of list) {
            const len = Number(s.dataset.len) || 20;
            const dur = Math.min(0.55, 0.08 + Math.sqrt(len) * 0.02);
            // Long strokes steer the pen; short ticks are drawn without dragging it about.
            tl.to(
              s,
              {
                drawSVG: "100%",
                duration: dur,
                ease: "power2.inOut",
                onUpdate:
                  len > 40
                    ? function (this: gsap.core.Tween) {
                        aim(s, this.progress(), ART_X, ART_Y);
                      }
                    : undefined,
              },
              t,
            );
            t += step;
          }
          if (g === "accent") {
            // The little sparkles land with a pop.
            tl.fromTo(
              list,
              { scale: 0.4, transformOrigin: "50% 50%", transformBox: "fill-box" },
              { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.06 },
              t - 0.3,
            );
          }
          tl.to({}, { duration: pace.hold }, ">");
        }

        // 3. Solid ink settles in (anything a stroke did not uncover), the desk runs on to the right.
        tl.to(flood, { opacity: 1, duration: 0.6, ease: "power1.out" }, ">-0.1");
        tl.to(".ink-desk", { drawSVG: "100%", duration: 0.5, ease: "power2.out" }, "<");
        tl.to(blink, { scale: 1, duration: 0.45, ease: "back.out(3)" }, "<0.2");

        // 4. The phone is sketched, then a hold.
        tl.to(".ink-phone .ink-prop", {
          drawSVG: "100%",
          duration: 0.5,
          stagger: 0.15,
          ease: "power2.inOut",
          onUpdate() {
            target.x = 625;
            target.y = 330;
          },
        });
        tl.to(pen, { opacity: 0, duration: 0.3 }, ">0.1");
        tl.to({}, { duration: 0.35 });

        // 5. It rings (anticipation): a wiggle, the rings, a squash down...
        tl.to(".ink-ring", { opacity: 1, duration: 0.1 });
        tl.to(".ink-ring", { drawSVG: "100%", duration: 0.35, stagger: 0.08, ease: "power2.out" }, "<");
        tl.to(phone, {
          keyframes: { rotation: [0, -6, 5, -4, 3, 0], ease: "none" },
          duration: 0.6,
          transformOrigin: "50% 100%",
          ease: "power1.inOut",
        });
        tl.to(".ink-ring", { opacity: 0, duration: 0.3 }, ">-0.1");
        tl.to(phone, { scaleY: 0.9, scaleX: 1.05, duration: 0.2, ease: "power2.in", transformOrigin: "50% 100%" });
        // ...and the release: the phone stretches as the gold line shoots out of it.
        tl.to(phone, { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1.1, 0.4)" });
        tl.to(line, { drawSVG: "100%", duration: 0.75, ease: "power3.out" }, "<");
        // 6. The bubble pops with overshoot, its text is jotted, the tick lands.
        tl.to(bubble, { scale: 1, duration: 0.6, ease: "back.out(2.2)" }, "<0.55");
        tl.to(".ink-bubble .ink-prop", { drawSVG: "100%", duration: 0.35, stagger: 0.12, ease: "power2.out" }, "<0.15");
        tl.to(".ink-check", { scale: 1, duration: 0.45, ease: "back.out(3.4)" }, ">-0.05");
        tl.call(() => {
          svg.dataset.state = "done";
          gsap.ticker.remove(follow);
          idle.play(0);
        });

        // Idle: a gold pulse runs up the line every few seconds; the antenna blinks.
        const idle = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2.6 });
        idle.set(pulse, { opacity: 1, drawSVG: "0% 0%" });
        idle.to(pulse, { drawSVG: "84% 100%", duration: 1.1, ease: "power1.inOut" });
        idle.to(pulse, { opacity: 0, duration: 0.25 }, ">-0.15");
        idle.fromTo(".ink-check", { scale: 1 }, { scale: 1.18, duration: 0.18, yoyo: true, repeat: 1, ease: "power1.out" }, "<");
        idle.to(blink, { opacity: 0.25, duration: 0.3, yoyo: true, repeat: 1 }, 0.2);
      }, svg);

      // Line boil (as the site's doodles): three seeds stepped at 8 fps while on screen, after the drawing.
      let boilTimer: number | undefined;
      let frame = 0;
      stopBoil = watchVisible(svg, (visible) => {
        if (visible && boilTimer === undefined && turb) {
          boilTimer = window.setInterval(() => {
            if (svg.dataset.state !== "done") return;
            frame = (frame + 1) % 3;
            turb.setAttribute("seed", String(4 + frame));
          }, 125);
        } else if (!visible && boilTimer !== undefined) {
          window.clearInterval(boilTimer);
          boilTimer = undefined;
        }
      });
      const prevStop = stopBoil;
      stopBoil = () => {
        prevStop();
        if (boilTimer !== undefined) window.clearInterval(boilTimer);
      };
      revert = () => {
        gsap.ticker.remove(follow);
        ctx.revert();
      };
    });

    return () => {
      dead = true;
      stopBoil();
      revert();
    };
  }, [reduced]);

  return (
    <div className="ink-host" aria-hidden="true">
      <svg
        ref={root}
        className="ink-svg"
        viewBox={`0 0 ${W} ${H}`}
        data-state={reduced ? "done" : "idle"}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-12} y={-12} width={VIEW.w + 24} height={VIEW.h + 24}>
            <g className="ink-mask-strokes">
              {CONTOURS.map(([d, g, len], i) => (
                <path key={i} d={d} data-stroke="" data-group={g} data-len={len} />
              ))}
            </g>
            <rect className="ink-flood" x={-12} y={-12} width={VIEW.w + 24} height={VIEW.h + 24} />
          </mask>
          <filter id={boilId} x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={1} seed={4} />
            <feDisplacementMap in="SourceGraphic" scale={4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <radialGradient id={`${boilId}-glow`}>
            <stop offset="0" stopColor="var(--gold)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse className="ink-pool" cx={360} cy={380} rx={330} ry={40} />
        <g className="ink-boil" filter={`url(#${boilId})`}>
          <g transform={`translate(${ART_X} ${ART_Y})`}>
            <path className="ink-art" d={ALL} mask={`url(#${maskId})`} />
            <circle className="ink-antenna" cx={404} cy={76} r={5} />
          </g>
          <path className="ink-prop ink-desk" d={DESK} />
          <g className="ink-phone">
            <path className="ink-prop" d={PHONE} />
            <path className="ink-prop" d={PHONE_SCREEN} />
          </g>
          {RINGS.map((d) => (
            <path key={d} className="ink-prop ink-ring" d={d} />
          ))}
          <g className="ink-bubble">
            <path className="ink-prop ink-bubble-shape" d={BUBBLE} />
            <text className="ink-bubble-tag" x={560} y={46}>
              LINE
            </text>
            {BUBBLE_TEXT.map((d) => (
              <path key={d} className="ink-prop" d={d} />
            ))}
            <g className="ink-check">
              <circle cx={660} cy={70} r={15} />
              <path d={CHECK} />
            </g>
          </g>
        </g>
        <path className="ink-line" d={LINE} />
        <path className="ink-pulse" d={LINE} />
        <g className="ink-pen">
          <circle r={14} fill={`url(#${boilId}-glow)`} />
          <circle r={3.4} className="ink-pen-tip" />
        </g>
      </svg>
    </div>
  );
}

export default function InkDeskDemo({ locale }: { locale: Locale }) {
  return <Banner id="ink" locale={locale} stage={<InkDesk />} />;
}
