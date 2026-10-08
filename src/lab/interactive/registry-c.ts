import type { LabDemo } from "../types";

/** Demos owned by builder lab-ix-c. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "soi-of-agents",
    title: "Soi of agents",
    idea: "An ink Bangkok soi at dusk: drop a gold coin (a task) and tiny agents split it, hand it between stalls, meet a guardrail gate, then ring the temple bell and light a lantern.",
    technique:
      "Canvas2D hand-drawn ink (seeded wobble strokes, cached layers), Reynolds steering (wander, arrive, separation) on a path-mapped walkway, a small task choreographer; Web Audio bell.",
    load: () => import("./soi-of-agents"),
  },
  {
    id: "one-drop",
    title: "One drop",
    idea: "A shallow bowl of dark water: tap to let a gold drop fall; rings spread and gold tendrils bloom slowly among the day's earlier drops.",
    technique:
      "WebGL2: height-field ripples plus a Stable Fluids dye solve in the bowl's disc, drawn through a 2.5D bowl shader (rim, wall, refraction, specular).",
    load: () => import("./one-drop"),
  },
];
