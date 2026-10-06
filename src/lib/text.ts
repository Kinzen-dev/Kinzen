/**
 * A comma-separated list whose short items never break inside ("LINE Messaging API"
 * stays on one line); lines break between items.
 */
export function inlineList(items: readonly string[]): string {
  // Only short items are kept whole; a long phrase must still be able to wrap in a narrow cell.
  return items.map((item) => (item.length <= 20 ? item.replaceAll(" ", "\u00a0") : item)).join(", ");
}
