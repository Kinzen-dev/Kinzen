// GLSL for the hero field. Ported from SIAN (src/components/fx/shaders.ts), itself lifted from
// laong-thong. Changes: the sim reads texels by gl_FragCoord so the governor can simulate a
// subset of rows; the target's w channel is a per-particle role (1 glyph, 0 dust) that
// attenuates pointer force and loosens the spring for dust; the composite has two grounds
// (emissive gold on the dark ground, ink-like gold on the light paper) and keeps the page
// ground exact (no vignette, grain only where there is dust) so the canvas has no visible edge.

export const quadVS = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const simFS = `#version 300 es
precision highp float;
uniform highp sampler2D uPos, uVel, uTarget;
uniform float uDt, uTime, uSpring, uDamp, uTurb, uTurbScale, uTurbSpeed, uDrift;
uniform float uDustSpring, uDustTurb, uGlyphPointer;
// Opening clock (s) and each particle's release window; uGate < 0 = every particle free.
uniform float uGate, uGate0, uGateSpan;
uniform vec3 uMouse;
uniform float uMouseOn, uMouseR, uMouseF;
uniform vec4 uPulse[4];
uniform vec4 uPulseP[4];
layout(location=0) out vec4 oPos;
layout(location=1) out vec4 oVel;
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v, out vec3 gradient){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  vec4 m2 = m * m;
  vec4 m4 = m2 * m2;
  vec4 pdotx = vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3));
  vec4 temp = m2 * m * pdotx;
  gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
  gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
  gradient *= 105.0;
  return 105.0 * dot(m4, pdotx);
}
vec3 curl(vec3 p){
  vec3 g1, g2, g3;
  snoise(p, g1);
  snoise(p + vec3(31.416, -47.853, 12.793), g2);
  snoise(p + vec3(-233.145, 15.632, 71.235), g3);
  return vec3(g3.y - g2.z, g1.z - g3.x, g2.x - g1.y);
}
void main(){
  ivec2 tc = ivec2(gl_FragCoord.xy);
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  vec4 T = texelFetch(uTarget, tc, 0);
  vec3 p = P.xyz;
  vec3 v = V.xyz;
  float seed = P.w;
  float role = T.w;
  // Staggered release: each particle feels its spring from its own moment in the opening (squared,
  // so most go early and the last few trail in), ramped over 0.3 s so none of them jerks.
  float gate = 1.0;
  if (uGate >= 0.0) {
    // Hashed from the texel, not the seed: a half-float sim texture would quantise the seed.
    float u = fract(sin(dot(vec2(tc), vec2(12.9898, 78.233))) * 43758.5453);
    float d = uGate0 + uGateSpan * u * u;
    gate = smoothstep(d, d + 0.3, uGate);
  }
  vec3 acc = (T.xyz - p) * uSpring * mix(uDustSpring, 1.0, role) * gate;
  acc += curl(p * uTurbScale + vec3(0.0, uTime * uTurbSpeed, 0.0)) * uTurb * mix(uDustTurb, 1.0, role);
  acc += vec3(0.0, uDrift * (0.4 + seed), 0.0);
  if (uMouseOn > 0.5) {
    vec3 d = p - uMouse;
    d.z *= 0.25;
    float r = length(d) + 1e-4;
    acc += (d / r) * uMouseF * smoothstep(uMouseR, 0.0, r) * mix(1.0, uGlyphPointer, role);
  }
  for (int i = 0; i < 4; i++) {
    float age = uTime - uPulse[i].w;
    if (age < 0.0 || age > 2.6) continue;
    vec3 d = p - uPulse[i].xyz;
    float r = length(d) + 1e-4;
    float shell = uPulseP[i].y * age;
    float w = uPulseP[i].z + age * 0.7;
    float f = exp(-(r - shell) * (r - shell) / (w * w)) * uPulseP[i].x * exp(-age * 1.5);
    acc += (d / r) * f;
  }
  v = (v + acc * uDt) * pow(uDamp, uDt * 60.0);
  float sp = length(v);
  if (sp > 70.0) { v *= 70.0 / sp; sp = 70.0; }
  p += v * uDt;
  oPos = vec4(p, seed);
  oVel = vec4(v, sp);
}`;

export const pointVS = `#version 300 es
precision highp float;
uniform highp sampler2D uPos, uVel, uCol, uTarget;
uniform mat4 uVP;
uniform float uSide, uPointPx, uIntensity, uLight, uLand, uOpen, uSpeck, uAirLvl, uDimR;
uniform vec3 uHot;
out vec3 vCol;
out float vAir;
void main(){
  int side = int(uSide);
  int id = gl_VertexID;
  ivec2 tc = ivec2(id % side, id / side);
  vec4 P = texelFetch(uPos, tc, 0);
  vec4 V = texelFetch(uVel, tc, 0);
  gl_Position = uVP * vec4(P.xyz, 1.0);
  gl_PointSize = uPointPx;
  vec3 col = texelFetch(uCol, tc, 0).rgb;
  col = mix(col, uHot, clamp(V.w * 0.05, 0.0, 0.5));
  vCol = col * uIntensity;
  vAir = 1.0;
  vec4 T = texelFetch(uTarget, tc, 0);
  // Opening: the name condenses out of nothing. In the air only a sparse share of the particles
  // shows (uSpeck, at uAirLvl): a thin even dust, never a cloud. Every particle lights up over the
  // last uDimR of its way in, so a letter brightens exactly as its density rises. uOpen -> 1 hands
  // back to the plain field (scroll-out dust, pointer stirs) once the word has formed.
  if (uOpen < 0.999) {
    float near = 1.0 - smoothstep(0.25 * uDimR, uDimR, length(P.xy - T.xy));
    float speck = step(fract(sin(dot(vec2(tc), vec2(39.3468, 11.1353))) * 24634.6345), uSpeck) * uAirLvl;
    vCol *= mix(max(near, speck), 1.0, uOpen);
  }
  // Paper only: ink prints where it lands. A glyph particle on (within uLand of) its letter
  // writes "landed" density (rgb); anything still in the air, and the dust halo, writes "airborne"
  // density (alpha), which the composite keeps translucent. The burst reads as gold dust in the
  // air, never a stain; the settled letters print as solid ink.
  if (uLight > 0.5) {
    float land = T.w * (1.0 - smoothstep(0.35 * uLand, uLand, length(P.xy - T.xy)));
    vAir = (1.0 - land) * dot(vCol, vec3(0.2126, 0.7152, 0.0722));
    vCol *= land;
  }
}`;

