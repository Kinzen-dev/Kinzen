import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { synthKey, synthRipple } from "./dsp";
import { bandShare, centroid, lufs, peak } from "./tools/measure";
import { FakeContext, FakeSource, installGlobals } from "./tools/fake-audio";

const SR = 48000;

/** A browser-ish global scope for the bus: window, storage, document, fetch, AudioContext. */
function browser() {
  const store = new Map<string, string>();
  const winListeners = new Map<string, Set<() => void>>();
  const contexts: FakeContext[] = [];
  const fetched: string[] = [];
  const g = globalThis as unknown as Record<string, unknown>;
  installGlobals(g);
  g.window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    AudioContext: class extends FakeContext {
      constructor() {
        super();
        contexts.push(this);
      }
    },
    addEventListener: (t: string, cb: () => void) => {
      if (!winListeners.has(t)) winListeners.set(t, new Set());
      winListeners.get(t)!.add(cb);
    },
    removeEventListener: (t: string, cb: () => void) => winListeners.get(t)?.delete(cb),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: number) => clearTimeout(id),
  };
  g.document = {
    visibilityState: "visible",
    addEventListener: () => undefined,
    createElement: () => ({ canPlayType: () => "probably" }),
  };
  // Every file "decodes" to its length in seconds; see FakeContext.decodeAudioData.
  const seconds: Record<string, number> = { "rain-wash": 24.8, "rain-glass": 16.8, thunder: 40, "cozy-loop": 27.5, sfx: 8 };
  g.fetch = (url: string) => {
    fetched.push(url);
    const name = url.split("/").pop()!.split(".")[0];
    return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer((seconds[name] ?? 1) * 1000)) });
  };
  return { store, contexts, fetched, winListeners };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("dsp: the modded-linear switch", () => {
  const press = synthKey({ kind: "press", wide: false, hard: false }, 1, SR);
  const hard = synthKey({ kind: "press", wide: false, hard: true }, 1, SR);
  const space = synthKey({ kind: "press", wide: true, hard: false }, 1, SR);
  const up = synthKey({ kind: "release", wide: false, hard: false }, 1, SR);

  it("sits low: centroid under 1 kHz, most energy 100-400 Hz, no ping above 5 kHz", () => {
    for (const b of [press, hard, space]) {
      expect(centroid(b, SR, 2048)).toBeLessThan(1000);
      expect(bandShare(b, SR, 100, 400, 2048)).toBeGreaterThan(0.4);
      expect(bandShare(b, SR, 5000, 24000, 2048)).toBeLessThan(0.002);
    }
  });

  it("the space bar is deeper and longer; the top-out is quieter and higher", () => {
    expect(centroid(space, SR, 2048)).toBeLessThan(centroid(press, SR, 2048));
    expect(space.length).toBeGreaterThan(press.length);
    expect(peak([up])).toBeLessThan(peak([press]) * 0.5);
    expect(centroid(up, SR, 2048)).toBeGreaterThan(centroid(press, SR, 2048));
  });

  it("hard presses are brighter; variants are deterministic per seed and differ across seeds", () => {
    expect(centroid(hard, SR, 2048)).toBeGreaterThan(centroid(press, SR, 2048));
    expect(synthKey({ kind: "press", wide: false, hard: false }, 1, SR)).toEqual(press);
    const other = synthKey({ kind: "press", wide: false, hard: false }, 2, SR);
    expect(other).not.toEqual(press);
  });

  it("starts at once (no pre-roll) and never clips", () => {
    const first = press.findIndex((v) => Math.abs(v) > 1e-3);
    expect(first).toBeLessThan(SR * 0.0005);
    for (const b of [press, hard, space, up, synthRipple(1, SR)]) expect(peak([b])).toBeLessThanOrEqual(1);
  });
});

describe("dsp: knocks by material", () => {
  it("each material has its own register; paper does not ring; all stay well under full scale", async () => {
    const { synthKnock } = await import("./dsp");
    const c = (m: "ceramic" | "wood" | "paper" | "metal") => centroid(synthKnock(m, 1, SR), SR, 2048);
    expect(c("ceramic")).toBeGreaterThan(c("wood"));
    expect(c("paper")).toBeGreaterThan(c("wood"));
    const paper = synthKnock("paper", 1, SR);
    const tail = paper.subarray(Math.round(0.2 * SR));
    expect(peak([tail])).toBeLessThan(peak([paper]) * 0.05);
    for (const m of ["ceramic", "wood", "paper", "metal"] as const) expect(peak([synthKnock(m, 2, SR)])).toBeLessThanOrEqual(0.8001);
  });
});

