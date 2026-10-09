// Shared lab plumbing for scripts/perf/*: browser classes, the in-page probe (installed before any
// page script runs) and the readings every step takes. Nothing here holds an element handle across
// steps: every reading re-queries the DOM, so a re-rendered or detached node can never hang a run.
import { chromium, devices, webkit } from "@playwright/test";

/** Chromium on the real GPU (Metal ANGLE), the same flags as the BEFORE harness. */
const CHROMIUM_ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];

export const CLASSES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};

/** Phone user agents so UA-sniffing code paths match the real device for each engine. */
const PHONE_UA = { chromium: devices["Pixel 7"].userAgent, webkit: devices["iPhone 15 Pro"].userAgent };

export async function launch(engine) {
  return engine === "webkit" ? webkit.launch() : chromium.launch({ args: CHROMIUM_ARGS });
}

/** A context + page for one class, CPU throttle applied (Chromium only), probe installed. */
export async function openPage(browser, engine, cls, cpu) {
  const ctx = await browser.newContext({
    ...CLASSES[cls],
    ...(cls === "phone" ? { userAgent: PHONE_UA[engine] } : {}),
    reducedMotion: "no-preference",
  });
  ctx.setDefaultTimeout(15_000);
  ctx.setDefaultNavigationTimeout(60_000);
  await ctx.addInitScript(installProbe);
  const page = await ctx.newPage();
  let cdp = null;
  if (engine === "chromium") {
    cdp = await ctx.newCDPSession(page);
    await cdp.send("Performance.enable");
    if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  }
  return { ctx, page, cdp };
}

/** Runs a step with a hard deadline; a hung step is reported, never awaited forever. */
export async function step(label, ms, fn) {
  let timer;
  const work = Promise.resolve().then(fn);
  work.catch(() => {});
  try {
    return await Promise.race([
      work,
      new Promise(
        (_, reject) => (timer = setTimeout(() => reject(new Error(`${label}: timed out after ${ms} ms`)), ms)),
      ),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Loads a page and lets it settle; analytics may keep the network busy, so networkidle is best effort. */
export async function load(page, url, settleMs = 4000) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await sleep(settleMs);
}

/** CDP main-thread totals in seconds (Chromium); null elsewhere. */
export async function cpuMetrics(cdp) {
  if (!cdp) return null;
  const { metrics } = await cdp.send("Performance.getMetrics");
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
  return { task: m.TaskDuration, script: m.ScriptDuration, layout: m.LayoutDuration, style: m.RecalcStyleDuration };
}

/** Main-thread ms per second between two cpuMetrics readings. */
export function cpuRate(a, z, seconds) {
  if (!a || !z) return null;
  const per = (k) => Math.round(((z[k] - a[k]) * 1000) / seconds);
  return { task: per("task"), script: per("script"), layout: per("layout"), style: per("style") };
}

/**
 * The in-page probe. Counts every requestAnimationFrame the page asks for (callbacks and distinct
 * frames), WebGL contexts made and lost, draw activity per canvas (WebGL draws and 2D paints) and
 * long tasks. The lab's own loops use the saved native rAF, so they never count as page work.
 */
function installProbe() {
  if (window.__kzLab) return;
  const L = {
    nativeRaf: window.requestAnimationFrame.bind(window),
    rafCalls: 0,
    rafFrames: 0,
    lastTs: -1,
    inRaf: 0,
    gl: [],
    canvases: new Set(),
    drawCalls: 0,
    long: [],
    longSupported: false,
    nextId: 1,
  };
  window.__kzLab = L;
  window.requestAnimationFrame = function (cb) {
    L.rafCalls++;
    return L.nativeRaf((ts) => {
      if (ts !== L.lastTs) {
        L.lastTs = ts;
        L.rafFrames++;
      }
      L.inRaf++;
      try {
        cb(ts);
      } finally {
        L.inRaf--;
      }
    });
  };
  const idOf = (c) => (c.__kzId ??= L.nextId++);
  // A canvas "frame" is one burst of draws: the same rAF callback frame, or (outside rAF) draws
  // closer than 4 ms apart.
  const touch = (c, draw) => {
    if (!c || typeof c.getBoundingClientRect !== "function") return;
    idOf(c);
    const now = performance.now();
    if (L.inRaf ? c.__kzKey !== L.lastTs : now - (c.__kzT || -1e9) > 4) c.__kzActs = (c.__kzActs || 0) + 1;
    c.__kzKey = L.inRaf ? L.lastTs : null;
    c.__kzT = now;
    if (draw) {
      c.__kzDraws = (c.__kzDraws || 0) + 1;
      L.drawCalls++;
    }
    L.canvases.add(c);
  };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = getContext.call(this, type, ...rest);
    if (ctx && /webgl/.test(type) && !L.gl.some((r) => r.canvas === this)) {
      idOf(this);
      const rec = { canvas: this, ctx, type, lost: false, made: performance.now() };
      L.gl.push(rec);
      this.addEventListener("webglcontextlost", () => (rec.lost = true));
      const ext = ctx.getExtension("WEBGL_lose_context");
      if (ext) {
        const lose = ext.loseContext.bind(ext);
        ext.loseContext = () => {
          rec.lost = true;
          lose();
        };
      }
    }
    return ctx;
  };
  const wrap = (proto, names, draw) => {
    if (!proto) return;
    for (const name of names) {
      const f = proto[name];
      if (typeof f !== "function") continue;
      proto[name] = function (...args) {
        touch(this.canvas, draw);
        return f.apply(this, args);
      };
    }
  };
  const glDraws = ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"];
  wrap(window.WebGLRenderingContext?.prototype, glDraws, true);
  wrap(window.WebGL2RenderingContext?.prototype, glDraws, true);
  wrap(window.WebGLRenderingContext?.prototype, ["clear"], false);
  wrap(window.WebGL2RenderingContext?.prototype, ["clear"], false);
  wrap(
    window.CanvasRenderingContext2D?.prototype,
    ["clearRect", "fillRect", "strokeRect", "drawImage", "fill", "stroke", "fillText", "putImageData"],
    true,
  );
  try {
    if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      L.longSupported = true;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) L.long.push({ t: e.startTime, d: e.duration });
      }).observe({ type: "longtask", buffered: true });
    }
  } catch {
    L.longSupported = false;
  }
}

