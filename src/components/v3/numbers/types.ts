import type { Locale } from "@/content/schema";
import type { NumbersCopy } from "@/i18n/v3/numbers";

/** The five views, in the order the switcher shows them and auto-advance visits them. */
export const VIEW_IDS = ["split-flap", "honest-viz", "scrolly-stats", "gold-numerals", "editorial-numerals"] as const;
export type ViewId = (typeof VIEW_IDS)[number];

/**
 * What every view receives. `play` is true while the section is on screen, the tab is visible and
 * nobody is pointing, focusing or touching inside it: the one-figure-at-a-time views step through
 * the four stats only then (so a reader is never moved on mid-sentence).
 */
export type ViewProps = { locale: Locale; copy: NumbersCopy; play: boolean };
