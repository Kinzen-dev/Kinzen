/**
 * The plain-text half of thai.ts, on its own so client components (header, palette, menu) can
 * use it without shipping the compound list and segmenter to every page.
 */
const WJ = "⁠";

/** Remove the joiners again (metadata, aria, copied text, comparisons). */
export function stripJoiners(text: string): string {
  return text.replaceAll(WJ, "");
}

/** Attribute values (aria-label, title, alt) must be plain text. */
export function plain<T extends string | undefined>(text: T): T {
  return (text === undefined ? text : stripJoiners(text)) as T;
}
