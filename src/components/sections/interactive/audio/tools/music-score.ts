/*
 * The night desk's lo-fi loop, composed and synthesized here (offline, in Node) and shipped as an
 * encoded file. Eight bars in D major at 72 BPM, swung sixteenths:
 *   | Gmaj9 | F#m9 | Em9 | A13 | Gmaj9 | F#m9 Bm9 | Em9 | A9sus A13 |
 * (IV - iii - ii - V, the second time round via vi), the bar-4 and bar-8 fills on top.
 *  - Electric piano: two-operator FM (1:1, decaying index) with a short tine partial, strummed
 *    rootless voicings, suitcase autopan; low-passed, slightly saturated, ducked by the kick.
 *  - Bass: a round sine with a little second harmonic, root and approach notes.
 *  - Drums: a soft pitched-sine kick, a brushy snare, quiet swung hats; low-passed.
 *  - Vinyl: sparse crackle and a breath of hiss. Tape: slow wow and faint flutter on the mix.
 *  - A small room (convolution) on keys and snare.
 * Every random choice is seeded per pass, every LFO completes whole cycles per pass, and three
 * identical passes are rendered: the middle one, with the reverb and notes of the pass before
 * ringing into its start, is the loop, and the first beat of the third is the crossfade tail.
 */
import { Biquad, rng } from "../dsp";
import { fft } from "./measure";

export const BPM = 72;
export const BARS = 8;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;
export const LOOP_S = BARS * BAR;
const STEP = BEAT / 4;
const SWING = 0.6;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

type Chord = { at: number; len: number; voicing: number[]; bass: number };
/** Chords as [bar, beat offset, beats, voicing, bass]. */
const CHORDS: Chord[] = (
  [
    [0, 0, 4, [59, 62, 66, 69], 43],
    [1, 0, 4, [57, 61, 64, 68], 42],
    [2, 0, 4, [55, 59, 62, 66], 40],
    [3, 0, 4, [55, 61, 66, 71], 45],
    [4, 0, 4, [59, 62, 66, 69], 43],
    [5, 0, 2, [57, 61, 64, 68], 42],
    [5, 2, 2, [57, 61, 62, 66], 47],
    [6, 0, 4, [55, 59, 62, 66], 40],
    [7, 0, 2, [55, 59, 62, 64], 45],
    [7, 2, 2, [55, 61, 66, 71], 45],
  ] as const
).map(([bar, off, beats, voicing, bass]) => ({ at: bar * BAR + off * BEAT, len: beats * BEAT, voicing: [...voicing], bass }));

/** Top-line fills: [bar, beat (may be fractional; .25/.75 are swung), midi, beats, velocity]. */
const FILLS: [number, number, number, number, number][] = [
  [3, 2.5, 69, 0.5, 0.42],
  [3, 3, 71, 0.5, 0.4],
  [3, 3.5, 74, 0.9, 0.46],
  [7, 2.5, 78, 0.45, 0.36],
  [7, 3, 76, 0.45, 0.38],
  [7, 3.25, 74, 0.4, 0.34],
  [7, 3.5, 71, 0.9, 0.4],
];

/** Swing a time on the sixteenth grid: off-beat sixteenths land late. */
function swing(beatPos: number) {
  const step = Math.round(beatPos * 4);
  const odd = step % 2 === 1 && Math.abs(beatPos * 4 - step) < 1e-6;
  return beatPos * BEAT + (odd ? (SWING - 0.5) * 2 * STEP : 0);
}

type Stereo = [Float32Array, Float32Array];
const stereo = (n: number): Stereo => [new Float32Array(n), new Float32Array(n)];

/** Equal-power pan gains for p in -1..1. */
const panGains = (p: number) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

function rhodes(dst: Stereo, sr: number, t0: number, note: number, dur: number, vel: number, pan: number, cents: number) {
  const f = midi(note) * Math.pow(2, cents / 1200);
  const tau = Math.max(0.9, Math.min(3, 1.7 * Math.pow(220 / f, 0.4)));
  const rel = 0.16;
  const n = Math.round((dur + rel * 6) * sr);
  const i0 = Math.round(t0 * sr);
  const [gl, gr] = panGains(pan);
  const w = (2 * Math.PI * f) / sr;
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i >= dst[0].length) break;
    const t = k / sr;
    const index = vel * (2.2 * Math.exp(-t / 0.35) + 0.7);
    let a = Math.min(1, t / 0.002) * Math.exp(-t / tau) * (0.72 + 0.28 * Math.exp(-t / 0.18));
    if (t > dur) a *= Math.exp(-(t - dur) / rel);
    const ph = w * k;
    const body = Math.sin(ph + index * Math.sin(ph));
    const tine = Math.sin(ph * 7.02) * 0.2 * vel * Math.exp(-t / 0.04);
    const bell = Math.sin(ph * 2) * 0.12 * Math.exp(-t / 0.6) + Math.sin(ph * 3) * 0.05 * Math.exp(-t / 0.3);
    const s = (body + tine + bell) * a * vel;
    dst[0][i] += s * gl;
    dst[1][i] += s * gr;
  }
}

