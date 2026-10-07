import { NOISE_GLSL } from "../a-kit/noise.glsl";
import { QUAD_VS, program, texture, target, freeTarget, releaseContext, fitCanvas, type Target } from "../a-kit/gl";
import { inkIndex, thaiBitmap, wordmarkBitmap, type Bitmap } from "../a-kit/glyphs";
import { readProfile, relRect, runLoop, sceneColors, trackPointer } from "../a-kit/loop";
import { THAI_FIRST_NAME } from "../a-kit/copy";

/*
 * GPU particle wordmark. Positions and velocities live in float textures (one texel per
 * particle) and step in a fragment shader (MRT: position + velocity in one pass); a point pass
 * reads them back by gl_VertexID. Coordinates are CSS px from the stage centre, y down.
 * Forces: an underdamped spring to the current target (so everything overshoots and settles),
 * curl noise, the pointer (a repelling core, an attracting ring, a swirl and a drag along the
 * pointer's motion) and a click burst that kicks particles out and loosens the spring for two
 * seconds. Two target sets (KINZEN from the baked mask, the Thai first name from a canvas
 * render) are both sorted left to right, so particle i flies from the i-th leftmost point of one
 * word to the i-th of the other and the morph sweeps across as a wave.
 */

const SIM_FS = `#version 300 es
precision highp float;
uniform highp sampler2D uPos, uVel, uTA, uTB;
uniform float uDt, uTime, uMorph, uSpring, uDamp, uTurb, uFlux, uIntro;
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
  float k = uSpring * (0.75 + 0.5 * seed) * burstLoose * uIntro * uIntro;
  vec2 d = tgt - p.xy;
  vec2 f = d * k - v.xy * uDamp;

  // Living noise: a slow swirl, much stronger mid-flight so the morph pours like smoke.
  f += curl2(vec3(p.xy * 0.0042, uTime * 0.12 + seed * 0.3)) * (uTurb + flight * uFlux + (1.0 - uIntro) * uFlux * 1.6);

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

  // Burst: a radial kick on the click frame, then a decaying vortex while the spring is loose.
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
uniform float uSize, uGlow, uTime;
out float vHeat;
out float vBright;
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
  gl_Position = vec4(p.x / uHalf.x, -p.y / uHalf.y, 0.0, 1.0);
  gl_PointSize = uSize * (0.75 + 0.6 * p.z) * (uGlow > 0.5 ? 5.0 : 1.0) * (1.0 + vHeat * 0.4);
}`;

