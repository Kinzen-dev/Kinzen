/*
 * Pure sample-level synthesis (no Web Audio): the short one-shots the section plays are rendered
 * here into Float32Arrays once, when a scene's voice is created, and then only replayed. Everything
 * is physically informed: an impact is a smooth force pulse driving a bank of damped modal
 * resonators (two-pole filters), so attack shape, pitch and decay come from the same model.
 * Deterministic for a given seed, so tests and offline renders measure exactly what ships.
 */

/** Small fast PRNG (mulberry32), seeded so a voice sounds the same on every visit. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of a string (FNV-1a), for per-key character. */
export function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type FilterType = "lowpass" | "highpass" | "bandpass" | "lowshelf" | "highshelf" | "peaking";

/** RBJ cookbook biquad, transposed direct form II. */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;

  constructor(type: FilterType, freq: number, q: number, sr: number, gainDb = 0) {
    this.set(type, freq, q, sr, gainDb);
  }

  set(type: FilterType, freq: number, q: number, sr: number, gainDb = 0) {
    const w = (2 * Math.PI * Math.min(freq, sr * 0.49)) / sr;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const alpha = sw / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
    switch (type) {
      case "lowpass":
        b0 = (1 - cw) / 2;
        b1 = 1 - cw;
        b2 = b0;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case "highpass":
        b0 = (1 + cw) / 2;
        b1 = -(1 + cw);
        b2 = b0;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case "bandpass":
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case "peaking":
        b0 = 1 + alpha * A;
        b1 = -2 * cw;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cw;
        a2 = 1 - alpha / A;
        break;
      case "lowshelf":
      case "highshelf": {
        const s = type === "lowshelf" ? 1 : -1;
        const r = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - s * (A - 1) * cw + r);
        b1 = 2 * s * A * (A - 1 - s * (A + 1) * cw);
        b2 = A * (A + 1 - s * (A - 1) * cw - r);
        a0 = A + 1 + s * (A - 1) * cw + r;
        a1 = -2 * s * (A - 1 + s * (A + 1) * cw);
        a2 = A + 1 + s * (A - 1) * cw - r;
        break;
      }
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  run(x: number) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }

  /** Filter a whole buffer in place. */
  apply(buf: Float32Array) {
    for (let i = 0; i < buf.length; i++) buf[i] = this.run(buf[i]);
    return buf;
  }
}

/** One damped mode: frequency (Hz), decay time constant (s), amplitude, optional pitch drop. */
export type Mode = { f: number; tau: number; amp: number; glide?: number };

/**
 * Drive a bank of two-pole resonators with an excitation signal and sum them into `out`.
 * `glide` starts a mode that much sharp (0.05 = 5 %) and lets it settle within ~8 ms: the brief
 * stiffening of a struck plate, which is what makes a thock sound like a vowel ("o") and not a tone.
 */
export function modal(out: Float32Array, exc: Float32Array, modes: Mode[], sr: number) {
  // The excitation is a few short pulses: find where it ends so the ring-out loop skips it.
  let active = exc.length;
  while (active > 0 && exc[active - 1] === 0) active--;
  for (const m of modes) {
    if (m.f >= sr * 0.45) continue;
    const r = Math.exp(-1 / (m.tau * sr));
    const rr = r * r;
    // A mode is inaudible after ~-90 dB: 10.4 time constants.
    const end = Math.min(out.length, active + Math.ceil(m.tau * 10.4 * sr));
    let y1 = 0;
    let y2 = 0;
    // An impulse rings at amplitude g / sin(theta): scale so `amp` is the ringing sine's level.
    const g = m.amp * Math.sin((2 * Math.PI * m.f) / sr);
    const settle = Math.exp(-1 / (0.008 * sr));
    let bend = m.glide ?? 0;
    let c = 2 * r * Math.cos((2 * Math.PI * m.f * (1 + bend)) / sr);
    for (let i = 0; i < end; i++) {
      if (bend > 1e-5) {
        bend *= settle;
        c = 2 * r * Math.cos((2 * Math.PI * m.f * (1 + bend)) / sr);
      }
      const y = c * y1 - rr * y2 + (i < active ? g * exc[i] : 0);
      y2 = y1;
      y1 = y;
      out[i] += y;
    }
  }
  return out;
}

/** A smooth force pulse: a raised half-cosine `width` seconds wide, at `at` seconds, peak `amp`. */
export function pulse(out: Float32Array, at: number, width: number, amp: number, sr: number) {
  const i0 = Math.round(at * sr);
  const n = Math.max(2, Math.round(width * sr));
  for (let k = 0; k < n && i0 + k < out.length; k++) out[i0 + k] += amp * Math.sin((Math.PI * k) / n) ** 2;
  return out;
}

