import { CONTOURS, VIEW } from "./art-data";
import "./ink.css";

/*
 * Scene 0 of the hero sequence: the site's own ink portrait of King at his desk (the traced
 * portrait-laptop art), a hand-drawn phone, a gold line and a generic chat bubble. Server-rendered
 * finished, so without scripting and under reduced motion it is the hero's still picture. With
 * motion, ink.css holds it back until the lazy controller (fx/sequence/desk.ts) draws it: each
 * contour is a thick white stroke inside a mask, and drawing those strokes uncovers the ink
 * exactly along the lines, as if inked by hand.
 * Lives inside the (aria-hidden) wordmark paragraph, laid over its box.
 */

/** Where the portrait sits inside the composition (composition units, 700 x 440). */
const ART_X = 24;
const ART_Y = 104;
const ALL = CONTOURS.map(([d]) => d).join("");

/* Hand-drawn props in composition units. */
const DESK = "M496 368 C 560 367 620 369 690 366";
const PHONE = "M606 300 C 604 298 641 296 643 300 L 646 362 C 646 366 612 368 609 364 Z";
const PHONE_SCREEN = "M612 309 L 639 307 L 641 352 L 614 354 Z M621 302 L 630 301.5";
const RINGS = ["M654 312 C 659 318 659 326 655 332", "M662 306 C 670 316 670 330 663 339"];
const LINE = "M622 298 C 618 262 676 246 672 206 C 668 168 610 176 580 156 C 566 147 560 140 560 132";
const BUBBLE =
  "M540 46 C 540 36 548 30 560 30 L 668 28 C 680 28 688 36 688 46 L 689 98 C 689 110 681 116 670 116 L 584 117 L 566 131 L 568 117 L 559 117 C 548 117 541 110 541 100 Z";
/** Three jotted lines of message: a generic chat bubble, no brand. */
const BUBBLE_TEXT = [
  "M560 54 C 585 53 612 54 632 53",
  "M560 74 C 588 73 612 74 628 74",
  "M560 94 C 576 93 590 94 600 94",
];
const CHECK = "M650 70 L 657 78 L 671 60";

export function InkArt() {
  return (
    <svg
      className="ink-svg"
      viewBox="16 20 684 404"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      aria-hidden="true"
      data-ink-desk=""
    >
      <defs>
        <mask id="kz-ink-mask" maskUnits="userSpaceOnUse" x={-12} y={-12} width={VIEW.w + 24} height={VIEW.h + 24}>
          <g className="ink-mask-strokes">
            {CONTOURS.map(([d, g, len], i) => (
              <path key={i} d={d} data-stroke="" data-group={g} data-len={len} />
            ))}
          </g>
          <rect className="ink-flood" x={-12} y={-12} width={VIEW.w + 24} height={VIEW.h + 24} />
        </mask>
        <filter id="kz-ink-boil" x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={1} seed={4} />
          <feDisplacementMap in="SourceGraphic" scale={4} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="kz-ink-glow">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse className="ink-pool" cx={360} cy={380} rx={330} ry={40} />
      <g className="ink-boil" filter="url(#kz-ink-boil)">
        <g transform={`translate(${ART_X} ${ART_Y})`}>
          <path className="ink-art" d={ALL} mask="url(#kz-ink-mask)" />
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
        <circle r={14} fill="url(#kz-ink-glow)" />
        <circle r={3.4} className="ink-pen-tip" />
      </g>
    </svg>
  );
}
