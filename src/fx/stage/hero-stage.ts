import { WORDMARK_EM } from "../baked/geometry";
import { pickTier, readEnv, TIER_CONFIG, type Tier } from "../engine/capability";
import { easeOut } from "../engine/ease";
import { ParticleEngine, worldPerPx, type Params } from "../engine/engine";
import { Governor } from "../engine/governor";
import { readPalette } from "../engine/palette";
import { TargetClient } from "../targets/client";
import { settledSeed } from "../targets/sample-mask";
import type { Box, Targets } from "../targets/types";
import { setFx } from "./fx-state";

/**
 * The hero choreography, framework-free. One authored moment, then the material moving.
 * When the field runs, the DOM wordmark is never shown (html[data-fx="pending"] before paint, then
 * "on" from the field's first frame; see fx.css), so there is only ever one name on screen:
 *   0 to 0.4 s   a sparse, even dust fades up over the whole stage box (and a little past it);
 *                nothing else is lit: no centre, no core, no cloud.
 *   0.05 to 1.6 s each particle is released toward its letter at its own moment (most early, a
 *                few trailing: an ease-out in density) and lights up over its last few px, so the
 *                letters brighten exactly as they fill.
 *   2.0 s        calm drift; anything still in the air fades back into the plain field.
 * The opening plays once per page load and only while it can be seen: if the hero is off screen
 * (or the tab hidden, or the DOM wordmark already revealed by the safety net) when it would play,
 * or leaves view mid-way, the field comes in settled.
 * The gold dust is emissive light: it belongs to the dark theme only. In the light theme the
 * field fades out (240 ms) and stops, the DOM wordmark fades back; back in dark it returns settled.
 * Calm drift runs at 30 fps, and after 8 s without pointer or scroll the loop stops on the frame
 * it is on; any pointer move, tap, scroll or tab return resumes it.
 * Resize: the last frame is frozen and mapped onto the new text with a CSS transform (never a
 * stale frame over misplaced text) while it cross-fades to the DOM wordmark; when the field has
 * refit it cross-fades back. Both ways 200 ms: a soft refresh, not a flash.
 * Scroll-out (SIAN scrollFade): the name loosens into dust over 1.5 viewports, then the loop
 * stops. Any failure: tier "off", data-fx="off", the DOM wordmark fades in (200 ms).
 */

const STAGE: Record<"form" | "calm" | "still", Partial<Params>> = {
  // Stiff and well damped: a released particle closes most of its distance in about half a second
  // and lands without overshoot; the slow part of the opening is the release stagger, not travel.
  form: { spring: 80, damp: 0.75, turb: 0.8, tscale: 1.1, tspeed: 0.3, drift: 0, gain: 1.0, mouseF: 0 },
  calm: { spring: 30, damp: 0.86, turb: 0.05, tscale: 0.9, tspeed: 0.12, drift: 0, gain: 1.0, mouseF: 26 },
  still: { spring: 30, damp: 0.8, turb: 0, tscale: 0.6, tspeed: 0, drift: 0, gain: 1.0, mouseF: 0 },
};

/** Opening timeline (ms from the first drawn frame). */
const T_DUST = 400;
const T_CALM = 2000;
/** After T_CALM, particles still in the air fade back into view over this long. */
const T_OPEN = 300;
/** Release window (s): particle i is let go at RELEASE_0 + RELEASE_SPAN * u^2. */
const RELEASE_0 = 0.05;
const RELEASE_SPAN = 0.5;
/** The opening dust: one visible speck per this many CSS px^2 of stage, at this brightness. */
const SPECK_AREA = 130;
const SPECK_LVL = 1.1;
/** Share of the stage size the dust spreads past each edge. */
const SPREAD = 0.08;
/** Cross-fade durations (ms): field gives up, theme switch, refit. */
const XF_OFF = 200;
const XF_THEME = 240;
const XF_REFIT = 200;
/** Calm drift frame cap, and how long interaction keeps the tier's full rate. */
const IDLE_FPS = 30;
const ACTIVE_MS = 1500;
/** No pointer or scroll for this long: the loop stops on the frame it is on. */
const IDLE_STOP_MS = 8000;

