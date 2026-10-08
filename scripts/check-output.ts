/**
 * Post-build guard: scan every prerendered page and RSC payload for strings that
 * must never ship (wrong numbers, phone numbers, em dashes, hidden entries, banned terms).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { FORBIDDEN } from "../src/content/forbidden";
import { BANNED_TERM_HASHES, findTerms, parseTermFile, type TermHash } from "../src/content/term-guard";

// CHECK_OUTPUT_ROOT points the scan at a copy of the build (used to prove the guards on a fixture).
const BUILD = process.env.CHECK_OUTPUT_ROOT ?? join(process.cwd(), ".next");
const ROOT = join(BUILD, "server", "app");
const STATIC = join(BUILD, "static");

/**
 * Banned terms, by hash (src/content/term-guard.ts), plus an optional private list that never
 * enters the repo. A hit names the hash or the private line number, never the term itself.
 */
const PRIVATE_TERMS = process.env.KINZEN_PRIVATE_TERMS ?? join(homedir(), ".config", "kinzen", "private-terms.txt");
const privateTerms: TermHash[] = existsSync(PRIVATE_TERMS) ? parseTermFile(readFileSync(PRIVATE_TERMS, "utf8")) : [];
const termLabel = (h: TermHash) => {
  const n = privateTerms.indexOf(h);
  return n >= 0 ? `private term #${n + 1}` : `banned term ${h.sha256.slice(0, 12)}`;
};

/** Text that exists only on hidden entries and must never reach a page. */
const HIDDEN_MARKERS: { pattern: RegExp; reason: string }[] = [
  // The contract entry is public since v1.7 (descriptor only); its schema enum must still never render.
  { pattern: /part-time-contract/, reason: "internal experience type leaked" },
  { pattern: /github\.com\/Kinzen-dev"/, reason: "GitHub profile link is hidden until cleanup" },
  { pattern: /CLAIMS\.md|claimId|provenance/, reason: "provenance must never render" },
  // No joiners anywhere: visible Thai uses nowrap spans (lib/thai-nodes.ts) since review round 5.
  { pattern: /\u2060/, reason: "word joiner in output (use nobr spans, never joiners)" },
  // A React node pushed through a string (template literal, join) renders as this.
  { pattern: /\[object Object\]|>undefined<|>NaN</, reason: "a value rendered as [object Object], undefined or NaN" },
];

/** Every link to a commit page of the site's repository; group 1 is the ref. */
const COMMIT_LINK = /github\.com\/Kinzen-dev\/Kinzen\/commit\/([^"'\s<>\\]*)/g;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(ROOT).filter((f) => /\.(html|rsc|body|segment\.rsc)$/.test(f));
const failures: string[] = [];

for (const file of files) {
  // Strip inline <script> bodies' hashes noise is fine; we scan everything a crawler or client can read.
  const bytes = readFileSync(file);
  // Prerendered image routes (OG cards) are binary PNG bodies: random bytes could spell
  // a forbidden pattern. Their text comes from the same content this script already scans.
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) continue;
  const text = bytes.toString("utf8");
  for (const hit of findTerms(text, [...BANNED_TERM_HASHES, ...privateTerms])) {
    failures.push(`${file.replace(process.cwd() + "/", "")}: ${termLabel(hit)} (the product rename or a private term)`);
  }
  for (const rule of [...FORBIDDEN, ...HIDDEN_MARKERS]) {
    const match = text.match(rule.pattern);
    if (match) failures.push(`${file.replace(process.cwd() + "/", "")}: ${rule.reason} (matched "${match[0]}")`);
  }
  // The footer links the build's commit only when it is a real SHA (TECH-01): a placeholder such
  // as "local" or an empty ref would publish a link to a GitHub 404.
  for (const match of text.matchAll(COMMIT_LINK)) {
    if (!/^[0-9a-f]{7,40}$/.test(match[1])) {
      failures.push(`${file.replace(process.cwd() + "/", "")}: commit link is not a git SHA (matched "${match[0]}")`);
    }
  }
}

// Client bundles: only the term guard applies (minified code legitimately holds other patterns).
const chunks = existsSync(STATIC) ? walk(STATIC).filter((f) => f.endsWith(".js")) : [];
for (const file of chunks) {
  for (const hit of findTerms(readFileSync(file, "utf8"), [...BANNED_TERM_HASHES, ...privateTerms])) {
    failures.push(`${file.replace(process.cwd() + "/", "")}: ${termLabel(hit)} in a client bundle`);
  }
}

if (files.length === 0) {
  console.error("check-output: no build output found. Run `pnpm build` first.");
  process.exit(1);
}

if (failures.length) {
  console.error(`check-output: ${failures.length} problem(s)\n` + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  `check-output: ${files.length} files and ${chunks.length} client chunks clean` +
    (privateTerms.length ? ` (${privateTerms.length} private terms checked)` : " (no private term list)"),
);
