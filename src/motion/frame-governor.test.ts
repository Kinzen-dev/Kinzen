import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The governor against a fake page: a 120 Hz display (rAF every 8.33 ms on fake timers), an
 * IntersectionObserver the test drives, and a phone or desktop pointer.
 */

type Listener = (e?: unknown) => void;
class Target {
  private l = new Map<string, Set<Listener>>();
  addEventListener(t: string, fn: Listener) {
    if (!this.l.has(t)) this.l.set(t, new Set());
    this.l.get(t)!.add(fn);
  }
  removeEventListener(t: string, fn: Listener) {
    this.l.get(t)?.delete(fn);
  }
  dispatch(t: string) {
    for (const fn of this.l.get(t) ?? []) fn({ type: t });
  }
  contains(other: unknown) {
    return other === this;
  }
}

let ioCb: ((e: { target: unknown; isIntersecting: boolean }[]) => void) | null = null;
const HZ = 120;
/** Vsyncs each frame misses (a slow GPU): 0 = every vsync is on time; a list cycles per frame. */
let miss: number | number[] = 0;
let missI = 0;

function setup(coarse: boolean) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
  const win = new Target();
  const doc = new Target() as Target & { hidden: boolean };
  doc.hidden = false;
  let frameId = 0;
  const frames = new Map<number, ReturnType<typeof setTimeout>>();
  vi.stubGlobal("window", Object.assign(win, { setTimeout, clearTimeout }));
  vi.stubGlobal("document", doc);
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("coarse") ? coarse : false }));
  vi.stubGlobal("screen", { width: coarse ? 390 : 1440, height: coarse ? 844 : 900 });
  vi.stubGlobal("innerWidth", coarse ? 390 : 1440);
  vi.stubGlobal("innerHeight", coarse ? 844 : 900);
  vi.stubGlobal("devicePixelRatio", 3);
  vi.stubGlobal("navigator", { hardwareConcurrency: 8, deviceMemory: 8 });
  // A 120 Hz display: callbacks run on the next 8.33 ms boundary with that vsync's timestamp.
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
    const id = ++frameId;
    const now = performance.now();
    const period = 1000 / HZ;
    const m = typeof miss === "number" ? miss : miss[missI++ % miss.length];
    // Fake timers round delays to whole ms: snap to the nearest slot, then the next one.
    const at = (Math.round(now / period) + 1 + m) * period;
    frames.set(
      id,
      setTimeout(() => {
        frames.delete(id);
        cb(at);
      }, at - now),
    );
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    clearTimeout(frames.get(id));
    frames.delete(id);
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: typeof ioCb) {
        ioCb = cb;
      }
      observe() {}
      unobserve() {}
    },
  );
  return { win, doc };
}

async function load() {
  vi.resetModules();
  return import("./frame-governor");
}

