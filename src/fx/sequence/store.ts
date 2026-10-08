/**
 * The hero stage's public state, shared by the stage (which writes it) and the small pause control
 * and scene dots in the hero (which read it and ask for a pause). Plain module state with
 * subscribe/getSnapshot for useSyncExternalStore; tiny, so it can live in the first-load bundle.
 */
export type StageState = {
  /** The sequence is animating (false before it starts, under reduced motion, after a stop). */
  running: boolean;
  /** Paused by the visitor (the stage also stops itself off screen, which is not this). */
  paused: boolean;
  /** Every scene of the loop, in order (just the desk when there is no GPU). */
  scenes: string[];
  /** Scenes dropped for this session (too slow on this device, or failed to build). */
  skipped: string[];
  /** The scene the viewer sees: during a hand-over it switches where the incoming scene takes over. */
  visible: string;
};

let state: StageState = { running: false, paused: false, scenes: [], skipped: [], visible: "desk" };
const listeners = new Set<() => void>();

export const stageStore = {
  get: (): StageState => state,
  /** The server snapshot: nothing running. */
  server: (): StageState => SERVER,
  set(patch: Partial<StageState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};

const SERVER: StageState = state;