export type StageEls = {
  /** The hero section ([data-hero]); receives data-fx and data-fx-tier. */
  hero: HTMLElement;
  /** The positioned box the canvas fills. */
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  /** The server-rendered wordmark ([data-hero-wordmark]). */
  wordmark: HTMLElement;
};

type Debug = {
  tier: Tier;
  reason: string;
  renderer: string;
  engine: ParticleEngine | null;
  governor: Governor | null;
  phase: string;
  /** performance.now() of the opening's first drawn frame, 0 when it did not play. */
  openedAt: number;
  ink: { x: number; y: number; w: number; h: number; src: string } | null;
  /** True while the loop is parked by the idle rule. */
  idle: boolean;
};

let textCtx: CanvasRenderingContext2D | null = null;

/**
 * The DOM wordmark's rendered ink box in viewport px, measured rather than assumed: a Range over
 * the text gives the pen origin and the font's content box (baseline = top + font ascent), and
 * canvas text metrics with the same font and tracking give the ink extents around that origin
 * (side bearings included). Null when the platform cannot measure (no letterSpacing on canvas,
 * no font metrics) or the result disagrees with the baked geometry by more than 4%.
 */
function measureInk(el: HTMLElement, cs: CSSStyleDeclaration, fs: number): Box | null {
  const text = (el.textContent ?? "").trim();
  if (!text) return null;
  textCtx ??= document.createElement("canvas").getContext("2d");
  const ctx = textCtx as (CanvasRenderingContext2D & { letterSpacing?: string; fontKerning?: string }) | null;
  if (!ctx || !("letterSpacing" in ctx)) return null;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  ctx.fontKerning = cs.fontKerning === "none" ? "none" : "normal";
  const m = ctx.measureText(text);
  const range = document.createRange();
  range.selectNodeContents(el);
  const rr = range.getBoundingClientRect();
  if (!rr.width || !m.fontBoundingBoxAscent) return null;
  const baseline = rr.top + m.fontBoundingBoxAscent;
  const box: Box = {
    x: rr.left - m.actualBoundingBoxLeft,
    y: baseline - m.actualBoundingBoxAscent,
    w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
    h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
  };
  const off = (a: number, b: number) => Math.abs(a / (b * fs) - 1) > 0.04;
  if (off(box.w, WORDMARK_EM.w) || off(box.h, WORDMARK_EM.h)) return null;
  return box;
}