/** One reading of the probe counters plus the live state of animations and canvases. */
export function reading(page) {
  return page.evaluate(() => {
    const L = window.__kzLab;
    const vw = innerWidth;
    const vh = innerHeight;
    const onScreen = (el) => {
      if (!el?.isConnected) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
    };
    const META = new Set(["offset", "easing", "composite", "computedOffset"]);
    const COMPOSITED = new Set(["transform", "opacity", "translate", "scale", "rotate", "filter"]);
    const anims = [];
    for (const a of document.getAnimations()) {
      if (a.playState !== "running") continue;
      const effect = a.effect;
      const target = effect?.target ?? null;
      let props = [];
      try {
        props = [...new Set((effect?.getKeyframes?.() ?? []).flatMap((k) => Object.keys(k)))].filter(
          (p) => !META.has(p),
        );
      } catch {
        props = [];
      }
      // getKeyframes() leaves out custom properties (@property --x): a style recalc every frame.
      if (props.length === 0) props = ["--custom"];
      const cls = target ? String(target.className?.baseVal ?? target.className ?? "").split(" ")[0] : "";
      const name = a.animationName || (a.transitionProperty ? `transition:${a.transitionProperty}` : a.id || "waapi");
      anims.push({
        name,
        target: target ? `${target.tagName.toLowerCase()}${cls ? "." + cls : ""}${effect.pseudoElement ?? ""}` : "?",
        props,
        nonComposited: props.some((p) => !COMPOSITED.has(p)),
        infinite: effect?.getComputedTiming?.().endTime === Infinity,
        onScreen: onScreen(target),
      });
    }
    const canvases = [...L.canvases].map((c) => {
      const gl = L.gl.find((g) => g.canvas === c);
      return {
        id: c.__kzId,
        kind: gl ? gl.type : "2d",
        draws: c.__kzDraws || 0,
        acts: c.__kzActs || 0,
        connected: c.isConnected,
        onScreen: onScreen(c),
        css: c.isConnected ? `${Math.round(c.clientWidth)}x${Math.round(c.clientHeight)}` : "-",
        buffer: `${c.width}x${c.height}`,
      };
    });
    const gl = L.gl.map((g) => ({
      id: g.canvas.__kzId,
      type: g.type,
      lost: g.lost || (g.ctx.isContextLost?.() ?? false),
      connected: g.canvas.isConnected,
      onScreen: onScreen(g.canvas),
      drawingBuffer: g.lost ? "-" : `${g.ctx.drawingBufferWidth}x${g.ctx.drawingBufferHeight}`,
    }));
    return {
      t: performance.now(),
      scrollY: Math.round(scrollY),
      governor: window.__kzGovernor ? JSON.parse(JSON.stringify(window.__kzGovernor)) : null,
      rafCalls: L.rafCalls,
      rafFrames: L.rafFrames,
      drawCalls: L.drawCalls,
      longSupported: L.longSupported,
      longCount: L.long.length,
      longTotal: L.long.reduce((s, x) => s + x.d, 0),
      longMax: L.long.reduce((m, x) => Math.max(m, x.d), 0),
      anims,
      canvases,
      gl,
    };
  });
}

