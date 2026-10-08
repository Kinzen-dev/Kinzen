import * as THREE from "three";

/*
 * Gold ink on the water band: the lab hero's Stable Fluids (src/lab/hero/gold-ink-water, itself an
 * independent rewrite after PavelDoGreat's WebGL-Fluid-Simulation, MIT) moved onto three.js render
 * targets so it shares the scene's context and the water shader can read the dye as a texture.
 * Domain coordinates are the water plane's uv (x right, y away from the camera).
 * Two non-physical terms run on the dye only (never projected), so ink can be herded:
 *  - gathers: up to 6 points the ink drifts toward (a letter calling its gold back);
 *  - absorbs: up to 6 points where the ink drains away (the letter drinking it as it rises).
 */

const VS = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const HEAD = `precision highp float;
varying vec2 vUv;
`;

const SPLAT = `${HEAD}
uniform sampler2D uTarget;
uniform float uAspect, uRadius;
uniform vec2 uPoint;
uniform vec3 uColor;
void main(){
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  vec3 s = exp(-dot(p, p) / uRadius) * uColor;
  gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.0);
}`;

const ADVECT_VEL = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
uniform float uDt, uDiss;
void main(){
  vec2 c = vUv - uDt * texture2D(uVel, vUv).xy * uTexel;
  gl_FragColor = texture2D(uVel, c) / (1.0 + uDiss * uDt);
}`;

const ADVECT_DYE = `${HEAD}
uniform sampler2D uVel, uDye;
uniform vec2 uTexel;
uniform float uDt, uDecay, uAspect;
uniform vec4 uGather[6];
uniform vec4 uAbsorb[6];
void main(){
  vec2 flow = texture2D(uVel, vUv).xy * uTexel;
  for (int i = 0; i < 6; i++) {
    vec4 g = uGather[i];
    if (g.z <= 0.0) continue;
    vec2 d = g.xy - vUv;
    vec2 da = vec2(d.x * uAspect, d.y);
    float dist = length(da);
    // A soft basin: strong pull from far, easing to rest at the point (no overshoot).
    float k = g.z * smoothstep(0.0, 0.05, dist) * (0.35 + 0.65 * exp(-dist / g.w));
    flow += normalize(d + 1e-6) * k;
  }
  vec2 c = vUv - uDt * flow;
  float d = texture2D(uDye, c).x;
  float drain = uDecay;
  for (int i = 0; i < 6; i++) {
    vec4 a = uAbsorb[i];
    if (a.z <= 0.0) continue;
    vec2 p = vUv - a.xy;
    p.x *= uAspect;
    drain += a.z * exp(-dot(p, p) / (a.w * a.w));
  }
  d *= exp(-drain * uDt);
  // The band's edges are a soft shore: ink fades out before it can pile up on the border.
  vec2 e = min(vUv, 1.0 - vUv);
  d *= mix(0.96, 1.0, smoothstep(0.0, 0.04, min(e.x, e.y)));
  gl_FragColor = vec4(clamp(d, 0.0, 2.0), 0.0, 0.0, 1.0);
}`;

const CURL = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main(){
  float L = texture2D(uVel, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture2D(uVel, vUv + vec2(uTexel.x, 0.0)).y;
  float T = texture2D(uVel, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture2D(uVel, vUv - vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY = `${HEAD}
