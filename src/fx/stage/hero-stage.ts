import { WORDMARK_EM } from "../baked/geometry";
import { pickTier, readEnv, TIER_CONFIG, type Tier } from "../engine/capability";
import { ParticleEngine, worldPerPx, type Params } from "../engine/engine";
import { Governor } from "../engine/governor";
import { readPalette } from "../engine/palette";
import { TargetClient } from "../targets/client";
import { settledSeed } from "../targets/sample-mask";
import type { Box, Targets } from "../targets/types";

/**
 * The hero choreography, framework-free. One authored moment, then the material moving:
 *   burst (0 to 450 ms) -> the dust forms the wordmark under the DOM text -> once the glyph
 *   particles have measurably converged onto the DOM glyphs the DOM wordmark cross-fades out
 *   (data-fx="on") -> calm drift by 2.3 s.
 * The opening plays once per page load and only while it can be seen: if the hero is off screen
 * (or the tab hidden) when it would play, or leaves view mid-way, the field resumes settled.
 * Resize: the canvas hides at once (the DOM wordmark shows) until the field has refit to the new
 * layout, then cross-fades back; a stale frame never covers text.
 * Scroll-out (SIAN scrollFade): the name loosens into dust over 1.5 viewports, then the loop
 * stops. Reduced motion: seed at the final wordmark, settle, stop. Any failure: tier "off",
 * the server-rendered wordmark simply stays.
 */

const STAGE: Record<"burst" | "form" | "calm" | "still", Partial<Params>> = {
  burst: { spring: 0, damp: 0.95, turb: 2.2, tscale: 0.2, tspeed: 0.1, drift: 0, gain: 1.5, mouseF: 0 },
  form: { spring: 26, damp: 0.86, turb: 0.4, tscale: 1.1, tspeed: 0.3, drift: 0, gain: 1.0, mouseF: 0 },
  calm: { spring: 30, damp: 0.86, turb: 0.05, tscale: 0.9, tspeed: 0.12, drift: 0, gain: 1.0, mouseF: 26 },
  still: { spring: 30, damp: 0.8, turb: 0, tscale: 0.6, tspeed: 0, drift: 0, gain: 1.0, mouseF: 0 },
};

