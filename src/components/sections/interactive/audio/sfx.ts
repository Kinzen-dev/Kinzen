/*
 * One-shots for the scenes. Recorded where a recording beats any model (gold coins, a pebble's
 * splash, a drip: CC0 field recordings cut into one small sprite, public/audio/sfx.*), synthesized
 * where the physics is simple and the control matters (the bowl's ring, the phone's bell, the lamp
 * switch; see dsp.ts). The sprite loads on the first call after unlock; until it arrives the
 * recorded voices are silent rather than late.
 *
 *  - metalClink(speed): a coin strike; faster impacts ring higher, brighter and louder.
 *  - splash(size): a small object into water; bigger is lower, longer and layered.
 *  - drop(weight): one drip into a bowl and the bowl's soft ring; heavier is lower.
 *  - phoneRing(): an old desk phone's bell (two rings); returns a function that silences it.
 *  - lamp(on): a desk lamp's push switch.
 */
import { SFX } from "./assets";
import { canPlay, isOffline, isUnlocked, type AudioBus } from "./audio-bus";
import { clock } from "./clock";
import { rng, synthBowlRing, synthLampClick, synthPhoneBell, synthRoomIR } from "./dsp";
import { cut, loadAudio, toBuffer } from "./loader";

export type Sfx = {
  metalClink(speed: number): void;
  splash(size: number): void;
  drop(weight: number): void;
  phoneRing(): () => void;
  lamp(on: boolean): void;
  stop(): void;
};

/** Output level into the bus (one-shots sit with the keys: under the music's peaks). */
export const SFX_LEVEL = 0.5;
const ROOM_SEND = 0.16;
const clamp = (x: number) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

