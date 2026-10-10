import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * Motion governor: the page-wide in-view and idle signals every looping effect reads, so nothing
 * off screen does work and decorative loops rest while the visitor is away.
 *
 * - In view: one shared IntersectionObserver per rootMargin (observeInView / useInView).
 * - Idle: no pointer, touch, key, wheel or page scroll for IDLE_MS. Any input wakes the page
 *   synchronously, inside the event handler (isIdle / onIdleChange / useIdle).
 * - DOM contract (startGovernor, mounted once by <MotionGovernor/>): html[data-idle] while idle,
 *   html[data-page-hidden] while the tab is hidden, data-inview="true|false" on every section in
 *   main, the footer, [data-motion-root] and every element that hosts an infinite CSS loop. governor.css
 *   turns those into --loop-play: paused, which the loops read as their animation-play-state.
 * - Idle rest: a loop is not frozen mid-pass (a sweep would stop half gold). It finishes the pass
 *   it is in and stops at its resting frame; the next input sets it looping again.
 */

export const IDLE_MS = 45_000;
const ROOT_MARGIN = "48px 0px";
const ROOTS = "main section, footer, [data-motion-root]";
const INPUT = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

// ---------- in view ----------

type InViewCb = (inView: boolean) => void;
type Shared = { io: IntersectionObserver; subs: Map<Element, Set<InViewCb>>; last: WeakMap<Element, boolean> };
const observers = new Map<string, Shared>();

function shared(rootMargin: string): Shared {
  let s = observers.get(rootMargin);
  if (!s) {
    const subs = new Map<Element, Set<InViewCb>>();
    const last = new WeakMap<Element, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          last.set(e.target, e.isIntersecting);
          for (const cb of subs.get(e.target) ?? []) cb(e.isIntersecting);
        }
      },
      { rootMargin },
    );
    s = { io, subs, last };
    observers.set(rootMargin, s);
  }
  return s;
}

/** Calls cb with the element's in-view state (once soon, then on every change). Returns unsubscribe. */
export function observeInView(el: Element, cb: InViewCb, opts: { rootMargin?: string } = {}): () => void {
  if (typeof IntersectionObserver === "undefined") {
    cb(true);
    return () => {};
  }
  const s = shared(opts.rootMargin ?? "0px");
  let set = s.subs.get(el);
  if (!set) {
    set = new Set();
    s.subs.set(el, set);
    s.io.observe(el);
  } else {
    // Already observed: the observer will not report again until something changes.
    const known = s.last.get(el);
    if (known !== undefined) queueMicrotask(() => set?.has(cb) && cb(known));
  }
  set.add(cb);
  return () => {
    const cur = s.subs.get(el);
    if (!cur) return;
    cur.delete(cb);
    if (cur.size === 0) {
      s.subs.delete(el);
      s.io.unobserve(el);
    }
  };
}

/** True while the element is on screen (false on the server and until the first report). */
export function useInView(ref: RefObject<Element | null>, opts: { rootMargin?: string } = {}): boolean {
  const [inView, setInView] = useState(false);
  const { rootMargin } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observeInView(el, setInView, { rootMargin });
  }, [ref, rootMargin]);
  return inView;
}

// ---------- idle ----------

let idle = false;
let lastInput = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;
const idleSubs = new Set<(idle: boolean) => void>();

function setIdle(next: boolean) {
  if (next === idle) return;
  idle = next;
  for (const cb of idleSubs) cb(idle);
}

function arm(delay: number) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const left = IDLE_MS - (performance.now() - lastInput);
    if (left > 0) arm(left);
    else setIdle(true);
  }, delay);
}

function onInput() {
  lastInput = performance.now();
  if (idle) {
    setIdle(false);
    arm(IDLE_MS);
  }
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  for (const type of INPUT) document.addEventListener(type, onInput, { capture: true, passive: true });
  // The page's own scroll only: element scrolls can be programmatic (a demo's log following its tail).
  window.addEventListener("scroll", onInput, { passive: true });
  lastInput = performance.now();
  arm(IDLE_MS);
}

/** True after IDLE_MS without input. */
export function isIdle(): boolean {
  return idle;
}

/** Calls cb(idle) on every change. Returns unsubscribe. */
export function onIdleChange(cb: (idle: boolean) => void): () => void {
  listen();
  idleSubs.add(cb);
  return () => {
    idleSubs.delete(cb);
  };
}

export function useIdle(): boolean {
  return useSyncExternalStore(onIdleChange, isIdle, () => false);
}

// ---------- DOM contract ----------

const roots = new Map<Element, () => void>();

/** Stops observing elements that left the DOM (a remounted demo node, a previous page). */
function dropDetached() {
  for (const [el, stop] of roots) {
    if (!el.isConnected) {
      stop();
      roots.delete(el);
    }
  }
}

function track(el: Element) {
  if (roots.has(el)) return;
  dropDetached();
  roots.set(
    el,
    observeInView(
      el,
      (inView) => {
        el.setAttribute("data-inview", String(inView));
        if (inView) findLoopHosts(el);
      },
      { rootMargin: ROOT_MARGIN },
    ),
  );
}

/** Every element running an infinite CSS loop gets its own in-view flag, so a loop in a tall
 *  section rests while the part of the section it sits in is off screen. */
function trackLoops(animations: Animation[], except?: Element) {
  for (const a of animations) {
    if (!(a instanceof CSSAnimation) || a.timeline !== document.timeline) continue;
    const target = (a.effect as KeyframeEffect | null)?.target;
    if (target && target !== except && a.effect?.getTiming().iterations === Infinity) track(target);
  }
}

function findLoopHosts(root: Element) {
  trackLoops(root.getAnimations({ subtree: true }), root);
}

/** Loops a state switches on later (a demo step adding a class) announce themselves here. */
function onAnimationStart(e: AnimationEvent) {
  if (!(e.target instanceof Element)) return;
  if (!roots.has(e.target)) trackLoops(e.target.getAnimations());
  if (idle) restLoops(e.target.getAnimations());
}

/** Finds section roots (again after a route change) and drops the ones that left the DOM. */
export function scanRoots() {
  if (typeof document === "undefined") return;
  dropDetached();
  document.querySelectorAll(ROOTS).forEach(track);
}

let started = false;

// ---------- idle rest ----------

const resting = new Set<Animation>();

/** Lets every infinite CSS loop finish its current pass, then stop (fill none: its resting frame). */
function restLoops(animations: Animation[]) {
  for (const a of animations) {
    if (!(a instanceof CSSAnimation) || !a.effect || resting.has(a)) continue;
    if (a.effect.getTiming().iterations !== Infinity) continue;
    const it = a.effect.getComputedTiming().currentIteration;
    if (it == null) continue;
    a.effect.updateTiming({ iterations: it + 1 });
    resting.add(a);
  }
}

/** Back to looping. CSS play-state control (off screen, hidden tab) is untouched by the round trip. */
function wakeLoops() {
  for (const a of resting) a.effect?.updateTiming({ iterations: Infinity });
  resting.clear();
}

/** Wires the DOM contract once per page load. */
export function startGovernor() {
  if (started || typeof document === "undefined") return;
  started = true;
  const html = document.documentElement;
  onIdleChange((on) => {
    html.toggleAttribute("data-idle", on);
    if (on) restLoops(document.getAnimations());
    else wakeLoops();
  });
  const vis = () => html.toggleAttribute("data-page-hidden", document.hidden);
  document.addEventListener("visibilitychange", vis);
  vis();
  document.addEventListener("animationstart", onAnimationStart, { capture: true, passive: true });
  scanRoots();
}
