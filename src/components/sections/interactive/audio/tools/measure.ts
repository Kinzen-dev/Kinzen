/*
 * Objective measurements for the section's sound (nobody on the build can listen, so every sound
 * is judged by numbers): loudness (ITU-R BS.1770 integrated, K-weighted, gated), sample peak,
 * spectral centroid and band energy, and how invisible a loop's seam is. Pure functions on
 * Float32Arrays, used by the unit tests and by the offline render reports. Not shipped.
 */
import { Biquad } from "../dsp";

export const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-12));

export function peak(chs: Float32Array[]) {
  let p = 0;
  for (const c of chs) for (let i = 0; i < c.length; i++) p = Math.max(p, Math.abs(c[i]));
  return p;
}

/**
 * Integrated loudness in LUFS (BS.1770-4: K-weighting, 400 ms blocks with 75 % overlap,
 * absolute gate -70 LUFS, relative gate -10 LU). Channels are summed with weight 1 (L, R).
 */
export function lufs(chs: Float32Array[], sr: number) {
  const kw = chs.map((c) => {
    const shelf = new Biquad("highshelf", 1500, Math.SQRT1_2, sr, 4);
    const hp = new Biquad("highpass", 38, 0.5, sr);
    const out = new Float32Array(c.length);
    for (let i = 0; i < c.length; i++) out[i] = hp.run(shelf.run(c[i]));
    return out;
  });
  const block = Math.round(0.4 * sr);
  const hop = Math.round(0.1 * sr);
  const z: number[] = [];
  for (let s = 0; s + block <= kw[0].length; s += hop) {
    let sum = 0;
    for (const c of kw) for (let i = s; i < s + block; i++) sum += c[i] * c[i];
    z.push(sum / block);
  }
  if (!z.length) return -Infinity;
  const L = (m: number) => -0.691 + 10 * Math.log10(Math.max(m, 1e-20));
  const abs = z.filter((m) => L(m) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((m) => L(m) > rel);
  return L(gated.reduce((a, b) => a + b, 0) / gated.length);
}

/** In-place radix-2 FFT (re, im of power-of-two length). */
export function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/** Average power spectrum (Hann windows of `size`, 50 % overlap), bins 0..size/2. */
export function powerSpectrum(x: Float32Array, size = 4096) {
  const out = new Float64Array(size / 2 + 1);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const hop = size / 2;
  let frames = 0;
  for (let s = 0; s === 0 || s + size <= x.length; s += hop) {
    for (let i = 0; i < size; i++) {
      re[i] = (x[s + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= size / 2; k++) out[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
    if (s + size >= x.length) break;
  }
  for (let k = 0; k < out.length; k++) out[k] /= frames;
  return out;
}

/** Power-weighted mean frequency (Hz). */
export function centroid(x: Float32Array, sr: number, size = 4096) {
  const p = powerSpectrum(x, size);
  let num = 0;
  let den = 0;
  for (let k = 1; k < p.length; k++) {
    num += ((k * sr) / size) * p[k];
    den += p[k];
  }
  return den ? num / den : 0;
}

/** Share of the power between `lo` and `hi` Hz (0..1). */
export function bandShare(x: Float32Array, sr: number, lo: number, hi: number, size = 4096) {
  const p = powerSpectrum(x, size);
  let inside = 0;
  let all = 0;
  for (let k = 1; k < p.length; k++) {
    const f = (k * sr) / size;
    all += p[k];
    if (f >= lo && f < hi) inside += p[k];
  }
  return all ? inside / all : 0;
}

/** The frequency (Hz) of the strongest bin. */
export function peakFrequency(x: Float32Array, sr: number, size = 8192) {
  const p = powerSpectrum(x, size);
  let best = 1;
  for (let k = 1; k < p.length; k++) if (p[k] > p[best]) best = k;
  return (best * sr) / size;
}

/** First sample whose magnitude reaches `threshold` (index), or -1. */
export function onset(x: Float32Array, threshold = 1e-3) {
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= threshold) return i;
  return -1;
}

/**
 * How visible a loop's seam is: the jump from the last sample to the first, against the
 * 99.9th percentile of ordinary sample-to-sample steps (< 1 = smaller than the signal's own
 * motion), and the short-term level just before and after the seam, against the level spread
 * across the whole loop (|delta| in dB vs the median 50 ms block-to-block change).
 */
export function seam(x: Float32Array, sr: number) {
  const steps = new Float64Array(x.length - 1);
  for (let i = 1; i < x.length; i++) steps[i - 1] = Math.abs(x[i] - x[i - 1]);
  const sorted = Array.from(steps).sort((a, b) => a - b);
  const p999 = sorted[Math.floor(sorted.length * 0.999)] || 1e-12;
  const jump = Math.abs(x[0] - x[x.length - 1]);
  const blk = Math.round(0.05 * sr);
  const rmsAt = (s: number) => {
    let sum = 0;
    for (let i = 0; i < blk; i++) {
      const v = x[(s + i + x.length) % x.length];
      sum += v * v;
    }
    return db(Math.sqrt(sum / blk));
  };
  const deltas: number[] = [];
  for (let s = blk; s + blk <= x.length; s += blk) deltas.push(Math.abs(rmsAt(s) - rmsAt(s - blk)));
  deltas.sort((a, b) => a - b);
  return {
    jumpRatio: jump / p999,
    levelStepDb: Math.abs(rmsAt(0) - rmsAt(x.length - blk)),
    medianLevelStepDb: deltas[Math.floor(deltas.length / 2)] ?? 0,
  };
}
