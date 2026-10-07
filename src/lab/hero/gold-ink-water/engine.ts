import { QUAD_VS, program, texture, target, freeTarget, releaseContext, fitCanvas, type Target } from "../a-kit/gl";
import { wordmarkBitmap } from "../a-kit/glyphs";
import { readProfile, relRect, runLoop, sceneColors, trackPointer } from "../a-kit/loop";

/*
 * Gold dye in navy water. A compact Stable Fluids solver in the shape of PavelDoGreat's
 * WebGL-Fluid-Simulation (MIT; this is an independent rewrite): advect, vorticity confinement,
 * divergence, Jacobi pressure, gradient subtract. Velocity is in sim texels per second.
 * Two additions make the ink find its way home:
 *  - a gather flow: the gradient of a multi-scale blur of the letter mask, added to the dye's
 *    advection only (never projected, so it can concentrate ink the way a real flow cannot);
 *  - a refill: the dye relaxes toward the letter mask, slowly while the water is being stirred,
 *    faster once it is left alone.
 * The cursor stirs (velocity splats only, no new ink); a click is a ring of outward splats.
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
uniform float uDt, uGatherK, uRefill, uDecay, uWipe, uCap;
void main(){
  vec2 flow = texture(uVel, vUv).xy * uTexel + texture(uGather, vUv).xy * uGatherK;
  vec2 c = vUv - uDt * flow;
  float d = texture(uDye, c).x;
  float m = texture(uMask, vUv).x;
  // The intro wipe lets the letters fill left to right.
  float gate = smoothstep(uWipe - 0.08, uWipe, vUv.x);
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
uniform float uTime;
void main(){
  float d = texture(uDye, vUv).x;
  float L = texture(uDye, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uDye, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uDye, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uDye, vUv - vec2(0.0, uTexel.y)).x;
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
  // Lit dye over dark water: the ink adds light rather than greying the navy.
  vec3 col = uGround * (1.0 - a * 0.7) + body * a;
  col += vec3(1.0, 0.95, 0.82) * spec * a * 0.7;
  // A slow light sweep across the ink, like a lamp passing over the glass.
  float sweep = fract(uTime / 8.0) * 3.0 - 1.0;
  float band = exp(-pow((vUv.x + vUv.y * 0.35 - sweep) * 6.0, 2.0));
  col += vec3(1.0, 0.92, 0.75) * band * a * 0.22;
  // A faint glint in moving water, so the ground is never dead.
  float sp = length(texture(uVel, vUv).xy);
  col += uGold * 0.035 * smoothstep(0.0, 300.0, sp) * (1.0 - a);
  o = vec4(col, 1.0);
}`;

type Double = { read: Target; write: Target; swap: () => void };

export function startFluid(section: HTMLElement, host: HTMLElement, slot: HTMLElement): () => void {
  const prof = readProfile(2);
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false });
  if (!gl) {
    canvas.remove();
    return () => {};
  }
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_color_buffer_half_float");
  const { gold, ground } = sceneColors(section);

  const P = {
    splat: program(gl, QUAD_VS, SPLAT),
    advVel: program(gl, QUAD_VS, ADVECT_VEL),
    advDye: program(gl, QUAD_VS, ADVECT_DYE),
    curl: program(gl, QUAD_VS, CURL),
    vort: program(gl, QUAD_VS, VORTICITY),
    div: program(gl, QUAD_VS, DIVERGENCE),
    scale: program(gl, QUAD_VS, SCALE),
    pres: program(gl, QUAD_VS, PRESSURE),
    grad: program(gl, QUAD_VS, GRADIENT),
    show: program(gl, QUAD_VS, DISPLAY),
  };
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

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

  let simW = 0;
  let simH = 0;
  let dyeW = 0;
  let dyeH = 0;
  let cssW = 1;
  let cssH = 1;
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

  const layout = () => {
    const r = host.getBoundingClientRect();
    cssW = r.width;
    cssH = r.height;
    fitCanvas(canvas, cssW, cssH, prof.dpr, prof.phone ? 1_600_000 : 4_000_000);
    // Sim cells: one per 3 CSS px on a laptop, one per 6 on a phone (a quarter of the cells).
    // The dye stays 1:1 with CSS px so the letter edges hold.
    const simK = prof.phone ? 1 / 6 : 1 / 3;
    free();
    simW = Math.max(16, Math.round(cssW * simK));
    simH = Math.max(16, Math.round(cssH * simK));
    dyeW = Math.round(cssW);
    dyeH = Math.round(cssH);
    vel = dbl(simW, simH);
    dye = dbl(dyeW, dyeH);
    pres = dbl(simW, simH);
    curl = rt(simW, simH);
    divg = rt(simW, simH);

    // Letter mask at dye resolution (R8, y up), drawn from the baked wordmark into the slot.
    const s = relRect(slot, host);
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
    const m = paint(dyeW, dyeH);
    const m8 = new Uint8Array(m.length);
    for (let i = 0; i < m.length; i++) m8[i] = Math.round(m[i] * 255);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    mask = texture(gl, dyeW, dyeH, gl.R8, gl.RED, gl.UNSIGNED_BYTE, gl.LINEAR, m8);

    // Gather flow at sim resolution: gradient of a multi-scale blur of the mask, in uv per second.
    const ms = paint(simW, simH);
    const pot = new Float32Array(ms.length);
    for (const [rad, wgt] of [
      [2, 0.45],
      [8, 0.35],
      [26, 0.2],
    ] as const) {
      const b = blur(ms, simW, simH, Math.max(1, Math.round(rad * (prof.phone ? 0.5 : 1))));
      for (let i = 0; i < pot.length; i++) pot[i] += b[i] * wgt;
    }
    const g = new Float32Array(simW * simH * 4);
    for (let y = 1; y < simH - 1; y++) {
      for (let x = 1; x < simW - 1; x++) {
        const i = y * simW + x;
        const gx = (pot[i + 1] - pot[i - 1]) * 0.5;
        const gy = (pot[i + simW] - pot[i - simW]) * 0.5;
        const len = Math.hypot(gx, gy) + 1e-6;
        // Unit direction, faded where the slope vanishes (far away) and inside the letters.
        const k = Math.min(1, len * 400) * (1 - Math.min(1, ms[i] * 1.6));
        g[i * 4] = (gx / len) * k;
        g[i * 4 + 1] = (gy / len) * k;
      }
    }
    gather = texture(gl, simW, simH, gl.RGBA16F, gl.RGBA, gl.FLOAT, gl.LINEAR, g);
  };

  const blit = (t: Target | null) => {
    if (t) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, t.w, t.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  let unit = 0;
  const use = (p: { prog: WebGLProgram }) => {
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
    use(P.splat);
    tex(P.splat, "uTarget", vel.read.tex[0]);
    gl.uniform1f(u.uAspect, cssW / cssH);
    gl.uniform2f(u.uPoint, x / cssW, 1 - y / cssH);
    gl.uniform3f(u.uColor, vx, -vy, 0);
    gl.uniform1f(u.uRadius, radius);
    blit(vel.write);
    vel.swap();
    if (ink > 0) {
      use(P.splat);
      tex(P.splat, "uTarget", dye.read.tex[0]);
      gl.uniform1f(u.uAspect, cssW / cssH);
      gl.uniform2f(u.uPoint, x / cssW, 1 - y / cssH);
      gl.uniform3f(u.uColor, ink, 0, 0);
      gl.uniform1f(u.uRadius, radius * 0.6);
      blit(dye.write);
      dye.swap();
    }
  };
  // CSS px/s to sim texels/s.
  const toSim = () => simW / cssW;

  layout();
  const ro = new ResizeObserver(() => {
    layout();
    wipe = 1.2;
  });
  ro.observe(host);

  const burst = (x: number, y: number) => {
    const k = toSim();
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = 1700 * k;
      // A ring of outward, slightly spinning splats: the ink flowers out and twists.
      splat(x + Math.cos(a) * 10, y + Math.sin(a) * 10, Math.cos(a + 0.5) * s, Math.sin(a + 0.5) * s, 0.0016);
    }
    lastStir = performance.now();
  };
  const ptr = trackPointer(section, burst);

  let lastStir = 0;
  let t0 = -1;
  let wipe = 0;
  let nextAmbient = 0;
  let pours = 0;

  const step = (time: number, dt: number) => {
    if (!vel || !dye || !pres || !curl || !divg) return;
    if (t0 < 0) t0 = time;
    const t = time - t0;
    ptr.update(dt);
    const p = ptr.state;
    const k = toSim();

    // Intro: the name pours in left to right over 2.4 s, each letter dropped in with a swirl.
    wipe = Math.min(1.2, wipe + dt / 3.2);
    const s = relRect(slot, host);
    if (!prof.still && pours < 6 && t > pours * 0.32 + 0.1) {
      const cx = s.x + (s.w * (pours + 0.5)) / 6;
      splat(cx, s.y + s.h * 0.2, (Math.random() - 0.5) * 300 * k, 900 * k, 0.0022, 0.5);
      pours++;
    }

    // Stir: velocity splats along the pointer's motion while it moves over the banner.
    const speed = Math.hypot(p.vx, p.vy);
    if (p.inside && speed > 30) {
      const r = prof.phone ? 0.0016 : 0.0009;
      splat(p.x, p.y, p.vx * k * 1.6, p.vy * k * 1.6, r);
      lastStir = performance.now();
    }
    // Ambient: a gentle current now and then so the water never stops.
    if (!prof.still && t > nextAmbient) {
      nextAmbient = t + 1.4 + Math.random() * 1.6;
      const a = Math.random() * Math.PI * 2;
      splat(s.x + Math.random() * s.w, s.y + Math.random() * s.h, Math.cos(a) * 160 * k, Math.sin(a) * 160 * k, 0.003);
    }

    const texel = [1 / simW, 1 / simH];
    gl.disable(gl.BLEND);

    use(P.curl);
    tex(P.curl, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.curl.u.uTexel, texel[0], texel[1]);
    blit(curl);

    use(P.vort);
    tex(P.vort, "uVel", vel.read.tex[0]);
    tex(P.vort, "uCurl", curl.tex[0]);
    gl.uniform2f(P.vort.u.uTexel, texel[0], texel[1]);
    gl.uniform1f(P.vort.u.uCurlK, 12);
    gl.uniform1f(P.vort.u.uDt, dt);
    blit(vel.write);
    vel.swap();

    use(P.div);
    tex(P.div, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.div.u.uTexel, texel[0], texel[1]);
    blit(divg);

    use(P.scale);
    tex(P.scale, "uTex", pres.read.tex[0]);
    gl.uniform1f(P.scale.u.uK, 0.8);
    blit(pres.write);
    pres.swap();

    const iters = prof.phone ? 10 : 20;
    use(P.pres);
    gl.uniform2f(P.pres.u.uTexel, texel[0], texel[1]);
    for (let i = 0; i < iters; i++) {
      unit = 0;
      tex(P.pres, "uDiv", divg.tex[0]);
      tex(P.pres, "uP", pres.read.tex[0]);
      blit(pres.write);
      pres.swap();
    }

    use(P.grad);
    tex(P.grad, "uP", pres.read.tex[0]);
    tex(P.grad, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.grad.u.uTexel, texel[0], texel[1]);
    blit(vel.write);
    vel.swap();

    use(P.advVel);
    tex(P.advVel, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.advVel.u.uTexel, texel[0], texel[1]);
    gl.uniform1f(P.advVel.u.uDt, dt);
    gl.uniform1f(P.advVel.u.uDiss, 0.4);
    blit(vel.write);
    vel.swap();

    // Calm water gathers the ink back: the pull and the refill grow after the last stir.
    const calm = Math.min(1, Math.max(0, (performance.now() - lastStir) / 1000 - 0.8) / 2.5);
    use(P.advDye);
    tex(P.advDye, "uVel", vel.read.tex[0]);
    tex(P.advDye, "uDye", dye.read.tex[0]);
    tex(P.advDye, "uMask", mask);
    tex(P.advDye, "uGather", gather);
    gl.uniform2f(P.advDye.u.uTexel, texel[0], texel[1]);
    gl.uniform1f(P.advDye.u.uDt, dt);
    gl.uniform1f(P.advDye.u.uGatherK, (0.02 + 0.07 * calm) * (prof.phone ? 1.4 : 1));
    gl.uniform1f(P.advDye.u.uRefill, wipe < 1.1 ? 2.4 : 0.22 + 1.9 * calm);
    gl.uniform1f(P.advDye.u.uDecay, 0.85 + 0.6 * calm);
    gl.uniform1f(P.advDye.u.uWipe, wipe);
    gl.uniform1f(P.advDye.u.uCap, 1.15);
    blit(dye.write);
    dye.swap();

    use(P.show);
    tex(P.show, "uDye", dye.read.tex[0]);
    tex(P.show, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.show.u.uTexel, 1 / dyeW, 1 / dyeH);
    gl.uniform3f(P.show.u.uGround, ground[0], ground[1], ground[2]);
    gl.uniform3f(P.show.u.uGold, gold[0], gold[1], gold[2]);
    gl.uniform1f(P.show.u.uTime, t);
    blit(null);
  };

  let stopLoop = () => {};
  if (prof.still) {
    // Reduced motion: the settled ink name, drawn after a silent fill.
    wipe = 1.2;
    for (let i = 0; i < 90; i++) step(i / 60, 1 / 60);
  } else {
    stopLoop = runLoop(host, step);
  }

  return () => {
    stopLoop();
    ptr.stop();
    ro.disconnect();
    free();
    Object.values(P).forEach((p) => gl.deleteProgram(p.prog));
    gl.deleteVertexArray(vao);
    releaseContext(gl);
    canvas.remove();
  };
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