const T_FORM = 450;
/** Earliest DOM hand-off; it then waits for measured convergence. */
const T_SETTLED = 1450;
/** Hand off regardless after this (convergence cannot be measured, or never gets there). */
const T_HANDOFF_MAX = 4000;
const T_CALM = 2300;
/** Mean glyph-particle distance to target (CSS px) under which the field reads as the DOM glyphs. */
const CONV_PX = 1.5;
/** A refit reveals regardless after this long. */
const REFIT_MAX = 1200;

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
  /** Last measured convergence (CSS px), -1 when unmeasured. */
  conv: number;
  ink: { x: number; y: number; w: number; h: number; src: string } | null;
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
    conv: -1,
    ink: null,
  };
  (window as Window & { __kzFx?: Debug }).__kzFx = debug;

  const cleanups: (() => void)[] = [];
  let dead = false;
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const clearTimers = () => timers.splice(0).forEach((t) => clearTimeout(t));

  const setTier = (tier: Tier, reason: string) => {
    debug.tier = tier;
    debug.reason = reason;
    hero.dataset.fxTier = tier;
  };

  const teardown = () => {
    dead = true;
    clearTimers();
    cleanups.splice(0).forEach((fn) => fn());
  };

  const goOff = (reason: string) => {
    if (dead) return;
    teardown();
    setTier("off", reason);
    delete hero.dataset.fx;
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
  let palette = readPalette(hero);
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
  let stage0: keyof typeof STAGE = motion ? "burst" : "still";
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
  const shouldRun = () => motion && visible && !document.hidden && scrollP < 0.999;

  /* ---------- opening, hand-off, refit ---------- */
  // "idle" before boot, "playing" while the burst runs, "aborted" if it was paused mid-way (it
  // never replays), "done" once the field is settled.
  let opening: "idle" | "playing" | "aborted" | "done" = "idle";
  let targets: Targets | null = null;
  let openedAt = 0;
  let handed = false;
  let wantHandoff = false;
  let refitting = false;
  /** Frame count after which a refit may reveal; Infinity until the new targets are in. */
  let revealFrom = Infinity;
  let revealAt = 0;
  let xfadeTimer = 0;
  let watchTick = 0;

  const handoff = () => {
    wantHandoff = false;
    handed = true;
    hero.dataset.fx = "on";
    if (debug.phase === "form" || debug.phase === "burst") debug.phase = "settled";
  };

  /** Park the field at its targets in calm drift: the resume path, never a second opening. */
  const settleNow = () => {
    clearTimers();
    opening = "done";
    stage0 = motion ? "calm" : "still";
    debug.phase = stage0;
    governor.locked = false;
    apply(true);
    if (targets) engine.seed(settledSeed(targets));
  };

  const reveal = () => {
    refitting = false;
    revealFrom = Infinity;
    delete stage.dataset.refit;
    stage.dataset.xfade = "";
    clearTimeout(xfadeTimer);
    xfadeTimer = window.setTimeout(() => delete stage.dataset.xfade, 600);
    handoff();
  };

  /** Called after every rendered frame (motion tiers): measured gates for hand-off and reveal. */
  const watch = () => {
    if (!wantHandoff && !refitting) return;
    if (++watchTick % 4) return;
    const c = engine.convergence();
    debug.conv = c ?? -1;
    const now = performance.now();
    const close = c !== null && (c < CONV_PX || scrollP > 0);
    if (refitting) {
      if (engine.frames > revealFrom && (close || now - revealAt > REFIT_MAX)) reveal();
      return;
    }
    if (close || now - openedAt > T_HANDOFF_MAX) handoff();
  };

  const sync = () => {
    if (dead) return;
    if (shouldRun()) {
      if (opening === "aborted") {
        // Parameters snap to the current scroll state here, at resume, not when it was paused.
        settleNow();
        openedAt = performance.now();
        wantHandoff = !handed && !refitting;
      }
      engine.start();
    } else {
      engine.stop();
      if (opening === "playing") {
        // Paused mid-opening (scrolled away, tab hidden): drop it; it resumes settled, never replays.
        clearTimers();
        opening = "aborted";
      }
    }
  };

  /* ---------- boot ---------- */
  (async () => {
    const ok = await engine.ready();
    if (dead) return;
    if (!ok) return goOff("shader compile");
    engine.setPalette(palette);
    const fit = layout;
    const origin = [
      (fit.ink.x + fit.ink.w / 2 - fit.cw / 2) * worldPerPx(fit.ch),
      -(fit.ink.y + fit.ink.h / 2 - fit.ch / 2) * worldPerPx(fit.ch),
    ] as const;
    const [t0, burst] = await Promise.all([
      targetsFor(fit),
      motion
        ? client.burst({ N: engine.N, origin, speed: fit.ink.w * worldPerPx(fit.ch) * 0.55 })
        : Promise.resolve(null),
    ]);
    if (dead) return;
    targets = t0;
    engine.setTargets(t0, pointCss(fit.fs));
    engine.seed(burst ?? settledSeed(t0));
    debug.phase = motion ? "burst" : "still";

    engine.onFrame = (raw, now) => {
      if (!stage.dataset.ready) stage.dataset.ready = "";
      watch();
      const v = governor.sample(raw, now);
      if (!v) return;
      if ("kill" in v) goOff(`probe: ${v.reason}`);
      else engine.setLevel(v.level);
    };

    if (!motion) {
      apply(true);
      opening = "done";
      engine.settle(40, () => {
        handoff();
        debug.phase = "still";
      });
      return;
    }

    // The opening needs an audience: on screen, tab visible, page at the top.
    const r = stage.getBoundingClientRect();
    const onScreen = r.bottom > 0 && r.top < window.innerHeight && !document.hidden && scrollP < 0.05;
    openedAt = performance.now();
    if (!onScreen) {
      // No opening without an audience: the field parks settled when it is first seen.
      opening = "aborted";
      sync();
      return;
    }

    opening = "playing";
    stage0 = "burst";
    apply(true);
    sync();
    later(T_FORM, () => {
      stage0 = "form";
      debug.phase = "form";
      apply();
    });
    later(T_SETTLED, () => {
      wantHandoff = !handed && !refitting;
    });
    later(T_CALM, () => {
      opening = "done";
      stage0 = "calm";
      debug.phase = "calm";
      governor.locked = false;
      apply();
    });
  })().catch(() => goOff("boot error"));

  /* ---------- pauses ---------- */
  const io = new IntersectionObserver(
    ([en]) => {
      visible = !!en?.isIntersecting;
      sync();
    },
    { threshold: 0.02 },
  );
  io.observe(stage);
  const onVis = () => sync();
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
    cleanups.push(() => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("click", onClick);
    });
  }

  /* ---------- theme and resize ---------- */
  const onTheme = () => {
    palette = readPalette(hero);
    engine.setPalette(palette);
    engine.redraw();
  };
  const mo = new MutationObserver(onTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onTheme);
  cleanups.push(() => {
    mo.disconnect();
    mq.removeEventListener("change", onTheme);
  });

  let resizeTimer = 0;
  let resizeSeq = 0;
  const refit = async () => {
    const next = measure();
    layout = next;
    const seq = ++resizeSeq;
    try {
      const t = await targetsFor(next);
      if (dead || seq !== resizeSeq) return;
      targets = t;
      engine.setTargets(t, pointCss(next.fs));
      settleNow();
      revealFrom = engine.frames;
      revealAt = performance.now();
      if (!motion) {
        engine.settle(20, () => {
          if (seq === resizeSeq) reveal();
        });
      } else {
        sync();
        if (!engine.isRunning) {
          // Off screen or scrolled out: draw once at the new size so nothing stale waits there.
          engine.redraw();
          if (seq === resizeSeq) reveal();
        }
      }
    } catch {
      /* keep the canvas hidden: the DOM wordmark stays */
    }
  };
  const ro = new ResizeObserver(() => {
    if (!targets) return;
    const next = measure();
    if (sameLayout(next, layout) && !refitting) return;
    // Same task as the layout change, before paint: the old-scale frame never shows.
    refitting = true;
    revealFrom = Infinity;
    wantHandoff = false;
    stage.dataset.refit = "";
    delete stage.dataset.xfade;
    delete hero.dataset.fx;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(refit, 150);
  });
  ro.observe(stage);
  ro.observe(wordmark);
  cleanups.push(() => {
    ro.disconnect();
    clearTimeout(resizeTimer);
    clearTimeout(xfadeTimer);
  });

  return () => {
    teardown();
    delete hero.dataset.fx;
    delete stage.dataset.ready;
    delete stage.dataset.refit;
    delete stage.dataset.xfade;
  };
}
