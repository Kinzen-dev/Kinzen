import { createHash } from "node:crypto";

/**
 * Terms that must never reach a page, matched by hash so the repository never spells them.
 *
 * A committed entry is the SHA-256 of one normalized term (see `normalize`). Latin-script terms
 * match whole word tokens; Thai has no spaces between words, so a Thai term matches any run of
 * `length` characters inside a Thai token (the length is the only thing an entry reveals).
 *
 * Extra terms that must not even be hinted at in a public repo (a client's name, its domain
 * words) live in a private, never-committed file: one plain term per line, `#` for comments.
 * `scripts/check-output.ts` reads it from ~/.config/kinzen/private-terms.txt when it exists.
 */
/** `length`: Thai characters in the term. `words`: Latin tokens in the term (default 1). */
export type TermHash = { sha256: string; script: "latin" | "thai"; length?: number; words?: number };

export const BANNED_TERM_HASHES: TermHash[] = [
  // The pilot clinic's own name, once used as the product name (King, 2026-10-08), in both scripts.
  { sha256: "f40578d36c7b3665c90108fc6e13c1276df0e49af6c9a0ea31bdeb01f49a9616", script: "latin" },
  { sha256: "eb089d8bb0f2dce9a47e402d3e0e007edbb4dfef79bfab6056bdf04e40f0cbbc", script: "thai", length: 8 },
];

const THAI = /[\u0E00-\u0E7F]/;

export const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/** NFKC, camelCase split ("FooBar" reads as "foo bar"), lowercase. */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    .toLowerCase();
}

/** Word tokens: runs of letters, combining marks and digits. */
export function tokens(text: string): string[] {
  return normalize(text).match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
}

/** Hash a plain term the way `findTerms` reads text: Thai joined without spaces, Latin by one space. */
export function hashTerm(term: string): TermHash {
  const toks = tokens(term);
  if (THAI.test(term)) {
    const norm = toks.join("");
    return { sha256: sha256(norm), script: "thai", length: [...norm].length };
  }
  return { sha256: sha256(toks.join(" ")), script: "latin", words: toks.length };
}

/**
 * The hashes from `list` found in `text`. A multi-word Latin term matches as a token sequence.
 */
export function findTerms(text: string, list: TermHash[]): TermHash[] {
  const toks = tokens(text);
  const latin = new Set<string>();
  const maxWords = Math.max(1, ...list.map((h) => (h.script === "latin" ? (h.words ?? 1) : 1)));
  for (let i = 0; i < toks.length; i++) {
    for (let n = 1; n <= maxWords && i + n <= toks.length; n++) latin.add(toks.slice(i, i + n).join(" "));
  }
  const latinHashes = new Set([...latin].map(sha256));
  const thaiTokens = [...new Set(toks.filter((t) => THAI.test(t)))].map((t) => [...t]);
  const thaiHit = (h: TermHash) => {
    const len = h.length ?? 0;
    for (const chars of thaiTokens) {
      for (let i = 0; i + len <= chars.length; i++) {
        if (sha256(chars.slice(i, i + len).join("")) === h.sha256) return true;
      }
    }
    return false;
  };
  return list.filter((h) => (h.script === "thai" ? thaiHit(h) : latinHashes.has(h.sha256)));
}

/** Parse a private term file (one term per line, `#` comments) into hashes. */
export function parseTermFile(body: string): TermHash[] {
  return body
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean)
    .map(hashTerm);
}
