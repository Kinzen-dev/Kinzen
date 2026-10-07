import type { LabDemo } from "../types";

/** Demos owned by builder lab-play-a. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "trick-my-ai",
    title: "Trick my AI",
    idea: "You write the clinic AI's reply and try to sneak a diagnosis, a dose or hype past the guard; the rules catch it live and show the fix.",
    technique: "Client-side rule engine (EN/TH phrase lists + regex, exact spans) drawn as marks behind a transparent textarea; CSS sweeps.",
    load: () => import("./trick-my-ai"),
  },
  {
    id: "hype-smash",
    title: "Hype smash",
    idea: "Phrases drop onto the gold guard bar: hype and cure promises shatter, safe lines land in the clinic's LINE chat.",
    technique: "Same rule engine; GSAP Physics2D shards per grapheme, Flip for the chat stack, gravity tweens for the fall.",
    load: () => import("./hype-smash"),
  },
  {
    id: "call-to-booking",
    title: "Call becomes a booking",
    idea: "Scrub through a fictional phone call: the name, the problem and the time lift out of the transcript into a booking card.",
    technique: "One GSAP timeline scrubbed by a range input; MotionPath arcs from measured spans to card fields; before/after under reduced motion.",
    load: () => import("./call-to-booking"),
  },
  {
    id: "latency-playground",
    title: "Latency playground",
    idea: "Hold to talk, let go, and watch (and hear) how streaming beats batch on time to first word; illustrative numbers.",
    technique: "rAF waterfall of four pipeline stages; Web Audio schedules a macOS `say` clip at the first-word moment.",
    load: () => import("./latency-playground"),
  },
];
