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
  {
    id: "under-the-hood",
    title: "Under the hood",
    idea: "Rub a polished (fictional) clinic inbox to wipe it away and find the architecture plate that runs it; it heals back.",
    technique: "One 2D canvas: low-res float mask with brush stamps, bleed and slow heal, noise-thresholded edge, blueprint drawn source-in plus a gold rim.",
    load: () => import("./under-the-hood"),
  },
];
