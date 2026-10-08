/**
 * Opt-in sound, synthesised (no files): a temple bell (inharmonic partials, long decay), a coin
 * clink, a soft wooden tick for handoffs, a low thud at the guardrail and a shimmer when a
 * lantern lights. Nothing is created until the visitor turns sound on.
 */
export type Sfx = "bell" | "clink" | "tick" | "thud" | "shimmer";

export function createSound() {
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let on = false;

  const ensure = () => {
    if (ctx) return ctx;
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    out = ctx.createGain();
    out.gain.value = 0.55;
    out.connect(comp).connect(ctx.destination);
    return ctx;
  };

  const tone = (
    c: AudioContext,
    freq: number,
    at: number,
    gain: number,
    decay: number,
    type: OscillatorType = "sine",
    pan = 0,
  ) => {
    const o = c.createOscillator();
    const g = c.createGain();
    const p = c.createStereoPanner();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    p.pan.value = pan;
    o.connect(g).connect(p).connect(out!);
    o.start(at);
    o.stop(at + decay + 0.05);
  };

  const noise = (c: AudioContext, at: number, gain: number, dur: number, freq: number) => {
    const len = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(out!);
    src.start(at);
  };

  return {
    get on() {
      return on;
    },
    set(next: boolean) {
      on = next;
      if (next) void ensure().resume();
      else void ctx?.suspend();
    },
    play(kind: Sfx, pan = 0) {
      if (!on || !ctx) return;
      const c = ctx;
      const t = c.currentTime + 0.01;
      if (kind === "bell") {
        // A bronze bell: partials at non-integer ratios, the low ones ringing longest.
        const f0 = 174;
        const parts: [number, number, number][] = [
          [0.5, 0.16, 6.5],
          [1, 0.22, 5.5],
          [2.01, 0.1, 4],
          [2.76, 0.12, 3.2],
          [3.9, 0.06, 2.2],
          [5.4, 0.05, 1.6],
          [6.8, 0.03, 1.1],
        ];
        for (const [ratio, gain, decay] of parts) {
          tone(c, f0 * ratio, t, gain, decay, "sine", pan);
          tone(c, f0 * ratio * 1.004, t, gain * 0.5, decay * 0.9, "sine", pan);
        }
        noise(c, t, 0.12, 0.08, 900);
      } else if (kind === "clink") {
        tone(c, 2480, t, 0.07, 0.35, "sine", pan);
        tone(c, 3710, t, 0.05, 0.22, "sine", pan);
        tone(c, 2480, t + 0.16, 0.035, 0.25, "sine", pan);
        tone(c, 3710, t + 0.27, 0.02, 0.15, "sine", pan);
      } else if (kind === "tick") {
        noise(c, t, 0.08, 0.04, 1800);
        tone(c, 880, t, 0.025, 0.08, "triangle", pan);
      } else if (kind === "thud") {
        tone(c, 92, t, 0.22, 0.45, "sine", pan);
        tone(c, 140, t, 0.08, 0.3, "triangle", pan);
        noise(c, t, 0.06, 0.12, 300);
      } else {
        for (let i = 0; i < 4; i++) tone(c, 1320 * (1 + i * 0.25), t + i * 0.06, 0.03, 0.6, "sine", pan);
      }
    },
    dispose() {
      void ctx?.close();
      ctx = null;
      out = null;
    },
  };
}

export type Sound = ReturnType<typeof createSound>;
