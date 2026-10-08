/*
 * The section's one AudioContext and its output chain:
 *   voices -> master (the bus input, unity) -> fader (mute and page visibility, 300 ms fades)
 *          -> limiter (zero-latency soft-knee peak limiter) -> destination.
 * Sound is on by default; the choice is remembered in localStorage "kz-sound" ("off" or "on").
 * The context is created lazily and suspended; nothing plays until unlock() runs inside the
 * visitor's first gesture (getAudioBus also listens for that gesture itself, once). While muted
 * or hidden the context is suspended after the fade, so a muted page costs no audio CPU. The section
 * also calls setAway(true) while it is scrolled off screen: same fade, same suspend.
 *
 * The limiter is a WaveShaper curve, not a DynamicsCompressorNode: Chrome's compressor delays the
 * whole mix by its ~6 ms lookahead, which a key press would hear. The mix is levelled with
 * headroom (ambience about -20 LUFS, peaks near -6 dBFS), so the curve only rounds rare sums of
 * peaks and nothing can clip.
 */

export type AudioBus = {
  ctx: AudioContext;
  master: GainNode;
  muted: boolean;
  setMuted(m: boolean): void;
  unlock(): Promise<void>;
  onChange(cb: () => void): () => void;
  /** The section is off screen: fade out and suspend like a hidden tab (not persisted). */
  setAway(away: boolean): void;
};

export const STORAGE_KEY = "kz-sound";
export const FADE_S = 0.3;

/** Bus internals the section's voices share (not part of the public contract). */
type BusState = { unlocked: boolean; offline: boolean };
const STATE = new WeakMap<AudioBus, BusState>();

/** True when a voice may make sound now: unlocked, and the context is actually running. */
export function canPlay(bus: AudioBus) {
  const s = STATE.get(bus);
  if (!s?.unlocked) return false;
  return s.offline || bus.ctx.state === "running";
}

/** True for a bus on an OfflineAudioContext (renders and tests): everything is prepared at once. */
export function isOffline(bus: AudioBus) {
  return STATE.get(bus)?.offline ?? false;
}

/** True once the visitor's gesture has unlocked the bus (it may still be muted or hidden). */
export function isUnlocked(bus: AudioBus) {
  return STATE.get(bus)?.unlocked ?? false;
}

/** The limiter's transfer curve: linear to -6 dBFS, then a smooth knee that never reaches 1. */
export function limiterCurve(n = 4096) {
  const curve = new Float32Array(n);
  const knee = 0.5;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee));
    curve[i] = Math.sign(x) * y * 0.98;
  }
  return curve;
}

function readMuted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

function writeMuted(m: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, m ? "off" : "on");
  } catch {
    // Storage blocked: the choice holds for this page view.
  }
}

/**
 * Build a bus on a given context. The page uses the singleton below; the offline renders and
 * tests pass an OfflineAudioContext (`offline: true` counts as unlocked and never suspends).
 */
export function createAudioBus(ctx: BaseAudioContext, opts: { offline?: boolean; muted?: boolean } = {}): AudioBus {
  const offline = opts.offline ?? false;
  const master = ctx.createGain();
  const fader = ctx.createGain();
  const limiter = ctx.createWaveShaper();
  limiter.curve = limiterCurve();
  limiter.oversample = "none";
  master.connect(fader).connect(limiter).connect(ctx.destination);
  const subs = new Set<() => void>();
  const state: BusState = { unlocked: offline, offline };
  let hidden = false;
  let away = false;
  let token = 0;
  const notify = () => subs.forEach((cb) => cb());

  const audible = () => state.unlocked && !bus.muted && !hidden && !away;

  /** Fade toward the right level; suspend after a fade out, resume before a fade in. */
  const settle = () => {
    if (offline) return;
    const rt = ctx as AudioContext;
    const my = ++token;
    const target = audible() ? 1 : 0;
    const ramp = () => {
      const t = rt.currentTime;
      fader.gain.cancelScheduledValues(t);
      fader.gain.setValueAtTime(fader.gain.value, t);
      fader.gain.linearRampToValueAtTime(target, t + FADE_S);
    };
    if (target) {
      if (rt.state !== "running") {
        void rt.resume().then(() => {
          if (my !== token) return;
          ramp();
          notify();
        }, () => undefined);
      } else ramp();
    } else if (rt.state === "running") {
      ramp();
      window.setTimeout(() => {
        if (my === token && !audible() && rt.state === "running") void rt.suspend().then(notify, () => undefined);
      }, FADE_S * 1000 + 60);
    }
  };

  const bus: AudioBus = {
    ctx: ctx as AudioContext,
    master,
    muted: opts.muted ?? false,
    setMuted(m) {
      if (m === bus.muted) return;
      bus.muted = m;
      if (!offline) writeMuted(m);
      settle();
      notify();
    },
    async unlock() {
      if (offline) return;
      const rt = ctx as AudioContext;
      const first = !state.unlocked;
      state.unlocked = true;
      if (audible() && rt.state !== "running") {
        // Start silent, then fade in: the first sound never pops.
        fader.gain.value = 0;
        await rt.resume().catch(() => undefined);
      }
      settle();
      if (first) notify();
    },
    setAway(a) {
      if (a === away) return;
      away = a;
      settle();
    },
    onChange(cb) {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
  };
  fader.gain.value = offline ? 1 : 0;
  STATE.set(bus, state);

  if (!offline && typeof document !== "undefined") {
    const onVis = () => {
      hidden = document.visibilityState === "hidden";
      settle();
    };
    document.addEventListener("visibilitychange", onVis);
    hidden = document.visibilityState === "hidden";
    // A context can also be interrupted by the system (iOS calls, other tabs); recover on return.
    (ctx as AudioContext).addEventListener?.("statechange", () => notify());
  }
  return bus;
}

let singleton: AudioBus | null = null;

/** The page's bus: created on first use (client only), suspended until unlock(). */
export function getAudioBus(): AudioBus {
  if (singleton) return singleton;
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC({ latencyHint: "interactive" });
  void ctx.suspend().catch(() => undefined);
  const bus = createAudioBus(ctx, { muted: readMuted() });
  singleton = bus;
  // Unlock on the first gesture anywhere, even if no scene asked yet (resume must run inside it).
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const once = () => {
    events.forEach((e) => window.removeEventListener(e, once, true));
    void bus.unlock();
  };
  events.forEach((e) => window.addEventListener(e, once, { capture: true, passive: true }));
  return bus;
}
