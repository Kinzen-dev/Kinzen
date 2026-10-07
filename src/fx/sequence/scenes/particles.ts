import { NOISE_GLSL } from "../kit/noise.glsl";
import { QUAD_VS, breathe, freeTarget, halfOf, programAsync, rawState, target, texture, type Target } from "../kit/gl";
import { inkIndex, textBitmap, wordmarkBitmap, type Bitmap } from "../kit/glyphs";
import type { FrameCtx, Geom, Gpu, GpuScene, Rect, SceneId } from "../types";

/*
 * Scene 1, gold dust (lab #1, particles-alive). Positions and velocities live in float textures
 * (one texel per particle) and step in a fragment shader (MRT: position + velocity in one pass);
 * a point pass reads them back by gl_VertexID. Coordinates are CSS px from the stage centre, y down.
 * Forces: an underdamped spring to the current target (so everything overshoots and settles),
 * curl noise, the pointer (a repelling core, an attracting ring, a swirl and a drag along the
 * pointer's motion) and a click burst that kicks particles out and loosens the spring.
 * In the sequence: the dust is born on the ink of the desk drawing (cream, the drawing's colour),
 * bursts, turns gold in flight and condenses into KINZEN; mid-scene it pours into the Thai first
 * name and back (both target sets sorted left to right, so the morph sweeps across as a wave);
 * leaving for the metal letters it pulls tight, flares and fades as they condense in its place.
 */

const SIM_FS = `#version 300 es
precision highp float;
uniform highp sampler2D uPos, uVel, uTA, uTB;
uniform float uDt, uTime, uMorph, uSpring, uDamp, uTurb, uFlux, uIntro, uIntroFlux, uWave;
uniform vec2 uPtr, uPtrVel;
uniform float uPtrOn, uPtrR;
uniform vec2 uBurst;
uniform float uBurstAge, uKick;
layout(location=0) out vec4 oPos;
layout(location=1) out vec4 oVel;
${NOISE_GLSL}
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 p = texelFetch(uPos, c, 0);
  vec4 v = texelFetch(uVel, c, 0);
  vec4 a = texelFetch(uTA, c, 0);
  vec4 b = texelFetch(uTB, c, 0);
  // Staggered morph: each particle leaves on its own beat (a.w = left-to-right order + jitter).
  float m = clamp(uMorph * 1.7 - a.w * 0.7, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  float flight = 4.0 * m * (1.0 - m);
  vec2 tgt = mix(a.xy, b.xy, m);

  float seed = p.z;
  float burstLoose = uBurstAge < 4.0 ? mix(0.05, 1.0, smoothstep(0.35, 2.2, uBurstAge)) : 1.0;
  // Particles are released toward the name on their own beat during the intro: seed-staggered, or
  // (uWave) in a wave from left to right, the order the targets are sorted in.
  float beat = mix(seed, a.w, uWave);
  float rel = clamp(uIntro * 1.6 - beat * 0.6, 0.0, 1.0);
  float k = uSpring * (0.75 + 0.5 * seed) * burstLoose * rel * rel;
  vec2 d = tgt - p.xy;
  vec2 f = d * k - v.xy * uDamp;

  // Living noise: a slow swirl, much stronger mid-flight so the morph pours like smoke.
  f += curl2(vec3(p.xy * 0.0042, uTime * 0.12 + seed * 0.3)) * (uTurb + flight * uFlux + (1.0 - rel) * uIntroFlux);

  // Pointer.
  vec2 r = p.xy - uPtr;
  float dist = length(r) + 1e-3;
  vec2 dir = r / dist;
  float core = smoothstep(uPtrR, 0.0, dist);
  float ring = smoothstep(uPtrR * 2.8, uPtrR * 1.1, dist) * (1.0 - core);
  f += dir * core * core * 14000.0 * uPtrOn;
  f -= dir * ring * 1400.0 * uPtrOn;
  f += vec2(-dir.y, dir.x) * (core + ring * 0.5) * 2600.0 * uPtrOn;
  f += uPtrVel * core * 5.0 * uPtrOn;

  // Burst: a radial kick on the burst frame, then a decaying vortex while the spring is loose.
  if (uBurstAge < 4.0) {
    vec2 rb = p.xy - uBurst;
    float db = length(rb) + 1.0;
    vec2 nb = rb / db;
    float reach = exp(-db / 520.0);
    v.xy += (nb * (700.0 + 900.0 * seed) + vec2(-nb.y, nb.x) * 900.0) * reach * uKick;
    f += vec2(-nb.y, nb.x) * 2400.0 * reach * exp(-uBurstAge * 1.4);
  }

  v.xy += f * uDt;
  p.xy += v.xy * uDt;
  oPos = p;
  oVel = vec4(v.xy, flight, 0.0);
}`;

