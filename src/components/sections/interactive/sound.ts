/*
 * TEMPORARY STUB of v4-sound's audio engine (src/components/sections/interactive/audio/), with the
 * API the lead posted. The scenes and the section import sound from here only; once v4-sound
 * merges, this file becomes plain re-exports of ./audio/* (or is deleted and the imports move).
 */

export type AudioBus = {
  ctx: AudioContext;
  master: GainNode;
  muted: boolean;
  setMuted(m: boolean): void;
  unlock(): Promise<void>;
  onChange(cb: () => void): () => void;
};

const MUTE_KEY = "kp-sound-muted";
let bus: AudioBus | null = null;

export function getAudioBus(): AudioBus {
  if (bus) return bus;
  const ctx = new AudioContext({ latencyHint: "interactive" });
  void ctx.suspend();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  let muted = false;
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    // Storage blocked: sound stays on.
  }
  master.gain.value = muted ? 0 : 1;
  const subs = new Set<() => void>();
  const b: AudioBus = {
    ctx,
    master,
    muted,
    setMuted(m) {
      b.muted = m;
      master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
      try {
        localStorage.setItem(MUTE_KEY, m ? "1" : "0");
      } catch {
        // Storage blocked: the choice holds for this page view.
      }
      subs.forEach((cb) => cb());
    },
    async unlock() {
      await ctx.resume().catch(() => undefined);
      subs.forEach((cb) => cb());
    },
    onChange(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
  };
  bus = b;
  return b;
}

let noiseBuf: AudioBuffer | null = null;
const noise = (ctx: AudioContext) => {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
};
const blip = (b: AudioBus, f: number, gain: number, dur: number, type: OscillatorType = "sine") => {
  const { ctx } = b;
  if (ctx.state !== "running") return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.003);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  o.connect(g).connect(b.master);
  o.start(t);
  o.stop(t + dur + 0.02);
};
const hiss = (b: AudioBus, gain: number, dur: number, f: number) => {
  const { ctx } = b;
  if (ctx.state !== "running") return;
  const t = ctx.currentTime;
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx);
  const bq = ctx.createBiquadFilter();
  bq.type = "bandpass";
  bq.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  s.connect(bq).connect(g).connect(b.master);
  s.start(t);
  s.stop(t + dur + 0.02);
};

export function createRain(b: AudioBus) {
  const { ctx } = b;
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx);
  s.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  const g = ctx.createGain();
  g.gain.value = 0;
  s.connect(lp).connect(g).connect(b.master);
  s.start();
  return {
    setIntensity(k: number) {
      g.gain.setTargetAtTime(k * 0.06, ctx.currentTime, 0.8);
    },
    stop() {
      s.stop();
      g.disconnect();
    },
  };
}

export function createCozyMusic(b: AudioBus) {
  const { ctx } = b;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(b.master);
  let timer = 0;
  let vol = 0.5;
  const notes = [220, 277.2, 329.6, 415.3, 329.6, 277.2];
  let i = 0;
  const tick = () => {
    if (ctx.state === "running") {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = notes[i++ % notes.length];
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(0.05, t + 0.05);
      e.gain.exponentialRampToValueAtTime(1e-4, t + 1.6);
      o.connect(e).connect(g);
      o.start(t);
      o.stop(t + 1.7);
    }
  };
  return {
    start() {
      g.gain.setTargetAtTime(vol, ctx.currentTime, 0.5);
      window.clearInterval(timer);
      timer = window.setInterval(tick, 900);
    },
    stop() {
      window.clearInterval(timer);
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      window.setTimeout(() => g.disconnect(), 800);
    },
    setVolume(v: number) {
      vol = v;
      g.gain.setTargetAtTime(v, ctx.currentTime, 0.3);
    },
  };
}

export function createThock(b: AudioBus) {
  return {
    press(code: string, velocity = 1) {
      blip(b, code === "Space" ? 110 : 160, 0.5 * velocity, 0.09);
      hiss(b, 0.3 * velocity, 0.05, 420);
    },
    release(code: string) {
      blip(b, code === "Space" ? 180 : 260, 0.08, 0.03);
    },
    spaceRipple() {
      blip(b, 880, 0.05, 1.1);
      hiss(b, 0.3, 1.2, 600);
    },
  };
}

export function createSfx(b: AudioBus) {
  return {
    metalClink(speed: number) {
      const v = Math.min(1, speed);
      [1, 2.76, 5.4].forEach((m, i) => blip(b, 1250 * m, [0.25, 0.15, 0.08][i] * v, [1.2, 0.6, 0.3][i]));
    },
    splash(size: number) {
      hiss(b, 0.5 * Math.min(1, size), 0.5, 1800);
    },
    drop(weight: number) {
      blip(b, 1250 - 500 * weight, 0.2 + 0.1 * weight, 0.3);
    },
    phoneRing() {
      let k = 0;
      const id = window.setInterval(() => {
        if (++k > 44) return window.clearInterval(id);
        if (k === 23) return;
        blip(b, 1180, 0.05, 0.18);
        blip(b, 1630, 0.03, 0.14);
      }, 55);
      return () => window.clearInterval(id);
    },
    lamp(on: boolean) {
      hiss(b, 0.4, 0.03, 3000);
      blip(b, on ? 1900 : 1500, 0.08, 0.05, "triangle");
    },
  };
}

export type Sfx = ReturnType<typeof createSfx>;
