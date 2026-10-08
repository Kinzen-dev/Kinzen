"use client";

import {
  createElement,
  startTransition,
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
import type { NumbersCopy } from "@/i18n/v3/numbers";
import { nobr } from "@/lib/thai-nodes";
import { VIEW_IDS, type ViewId, type ViewProps } from "./types";
import "./showcase.css";

type View = ComponentType<ViewProps>;

/** Every view is its own chunk: only the one on screen (and the next, just before its turn) downloads. */
const LOADERS: Record<ViewId, () => Promise<{ default: View }>> = {
  "split-flap": () => import("./split-flap"),
  "honest-viz": () => import("./honest-viz"),
  "scrolly-stats": () => import("./scrolly-stats"),
  "gold-numerals": () => import("./gold-numerals"),
  "editorial-numerals": () => import("./editorial-numerals"),
};
const loading = new Map<ViewId, Promise<View>>();
function load(id: ViewId): Promise<View> {
  let p = loading.get(id);
  if (!p) {
    p = LOADERS[id]().then((m) => m.default);
    p.catch(() => loading.delete(id));
    loading.set(id, p);
  }
  return p;
}

/** The view the server renders (static) and the page opens on. */
const FIRST: ViewId = "split-flap";
/** Auto-advance period; the active tab's progress line is this timer (a CSS animation). */
const ADVANCE_S = 20;
/** `?numbers-advance=<seconds>` shortens the period (debug and tests only). */
function advanceSeconds() {
  const s = Number(new URLSearchParams(window.location.search).get("numbers-advance"));
  return s >= 0.5 && s <= 60 ? s : ADVANCE_S;
}
/** Share of the section that must be on screen for auto-advance to run. */
const IN_VIEW = 0.35;
/** Crossfade length (showcase.css); the old view unmounts when it ends. */
const FADE_MS = 700;
/** A finger lifted inside the section keeps the timer paused this long. */
const TOUCH_GRACE_MS = 5000;
/** Set once a visitor picks a view: auto-advance stays off for the rest of the visit. */
const PICKED_KEY = "kp-numbers-view-picked";

const next = (id: ViewId) => VIEW_IDS[(VIEW_IDS.indexOf(id) + 1) % VIEW_IDS.length];

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
 * The numbers section's five views of the same four stats (split-flap board, honest pictures, a
 * story, gold dust, editorial print; King's picks from the lab) behind a quiet tab switcher. While the section is in view and nobody points, hovers, focuses or touches
 * inside it, it moves to the next view every ADVANCE_S seconds with a crossfade; the first pick
 * stops that for the visit. The stage keeps one height per breakpoint, so nothing below moves.
 * `children` is the server-rendered first view: complete without JS, swapped for its live twin
 * (same markup) once that chunk loads. Reduced motion: no auto-advance, no crossfade, still views.
 * The active view gets `play` while the section is seen and nobody holds it, picked or not: the
 * one-figure-at-a-time views step through their story only then.
 */
export function NumbersShowcase({ locale, copy, children }: { locale: Locale; copy: NumbersCopy; children: ReactNode }) {
  const uid = useId();
  const tabId = (id: ViewId) => `${uid}-tab-${id}`;
  const panelId = `${uid}-panel`;

  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<ViewId>(FIRST);
  const [active, setActive] = useState<ViewId>(FIRST);
  const [leaving, setLeaving] = useState<ViewId | null>(null);
  const [views, setViews] = useState<Partial<Record<ViewId, View>>>({});
  const [auto, setAuto] = useState(false);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [period, setPeriod] = useState(ADVANCE_S);

  const activeRef = useRef(active);
  const reducedRef = useRef(false);
  const seq = useRef(0);
  const fadeTimer = useRef(0);
  const playing = inView && !held;
  const running = auto && playing;

  /** Show `to` once its chunk is in: the current view fades out over it, then unmounts. */
  const show = useCallback(async (to: ViewId) => {
    const ticket = ++seq.current;
    let View: View;
    try {
      View = await load(to);
    } catch {
      return;
    }
    if (ticket !== seq.current) return;
    const from = activeRef.current;
    activeRef.current = to;
    window.clearTimeout(fadeTimer.current);
    // A transition: React renders the incoming view in slices, so the page keeps its frames.
    startTransition(() => {
      setViews((v) => (v[to] ? v : { ...v, [to]: View }));
      if (from === to) return;
      setActive(to);
      setLeaving(reducedRef.current ? null : from);
    });
    // The outgoing view leaves when its fade ends (onAnimationEnd); this is the backstop.
    if (from !== to && !reducedRef.current) fadeTimer.current = window.setTimeout(() => setLeaving(null), FADE_MS * 3);
  }, []);

  const pick = useCallback(
    (to: ViewId) => {
      setAuto(false);
      writePicked();
      setSelected(to);
      void show(to);
    },
    [show],
  );

  const advance = useCallback(() => {
    const to = next(activeRef.current);
    setSelected(to);
    setAnnounce(`${copy.showing}: ${copy.views[to]}`);
    void show(to);
  }, [copy, show]);

  // Motion preference, the visit's earlier pick, and the live first view once the section nears.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPeriod(advanceSeconds());
    const sync = () => {
      reducedRef.current = mq.matches;
      setAuto(!mq.matches && !readPicked());
    };
    sync();
    mq.addEventListener("change", sync);

    // The live board only matters with motion; under reduced motion the static one is the view.
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries[entries.length - 1].isIntersecting || reducedRef.current) return;
        near.disconnect();
        void load(FIRST).then((View) => setViews((v) => (v[FIRST] ? v : { ...v, [FIRST]: View })));
      },
      { rootMargin: "50% 0px" },
    );
    near.observe(root);
    const seen = new IntersectionObserver(
      (entries) => {
        // Several changes can queue up between frames: the last one is now.
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
      near.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(fadeTimer.current);
    };
  }, []);

  // Anyone pointing, hovering, focusing or touching inside holds the timer.
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
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("pointerup", onUp, { passive: true });
    root.addEventListener("pointercancel", onUp, { passive: true });
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      window.clearTimeout(touchTimer);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // While auto-advance runs, the next view's chunk comes down ahead of its turn.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => void load(next(active)).catch(() => {}), 4000);
    return () => window.clearTimeout(id);
  }, [running, active]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = VIEW_IDS.indexOf(selected);
    const n = VIEW_IDS.length;
    const to =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? VIEW_IDS[(i + 1) % n]
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? VIEW_IDS[(i - 1 + n) % n]
          : e.key === "Home"
            ? VIEW_IDS[0]
            : e.key === "End"
              ? VIEW_IDS[n - 1]
              : null;
    if (!to) return;
    e.preventDefault();
    pick(to);
    tabsRef.current?.querySelector<HTMLButtonElement>(`[data-view="${to}"]`)?.focus();
  };

  const panes = leaving && leaving !== active ? [leaving, active] : [active];

  return (
    <div
      ref={rootRef}
      className="nv"
      data-running={running || undefined}
      data-auto={auto || undefined}
      data-held={held || undefined}
      data-in-view={inView || undefined}
    >
      <div className="nv-bar">
        <div ref={tabsRef} role="tablist" aria-label={copy.switcher} className="nv-tabs" onKeyDown={onKeyDown}>
          {VIEW_IDS.map((id) => {
            const on = id === selected;
            return (
              <button
                key={id}
                id={tabId(id)}
                type="button"
                role="tab"
                data-view={id}
                aria-selected={on}
                aria-controls={panelId}
                tabIndex={on ? 0 : -1}
                className="nv-tab"
                onClick={() => (id === selected ? undefined : pick(id))}
                onPointerEnter={() => void load(id).catch(() => {})}
                onFocus={() => void load(id).catch(() => {})}
              >
                <span>{nobr(copy.views[id])}</span>
                {on && auto ? (
                  <span
                    key={active}
                    aria-hidden="true"
                    className="nv-progress"
                    style={{ animationDuration: `${period}s` }}
                    onAnimationEnd={advance}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="nv-hints">
          {VIEW_IDS.map((id) => (
            <p key={id} className="nv-hint" data-on={id === selected || undefined} aria-hidden={id !== selected}>
              {nobr(copy.hints[id])}
            </p>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div id={panelId} role="tabpanel" aria-labelledby={tabId(active)} className="nv-stage" data-view={active}>
        {panes.map((id) => {
          const View = views[id];
          const out = id !== active;
          return (
            <div
              key={id}
              className="nv-pane"
              data-view={id}
              data-state={out ? "out" : leaving ? "in" : undefined}
              inert={out}
              aria-hidden={out || undefined}
              onAnimationEnd={
                out
                  ? (e) => {
                      if (e.target === e.currentTarget) setLeaving((l) => (l === id ? null : l));
                    }
                  : undefined
              }
            >
              {View ? createElement(View, { locale, copy, play: playing && id === active }) : id === FIRST ? children : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
