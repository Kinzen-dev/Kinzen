/**
 * Thai copy carries invisible U+2060 word joiners (see src/lib/thai.ts). Tests match
 * Thai text through these helpers so the joiners never make an assertion flaky.
 */
const WJ = "\u2060";

const escape = (ch: string) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Exact-text RegExp that tolerates word joiners anywhere in `text`. */
export function thai(text: string, { exact = true } = {}): RegExp {
  const body = [...text].map(escape).join(`${WJ}?`);
  return new RegExp(exact ? `^${body}$` : body);
}

export const stripJoiners = (text: string) => text.replaceAll(WJ, "");
