/**
 * The baked wordmark mask: row-wise run-length data (see scripts/bake-wordmark.mts)
 * decoded into index lists of ink pixels and edge pixels, which is all the sampler needs.
 */
export type MaskSource = { w: number; h: number; runs: string };

export type MaskIndex = {
  w: number;
  h: number;
  /** y * w + x of every ink pixel. */
  ink: Int32Array;
  /** Ink pixels with at least one 4-neighbour off (or on the border). */
  edge: Int32Array;
};

function base64ToU16(b64: string): Uint16Array {
  const bin = atob(b64);
  const out = new Uint16Array(bin.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
  return out;
}

/** Decode to a 0/1 bitmap. Throws if the runs do not tile the mask exactly. */
export function decodeMask(src: MaskSource): Uint8Array {
  const runs = base64ToU16(src.runs);
  const bits = new Uint8Array(src.w * src.h);
  let r = 0;
  for (let y = 0; y < src.h; y++) {
    let x = 0;
    let on = false;
    while (x < src.w) {
      if (r >= runs.length) throw new Error("mask: runs ended early");
      const len = runs[r++];
      if (on) bits.fill(1, y * src.w + x, y * src.w + x + len);
      x += len;
      on = !on;
    }
    if (x !== src.w) throw new Error(`mask: row ${y} sums to ${x}, expected ${src.w}`);
  }
  if (r !== runs.length) throw new Error("mask: trailing runs");
  return bits;
}

export function indexMask(src: MaskSource): MaskIndex {
  const { w, h } = src;
  const bits = decodeMask(src);
  let n = 0;
  for (let i = 0; i < bits.length; i++) n += bits[i];
  const ink = new Int32Array(n);
  const edgeTmp = new Int32Array(n);
  let ni = 0;
  let ne = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!bits[i]) continue;
      ink[ni++] = i;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !bits[i - 1] || !bits[i + 1] || !bits[i - w] || !bits[i + w]) {
        edgeTmp[ne++] = i;
      }
    }
  }
  return { w, h, ink, edge: edgeTmp.slice(0, ne) };
}
