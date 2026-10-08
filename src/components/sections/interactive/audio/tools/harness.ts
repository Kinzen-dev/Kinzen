/*
 * Browser side of the offline renders (bundled by render.mts, never shipped): each scene runs the
 * production voices on an OfflineAudioContext through the real bus chain, with the voices' timers
 * driven by the render's own timeline (ctx.suspend), and hands back the samples.
 */
import { createAudioBus } from "../audio-bus";
import { clock } from "../clock";
import { audioBase, loadAudio } from "../loader";
import { createCozyMusic } from "../music";
import { createRain } from "../rain";
import { createSfx } from "../sfx";
import { createThock } from "../thock";

type Step = [at: number, fn: () => void];
type Scene = (bus: ReturnType<typeof createAudioBus>) => { steps: Step[]; settle?: number };

const SR = 48000;

function offlineClock(ctx: OfflineAudioContext) {
  const q = 128 / ctx.sampleRate;
  const taken = new Set<number>();
  const cancelled = new Set<number>();
  let ids = 0;
  const at = (t: number, fn: () => void) => {
    let k = Math.max(Math.ceil(t / q), Math.floor(ctx.currentTime / q) + 1);
    while (taken.has(k)) k++;
    if (k * q >= ctx.length / ctx.sampleRate) return;
    taken.add(k);
    void ctx.suspend(k * q).then(() => {
      fn();
      void ctx.resume();
    });
  };
  clock.set = (fn, ms) => {
    const id = ++ids;
    at(ctx.currentTime + ms / 1000, () => {
      if (!cancelled.has(id)) fn();
    });
    return id;
  };
  clock.clear = (id) => {
    cancelled.add(id);
  };
  return at;
}

const TEXT = "the quick brown fox jumps over the lazy dog";
const codeOf = (ch: string) => (ch === " " ? "Space" : `Key${ch.toUpperCase()}`);

/** Typing with human timing: 70-190 ms between presses, each held 60-120 ms. */
function typing(thock: ReturnType<typeof createThock>, from: number, text: string, seed = 1): Step[] {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const steps: Step[] = [];
  let t = from;
  for (const ch of text) {
    const code = codeOf(ch);
    const v = 0.45 + r() * 0.5;
    steps.push([t, () => thock.press(code, v)]);
    steps.push([t + 0.06 + r() * 0.06, () => thock.release(code)]);
    t += 0.07 + r() * 0.12;
  }
  return steps;
}

