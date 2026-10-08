import type { LabDemo } from "../types";
import { CONCEPTS } from "./frame";

/** Concept frames for the interactive section (images only). */
export const demos: LabDemo[] = CONCEPTS.map((c) => ({
  id: c.id,
  title: c.en[0],
  idea: "Concept frame: pick one to build.",
  technique: "Image only (Codex imagegen), nothing playable yet",
  load: () => import("./frame").then((m) => ({ default: m.makeFrame(c.id) })),
}));
