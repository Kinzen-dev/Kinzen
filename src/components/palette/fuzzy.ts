/**
 * Small fuzzy matcher for the command palette. A query matches when its
 * characters appear in order in the text; consecutive runs, word starts and
 * whole-substring hits score higher. Whitespace in the query is ignored, so
 * "printcv" and "print cv" both find "Print CV".
 */
/** Lowercase and drop Thai word joiners (U+2060) so glued Thai text still matches. */
const norm = (value: string) => value.replace(/\u2060/g, "").toLowerCase();

export function fuzzyScore(query: string, text: string): number | null {
  const q = norm(query).replace(/\s+/g, "");
  if (!q) return 0;
  const s = norm(text);
  const whole = norm(query).trim();

  // A plain substring hit beats any scattered match; word-start hits beat mid-word ones.
  const at = s.indexOf(whole);
  if (at >= 0) {
    const wordStart = at === 0 || /[\s/(.-]/.test(s[at - 1]);
    return whole.length * 3 + 6 + (wordStart ? 4 : 0) + (at === 0 ? 4 : 0);
  }

  let score = 0;
  let from = 0;
  let prev = -2;
  for (const ch of q) {
    const idx = s.indexOf(ch, from);
    if (idx < 0) return null;
    score += idx === prev + 1 ? 3 : 1;
    if (idx === 0 || /[\s/(.-]/.test(s[idx - 1])) score += 2;
    prev = idx;
    from = idx + 1;
  }
  return score;
}

function keywordScore(query: string, keywords: string): number | null {
  const q = norm(query).trim();
  if (q && norm(keywords).includes(q)) return fuzzyScore(query, keywords);
  let best: number | null = null;
  for (const word of keywords.split(/\s+/)) {
    const s = fuzzyScore(query, word);
    if (s !== null && (best === null || s > best)) best = s;
  }
  return best;
}

export function rank<T extends { label: string; keywords: string }>(items: T[], query: string): T[] {
  if (!query.trim()) return items;
  return items
    .map((item, index) => {
      const label = fuzzyScore(query, item.label);
      // Keywords are long; match within one word (or as a plain substring) so a
      // short query does not hit everything by scattering across the sentence.
      const keywords = keywordScore(query, item.keywords);
      const best = Math.max(label === null ? -1 : label + 4, keywords === null ? -1 : keywords);
      return { item, index, best };
    })
    .filter((r) => r.best >= 0)
    .sort((a, b) => b.best - a.best || a.index - b.index)
    .map((r) => r.item);
}