export function startHeroStage(els: StageEls, onOff: () => void): () => void {
  const { hero, stage, canvas, wordmark } = els;
  const env = readEnv();
  const debug: Debug = {
    tier: "off",
    reason: "",
    renderer: "",
    engine: null,
    governor: null,
    phase: "boot",
    openedAt: 0,
    ink: null,
    idle: false,
  };
  (window as Window & { __kzFx?: Debug }).__kzFx = debug;

  const cleanups: (() => void)[] = [];
  let dead = false;

  const setTier = (tier: Tier, reason: string) => {
    debug.tier = tier;
    debug.reason = reason;
    hero.dataset.fxTier = tier;
  };

  /* ---------- visibility of the field vs the DOM wordmark (fx.css) ---------- */
  // data-show on the stage shows the canvas; html[data-fx] says who draws the name. Both
  // transition over --fx-xfade, set per change, so every swap is a cross-fade of a chosen length.
  // setFx first: it may commit styles once (leaving "pending"), which must not catch the canvas.
  const conceal = (ms: number) => {
    setFx(hero, "off", ms);
    delete stage.dataset.show;
  };
  /** Is the DOM wordmark on screen right now (no pending gate, or the safety net revealed it)? */
  const wordmarkShown = () => parseFloat(getComputedStyle(wordmark).opacity) > 0.01;

  const teardown = () => {
    dead = true;
    cleanups.splice(0).forEach((fn) => fn());
  };

  const goOff = (reason: string) => {
    if (dead) return;
    teardown();
    setTier("off", reason);
    conceal(XF_OFF);
    onOff();
  };

  const gl =
    env.fx === "off" || env.saveData
      ? null
      : canvas.getContext("webgl2", {
          antialias: false,
          alpha: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        });
  const picked = pickTier(env, gl);
  debug.renderer = picked.renderer;
  if (picked.tier === "off" || !gl) {
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    setTier("off", picked.reason);
    setFx(hero, "off", XF_OFF);
    onOff();
    return () => {};
  }
  const tier = picked.tier;
  setTier(tier, picked.reason);
  const cfg = TIER_CONFIG[tier];
  const motion = tier !== "still";
  const engine = new ParticleEngine(gl, canvas, cfg);
  const governor = new Governor({ maxShift: cfg.maxShift });
  const client = new TargetClient();
  debug.engine = engine;
  debug.governor = governor;
  cleanups.push(() => {
    client.destroy();
    engine.destroy();
  });

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    goOff("context lost");
  });

  /* ---------- layout: where the DOM wordmark's ink sits inside the canvas ---------- */
  const measure = () => {
    const c = stage.getBoundingClientRect();
    const r = wordmark.getBoundingClientRect();
    const cs = getComputedStyle(wordmark);
    const fs = parseFloat(cs.fontSize);
    const measured = measureInk(wordmark, cs, fs);
    let ink: Box;
    if (measured) {
      ink = { x: measured.x - c.left, y: measured.y - c.top, w: measured.w, h: measured.h };
    } else {
      // Baked fallback: the ink box relative to the content box, from the bake.
      const left = r.left + parseFloat(cs.paddingLeft) - c.left;
      const top = r.top + parseFloat(cs.paddingTop) - c.top;
      ink = {
        x: left + WORDMARK_EM.x0 * fs,
        y: top + WORDMARK_EM.y0 * fs,
        w: WORDMARK_EM.w * fs,
        h: WORDMARK_EM.h * fs,
      };
    }
    debug.ink = { ...ink, src: measured ? "measured" : "baked" };
    return { cw: c.width, ch: c.height, fs, ink };
  };
  type Layout = ReturnType<typeof measure>;
  const sameLayout = (a: Layout, b: Layout) =>
    Math.abs(a.cw - b.cw) < 0.5 &&
    Math.abs(a.ch - b.ch) < 0.5 &&
    Math.abs(a.ink.x - b.ink.x) < 0.5 &&
    Math.abs(a.ink.y - b.ink.y) < 0.5 &&
    Math.abs(a.fs - b.fs) < 0.05;

  const pointCss = (fs: number) => Math.min(2.1, Math.max(1, fs * 0.0052));
  // A particle lights up over its last few px (about a twentieth of an em): letters sharpen as
  // they brighten instead of glowing in as soft blobs.
  const dimPx = (fs: number) => Math.max(8, fs * 0.05);
  let palette = readPalette(hero);
  let dark = palette.mode === "dark";
  let layout = measure();

  const targetsFor = (l: Layout) =>
    client.targets({
      N: engine.N,
      cw: l.cw,
      ch: l.ch,
      ink: l.ink,
      k: worldPerPx(l.ch),
      gold: palette.glow,
      dustShare: 0.09,
      edgeShare: 0.3,
    });

  /* ---------- scroll-out ---------- */
  let scrollP = 0;
  let visible = true;
  let stage0: keyof typeof STAGE = motion ? "form" : "still";
  const apply = (now = false) => {
    const base = STAGE[stage0];
    if (!motion || scrollP <= 0) {
      engine.setParams(base, now);
      engine.fade = 1;
      return;
    }
    const p = scrollP;
    engine.setParams(
      {
        ...base,
        turb: (base.turb ?? 1) + 3.5 * p,
        spring: (base.spring ?? 10) * (1 - p) * (1 - p),
        drift: 3 * p,
        gain: (base.gain ?? 1) * (1 - 0.5 * p),
        mouseF: 0,
      },
      now,
    );
    engine.fade = 1 - p;
  };

  /* ---------- opening, refit, idle ---------- */
  // "idle" before boot, "playing" while the dust condenses, "aborted" if it was paused mid-way (it
  // never replays), "done" once the field is settled.
  let opening: "idle" | "playing" | "aborted" | "done" = "idle";
  let targets: Targets | null = null;
  /** performance.now() of the opening's first drawn frame (0 until then). */
  let openedAt = 0;
  /** Start of the fade that brings particles still in the air back into view after the opening. */
  let openRamp = 0;
  /** Resize in progress: the last frame is frozen, the loop may not run until the field refits. */
  let frozen: Layout | null = null;
  let parked = false;
  let lastActive = performance.now();

  const shouldRun = () => motion && dark && visible && !document.hidden && scrollP < 0.999 && !frozen && !parked;

  /** The field draws the name, cross-fading over `ms` from whatever shows now (dark theme only). */
  const present = (ms: number) => {
    if (!dark || frozen) return;
    stage.dataset.ready = "";
    setFx(hero, "on", ms);
    stage.dataset.show = "";
  };

  /** The plain field: every particle free, none hidden in the air. */
  const plain = () => {
    openRamp = 0;
    engine.endGate();
    engine.open = 1;
  };

  /** Park the field at its targets in calm drift: the resume path, never a second opening. */
  const settleNow = () => {
    opening = "done";
    stage0 = motion ? "calm" : "still";
    debug.phase = stage0;
    governor.locked = false;
    plain();
    apply(true);
    if (targets) engine.seed(settledSeed(targets));
  };

  /** The word has formed (or the visitor scrolled on): calm drift, stragglers fade back in. */
  const finishOpening = (now: number) => {
    opening = "done";
    stage0 = "calm";
    debug.phase = "calm";
    governor.locked = false;
    engine.endGate();
    openRamp = now;
    apply();
  };

  const sync = () => {
    if (dead) return;
    if (shouldRun()) {
      // Parameters snap to the current scroll state here, at resume, not when it was paused.
      if (opening === "aborted") settleNow();
      engine.start();
    } else {
      engine.stop();
      if (opening === "playing") {
        // Paused mid-opening (scrolled away, tab hidden, theme): drop it; it resumes settled.
        opening = "aborted";
      }
    }
  };

  /** Any sign of life: keep full rate for a moment and wake a parked loop. */
  const poke = () => {
    lastActive = performance.now();
    if (parked) {
      parked = false;
      debug.idle = false;
      sync();
    }
  };

  /** Per-frame pacing: the opening timeline, the 30 fps calm cap, the idle stop. */
  const pace = (now: number) => {
    if (!motion) return;
    if (opening === "playing") {
      // The clock starts on the first drawn frame, which was drawn with nothing lit.
      if (!openedAt) {
        openedAt = debug.openedAt = now;
        engine.beginGate();
      }
      const t = now - openedAt;
      engine.airLvl = SPECK_LVL * easeOut(Math.min(1, t / T_DUST));
      if (t >= T_CALM || scrollP > 0.02) finishOpening(now);
    }
    if (openRamp) {
      const p = Math.min(1, (now - openRamp) / T_OPEN);
      engine.open = easeOut(p);
      if (p >= 1) plain();
    }
    const calm = opening === "done" && !openRamp && governor.probe === "ok";
    const fps = calm && now - lastActive > ACTIVE_MS ? Math.min(IDLE_FPS, cfg.fps) : cfg.fps;
    if (engine.fps !== fps) {
      engine.setFps(fps);
      // A deliberately slow window must never read as a slow GPU.
      governor.locked = fps !== cfg.fps;
      governor.rewindow();
    }
    if (calm && now - lastActive > IDLE_STOP_MS) {
      parked = true;
      debug.idle = true;
      sync();
    }
  };

  /* ---------- boot ---------- */
  (async () => {
    const ok = await engine.ready();
    if (dead) return;
    if (!ok) return goOff("shader compile");
    engine.setPalette(palette);
    const fit = layout;
    const k = worldPerPx(fit.ch);
    // The opening dust covers the whole stage box and a little past every edge (world units).
    const hw = (fit.cw / 2) * (1 + 2 * SPREAD) * k,
      hh = (fit.ch / 2) * (1 + 2 * SPREAD) * k;
    const [t0, scatter] = await Promise.all([
      targetsFor(fit),
      motion ? client.scatter({ N: engine.N, box: { x0: -hw, y0: -hh, x1: hw, y1: hh } }) : Promise.resolve(null),
    ]);
    if (dead) return;
    targets = t0;
    engine.setTargets(t0, pointCss(fit.fs));
    engine.dimPx = dimPx(fit.fs);

    engine.onFrame = (raw, now) => {
      if (!stage.hasAttribute("data-ready")) stage.dataset.ready = "";
      // First drawn frame: the field takes the name. Over a hidden wordmark (the opening, or a
      // settled field while the gate still holds it) nothing visible changes, so no fade; over a
      // visible one (light to dark, or the safety net already fired) a theme-length cross-fade.
      if (dark && !frozen && !stage.hasAttribute("data-show")) present(wordmarkShown() ? XF_THEME : 0);
      pace(now);
      const v = governor.sample(raw, now);
      if (!v) return;
      if ("kill" in v) goOff(`probe: ${v.reason}`);
      else engine.setLevel(v.level);
    };

    if (!motion || !scatter) {
      engine.seed(settledSeed(t0));
      plain();
      apply(true);
      opening = "done";
      debug.phase = "still";
      engine.settle(40);
      return;
    }

    // The opening needs an audience: on screen, tab visible, page at the top, dark ground, and the
    // DOM wordmark still held back (never condense a second name over a visible one).
    const r = stage.getBoundingClientRect();
    const onScreen =
      dark &&
      r.bottom > 0 &&
      r.top < window.innerHeight &&
      !document.hidden &&
      scrollP < 0.05 &&
      !frozen &&
      !wordmarkShown();
    if (!onScreen) {
      // No opening without an audience: the field parks settled when it is first seen.
      opening = "aborted";
      sync();
      return;
    }

    opening = "playing";
    stage0 = "form";
    debug.phase = "form";
    engine.seed(scatter);
    engine.open = 0;
    engine.airLvl = 0;
    engine.gate0 = RELEASE_0;
    engine.gateSpan = RELEASE_SPAN;
    // One visible speck per SPECK_AREA px^2, whatever the tier's particle count.
    engine.speck = Math.min(0.05, (fit.cw * fit.ch) / SPECK_AREA / engine.N);
    apply(true);
    sync();
  })().catch(() => goOff("boot error"));

  /* ---------- pauses ---------- */
  const io = new IntersectionObserver(
    ([en]) => {
      visible = !!en?.isIntersecting;
      if (visible) poke();
      sync();
    },
    { threshold: 0.02 },
  );
  io.observe(stage);
  const onVis = () => {
    if (!document.hidden) poke();
    sync();
  };
  document.addEventListener("visibilitychange", onVis);
  cleanups.push(() => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  });

  if (motion) {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const p = Math.min(1, Math.max(0, window.scrollY / (1.5 * window.innerHeight)));
        if (p === scrollP) return;
        scrollP = p;
        lastActive = performance.now();
        parked = false;
        debug.idle = false;
        apply();
        sync();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    });
  }

  /* ---------- pointer: stir the dust (fine pointers), one pulse per click or tap ---------- */
  if (motion) {
    const norm = (e: PointerEvent | MouseEvent) => {
      const r = stage.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)] as const;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const [nx, ny] = norm(e);
      engine.pointer(nx, ny, true);
    };
    const onLeave = () => engine.pointer(0, 0, false);
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest("a, button, input, [data-live]")) return;
      poke();
      if (!engine.isRunning) return;
      const [nx, ny] = norm(e);
      // Strength tuned against the calm spring (30): a visible shell that reforms in under a second.
      engine.pulse(nx, ny, 32, 9, 0.8);
    };
    if (cfg.pointer) {
      hero.addEventListener("pointermove", onMove, { passive: true });
      hero.addEventListener("pointerleave", onLeave);
    }
    hero.addEventListener("click", onClick);
    // Anywhere on the page: movement or a tap wakes the parked loop.
    window.addEventListener("pointermove", poke, { passive: true });
    window.addEventListener("pointerdown", poke, { passive: true });
    cleanups.push(() => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("click", onClick);
      window.removeEventListener("pointermove", poke);
      window.removeEventListener("pointerdown", poke);
    });
  }

  /* ---------- theme: the field lives on the dark ground only ---------- */
  const onTheme = () => {
    palette = readPalette(hero);
    engine.setPalette(palette);
    const was = dark;
    dark = palette.mode === "dark";
    if (dark === was) {
      engine.redraw();
      return;
    }
    if (!dark) {
      // Stop (an opening in progress is dropped), draw one frame on the paper ground so the
      // fading canvas never shows the dark ground, and hand back to the DOM wordmark.
      sync();
      engine.redraw();
      conceal(XF_THEME);
      return;
    }
    if (!targets) return; // still booting: the boot path decides.
    if (opening !== "done") settleNow();
    engine.redraw();
    present(XF_THEME);
    poke();
    sync();
  };
  const mo = new MutationObserver(onTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onTheme);
  cleanups.push(() => {
    mo.disconnect();
    mq.removeEventListener("change", onTheme);
  });

  /* ---------- resize: freeze, align, cross-fade, refit, cross-fade back ---------- */
  /** Map the frozen frame's ink box onto the current one: the old frame sits on the new text. */
  const align = (from: Layout, to: Layout) => {
    const s = to.ink.w / from.ink.w;
    canvas.style.width = `${from.cw}px`;
    canvas.style.height = `${from.ch}px`;
    canvas.style.transformOrigin = "0 0";
    canvas.style.transform = `translate(${to.ink.x - from.ink.x * s}px, ${to.ink.y - from.ink.y * s}px) scale(${s})`;
  };
  const unpin = () => {
    canvas.style.width = "";
    canvas.style.height = "";
    canvas.style.transform = "";
    canvas.style.transformOrigin = "";
  };

  let resizeTimer = 0;
  let resizeSeq = 0;
  const refit = async () => {
    const next = measure();
    const seq = ++resizeSeq;
    try {
      const t = await targetsFor(next);
      if (dead || seq !== resizeSeq) return;
      // Everything below runs in one task, before paint: the canvas returns to its box and is
      // redrawn at the new size before anyone can see the old frame stretched.
      layout = next;
      targets = t;
      frozen = null;
      delete stage.dataset.refit;
      unpin();
      engine.setTargets(t, pointCss(next.fs));
      engine.dimPx = dimPx(next.fs);
      settleNow();
      engine.redraw();
      present(XF_REFIT);
      poke();
      sync();
    } catch {
      /* keep the canvas hidden: the DOM wordmark stays */
    }
  };
  const ro = new ResizeObserver(() => {
    if (!targets) return;
    const next = measure();
    if (!frozen) {
      if (sameLayout(next, layout)) return;
      // Same task as the layout change, before paint: freeze the last frame where the text is now.
      frozen = layout;
      stage.dataset.refit = "";
      sync();
      if (stage.hasAttribute("data-show")) conceal(XF_REFIT);
    }
    align(frozen, next);
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(refit, 150);
  });
  ro.observe(stage);
  ro.observe(wordmark);
  cleanups.push(() => {
    ro.disconnect();
    clearTimeout(resizeTimer);
  });

  return () => {
    teardown();
    unpin();
    hero.style.removeProperty("--fx-xfade");
    delete stage.dataset.ready;
    delete stage.dataset.show;
    delete stage.dataset.refit;
  };
}
