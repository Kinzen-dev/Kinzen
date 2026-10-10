"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Locale } from "@/content/schema";
import type { InteractiveCopy } from "@/i18n/v3/interactive";
import { nobr } from "@/lib/thai-nodes";
import { wakeWithin } from "@/motion/frame-governor";
import { SCENE_IDS, type SceneId, type SceneProps } from "./types";
import "./showcase.css";

type Scene = ComponentType<SceneProps>;
type Bus = ReturnType<typeof import("./sound").getAudioBus>;

/** Every scene is its own chunk, fetched once the section nears the screen (never in first load). */
const LOADERS: Record<SceneId, () => Promise<{ default: Scene }>> = {
  "night-desk": () => import("./night-desk/scene"),
  "gold-toss": () => import("./gold-toss/scene"),
  thock: () => import("./thock/scene"),
  "one-drop": () => import("./one-drop/scene"),
};
const loading = new Map<SceneId, Promise<Scene>>();
function load(id: SceneId): Promise<Scene> {
  let p = loading.get(id);
  if (!p) {
    p = LOADERS[id]().then((m) => m.default);
    p.catch(() => loading.delete(id));
    loading.set(id, p);
  }
  return p;
}

/** The audio bus (its own small chunk), loaded on the first gesture, the toggle, or a scene. */
let busPromise: Promise<Bus> | null = null;
const loadBus = () => (busPromise ??= import("./sound").then((m) => m.getAudioBus()));

/** The scene the page opens on (always), whose composed still the server renders. */
const FIRST: SceneId = "night-desk";
/** Auto-advance period; the active tab's progress line is this timer (a CSS animation). */
const ADVANCE_S = 30;
/** `?play-advance=<seconds>` shortens the period (debug and tests only). */
function advanceSeconds() {
  const s = Number(new URLSearchParams(window.location.search).get("play-advance"));
  return s >= 0.5 && s <= 120 ? s : ADVANCE_S;
}
/** Share of the section that must be on screen for auto-advance to run. */
const IN_VIEW = 0.35;
/** The live scene exists only while the section is within this distance of the screen. */
const NEAR = "100% 0px";
/** A finger lifted inside the section keeps the timer paused this long. */
const TOUCH_GRACE_MS = 5000;
/** Set once a visitor picks or plays a scene: auto-advance stays off for the rest of the visit. */
const PICKED_KEY = "kp-play-picked";

const next = (id: SceneId) => SCENE_IDS[(SCENE_IDS.indexOf(id) + 1) % SCENE_IDS.length];

function readPicked() {
  try {
    return sessionStorage.getItem(PICKED_KEY) === "1";
  } catch {
    return false;
  }
}
function writePicked() {
  try {
    sessionStorage.setItem(PICKED_KEY, "1");
  } catch {
    // Storage blocked: the pick still holds for this page view.
  }
}

/**
 * The live scene's last frame as one 2D canvas (every WebGL canvas in the pane, composed at its
 * place), taken in the frame after the scene drew so the drawing buffer is still intact. Lets the
 * old scene fade out as a picture while its context is already gone. Null when nothing was drawn.
 */
function snapshot(pane: HTMLElement): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    // A paced or settled scene may not draw in every frame: have it draw in this one.
    wakeWithin(pane);
    requestAnimationFrame(() => {
      const box = pane.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(box.width * dpr));
      out.height = Math.max(1, Math.round(box.height * dpr));
      const ctx = out.getContext("2d");
      const canvases = pane.querySelectorAll("canvas");
      if (!ctx || canvases.length === 0) return resolve(null);
      for (const c of canvases) {
        const r = c.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        try {
          ctx.drawImage(c, (r.left - box.left) * dpr, (r.top - box.top) * dpr, r.width * dpr, r.height * dpr);
        } catch {
          // A lost context: no picture.
        }
      }
      // A cleared drawing buffer reads back black or empty: then there is nothing worth fading.
      const probe = document.createElement("canvas");
      probe.width = probe.height = 8;
      const p = probe.getContext("2d", { willReadFrequently: true });
      if (!p) return resolve(out);
      p.drawImage(out, 0, 0, 8, 8);
      const d = p.getImageData(0, 0, 8, 8).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) lit = Math.max(lit, d[i] + d[i + 1] + d[i + 2]);
      resolve(lit > 24 ? out : null);
    });
  });
}

