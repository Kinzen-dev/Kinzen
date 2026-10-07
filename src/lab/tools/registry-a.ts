import type { LabDemo } from "../types";

/** Demos owned by builder lab-tools-a. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "bento-loops",
    title: "Bento of live loops",
    idea: "Six tiles, one per job, each looping a small fictional product demo; the group's logos light in brand colour on their beat.",
    technique:
      "One GSAP timeline per pass, rebuilt from the finished frame (no rewinds); IntersectionObserver play/pause, hover/focus/tap hold.",
    load: () => import("./bento-loops"),
  },
  {
    id: "logo-spotlight",
    title: "Logo wall with a spotlight",
    idea: "Every tool on one quiet wall in the theme tone; a soft light (pointer, finger or keyboard) brings the logos under it into brand colour, a group name lights its row.",
    technique:
      "One rAF loop writes a per-cell --k (smoothstep of distance to an eased light); CSS color-mix, lift and drop-shadow read it; idle Lissajous drift.",
    load: () => import("./logo-spotlight"),
  },
];
