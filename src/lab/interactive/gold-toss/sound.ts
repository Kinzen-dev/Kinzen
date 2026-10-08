/*
 * Synthesized sound for the lab-ix-b toys (no samples, nothing fetched). Off by default: the
 * AudioContext is created by the toggle click (a user gesture), and closed on unmount.
 *  - clink: a struck metal bar. Free-free bar modes (1, 2.76, 5.40, 8.93) with their own decays,
 *    plus a short bright tick; pitch from the object's size, loudness from the impact speed.
 *  - thud: a heavy body landing on stone (a dropping sine and a low noise puff).
 *  - splash: a band-passed noise sweep and a few rising bubble blips.
 *  - thock: a keycap bottoming out (a pitched-down body, a case resonance and a soft click).
 *  - chime: a small bell for a reward.
 * A short generated room reverb sits on a send so everything shares one space.
 */

export type Sound = {
  readonly on: boolean;
  setOn: (on: boolean) => void;
  clink: (speed: number, size?: number) => void;
  thud: (speed: number) => void;
  splash: (speed: number) => void;
  thock: (strength?: number, pitch?: number, wide?: boolean) => void;
  swell: (strength?: number) => void;
  chime: () => void;
  close: () => void;
};

export function createSound(): Sound {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let send: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let on = false;
  let lastAt = 0;
  let recent = 0;

  const boot = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);
    // Room: 1.1 s of decaying stereo noise as the impulse response.
    const len = Math.round(ctx.sampleRate * 1.1);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    send = ctx.createGain();
    send.gain.value = 0.22;
    send.connect(verb).connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const n = noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    return ctx;
  };

  /** A voice budget: a pile-up of contacts in one instant never turns into a roar. */
  const allow = (now: number) => {
    if (now - lastAt > 0.03) recent = 0;
    lastAt = now;
    return ++recent <= 4;
  };

  const out = (gain: number, wet = 1) => {
    const g = ctx!.createGain();
    g.gain.value = gain;
    g.connect(master!);
    if (wet > 0) {
      const s = ctx!.createGain();
      s.gain.value = wet;
      g.connect(s).connect(send!);
    }
    return g;
  };

  const tone = (dest: AudioNode, f: number, t: number, peak: number, decay: number, f1?: number, fall = 0.04) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + fall);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(1e-4, t + decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + decay + 0.02);
  };

  const burst = (
    dest: AudioNode,
    t: number,
    peak: number,
    decay: number,
    type: BiquadFilterType,
    f: number,
    q: number,
    f1?: number,
  ) => {
    const src = ctx!.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const bq = ctx!.createBiquadFilter();
    bq.type = type;
    bq.frequency.setValueAtTime(f, t);
    if (f1) bq.frequency.exponentialRampToValueAtTime(f1, t + decay);
    bq.Q.value = q;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(1e-4, t + decay);
    src.connect(bq).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.02);
  };

  const ready = () => on && ctx && ctx.state === "running" && master && noise;

  return {
    get on() {
      return on;
    },
    setOn(next) {
      on = next;
      if (next) {
        const c = boot();
        void c?.resume();
      } else void ctx?.suspend();
    },
    clink(speed, size = 1) {
      if (!ready()) return;
      const t = ctx!.currentTime;
      if (!allow(t)) return;
      const v = Math.min(1, speed);
      const dest = out(0.5 * v ** 1.3, 0.9);
      const f = (1250 / Math.sqrt(size)) * (0.94 + Math.random() * 0.12);
      const modes = [1, 2.76, 5.4, 8.93];
      modes.forEach((m, i) => {
        if (f * m > 16000) return;
        tone(dest, f * m, t, [0.5, 0.32, 0.18, 0.09][i], [1.4, 0.7, 0.36, 0.2][i] * (0.6 + v * 0.6));
      });
      burst(dest, t, 0.35, 0.012, "highpass", 5000, 0.7);
    },
    thud(speed) {
      if (!ready()) return;
      const t = ctx!.currentTime;
      if (!allow(t)) return;
      const v = Math.min(1, speed);
      const dest = out(0.7 * v ** 1.2, 0.5);
      tone(dest, 120, t, 0.9, 0.22, 52, 0.12);
      burst(dest, t, 0.5, 0.09, "lowpass", 900, 0.8, 200);
    },
    splash(speed) {
      if (!ready()) return;
      const t = ctx!.currentTime;
      const v = Math.min(1, speed);
      const dest = out(0.55 * (0.35 + 0.65 * v), 0.8);
      burst(dest, t, 0.9, 0.55, "bandpass", 2600, 0.9, 380);
      burst(dest, t + 0.02, 0.5, 0.25, "lowpass", 700, 0.7, 160);
      const n = 4 + Math.round(v * 5);
      for (let i = 0; i < n; i++) {
        const at = t + 0.06 + Math.random() * 0.55;
        const f = 380 + Math.random() * 520;
        tone(dest, f, at, 0.16 * (1 - i / (n + 2)), 0.06, f * 2.4, 0.05);
      }
    },
    thock(strength = 1, pitch = 1, wide = false) {
      if (!ready()) return;
      const t = ctx!.currentTime;
      const v = Math.min(1, strength);
      const dest = out(0.62 * (0.25 + 0.75 * v), 0.35);
      const p = pitch * (0.97 + Math.random() * 0.06);
      // Body: the cap and plate, a short dropping sine.
      tone(dest, (wide ? 118 : 168) * p, t, 0.9, wide ? 0.13 : 0.085, (wide ? 70 : 96) * p, 0.03);
      // Case resonance: the deep "thock" colour.
      burst(dest, t, 0.75, wide ? 0.12 : 0.07, "bandpass", (wide ? 300 : 430) * p, 5);
      // The click of the cap hitting bottom.
      burst(dest, t, 0.32 * v, 0.014, "bandpass", 2400 * p, 1.2);
      // A long key's stabilizer: a tiny late rattle.
      if (wide) burst(dest, t + 0.018, 0.12, 0.03, "bandpass", 1400, 3);
    },
    swell(strength = 1) {
      if (!ready()) return;
      const t = ctx!.currentTime;
      const dest = out(0.35 * strength, 1.2);
      const src = ctx!.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const bq = ctx!.createBiquadFilter();
      bq.type = "bandpass";
      bq.Q.value = 1.4;
      bq.frequency.setValueAtTime(220, t);
      bq.frequency.exponentialRampToValueAtTime(1200, t + 0.5);
      bq.frequency.exponentialRampToValueAtTime(300, t + 1.2);
      const g = ctx!.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.18);
      g.gain.exponentialRampToValueAtTime(1e-4, t + 1.25);
      src.connect(bq).connect(g).connect(dest);
      src.start(t);
      src.stop(t + 1.3);
      tone(dest, 880, t + 0.05, 0.05, 1.1);
      tone(dest, 1318.5, t + 0.12, 0.035, 1.0);
    },
    chime() {
      if (!ready()) return;
      const t = ctx!.currentTime;
      const dest = out(0.4, 1.4);
      [784, 988, 1175, 1568].forEach((f, i) => {
        tone(dest, f, t + i * 0.07, 0.2, 1.6);
        tone(dest, f * 2.01, t + i * 0.07, 0.05, 0.6);
      });
    },
    close() {
      on = false;
      void ctx?.close();
      ctx = null;
    },
  };
}