uniform sampler2D uVel, uCurl;
uniform vec2 uTexel;
uniform float uCurlK, uDt;
void main(){
  float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 1e-4;
  f *= uCurlK * C;
  f.y *= -1.0;
  vec2 v = texture2D(uVel, vUv).xy + f * uDt;
  gl_FragColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`;

const DIVERGENCE = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main(){
  vec2 C = texture2D(uVel, vUv).xy;
  float L = texture2D(uVel, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uVel, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture2D(uVel, vUv + vec2(0.0, uTexel.y)).y;
  float B = texture2D(uVel, vUv - vec2(0.0, uTexel.y)).y;
  if (vUv.x - uTexel.x < 0.0) L = -C.x;
  if (vUv.x + uTexel.x > 1.0) R = -C.x;
  if (vUv.y + uTexel.y > 1.0) T = -C.y;
  if (vUv.y - uTexel.y < 0.0) B = -C.y;
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const SCALE = `${HEAD}
uniform sampler2D uTex;
uniform float uK;
void main(){ gl_FragColor = texture2D(uTex, vUv) * uK; }`;

const PRESSURE = `${HEAD}
uniform sampler2D uP, uDiv;
uniform vec2 uTexel;
void main(){
  float L = texture2D(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture2D(uP, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture2D(uP, vUv - vec2(0.0, uTexel.y)).x;
  float d = texture2D(uDiv, vUv).x;
  gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = `${HEAD}
uniform sampler2D uP, uVel;
uniform vec2 uTexel;
void main(){
  float L = texture2D(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture2D(uP, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture2D(uP, vUv - vec2(0.0, uTexel.y)).x;
  vec2 v = texture2D(uVel, vUv).xy - vec2(R - L, T - B);
  gl_FragColor = vec4(v, 0.0, 1.0);
}`;

type Double = { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget; swap: () => void };

export type Fluid = {
  dye: () => THREE.Texture;
  vel: () => THREE.Texture;
  /** Velocity (domain px/s at sim scale, via uv/s * sim size) and optional ink at uv. */
  splat: (u: number, v: number, vx: number, vy: number, radius: number, ink?: number) => void;
  gathers: THREE.Vector4[];
  absorbs: THREE.Vector4[];
  step: (dt: number) => void;
  setIterations: (n: number) => void;
  /** Ink fade per second (raised briefly to clear the water after a letter goes home). */
  setDecay: (k: number) => void;
  dispose: () => void;
};

export function createFluid(
  renderer: THREE.WebGLRenderer,
  simW: number,
  simH: number,
  dyeW: number,
  dyeH: number,
  iterations = 18,
): Fluid {
  const aspect = simW / simH;
  const rt = (w: number, h: number) =>
    new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    });
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
  const vel = dbl(simW, simH);
  const dye = dbl(dyeW, dyeH);
  const pres = dbl(simW, simH);
  const curl = rt(simW, simH);
  const divg = rt(simW, simH);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  scene.add(quad);

  const mat = (fs: string, uniforms: Record<string, THREE.IUniform>) =>
    new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const texel = new THREE.Vector2(1 / simW, 1 / simH);
  const gathers = Array.from({ length: 6 }, () => new THREE.Vector4());
  const absorbs = Array.from({ length: 6 }, () => new THREE.Vector4());
  const M = {
    splat: mat(SPLAT, {
      uTarget: { value: null },
      uAspect: { value: aspect },
      uRadius: { value: 0 },
      uPoint: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Vector3() },
    }),
    advVel: mat(ADVECT_VEL, {
      uVel: { value: null },
      uTexel: { value: texel },
      uDt: { value: 0 },
      uDiss: { value: 0.5 },
    }),
    advDye: mat(ADVECT_DYE, {
      uVel: { value: null },
      uDye: { value: null },
      uTexel: { value: texel },
      uDt: { value: 0 },
      uDecay: { value: 0.06 },
      uAspect: { value: aspect },
      uGather: { value: gathers },
      uAbsorb: { value: absorbs },
    }),
    curl: mat(CURL, { uVel: { value: null }, uTexel: { value: texel } }),
    vort: mat(VORTICITY, {
      uVel: { value: null },
      uCurl: { value: null },
      uTexel: { value: texel },
      uCurlK: { value: 24 },
      uDt: { value: 0 },
    }),
    div: mat(DIVERGENCE, { uVel: { value: null }, uTexel: { value: texel } }),
    scale: mat(SCALE, { uTex: { value: null }, uK: { value: 0.8 } }),
    pres: mat(PRESSURE, { uP: { value: null }, uDiv: { value: null }, uTexel: { value: texel } }),
    grad: mat(GRADIENT, { uP: { value: null }, uVel: { value: null }, uTexel: { value: texel } }),
  };

  const run = (m: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget) => {
    quad.material = m;
    renderer.setRenderTarget(to);
    renderer.render(scene, cam);
  };
  const withState = (fn: () => void) => {
    const prev = renderer.getRenderTarget();
    const auto = renderer.autoClear;
    const shadow = renderer.shadowMap.autoUpdate;
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;
    fn();
    renderer.setRenderTarget(prev);
    renderer.autoClear = auto;
    renderer.shadowMap.autoUpdate = shadow;
  };

  let iters = iterations;

  const splat: Fluid["splat"] = (u, v, vx, vy, radius, ink = 0) =>
    withState(() => {
      const U = M.splat.uniforms;
      U.uPoint.value.set(u, v);
      U.uRadius.value = radius;
      U.uTarget.value = vel.read.texture;
      U.uColor.value.set(vx, vy, 0);
      run(M.splat, vel.write);
      vel.swap();
      if (ink > 0) {
        U.uTarget.value = dye.read.texture;
        U.uColor.value.set(ink, 0, 0);
        U.uRadius.value = radius * 0.7;
        run(M.splat, dye.write);
        dye.swap();
      }
    });

  const step = (dt: number) =>
    withState(() => {
      M.curl.uniforms.uVel.value = vel.read.texture;
      run(M.curl, curl);

      M.vort.uniforms.uVel.value = vel.read.texture;
      M.vort.uniforms.uCurl.value = curl.texture;
      M.vort.uniforms.uDt.value = dt;
      run(M.vort, vel.write);
      vel.swap();

      M.div.uniforms.uVel.value = vel.read.texture;
      run(M.div, divg);

      M.scale.uniforms.uTex.value = pres.read.texture;
      run(M.scale, pres.write);
      pres.swap();

      M.pres.uniforms.uDiv.value = divg.texture;
      for (let i = 0; i < iters; i++) {
        M.pres.uniforms.uP.value = pres.read.texture;
        run(M.pres, pres.write);
        pres.swap();
      }

      M.grad.uniforms.uP.value = pres.read.texture;
      M.grad.uniforms.uVel.value = vel.read.texture;
      run(M.grad, vel.write);
      vel.swap();

      M.advVel.uniforms.uVel.value = vel.read.texture;
      M.advVel.uniforms.uDt.value = dt;
      run(M.advVel, vel.write);
      vel.swap();

      M.advDye.uniforms.uVel.value = vel.read.texture;
      M.advDye.uniforms.uDye.value = dye.read.texture;
      M.advDye.uniforms.uDt.value = dt;
      run(M.advDye, dye.write);
      dye.swap();
    });

  // Start from still, empty water (render targets are not guaranteed to be cleared).
  withState(() => {
    const c = renderer.getClearColor(new THREE.Color());
    const a = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const t of [vel.read, vel.write, dye.read, dye.write, pres.read, pres.write, curl, divg]) {
      renderer.setRenderTarget(t);
      renderer.clear(true, false, false);
    }
    renderer.setClearColor(c, a);
  });

  return {
    dye: () => dye.read.texture,
    vel: () => vel.read.texture,
    splat,
    gathers,
    absorbs,
    step,
    setIterations: (n) => {
      iters = n;
    },
    setDecay: (k) => {
      M.advDye.uniforms.uDecay.value = k;
    },
    dispose: () => {
      for (const d of [vel, dye, pres]) {
        d.read.dispose();
        d.write.dispose();
      }
      curl.dispose();
      divg.dispose();
      quad.geometry.dispose();
      Object.values(M).forEach((m) => m.dispose());
    },
  };
}
