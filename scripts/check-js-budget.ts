/**
 * Post-build guard (TECH-05): the JavaScript each prerendered page references must stay inside
 * its route budget. Counts every modern <script src> in the page HTML (the nomodule fallback is
 * skipped: modern browsers never fetch it), deduplicated, read from `.next/static`.
 * gzip = zlib default level, the same measure for every run; decoded = bytes on disk.
 * Chunks loaded later (next/dynamic, import()) are not counted here: the lab runs cover them.
 *
 *   pnpm check:js-budget            fail when a page is over its budget
 *   pnpm check:js-budget --report   print every page's numbers as JSON, never fail
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const NEXT = join(process.cwd(), ".next");
const APP = join(NEXT, "server", "app");

/** Measured gzip bytes plus 10 percent headroom. */
const withHeadroom = (measured: number) => Math.ceil(measured * 1.1);

/**
 * Referenced-JS budgets per route group, in gzip bytes: the measured after-numbers of the
 * TECH-05 pass (largest page in the group, 2026-10-07) plus 10 percent. Raise one only with a
 * measured reason.
 */
const BUDGETS: { group: string; match: RegExp; gzip: number }[] = [
  { group: "home", match: /^\/(en|th)$/, gzip: withHeadroom(163_247) },
  { group: "cv", match: /^\/(en|th)\/cv$/, gzip: withHeadroom(144_493) },
  { group: "work index", match: /^\/(en|th)\/work$/, gzip: withHeadroom(151_372) },
  { group: "case", match: /^\/(en|th)\/work\/[^/]+$/, gzip: withHeadroom(146_500) },
  { group: "privacy", match: /^\/(en|th)\/privacy$/, gzip: withHeadroom(143_845) },
  // Lab (preview branch wow/lab only): rough demos, loose budget.
  { group: "lab", match: /^\/(en|th)\/lab\/[^/]+$/, gzip: 400_000 },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const SCRIPT = /<script\b[^>]*>/g;

function referencedScripts(html: string): string[] {
  const srcs = new Set<string>();
  for (const [tag] of html.matchAll(SCRIPT)) {
    if (/\bnomodule\b/i.test(tag)) continue;
    const src = tag.match(/\bsrc="(\/_next\/static\/[^"]+\.js)"/)?.[1];
    if (src) srcs.add(src);
  }
  return [...srcs];
}

type PageWeight = { route: string; files: number; gzip: number; decoded: number };

function measure(file: string): PageWeight {
  const route = "/" + relative(APP, file).replace(/\.html$/, "");
  const srcs = referencedScripts(readFileSync(file, "utf8"));
  let gzip = 0;
  let decoded = 0;
  for (const src of srcs) {
    const bytes = readFileSync(join(NEXT, src.replace(/^\/_next\//, "")));
    decoded += bytes.length;
    gzip += gzipSync(bytes).length;
  }
  return { route, files: srcs.length, gzip, decoded };
}

const pages = walk(APP)
  .filter((f) => f.endsWith(".html") && !/\/_(not-found|global-error)\.html$/.test(f))
  .map(measure)
  .sort((a, b) => a.route.localeCompare(b.route));

if (pages.length === 0) {
  console.error("check-js-budget: no build output found. Run `pnpm build` first.");
  process.exit(1);
}

if (process.argv.includes("--report")) {
  console.log(JSON.stringify(pages, null, 2));
  process.exit(0);
}

const failures: string[] = [];
for (const page of pages) {
  const budget = BUDGETS.find((b) => b.match.test(page.route));
  if (!budget) {
    failures.push(`${page.route}: no JS budget for this route (add one to BUDGETS)`);
  } else if (page.gzip > budget.gzip) {
    failures.push(`${page.route}: ${page.gzip} B gzip JS, budget ${budget.gzip} B (${budget.group})`);
  }
}

if (failures.length) {
  console.error(`check-js-budget: ${failures.length} page(s) over budget\n` + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

const largest = pages.reduce((a, b) => (b.gzip > a.gzip ? b : a));
console.log(`check-js-budget: ${pages.length} pages within budget (largest ${largest.route}, ${largest.gzip} B gzip)`);
