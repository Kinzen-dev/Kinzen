import { WORDMARK } from "@/fx/baked/wordmark";
import { decodeMask } from "@/fx/targets/mask";

/** A 0/1 glyph bitmap. Its ink fills the bitmap edge to edge (cropped to the ink box). */
export type Bitmap = { w: number; h: number; bits: Uint8Array };

let wordmark: Bitmap | null = null;

/** The shipped KINZEN ink (Geist 600, the hero's tracking), decoded from the baked mask. */
export function wordmarkBitmap(): Bitmap {
  wordmark ??= { w: WORDMARK.w, h: WORDMARK.h, bits: decodeMask(WORDMARK) };
  return wordmark;
}

/**
 * Renders `text` in the page's Thai face (Noto Sans Thai 600, the site's --font-thai) and crops
 * it to its ink, vowel and tone marks included. Waits for the face so the glyphs are the real ones.
 */
export async function thaiBitmap(text: string, px = 360): Promise<Bitmap> {
  const family =
    getComputedStyle(document.documentElement).getPropertyValue("--font-thai").trim() || "'Noto Sans Thai', sans-serif";
  const font = `600 ${px}px ${family}`;
  try {
    await document.fonts.load(font, text);
  } catch {
    // A missing face falls back to the system Thai font: still the right glyphs.
  }
  const c = document.createElement("canvas");
  const ctx0 = c.getContext("2d");
  if (!ctx0) return { w: 1, h: 1, bits: new Uint8Array(1) };
  ctx0.font = font;
  const wGuess = Math.ceil(ctx0.measureText(text).width + px);
  c.width = wGuess;
  c.height = Math.ceil(px * 2.2);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.font = font;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, px * 0.5, c.height / 2);
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width;
  let y0 = c.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (img[(y * c.width + x) * 4 + 3] > 127) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { w: 1, h: 1, bits: new Uint8Array(1) };
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const bits = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) bits[y * w + x] = img[((y + y0) * c.width + x + x0) * 4 + 3] > 127 ? 1 : 0;
  }
  return { w, h, bits };
}

/** Ink pixel indices and the edge subset (ink with an off 4-neighbour). */
export function inkIndex(b: Bitmap): { ink: Int32Array; edge: Int32Array } {
  const { w, h, bits } = b;
  const ink: number[] = [];
  const edge: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!bits[i]) continue;
      ink.push(i);
      if (
        x === 0 ||
        y === 0 ||
        x === w - 1 ||
        y === h - 1 ||
        !bits[i - 1] ||
        !bits[i + 1] ||
        !bits[i - w] ||
        !bits[i + w]
      )
        edge.push(i);
    }
  }
  return { ink: Int32Array.from(ink), edge: Int32Array.from(edge) };
}

/** Ink coverage (0..1) of each cell when the bitmap is cut into cols x rows. */
export function coverage(b: Bitmap, cols: number, rows: number): Float32Array {
  const out = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const ya = Math.floor((r * b.h) / rows);
    const yb = Math.max(ya + 1, Math.floor(((r + 1) * b.h) / rows));
    for (let c = 0; c < cols; c++) {
      const xa = Math.floor((c * b.w) / cols);
      const xb = Math.max(xa + 1, Math.floor(((c + 1) * b.w) / cols));
      let on = 0;
      for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) on += b.bits[y * b.w + x];
      out[r * cols + c] = on / ((yb - ya) * (xb - xa));
    }
  }
  return out;
}

/** Box-downsample to w x h coverage values (0..1). */
export function downsample(b: Bitmap, w: number, h: number): Float32Array {
  return coverage(b, w, h);
}
