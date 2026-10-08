import type { LabDemo } from "../types";

/** Demos owned by builder lab-ix-b. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "gold-toss",
    title: "Gold toss",
    idea: "Fling the heavy brushed-gold KINZEN letters: they tumble and clink, splash into ink water, bloom into gold and rise back home.",
    technique:
      "three.js + cannon-es rigid bodies (compound boxes cut from each glyph), spring grab, Stable Fluids on the water's mirror, synthesized metal sound.",
    load: () => import("./gold-toss"),
  },
];
