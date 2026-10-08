/*
 * A minimal Web Audio stand-in for the unit tests (Node has no AudioContext): records every node,
 * connection, parameter automation, start and stop, so tests can assert what the voices create
 * per event and that stop() releases all of it. Not shipped.
 */

export class FakeParam {
  value: number;
  calls: [string, ...number[]][] = [];
  constructor(v = 0) {
    this.value = v;
  }
  setValueAtTime(v: number, t: number) {
    this.calls.push(["set", v, t]);
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.calls.push(["linear", v, t]);
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.calls.push(["exp", v, t]);
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number, t: number, tc: number) {
    this.calls.push(["target", v, t, tc]);
    this.value = v;
    return this;
  }
  cancelScheduledValues(t: number) {
    this.calls.push(["cancel", t]);
    return this;
  }
}

export class FakeNode {
  kind: string;
  ctx: FakeContext;
  outputs = new Set<FakeNode>();
  disconnected = false;
  constructor(ctx: FakeContext, kind: string) {
    this.ctx = ctx;
    this.kind = kind;
    ctx.nodes.push(this);
  }
  connect<T extends FakeNode>(n: T): T {
    this.outputs.add(n);
    this.disconnected = false;
    return n;
  }
  disconnect() {
    this.outputs.clear();
    this.disconnected = true;
  }
}

export class FakeBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  private data: Float32Array[];
  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.data = Array.from({ length: channels }, () => new Float32Array(length));
  }
  get duration() {
    return this.length / this.sampleRate;
  }
  getChannelData(c: number) {
    return this.data[c];
  }
}

export class FakeSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  loop = false;
  playbackRate = new FakeParam(1);
  started: number[] = [];
  stopped = false;
  onended: (() => void) | null = null;
  constructor(ctx: FakeContext, opts: { buffer?: FakeBuffer; playbackRate?: number; loop?: boolean } = {}) {
    super(ctx, "source");
    this.buffer = opts.buffer ?? null;
    this.loop = opts.loop ?? false;
    this.playbackRate.value = opts.playbackRate ?? 1;
  }
  start(t = 0) {
    this.started.push(t);
  }
  stop() {
    if (!this.started.length) throw new Error("InvalidStateError");
    this.stopped = true;
  }
}

export class FakeGain extends FakeNode {
  gain: FakeParam;
  constructor(ctx: FakeContext, opts: { gain?: number } = {}) {
    super(ctx, "gain");
    this.gain = new FakeParam(opts.gain ?? 1);
  }
}

export class FakeFilter extends FakeNode {
  type: string;
  frequency: FakeParam;
  Q: FakeParam;
  constructor(ctx: FakeContext, opts: { type?: string; frequency?: number; Q?: number } = {}) {
    super(ctx, "filter");
    this.type = opts.type ?? "lowpass";
    this.frequency = new FakeParam(opts.frequency ?? 350);
    this.Q = new FakeParam(opts.Q ?? 1);
  }
}

export class FakePanner extends FakeNode {
  pan: FakeParam;
  constructor(ctx: FakeContext, opts: { pan?: number } = {}) {
    super(ctx, "panner");
    this.pan = new FakeParam(opts.pan ?? 0);
  }
}

export class FakeContext {
  sampleRate = 48000;
  currentTime = 0;
  state: "suspended" | "running" | "closed" = "suspended";
  nodes: FakeNode[] = [];
  buffers = 0;
  decodes = 0;
  destination: FakeNode;
  listeners = new Map<string, () => void>();
  constructor() {
    this.destination = new FakeNode(this, "destination");
  }
  createGain() {
    return new FakeGain(this);
  }
  createWaveShaper() {
    const n = new FakeNode(this, "shaper") as FakeNode & { curve: Float32Array | null; oversample: string };
    n.curve = null;
    n.oversample = "none";
    return n;
  }
  createConvolver() {
    const n = new FakeNode(this, "convolver") as FakeNode & { buffer: FakeBuffer | null; normalize: boolean };
    n.buffer = null;
    n.normalize = true;
    return n;
  }
  createStereoPanner() {
    return new FakePanner(this);
  }
  createBuffer(c: number, n: number, sr: number) {
    this.buffers++;
    return new FakeBuffer(c, n, sr);
  }
  decodeAudioData(data: ArrayBuffer) {
    this.decodes++;
    // A file "decodes" to as many seconds of stereo as its byte length says (bytes = seconds*1000).
    return Promise.resolve(new FakeBuffer(2, Math.round((data.byteLength / 1000) * this.sampleRate), this.sampleRate));
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  addEventListener(type: string, cb: () => void) {
    this.listeners.set(type, cb);
  }
  count(kind: string) {
    return this.nodes.filter((n) => n.kind === kind).length;
  }
}

/** Install the node constructors the voices use (`new GainNode(ctx, ...)`) as globals. */
export function installGlobals(g: Record<string, unknown>) {
  g.AudioBufferSourceNode = FakeSource;
  g.GainNode = FakeGain;
  g.BiquadFilterNode = FakeFilter;
  g.StereoPannerNode = FakePanner;
}
