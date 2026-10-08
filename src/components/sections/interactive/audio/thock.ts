/*
 * The keycap field's switches: a fully modded linear board (see dsp.ts for the model). All the
 * sound is rendered once, when the voice is created, into a small bank of buffers: press variants
 * at two velocity layers, top-out (release) variants, and the space bar's own deeper set. A key
 * press then only picks a buffer and starts it: one AudioBufferSourceNode and one GainNode, no
 * synthesis, scheduled at the context's current time (no lookahead, no queue).
 *
 * Never a machine gun: each key has its own stable character (a few percent of pitch from its
 * code, a place in the stereo field from its column), and each press varies around it (variant
 * rotation without immediate repeats, +-1.2 % pitch, +-1 dB, up to 1.2 ms of timing). Harder
 * presses use the brighter layer, sit a hair higher and louder. Auto-repeat is ignored.
 */
import { canPlay, isOffline, type AudioBus } from "./audio-bus";
import { clock } from "./clock";
import { hash, rng, synthKey, synthRipple, synthRoomIR, type KeyVoice } from "./dsp";
import { toBuffer } from "./loader";

export type Thock = {
  press(code: string, velocity?: number): void;
  release(code: string): void;
  spaceRipple(): void;
  stop(): void;
};

/** Output level of the whole board into the bus (keys peak no louder than the music). */
export const THOCK_LEVEL = 0.45;
const ROOM_SEND = 0.11;
const VARIANTS = { key: 5, space: 3, release: 4, spaceRelease: 2 };
const MAX_VOICES = 24;

/** ANSI rows, for a key's place left to right (its pan). */
const ROWS = [
  "Escape F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12",
  "Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal Backspace",
  "Tab KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Backslash",
  "CapsLock KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote Enter",
  "ShiftLeft KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash ShiftRight",
  "ControlLeft MetaLeft AltLeft Space AltRight MetaRight ControlRight ArrowLeft ArrowDown ArrowRight",
];
/** Long keys sit on stabilisers: a little lower and rounder. */
const LONG = new Set(["Backspace", "Enter", "ShiftLeft", "ShiftRight", "Tab", "CapsLock", "Backslash"]);

type KeyChar = { pan: number; rate: number; wide: boolean };

export function keyCharacter(code: string): KeyChar {
  const h = hash(code);
  const wide = code === "Space";
  let pan = ((h % 1000) / 1000) * 0.6 - 0.3;
  for (const row of ROWS) {
    const keys = row.split(" ");
    const i = keys.indexOf(code);
    if (i >= 0) pan = keys.length > 1 ? ((i / (keys.length - 1)) * 2 - 1) * 0.3 : 0;
  }
  if (wide) pan = 0;
  // Each cap is cut a little differently: +-3 % of pitch, stable for the key.
  let rate = 0.97 + (((h >>> 10) % 1000) / 1000) * 0.06;
  if (LONG.has(code)) rate *= 0.93;
  return { pan, rate, wide };
}

