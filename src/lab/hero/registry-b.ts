import type { LabDemo } from "../types";

/** Demos owned by builder lab-hero-b. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "live-system",
    title: "Live system",
    idea: "The banner is a running architecture drawing: calls and LINE chats flow to a reply, and the code guard stops one now and then.",
    technique: "SVG in screen units, path lookup tables, one rAF loop moving packets by attribute, CSS node breathing.",
    load: () => import("./live-system"),
  },
  {
    id: "agents-at-work",
    title: "Agents at work",
    idea: "A Helm-like workspace where three fictional agents plan, build and review in real time; the commit message is the hero line.",
    technique: "DOM typing on one visible-time rAF clock, seeded human cadence, SVG handoff wire with a chip riding getPointAtLength.",
    load: () => import("./agents-at-work"),
  },
  {
    id: "ink-desk",
    title: "Self-drawing ink desk",
    idea: "The site's own ink portrait of King at his desk draws itself, then a phone rings and a gold line carries the call into a LINE bubble.",
    technique: "Traced art split into contours; DrawSVG on thick mask strokes uncovers the ink; GSAP timeline with holds, squash and back-out overshoot.",
    load: () => import("./ink-desk"),
  },
  {
    id: "voice-ribbon",
    title: "Voice ribbon + live transcript",
    idea: "Tap play on a short synthetic Thai booking call: a gold ribbon moves with the voice while the transcript types itself in step.",
    technique: "Web Audio AnalyserNode (loudness + four bands) drives a canvas 2D ribbon; graphemes revealed on the audio clock; WebVTT tracks.",
    load: () => import("./voice-ribbon"),
  },
];