const DRAW_FS = `#version 300 es
precision highp float;
uniform vec3 uGold;
uniform float uGlow, uAlpha, uGlowA;
in float vHeat;
in float vBright;
out vec4 o;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float a = uGlow > 0.5 ? exp(-r2 * 4.0) * uGlowA : smoothstep(1.0, 0.25, r2);
  vec3 hot = mix(uGold, vec3(1.0, 0.96, 0.86), 0.55);
  vec3 col = mix(uGold * vBright, hot, vHeat * 0.8);
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

type Rect = { x: number; y: number; w: number; h: number };

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

/** Contain-fit a bitmap into the slot, centred, allowing Thai marks to overhang a little. */
function fitInto(bm: Bitmap, slot: Rect): Rect {
  const s = Math.min((slot.w * 0.94) / bm.w, (slot.h * 1.3) / bm.h);
  const w = bm.w * s;
  const h = bm.h * s;
  return { x: slot.x + (slot.w - w) / 2, y: slot.y + (slot.h - h) / 2, w, h };
}

export function startParticles(section: HTMLElement, host: HTMLElement, slot: HTMLElement): () => void {
  const prof = readProfile(2);
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) {
    canvas.remove();
    return () => {};
  }
  const f32 = !!gl.getExtension("EXT_color_buffer_float");
  if (!f32) gl.getExtension("EXT_color_buffer_half_float");
  const INTERNAL = f32 ? gl.RGBA32F : gl.RGBA16F;
  const TYPE = f32 ? gl.FLOAT : gl.HALF_FLOAT;

  // Density follows the slot: a phone's wordmark is ~14x smaller in area than a laptop's.
  const SIDE = prof.phone ? 100 : 256;
  const N = SIDE * SIDE;
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) seeds[i] = Math.random();

  const sim = program(gl, QUAD_VS, SIM_FS);
  const draw = program(gl, DRAW_VS, DRAW_FS);
  const init = program(gl, QUAD_VS, INIT_FS);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const make = () => [texture(gl, SIDE, SIDE, INTERNAL, gl.RGBA, TYPE, gl.NEAREST)];
  let A: Target = target(gl, [...make(), ...make()], SIDE, SIDE);
  let B: Target = target(gl, [...make(), ...make()], SIDE, SIDE);
  let texA: WebGLTexture | null = null;
  let texB: WebGLTexture | null = null;
  const toData = (a: Float32Array) => (f32 ? a : halfOf(a));

  const { gold } = sceneColors(section);
  let half: [number, number] = [1, 1];
  let thai: Bitmap | null = null;
  let disposed = false;

  const upload = (tex: WebGLTexture | null, data: Float32Array) => {
    const t = tex ?? texture(gl, SIDE, SIDE, INTERNAL, gl.RGBA, TYPE, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, INTERNAL, SIDE, SIDE, 0, gl.RGBA, TYPE, toData(data));
    return t;
  };

  let seeded = false;
  const layout = () => {
    const r = host.getBoundingClientRect();
    fitCanvas(canvas, r.width, r.height, prof.dpr, prof.phone ? 2_000_000 : 5_000_000);
    half = [r.width / 2, r.height / 2];
    const s = relRect(slot, host);
    const ta = targets(wordmarkBitmap(), s, N, half, seeds);
    texA = upload(texA, ta);
    if (thai) texB = upload(texB, targets(thai, fitInto(thai, s), N, half, seeds));
    else texB = upload(texB, ta);
    if (!seeded) {
      seeded = true;
      // Start as loose dust over the whole banner (or on the name, for the reduced-motion still).
      const p0 = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) {
        if (prof.still) {
          p0[i * 4] = ta[i * 4];
          p0[i * 4 + 1] = ta[i * 4 + 1];
        } else {
          p0[i * 4] = (Math.random() - 0.5) * r.width * 1.1;
          p0[i * 4 + 1] = (Math.random() - 0.5) * r.height * 1.1;
        }
        p0[i * 4 + 2] = seeds[i];
      }
      const tmp = upload(null, p0);
      gl.useProgram(init.prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.fbo);
      gl.viewport(0, 0, SIDE, SIDE);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tmp);
      gl.uniform1i(init.u.uSrc, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.deleteTexture(tmp);
    }
  };
  layout();
  void thaiBitmap(THAI_FIRST_NAME).then((bm) => {
    if (disposed) return;
    thai = bm;
    layout();
  });

  let t0 = -1;
  let morph = 0;
  let morphDir = 0;
  let phaseAt = 0;
  let burst: [number, number] = [0, 0];
  let burstAge = 99;
  let kick = 0;

  const ptr = trackPointer(section, (x, y) => {
    burst = [x - half[0], y - half[1] - (host.getBoundingClientRect().top - section.getBoundingClientRect().top)];
    burstAge = 0;
    kick = 1;
  });

  const step = (time: number, dt: number) => {
    if (t0 < 0) t0 = time;
    const t = time - t0;
    const intro = prof.still ? 1 : Math.min(1, t / 2.4);
    // Morph schedule: hold KINZEN 6.5 s, pour into the Thai name over 2.6 s, hold 4.5 s, back.
    if (!prof.still && thai) {
      if (morphDir === 0 && t - phaseAt > (morph < 0.5 ? 6.5 : 4.5)) {
        morphDir = morph < 0.5 ? 1 : -1;
        phaseAt = t;
      }
      if (morphDir !== 0) {
        morph = Math.min(1, Math.max(0, morph + (morphDir * dt) / 2.6));
        if (morph === 0 || morph === 1) {
          morphDir = 0;
          phaseAt = t;
        }
      }
    }
    ptr.update(dt);
    const p = ptr.state;
    const hostTop = host.getBoundingClientRect().top - section.getBoundingClientRect().top;

    gl.disable(gl.BLEND);
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
    gl.uniform1f(u.uSpring, 34);
    gl.uniform1f(u.uDamp, 5.2);
    gl.uniform1f(u.uTurb, 60);
    gl.uniform1f(u.uFlux, 1400);
    gl.uniform1f(u.uIntro, intro);
    gl.uniform2f(u.uPtr, p.x - half[0], p.y - hostTop - half[1]);
    gl.uniform2f(u.uPtrVel, p.vx, p.vy);
    gl.uniform1f(u.uPtrOn, p.on);
    gl.uniform1f(u.uPtrR, prof.phone ? 64 : 96);
    gl.uniform2f(u.uBurst, burst[0], burst[1]);
    gl.uniform1f(u.uBurstAge, burstAge);
    gl.uniform1f(u.uKick, kick);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    kick = 0;
    burstAge += dt;
    [A, B] = [B, A];

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
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
    gl.uniform3f(draw.u.uGold, gold[0], gold[1], gold[2]);
    gl.uniform1f(draw.u.uTime, t);
    const k = canvas.width / (half[0] * 2);
    const size = (prof.phone ? 1.5 : 1.7) * k;
    // Glow pass (wide, faint), then the crisp points.
    gl.uniform1f(draw.u.uGlow, 1);
    gl.uniform1f(draw.u.uSize, size);
    gl.uniform1f(draw.u.uAlpha, 1);
    gl.uniform1f(draw.u.uGlowA, prof.phone ? 0.035 : 0.05);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.uniform1f(draw.u.uGlow, 0);
    gl.uniform1f(draw.u.uAlpha, prof.phone ? 0.85 : 0.7);
    gl.drawArrays(gl.POINTS, 0, N);
  };

  const ro = new ResizeObserver(() => layout());
  ro.observe(host);

  let stopLoop = () => {};
  if (prof.still) {
    // Reduced motion: let the name settle off screen in a few silent steps, draw once.
    const still = () => {
      for (let i = 0; i < 4; i++) step(i / 60, 1 / 60);
    };
    still();
    void thaiBitmap(THAI_FIRST_NAME).then(() => !disposed && still());
  } else {
    stopLoop = runLoop(host, step);
  }

  return () => {
    disposed = true;
    stopLoop();
    ptr.stop();
    ro.disconnect();
    freeTarget(gl, A);
    freeTarget(gl, B);
    gl.deleteTexture(texA);
    gl.deleteTexture(texB);
    gl.deleteProgram(sim.prog);
    gl.deleteProgram(draw.prog);
    gl.deleteProgram(init.prog);
    gl.deleteVertexArray(vao);
    releaseContext(gl);
    canvas.remove();
  };
}

/** Float32 to half floats (only for GPUs without float32 render targets). */
function halfOf(src: Float32Array): Uint16Array {
  const out = new Uint16Array(src.length);
  const f = new Float32Array(1);
  const i = new Uint32Array(f.buffer);
  for (let n = 0; n < src.length; n++) {
    f[0] = src[n];
    const x = i[0];
    const sign = (x >> 16) & 0x8000;
    const e = ((x >> 23) & 0xff) - 127 + 15;
    const m = x & 0x7fffff;
    if (e <= 0) out[n] = sign;
    else if (e >= 31) out[n] = sign | 0x7c00;
    else out[n] = sign | (e << 10) | (m >> 13);
  }
  return out;
}
