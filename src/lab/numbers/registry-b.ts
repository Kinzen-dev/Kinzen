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
];