const DRAW_VS = `#version 300 es
precision highp float;
uniform highp sampler2D uPos, uVel;
uniform int uSide;
uniform vec2 uHalf;
uniform float uSize, uGlow, uTime, uInkMix;
out float vHeat;
out float vBright;
out float vInk;
void main(){
  ivec2 c = ivec2(gl_VertexID % uSide, gl_VertexID / uSide);
  vec4 p = texelFetch(uPos, c, 0);
  vec4 v = texelFetch(uVel, c, 0);
  float speed = length(v.xy);
  vHeat = clamp(speed / 900.0, 0.0, 1.0);
  // Twinkle per particle, plus a slow light sweep travelling across the name.
  float tw = 0.8 + 0.35 * sin(uTime * (1.5 + 2.5 * fract(p.z * 13.7)) + p.z * 40.0);
  float sweep = fract(uTime / 7.0) * 3.2 - 1.1;
  float bx = (p.x / uHalf.x) * 0.5 + 0.5 + p.y / uHalf.y * 0.25;
  float band = exp(-pow((bx - sweep) * 5.0, 2.0));
  vBright = (0.5 + 0.55 * fract(p.z * 7.13)) * tw + band * 0.9 + v.z * 0.4;
  // Born as ink: each particle turns gold on its own beat as the burst carries it away.
  vInk = clamp(uInkMix * 1.5 - fract(p.z * 3.17) * 0.5, 0.0, 1.0);
  gl_Position = vec4(p.x / uHalf.x, -p.y / uHalf.y, 0.0, 1.0);
  gl_PointSize = uSize * (0.75 + 0.6 * p.z) * (uGlow > 0.5 ? 5.0 : 1.0) * (1.0 + vHeat * 0.4);
}`;

const DRAW_FS = `#version 300 es
precision highp float;
uniform vec3 uGold, uInk;
uniform float uGlow, uAlpha, uGlowA, uBoost;
in float vHeat;
in float vBright;
in float vInk;
out vec4 o;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float a = uGlow > 0.5 ? exp(-r2 * 4.0) * uGlowA * (1.0 - vInk) : smoothstep(1.0, 0.25, r2);
  vec3 hot = mix(uGold, vec3(1.0, 0.96, 0.86), 0.55);
  vec3 col = mix(uGold * vBright, hot, vHeat * 0.8);
  col = mix(col, uInk * 0.9, vInk);
  col *= 1.0 + uBoost;
  a *= uAlpha;
  o = vec4(col * a, a);
}`;

const INIT_FS = `#version 300 es
precision highp float;
uniform highp sampler2D uSrc;
layout(location=0) out vec4 oPos;
layout(location=1) out vec4 oVel;
void main(){
  oPos = texelFetch(uSrc, ivec2(gl_FragCoord.xy), 0);
  oVel = vec4(0.0);
}`;

/** The Thai first name the wordmark pours into mid-scene (display art; the h1 carries the full name). */
const THAI_FIRST_NAME = "กฤติพงษ์";

/** Scene clock (s): the name forms 0 to 2.6, pours into Thai 4.0 to 6.2, back 7.4 to 9.6. */
const MORPH = { toA: 4.0, toB: 6.2, backA: 7.4, backB: 9.6 };
const INTRO = 2.6;
/** From the desk: how long the dust holds the drawing's shape before it streams (s). */
const HOLD = 0.35;