function bassNote(dst: Float32Array, sr: number, t0: number, note: number, dur: number, vel: number) {
  const f = midi(note);
  const n = Math.round((dur + 0.3) * sr);
  const i0 = Math.round(t0 * sr);
  const w = (2 * Math.PI * f) / sr;
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i >= dst.length) break;
    const t = k / sr;
    let a = Math.min(1, t / 0.012) * Math.exp(-t / 1.3);
    if (t > dur) a *= Math.exp(-(t - dur) / 0.06);
    const s = Math.sin(w * k) + 0.18 * Math.sin(2 * w * k) * Math.exp(-t / 0.4);
    dst[i] += Math.tanh(1.4 * s * a) * vel;
  }
}

function kick(dst: Float32Array, sr: number, t0: number, vel: number, rand: () => number) {
  const n = Math.round(0.5 * sr);
  const i0 = Math.round(t0 * sr);
  let ph = 0;
  const lp = new Biquad("lowpass", 2500, 0.7, sr);
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i >= dst.length) break;
    const t = k / sr;
    const f = 53 + 75 * Math.exp(-t / 0.028);
    ph += (2 * Math.PI * f) / sr;
    const body = Math.sin(ph) * Math.min(1, t / 0.0015) * Math.exp(-t / 0.15);
    const click = lp.run((rand() * 2 - 1) * Math.exp(-t / 0.002)) * 0.25;
    dst[i] += (body + click) * vel;
  }
}

function snare(dst: Stereo, sr: number, t0: number, vel: number, rand: () => number) {
  const n = Math.round(0.4 * sr);
  const i0 = Math.round(t0 * sr);
  const bp = new Biquad("bandpass", 2400, 0.6, sr);
  const lp = new Biquad("lowpass", 6500, 0.6, sr);
  const w = (2 * Math.PI * 186) / sr;
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i >= dst[0].length) break;
    const t = k / sr;
    const body = Math.sin(w * k) * Math.exp(-t / 0.045) * 0.55;
    const brush = lp.run(bp.run(rand() * 2 - 1)) * Math.min(1, t / 0.003) * Math.exp(-t / 0.1) * 1.3;
    const s = (body + brush) * vel;
    dst[0][i] += s * 0.72;
    dst[1][i] += s * 0.68;
  }
}

function hat(dst: Stereo, sr: number, t0: number, vel: number, open: boolean, rand: () => number) {
  const n = Math.round((open ? 0.5 : 0.12) * sr);
  const i0 = Math.round(t0 * sr);
  const hp = new Biquad("highpass", 6500, 0.7, sr);
  const pk = new Biquad("peaking", 9500, 1.2, sr, 5);
  const tau = open ? 0.16 : 0.026;
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    if (i >= dst[0].length) break;
    const t = k / sr;
    const s = pk.run(hp.run(rand() * 2 - 1)) * Math.min(1, t / 0.0008) * Math.exp(-t / tau) * vel;
    dst[0][i] += s * 0.62;
    dst[1][i] += s * 0.78;
  }
}

/** Short crackle grains (a click and its tiny ring), picked at random per event. */
function crackle(dst: Stereo, sr: number, from: number, to: number, rand: () => number) {
  let t = from;
  while (true) {
    t += -Math.log(1 - rand()) / 7;
    if (t >= to) break;
    const i0 = Math.round(t * sr);
    // Mostly faint ticks; now and then a pop.
    const amp = Math.pow(rand(), 3.2) * 0.9 + 0.02;
    const bp = new Biquad("bandpass", 1500 + rand() * 4500, 0.9 + rand() * 1.5, sr);
    const n = Math.round((0.0015 + rand() * 0.003) * sr);
    const [gl, gr] = panGains(rand() * 1.4 - 0.7);
    for (let k = 0; k < n * 4; k++) {
      const i = i0 + k;
      if (i >= dst[0].length) break;
      const x = k < n ? (rand() * 2 - 1) * (1 - k / n) : 0;
      const s = bp.run(x) * amp;
      dst[0][i] += s * gl;
      dst[1][i] += s * gr;
    }
  }
}

