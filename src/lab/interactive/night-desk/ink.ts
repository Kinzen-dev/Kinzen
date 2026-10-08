import * as THREE from "three";

/*
 * The ink look, in two halves.
 *
 * 1. Every surface is an ordinary three.js Lambert or Phong material (so the lamp casts real
 *    shadows) with a patch: where the light falls off, screen-space hatching appears (single
 *    strokes in half shade, cross-hatching in deep shade), and the fragment writes its object id
 *    into alpha instead of opacity.
 * 2. One full-screen pass draws the lines: wherever the object id changes, the depth jumps
 *    (silhouette) or the depth's second difference spikes (a crease), it lays a cream ink line,
 *    warmed toward gold where the fill is lamp-lit. The sample positions wobble with a slow noise
 *    that re-seeds a few times a second, so the lines "boil" like hand-drawn animation.
 *    The same pass adds a cheap bloom from the colour mips, paper grain and a vignette.
 */

/** Uniforms every patched material shares (set once per frame by the engine). */
export const SHARED = {
  uDpr: { value: 1 },
  uHatch: { value: 1 },
};

const HATCH = /* glsl */ `
uniform float uId;
uniform float uDpr;
uniform float uHatch;
uniform float uHatchK;
float inkLine(vec2 p, float ang, float spacing, float w) {
  float d = (p.x * cos(ang) + p.y * sin(ang)) / spacing;
  d += 0.18 * sin(p.x * 0.043 + p.y * 0.027) + 0.1 * sin(p.y * 0.11);
  float f = abs(fract(d) - 0.5) * spacing;
  return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.9, f);
}
`;

const OUT = /* glsl */ `
  float lumW = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
  float irr = dot(outgoingLight, vec3(0.3, 0.55, 0.15)) / max(lumW, 0.04);
  vec2 hp = gl_FragCoord.xy / uDpr;
  float h1 = inkLine(hp, 0.82, 7.0, 0.75) * (1.0 - smoothstep(0.04, 0.16, irr));
  float h2 = inkLine(hp, -0.74, 9.0, 0.7) * (1.0 - smoothstep(0.008, 0.05, irr));
  float hatch = max(h1 * uHatchK, h2 * 0.8 * uHatchK * uHatchK) * uHatch;
  vec3 inkCol = outgoingLight + vec3(0.62, 0.58, 0.5) * 0.035 * hatch;
  gl_FragColor = vec4(inkCol, uId);
`;

export type InkOpts = { hatch?: number };

/** Patch a Lambert/Phong material: hatching in shade, object id in alpha. */
export function inkify<M extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: M, id: number, opts: InkOpts = {}): M {
  const uId = { value: id / 255 };
  m.userData.uId = uId;
  m.onBeforeCompile = (s) => {
    s.uniforms.uId = uId;
    s.uniforms.uDpr = SHARED.uDpr;
    s.uniforms.uHatch = SHARED.uHatch;
    s.uniforms.uHatchK = { value: opts.hatch ?? 1 };
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", `#include <common>\n${HATCH}`)
      .replace("#include <opaque_fragment>", OUT);
  };
  m.customProgramCacheKey = () => "ink-v1";
  return m;
}