/** n target points over the bitmap's ink placed in `rect`, sorted left to right. */
function targets(bm: Bitmap, rect: Rect, n: number, half: [number, number], seeds: Float32Array): Float32Array {
  const { ink, edge } = inkIndex(bm);
  const pts = new Float32Array(n * 4);
  const keys = new Float32Array(n);
  const order = new Uint32Array(n);
  const tmp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const useEdge = Math.random() < 0.24 && edge.length > 0;
    const src = useEdge ? edge : ink;
    const idx = src[(Math.random() * src.length) | 0];
    const px = (idx % bm.w) + Math.random();
    const py = Math.floor(idx / bm.w) + Math.random();
    const x = rect.x + (px / bm.w) * rect.w - half[0];
    const y = rect.y + (py / bm.h) * rect.h - half[1];
    tmp[i * 3] = x;
    tmp[i * 3 + 1] = y;
    tmp[i * 3 + 2] = useEdge ? 1 : 0;
    keys[i] = x + y * 0.15 + (Math.random() - 0.5) * 18;
    order[i] = i;
  }
  order.sort((a, b) => keys[a] - keys[b]);
  for (let j = 0; j < n; j++) {
    const i = order[j];
    pts[j * 4] = tmp[i * 3];
    pts[j * 4 + 1] = tmp[i * 3 + 1];
    pts[j * 4 + 2] = tmp[i * 3 + 2];
    pts[j * 4 + 3] = (j / n) * 0.85 + seeds[j] * 0.15;
  }
  return pts;
}

/**
 * Target sets outlive a scene instance: the dust is rebuilt every round of the loop, on the same
 * layout, and sorting 65k targets is the costliest step of its setup. Keyed by bitmap, box, count.
 */
const memo = new Map<string, Float32Array>();
const seedsFor = new Map<number, Float32Array>();
function targetsOnce(name: string, bm: Bitmap, rect: Rect, n: number, half: [number, number], seeds: Float32Array) {
  const key = [name, n, rect.x, rect.y, rect.w, rect.h, half[0], half[1]]
    .map((v) => (typeof v === "number" ? v.toFixed(1) : v))
    .join("|");
  let t = memo.get(key);
  if (!t) {
    t = targets(bm, rect, n, half, seeds);
    if (memo.size > 4) memo.clear();
    memo.set(key, t);
  }
  return t;
}

/** Contain-fit a bitmap into the slot, centred, allowing Thai marks to overhang a little. */
function fitInto(bm: Bitmap, slot: Rect): Rect {
  const s = Math.min((slot.w * 0.94) / bm.w, (slot.h * 1.3) / bm.h);
  const w = bm.w * s;
  const h = bm.h * s;
  return { x: slot.x + (slot.w - w) / 2, y: slot.y + (slot.h - h) / 2, w, h };
}

const ramp = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (x: number) => x * x * (3 - 2 * x);