/** What happened between two readings, per second where it is a rate. */
export function between(a, z) {
  const s = (z.t - a.t) / 1000;
  const before = new Map(a.canvases.map((c) => [c.id, c]));
  const drawing = z.canvases
    .map((c) => ({ ...c, perSec: (c.acts - (before.get(c.id)?.acts ?? 0)) / s }))
    .filter((c) => c.perSec >= 0.5);
  const live = z.gl.filter((g) => !g.lost);
  return {
    seconds: +s.toFixed(2),
    rafFrames: +((z.rafFrames - a.rafFrames) / s).toFixed(1),
    rafCalls: +((z.rafCalls - a.rafCalls) / s).toFixed(1),
    drawCalls: Math.round((z.drawCalls - a.drawCalls) / s),
    canvasesDrawing: drawing.length,
    canvasFps: drawing.map((c) => `#${c.id}${c.onScreen ? "" : "(off)"} ${c.perSec.toFixed(0)} fps`).join(", "),
    anims: z.anims.length,
    animsOn: z.anims.filter((x) => x.onScreen).length,
    animsOff: z.anims.filter((x) => !x.onScreen).length,
    animsNonComposited: z.anims.filter((x) => x.nonComposited).length,
    glMade: z.gl.length,
    glLive: live.length,
    glLeaked: live.filter((g) => !g.connected).length,
    glBuffers: live.map((g) => `#${g.id} ${g.drawingBuffer}${g.onScreen ? "" : "(off)"}`).join(", "),
    longTasks: z.longSupported ? z.longCount - a.longCount : null,
    longMs: z.longSupported ? Math.round(z.longTotal - a.longTotal) : null,
    governor: z.governor?.mode ?? null,
  };
}

/** Starts a frame-interval recorder on the native rAF (not counted as page work). */
export function startFrames(page) {
  return page.evaluate(() => {
    const L = window.__kzLab;
    const rec = { d: [], last: null, on: true };
    L.frames = rec;
    const tick = (ts) => {
      if (!rec.on) return;
      if (rec.last !== null) rec.d.push(ts - rec.last);
      rec.last = ts;
      L.nativeRaf(tick);
    };
    L.nativeRaf(tick);
  });
}

/** Stops the recorder: frame count, rate and frame-time percentiles in ms. */
export function stopFrames(page) {
  return page.evaluate(() => {
    const rec = window.__kzLab.frames;
    if (!rec) return null;
    rec.on = false;
    const d = [...rec.d].sort((x, y) => x - y);
    const total = rec.d.reduce((s, x) => s + x, 0);
    const pct = (p) => (d.length ? +d[Math.min(d.length - 1, Math.floor((p / 100) * d.length))].toFixed(1) : null);
    return {
      frames: d.length,
      fps: total ? +((d.length * 1000) / total).toFixed(1) : 0,
      p50: pct(50),
      p95: pct(95),
      p99: pct(99),
      max: d.length ? +d[d.length - 1].toFixed(1) : null,
      over25: d.length ? +((100 * d.filter((x) => x > 25).length) / d.length).toFixed(1) : null,
      over50: d.filter((x) => x > 50).length,
    };
  });
}

/** Attribute writes per second on the whole document (style, class, data-*), top entries. */
export function attributeWrites(page, ms) {
  return page.evaluate(async (ms) => {
    const writes = {};
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        const t = m.target;
        const cls = String(t.className?.baseVal ?? t.className ?? "").split(" ")[0];
        const k = `${m.attributeName} @ ${t.tagName.toLowerCase()}${cls ? "." + cls : ""}${t.id ? "#" + t.id : ""}`;
        writes[k] = (writes[k] || 0) + 1;
      }
    });
    mo.observe(document.documentElement, { attributes: true, subtree: true });
    await new Promise((r) => setTimeout(r, ms));
    mo.disconnect();
    return Object.entries(writes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => ({ what: k, perSec: +((v * 1000) / ms).toFixed(1) }));
  }, ms);
}