/** Convolve a signal with an impulse response (FFT overlap-add). */
export function convolve(x: Float32Array, h: Float32Array): Float32Array {
  let size = 1;
  while (size < h.length * 2) size <<= 1;
  const block = size - h.length + 1;
  const hr = new Float64Array(size);
  const hi = new Float64Array(size);
  hr.set(h);
  fft(hr, hi);
  const out = new Float32Array(x.length + h.length - 1);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let s = 0; s < x.length; s += block) {
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < block && s + i < x.length; i++) re[i] = x[s + i];
    fft(re, im);
    for (let k = 0; k < size; k++) {
      const a = re[k] * hr[k] - im[k] * hi[k];
      const b = re[k] * hi[k] + im[k] * hr[k];
      // Conjugate for the inverse transform.
      re[k] = a;
      im[k] = -b;
    }
    fft(re, im);
    for (let i = 0; i < size && s + i < out.length; i++) out[s + i] += re[i] / size;
  }
  return out;
}

function roomIR(sr: number, seconds: number, seed: number): [Float32Array, Float32Array] {
  const rand = rng(seed);
  const n = Math.round(seconds * sr);
  const out: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) {
    const lp = new Biquad("lowpass", 5000, 0.6, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      if (i % 256 === 0) lp.set("lowpass", 900 + 4200 * Math.exp(-t / 0.25), 0.6, sr);
      out[c][i] = lp.run((rand() * 2 - 1) * Math.exp(-t / (seconds / 6.9)) * Math.min(1, t / 0.012));
    }
  }
  return out;
}

/**
 * Render the loop: returns the stereo body (exactly LOOP_S) followed by `tail` seconds of its
 * own continuation (for the player's crossfade), and the sample rate.
 */
