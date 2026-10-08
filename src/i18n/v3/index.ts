import type { Locale } from "@/content/schema";
import { hero } from "./hero";
import { numbers } from "./numbers";
import { clinic } from "./clinic";
import { helm } from "./helm";
import { moreWork } from "./moreWork";
import { notes } from "./notes";
import { tools } from "./tools";
import { contact } from "./contact";

/** All v3 section copy, per locale. Each section file is owned by one builder (no shared edits). */
const sections = { hero, numbers, clinic, helm, moreWork, notes, tools, contact };

export type V3Copy = { [K in keyof typeof sections]: (typeof sections)[K]["en"] };

export function getV3(locale: Locale): V3Copy {
  return Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v[locale]])) as V3Copy;
}
