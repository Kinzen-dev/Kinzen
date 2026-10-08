import type { LabDemo } from "../types";

/** Demos owned by builder lab-ix-a. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "night-desk",
    title: "Night desk",
    idea: "King's ink desk as a small 3D room on Bangkok time: orbit it, open the monitor's agents, ring the voice agent, knock the mug over.",
    technique:
      "three.js with an ink pass (object-id, depth and crease edges, boiling lines, screen-space hatching, mip bloom); custom desk physics; Web Audio.",
    load: () => import("./night-desk"),
  },
];
