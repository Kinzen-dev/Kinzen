import { WORDMARK_EM } from "../baked/geometry";
import { pickTier, readEnv, TIER_CONFIG, type Tier } from "../engine/capability";
import { ParticleEngine, worldPerPx, type Params } from "../engine/engine";
import { Governor } from "../engine/governor";
import { readPalette } from "../engine/palette";
import { TargetClient } from "../targets/client";
import { settledSeed } from "../targets/sample-mask";
import type { Box } from "../targets/types";

/**
 * The hero choreography, framework-free. One authored moment, then the material moving:
 *   burst (0 to 450 ms) -> the dust forms the wordmark under the DOM text -> once settled the
 *   DOM wordmark cross-fades out (data-fx="on") -> calm drift by 2.3 s.
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
const T_SETTLED = 1450;
const T_CALM = 2300;

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
};

export function startHeroStage(els: StageEls, onOff: () => void): () => void {
  const { hero, stage, canvas, wordmark } = els;
  const env = readEnv();
  const debug: Debug = { tier: "off", reason: "", renderer: "", engine: null, governor: null, phase: "boot" };
  (window as Window & { __kzFx?: Debug }).__kzFx = debug;

  const cleanups: (() => void)[] = [];
  let dead = false;
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  const setTier = (tier: Tier, reason: string) => {
    debug.tier = tier;
    debug.reason = reason;
    hero.dataset.fxTier = tier;
  };

  const teardown = () => {
    dead = true;
    timers.forEach((t) => clearTimeout(t));
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
    const left = r.left + parseFloat(cs.paddingLeft) - c.left;
    const top = r.top + parseFloat(cs.paddingTop) - c.top;
    const ink: Box = {
      x: left + WORDMARK_EM.x0 * fs,
      y: top + WORDMARK_EM.y0 * fs,
      w: WORDMARK_EM.w * fs,
      h: WORDMARK_EM.h * fs,
    };
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
  const sync = () => {
    if (dead) return;
    if (shouldRun()) engine.start();
    else engine.stop();
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
    const [targets, burst] = await Promise.all([
      targetsFor(fit),
      motion
        ? client.burst({ N: engine.N, origin, speed: fit.ink.w * worldPerPx(fit.ch) * 0.55 })
        : Promise.resolve(null),
    ]);
    if (dead) return;
    engine.setTargets(targets, pointCss(fit.fs));
    engine.seed(burst ?? settledSeed(targets));
    debug.phase = motion ? "burst" : "still";

    engine.onFrame = (raw, now) => {
      if (!stage.dataset.ready) stage.dataset.ready = "";
      const v = governor.sample(raw, now);
      if (!v) return;
      if ("kill" in v) goOff(`probe: ${v.reason}`);
      else engine.setLevel(v.level);
    };

    if (!motion) {
      apply(true);
      engine.settle(40, () => {
        hero.dataset.fx = "on";
        debug.phase = "still";
      });
      return;
    }

    stage0 = "burst";
    apply(true);
    sync();
    later(T_FORM, () => {
      stage0 = "form";
      debug.phase = "form";
      apply();
    });
    later(T_SETTLED, () => {
      hero.dataset.fx = "on";
      debug.phase = "settled";
    });
    later(T_CALM, () => {
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
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(async () => {
      const next = measure();
      if (sameLayout(next, layout)) return;
      layout = next;
      const seq = ++resizeSeq;
      try {
        const t = await targetsFor(next);
        if (dead || seq !== resizeSeq) return;
        engine.setTargets(t, pointCss(next.fs));
        if (!motion) {
          engine.seed(settledSeed(t));
          engine.settle(20);
        }
      } catch {
        /* keep the previous targets */
      }
    }, 150);
  });
  ro.observe(stage);
  ro.observe(wordmark);
  cleanups.push(() => {
    ro.disconnect();
    clearTimeout(resizeTimer);
  });

  return () => {
    teardown();
    delete hero.dataset.fx;
    delete stage.dataset.ready;
  };
}