export const scenes: Record<string, { seconds: number; run: Scene }> = {
  "thock-single": {
    seconds: 1,
    run: (bus) => {
      const k = createThock(bus);
      return { steps: [[0.5, () => k.press("KeyF", 0.7)], [0.62, () => k.release("KeyF")]] };
    },
  },
  "thock-single-hard": {
    seconds: 1,
    run: (bus) => {
      const k = createThock(bus);
      return { steps: [[0.5, () => k.press("KeyJ", 1)], [0.6, () => k.release("KeyJ")]] };
    },
  },
  "thock-release": {
    seconds: 1,
    run: (bus) => {
      const k = createThock(bus);
      // The top-out is measured on its own window, well after the press has died away.
      return { steps: [[0.1, () => k.press("KeyF", 0.7)], [0.5, () => k.release("KeyF")]] };
    },
  },
  "thock-space": {
    seconds: 1.4,
    run: (bus) => {
      const k = createThock(bus);
      return { steps: [[0.5, () => k.press("Space", 0.8)], [0.75, () => k.release("Space")]] };
    },
  },
  "thock-repeat-a": {
    seconds: 5,
    run: (bus) => {
      const k = createThock(bus);
      const steps: Step[] = [];
      for (let i = 0; i < 20; i++) {
        steps.push([0.2 + i * 0.22, () => k.press("KeyA", 0.7)]);
        steps.push([0.28 + i * 0.22, () => k.release("KeyA")]);
      }
      return { steps };
    },
  },
  "thock-typing": {
    seconds: 7,
    run: (bus) => ({ steps: typing(createThock(bus), 0.3, TEXT) }),
  },
  "thock-ripple": {
    seconds: 2.4,
    run: (bus) => {
      const k = createThock(bus);
      return { steps: [[0.2, () => k.spaceRipple()]] };
    },
  },
  "rain-0.7": {
    seconds: 40,
    run: (bus) => {
      const r = createRain(bus);
      r.setIntensity(0.7);
      return {
        settle: 1.5,
        steps: [
          [12, () => r.thunder(0.5)],
          [27, () => r.thunder(0.9)],
        ],
      };
    },
  },
  "rain-0.3": {
    seconds: 14,
    run: (bus) => {
      createRain(bus).setIntensity(0.3);
      return { settle: 1.5, steps: [] };
    },
  },
  "rain-1.0": {
    seconds: 14,
    run: (bus) => {
      createRain(bus).setIntensity(1);
      return { settle: 1.5, steps: [] };
    },
  },
  music: {
    seconds: 60,
    run: (bus) => {
      const m = createCozyMusic(bus);
      m.start();
      return { settle: 1.5, steps: [] };
    },
  },
  "night-desk": {
    seconds: 40,
    run: (bus) => {
      const r = createRain(bus);
      r.setIntensity(0.7);
      const m = createCozyMusic(bus);
      m.start();
      const k = createThock(bus);
      return { settle: 1.5, steps: [[15, () => r.thunder(0.6)], ...typing(k, 22, TEXT, 7)] };
    },
  },
  "sfx-clinks": {
    seconds: 4,
    run: (bus) => {
      const s = createSfx(bus);
      return {
        settle: 0.8,
        steps: [0.15, 0.4, 0.7, 1].map((v, i) => [0.3 + i * 0.9, () => s.metalClink(v)] as Step),
      };
    },
  },
  "sfx-splash": {
    seconds: 4,
    run: (bus) => {
      const s = createSfx(bus);
      return { settle: 0.8, steps: [[0.3, () => s.splash(0.3)], [2, () => s.splash(1)]] };
    },
  },
  "sfx-drop": {
    seconds: 4,
    run: (bus) => {
      const s = createSfx(bus);
      return { settle: 0.8, steps: [[0.3, () => s.drop(0.15)], [2, () => s.drop(0.85)]] };
    },
  },
  "sfx-knocks": {
    seconds: 6,
    run: (bus) => {
      const s = createSfx(bus);
      const kinds = ["mug", "pen", "ball", "desk", "floor", "wall", "phone", "lamp"] as const;
      return {
        steps: [
          ...kinds.map((k, i) => [0.2 + i * 0.6, () => s.knock(k, 0.7)] as Step),
          [5, () => s.thud(0.9)],
        ],
      };
    },
  },
  "sfx-materials": {
    seconds: 4.5,
    run: (bus) => {
      const s = createSfx(bus);
      const mats = ["ceramic", "wood", "paper", "metal"] as const;
      return {
        steps: [
          ...mats.map((m, i) => [0.2 + i * 0.8, () => s.knock(m, 0.8)] as Step),
          [3.6, () => s.knock("paper", 0.3)],
        ],
      };
    },
  },
  "sfx-purr-chime": {
    seconds: 4,
    run: (bus) => {
      const s = createSfx(bus);
      return { steps: [[0.2, () => s.purr()], [1.8, () => s.chime()]] };
    },
  },
  "sfx-desk": {
    seconds: 5,
    run: (bus) => {
      const s = createSfx(bus);
      let stopRing = () => undefined as void;
      return {
        steps: [
          [0.2, () => s.lamp(true)],
          [0.8, () => s.lamp(false)],
          [1.4, () => (stopRing = s.phoneRing())],
          [4.6, () => stopRing()],
        ],
      };
    },
  },
};

/** Render one scene; returns interleaved-free channel data as base64 float32 per channel. */
export async function render(name: string, base: string) {
  audioBase.url = base;
  const scene = scenes[name];
  const ctx = new OfflineAudioContext(2, Math.round(scene.seconds * SR), SR);
  const at = offlineClock(ctx);
  const bus = createAudioBus(ctx, { offline: true });
  const { steps, settle } = scene.run(bus);
  // Files decode before the render starts (the page does this while the visitor reads).
  await Promise.all(["rain-wash", "rain-glass", "thunder", "cozy-loop", "sfx"].map((n) => loadAudio(ctx, n)));
  await new Promise((r) => setTimeout(r, (settle ?? 0.1) * 1000));
  for (const [t, fn] of steps) at(t, fn);
  const t0 = performance.now();
  const buf = await ctx.startRendering();
  const ms = performance.now() - t0;
  const enc = (c: Float32Array) => {
    const u8 = new Uint8Array(c.buffer, c.byteOffset, c.byteLength);
    let s = "";
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  return { sr: SR, ms, channels: [enc(buf.getChannelData(0)), enc(buf.getChannelData(1))] };
}

(window as unknown as { kz: unknown }).kz = { render, scenes: Object.keys(scenes) };