/** A scene's composed still, framed for the phone or the desk (public/play, made from the real render). */
function ScenePicture({ id, alt }: { id: SceneId; alt: string }) {
  return (
    <picture className="iv-picture">
      <source media="(max-width: 39.99rem)" srcSet={`/play/${id}-phone.webp`} type="image/webp" />
      <img src={`/play/${id}-desk.webp`} alt={alt} decoding="async" />
    </picture>
  );
}

type Copy = Pick<
  InteractiveCopy,
  "scenes" | "hints" | "switcher" | "showing" | "sound" | "soundOn" | "soundOff" | "noGl" | "stills" | "stillNote"
>;

/**
 * The play section's four scenes (night desk, gold toss, thock, one drop) behind a tab switcher,
 * one live at a time. While the section is in view and nobody points, hovers, focuses or touches
 * inside it, it moves to the next scene every ADVANCE_S seconds: the old scene's last frame is
 * kept as a picture, its WebGL context, physics and sound are freed, and the next scene mounts
 * under the fading picture. A pick or a touch inside a scene stops that for the visit. The live
 * scene exists only near the screen. `poster` is the server-rendered still of the first scene.
 * Sound: on by default, heard after the visitor's first gesture anywhere on the page, silent while
 * the section is off screen or the tab is hidden; the toggle's choice is remembered.
 * Reduced motion: no auto-advance, no crossfade, every scene draws its composed still.
 */
