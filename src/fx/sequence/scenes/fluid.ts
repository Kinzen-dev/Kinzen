import {
  QUAD_VS,
  breathe,
  clearTarget,
  freeTarget,
  programAsync,
  rawState,
  target,
  texture,
  type Target,
} from "../kit/gl";
import { wordmarkBitmap } from "../kit/glyphs";
import type { FrameCtx, Geom, Gpu, GpuScene, SceneId } from "../types";

/*
 * Scene 3, gold ink in water (lab #3). A compact Stable Fluids solver in the shape of
 * PavelDoGreat's WebGL-Fluid-Simulation (MIT; an independent rewrite): advect, vorticity
 * confinement, divergence, Jacobi pressure, gradient subtract. Velocity is in sim texels per second.
 * Two additions make the ink find its way home:
 *  - a gather flow: the gradient of a multi-scale blur of the letter mask, added to the dye's
 *    advection only (never projected, so it can concentrate ink the way a real flow cannot);
 *  - a refill: the dye relaxes toward the letter mask, slowly while the water is being stirred,
 *    faster once it is left alone.
 * The cursor stirs (velocity splats only, no new ink); a click is a ring of outward splats.
 * In the sequence: the ink arrives from the melting metal top down, with drips falling out of the
 * letters; leaving for the keycaps it settles crisp into the name and fades off a clear ground, so
 * the keys rising underneath take its place.
 */