beforeEach(() => {
  ioCb = null;
  miss = 0;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("frame governor", () => {
  it("paces a heavy scene to 60 fps on a phone's 120 Hz screen, display rate otherwise", async () => {
    setup(true);
    const g = await load();
    expect(g.deviceProfile()).toMatchObject({ cls: "phone", heavyFps: 60, dpr: 2 });
    expect(g.canvasDpr()).toBe(2);
    const host = new Target() as unknown as Element;
    let heavy = 0;
    let dom = 0;
    const a = g.frameLoop({ name: "heavy", host, heavy: true }, () => void heavy++);
    const b = g.frameLoop({ name: "dom", host }, () => void dom++);
    vi.advanceTimersByTime(2000);
    expect(heavy / 2).toBeGreaterThanOrEqual(58);
    expect(heavy / 2).toBeLessThanOrEqual(61);
    expect(dom / 2).toBeGreaterThanOrEqual(118);
    a.stop();
    b.stop();
  });

  it("lets a desktop draw heavy scenes at 120", async () => {
    setup(false);
    const g = await load();
    expect(g.deviceProfile().cls).toBe("desktop");
    let n = 0;
    const l = g.frameLoop({ name: "x", host: new Target() as unknown as Element, heavy: true }, () => void n++);
    vi.advanceTimersByTime(1000);
    expect(n).toBeGreaterThanOrEqual(118);
    l.stop();
  });

  it("draws nothing off screen or in a hidden tab, and resumes on screen", async () => {
    const { doc } = setup(true);
    const g = await load();
    const host = new Target();
    let n = 0;
    const l = g.frameLoop({ name: "x", host: host as unknown as Element, heavy: true }, () => void n++);
    vi.advanceTimersByTime(500);
    ioCb!([{ target: host, isIntersecting: false }]);
    const off = n;
    vi.advanceTimersByTime(2000);
    expect(n).toBe(off);
    ioCb!([{ target: host, isIntersecting: true }]);
    vi.advanceTimersByTime(500);
    expect(n).toBeGreaterThan(off + 25);
    doc.hidden = true;
    doc.dispatch("visibilitychange");
    const hidden = n;
    vi.advanceTimersByTime(1000);
    expect(n).toBe(hidden);
    l.stop();
  });

  it("stops drawing once settled and draws again on wake or input inside the host", async () => {
    setup(true);
    const g = await load();
    const host = new Target();
    let n = 0;
    let busy = 5;
    const l = g.frameLoop({ name: "x", host: host as unknown as Element, heavy: true }, () => {
      n++;
      return busy-- > 0;
    });
    vi.advanceTimersByTime(1000);
    expect(n).toBe(6);
    l.wake();
    vi.advanceTimersByTime(20);
    expect(n).toBe(7);
    host.dispatch("pointermove");
    vi.advanceTimersByTime(20);
    expect(n).toBe(8);
    l.stop();
  });

  it("sleeps for the delay a frame asks for (a slow re-seed)", async () => {
    setup(true);
    const g = await load();
    let n = 0;
    const l = g.frameLoop({ name: "x", host: new Target() as unknown as Element, heavy: true }, () => {
      n++;
      return 200;
    });
    vi.advanceTimersByTime(1000);
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThanOrEqual(6);
    l.stop();
  });

  it("draws a slow drift at its rest rate and goes back to full pace on wake", async () => {
    setup(true);
    const g = await load();
    const host = new Target();
    let n = 0;
    let drifting = true;
    const l = g.frameLoop({ name: "x", host: host as unknown as Element, heavy: true }, () => {
      n++;
      return drifting ? g.DRIFT : undefined;
    });
    vi.advanceTimersByTime(1000);
    n = 0;
    vi.advanceTimersByTime(1000);
    expect(n).toBeGreaterThanOrEqual(29);
    expect(n).toBeLessThanOrEqual(31);
    drifting = false;
    host.dispatch("pointerdown");
    n = 0;
    vi.advanceTimersByTime(1000);
    expect(n).toBeGreaterThanOrEqual(58);
    l.stop();
  });

  it("drops to light mode after 45 s without input and back to full on the next input", async () => {
    const { win, doc } = setup(true);
    const g = await load();
    let n = 0;
    const l = g.frameLoop({ name: "x", host: new Target() as unknown as Element, heavy: true }, () => void n++);
    vi.advanceTimersByTime(44_000);
    expect(g.idleMode()).toBe("full");
    vi.advanceTimersByTime(1_200);
    expect(g.idleMode()).toBe("light");
    n = 0;
    vi.advanceTimersByTime(1000);
    expect(n).toBeGreaterThanOrEqual(29);
    expect(n).toBeLessThanOrEqual(31);
    doc.dispatch("pointermove");
    expect(g.idleMode()).toBe("full");
    // Full mode within one frame of the input: the next 60 fps slot draws.
    n = 0;
    vi.advanceTimersByTime(17);
    expect(n).toBeGreaterThanOrEqual(1);
    n = 0;
    vi.advanceTimersByTime(1000);
    expect(n).toBeGreaterThanOrEqual(58);
    // Input keeps it full; silence again goes light again.
    vi.advanceTimersByTime(40_000);
    win.dispatch("scroll");
    vi.advanceTimersByTime(40_000);
    expect(g.idleMode()).toBe("full");
    vi.advanceTimersByTime(6_000);
    expect(g.idleMode()).toBe("light");
    l.stop();
  });

  it("lowers the resolution scale when frames miss the pace and raises it when they hold", async () => {
    setup(false);
    const g = await load();
    const scales: number[] = [];
    // A slow GPU: frames miss one to three vsyncs, unevenly (about 37 fps, the display can do 60+).
    miss = [1, 3, 2, 3];
    const l = g.frameLoop(
      { name: "x", host: new Target() as unknown as Element, heavy: true, adaptive: { onScale: (s) => scales.push(s) } },
      () => {},
    );
    vi.advanceTimersByTime(4000);
    expect(scales.length).toBeGreaterThan(0);
    expect(l.scale).toBeLessThan(1);
    expect(l.scale).toBeGreaterThanOrEqual(0.6);
    miss = 0;
    vi.advanceTimersByTime(30_000);
    expect(l.scale).toBe(1);
    l.stop();
  });

  it("never reads a 60 Hz screen (or a steady power-saving cap) under a 120 cap as a slow GPU", async () => {
    setup(false);
    const g = await load();
    const scales: number[] = [];
    // A 60 Hz display: every callback lands on every other 120 Hz slot.
    miss = 1;
    const l = g.frameLoop(
      { name: "x", host: new Target() as unknown as Element, heavy: true, adaptive: { onScale: (s) => scales.push(s) } },
      () => {},
    );
    vi.advanceTimersByTime(10_000);
    expect(scales).toEqual([]);
    expect(l.scale).toBe(1);
    l.stop();
  });

  it("publishes the debug surface and removes a stopped loop from it", async () => {
    setup(true);
    const g = await load();
    const l = g.frameLoop({ name: "scene", host: new Target() as unknown as Element, heavy: true }, () => {});
    vi.advanceTimersByTime(1000);
    const dbg = (window as unknown as Window).__kzFrames!;
    expect(dbg.cls).toBe("phone");
    expect(dbg.cap).toBe(60);
    expect(dbg.loops.scene.state).toBe("running");
    expect(dbg.loops.scene.fps).toBeGreaterThanOrEqual(58);
    l.stop();
    expect(dbg.loops.scene).toBeUndefined();
  });
});