export function PlayShowcase({ locale, copy, poster }: { locale: Locale; copy: Copy; poster: ReactNode }) {
  const uid = useId();
  const tabId = (id: SceneId) => `${uid}-tab-${id}`;
  const panelId = `${uid}-panel`;

  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SceneId>(FIRST);
  const [active, setActive] = useState<SceneId>(FIRST);
  const [scenes, setScenes] = useState<Partial<Record<SceneId, Scene>>>({});
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // Only a software renderer here: every scene shows its picture and none mounts again.
  const [software, setSoftware] = useState(false);
  const [auto, setAuto] = useState(false);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [period, setPeriod] = useState(ADVANCE_S);
  const [muted, setMuted] = useState(false);

  const [reduced, setReduced] = useState(false);

  const activeRef = useRef(active);
  const reducedRef = useRef(false);
  const attachRef = useRef<(b: Bus) => void>(() => {});
  const seq = useRef(0);
  const running = auto && inView && !held;

  const stopAuto = useCallback(() => {
    setAuto(false);
    writePicked();
  }, []);

  /** Show `to` once its chunk is in: the current scene's last frame fades out over it. */
  const show = useCallback(async (to: SceneId) => {
    const ticket = ++seq.current;
    let View: Scene;
    try {
      View = await load(to);
    } catch {
      return;
    }
    if (ticket !== seq.current) return;
    const from = activeRef.current;
    if (from === to) {
      setScenes((v) => (v[to] ? v : { ...v, [to]: View }));
      return;
    }
    const pane = paneRef.current;
    const ghost = ghostRef.current;
    if (pane && ghost && !reducedRef.current) {
      const pic = await snapshot(pane);
      if (ticket !== seq.current) return;
      ghost.replaceChildren(...(pic ? [pic] : []));
      ghost.dataset.on = pic ? "true" : "";
      // Restart the fade even when one is still running.
      void ghost.offsetWidth;
      ghost.dataset.on = pic ? "fade" : "";
    }
    activeRef.current = to;
    // One commit: the old scene's cleanup (context, loop, listeners, sound) runs before the new one mounts.
    setScenes((v) => (v[to] ? v : { ...v, [to]: View }));
    setActive(to);
    setReady(false);
    setFailed(false);
  }, []);

  const pick = useCallback(
    (to: SceneId) => {
      stopAuto();
      setSelected(to);
      void show(to);
    },
    [show, stopAuto],
  );

  const advance = useCallback(() => {
    const to = next(activeRef.current);
    setSelected(to);
    setAnnounce(`${copy.showing}: ${copy.scenes[to]}`);
    void show(to);
  }, [copy, show]);

  // Motion preference, the visit's earlier pick, nearness (the live scene), view (the timer, the sound).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPeriod(advanceSeconds());
    const sync = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
      setAuto(!mq.matches && !readPicked());
    };
    sync();
    mq.addEventListener("change", sync);

    const nearIo = new IntersectionObserver(
      (entries) => {
        const on = entries[entries.length - 1].isIntersecting;
        setNear(on);
        if (on) void show(activeRef.current);
      },
      { rootMargin: NEAR },
    );
    nearIo.observe(root);
    const seen = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        setInView(e.intersectionRatio >= IN_VIEW && !document.hidden);
      },
      { threshold: [0, IN_VIEW] },
    );
    seen.observe(root);
    const onVis = () => {
      if (document.hidden) setInView(false);
      else {
        seen.unobserve(root);
        seen.observe(root);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", sync);
      nearIo.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [show]);

  // Sound: the first gesture anywhere unlocks the bus; it plays only while the section shows.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let bus: Bus | null = null;
    let unlocked = false;
    let audible = false;
    let off: (() => void) | undefined;
    let dead = false;
    // The bus fades and suspends itself for a hidden tab; off screen is ours to report.
    const apply = () => {
      if (!bus || !unlocked) return;
      bus.setAway(!audible || document.hidden);
    };
    const attach = (attachRef.current = (b: Bus) => {
      if (dead || bus) return;
      bus = b;
      setMuted(b.muted);
      off = b.onChange(() => setMuted(b.muted));
      apply();
    });
    const gestures = ["pointerdown", "keydown", "touchstart"] as const;
    const onGesture = () => {
      gestures.forEach((g) => window.removeEventListener(g, onGesture, true));
      void loadBus().then(async (b) => {
        attach(b);
        await b.unlock();
        unlocked = true;
        apply();
      });
    };
    gestures.forEach((g) => window.addEventListener(g, onGesture, { capture: true, passive: true }));
    const io = new IntersectionObserver((entries) => {
      audible = entries[entries.length - 1].isIntersecting;
      apply();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", apply);
    return () => {
      dead = true;
      gestures.forEach((g) => window.removeEventListener(g, onGesture, true));
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
      off?.();
      bus?.setAway(true);
    };
  }, []);

  // Anyone pointing, hovering, focusing or touching inside holds the timer; playing a scene stops it.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let hover = false;
    let focus = false;
    let touch = false;
    let touchTimer = 0;
    const sync = () => setHeld(hover || focus || touch);
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      hover = true;
      sync();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      hover = false;
      sync();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      window.clearTimeout(touchTimer);
      touch = true;
      sync();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      window.clearTimeout(touchTimer);
      touchTimer = window.setTimeout(() => {
        touch = false;
        sync();
      }, TOUCH_GRACE_MS);
    };
    const onFocusIn = () => {
      focus = true;
      sync();
    };
    const onFocusOut = (e: FocusEvent) => {
      focus = root.contains(e.relatedTarget as Node | null);
      sync();
    };
    // Delegated: the pane is a new element for every scene.
    const onPlay = (e: Event) => {
      if ((e.target as Element | null)?.closest?.(".iv-pane")) stopAuto();
    };
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("pointerup", onUp, { passive: true });
    root.addEventListener("pointercancel", onUp, { passive: true });
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("pointerdown", onPlay, { passive: true });
    root.addEventListener("keydown", onPlay);
    return () => {
      window.clearTimeout(touchTimer);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("pointerdown", onPlay);
      root.removeEventListener("keydown", onPlay);
    };
  }, [stopAuto]);

  // A live scene plays through the bus: hold it for the toggle and the pause rules.
  useEffect(() => {
    if (near) void loadBus().then((b) => attachRef.current(b));
  }, [near]);

  // While auto-advance runs, the next scene's chunk comes down ahead of its turn.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => void load(next(active)).catch(() => {}), 4000);
    return () => window.clearTimeout(id);
  }, [running, active]);

  const toggleSound = () => {
    const to = !muted;
    setMuted(to);
    void loadBus().then((b) => b.setMuted(to));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SCENE_IDS.indexOf(selected);
    const n = SCENE_IDS.length;
    const to =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? SCENE_IDS[(i + 1) % n]
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? SCENE_IDS[(i - 1 + n) % n]
          : e.key === "Home"
            ? SCENE_IDS[0]
            : e.key === "End"
              ? SCENE_IDS[n - 1]
              : null;
    if (!to) return;
    e.preventDefault();
    pick(to);
    tabsRef.current?.querySelector<HTMLButtonElement>(`[data-scene-id="${to}"]`)?.focus();
  };

  const Live = near && !software ? scenes[active] : undefined;

  return (
    <div
      ref={rootRef}
      className="iv"
      data-running={running || undefined}
      data-auto={auto || undefined}
      data-held={held || undefined}
      data-in-view={inView || undefined}
      data-active={active}
    >
      <div className="iv-bar">
        <div ref={tabsRef} role="tablist" aria-label={copy.switcher} className="iv-tabs" onKeyDown={onKeyDown}>
          {SCENE_IDS.map((id) => {
            const on = id === selected;
            return (
              <button
                key={id}
                id={tabId(id)}
                type="button"
                role="tab"
                data-scene-id={id}
                aria-selected={on}
                aria-controls={panelId}
                tabIndex={on ? 0 : -1}
                className="iv-tab"
                onClick={() => (id === selected ? undefined : pick(id))}
                onPointerEnter={() => void load(id).catch(() => {})}
                onFocus={() => void load(id).catch(() => {})}
              >
                <span>{nobr(copy.scenes[id])}</span>
                {on && auto ? (
                  <span
                    key={active}
                    aria-hidden="true"
                    className="iv-progress"
                    style={{ animationDuration: `${period}s` }}
                    onAnimationEnd={advance}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="iv-hints">
          {SCENE_IDS.map((id) => (
            <p key={id} className="iv-hint" data-on={id === selected || undefined} aria-hidden={id !== selected}>
              {nobr(copy.hints[id])}
            </p>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div id={panelId} role="tabpanel" aria-labelledby={tabId(active)} className="iv-stage" data-scene="dark">
        <div
          ref={paneRef}
          key={active}
          className="iv-pane"
          data-scene-id={active}
          data-state={reduced ? undefined : "in"}
        >
          {software ? (
            <>
              <ScenePicture id={active} alt={copy.stills[active]} />
              <p className="iv-fail">{nobr(copy.stillNote)}</p>
            </>
          ) : failed ? (
            <p className="iv-fail">{nobr(copy.noGl)}</p>
          ) : Live ? (
            createElement(Live, {
              locale,
              onReady: () => setReady(true),
              onPlay: stopAuto,
              onFail: (why) => (why === "software" ? setSoftware(true) : setFailed(true)),
            })
          ) : null}
        </div>
        {active === FIRST && !software ? (
          <div className="iv-poster" data-hide={ready || undefined} aria-hidden={ready || undefined}>
            {poster}
          </div>
        ) : null}
        <div
          ref={ghostRef}
          className="iv-ghost"
          aria-hidden="true"
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            e.currentTarget.replaceChildren();
            e.currentTarget.dataset.on = "";
          }}
        />
        <button
          type="button"
          className="iv-sound"
          aria-pressed={!muted}
          title={muted ? copy.soundOff : copy.soundOn}
          onClick={toggleSound}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
            {muted ? (
              <path className="iv-wave" d="M16 9.5l5 5M21 9.5l-5 5" />
            ) : (
              <path className="iv-wave" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" />
            )}
          </svg>
          <span>{nobr(copy.sound)}</span>
        </button>
      </div>
    </div>
  );
}
