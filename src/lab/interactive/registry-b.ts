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
  {
    id: "thock",
    title: "Thock",
    idea: "A low-angle field of navy and cream keycaps: every key sinks with a thock, your own keyboard presses them, space sends a gold ripple, ship spells itself.",
    technique:
      "three.js instanced sculpted caps, per-key springs set in the input handler (no lag), damped wave grid, legend atlas shaded as brushed gold, synthesized thock.",
    load: () => import("./thock"),
  },
];
