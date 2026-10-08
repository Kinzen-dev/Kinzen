import { WORDMARK } from "@/fx/baked/wordmark";
import { decodeMask } from "@/fx/targets/mask";

/** A 0/1 glyph bitmap. Its ink fills the bitmap edge to edge (cropped to the ink box). */
export type Bitmap = { w: number; h: number; bits: Uint8Array };

let wordmark: Bitmap | null = null;

/** The shipped KINZEN ink, decoded from the baked mask (the same letterforms as the DOM wordmark). */
export function wordmarkBitmap(): Bitmap {
  wordmark ??= { w: WORDMARK.w, h: WORDMARK.h, bits: decodeMask(WORDMARK) };
  return wordmark;
}

/** Crop a 2D canvas's alpha (> 127) to its ink box. */
function cropAlpha(img: Uint8ClampedArray, cw: number, ch: number): Bitmap {
  let x0 = cw;
  let y0 = ch;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (img[(y * cw + x) * 4 + 3] > 127) {
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
    for (let x = 0; x < w; x++) bits[y * w + x] = img[((y + y0) * cw + x + x0) * 4 + 3] > 127 ? 1 : 0;
  }
  return { w, h, bits };
}

/**
 * Renders `text` in the page's own heading face (whatever family the hero title uses, Thai
 * fallback included) at weight 600 and crops it to its ink, vowel and tone marks included. Waits
 * for the face so the glyphs are the real ones.
 */
export async function textBitmap(text: string, family: string, px = 300): Promise<Bitmap> {
  const font = `600 ${px}px ${family}`;
  try {
    await document.fonts.load(font, text);
  } catch {
    // A missing face falls back to the system font: still the right glyphs.
  }
  const c = document.createElement("canvas");
  const probe = c.getContext("2d");
  if (!probe) return { w: 1, h: 1, bits: new Uint8Array(1) };
  probe.font = font;
  c.width = Math.ceil(probe.measureText(text).width + px);
  c.height = Math.ceil(px * 2.2);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.font = font;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, px * 0.5, c.height / 2);
  return cropAlpha(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
}

const indexed = new WeakMap<Bitmap, { ink: Int32Array; edge: Int32Array }>();

/** Ink pixel indices and the edge subset (ink with an off 4-neighbour); computed once per bitmap. */
export function inkIndex(b: Bitmap): { ink: Int32Array; edge: Int32Array } {
  const known = indexed.get(b);
  if (known) return known;
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
  const out = { ink: Int32Array.from(ink), edge: Int32Array.from(edge) };
  indexed.set(b, out);
  return out;
}