export function createThock(bus: AudioBus): Thock {
  const { ctx } = bus;
  const sr = ctx.sampleRate;
  const rand = rng(0x7b0c);
  const out = ctx.createGain();
  out.gain.value = THOCK_LEVEL;
  out.connect(bus.master);
  // One shared small room on a send.
  const room = ctx.createConvolver();
  const [irl, irr] = synthRoomIR(0.45, 11, sr);
  const ir = ctx.createBuffer(2, irl.length, sr);
  ir.getChannelData(0).set(irl);
  ir.getChannelData(1).set(irr);
  room.normalize = true;
  room.buffer = ir;
  const send = ctx.createGain();
  send.gain.value = ROOM_SEND;
  send.connect(room).connect(out);
  // Five fixed places across the board; a key joins the nearest.
  const pans = [-0.3, -0.15, 0, 0.15, 0.3].map((p) => {
    const n = ctx.createStereoPanner();
    n.pan.value = p;
    n.connect(out);
    n.connect(send);
    return n;
  });

  type Bank = { soft: AudioBuffer[]; hard: AudioBuffer[] };
  const bank: Record<"key" | "space", Bank> & Record<"release" | "spaceRelease", AudioBuffer[]> = {
    key: { soft: [], hard: [] },
    space: { soft: [], hard: [] },
    release: [],
    spaceRelease: [],
  };
  let ripple: AudioBuffer | null = null;
  const render = (v: KeyVoice, seed: number) => toBuffer(ctx, synthKey(v, seed, sr));

  // The first of each kind now (a key pressed this instant has a sound); the rest in small slices.
  const jobs: (() => void)[] = [];
  const queue = (kind: "key" | "space", i: number) => {
    const wide = kind === "space";
    jobs.push(() => bank[kind].soft.push(render({ kind: "press", wide, hard: false }, 100 * i + (wide ? 50 : 0))));
    jobs.push(() => bank[kind].hard.push(render({ kind: "press", wide, hard: true }, 100 * i + (wide ? 51 : 1))));
  };
  for (let i = 0; i < Math.max(VARIANTS.key, VARIANTS.space); i++) {
    if (i < VARIANTS.key) queue("key", i);
    if (i < VARIANTS.space) queue("space", i);
    if (i < VARIANTS.release) jobs.push(() => bank.release.push(render({ kind: "release", wide: false, hard: false }, 900 + i)));
    if (i < VARIANTS.spaceRelease)
      jobs.push(() => bank.spaceRelease.push(render({ kind: "release", wide: true, hard: false }, 950 + i)));
  }
  jobs.push(() => (ripple = toBuffer(ctx, synthRipple(5, sr))));
  const first = isOffline(bus) ? jobs.length : 6;
  jobs.splice(0, first).forEach((j) => j());
  let timer = 0;
  const pump = () => {
    timer = 0;
    const start = performance.now();
    while (jobs.length && performance.now() - start < 6) jobs.shift()!();
    if (jobs.length) timer = clock.set(pump, 16);
  };
  if (jobs.length) timer = clock.set(pump, 50);

  const down = new Map<string, number>();
  const last = new Map<string, number>();
  let voices = 0;
  let stopped = false;

  const play = (buf: AudioBuffer, gain: number, rate: number, pan: number, delay = 0) => {
    if (voices >= MAX_VOICES) return;
    const src = new AudioBufferSourceNode(ctx, { buffer: buf, playbackRate: rate });
    const g = new GainNode(ctx, { gain });
    const slot = Math.max(0, Math.min(4, Math.round((pan + 0.3) / 0.15)));
    src.connect(g).connect(pans[slot]);
    voices++;
    src.onended = () => {
      voices--;
      g.disconnect();
    };
    src.start(ctx.currentTime + delay);
  };

  /** The next variant for a key: never the one it just played. */
  const pick = (list: AudioBuffer[], code: string) => {
    if (list.length < 2) return list[0];
    const prev = last.get(code) ?? -1;
    let i = Math.floor(rand() * (list.length - 1));
    if (i >= prev) i++;
    last.set(code, i);
    return list[i];
  };

  return {
    press(code, velocity = 0.7) {
      if (stopped || down.has(code)) return;
      const v = Math.max(0, Math.min(1, velocity));
      down.set(code, v);
      if (!canPlay(bus)) return;
      const ch = keyCharacter(code);
      const set = bank[ch.wide ? "space" : "key"];
      const layer = v >= 0.6 && set.hard.length ? set.hard : set.soft;
      const buf = pick(layer, code);
      if (!buf) return;
      const gain = (0.32 + 0.68 * Math.pow(v, 1.4)) * Math.pow(10, (rand() * 2 - 1) / 20);
      const rate = ch.rate * (1 + (rand() * 2 - 1) * 0.012) * (0.99 + 0.02 * v);
      play(buf, gain, rate, ch.pan, rand() * 0.0012);
    },
    release(code) {
      const v = down.get(code);
      if (stopped || v === undefined) return;
      down.delete(code);
      if (!canPlay(bus)) return;
      const ch = keyCharacter(code);
      const buf = pick(ch.wide ? bank.spaceRelease : bank.release, `${code}:up`);
      if (!buf) return;
      const gain = (0.55 + 0.45 * v) * Math.pow(10, (rand() * 2 - 1) / 20);
      play(buf, gain, ch.rate * (1 + (rand() * 2 - 1) * 0.015), ch.pan);
    },
    spaceRipple() {
      if (stopped || !ripple || !canPlay(bus)) return;
      play(ripple, 0.8, 0.97 + rand() * 0.06, 0);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (timer) clock.clear(timer);
      jobs.length = 0;
      down.clear();
      last.clear();
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      const free = () => {
        out.disconnect();
        send.disconnect();
        room.disconnect();
        room.buffer = null;
        pans.forEach((p) => p.disconnect());
        bank.key = { soft: [], hard: [] };
        bank.space = { soft: [], hard: [] };
        bank.release = [];
        bank.spaceRelease = [];
        ripple = null;
      };
      if (isOffline(bus)) free();
      else clock.set(free, 150);
    },
  };
}
