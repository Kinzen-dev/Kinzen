/**
 * Post-build guard: scan every prerendered page and RSC payload for strings that
 * must never ship (wrong numbers, phone numbers, em dashes, hidden entries).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FORBIDDEN } from "../src/content/forbidden";

const ROOT = join(process.cwd(), ".next", "server", "app");

/** Text that exists only on hidden entries and must never reach a page. */
const HIDDEN_MARKERS: { pattern: RegExp; reason: string }[] = [
  { pattern: /Confidential client/, reason: "hidden part-time contract leaked" },
  { pattern: /part-time-contract/, reason: "hidden part-time contract leaked" },
  { pattern: /github\.com\/Kinzen-dev"/, reason: "GitHub profile link is hidden until cleanup" },
  { pattern: /CLAIMS\.md|claimId|provenance/, reason: "provenance must never render" },
  // No joiners anywhere: visible Thai uses nowrap spans (lib/thai-nodes.ts) since review round 5.
  { pattern: /\u2060/, reason: "word joiner in output (use nobr spans, never joiners)" },
  // A React node pushed through a string (template literal, join) renders as this.
  { pattern: /\[object Object\]|>undefined<|>NaN</, reason: "a value rendered as [object Object], undefined or NaN" },
];

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
  for (const rule of [...FORBIDDEN, ...HIDDEN_MARKERS]) {
    const match = text.match(rule.pattern);
    if (match) failures.push(`${file.replace(process.cwd() + "/", "")}: ${rule.reason} (matched "${match[0]}")`);
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

console.log(`check-output: ${files.length} files clean`);
