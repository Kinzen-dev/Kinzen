import type { LabDemo } from "../types";

/** Demos owned by builder lab-numbers-b. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "gold-numerals",
    title: "Gold numerals",
    idea: "The hero's gold dust spells each stat on a pinned navy scene; scrolling streams it from 7 to 4 to 20+ to 500 while the captions follow, and the cursor stirs it.",
    technique:
      "The hero's WebGL2 particle engine (read-only import) with targets sampled from the figures in the site face, sorted by x so each change flows as one stream.",
    load: () => import("./gold-numerals"),
  },
  {
    id: "editorial-numerals",
    title: "Editorial numerals",
    idea: "Magazine spreads on the page: each figure enormous and cropped by the screen edge, filled with gold ink that bleeds in, with a slim caption, a source line and a how-it-was-measured note on the 500/37 spread.",
    technique:
      "Per-figure WebGL2 canvas: the glyph rendered in the site face as a mask, domain-warped fbm marbling with a noisy reveal front and a pointer swirl; CSS-variable parallax.",
    load: () => import("./editorial-numerals"),
  },
];