export const pointFS = `#version 300 es
precision highp float;
in vec3 vCol;
in float vAir;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;
  float g = exp(-r2 * 14.0);
  o = vec4(vCol * g, vAir * g);
}`;

export const downFS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThresh;
in vec2 vUv;
out vec4 o;
void main(){
  vec3 c = texture(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  o = vec4(max(c - uThresh, 0.0), 1.0);
}`;

export const blurFS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;
in vec2 vUv;
out vec4 o;
void main(){
  float w[5];
  w[0] = 0.2270270270; w[1] = 0.1945945946; w[2] = 0.1216216216; w[3] = 0.0540540541; w[4] = 0.0162162162;
  vec3 c = texture(uTex, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = uDir * float(i);
    c += texture(uTex, vUv + off).rgb * w[i];
    c += texture(uTex, vUv - off).rgb * w[i];
  }
  o = vec4(c, 1.0);
}`;

// Composite. Emission = scene (+ chromatic offset) + two bloom levels, faded at the canvas edge.
// Tone map: 30% per-channel ACES + 70% luminance ACES (hue-preserving, dense gold goes brighter
// gold, never white). Dark ground: screen the light onto --ground. Light ground: the same
// density darkens the paper toward the light-theme --gold (gold leaf read as ink), cores deepen.
// Grain only where there is light, so empty canvas == the page ground to the last bit.
export const compFS = `#version 300 es
precision highp float;
uniform sampler2D uScene, uBloomA, uBloomB;
uniform vec2 uRes;
uniform float uTime, uExposure, uAber, uFade, uBloomMix, uMode, uInkK, uInkR, uAirK, uAirMax;
uniform vec3 uGround, uInk;
in vec2 vUv;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  vec2 d = uv - 0.5;
  d.x *= uRes.x / uRes.y;
  float r2 = dot(d, d);
  vec2 off = (uv - 0.5) * uAber * r2;
  vec3 s;
  s.r = texture(uScene, uv + off).r;
  s.g = texture(uScene, uv).g;
  s.b = texture(uScene, uv - off).b;
  vec3 b = (texture(uBloomA, uv).rgb * 0.5 + texture(uBloomB, uv).rgb * 0.85) * uBloomMix;
  vec3 c = (s + b) * uExposure * uFade;
  float ex = min(uv.x, 1.0 - uv.x) * uRes.x, ey = min(uv.y, 1.0 - uv.y) * uRes.y;
  float fadeEdge = 0.08 * min(uRes.x, uRes.y);
  c *= smoothstep(0.0, fadeEdge, ex) * smoothstep(0.0, fadeEdge, ey);
  vec3 tc = aces(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float tl = aces(vec3(l)).x;
  vec3 hc = c * (tl / max(l, 1e-5));
  hc /= max(1.0, max(hc.r, max(hc.g, hc.b)));
  c = mix(tc, hc, 0.7);
  float a = clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
  vec3 dark = c + uGround * (1.0 - c);
  // Paper. Landed density (rgb) prints: a small tent blur (9 taps) closes the pinholes between
  // particles inside a stroke without stair steps, then an exponential-of-square curve makes
  // letter density solid ink while a lone speck stays soft. Airborne density (alpha) is dust in
  // the air: an exponential curve capped well below opaque, so the burst is a gold haze.
  float cov = 0.0;
  if (uMode > 0.5) {
    vec2 px = uInkR / uRes;
    vec4 m = vec4(0.0);
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
      float w = (2.0 - abs(float(i))) * (2.0 - abs(float(j)));
      m += w * texture(uScene, uv + vec2(float(i), float(j)) * px);
    }
    m *= uExposure * uFade / 16.0;
    float land = dot(m.rgb, vec3(0.2126, 0.7152, 0.0722)) * uInkK;
    float landCov = 1.0 - exp(-land * land);
    float air = texture(uScene, uv).a * uExposure * uFade;
    float airCov = uAirMax * (1.0 - exp(-air * uAirK));
    cov = 1.0 - (1.0 - landCov) * (1.0 - airCov);
  } else {
    cov = smoothstep(0.0, 1.0, a * 9.0);
  }
  // Subtractive, like ink on paper: partial coverage filters the paper toward the ink colour
  // (geometric blend) instead of greying it, so thin dust reads gold, not taupe.
  vec3 light = uGround * pow(max(uInk, vec3(1e-4)) / max(uGround, vec3(1e-4)), vec3(cov));
  light *= mix(1.0, 0.82, smoothstep(0.5, 1.0, a));
  vec3 outc = mix(dark, light, uMode);
  outc = pow(outc, vec3(1.0 / 2.2));
  outc += (hash(uv * uRes + fract(uTime * 0.37) * 131.0) - 0.5) * 0.03 * min(1.0, a * 4.0);
  o = vec4(outc, 1.0);
}`;
