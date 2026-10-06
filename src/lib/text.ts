/**
 * A comma-separated list whose items never break inside ("LINE Messaging API" stays on
 * one line); lines break only between items.
 */
export function inlineList(items: readonly string[]): string {
  return items.map((item) => item.replaceAll(" ", "\u00a0")).join(", ");
}