export function createSfx(bus: AudioBus): Sfx {
  const { ctx } = bus;
  const sr = ctx.sampleRate;
  const rand = rng(0x5f3);
  const out = ctx.createGain();
  out.gain.value = SFX_LEVEL;
  out.connect(bus.master);
  const room = ctx.createConvolver();
  const [irl, irr] = synthRoomIR(0.6, 23, sr);
  const ir = ctx.createBuffer(2, irl.length, sr);
  ir.getChannelData(0).set(irl);
  ir.getChannelData(1).set(irr);
  room.buffer = ir;
  const send = ctx.createGain();
  send.gain.value = ROOM_SEND;
  send.connect(room).connect(out);

  let clinks: AudioBuffer[] = [];
  let splashes: AudioBuffer[] = [];
  let drops: AudioBuffer[] = [];
  let loading: Promise<void> | null = null;
  const synth = new Map<string, AudioBuffer>();
  let stopped = false;
  let unsub: (() => void) | null = null;

  const load = () => {
    if (loading || stopped) return;
    loading = loadAudio(ctx, SFX.name).then(
      (buf) => {
        if (stopped) return;
        clinks = SFX.clinks.map((s) => cut(ctx, buf, s.start, s.dur));
        splashes = SFX.splashes.map((s) => cut(ctx, buf, s.start, s.dur));
        drops = SFX.drops.map((s) => cut(ctx, buf, s.start, s.dur));
      },
      () => {
        loading = null;
      },
    );
  };
  // Fetch only after the first gesture: a visitor who never interacts downloads nothing.
  if (isUnlocked(bus)) load();
  else
    unsub = bus.onChange(() => {
      if (!isUnlocked(bus)) return;
      unsub?.();
      unsub = null;
      load();
    });

  const made = (key: string, make: () => Float32Array) => {
    let b = synth.get(key);
    if (!b) synth.set(key, (b = toBuffer(ctx, make())));
    return b;
  };

  // A pile-up of contacts in one instant never turns into a roar.
  let burstAt = 0;
  let burst = 0;
  let live = 0;
  const allow = () => {
    const now = ctx.currentTime;
    if (now - burstAt > 0.03) burst = 0;
    burstAt = now;
    return ++burst <= 4 && live < 16;
  };

  const lastPick = new Map<AudioBuffer[], number>();
  const pick = (list: AudioBuffer[]) => {
    if (list.length < 2) return list[0];
    const prev = lastPick.get(list) ?? -1;
    let i = Math.floor(rand() * (list.length - 1));
    if (i >= prev) i++;
    lastPick.set(list, i);
    return list[i];
  };

  const play = (
    buf: AudioBuffer | undefined,
    o: { gain: number; rate?: number; at?: number; wet?: number; lowpass?: number; pan?: number },
  ) => {
    if (!buf) return null;
    const src = new AudioBufferSourceNode(ctx, { buffer: buf, playbackRate: o.rate ?? 1 });
    const g = new GainNode(ctx, { gain: o.gain });
    let head: AudioNode = src;
    if (o.lowpass) {
      const lp = new BiquadFilterNode(ctx, { type: "lowpass", frequency: o.lowpass, Q: 0.5 });
      head = head.connect(lp);
    }
    const p = new StereoPannerNode(ctx, { pan: o.pan ?? 0 });
    head.connect(g).connect(p);
    p.connect(out);
    const wet = new GainNode(ctx, { gain: o.wet ?? 1 });
    p.connect(wet).connect(send);
    live++;
    src.onended = () => {
      live--;
      p.disconnect();
      wet.disconnect();
    };
    src.start(ctx.currentTime + (o.at ?? 0));
    return { src, g };
  };

  return {
    metalClink(speed) {
      if (stopped || !canPlay(bus) || !allow()) return;
      const v = clamp(speed);
      if (v < 0.02) return;
      play(pick(clinks), {
        gain: 0.12 + 0.88 * Math.pow(v, 1.3),
        rate: (0.9 + 0.22 * v) * (0.985 + rand() * 0.03),
        lowpass: 2600 + 13000 * v,
        pan: (rand() * 2 - 1) * 0.25,
        wet: 0.9,
      });
    },
    splash(size) {
      if (stopped || !canPlay(bus) || !allow()) return;
      const s = clamp(size);
      const rate = (1.12 - 0.26 * s) * (0.97 + rand() * 0.06);
      play(pick(splashes), { gain: 0.35 + 0.65 * s, rate, pan: (rand() * 2 - 1) * 0.15, wet: 1.1 });
      // A bigger body throws more water: a second, later, softer splash under the first.
      if (s > 0.55) play(pick(splashes), { gain: 0.35 * s, rate: rate * 0.86, at: 0.035, pan: 0, wet: 1.3 });
    },
    drop(weight) {
      if (stopped || !canPlay(bus) || !allow()) return;
      const w = clamp(weight);
      play(pick(drops), {
        gain: 0.4 + 0.6 * w,
        rate: (1.18 - 0.38 * w) * (0.97 + rand() * 0.06),
        pan: (rand() * 2 - 1) * 0.12,
        wet: 0.8,
      });
      // The bowl answers a moment later, quietly: a heavier drop rings it lower and longer.
      const ring = made("ring", () => synthBowlRing(1240, sr));
      play(ring, { gain: 0.16 + 0.22 * w, rate: (1.12 - 0.42 * w) * (0.98 + rand() * 0.04), at: 0.012, wet: 1.4 });
    },
    phoneRing() {
      if (stopped || !canPlay(bus)) return () => undefined;
      const v = play(
        made("bell", () => synthPhoneBell(3, sr)),
        { gain: 0.55, wet: 1.2 },
      );
      if (!v) return () => undefined;
      let done = false;
      return () => {
        if (done) return;
        done = true;
        const t = ctx.currentTime;
        v.g.gain.setTargetAtTime(0, t, 0.02);
        try {
          v.src.stop(t + 0.12);
        } catch {
          // Already ended.
        }
      };
    },
    lamp(on) {
      if (stopped || !canPlay(bus)) return;
      play(
        made(on ? "lamp-on" : "lamp-off", () => synthLampClick(on, sr)),
        { gain: 0.8, rate: 0.98 + rand() * 0.04, wet: 0.7 },
      );
    },
    stop() {
      if (stopped) return;
      stopped = true;
      unsub?.();
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      const free = () => {
        out.disconnect();
        send.disconnect();
        room.disconnect();
        room.buffer = null;
        clinks = [];
        splashes = [];
        drops = [];
        synth.clear();
        lastPick.clear();
      };
      if (isOffline(bus)) free();
      else clock.set(free, 300);
    },
  };
}