export async function createParticles(gpu: Gpu, geom0: Geom): Promise<GpuScene> {
  const { gl, float32 } = gpu;
  const INTERNAL = float32 ? gl.RGBA32F : gl.RGBA16F;
  const TYPE = float32 ? gl.FLOAT : gl.HALF_FLOAT;
  const toData = (a: Float32Array) => (float32 ? a : halfOf(a));

  // Density follows the slot: a phone's wordmark is ~14x smaller in area than a laptop's.
  const SIDE = geom0.phone ? 100 : 256;
  const N = SIDE * SIDE;
  let seeds = seedsFor.get(N);
  if (!seeds) {
    seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) seeds[i] = Math.random();
    seedsFor.set(N, seeds);
  }

  const [sim, draw, init] = await Promise.all([
    programAsync(gl, QUAD_VS, SIM_FS),
    programAsync(gl, DRAW_VS, DRAW_FS),
    programAsync(gl, QUAD_VS, INIT_FS),
  ]);
  const vao = gl.createVertexArray();

  const make = () => texture(gl, SIDE, SIDE, INTERNAL, gl.RGBA, TYPE, gl.NEAREST);
  let A: Target = target(gl, [make(), make()], SIDE, SIDE);
  let B: Target = target(gl, [make(), make()], SIDE, SIDE);
  let texA: WebGLTexture | null = null;
  let texB: WebGLTexture | null = null;
  let thai: Bitmap | null = null;
  let geom = geom0;
  let half: [number, number] = [1, 1];
  let ta: Float32Array = new Float32Array(0);
  let disposed = false;

  const upload = (tex: WebGLTexture | null, data: Float32Array) => {
    const t = tex ?? make();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, INTERNAL, SIDE, SIDE, 0, gl.RGBA, TYPE, toData(data));
    return t;
  };

  const layout = (g: Geom) => {
    geom = g;
    half = [g.cssW / 2, g.cssH / 2];
    rawState(gl);
    ta = targetsOnce("kinzen", wordmarkBitmap(), g.slot, N, half, seeds);
    texA = upload(texA, ta);
    texB = upload(texB, thai ? targetsOnce("thai", thai, fitInto(thai, g.slot), N, half, seeds) : ta);
  };
  layout(geom0);
  await breathe();

  const family = getComputedStyle(document.querySelector("[data-hero] h1") ?? document.body).fontFamily;
  void textBitmap(THAI_FIRST_NAME, family).then(async (bm) => {
    await breathe();
    if (disposed) return;
    thai = bm;
    rawState(gl);
    texB = upload(texB, targetsOnce("thai", thai, fitInto(thai, geom.slot), N, half, seeds));
  });

  /** Positions (x, y in CSS px from the stage centre) as the start state, still. */
  const place = (pos: Float32Array) => {
    rawState(gl);
    const tmp = upload(null, pos);
    gl.useProgram(init.prog);
    gl.bindVertexArray(vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, A.fbo);
    gl.viewport(0, 0, SIDE, SIDE);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tmp);
    gl.uniform1i(init.u.uSrc, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.deleteTexture(tmp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  let burst: [number, number] = [0, 0];
  let burstAge = 99;
  let kick = 0;
  let fromDesk = false;

  let primed: { p0: Float32Array; burst: [number, number] } | null = null;
  /** The start state for an entry from the desk, computed ahead (off the hand-over frame). */
  const prime = (seed: Float32Array) => {
    if (seed.length < 2) return;
    const p0 = new Float32Array(N * 4);
    // Born on the ink of the drawing: every particle on a sampled ink point, still. Sorted left
    // to right like the targets, so the drawing streams into the name in order: its left edge
    // becomes the K, its right edge the N, and nothing crosses the whole stage.
    const m = seed.length >> 1;
    const xs = new Float32Array(N);
    const ys = new Float32Array(N);
    const order = new Uint32Array(N);
    const keys = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const j = (Math.random() * m) | 0;
      xs[i] = seed[j * 2] - half[0] + (Math.random() - 0.5) * 1.2;
      ys[i] = seed[j * 2 + 1] - half[1] + (Math.random() - 0.5) * 1.2;
      keys[i] = xs[i] + ys[i] * 0.15;
      order[i] = i;
    }
    order.sort((a, b) => keys[a] - keys[b]);
    let cx = 0;
    let cy = 0;
    for (let j = 0; j < N; j++) {
      const i = order[j];
      p0[j * 4] = xs[i];
      p0[j * 4 + 1] = ys[i];
      p0[j * 4 + 2] = seeds[j];
      cx += xs[i];
      cy += ys[i];
    }
    primed = { p0, burst: [cx / N, cy / N + 60] };
  };

  const enter = (from: SceneId) => {
    fromDesk = from === "desk" && !!primed;
    if (fromDesk && primed) {
      place(primed.p0);
      // A light burst from just under the drawing's centre of ink lifts the dust off the paper. Its
      // clock starts late, so the spring is barely loosened: the dust streams to the name at once.
      burst = primed.burst;
      burstAge = 1.8;
      kick = 0.12;
      primed = null;
      return;
    }
    // From anywhere else: loose dust over the whole stage, condensing.
    const p0 = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      p0[i * 4] = (Math.random() - 0.5) * geom.cssW * 1.1;
      p0[i * 4 + 1] = (Math.random() - 0.5) * geom.cssH * 1.1;
      p0[i * 4 + 2] = seeds[i];
    }
    burstAge = 99;
    place(p0);
  };

  const frame = ({ t, dt, role, ptr }: FrameCtx) => {
    // From the desk the dust first holds the drawing for a beat (the strokes flash to gold dust in
    // place), then streams into the name.
    const hold = fromDesk ? HOLD : 0;
    const intro = Math.min(1, Math.max(0, t - hold) / INTRO);
    const morph = thai ? smooth(ramp(t, MORPH.toA, MORPH.toB)) - smooth(ramp(t, MORPH.backA, MORPH.backB)) : 0;
    const out = role.mode === "out" ? role.p : 0;
    const inkMix = fromDesk ? 1 - smooth(ramp(t, 0.1, 1.9)) : 0;
    // The flash of the strokes turning to dust.
    const flash = fromDesk ? Math.sin(Math.PI * ramp(t, 0, 0.7)) * 0.9 : 0;

    rawState(gl);
    gl.bindVertexArray(vao);
    gl.useProgram(sim.prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.fbo);
    gl.viewport(0, 0, SIDE, SIDE);
    const bind = (unit: number, tex: WebGLTexture | null, name: string) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(sim.u[name] ?? null, unit);
    };
    bind(0, A.tex[0], "uPos");
    bind(1, A.tex[1], "uVel");
    bind(2, texA, "uTA");
    bind(3, texB, "uTB");
    const u = sim.u;
    gl.uniform1f(u.uDt, dt);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uMorph, morph);
    // Leaving: the dust pulls tight onto the letters as the metal condenses there.
    gl.uniform1f(u.uSpring, 34 * (1 + 2.5 * out));
    gl.uniform1f(u.uDamp, 5.2 + 4 * out);
    gl.uniform1f(u.uTurb, 60 * (1 - out));
    gl.uniform1f(u.uFlux, 1400 * (1 - out));
    gl.uniform1f(u.uIntro, intro);
    gl.uniform1f(u.uIntroFlux, fromDesk ? 260 * smooth(ramp(t, hold, hold + 0.6)) : 1680);
    gl.uniform1f(u.uWave, fromDesk ? 1 : 0);
    gl.uniform2f(u.uPtr, ptr.x - half[0], ptr.y - half[1]);
    gl.uniform2f(u.uPtrVel, ptr.vx, ptr.vy);
    gl.uniform1f(u.uPtrOn, ptr.on * (1 - out));
    gl.uniform1f(u.uPtrR, geom.phone ? 64 : 96);
    gl.uniform2f(u.uBurst, burst[0], burst[1]);
    gl.uniform1f(u.uBurstAge, burstAge);
    gl.uniform1f(u.uKick, kick);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    kick = 0;
    burstAge += dt;
    [A, B] = [B, A];

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, geom.pxW, geom.pxH);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(draw.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, A.tex[0]);
    gl.uniform1i(draw.u.uPos, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, A.tex[1]);
    gl.uniform1i(draw.u.uVel, 1);
    gl.uniform1i(draw.u.uSide, SIDE);
    gl.uniform2f(draw.u.uHalf, half[0], half[1]);
    const { gold, ink } = gpu.colors;
    gl.uniform3f(draw.u.uGold, gold[0], gold[1], gold[2]);
    gl.uniform3f(draw.u.uInk, ink[0], ink[1], ink[2]);
    gl.uniform1f(draw.u.uTime, t);
    gl.uniform1f(draw.u.uInkMix, inkMix);
    // Leaving: a flare as the dust packs in, then it fades under the metal.
    gl.uniform1f(draw.u.uBoost, Math.sin(Math.PI * Math.min(1, out * 1.6)) * 0.7 + flash);
    // Ink-born dust sits far denser than the name's (the drawing's ink is a fifth of its area):
    // finer and fainter points, so it reads as the drawing's line, not a blown-out glow.
    const size = (geom.phone ? 1.5 : 1.7) * geom.k * (1 - 0.3 * inkMix);
    const alpha = 1 - smooth(ramp(out, 0.3, 0.95));
    // Glow pass (wide, faint), then the crisp points.
    gl.uniform1f(draw.u.uGlow, 1);
    gl.uniform1f(draw.u.uSize, size);
    gl.uniform1f(draw.u.uAlpha, alpha);
    gl.uniform1f(draw.u.uGlowA, geom.phone ? 0.035 : 0.05);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.uniform1f(draw.u.uGlow, 0);
    const crisp = geom.phone ? 0.85 : 0.7;
    gl.uniform1f(draw.u.uAlpha, alpha * (crisp + (0.2 - crisp) * inkMix));
    gl.drawArrays(gl.POINTS, 0, N);
    gl.disable(gl.BLEND);
  };

  const tap = (x: number, y: number) => {
    burst = [x - half[0], y - half[1]];
    burstAge = 0;
    kick = 1;
  };

  const dispose = () => {
    disposed = true;
    freeTarget(gl, A);
    freeTarget(gl, B);
    gl.deleteTexture(texA);
    gl.deleteTexture(texB);
    gl.deleteProgram(sim.prog);
    gl.deleteProgram(draw.prog);
    gl.deleteProgram(init.prog);
    gl.deleteVertexArray(vao);
  };

  return { id: "particles", layout, enter, prime, frame, tap, dispose };
}