export function renderCozyLoop(sr: number, tail = 0.75): { channels: Stereo; body: number; tail: number } {
  const passes = 3;
  const total = Math.round((passes * LOOP_S + 2) * sr);
  const keys = stereo(total);
  const bass = new Float32Array(total);
  const kickBus = new Float32Array(total);
  const kit = stereo(total);
  const snareBus = stereo(total);
  const vinyl = stereo(total);
  const kicks: number[] = [];

  for (let p = 0; p < passes; p++) {
    const base = p * LOOP_S;
    // Seeded per pass: every pass is identical, so the middle one loops onto itself.
    const rand = rng(1234);
    const human = () => (rand() * 2 - 1) * 0.004;
    for (const c of CHORDS) {
      const hits = c.len > 2 * BEAT ? [0, 2.5] : [0];
      hits.forEach((h, hi) => {
        const at = base + c.at + h * BEAT;
        const len = hi === 0 ? (hits.length > 1 ? 2.35 : 1.85) * BEAT : 1.35 * BEAT;
        const vel = hi === 0 ? 0.62 : 0.42;
        c.voicing.forEach((n, k) => {
          // A lazy strum, low to high.
          const strum = k * (0.011 + rand() * 0.006);
          rhodes(keys, sr, at + strum + human(), n, len, vel * (0.9 + rand() * 0.2), -0.25 + k * 0.17, (rand() * 2 - 1) * 4);
        });
      });
      // Bass: the root on the one, a swung pickup, the root again, then an approach note.
      const next = CHORDS[(CHORDS.indexOf(c) + 1) % CHORDS.length].bass;
      const root = c.bass;
      const at = base + c.at;
      bassNote(bass, sr, at + human(), root, 1.7 * BEAT, 0.9);
      if (c.len > 2 * BEAT) {
        bassNote(bass, sr, at + swing(1.75) + human(), root + 12, 0.3 * BEAT, 0.42);
        bassNote(bass, sr, at + swing(2.5) + human(), root, 0.85 * BEAT, 0.72);
        bassNote(bass, sr, at + swing(3.5) + human(), next + (next > root ? -1 : 1), 0.4 * BEAT, 0.5);
      } else {
        bassNote(bass, sr, at + swing(1.5) + human(), next + (next > root ? -1 : 1), 0.4 * BEAT, 0.5);
      }
    }
    for (const [bar, beat, n, beats, vel] of FILLS)
      rhodes(keys, sr, base + bar * BAR + swing(beat) + human(), n, beats * BEAT, vel, 0.15, (rand() * 2 - 1) * 3);
    for (let bar = 0; bar < BARS; bar++) {
      const b0 = base + bar * BAR;
      const turn = bar % 4 === 3;
      for (let s = 0; s < 16; s++) {
        const at = b0 + swing(s / 4) + human();
        if (s === 0 || s === 7 || s === 10 || (turn && s === 13)) {
          const v = s === 0 ? 0.95 : s === 10 ? 0.8 : 0.7;
          kick(kickBus, sr, at, v, rand);
          kicks.push(at);
        }
        if (s === 4 || s === 12) snare(snareBus, sr, at, 0.62 + rand() * 0.06, rand);
        if (s === 15 && bar % 2 === 1) snare(snareBus, sr, at, 0.12, rand);
        const open = turn && s === 14;
        if (s % 2 === 0 || rand() < 0.75) {
          const v = s % 4 === 0 ? 0.5 : s % 2 === 0 ? 0.4 : 0.2;
          hat(kit, sr, at, v * (0.85 + rand() * 0.3), open, rand);
        }
      }
    }
    crackle(vinyl, sr, base, base + LOOP_S, rand);
  }

  // Keys: warm low-pass, a touch of drive, ducked a little by every kick.
  const duck = new Float32Array(total).fill(1);
  for (const k of kicks) {
    const i0 = Math.round(k * sr);
    for (let i = 0; i < 0.35 * sr && i0 + i < total; i++) duck[i0 + i] *= 1 - 0.2 * Math.exp(-i / (0.11 * sr));
  }
  // Suitcase autopan: exactly 100 cycles per loop.
  const panRate = 100 / LOOP_S;
  for (let c = 0; c < 2; c++) {
    const lp = new Biquad("lowpass", 4300, 0.6, sr);
    const hp = new Biquad("highpass", 160, 0.6, sr);
    const k = keys[c];
    for (let i = 0; i < total; i++) {
      const trem = 1 + 0.16 * Math.sin(2 * Math.PI * panRate * (i / sr) + (c ? Math.PI : 0));
      k[i] = Math.tanh(1.3 * hp.run(lp.run(k[i])) * 0.55) * duck[i] * trem;
    }
  }
  const [irl, irr] = roomIR(sr, 1.6, 77);
  const send = (src: Stereo, amt: number) => {
    const wl = convolve(src[0], irl);
    const wr = convolve(src[1], irr);
    return [wl, wr].map((w) => w.subarray(0, total).map((v) => v * amt)) as unknown as Stereo;
  };
  const keysWet = send(keys, 0.05);
  const snareWet = send(snareBus, 0.04);

  const mix = stereo(total);
  const drumLp = [new Biquad("lowpass", 8000, 0.6, sr), new Biquad("lowpass", 8000, 0.6, sr)];
  const bassLp = new Biquad("lowpass", 380, 0.6, sr);
  const hiss = rng(99);
  const hissBp = [new Biquad("bandpass", 5000, 0.4, sr), new Biquad("bandpass", 5000, 0.4, sr)];
  for (let i = 0; i < total; i++) {
    const b = bassLp.run(bass[i]) * 0.34;
    for (let c = 0; c < 2; c++) {
      const drums = drumLp[c].run(kickBus[i] * 0.5 + kit[c][i] * 0.55 + snareBus[c][i] * 0.5);
      const h = hissBp[c].run(hiss() * 2 - 1) * 0.0025;
      mix[c][i] = keys[c][i] * 0.8 + keysWet[c][i] + snareWet[c][i] + b + drums + vinyl[c][i] * 0.05 + h;
    }
  }
  // Tape: slow wow (8 cycles per loop) and faint flutter (140), as a moving read head.
  const wow = 8 / LOOP_S;
  const flutter = 140 / LOOP_S;
  const outN = Math.round((LOOP_S + tail) * sr);
  const start = Math.round(LOOP_S * sr);
  const res = stereo(outN);
  const master = [new Biquad("lowpass", 11000, 0.6, sr), new Biquad("lowpass", 11000, 0.6, sr)];
  const rumble = [new Biquad("highpass", 32, 0.7, sr), new Biquad("highpass", 32, 0.7, sr)];
  for (let c = 0; c < 2; c++) {
    // Warm the filter on the samples before the loop starts.
    for (let i = start - Math.round(0.5 * sr); i < start; i++) master[c].run(rumble[c].run(mix[c][i]));
    for (let j = 0; j < outN; j++) {
      const i = start + j;
      const t = i / sr;
      const d = (0.006 + 0.0012 * Math.sin(2 * Math.PI * wow * t) + 0.00012 * Math.sin(2 * Math.PI * flutter * t)) * sr;
      const pos = i - d;
      const a = Math.floor(pos);
      const fr = pos - a;
      const v = mix[c][a] * (1 - fr) + mix[c][a + 1] * fr;
      res[c][j] = master[c].run(rumble[c].run(v));
    }
  }
  return { channels: res, body: LOOP_S, tail };
}