/** White noise in place, scaled. */
export function noise(out: Float32Array, amp: number, rand: () => number) {
  for (let i = 0; i < out.length; i++) out[i] = (rand() * 2 - 1) * amp;
  return out;
}

/** Multiply by an exponential envelope with a short linear attack. */
export function envelope(buf: Float32Array, attack: number, tau: number, sr: number, start = 0) {
  const i0 = Math.round(start * sr);
  const a = Math.max(1, Math.round(attack * sr));
  for (let i = 0; i < buf.length; i++) {
    const k = i - i0;
    if (k < 0) {
      buf[i] = 0;
      continue;
    }
    buf[i] *= Math.min(1, k / a) * Math.exp(-k / (tau * sr));
  }
  return buf;
}

/** A gentle tanh saturation that leaves quiet signals linear and rounds the peaks. */
export function soften(buf: Float32Array, drive: number) {
  const k = Math.tanh(drive);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive) / k;
  return buf;
}

export function peakOf(buf: Float32Array) {
  let p = 0;
  for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]));
  return p;
}

export function scaleTo(buf: Float32Array, peak: number) {
  const p = peakOf(buf);
  if (p > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / p;
  return buf;
}

/** Fade the last `dur` seconds to zero with a half-cosine, so no voice ever ends on a click. */
export function tailFade(buf: Float32Array, dur: number, sr: number) {
  const n = Math.min(buf.length, Math.round(dur * sr));
  for (let k = 0; k < n; k++) buf[buf.length - 1 - k] *= Math.sin(((k / n) * Math.PI) / 2) ** 2;
  return buf;
}

/* ------------------------------------------------------------------------------------------------
 * Keyboard: a fully modded linear board (lubed linear switches, PE/poron foam, gasket-mounted
 * aluminium case, thick PBT caps). Bottom-out: the stem lands softly (foam and lube round the force
 * pulse to ~1.5 ms), which rings the plate and case modes between ~100 and ~600 Hz, briefly sharp,
 * then settled; the cap's own cavity modes sit near 0.9-2 kHz but die in a few ms; no case ping
 * (the foam kills anything above ~3 kHz). Top-out on release is the stem hitting the housing top:
 * smaller, higher, quieter. The space bar is a long cap on two lubed stabilisers: lower modes,
 * longer decay, and a second, softer landing a few ms later from the far stabiliser.
 * --------------------------------------------------------------------------------------------- */

export type KeyVoice = { kind: "press" | "release"; wide: boolean; hard: boolean };

const KEY_BODY: Record<"key" | "space" | "release" | "spaceRelease", Mode[]> = {
  key: [
    { f: 132, tau: 0.034, amp: 0.45, glide: 0.06 },
    { f: 212, tau: 0.03, amp: 1, glide: 0.05 },
    { f: 305, tau: 0.024, amp: 0.85, glide: 0.04 },
    { f: 410, tau: 0.018, amp: 0.55, glide: 0.03 },
    { f: 585, tau: 0.012, amp: 0.35 },
  ],
  space: [
    { f: 92, tau: 0.065, amp: 0.55, glide: 0.07 },
    { f: 146, tau: 0.055, amp: 1, glide: 0.06 },
    { f: 214, tau: 0.045, amp: 0.85, glide: 0.05 },
    { f: 296, tau: 0.034, amp: 0.6, glide: 0.04 },
    { f: 405, tau: 0.024, amp: 0.38 },
  ],
  release: [
    { f: 255, tau: 0.022, amp: 0.6, glide: 0.03 },
    { f: 390, tau: 0.018, amp: 1 },
    { f: 640, tau: 0.012, amp: 0.55 },
    { f: 1050, tau: 0.007, amp: 0.22 },
  ],
  spaceRelease: [
    { f: 168, tau: 0.035, amp: 0.7, glide: 0.03 },
    { f: 262, tau: 0.028, amp: 1 },
    { f: 430, tau: 0.018, amp: 0.5 },
    { f: 760, tau: 0.009, amp: 0.2 },
  ],
};

const CAP: Mode[] = [
  { f: 720, tau: 0.016, amp: 0.8 },
  { f: 1020, tau: 0.013, amp: 1 },
  { f: 1460, tau: 0.009, amp: 0.7 },
  { f: 2150, tau: 0.006, amp: 0.4 },
  { f: 2950, tau: 0.0035, amp: 0.2 },
];

/** How loud each layer sits against the body (peak-normalised layers). */
const MIX = {
  press: { cap: 1.25, capHard: 1.7, grain: 0.22, grainHard: 0.32 },
  release: { cap: 1.1, capHard: 1.1, grain: 0.2, grainHard: 0.2 },
};

/** Render one switch event. `seed` varies the modes a few percent, as real keys do. */
export function synthKey(v: KeyVoice, seed: number, sr: number): Float32Array {
  const rand = rng(seed);
  const jit = (x: number, by: number) => x * (1 + (rand() * 2 - 1) * by);
  const press = v.kind === "press";
  const len = press ? (v.wide ? 0.34 : 0.2) : v.wide ? 0.16 : 0.1;
  const n = Math.round(len * sr);
  // Body: plate and case, driven by the soft landing (wider pulse = rounder = less high end).
  const exc = new Float32Array(n);
  const width = press ? (v.hard ? 0.0012 : 0.0017) : 0.001;
  pulse(exc, 0, width, 1, sr);
  // The lubed stem settling a moment later (under the first contact, never a rattle).
  const settle = jit(0.0026, 0.2);
  pulse(exc, settle, width * 1.3, 0.16, sr);
  // The space bar's far stabiliser lands a few ms after the near one.
  const far = jit(0.0045, 0.25);
  if (v.wide && press) pulse(exc, far, width * 1.4, 0.55, sr);
  const body = KEY_BODY[press ? (v.wide ? "space" : "key") : v.wide ? "spaceRelease" : "release"].map((m) => ({
    f: jit(m.f, 0.04),
    tau: jit(m.tau, 0.1),
    amp: jit(m.amp, 0.15),
    glide: m.glide,
  }));
  const out = scaleTo(modal(new Float32Array(n), exc, body, sr), 1);
  // Cap: the thick PBT cap's own short "tock", from the sharper contact at the stem.
  const cexc = new Float32Array(n);
  pulse(cexc, 0, press ? 0.00035 : 0.0003, 1, sr);
  if (v.wide && press) pulse(cexc, far, 0.0004, 0.5, sr);
  const capScale = (v.wide ? 0.7 : 1) * (press ? 1 : 1.35);
  const cap = scaleTo(
    modal(
      new Float32Array(n),
      cexc,
      CAP.map((m) => ({ f: jit(m.f * capScale, 0.05), tau: jit(m.tau, 0.12), amp: jit(m.amp, 0.2) })),
      sr,
    ),
    1,
  );
  // Creamy texture: a whisper of low-passed noise riding the first few ms.
  const grain = noise(new Float32Array(Math.round(0.03 * sr)), 1, rand);
  new Biquad("lowpass", press ? 2600 : 3200, 0.7, sr).apply(grain);
  envelope(grain, 0.0004, press ? 0.0045 : 0.003, sr);
  scaleTo(grain, 1);
  const mix = MIX[v.kind];
  const cg = v.hard ? mix.capHard : mix.cap;
  const gg = v.hard ? mix.grainHard : mix.grain;
  for (let i = 0; i < n; i++) out[i] += cap[i] * cg + (grain[i] ?? 0) * gg;
  // The foam and gasket: nothing above ~4 kHz survives, and the very bottom is not boomy.
  new Biquad("lowpass", press ? 3800 : 4500, 0.6, sr).apply(out);
  new Biquad("highpass", v.wide ? 55 : 75, 0.7, sr).apply(out);
  soften(scaleTo(out, 1), 1.3);
  tailFade(out, 0.03, sr);
  return scaleTo(out, press ? 1 : 0.36);
}

/** The gold rings leaving the space bar: a soft low bloom with a faint metallic shimmer on top. */
export function synthRipple(seed: number, sr: number): Float32Array {
  const rand = rng(seed);
  const out = new Float32Array(Math.round(1.8 * sr));
  const exc = new Float32Array(out.length);
  // A slow push, not a strike: the bloom swells in over ~90 ms.
  pulse(exc, 0, 0.09, 0.02, sr);
  modal(
    out,
    exc,
    [
      { f: 74, tau: 0.5, amp: 1 },
      { f: 111, tau: 0.38, amp: 0.55 },
    ],
    sr,
  );
  const shimmer = new Float32Array(out.length);
  const sexc = new Float32Array(out.length);
  pulse(sexc, 0.03, 0.05, 0.02, sr);
  modal(
    shimmer,
    sexc,
    [
      { f: 1318.5, tau: 0.7, amp: 1 },
      { f: 1975.5, tau: 0.5, amp: 0.55 },
      { f: 2637, tau: 0.32, amp: 0.25 },
    ],
    sr,
  );
  const sp = peakOf(shimmer);
  const op = peakOf(out);
  for (let i = 0; i < out.length; i++) out[i] = out[i] / op + (shimmer[i] / sp) * 0.16 * (0.9 + rand() * 0.2);
  new Biquad("lowpass", 3200, 0.6, sr).apply(out);
  // The slow push also leaves a quasi-static offset; keep only what rings.
  new Biquad("highpass", 45, 0.7, sr).apply(out);
  tailFade(out, 0.4, sr);
  return scaleTo(out, 0.7);
}

/* ------------------------------------------------------------------------------------------------
 * Desk one-shots for the night-desk scene.
 * --------------------------------------------------------------------------------------------- */

/**
 * An old desk telephone's bell: a clapper at ~20 Hz alternating between two small steel gongs
 * (bell partials at the classic inharmonic ratios), two bursts with a pause between. 2.7 s.
 */
export function synthPhoneBell(seed: number, sr: number): Float32Array {
  const rand = rng(seed);
  const out = new Float32Array(Math.round(2.75 * sr));
  const ratios = [1, 2.32, 4.25, 6.63];
  const gong = (f0: number): Mode[] =>
    ratios.map((r, i) => ({ f: f0 * r, tau: [0.55, 0.32, 0.16, 0.08][i], amp: [1, 0.5, 0.26, 0.12][i] }));
  const a = new Float32Array(out.length);
  const b = new Float32Array(out.length);
  for (const start of [0, 1.45]) {
    for (let k = 0; k < 21; k++) {
      const at = start + k * 0.05 + (rand() - 0.5) * 0.004;
      const amp = (0.75 + rand() * 0.25) * Math.min(1, 0.4 + k / 6);
      pulse(k % 2 ? b : a, at, 0.0004, amp, sr);
    }
  }
  modal(out, a, gong(1175), sr);
  modal(out, b, gong(1046), sr);
  new Biquad("highpass", 400, 0.7, sr).apply(out);
  new Biquad("lowpass", 7000, 0.7, sr).apply(out);
  tailFade(out, 0.25, sr);
  return scaleTo(out, 0.5);
}

/** A desk lamp's push switch: the latch click and the spring's tiny ring; "off" sits a bit lower. */
export function synthLampClick(on: boolean, sr: number): Float32Array {
  const out = new Float32Array(Math.round(0.12 * sr));
  const exc = new Float32Array(out.length);
  const p = on ? 1 : 0.86;
  pulse(exc, 0, 0.0003, 1, sr);
  pulse(exc, 0.011, 0.0003, 0.55, sr);
  modal(
    out,
    exc,
    [
      { f: 2300 * p, tau: 0.006, amp: 1 },
      { f: 3600 * p, tau: 0.004, amp: 0.6 },
      { f: 5200 * p, tau: 0.003, amp: 0.3 },
      { f: 340 * p, tau: 0.02, amp: 0.5 },
    ],
    sr,
  );
  tailFade(out, 0.03, sr);
  return scaleTo(out, 0.42);
}

/** The ring a drop leaves in a ceramic bowl: two quiet, slowly decaying modes. */
export function synthBowlRing(f: number, sr: number): Float32Array {
  const out = new Float32Array(Math.round(1.4 * sr));
  const exc = new Float32Array(out.length);
  pulse(exc, 0, 0.002, 1, sr);
  modal(
    out,
    exc,
    [
      { f, tau: 0.42, amp: 1 },
      { f: f * 2.71, tau: 0.18, amp: 0.25 },
      { f: f * 5.1, tau: 0.07, amp: 0.06 },
    ],
    sr,
  );
  tailFade(out, 0.3, sr);
  return scaleTo(out, 0.3);
}

/**
 * A small-room impulse response (stereo): a few early reflections then a decorrelated, darkening
 * exponential tail. Used on a convolver send so every voice shares one quiet room.
 */
export function synthRoomIR(seconds: number, seed: number, sr: number): [Float32Array, Float32Array] {
  const rand = rng(seed);
  const n = Math.round(seconds * sr);
  const out: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) {
    const d = out[c];
    const lp = new Biquad("lowpass", 6000, 0.6, sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      // The tail darkens as it decays (air and soft furnishings eat the highs first).
      if (i % 256 === 0) lp.set("lowpass", 1200 + 5200 * Math.exp(-t / 0.12), 0.6, sr);
      d[i] = lp.run((rand() * 2 - 1) * Math.exp(-t / (seconds / 6.9)) * Math.min(1, t / 0.008));
    }
    for (const [ms, g] of [
      [3.1, 0.5],
      [5.3, 0.35],
      [7.9, 0.3],
      [11.2, 0.22],
    ] as const) {
      const at = Math.round(((ms + c * 0.7) / 1000) * sr);
      if (at < n) d[at] += g * (c ? -1 : 1);
    }
  }
  return out;
}