/** An unlit surface (screens, glowing bulbs) that still writes its id. */
export function unlit(id: number, opts: { color?: THREE.ColorRepresentation; map?: THREE.Texture; gain?: number } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uId: { value: id / 255 },
      uColor: { value: new THREE.Color(opts.color ?? 0xffffff) },
      uMap: { value: opts.map ?? null },
      uHasMap: { value: opts.map ? 1 : 0 },
      uGain: { value: opts.gain ?? 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uId; uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap; uniform float uGain;
      varying vec2 vUv;
      void main() {
        vec3 c = uColor;
        if (uHasMap > 0.5) c *= texture2D(uMap, vUv).rgb;
        gl_FragColor = vec4(c * uGain, uId);
      }`,
  });
}

/*
 * The window glass: the skyline is looked up by view direction (an infinitely distant backdrop,
 * so it parallaxes correctly as the camera moves), rain runs on the glass in the glass's own
 * uv, and the time of day tints all of it.
 */
export function windowMaterial(id: number, city: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uId: { value: id / 255 },
      tCity: { value: city },
      uTime: { value: 0 },
      uDay: { value: 0 },
      uGlow: { value: 0 },
      uRain: { value: 0 },
      uFlash: { value: 0 },
      uTrain: { value: -1 },
      uPlane: { value: -1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld; varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uId; uniform sampler2D tCity; uniform float uTime, uDay, uGlow, uRain, uFlash, uTrain, uPlane;
      varying vec3 vWorld; varying vec2 vUv;
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

      // One rain column: streaks falling down the glass.
      float streaks(vec2 uv, float cols, float speed, float len, float seed) {
        float c = floor(uv.x * cols);
        float h = hash(vec2(c, seed));
        float x = fract(uv.x * cols) - 0.5;
        float y = fract(uv.y * (0.6 + h) + uTime * speed * (0.7 + h) + h * 7.0);
        float line = smoothstep(0.08, 0.0, abs(x + (h - 0.5) * 0.6)) * smoothstep(len, 0.0, y) * smoothstep(0.0, 0.02, y);
        return line * step(0.55, hash(vec2(c, seed + 3.1)));
      }

      void main() {
        vec3 dir = normalize(vWorld - cameraPosition);
        // Raindrops sitting on the glass bend the view a little.
        vec2 cell = floor(vUv * vec2(150.0, 100.0));
        vec2 f = fract(vUv * vec2(150.0, 100.0)) - 0.5;
        float hd = hash(cell);
        float dr = length(f + (hash(cell + 2.0) - 0.5) * 0.4) / (0.12 + 0.14 * hash(cell + 5.0));
        float drop = step(0.9, hd) * smoothstep(1.0, 0.7, dr) * uRain;
        float rim = step(0.9, hd) * smoothstep(0.55, 0.9, dr) * smoothstep(1.05, 0.9, dr) * uRain;
        // Composed to the window (river low, skyline across the middle, sky above); the far city
        // slides against the frame as the camera moves, which reads as depth.
        vec2 cuv = vec2(0.25 + vUv.x * 0.5 - cameraPosition.x * 0.07, 0.1 + vUv.y * 0.8 - (cameraPosition.y - 1.9) * 0.05)
          + f * drop * 0.02;

        // Sky: navy night with city haze at the horizon, cream day, gold at dusk and dawn.
        float hz = smoothstep(0.55, 0.0, cuv.y - 0.2);
        vec3 night = mix(vec3(0.010, 0.014, 0.034), vec3(0.11, 0.065, 0.03), hz * 0.85);
        vec3 day = mix(vec3(0.42, 0.50, 0.62), vec3(0.78, 0.76, 0.68), hz);
        vec3 dusk = mix(vec3(0.10, 0.08, 0.18), vec3(0.95, 0.48, 0.16), hz);
        vec3 sky = mix(night, day, uDay);
        sky = mix(sky, dusk, uGlow * 0.8);
        sky += vec3(0.25, 0.27, 0.34) * uFlash;

        // A plane's blinking light, high up.
        if (uPlane > -0.5) {
          vec2 pp = vec2(-0.2 + uPlane * 1.4, 0.86 + uPlane * 0.05);
          float blink = step(0.8, fract(uTime * 0.9));
          sky += vec3(1.0, 0.25, 0.2) * 3.0 * blink * smoothstep(0.004, 0.0, length((cuv - pp) * vec2(1.0, 0.5))) * (1.0 - uDay);
        }

        vec3 col = sky;
        // The river: the lower band mirrors the city with ripples.
        float river = 0.2;
        vec2 suv = cuv;
        float water = step(cuv.y, river);
        if (water > 0.5) {
          suv.y = river + (river - cuv.y) * 1.6;
          suv.x += sin(cuv.y * 380.0 + uTime * 1.6) * 0.0025;
        }
        vec4 cityS = texture2D(tCity, suv);
        // Buildings: dark ink shapes at night, soft slate in daylight, cream ink edges.
        vec2 px = vec2(1.0 / 2048.0, 1.0 / 512.0);
        float e = abs(texture2D(tCity, suv + vec2(px.x, 0.0)).r - cityS.r) + abs(texture2D(tCity, suv + vec2(0.0, px.y)).r - cityS.r);
        vec3 bNight = vec3(0.012, 0.016, 0.03);
        vec3 bDay = vec3(0.26, 0.29, 0.34);
        vec3 bld = mix(bNight, bDay, uDay);
        bld = mix(bld, vec3(0.16, 0.08, 0.06), uGlow * 0.5);
        col = mix(col, bld, cityS.r);
        col += vec3(0.86, 0.80, 0.66) * min(e, 1.0) * mix(0.18, 0.7, uDay);
        // Lit windows: on at night, each with its own flicker.
        float lit = cityS.g * (1.0 - uDay * 0.92);
        float flick = 0.75 + 0.25 * sin(uTime * (0.5 + cityS.b * 2.0) + cityS.b * 40.0);
        col += vec3(1.0, 0.68, 0.30) * lit * flick * 1.6;
        if (water > 0.5) {
          // Reflections break up into horizontal glints on the water.
          float rip = 0.55 + 0.45 * sin(cuv.y * 900.0 + sin(cuv.x * 60.0 + uTime * 0.8) * 3.0);
          col = mix(col * 0.5 * rip, mix(vec3(0.008, 0.012, 0.025), vec3(0.3, 0.36, 0.44), uDay), 0.45);
        }
        // The Skytrain: a chain of warm windows on the elevated line.
        if (uTrain > -0.5) {
          float tx = cuv.x - (-0.3 + uTrain * 1.6);
          float car = step(0.0, tx) * step(tx, 0.07) * step(0.3, fract(tx * 140.0));
          col += vec3(1.0, 0.8, 0.5) * 2.2 * car * smoothstep(0.004, 0.0, abs(cuv.y - 0.255)) * mix(1.0, 0.35, uDay);
        }

        // Rain: far rain over the city, then streaks and beads on the glass.
        float far = streaks(vec2(cuv.x + cuv.y * 0.12, cuv.y) * vec2(3.0, 1.0), 260.0, 1.1, 0.12, 1.0);
        col += vec3(0.55, 0.6, 0.7) * far * 0.22 * uRain;
        float glass = streaks(vUv, 90.0, 0.32, 0.35, 7.0) + streaks(vUv + 0.37, 140.0, 0.22, 0.2, 9.0) * 0.6;
        col += vec3(0.75, 0.78, 0.85) * glass * 0.34 * uRain;
        col += vec3(0.85, 0.85, 0.9) * rim * 0.14;
        gl_FragColor = vec4(col, uId);
      }`,
  });
}

