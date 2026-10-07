import type { LabDemo } from "../types";

/** Demos owned by builder lab-play-b. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "particle-playground",
    title: "Gold particle playground",
    idea: "Your name (Latin or Thai) or your drawing, written in the hero's gold dust, then back to KINZEN.",
    technique: "CPU springs on typed arrays drawn as additive WebGL2 points; targets sampled from a canvas text render or the baked wordmark mask.",
    load: () => import("./particle-playground"),
  },
  {
    id: "assemble-system",
    title: "Assemble the system",
    idea: "Drag LINE, speech to text, TypeScript, model, guard and reply into a clinic assistant; a packet runs it end to end.",
    technique: "Pointer-captured drag plus tap-to-place, GSAP Flip into sockets, MotionPath-style packet on a measured SVG wire, Physics2D sparks.",
    load: () => import("./assemble-system"),
  },
];