const FRAG_HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
`;

const SPLAT = `${FRAG_HEAD}
uniform sampler2D uTarget;
uniform float uAspect, uRadius;
uniform vec2 uPoint;
uniform vec3 uColor;
void main(){
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  vec3 s = exp(-dot(p, p) / uRadius) * uColor;
  o = vec4(texture(uTarget, vUv).xyz + s, 1.0);
}`;

const ADVECT_VEL = `${FRAG_HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
uniform float uDt, uDiss;
void main(){
  vec2 c = vUv - uDt * texture(uVel, vUv).xy * uTexel;
  o = texture(uVel, c) / (1.0 + uDiss * uDt);
}`;

const ADVECT_DYE = `${FRAG_HEAD}
uniform sampler2D uVel, uDye, uMask, uGather;
uniform vec2 uTexel;
uniform float uDt, uGatherK, uRefill, uDecay, uWipe, uCap, uTopDown, uSlotTop, uSlotH;
void main(){
  vec2 flow = texture(uVel, vUv).xy * uTexel + texture(uGather, vUv).xy * uGatherK;
  vec2 c = vUv - uDt * flow;
  float d = texture(uDye, c).x;
  float m = texture(uMask, vUv).x;
  // The entry wipe lets the letters fill left to right, or top down through the letters (in step
  // with the melt line of the metal running into them).
  float s = uTopDown > 0.5 ? (uSlotTop - vUv.y) / uSlotH : vUv.x;
  float gate = smoothstep(uWipe - 0.08, uWipe, s);
  float t = m * (1.0 - gate);
  // Inside the letters the ink relaxes toward full; outside it thins away.
  d += (t - d) * uDt * mix(uDecay, uRefill, m);
  o = vec4(clamp(d, 0.0, uCap), 0.0, 0.0, 1.0);
}`;

const CURL = `${FRAG_HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main(){
  float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).y;
  float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY = `${FRAG_HEAD}
uniform sampler2D uVel, uCurl;
uniform vec2 uTexel;
uniform float uCurlK, uDt;
void main(){
  float L = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 1e-4;
  f *= uCurlK * C;
  f.y *= -1.0;
  vec2 v = texture(uVel, vUv).xy + f * uDt;
  o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`;

const DIVERGENCE = `${FRAG_HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main(){
  vec2 C = texture(uVel, vUv).xy;
  float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
  float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).y;
  // Solid walls: reflect at the border.
  if (vUv.x - uTexel.x < 0.0) L = -C.x;
  if (vUv.x + uTexel.x > 1.0) R = -C.x;
  if (vUv.y + uTexel.y > 1.0) T = -C.y;
  if (vUv.y - uTexel.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const SCALE = `${FRAG_HEAD}
uniform sampler2D uTex;
uniform float uK;
void main(){ o = texture(uTex, vUv) * uK; }`;

const PRESSURE = `${FRAG_HEAD}
uniform sampler2D uP, uDiv;
uniform vec2 uTexel;
void main(){
  float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
  float d = texture(uDiv, vUv).x;
  o = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = `${FRAG_HEAD}
uniform sampler2D uP, uVel;
uniform vec2 uTexel;
void main(){
  float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
  vec2 v = texture(uVel, vUv).xy - vec2(R - L, T - B);
  o = vec4(v, 0.0, 1.0);
}`;

const DISPLAY = `${FRAG_HEAD}
uniform sampler2D uDye, uVel;
uniform vec2 uTexel;
uniform vec3 uGround, uGold;
uniform float uTime, uOver, uFade, uMosaic;
uniform vec2 uCell;
void main(){
  // Settling into keys: the ink snaps to a grid of key-sized cells.
  vec2 uv = mix(vUv, (floor(vUv / uCell) + 0.5) * uCell, uMosaic);
  float d = texture(uDye, uv).x;
  float L = texture(uDye, uv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uDye, uv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uDye, uv + vec2(0.0, uTexel.y)).x;
  float B = texture(uDye, uv - vec2(0.0, uTexel.y)).x;
  // Ink as a thin liquid surface: its gradient is the normal, lit from the upper left.
  vec3 n = normalize(vec3(L - R, B - T, 0.16));
  vec3 l = normalize(vec3(-0.45, 0.6, 0.66));
  float diff = clamp(dot(n, l), 0.0, 1.0);
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(n, h), 0.0, 1.0), 40.0);
  // Dye optics: thin wisps are a faint amber veil, thick ink is lit gold.
  float a = 1.0 - exp(-pow(d, 1.4) * 3.0);
  vec3 body = mix(uGold * vec3(0.9, 0.7, 0.4), uGold * 0.94, smoothstep(0.15, 0.75, d));
  body *= 0.72 + 0.45 * diff;
  vec3 ink = body * a + vec3(1.0, 0.95, 0.82) * spec * a * 0.7;
  // A slow light sweep across the ink, like a lamp passing over the glass.
  float sweep = fract(uTime / 8.0) * 3.0 - 1.0;
  float band = exp(-pow((vUv.x + vUv.y * 0.35 - sweep) * 6.0, 2.0));
  ink += vec3(1.0, 0.92, 0.75) * band * a * 0.22;
  if (uOver > 0.5) {
    // Over another scene: the ink alone (premultiplied), the water clear.
    o = vec4(ink, a) * uFade;
    return;
  }
  // Lit dye over dark water: the ink adds light rather than greying the navy.
  vec3 col = uGround * (1.0 - a * 0.7) + ink;
  // A faint glint in moving water, so the ground is never dead.
  float sp = length(texture(uVel, vUv).xy);
  col += uGold * 0.035 * smoothstep(0.0, 300.0, sp) * (1.0 - a);
  o = vec4(col * uFade, uFade);
}`;

type Double = { read: Target; write: Target; swap: () => void };

const ramp = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const smooth = (x: number) => x * x * (3 - 2 * x);

export async function createFluid(gpu: Gpu, geom0: Geom): Promise<GpuScene> {
  const { gl } = gpu;
  const [splat0, advVel, advDye, curl0, vort, div, scale, pres0, grad, show] = await Promise.all(
    [SPLAT, ADVECT_VEL, ADVECT_DYE, CURL, VORTICITY, DIVERGENCE, SCALE, PRESSURE, GRADIENT, DISPLAY].map((fs) =>
      programAsync(gl, QUAD_VS, fs),
    ),
  );
  const P = { splat: splat0, advVel, advDye, curl: curl0, vort, div, scale, pres: pres0, grad, show };

  const vao = gl.createVertexArray();

  const rt = (w: number, h: number) =>
    target(gl, [texture(gl, w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR)], w, h);
  const dbl = (w: number, h: number): Double => {
    const d: Double = {
      read: rt(w, h),
      write: rt(w, h),
      swap: () => {
        [d.read, d.write] = [d.write, d.read];
      },
    };
    return d;
  };

  let geom = geom0;
  let simW = 0;
  let simH = 0;
  let dyeW = 0;
  let dyeH = 0;
  let vel: Double | null = null;
  let dye: Double | null = null;
  let pres: Double | null = null;
  let curl: Target | null = null;
  let divg: Target | null = null;
  let mask: WebGLTexture | null = null;
  let gather: WebGLTexture | null = null;

  const free = () => {
    for (const d of [vel, dye, pres]) {
      if (d) {
        freeTarget(gl, d.read);
        freeTarget(gl, d.write);
      }
    }
    freeTarget(gl, curl);
    freeTarget(gl, divg);
    gl.deleteTexture(mask);
    gl.deleteTexture(gather);
  };

  /** Mask and gather flow for a layout (CPU work, split into tasks), then the GPU targets. */
  let gen = 0;
  let built = false;
  const build = async (g: Geom) => {
    const my = ++gen;
    built = false;
    const cssW = g.cssW;
    const cssH = g.cssH;
    // Sim cells: one per 3 CSS px on a laptop, one per 6 on a phone (a quarter of the cells).
    // The dye stays 1:1 with CSS px so the letter edges hold.
    const simK = g.phone ? 1 / 6 : 1 / 3;
    const sW = Math.max(16, Math.round(cssW * simK));
    const sH = Math.max(16, Math.round(cssH * simK));
    const dW = Math.round(cssW);
    const dH = Math.round(cssH);

    // Letter mask at dye resolution (R8, y up), drawn from the baked wordmark into the slot.
    const s = g.slot;
    const bm = wordmarkBitmap();
    const src = document.createElement("canvas");
    src.width = bm.w;
    src.height = bm.h;
    const sctx = src.getContext("2d")!;
    const img = sctx.createImageData(bm.w, bm.h);
    for (let i = 0; i < bm.bits.length; i++) img.data[i * 4 + 3] = bm.bits[i] ? 255 : 0;
    sctx.putImageData(img, 0, 0);
    const paint = (w: number, h: number) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, (s.x / cssW) * w, (s.y / cssH) * h, (s.w / cssW) * w, (s.h / cssH) * h);
      const a = ctx.getImageData(0, 0, w, h).data;
      const out = new Float32Array(w * h);
      // Flip rows: texture row 0 is the bottom of the screen.
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[(h - 1 - y) * w + x] = a[(y * w + x) * 4 + 3] / 255;
      return out;
    };
    await breathe();
    if (my !== gen) return;
    const m = paint(dW, dH);
    const m8 = new Uint8Array(m.length);
    for (let i = 0; i < m.length; i++) m8[i] = Math.round(m[i] * 255);
    await breathe();
    if (my !== gen) return;

    // Gather flow at sim resolution: gradient of a multi-scale blur of the mask, in uv per second.
    const ms = paint(sW, sH);
    const pot = new Float32Array(ms.length);
    for (const [rad, wgt] of [
      [2, 0.45],
      [8, 0.35],
      [26, 0.2],
    ] as const) {
      const b = blur(ms, sW, sH, Math.max(1, Math.round(rad * (g.phone ? 0.5 : 1))));
      for (let i = 0; i < pot.length; i++) pot[i] += b[i] * wgt;
      await breathe();
      if (my !== gen) return;
    }
    const gr = new Float32Array(sW * sH * 4);
    for (let y = 1; y < sH - 1; y++) {
      for (let x = 1; x < sW - 1; x++) {
        const i = y * sW + x;
        const gx = (pot[i + 1] - pot[i - 1]) * 0.5;
        const gy = (pot[i + sW] - pot[i - sW]) * 0.5;
        const len = Math.hypot(gx, gy) + 1e-6;
        // Unit direction, faded where the slope vanishes (far away) and inside the letters.
        const k = Math.min(1, len * 400) * (1 - Math.min(1, ms[i] * 1.6));
        gr[i * 4] = (gx / len) * k;
        gr[i * 4 + 1] = (gy / len) * k;
      }
    }
    await breathe();
    if (my !== gen) return;

    rawState(gl);
    free();
    simW = sW;
    simH = sH;
    dyeW = dW;
    dyeH = dH;
    vel = dbl(simW, simH);
    dye = dbl(dyeW, dyeH);
    pres = dbl(simW, simH);
    curl = rt(simW, simH);
    divg = rt(simW, simH);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    mask = texture(gl, dyeW, dyeH, gl.R8, gl.RED, gl.UNSIGNED_BYTE, gl.LINEAR, m8);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gather = texture(gl, simW, simH, gl.RGBA16F, gl.RGBA, gl.FLOAT, gl.LINEAR, gr);
    wipe = 1.2;
    built = true;
  };
  /** A new layout keeps the old water on screen until the new one is built (a frame or two). */
  const layout = (g: Geom) => {
    geom = g;
    void build(g);
  };

  const blit = (t: Target | null) => {
    if (t) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, t.w, t.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, geom.pxW, geom.pxH);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  let unit = 0;
  const bind = (p: { prog: WebGLProgram }) => {
    gl.useProgram(p.prog);
    unit = 0;
  };
  const tex = (p: { u: Record<string, WebGLUniformLocation | null> }, name: string, t: WebGLTexture | null) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.uniform1i(p.u[name] ?? null, unit++);
  };

  const splat = (x: number, y: number, vx: number, vy: number, radius: number, ink = 0) => {
    if (!vel || !dye) return;
    const u = P.splat.u;
    const aspect = geom.cssW / geom.cssH;
    bind(P.splat);
    tex(P.splat, "uTarget", vel.read.tex[0]);
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform2f(u.uPoint, x / geom.cssW, 1 - y / geom.cssH);
    gl.uniform3f(u.uColor, vx, -vy, 0);
    gl.uniform1f(u.uRadius, radius);
    blit(vel.write);
    vel.swap();
    if (ink > 0) {
      bind(P.splat);
      tex(P.splat, "uTarget", dye.read.tex[0]);
      gl.uniform1f(u.uAspect, aspect);
      gl.uniform2f(u.uPoint, x / geom.cssW, 1 - y / geom.cssH);
      gl.uniform3f(u.uColor, ink, 0, 0);
      gl.uniform1f(u.uRadius, radius * 0.6);
      blit(dye.write);
      dye.swap();
    }
  };
  // CSS px/s to sim texels/s.
  const toSim = () => simW / geom.cssW;

  let lastStir = 0;
  let wipe = 1.2;
  let topDown = false;
  let nextAmbient = 0;
  let pours = 0;
  let drips = 0;
  let pending: [number, number] | null = null;

  geom = geom0;
  await build(geom0);

  const enter = (from: SceneId) => {
    for (const d of [vel, dye, pres]) {
      if (d) {
        clearTarget(gl, d.read);
        clearTarget(gl, d.write);
      }
    }
    wipe = 0;
    topDown = from === "gold3d";
    pours = 0;
    drips = 0;
    nextAmbient = 2.4;
    lastStir = 0;
  };

  const frame = ({ t, dt, role, ptr }: FrameCtx) => {
    if (!built || !vel || !dye || !pres || !curl || !divg) return;
    rawState(gl);
    gl.bindVertexArray(vao);
    const k = toSim();
    const s = geom.slot;
    const out = role.mode === "out" ? role.p : 0;
    const now = performance.now();
    if (pending) {
      burst(pending[0], pending[1]);
      pending = null;
    }

    // Entry. After the metal: the ink fills the letters top down exactly where the metal has
    // melted away (the same melt line, from the same hand-over progress), drips falling from that
    // line. Otherwise each letter is dropped in left to right with a swirl over about 2.6 s.
    if (topDown && role.mode === "in") {
      const melt = smooth(ramp(role.p, 0, 0.92));
      const frac = (1.05 * melt - 0.065) / 0.71;
      wipe = Math.max(wipe, frac + 0.06);
      while (drips < 40 && role.p > drips * 0.022 && frac > 0) {
        const x = s.x + s.w * (0.02 + 0.96 * Math.random());
        const y = s.y + s.h * Math.min(1, Math.max(0, frac));
        splat(x, y, (Math.random() - 0.5) * 80 * k, (260 + 280 * Math.random()) * k, 0.0007, 0.3);
        drips++;
      }
    } else {
      wipe = Math.min(1.2, wipe + dt / (topDown ? 1.2 : 3.2));
      while (!topDown && pours < 6 && t > pours * 0.32 + 0.1) {
        const cx = s.x + (s.w * (pours + 0.5)) / 6;
        splat(cx, s.y + s.h * 0.2, (Math.random() - 0.5) * 300 * k, 900 * k, 0.0022, 0.5);
        pours++;
      }
    }

    // Stir: velocity splats along the pointer's motion while it moves over the hero.
    const speed = Math.hypot(ptr.vx, ptr.vy);
    if (ptr.inside && speed > 30 && out < 0.5) {
      splat(ptr.x, ptr.y, ptr.vx * k * 1.6, ptr.vy * k * 1.6, geom.phone ? 0.0016 : 0.0009);
      lastStir = now;
    }
    // Ambient: a gentle current now and then so the water never stops (none while settling out).
    if (t > nextAmbient && out === 0) {
      nextAmbient = t + 1.4 + Math.random() * 1.6;
      const a = Math.random() * Math.PI * 2;
      splat(s.x + Math.random() * s.w, s.y + Math.random() * s.h, Math.cos(a) * 160 * k, Math.sin(a) * 160 * k, 0.003);
    }

    const texel = [1 / simW, 1 / simH];
    bind(P.curl);
    tex(P.curl, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.curl.u.uTexel, texel[0], texel[1]);
    blit(curl);

    bind(P.vort);
    tex(P.vort, "uVel", vel.read.tex[0]);
    tex(P.vort, "uCurl", curl.tex[0]);
    gl.uniform2f(P.vort.u.uTexel, texel[0], texel[1]);
    gl.uniform1f(P.vort.u.uCurlK, 12);
    gl.uniform1f(P.vort.u.uDt, dt);
    blit(vel.write);
    vel.swap();

    bind(P.div);
    tex(P.div, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.div.u.uTexel, texel[0], texel[1]);
    blit(divg);

    bind(P.scale);
    tex(P.scale, "uTex", pres.read.tex[0]);
    gl.uniform1f(P.scale.u.uK, 0.8);
    blit(pres.write);
    pres.swap();

    const iters = geom.phone ? 10 : 20;
    bind(P.pres);
    gl.uniform2f(P.pres.u.uTexel, texel[0], texel[1]);
    for (let i = 0; i < iters; i++) {
      unit = 0;
      tex(P.pres, "uDiv", divg.tex[0]);
      tex(P.pres, "uP", pres.read.tex[0]);
      blit(pres.write);
      pres.swap();
    }

    bind(P.grad);
    tex(P.grad, "uP", pres.read.tex[0]);
    tex(P.grad, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.grad.u.uTexel, texel[0], texel[1]);
    blit(vel.write);
    vel.swap();

    bind(P.advVel);
    tex(P.advVel, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.advVel.u.uTexel, texel[0], texel[1]);
    gl.uniform1f(P.advVel.u.uDt, dt);
    // Settling out: the water slows to a stop.
    gl.uniform1f(P.advVel.u.uDiss, 0.4 + 3 * out);
    blit(vel.write);
    vel.swap();

    // Calm water gathers the ink back: the pull and the refill grow after the last stir; settling
    // out pulls it fully home, crisp, before it fades.
    const calm = Math.max(Math.min(1, Math.max(0, (now - lastStir) / 1000 - 0.8) / 2.5), ramp(out, 0, 0.4));
    bind(P.advDye);
    tex(P.advDye, "uVel", vel.read.tex[0]);
    tex(P.advDye, "uDye", dye.read.tex[0]);
    tex(P.advDye, "uMask", mask);
    tex(P.advDye, "uGather", gather);
    gl.uniform2f(P.advDye.u.uTexel, texel[0], texel[1]);
    gl.uniform1f(P.advDye.u.uDt, dt);
    gl.uniform1f(P.advDye.u.uGatherK, (0.02 + 0.07 * calm + 0.1 * out) * (geom.phone ? 1.4 : 1));
    gl.uniform1f(P.advDye.u.uRefill, wipe < 1.1 ? 2.4 : 0.22 + 1.9 * calm + 3 * out);
    gl.uniform1f(P.advDye.u.uDecay, 0.85 + 0.6 * calm + 2 * out);
    gl.uniform1f(P.advDye.u.uWipe, wipe);
    gl.uniform1f(P.advDye.u.uTopDown, topDown ? 1 : 0);
    gl.uniform1f(P.advDye.u.uSlotTop, 1 - s.y / geom.cssH);
    gl.uniform1f(P.advDye.u.uSlotH, s.h / geom.cssH);
    gl.uniform1f(P.advDye.u.uCap, 1.15);
    blit(dye.write);
    dye.swap();

    bind(P.show);
    tex(P.show, "uDye", dye.read.tex[0]);
    tex(P.show, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.show.u.uTexel, 1 / dyeW, 1 / dyeH);
    const { gold, ground } = gpu.colors;
    gl.uniform3f(P.show.u.uGround, ground[0], ground[1], ground[2]);
    gl.uniform3f(P.show.u.uGold, gold[0], gold[1], gold[2]);
    gl.uniform1f(P.show.u.uTime, t);
    // Leaving, the fluid draws over the next scene: its water turns clear at once (the keys
    // start dark), its ink holds while it settles and then fades.
    gl.uniform1f(P.show.u.uOver, role.mode === "out" ? 1 : 0);
    gl.uniform1f(P.show.u.uFade, 1 - ramp(out, 0.35, 1));
    // Into the keys: cells of the keycap pitch (58 across the name on a laptop, 34 on a phone).
    const pitch = s.w / (geom.phone ? 34 : 58);
    gl.uniform2f(P.show.u.uCell, pitch / geom.cssW, pitch / geom.cssH);
    gl.uniform1f(P.show.u.uMosaic, role.mode === "out" && role.to === "keycaps" ? smooth(ramp(out, 0.05, 0.4)) : 0);
    if (role.mode === "out") {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
    blit(null);
    gl.disable(gl.BLEND);
  };

  const burst = (x: number, y: number) => {
    const k = toSim();
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = 1700 * k;
      // A ring of outward, slightly spinning splats: the ink flowers out and twists.
      splat(x + Math.cos(a) * 10, y + Math.sin(a) * 10, Math.cos(a + 0.5) * sp, Math.sin(a + 0.5) * sp, 0.0016);
    }
    lastStir = performance.now();
  };

  const dispose = () => {
    free();
    Object.values(P).forEach((p) => gl.deleteProgram(p.prog));
    gl.deleteVertexArray(vao);
  };

  // A tap lands between frames: queue it for the next frame (the GL state is the frame's then).
  return { id: "fluid", layout, enter, frame, tap: (x, y) => void (pending = [x, y]), dispose };
}

/** Three passes of a separable box blur (close to a Gaussian of sigma ~ r). */
function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const a = Float32Array.from(src);
  const b = new Float32Array(src.length);
  const pass = (from: Float32Array, to: Float32Array, horizontal: boolean) => {
    const n = horizontal ? w : h;
    const lines = horizontal ? h : w;
    for (let l = 0; l < lines; l++) {
      let acc = 0;
      const at = (i: number) => {
        const c = Math.min(n - 1, Math.max(0, i));
        return horizontal ? from[l * w + c] : from[c * w + l];
      };
      for (let i = -r; i <= r; i++) acc += at(i);
      for (let i = 0; i < n; i++) {
        const v = acc / (2 * r + 1);
        if (horizontal) to[l * w + i] = v;
        else to[i * w + l] = v;
        acc += at(i + r + 1) - at(i - r);
      }
    }
  };
  for (let k = 0; k < 3; k++) {
    pass(a, b, true);
    pass(b, a, false);
  }
  return a;
}
