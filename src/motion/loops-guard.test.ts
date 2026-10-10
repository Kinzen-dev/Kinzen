import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every infinite CSS loop must rest off screen, on a hidden tab and while the visitor is idle
// (governor.css), and must animate only what the compositor can run on its own.

const SRC = join(__dirname, "..");
const COMPOSITED = new Set(["transform", "translate", "rotate", "scale", "opacity"]);
// Loops that cannot be compositor-only yet, each with its reason.
const MAIN_THREAD_OK: Record<string, string> = {
  "hw-march": "marching dashes on an SVG arc (stroke-dashoffset); one short path, Helm step 3 only",
};

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return cssFiles(p);
    return name.endsWith(".css") ? [p] : [];
  });
}

/** Innermost declaration blocks as [prelude, body] (comments stripped). */
function blocks(css: string): [string, string][] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: [string, string][] = [];
  const stack: number[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "{") stack.push(i);
    else if (src[i] === "}") {
      const open = stack.pop();
      if (open === undefined) continue;
      const body = src.slice(open + 1, i);
      if (body.includes("{")) continue;
      const before = src.slice(0, open);
      const prelude = before.slice(Math.max(before.lastIndexOf("}"), before.lastIndexOf("{"), before.lastIndexOf(";")) + 1);
      out.push([prelude.trim(), body]);
    }
  }
  return out;
}

function keyframes(css: string): Map<string, Set<string>> {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const map = new Map<string, Set<string>>();
  for (const m of src.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    for (; i < src.length && depth > 0; i++) depth += src[i] === "{" ? 1 : src[i] === "}" ? -1 : 0;
    const props = new Set([...src.slice(start, i).matchAll(/([\w-]+)\s*:/g)].map((p) => p[1]!));
    map.set(m[1]!, props);
  }
  return map;
}

const files = cssFiles(SRC).map((f) => [f.slice(SRC.length + 1), readFileSync(f, "utf8")] as const);
const allKeyframes = new Map(files.flatMap(([, css]) => [...keyframes(css)]));
const loops = files.flatMap(([file, css]) =>
  blocks(css)
    .filter(([, body]) => /animation(-iteration-count)?\s*:[^;]*\binfinite\b/.test(body))
    .map(([prelude, body]) => ({ file, prelude, body })),
);

describe("CSS loops", () => {
  it("finds the loops", () => {
    expect(loops.length).toBeGreaterThan(20);
  });

  it.each(loops.map((l) => [`${l.file}: ${l.prelude}`, l] as const))("%s rests via --loop-play", (_, l) => {
    expect(l.body).toMatch(/animation-play-state\s*:\s*var\(--loop-play,\s*running\)/);
  });

  it.each(loops.map((l) => [`${l.file}: ${l.prelude}`, l] as const))("%s is compositor-only", (_, l) => {
    const name = /animation\s*:\s*([\w-]+)/.exec(l.body)?.[1];
    expect(name, "animation name").toBeTruthy();
    if (!name || MAIN_THREAD_OK[name]) return;
    const props = allKeyframes.get(name);
    expect(props, `@keyframes ${name}`).toBeDefined();
    const slow = [...(props ?? [])].filter((p) => !COMPOSITED.has(p) && p !== "animation-timing-function");
    expect(slow, `${name} animates non-composited properties`).toEqual([]);
  });
});
