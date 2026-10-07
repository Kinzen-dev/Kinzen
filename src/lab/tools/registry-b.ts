import type { LabDemo } from "../types";

/** Demos owned by builder lab-tools-b. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "logo-orbit",
    title: "Logo orbit",
    idea: "The six tool groups circle a gold KINZEN core on tilted orbits; hover, tap or arrow to a group and its ring lifts forward in brand colour with what it does.",
    technique:
      "DOM tokens placed per frame on projected ellipses (depth drives scale, opacity, blur, z), two canvases for ring arcs behind and in front of the core.",
    load: () => import("./logo-orbit"),
  },
  {
    id: "stack-pipeline",
    title: "Stack pipeline",
    idea: "One request travels as a gold light through channels, frontend, backend, data, AI with its guard, then testing and delivery; each station's logos light up in brand colour as it passes.",
    technique:
      "One SVG path routed through measured DOM stations, dash-offset comet tails, an eased phase timeline on wide screens and a scroll-driven light on phones.",
    load: () => import("./stack-pipeline"),
  },
];
