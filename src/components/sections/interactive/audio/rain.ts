/*
 * Rain at night, heard from a desk by the window. Layered from CC0 field recordings
 * (public/audio/CREDITS.md):
 *  - wash: steady rain over the city, through the glass (a low-passed stereo bed);
 *  - glass: big drops on the pane itself, close (a mono recording played twice, half a loop
 *    apart and panned apart, so it is wide without a second file);
 *  - gusts: every 9-22 s the wind leans on the window for a few seconds: the wash brightens and
 *    swells, the pane gets busier, and a soft band of wind noise sweeps under it;
 *  - thunder(distance): one of three recorded rumbles, after a delay that grows with distance,
 *    darker and quieter the farther it is. Call it when the lightning flashes.
 * setIntensity(0..1) follows the window: light rain is mostly a distant wash, heavy rain brings
 * the pane forward. Files load after the first gesture; the bed fades in over two seconds.
 */
import { RAIN_GLASS, RAIN_WASH, THUNDER } from "./assets";
import { canPlay, isOffline, isUnlocked, type AudioBus } from "./audio-bus";
import { clock } from "./clock";
import { noise, rng } from "./dsp";
import { buildLoop, cut, loadAudio, toBuffer } from "./loader";

export type Rain = {
  setIntensity(v: number): void;
  thunder(distance?: number): void;
  stop(): void;
};

/** Layer levels at intensity 1 (the files are loudness-matched; these set the blend). */
export const RAIN_MIX = { wash: 0.85, glass: 0.5, wind: 0.05, thunder: 0.9 };

