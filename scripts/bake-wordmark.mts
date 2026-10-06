/**
 * Bakes the hero wordmark into a 1-bit glyph mask for the particle field.
 *
 * The mask is cut from the real DOM wordmark (`[data-hero-wordmark]`) of a running
 * production build, so it carries the exact shipped glyphs: Geist 600, the hero's
 * tracking and feature settings. The field never waits on `document.fonts` and never
 * rasterises text on the main thread.
 *
 * Usage (from the repo root, with the site built):
 *   pnpm start -p 4321 &
 *   pnpm fx:bake            # or: tsx scripts/bake-wordmark.mts http://localhost:4321/
 *
 * Output: src/fx/baked/wordmark.ts + geometry.ts (committed). Re-run whenever the wordmark text,
 * font, weight or tracking changes.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:4321/";
const FONT_PX = 512; // bake size; ink is about 1.6k px wide, enough for a 4K hero
const PAD_EM = 0.25; // room for glyph ink that overflows the 0.76 line box
const THRESHOLD = 110; // luminance cut for white-on-black (0..255)
const OUT = join(process.cwd(), "src/fx/baked/wordmark.ts");
const OUT_GEO = join(process.cwd(), "src/fx/baked/geometry.ts");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 1 });
// tsx (esbuild keepNames) wraps named functions in __name(); define it in the page.
await page.addInitScript("globalThis.__name = (f) => f");
await page.goto(BASE, { waitUntil: "load" });

const info = await page.evaluate(
  async ({ fontPx, padEm }) => {
    const el = document.querySelector<HTMLElement>("[data-hero-wordmark]");
    if (!el) throw new Error("no [data-hero-wordmark] on the page");
    const family = getComputedStyle(el).fontFamily;
    await document.fonts.load(`600 ${fontPx}px ${family}`, el.textContent ?? "");
    await document.fonts.ready;
    // Anything around the element must read as "off" (the screenshot box is rounded out).
    // Lift it out of the hero (overflow-clip) so nothing clips the big glyphs; classes travel with it.
    document.body.appendChild(el);
    document.documentElement.style.background = "#000";
    document.body.style.background = "#000";
    Object.assign(el.style, {
      fontSize: `${fontPx}px`,
      padding: `${padEm}em`,
      margin: "0",
      width: "max-content",
      position: "absolute",
      left: "0",
      top: "0",
      zIndex: "9999",
      color: "#fff",
      background: "#000",
      opacity: "1",
    });
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent ?? "").trim(),
      family,
      weight: cs.fontWeight,
      tracking: cs.letterSpacing,
      features: cs.fontFeatureSettings,
      loaded: document.fonts.check(`600 ${fontPx}px ${family}`),
    };
  },
  { fontPx: FONT_PX, padEm: PAD_EM },
);
if (!info.loaded) throw new Error(`font not loaded: ${info.family}`);

const png = await page.locator("[data-hero-wordmark]").screenshot({ type: "png" });

// Decode in the page (canvas), trim to the ink box and run-length encode each row.
const mask = await page.evaluate(
  async ({ b64, threshold, fontPx, padEm }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const { data, width: W, height: H } = ctx.getImageData(0, 0, c.width, c.height);
    // Ignore a thin frame: the screenshot box is rounded out and can catch page pixels at its edge.
    const EDGE = 8;
    const on = (x: number, y: number) =>
      x >= EDGE && y >= EDGE && x < W - EDGE && y < H - EDGE && data[(y * W + x) * 4] > threshold;
    let minX = W, maxX = -1, minY = H, maxY = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (on(x, y)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    if (maxX < 0) throw new Error("empty mask");
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const runs: number[] = [];
    let ink = 0;
    for (let y = minY; y <= maxY; y++) {
      // Alternating off/on run lengths; each row starts with an off run (may be 0).
      let state = false, len = 0;
      for (let x = minX; x <= maxX; x++) {
        const v = on(x, y);
        if (v) ink++;
        if (v === state) len++;
        else { runs.push(len); state = v; len = 1; }
      }
      runs.push(len);
    }
    const pad = padEm * fontPx;
    return {
      w, h, runs, ink,
      // Ink box origin relative to the line box (content box) origin, in em.
      x0: (minX - pad) / fontPx,
      y0: (minY - pad) / fontPx,
    };
  },
  { b64: png.toString("base64"), threshold: THRESHOLD, fontPx: FONT_PX, padEm: PAD_EM },
);
await browser.close();

// Uint16 little-endian, base64. Row boundaries are implicit: runs in a row sum to w.
if (mask.runs.some((r) => r > 0xffff)) throw new Error("run too long for Uint16");
const bytes = Buffer.alloc(mask.runs.length * 2);
mask.runs.forEach((r, i) => bytes.writeUInt16LE(r, i * 2));

const src = `// Generated by scripts/bake-wordmark.mts from the shipped hero wordmark. Do not edit by hand.
// ${info.text}: ${info.family.split(",")[0]} ${info.weight}, tracking ${info.tracking}, features ${info.features}.
export const WORDMARK = {
  text: ${JSON.stringify(info.text)},
  /** Bake font size in px; mask px / bakePx = em. */
  bakePx: ${FONT_PX},
  /** Ink box offset from the line box origin, in em. */
  x0: ${mask.x0.toFixed(5)},
  y0: ${mask.y0.toFixed(5)},
  /** Mask size in px at bakePx. */
  w: ${mask.w},
  h: ${mask.h},
  /** Ink pixel count at bakePx. */
  ink: ${mask.ink},
  /** Row-wise alternating off/on run lengths, Uint16 LE, base64. */
  runs: "${bytes.toString("base64")}",
} as const;
`;
writeFileSync(OUT, src);

// Geometry only (tiny), for the main-thread stage; the runs stay in the worker chunk.
const geo = `// Generated by scripts/bake-wordmark.mts. Do not edit by hand.
// Ink box of the baked wordmark relative to the line box origin, in em of the wordmark font size.
export const WORDMARK_EM = {
  x0: ${mask.x0.toFixed(5)},
  y0: ${mask.y0.toFixed(5)},
  w: ${(mask.w / FONT_PX).toFixed(5)},
  h: ${(mask.h / FONT_PX).toFixed(5)},
} as const;
`;
writeFileSync(OUT_GEO, geo);
console.log(
  `baked ${info.text} ${mask.w}x${mask.h} ink=${mask.ink} runs=${mask.runs.length} (${bytes.length} B) x0=${mask.x0.toFixed(3)}em y0=${mask.y0.toFixed(3)}em -> ${OUT}`,
);
