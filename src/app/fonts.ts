import { Google_Sans, Google_Sans_Code, Playpen_Sans_Thai } from "next/font/google";

/**
 * The site's three faces (v4), shared by both root layouts. Google Sans sets every UI line in
 * both languages (its Thai is part of the same family); Google Sans Code sets machine output;
 * Playpen Sans Thai is the handwriting on the practice notes, loaded only when a note shows.
 *
 * Every script's @font-face ships either way (unicode-range picks what a page uses); `subsets`
 * only chooses what is preloaded: Latin and Thai, not Latin Extended (a 21 KB + 27 KB file
 * the copy almost never touches). Next has no fallback metrics for these families, so the
 * metric-matched fallback faces live in globals.css ("Google Sans Fallback").
 */
const sans = Google_Sans({
  subsets: ["latin", "thai"],
  variable: "--font-google-sans",
  display: "swap",
  adjustFontFallback: false,
});
const mono = Google_Sans_Code({
  subsets: ["latin"],
  variable: "--font-google-sans-code",
  display: "swap",
  adjustFontFallback: false,
});
const hand = Playpen_Sans_Thai({
  subsets: ["latin", "thai"],
  variable: "--font-playpen",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const fontVariables = `${sans.variable} ${mono.variable} ${hand.variable}`;