describe("measure", () => {
  it("reads a full-scale 1 kHz sine in one channel as about -3 LUFS (BS.1770)", () => {
    const x = new Float32Array(SR * 3).map((_, i) => Math.sin((2 * Math.PI * 1000 * i) / SR));
    expect(lufs([x], SR)).toBeCloseTo(-3.0, 0);
  });
});

describe("audio bus", () => {
  let env: ReturnType<typeof browser>;
  beforeEach(() => {
    vi.resetModules();
    env = browser();
  });

  it("is a lazy singleton, sound on by default, suspended until unlock", async () => {
    const { getAudioBus } = await import("./audio-bus");
    const bus = getAudioBus();
    expect(getAudioBus()).toBe(bus);
    expect(env.contexts).toHaveLength(1);
    expect(bus.muted).toBe(false);
    expect(bus.ctx.state).toBe("suspended");
    expect(typeof bus.master.connect).toBe("function");
    await bus.unlock();
    expect(bus.ctx.state).toBe("running");
  });

  it("remembers mute in localStorage kz-sound and fades over ~300 ms", async () => {
    env.store.set("kz-sound", "off");
    const { getAudioBus, FADE_S } = await import("./audio-bus");
    const bus = getAudioBus();
    expect(bus.muted).toBe(true);
    await bus.unlock();
    // Muted: the gesture does not even start the context.
    expect(bus.ctx.state).toBe("suspended");
    const seen = vi.fn();
    const off = bus.onChange(seen);
    bus.setMuted(false);
    expect(env.store.get("kz-sound")).toBe("on");
    expect(seen).toHaveBeenCalledTimes(1);
    await flush();
    expect(bus.ctx.state).toBe("running");
    const ctx = bus.ctx as unknown as FakeContext;
    const fader = ctx.nodes.find((n) => n.kind === "gain" && n !== (bus.master as unknown)) as unknown as {
      gain: { calls: [string, ...number[]][] };
    };
    const ramp = fader.gain.calls.filter((c) => c[0] === "linear").pop()!;
    expect(ramp[1]).toBe(1);
    expect(ramp[2]).toBeCloseTo(ctx.currentTime + FADE_S, 5);
    bus.setMuted(true);
    expect(env.store.get("kz-sound")).toBe("off");
    await flush();
    const calls = seen.mock.calls.length;
    off();
    bus.setMuted(false);
    await flush();
    expect(seen).toHaveBeenCalledTimes(calls);
  });

  it("setAway fades out and suspends like a hidden tab, and comes back", async () => {
    const { getAudioBus } = await import("./audio-bus");
    const bus = getAudioBus();
    await bus.unlock();
    vi.useFakeTimers();
    bus.setAway(true);
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
    await flush();
    expect(bus.ctx.state).toBe("suspended");
    bus.setAway(false);
    await flush();
    expect(bus.ctx.state).toBe("running");
  });

  it("unlocks itself on the first gesture anywhere", async () => {
    const { getAudioBus } = await import("./audio-bus");
    const bus = getAudioBus();
    [...(env.winListeners.get("pointerdown") ?? [])].forEach((cb) => cb());
    await flush();
    expect(bus.ctx.state).toBe("running");
  });

  it("limits without lookahead: the curve is linear to -6 dBFS and never reaches full scale", async () => {
    const { limiterCurve } = await import("./audio-bus");
    const c = limiterCurve(1001);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThan(c[i - 1]);
    expect(Math.max(...c.map(Math.abs))).toBeLessThan(1);
    expect(c[750]).toBeCloseTo(0.98 * 0.5, 3);
  });
});

