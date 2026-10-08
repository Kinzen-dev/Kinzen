import type { LabDemo } from "../types";

/** Demos owned by builder lab-numbers-a. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "split-flap",
    title: "Split-flap board",
    idea: "The four numbers on a navy departures board: gold flaps clatter into place as each row enters view, captions type in, hovering a row flips it again.",
    technique:
      "Hand-built flap tiles (two hinged leaves per flap) driven by the Web Animations API, transform and opacity only; captions reveal per grapheme from one CSS variable.",
    load: () => import("./split-flap"),
  },
  {
    id: "honest-viz",
    title: "Honest micro-visualizations",
    idea: "Each number is drawn as its real quantity: a year axis 2019 to 2026, four Tech Lead years on a bar, twenty storefronts and a plus, 500 messages with 37 violations caught on a guard line.",
    technique:
      "Counters and pictures share one clock (count = f(time)); DOM marks move by transform; the 500-dot matrix is a pure canvas function of t.",
    load: () => import("./honest-viz"),
  },
  {
    id: "scrolly-stats",
    title: "Scroll story",
    idea: "A pinned navy stage: one numeral fills the screen and morphs 7, 4, 20+, 500 as you scroll, each with an ink doodle and a gold motif that tells it; phones get a vertical list.",
    technique:
      "CSS sticky + ScrollTrigger progress eased per frame; per-slot numeric morph (translate, blur, measured glyph widths); motifs draw from one CSS number --m.",
    load: () => import("./scrolly-stats"),
  },
];
