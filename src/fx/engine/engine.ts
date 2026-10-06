import type { TierConfig } from "./capability";
import { FrameCap } from "./frame-cap";
import type { Level } from "./governor";
import type { Palette } from "./palette";
import { blurFS, compFS, downFS, pointFS, pointVS, quadVS, simFS } from "./shaders";
import type { Burst, Rgb, Targets } from "../targets/types";

// WebGL2 particle field, framework-free. Port of SIAN's engine (itself laong-thong's): float
// texture ping-pong sim (position + velocity), gaussian points drawn additively into an HDR
// target, two-level bloom, hue-preserving composite. Changes for the portfolio: fixed planar
// camera (particles register with the DOM wordmark), targets arrive as data from a worker,
// per-particle role, raw-delta frame callback for the governor, frame cap, DPR cap + pixel
// budget + resolution scale, row-subset simulation, parallel shader compile (no long task).

export type Params = {
  spring: number;
  damp: number;
  turb: number;
  tscale: number;
  tspeed: number;
  drift: number;
  mouseR: number;
  mouseF: number;
  /** Spring multiplier for dust (role 0). */
  dustSpring: number;
  /** Turbulence multiplier for dust. */
  dustTurb: number;
  /** Pointer force multiplier for glyph particles: the cursor stirs dust, never smears letters. */
  glyphPointer: number;
  /** Settled glyph brightness (density-normalised). */
  gain: number;
};

export type Stats = { fps: number; side: number; drawn: number; w: number; h: number; dpr: number };

const FOV = (50 * Math.PI) / 180;
const TANH = Math.tan(FOV / 2);
const DIST = 16;

/** World units per CSS px at the z = 0 plane for a canvas `ch` CSS px tall. */
export function worldPerPx(ch: number): number {
  return (2 * DIST * TANH) / Math.max(1, ch);
}

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null>; samplers: string[] };
type Sim = {
  pos: WebGLTexture[];
  vel: WebGLTexture[];
  target: WebGLTexture;
  col: WebGLTexture;
  fbo: WebGLFramebuffer[];
  cur: number;
};
type Screen = {
  w: number;
  h: number;
  dpr: number;
  cw: number;
  ch: number;
  qw: number;
  qh: number;
  ew: number;
  eh: number;
  scene: WebGLTexture;
  sceneFbo: WebGLFramebuffer;
  texA: WebGLTexture[];
  fboA: WebGLFramebuffer[];
  texB: WebGLTexture[];
  fboB: WebGLFramebuffer[];
};

const lin = (c: Rgb): [number, number, number] => [
  Math.pow(c[0] / 255, 2.2),
  Math.pow(c[1] / 255, 2.2),
  Math.pow(c[2] / 255, 2.2),
];

export class ParticleEngine {
  readonly side: number;
  readonly N: number;
  P: Params = {
    spring: 0,
    damp: 0.94,
    turb: 2,
    tscale: 0.22,
    tspeed: 0.12,
    drift: 0,
    mouseR: 1.7,
    mouseF: 30,
    dustSpring: 0.55,
    dustTurb: 1.4,
    glyphPointer: 0.08,
    gain: 1,
  };
  PT: Params = { ...this.P };
  /** Overall fade (scroll-out), 0..1. */
  fade = 1;
  /**
   * The opening (the stage drives these per frame). While `open` < 1, a particle in the air is
   * hidden unless it is one of the sparse `speck` share (shown at `airLvl`), and every particle
   * lights up over the last `dimPx` CSS px of its way to its target. `open` = 1 is the plain field.
   */
  open = 1;
  speck = 0;
  airLvl = 0;
  dimPx = 20;
  /** Staggered release, seconds: particle i feels its spring from gate0 + gateSpan * u_i^2. */
  gate0 = 0.1;
  gateSpan = 0.8;
  private gateAt = -1;
  stats: Stats = { fps: 0, side: 0, drawn: 0, w: 0, h: 0, dpr: 1 };
  /** Called after every rendered frame with the raw ms since the previous one. */
  onFrame: ((raw: number, now: number) => void) | null = null;

  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private cfg: TierConfig;
  private simFmt: number;
  private progs: { sim: Prog; point: Prog; down: Prog; blur: Prog; comp: Prog } | null = null;
  private pending: Prog[] = [];
  private sim: Sim | null = null;
  private scr: Screen | null = null;
  private zero: WebGLTexture | null = null;
  private level: Level = { scale: 1, shift: 0 };
  private layout = { pointCss: 1.6, glyphs: 1, glyphArea: 1 };
  private palette = {
    mode: 0,
    ground: [0, 0, 0] as number[],
    ink: [0.3, 0.2, 0.05] as number[],
    hot: [0.9, 0.75, 0.4] as number[],
  };
  private VP = new Float32Array(16);
  private pulses = new Float32Array(16);
  private pulsesP = new Float32Array(16);
  private pulseIdx = 0;
  private mouse = { world: [0, 0, 0] as [number, number, number], on: 0 };
  private time = 0;
  private raf = 0;
  private running = false;
  private needResize = true;
  private ro: ResizeObserver | null = null;
  private cap: FrameCap;
  private hasTargets = false;
  // Paper ink (light theme only), tuned against filmstrips: landed-ink gain and its blur radius
  // (in point sizes, so small wordmarks stay crisp), airborne-dust gain and its coverage cap.
  /** A glyph particle prints as ink within this many CSS px of its target; farther, it is dust. */
  landPx = 3;
  inkK = 40;
  inkR = 1.24;
  airK = 5;
  airMax = 0.4;
  /** Frames rendered so far (the stage waits on this after a refit). */
  frames = 0;
  private framesLeft = -1;
  private onSettled: (() => void) | null = null;
  private frame = (now: number) => this.tick(now);

  constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, cfg: TierConfig) {
    this.gl = gl;
    this.canvas = canvas;
    this.cfg = cfg;
    this.side = cfg.side;
    this.N = cfg.side * cfg.side;
    this.cap = new FrameCap(cfg.fps);
    this.simFmt = gl.getExtension("EXT_color_buffer_float") ? gl.RGBA32F : gl.RGBA16F;
    if (this.simFmt === gl.RGBA16F) gl.getExtension("EXT_color_buffer_half_float");
    for (let i = 0; i < 4; i++) this.pulses[i * 4 + 3] = -100;
    this.ro = new ResizeObserver(() => {
      this.needResize = true;
    });
    this.ro.observe(canvas);
  }

  /* ---------- lifecycle ---------- */

  /**
   * Compile and link every program. With KHR_parallel_shader_compile the driver works off the
   * main thread and we poll between frames, so boot never becomes a long task.
   */
  async ready(): Promise<boolean> {
    const gl = this.gl;
    const par = gl.getExtension("KHR_parallel_shader_compile");
    const make = (vs: string, fs: string, samplers: string[]): Prog => {
      const p = gl.createProgram()!;
      for (const [type, src] of [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
      ] as const) {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      return { p, u: {}, samplers };
    };
    const progs = {
      sim: make(quadVS, simFS, ["uPos", "uVel", "uTarget"]),
      point: make(pointVS, pointFS, ["uPos", "uVel", "uCol", "uTarget"]),
      down: make(quadVS, downFS, ["uTex"]),
      blur: make(quadVS, blurFS, ["uTex"]),
      comp: make(quadVS, compFS, ["uScene", "uBloomA", "uBloomB"]),
    };
    this.pending = Object.values(progs);
    if (par) {
      const done = (pr: Prog) => gl.getProgramParameter(pr.p, par.COMPLETION_STATUS_KHR) as boolean;
      const t0 = performance.now();
      while (!this.pending.every(done)) {
        if (gl.isContextLost() || performance.now() - t0 > 8000) return false;
        await new Promise((r) => setTimeout(r, 16));
      }
    }
    if (gl.isContextLost()) return false;
    for (const pr of this.pending) {
      if (!gl.getProgramParameter(pr.p, gl.LINK_STATUS)) {
        if (process.env.NODE_ENV !== "production") console.warn("fx: link failed", gl.getProgramInfoLog(pr.p));
        return false;
      }
      const n = gl.getProgramParameter(pr.p, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(pr.p, i)!;
        pr.u[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(pr.p, info.name);
      }
      gl.useProgram(pr.p);
      pr.samplers.forEach((nm, i) => {
        if (pr.u[nm]) gl.uniform1i(pr.u[nm], i);
      });
    }
    this.pending = [];
    this.progs = progs;
    this.buildSim();
    this.zero = this.tex(1, 1, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.NEAREST);
    return true;
  }

  /** The frame cap in force (the stage drops it to 30 for the idle drift). */
  get fps(): number {
    return this.cap.fps;
  }

  setFps(fps: number): void {
    this.cap.fps = fps;
  }

  start(): void {
    if (this.running || !this.progs || !this.hasTargets) return;
    this.running = true;
    this.cap.reset();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Render `frames` frames, then stop and call `done` (reduced motion: settle, then still). */
  settle(frames: number, done?: () => void): void {
    this.framesLeft = frames;
    this.onSettled = done ?? null;
    this.start();
  }

  destroy(): void {
    this.stop();
    this.ro?.disconnect();
    const gl = this.gl;
    this.freeSim();
    this.freeScreen();
    if (this.zero) gl.deleteTexture(this.zero);
    if (this.progs) Object.values(this.progs).forEach((pr) => gl.deleteProgram(pr.p));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  /* ---------- inputs ---------- */

  setParams(pt: Partial<Params>, now = false): void {
    Object.assign(this.PT, pt);
    if (now) Object.assign(this.P, pt);
  }

  setPalette(p: Palette): void {
    const glow = lin(p.glow);
    this.palette = {
      mode: p.mode === "light" ? 1 : 0,
      ground: lin(p.ground),
      ink: lin(p.ink),
      // Champagne hot end for fast particles, derived from the glow gold.
      hot: [glow[0] * 0.4 + 0.6 * 0.95, glow[1] * 0.4 + 0.6 * 0.8, glow[2] * 0.4 + 0.6 * 0.45],
    };
  }

  /** Upload targets (positions in world units, role in w) and per-particle colour. */
  setTargets(t: Targets, pointCss: number): void {
    const gl = this.gl;
    const sim = this.sim;
    if (!sim) return;
    gl.bindTexture(gl.TEXTURE_2D, sim.target);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.simFmt, this.side, this.side, 0, gl.RGBA, gl.FLOAT, t.pos);
    gl.bindTexture(gl.TEXTURE_2D, sim.col);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, this.side, this.side, 0, gl.RGBA, gl.UNSIGNED_BYTE, t.col);
    this.layout = { pointCss, glyphs: Math.max(1, t.glyphs), glyphArea: Math.max(1, t.glyphArea) };
    this.hasTargets = true;
  }

  /** Start the staggered release now (the opening clock reads 0 on the next step). */
  beginGate(): void {
    this.gateAt = this.time;
  }

  /** Every particle free: the plain spring from here on. */
  endGate(): void {
    this.gateAt = -1;
  }

  /** Reset particle state (the opening scatter, or positions already at the target). */
  seed(b: Burst): void {
    const gl = this.gl;
    const sim = this.sim;
    if (!sim) return;
    sim.cur = 0;
    gl.bindTexture(gl.TEXTURE_2D, sim.pos[0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.simFmt, this.side, this.side, 0, gl.RGBA, gl.FLOAT, b.pos);
    gl.bindTexture(gl.TEXTURE_2D, sim.vel[0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.simFmt, this.side, this.side, 0, gl.RGBA, gl.FLOAT, b.vel);
    // The other buffer gets the same state so rows re-enabled by the governor do not jump.
    gl.bindTexture(gl.TEXTURE_2D, sim.pos[1]);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.simFmt, this.side, this.side, 0, gl.RGBA, gl.FLOAT, b.pos);
    gl.bindTexture(gl.TEXTURE_2D, sim.vel[1]);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.simFmt, this.side, this.side, 0, gl.RGBA, gl.FLOAT, b.vel);
  }

  setLevel(level: Level): void {
    const resize = level.scale !== this.level.scale;
    this.level = { ...level };
    if (resize) this.needResize = true;
  }

  /** Pointer in canvas-normalised coordinates (-1..1, y up). */
  pointer(nx: number, ny: number, on: boolean): void {
    this.mouse.world = this.toWorld(nx, ny);
    this.mouse.on = on ? 1 : 0;
  }

  pulse(nx: number, ny: number, strength = 14, speed = 9, width = 0.8): void {
    const w = this.toWorld(nx, ny);
    const i = this.pulseIdx++ % 4;
    this.pulses.set([w[0], w[1], w[2], this.time], i * 4);
    this.pulsesP.set([strength, speed, width, 0], i * 4);
  }

  /**
   * Render a single frame now, synchronously (theme change or refit while stopped). The canvas
   * size is checked here rather than waiting for the ResizeObserver, so a frame drawn in the same
   * task as a layout change is already at the new size.
   */
  redraw(): void {
    if (!this.progs || !this.hasTargets || this.running) return;
    const scr = this.scr;
    if (scr && (scr.cw !== Math.max(1, this.canvas.clientWidth) || scr.ch !== Math.max(1, this.canvas.clientHeight)))
      this.needResize = true;
    this.renderFrame(0);
  }

  /* ---------- GL helpers ---------- */

  private tex(
    w: number,
    h: number,
    ifmt: number,
    fmt: number,
    type: number,
    data: ArrayBufferView | null,
    filter: number,
  ): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
    return t;
  }

  private fbo(texs: WebGLTexture[]): WebGLFramebuffer {
    const gl = this.gl;
    const f = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    texs.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    gl.drawBuffers(texs.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f;
  }

  private bind(unit: number, t: WebGLTexture): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
  }

  private freeSim(): void {
    const gl = this.gl;
    if (!this.sim) return;
    [...this.sim.pos, ...this.sim.vel, this.sim.target, this.sim.col].forEach((t) => gl.deleteTexture(t));
    this.sim.fbo.forEach((f) => gl.deleteFramebuffer(f));
    this.sim = null;
  }

  private freeScreen(): void {
    const gl = this.gl;
    if (!this.scr) return;
    [this.scr.scene, ...this.scr.texA, ...this.scr.texB].forEach((t) => gl.deleteTexture(t));
    [this.scr.sceneFbo, ...this.scr.fboA, ...this.scr.fboB].forEach((f) => gl.deleteFramebuffer(f));
    this.scr = null;
  }

  private buildSim(): void {
    const gl = this.gl;
    const s = this.side;
    const pos = [0, 1].map(() => this.tex(s, s, this.simFmt, gl.RGBA, gl.FLOAT, null, gl.NEAREST));
    const vel = [0, 1].map(() => this.tex(s, s, this.simFmt, gl.RGBA, gl.FLOAT, null, gl.NEAREST));
    const target = this.tex(s, s, this.simFmt, gl.RGBA, gl.FLOAT, null, gl.NEAREST);
    const col = this.tex(s, s, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.NEAREST);
    const fbo = [0, 1].map((i) => this.fbo([pos[i], vel[i]]));
    this.sim = { pos, vel, target, col, fbo, cur: 0 };
    this.stats.side = s;
  }

  private buildScreen(): void {
    const gl = this.gl;
    const c = this.canvas;
    const cw = Math.max(1, c.clientWidth);
    const ch = Math.max(1, c.clientHeight);
    let dpr = Math.min(this.cfg.maxDpr, Math.max(1, window.devicePixelRatio || 1));
    dpr = Math.min(dpr, Math.sqrt(this.cfg.pxBudget / (cw * ch)));
    dpr = Math.max(0.5, dpr * this.level.scale);
    const w = Math.max(2, Math.round(cw * dpr));
    const h = Math.max(2, Math.round(ch * dpr));
    c.width = w;
    c.height = h;
    this.freeScreen();
    const qw = Math.max(1, w >> 2),
      qh = Math.max(1, h >> 2);
    const two = this.cfg.bloomLevels === 2;
    const ew = two ? Math.max(1, w >> 3) : 1,
      eh = two ? Math.max(1, h >> 3) : 1;
    const half = (W: number, H: number) => this.tex(W, H, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.LINEAR);
    const scene = half(w, h);
    const texA = [half(qw, qh), half(qw, qh)];
    const texB = [half(ew, eh), half(ew, eh)];
    this.scr = {
      w,
      h,
      dpr,
      cw,
      ch,
      qw,
      qh,
      ew,
      eh,
      scene,
      sceneFbo: this.fbo([scene]),
      texA,
      fboA: texA.map((t) => this.fbo([t])),
      texB,
      fboB: texB.map((t) => this.fbo([t])),
    };
    if (!two) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.scr.fboB[0]);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    this.camera(w / h);
    Object.assign(this.stats, { w, h, dpr });
  }

  /** Fixed planar camera on +z looking at the origin. */
  private camera(aspect: number): void {
    const f = 1 / TANH,
      near = 0.1,
      far = 200,
      nf = 1 / (near - far);
    // proj * view, with view = translate(0, 0, -DIST).
    const m = this.VP;
    m.fill(0);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) * nf;
    m[11] = -1;
    m[14] = 2 * far * near * nf - DIST * (far + near) * nf;
    m[15] = DIST;
  }

  private toWorld(nx: number, ny: number): [number, number, number] {
    const aspect = this.scr ? this.scr.w / this.scr.h : 1.6;
    return [nx * TANH * aspect * DIST, ny * TANH * DIST, 0];
  }

  /* ---------- frame ---------- */

  private tick(now: number): void {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const raw = this.cap.accept(now);
    if (raw < 0) return;
    const dt = raw <= 0 ? 1 / 60 : Math.min(0.05, Math.max(0.0005, raw / 1000));
    this.renderFrame(dt);
    this.onFrame?.(raw, now);
    if (this.framesLeft > 0 && --this.framesLeft === 0) {
      this.framesLeft = -1;
      this.stop();
      const cb = this.onSettled;
      this.onSettled = null;
      cb?.();
    }
  }

  private renderFrame(dt: number): void {
    if (this.needResize || !this.scr) {
      this.needResize = false;
      this.buildScreen();
    }
    const k = Math.min(1, dt * 2.2);
    const P = this.P,
      PT = this.PT;
    (Object.keys(PT) as (keyof Params)[]).forEach((key) => {
      P[key] += (PT[key] - P[key]) * k;
    });
    this.time += dt;
    if (dt > 0) this.step(dt);
    this.draw();
    this.frames++;
  }

  private rows(): number {
    return Math.max(1, this.side >> this.level.shift);
  }

  private step(dt: number): void {
    const gl = this.gl,
      sim = this.sim!,
      pr = this.progs!.sim,
      u = pr.u,
      P = this.P;
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fbo[1 - sim.cur]);
    gl.viewport(0, 0, this.side, this.rows());
    gl.useProgram(pr.p);
    this.bind(0, sim.pos[sim.cur]);
    this.bind(1, sim.vel[sim.cur]);
    this.bind(2, sim.target);
    gl.uniform1f(u.uDt, dt);
    gl.uniform1f(u.uTime, this.time);
    gl.uniform1f(u.uSpring, P.spring);
    gl.uniform1f(u.uDamp, P.damp);
    gl.uniform1f(u.uTurb, P.turb);
    gl.uniform1f(u.uTurbScale, P.tscale);
    gl.uniform1f(u.uTurbSpeed, P.tspeed);
    gl.uniform1f(u.uDrift, P.drift);
    gl.uniform1f(u.uDustSpring, P.dustSpring);
    gl.uniform1f(u.uDustTurb, P.dustTurb);
    gl.uniform1f(u.uGlyphPointer, P.glyphPointer);
    gl.uniform1f(u.uGate, this.gateAt < 0 ? -1 : this.time - this.gateAt);
    gl.uniform1f(u.uGate0, this.gate0);
    gl.uniform1f(u.uGateSpan, this.gateSpan);
    gl.uniform3fv(u.uMouse, this.mouse.world);
    gl.uniform1f(u.uMouseOn, this.mouse.on);
    gl.uniform1f(u.uMouseR, P.mouseR);
    gl.uniform1f(u.uMouseF, P.mouseF);
    gl.uniform4fv(u.uPulse, this.pulses);
    gl.uniform4fv(u.uPulseP, this.pulsesP);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    sim.cur = 1 - sim.cur;
  }

  private pass(
    prog: Prog,
    src: WebGLTexture,
    dst: WebGLFramebuffer,
    w: number,
    h: number,
    setU: (u: Prog["u"]) => void,
  ): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst);
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    this.bind(0, src);
    setU(prog.u);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private draw(): void {
    const gl = this.gl,
      sim = this.sim!,
      scr = this.scr!,
      pr = this.progs!;
    const drawn = this.side * this.rows();
    // Density normalisation: expected overlap of gaussian points on a glyph pixel.
    // On paper, gaps between points read as bare paper (sandpaper); larger points close them.
    const ps = Math.max(1, this.layout.pointCss * scr.dpr * (this.palette.mode ? 1.7 : 1));
    const glyphsDrawn = (this.layout.glyphs * drawn) / this.N;
    const overlap = (glyphsDrawn * 0.217 * ps * ps) / (this.layout.glyphArea * scr.dpr * scr.dpr);
    const intensity = this.P.gain / Math.max(overlap, 1e-3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, scr.sceneFbo);
    gl.viewport(0, 0, scr.w, scr.h);
    // Alpha carries airborne ink density on paper; it must start at zero there.
    gl.clearColor(0, 0, 0, this.palette.mode ? 0 : 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(pr.point.p);
    this.bind(0, sim.pos[sim.cur]);
    this.bind(1, sim.vel[sim.cur]);
    this.bind(2, sim.col);
    this.bind(3, sim.target);
    const u = pr.point.u;
    gl.uniformMatrix4fv(u.uVP, false, this.VP);
    gl.uniform1f(u.uSide, this.side);
    gl.uniform1f(u.uPointPx, ps);
    gl.uniform1f(u.uIntensity, intensity);
    gl.uniform3fv(u.uHot, this.palette.hot);
    gl.uniform1f(u.uLight, this.palette.mode);
    gl.uniform1f(u.uLand, this.landPx * worldPerPx(scr.ch));
    gl.uniform1f(u.uOpen, this.open);
    gl.uniform1f(u.uSpeck, this.speck);
    gl.uniform1f(u.uAirLvl, this.airLvl);
    gl.uniform1f(u.uDimR, this.dimPx * worldPerPx(scr.ch));
    gl.drawArrays(gl.POINTS, 0, drawn);
    gl.disable(gl.BLEND);

    this.pass(pr.down, scr.scene, scr.fboA[0], scr.qw, scr.qh, (uu) => {
      gl.uniform2f(uu.uTexel, 1 / scr.w, 1 / scr.h);
      gl.uniform1f(uu.uThresh, 0.32);
    });
    this.pass(pr.blur, scr.texA[0], scr.fboA[1], scr.qw, scr.qh, (uu) => gl.uniform2f(uu.uDir, 1.4 / scr.qw, 0));
    this.pass(pr.blur, scr.texA[1], scr.fboA[0], scr.qw, scr.qh, (uu) => gl.uniform2f(uu.uDir, 0, 1.4 / scr.qh));
    if (this.cfg.bloomLevels === 2) {
      this.pass(pr.down, scr.texA[0], scr.fboB[0], scr.ew, scr.eh, (uu) => {
        gl.uniform2f(uu.uTexel, 1 / scr.qw, 1 / scr.qh);
        gl.uniform1f(uu.uThresh, 0);
      });
      this.pass(pr.blur, scr.texB[0], scr.fboB[1], scr.ew, scr.eh, (uu) => gl.uniform2f(uu.uDir, 1.6 / scr.ew, 0));
      this.pass(pr.blur, scr.texB[1], scr.fboB[0], scr.ew, scr.eh, (uu) => gl.uniform2f(uu.uDir, 0, 1.6 / scr.eh));
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, scr.w, scr.h);
    gl.useProgram(pr.comp.p);
    this.bind(0, scr.scene);
    this.bind(1, scr.texA[0]);
    this.bind(2, this.cfg.bloomLevels === 2 ? scr.texB[0] : this.zero!);
    const cu = pr.comp.u;
    const pal = this.palette;
    gl.uniform2f(cu.uRes, scr.w, scr.h);
    gl.uniform1f(cu.uTime, this.time);
    gl.uniform1f(cu.uExposure, 1);
    gl.uniform1f(cu.uAber, this.cfg.aberration);
    gl.uniform1f(cu.uFade, this.fade);
    gl.uniform1f(cu.uBloomMix, pal.mode ? 0.35 : 0.6);
    gl.uniform1f(cu.uMode, pal.mode);
    gl.uniform1f(cu.uInkK, this.inkK);
    gl.uniform1f(cu.uInkR, Math.max(0.8, this.inkR * this.layout.pointCss) * scr.dpr);
    gl.uniform1f(cu.uAirK, this.airK);
    gl.uniform1f(cu.uAirMax, this.airMax);
    gl.uniform3fv(cu.uGround, pal.ground);
    gl.uniform3fv(cu.uInk, pal.ink);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.stats.drawn = drawn;
  }
}