export function createRain(bus: AudioBus): Rain {
  const { ctx } = bus;
  const rand = rng(0x9a1);
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(bus.master);

  // The wash goes through the glass: a low-pass whose cutoff opens with intensity and gusts.
  const washLp = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 6000, Q: 0.5 });
  const wash = new GainNode(ctx, { gain: 0 });
  washLp.connect(wash).connect(out);
  const glass = new GainNode(ctx, { gain: 0 });
  glass.connect(out);
  const glassL = new StereoPannerNode(ctx, { pan: -0.55 });
  const glassR = new StereoPannerNode(ctx, { pan: 0.55 });
  glassL.connect(glass);
  glassR.connect(glass);
  const windBp = new BiquadFilterNode(ctx, { type: "bandpass", frequency: 420, Q: 0.9 });
  const wind = new GainNode(ctx, { gain: 0 });
  windBp.connect(wind).connect(out);
  const thunderBus = new GainNode(ctx, { gain: RAIN_MIX.thunder });
  thunderBus.connect(out);

  let intensity = 0.7;
  let stopped = false;
  let started = false;
  let rumbles: AudioBuffer[] = [];
  let nextRumble = Math.floor(rand() * 3);
  const sources: AudioBufferSourceNode[] = [];
  const timers = new Set<number>();
  let unsub: (() => void) | null = null;

  const later = (fn: () => void, ms: number) => {
    const id = clock.set(() => {
      timers.delete(id);
      if (!stopped) fn();
    }, ms);
    timers.add(id);
  };

  const levels = (v: number) => ({
    wash: RAIN_MIX.wash * Math.pow(v, 0.7),
    glass: RAIN_MIX.glass * Math.pow(v, 1.4),
    cutoff: 3800 + 4200 * v,
  });

  const apply = (tc: number) => {
    const t = ctx.currentTime;
    const l = levels(intensity);
    wash.gain.setTargetAtTime(l.wash, t, tc);
    glass.gain.setTargetAtTime(l.glass, t, tc);
    washLp.frequency.setTargetAtTime(l.cutoff, t, tc);
  };

  const loop = (buf: AudioBuffer, dest: AudioNode, offset: number) => {
    const s = new AudioBufferSourceNode(ctx, { buffer: buf, loop: true });
    s.connect(dest);
    s.start(ctx.currentTime, offset % buf.duration);
    sources.push(s);
  };

  const gust = () => {
    later(gust, 9000 + rand() * 13000);
    if (!canPlay(bus) || intensity < 0.15) return;
    const t = ctx.currentTime;
    const dur = 3 + rand() * 3;
    const k = 0.5 + 0.5 * rand();
    const l = levels(intensity);
    const peak = t + dur * 0.4;
    const end = t + dur;
    // Swell in, hold briefly, settle: exponential-ish curves on every layer.
    wash.gain.setTargetAtTime(l.wash * (1 + 0.35 * k), t, dur * 0.18);
    wash.gain.setTargetAtTime(l.wash, peak, dur * 0.22);
    glass.gain.setTargetAtTime(l.glass * (1 + 0.8 * k), t + 0.2, dur * 0.15);
    glass.gain.setTargetAtTime(l.glass, peak, dur * 0.25);
    washLp.frequency.setTargetAtTime(Math.min(11000, l.cutoff * (1 + 0.5 * k)), t, dur * 0.18);
    washLp.frequency.setTargetAtTime(l.cutoff, peak, dur * 0.25);
    wind.gain.setTargetAtTime(RAIN_MIX.wind * k * intensity, t, dur * 0.2);
    wind.gain.setTargetAtTime(0, peak, dur * 0.2);
    windBp.frequency.setValueAtTime(windBp.frequency.value, t);
    windBp.frequency.exponentialRampToValueAtTime(380 + 420 * k, peak);
    windBp.frequency.exponentialRampToValueAtTime(330, end);
  };

  const begin = async () => {
    if (started || stopped) return;
    started = true;
    try {
      const [w, g] = await Promise.all([loadAudio(ctx, RAIN_WASH.name), loadAudio(ctx, RAIN_GLASS.name)]);
      if (stopped) return;
      const washBuf = buildLoop(ctx, w, RAIN_WASH.loop);
      const glassBuf = buildLoop(ctx, g, RAIN_GLASS.loop);
      const at = rand();
      loop(washBuf, washLp, at * washBuf.duration);
      loop(glassBuf, glassL, at * glassBuf.duration);
      loop(glassBuf, glassR, (at + 0.5) * glassBuf.duration);
      // Wind: four seconds of noise, looped (white noise has no audible seam), band-passed.
      const windBuf = toBuffer(ctx, noise(new Float32Array(Math.round(4 * ctx.sampleRate)), 0.5, rand));
      loop(windBuf, windBp, 0);
      out.gain.setValueAtTime(0, ctx.currentTime);
      out.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
      apply(0.05);
      later(gust, 5000 + rand() * 6000);
    } catch {
      started = false;
      return;
    }
    // Thunder after the bed: it is only needed when the sky flashes.
    loadAudio(ctx, THUNDER.name).then(
      (buf) => {
        if (!stopped) rumbles = THUNDER.segments.map((s) => cut(ctx, buf, s.start, s.dur));
      },
      () => undefined,
    );
  };

  if (isUnlocked(bus)) void begin();
  else
    unsub = bus.onChange(() => {
      if (!isUnlocked(bus)) return;
      unsub?.();
      unsub = null;
      void begin();
    });

  return {
    setIntensity(v) {
      intensity = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
      if (started) apply(0.8);
    },
    thunder(distance = 0.6) {
      if (stopped || !canPlay(bus) || !rumbles.length) return;
      const d = Math.max(0, Math.min(1, distance));
      const buf = rumbles[nextRumble++ % rumbles.length];
      // Light first, sound after: about a second per third of the way to the horizon.
      const at = ctx.currentTime + 0.2 + d * 2.4;
      const src = new AudioBufferSourceNode(ctx, { buffer: buf, playbackRate: 0.94 + rand() * 0.08 - d * 0.06 });
      const lp = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 300 + 1700 * (1 - d) * (1 - d), Q: 0.5 });
      const g = new GainNode(ctx, { gain: 1 - 0.6 * d });
      src.connect(lp).connect(g).connect(thunderBus);
      src.onended = () => g.disconnect();
      src.start(at);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      unsub?.();
      timers.forEach((id) => clock.clear(id));
      timers.clear();
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 0.3);
      const free = () => {
        for (const s of sources) {
          try {
            s.stop();
          } catch {
            // Never started.
          }
          s.disconnect();
          s.buffer = null;
        }
        sources.length = 0;
        rumbles = [];
        out.disconnect();
      };
      if (isOffline(bus)) free();
      else clock.set(free, 360);
    },
  };
}