describe("voices", () => {
  let env: ReturnType<typeof browser>;
  beforeEach(async () => {
    vi.resetModules();
    env = browser();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = async () => {
    const busMod = await import("./audio-bus");
    const { clock } = await import("./clock");
    // Timers run only when the test says so.
    const pending: (() => void)[] = [];
    clock.set = (fn) => pending.push(fn);
    clock.clear = () => undefined;
    const runTimers = () => {
      while (pending.length) pending.shift()!();
    };
    const bus = busMod.getAudioBus();
    return { bus, ctx: bus.ctx as unknown as FakeContext, runTimers };
  };

  it("export the contracted API", async () => {
    const { bus } = await setup();
    const { createRain } = await import("./rain");
    const { createCozyMusic } = await import("./music");
    const { createThock } = await import("./thock");
    const { createSfx } = await import("./sfx");
    const shape = (o: object) => Object.keys(o).sort();
    expect(shape(createRain(bus))).toEqual(["setIntensity", "stop", "thunder"]);
    expect(shape(createCozyMusic(bus))).toEqual(["setVolume", "start", "stop"]);
    expect(shape(createThock(bus))).toEqual(["press", "release", "spaceRipple", "stop"]);
    expect(shape(createSfx(bus))).toEqual([
      "chime",
      "drop",
      "knock",
      "lamp",
      "metalClink",
      "phoneRing",
      "purr",
      "splash",
      "stop",
      "thud",
    ]);
  });

  it("nothing plays or downloads before unlock", async () => {
    const { bus, ctx } = await setup();
    const { createThock } = await import("./thock");
    const { createCozyMusic } = await import("./music");
    const { createRain } = await import("./rain");
    const { createSfx } = await import("./sfx");
    const k = createThock(bus);
    const m = createCozyMusic(bus);
    createRain(bus).setIntensity(1);
    const s = createSfx(bus);
    m.start();
    k.press("KeyA", 1);
    s.metalClink(1);
    expect(s.phoneRing()).toBeTypeOf("function");
    await flush();
    expect(ctx.count("source")).toBe(0);
    expect(env.fetched).toEqual([]);
    await bus.unlock();
    await flush();
    await flush();
    expect(env.fetched.some((u) => u.endsWith("cozy-loop.webm"))).toBe(true);
    expect(env.fetched.some((u) => u.endsWith("rain-wash.webm"))).toBe(true);
  });

  it("a key press is one source and one gain, no new buffers, started now; repeats are ignored", async () => {
    const { bus, ctx, runTimers } = await setup();
    await bus.unlock();
    const { createThock } = await import("./thock");
    const k = createThock(bus);
    runTimers();
    const buffers = ctx.buffers;
    const nodes = ctx.nodes.length;
    ctx.currentTime = 1.25;
    k.press("KeyA", 0.8);
    expect(ctx.buffers).toBe(buffers);
    expect(ctx.nodes.length - nodes).toBe(2);
    const src = ctx.nodes.filter((n) => n.kind === "source").pop() as FakeSource;
    expect(src.started[0]).toBeGreaterThanOrEqual(1.25);
    expect(src.started[0] - 1.25).toBeLessThan(0.002);
    k.press("KeyA", 0.8);
    expect(ctx.count("source")).toBe(1);
    k.release("KeyA");
    expect(ctx.count("source")).toBe(2);
    k.release("KeyA");
    expect(ctx.count("source")).toBe(2);
  });

  it("the same key varies from press to press", async () => {
    const { bus, ctx, runTimers } = await setup();
    await bus.unlock();
    const { createThock } = await import("./thock");
    const k = createThock(bus);
    runTimers();
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      k.press("KeyA", 0.7);
      k.release("KeyA");
      const src = ctx.nodes.filter((n) => n.kind === "source").at(-2) as FakeSource;
      seen.add(`${src.playbackRate.value.toFixed(5)}`);
    }
    expect(seen.size).toBe(8);
  });

  it("thock.stop releases its nodes and buffers", async () => {
    const { bus, ctx, runTimers } = await setup();
    await bus.unlock();
    const { createThock } = await import("./thock");
    const k = createThock(bus);
    k.press("KeyA");
    k.stop();
    runTimers();
    const own = ctx.nodes.filter((n) => n.kind !== "destination" && n.kind !== "shaper");
    const conv = ctx.nodes.find((n) => n.kind === "convolver") as unknown as { buffer: unknown };
    expect(conv.buffer).toBeNull();
    expect(own.filter((n) => n.kind === "panner").every((n) => n.disconnected)).toBe(true);
    k.press("KeyB");
    expect(ctx.count("source")).toBe(1);
  });

  it("rain loads after unlock, loops its layers, and stop() frees them", async () => {
    const { bus, ctx, runTimers } = await setup();
    await bus.unlock();
    const { createRain } = await import("./rain");
    const r = createRain(bus);
    r.setIntensity(0.6);
    for (let i = 0; i < 4; i++) await flush();
    const loops = ctx.nodes.filter((n) => n.kind === "source") as FakeSource[];
    expect(loops.length).toBe(4);
    expect(loops.every((s) => s.loop && s.started.length === 1)).toBe(true);
    r.thunder(0.5);
    expect(ctx.count("source")).toBe(5);
    r.stop();
    runTimers();
    expect(loops.every((s) => s.stopped && s.disconnected && s.buffer === null)).toBe(true);
  });

  it("music waits for unlock, loops seamlessly built from body + tail, and stops cleanly", async () => {
    const { bus, ctx, runTimers } = await setup();
    const { createCozyMusic } = await import("./music");
    const m = createCozyMusic(bus);
    m.start();
    m.start();
    await bus.unlock();
    for (let i = 0; i < 4; i++) await flush();
    const srcs = ctx.nodes.filter((n) => n.kind === "source") as FakeSource[];
    expect(srcs).toHaveLength(1);
    expect(srcs[0].loop).toBe(true);
    const { MUSIC } = await import("./assets");
    expect(srcs[0].buffer!.length).toBe(Math.round(MUSIC.loop.body * ctx.sampleRate));
    m.setVolume(0.5);
    m.stop();
    runTimers();
    expect(srcs[0].stopped && srcs[0].disconnected).toBe(true);
  });

  it("sfx: the phone ring returns its stop, and stop() frees the voice", async () => {
    const { bus, ctx, runTimers } = await setup();
    await bus.unlock();
    const { createSfx } = await import("./sfx");
    const s = createSfx(bus);
    for (let i = 0; i < 3; i++) await flush();
    const silence = s.phoneRing();
    expect(ctx.count("source")).toBe(1);
    silence();
    expect((ctx.nodes.find((n) => n.kind === "source") as FakeSource).stopped).toBe(true);
    s.metalClink(0.8);
    s.splash(0.9);
    s.drop(0.5);
    s.lamp(true);
    // A knock is one source plus its gain/filter/pan, and the material's buffer is made once.
    ctx.currentTime += 0.1;
    s.knock("paper", 0.6);
    const buffers = ctx.buffers;
    ctx.currentTime += 0.1;
    s.knock("paper", 0.6);
    ctx.currentTime += 0.1;
    s.knock("paper", 0.6);
    expect(ctx.buffers - buffers).toBeLessThanOrEqual(1);
    for (const kind of ["ceramic", "wood", "metal", "mug", "pen", "ball", "desk", "floor", "wall", "phone", "lamp"] as const) {
      ctx.currentTime += 0.1;
      s.knock(kind, 0.7);
    }
    ctx.currentTime += 0.1;
    s.thud(0.8);
    s.purr();
    s.chime();
    s.metalClink(0.5, 2);
    expect(ctx.count("source")).toBeGreaterThanOrEqual(18);
    s.stop();
    runTimers();
    const conv = ctx.nodes.find((n) => n.kind === "convolver") as unknown as { buffer: unknown };
    expect(conv.buffer).toBeNull();
  });
});

describe("loops", () => {
  it("a correlated tail crossfades into the head without a seam", async () => {
    const { buildLoop } = await import("./loader");
    const ctx = new FakeContext();
    const body = 1;
    const tail = 0.1;
    // A 3 Hz-periodic signal: the tail is exactly the head again.
    const src = ctx.createBuffer(1, Math.round((body + tail) * SR), SR);
    const d = src.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.sin((2 * Math.PI * 3 * i) / SR);
    const out = buildLoop(ctx as unknown as BaseAudioContext, src as unknown as AudioBuffer, { body, tail, correlated: true });
    const o = out.getChannelData(0);
    expect(o.length).toBe(SR);
    for (let i = 0; i < o.length; i += 97) expect(o[i]).toBeCloseTo(d[i], 5);
    expect(Math.abs(o[0] - o[o.length - 1])).toBeLessThan(0.01);
  });

  it("an independent tail keeps its level through the seam (equal power)", async () => {
    const { buildLoop } = await import("./loader");
    const ctx = new FakeContext();
    const src = ctx.createBuffer(1, Math.round(1.5 * SR), SR);
    const d = src.getChannelData(0);
    let s = 7;
    for (let i = 0; i < d.length; i++) d[i] = ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const out = buildLoop(ctx as unknown as BaseAudioContext, src as unknown as AudioBuffer, { body: 1, tail: 0.4, correlated: false });
    const o = out.getChannelData(0);
    const rms = (a: number, b: number) => {
      let sum = 0;
      for (let i = a; i < b; i++) sum += o[i] * o[i];
      return Math.sqrt(sum / (b - a));
    };
    const mid = rms(Math.round(0.15 * SR), Math.round(0.25 * SR));
    const body = rms(Math.round(0.5 * SR), Math.round(0.9 * SR));
    expect(Math.abs(20 * Math.log10(mid / body))).toBeLessThan(1);
  });
});