/**
 * Coffee steam: two wisps drawn additively into the colour target. The alpha (object id) under
 * them is left untouched, so the line pass never outlines the steam itself.
 */
export function steamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 1 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uK; varying vec2 vUv;
      float wisp(float x, float y, float ph) {
        float c = 0.5 + sin(y * 9.0 - uTime * 1.6 + ph) * 0.16 * y + sin(y * 4.0 + uTime * 0.7 + ph) * 0.1 * y;
        float w = 0.02 + y * 0.05;
        return smoothstep(w, 0.0, abs(x - c)) * smoothstep(0.0, 0.15, y) * smoothstep(1.0, 0.45, y);
      }
      void main() {
        float s = wisp(vUv.x, vUv.y, 0.0) + wisp(vUv.x + 0.12, vUv.y, 2.3) * 0.7;
        gl_FragColor = vec4(vec3(0.95, 0.9, 0.8) * s * 0.16 * uK, 0.0);
      }`,
  });
}

/** The line pass: colour + depth in, inked frame out. */
export function inkPass() {
  return new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null },
      tDepth: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uScale: { value: 1 },
      uNear: { value: 0.05 },
      uFar: { value: 30 },
      uSeed: { value: 0 },
      uWobble: { value: 1 },
      uHover: { value: new THREE.Vector2(-1, -1) },
      uHoverK: { value: 0 },
      uInk: { value: new THREE.Color(0.94, 0.9, 0.82) },
      uGold: { value: new THREE.Color(1.0, 0.72, 0.3) },
      uBg: { value: new THREE.Color(0.012, 0.016, 0.035) },
      uExposure: { value: 1 },
      uBloom: { value: 1 },
      uLine: { value: 1 },
      uReveal: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor; uniform sampler2D tDepth;
      uniform vec2 uRes; uniform float uScale, uNear, uFar, uSeed, uWobble, uHoverK, uExposure, uBloom, uLine, uReveal;
      uniform vec2 uHover; uniform vec3 uInk, uGold, uBg;
      varying vec2 vUv;

      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      ivec2 clampPx(vec2 p) { return ivec2(clamp(p, vec2(0.0), uRes - 1.0)); }
      float idAt(vec2 p) { return texelFetch(tColor, clampPx(p), 0).a; }
      float zAt(vec2 p) {
        float d = texelFetch(tDepth, clampPx(p), 0).r;
        return (uNear * uFar) / (uFar - d * (uFar - uNear));
      }
      bool hov(float id) { return id * 255.0 > uHover.x - 0.5 && id * 255.0 < uHover.y + 0.5; }

      void main() {
        vec2 frag = gl_FragCoord.xy;
        // Hand wobble: a slow noise field nudges where the line is sampled, re-seeded a few times a second.
        vec2 q = frag / (uScale * 70.0);
        vec2 wob = (vec2(noise(q + uSeed * 13.7), noise(q + 41.0 + uSeed * 7.3)) - 0.5) * 2.6 * uScale * uWobble;
        vec2 c = floor(frag + wob) + 0.5;
        float o = max(1.0, floor(uScale * 0.95 + 0.25));

        float idc = idAt(c);
        float zc = zAt(c);
        float invc = 1.0 / zc;
        float lap = -4.0 * invc;
        float edge = 0.0;
        bool hovered = hov(idc);
        vec2 dirs[4] = vec2[4](vec2(o, 0.0), vec2(-o, 0.0), vec2(0.0, o), vec2(0.0, -o));
        for (int k = 0; k < 4; k++) {
          vec2 p = c + dirs[k];
          float idn = idAt(p);
          float zn = zAt(p);
          lap += 1.0 / zn;
          if (abs(idn - idc) > 0.5 / 255.0) {
            edge = 1.0;
            hovered = hovered || hov(idn);
          }
          edge = max(edge, smoothstep(0.012, 0.03, abs(zn - zc) / min(zn, zc)));
        }
        // Creases: on a flat face 1/z is affine in screen space, so its Laplacian is zero.
        float crease = smoothstep(0.002, 0.005, abs(lap) * zc / o);
        edge = max(edge, crease * 0.85);
        // Diagonals thicken corners a touch (closer to a pen than a 1px wire).
        vec2 diag[4] = vec2[4](vec2(o, o), vec2(-o, o), vec2(o, -o), vec2(-o, -o));
        for (int k = 0; k < 4; k++) {
          float idn = idAt(c + diag[k]);
          if (abs(idn - idc) > 0.5 / 255.0) edge = max(edge, 0.55);
        }
        // Dry-brush breaks: the pen skips now and then.
        edge *= mix(0.55, 1.0, smoothstep(0.25, 0.6, noise(frag / (uScale * 9.0) + uSeed)));

        vec3 fill = texture2D(tColor, vUv).rgb;
        if (idc == 0.0 && zc > uFar * 0.9) fill = uBg;
        // Bloom from the mips: the bulb, lit windows and the screen glow into the dark.
        // Bloom from the mips (luminance only, tinted lamp-gold): the bulb, lit windows, the screen.
        vec3 lw = vec3(0.3, 0.55, 0.15);
        float b1 = max(dot(textureLod(tColor, vUv, 3.0).rgb, lw) - 0.9, 0.0);
        float b2 = max(dot(textureLod(tColor, vUv, 5.0).rgb, lw) - 0.6, 0.0);
        float b3 = max(dot(textureLod(tColor, vUv, 6.5).rgb, lw) - 0.42, 0.0);
        fill += vec3(1.0, 0.72, 0.38) * (b1 * 0.45 + b2 * 0.6 + b3 * 0.7) * uBloom;
        fill *= uExposure;
        fill = fill / (1.0 + fill * 0.55);

        // Ink: cream in the dark, warming to gold where the lamp lights the fill.
        float warm = clamp((fill.r - fill.b) * 3.2, 0.0, 1.0);
        float lum = dot(fill, vec3(0.3, 0.55, 0.15));
        vec3 ink = mix(uInk * mix(0.5, 0.95, smoothstep(0.0, 0.25, lum)), uGold * 1.05, warm * 0.85);
        if (hovered) ink = mix(ink, uGold * 1.25, uHoverK);
        // Entry: the pen inks the lines first (a ragged sweep up the page), the fill washes in after.
        float rv = noise(frag / (uScale * 90.0)) * 0.55 + (1.0 - vUv.y) * 0.45;
        float lineOn = smoothstep(rv, rv + 0.06, uReveal * 1.3);
        fill = mix(uBg, fill, smoothstep(0.5, 1.0, uReveal));
        vec3 col = mix(fill, ink, edge * uLine * lineOn);

        // Paper grain and a soft vignette.
        col += (hash(frag + uSeed * 17.0) - 0.5) * 0.011;
        vec2 v = vUv - 0.5;
        col *= 1.0 - dot(v, v) * 0.55;
        gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
      }`,
  });
}
