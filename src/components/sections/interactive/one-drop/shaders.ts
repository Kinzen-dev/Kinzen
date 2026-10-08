import { NOISE_GLSL } from "../kit/noise-glsl";

/*
 * One drop: every sim texture is the water disc seen from straight above (uv 0..1 square, the
 * disc is |uv - 0.5| < 0.5). Velocity is in sim texels per second, like gold-ink-water.
 */

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
float disc(vec2 uv){ vec2 c = uv * 2.0 - 1.0; return dot(c, c); }
`;

/** Damped wave on a height field: R = height now, G = height one step ago. */
export const RIPPLE_STEP = `${HEAD}
uniform sampler2D uH;
uniform vec2 uTexel;
uniform float uDamp;
void main(){
  if (disc(vUv) > 0.985) { o = vec4(0.0); return; }
  vec2 h = texture(uH, vUv).xy;
  float s = texture(uH, vUv + vec2(uTexel.x, 0.0)).x + texture(uH, vUv - vec2(uTexel.x, 0.0)).x
          + texture(uH, vUv + vec2(0.0, uTexel.y)).x + texture(uH, vUv - vec2(0.0, uTexel.y)).x;
  float n = (s * 0.5 - h.y) * uDamp;
  o = vec4(n, h.x, 0.0, 1.0);
}`;

/** A smooth dent in the surface (an impact), added to the current height only. */
export const RIPPLE_SPLAT = `${HEAD}
uniform sampler2D uH;
uniform vec2 uPoint;
uniform float uRadius, uAmp;
void main(){
  vec4 h = texture(uH, vUv);
  vec2 p = vUv - uPoint;
  float r2 = dot(p, p) / (uRadius * uRadius);
  // A dent with a slight raised lip, so the first ring reads crisp.
  h.x += uAmp * (exp(-r2) - 0.35 * exp(-r2 * 0.3));
  o = h;
}`;

/**
 * Velocity splat: a swirl around the point (uSwirl) plus a directed shove (uDir). After the
 * pressure solve a directed shove becomes a vortex pair that travels and curls: the ink's tendrils.
 */
export const PUSH = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uPoint, uDir;
uniform float uRadius, uSwirl;
void main(){
  vec2 v = texture(uVel, vUv).xy;
  vec2 p = vUv - uPoint;
  float d = length(p);
  vec2 n = p / max(d, 1e-5);
  float f = exp(-d * d / (uRadius * uRadius));
  v += (vec2(-n.y, n.x) * uSwirl * smoothstep(0.0, uRadius * 0.35, d) + uDir) * f;
  o = vec4(v, 0.0, 1.0);
}`;

/** Ink into the dye (R = fresh, G = older drops). */
export const INK = `${HEAD}
uniform sampler2D uDye;
uniform vec2 uPoint;
uniform float uRadius;
uniform vec2 uAmount;
void main(){
  vec2 d = texture(uDye, vUv).xy;
  vec2 p = vUv - uPoint;
  d += uAmount * exp(-dot(p, p) / (uRadius * uRadius));
  o = vec4(d, 0.0, 1.0);
}`;

/** Slow curl-noise current (so the ink keeps unfurling) and the bowl wall (no flow past it). */
export const CURRENT = `${HEAD}
${NOISE_GLSL}
uniform sampler2D uVel;
uniform float uTime, uDt, uK;
void main(){
  vec2 v = texture(uVel, vUv).xy;
  v += curl2(vec3(vUv * 2.6, uTime * 0.035)) * uK * uDt;
  v += curl2(vec3(vUv * 7.0 + 3.1, uTime * 0.06)) * uK * 0.35 * uDt;
  v *= 1.0 - smoothstep(0.82, 0.97, disc(vUv));
  o = vec4(v, 0.0, 1.0);
}`;

export const ADVECT_VEL = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
uniform float uDt, uDiss;
void main(){
  vec2 c = vUv - uDt * texture(uVel, vUv).xy * uTexel;
  o = texture(uVel, c) / (1.0 + uDiss * uDt);
}`;

export const ADVECT_DYE = `${HEAD}
uniform sampler2D uVel, uDye;
uniform vec2 uTexel;
uniform float uDt, uSettle, uFade;
void main(){
  vec2 v = texture(uVel, vUv).xy * uTexel;
  float fresh = texture(uDye, vUv - uDt * v).x;
  // The older layer sits deeper, where the water moves at half the pace.
  float old = texture(uDye, vUv - uDt * v * 0.5).y;
  // A fresh drop settles, slowly, into the day's layer below.
  float s = fresh * uSettle * uDt;
  fresh -= s;
  old += s * 0.85;
  old /= 1.0 + uFade * uDt;
  float wall = 1.0 - smoothstep(0.9, 1.0, disc(vUv));
  o = vec4(clamp(fresh, 0.0, 3.0) * wall, clamp(old, 0.0, 2.0) * wall, 0.0, 1.0);
}`;

export const CURL = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main(){
  float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).y;
  float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

export const VORTICITY = `${HEAD}
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
  o = vec4(clamp(v, -400.0, 400.0), 0.0, 1.0);
}`;

export const DIVERGENCE = `${HEAD}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main(){
  float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
  float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

export const SCALE = `${HEAD}
uniform sampler2D uTex;
uniform float uK;
void main(){ o = texture(uTex, vUv) * uK; }`;

export const PRESSURE = `${HEAD}
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

export const GRADIENT = `${HEAD}
uniform sampler2D uP, uVel;
uniform vec2 uTexel;
void main(){
  float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
  o = vec4(texture(uVel, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`;

export const MAX_DROPS = 6;
export const MAX_JETS = 4;

/*
 * The whole picture in one pass: floor, shadow, the bowl's hammered outer wall, its gold lip,
 * the inner back wall, the water (ripple normals, refracted gold dye over the day's older ink,
 * Fresnel reflection of a dim room with one warm lamp) and the falling drops.
 * World axes: x right, y toward the viewer, z up; lengths in units of the rim radius R.
 * Screen offsets from the rim centre, in R units, y down: sx = x, sy = y * K - z * Cq.
 */
export const DISPLAY = `#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 o;
uniform sampler2D uH, uDye;
uniform vec2 uHTexel, uDyeTexel;
uniform vec2 uRes, uC;
uniform float uPx, uR, uK, uCq, uWl, uRw, uHb, uRi, uTime;
uniform vec3 uNight, uGold, uLamp;
uniform vec4 uDrops[${MAX_DROPS}];
uniform vec4 uDropsB[${MAX_DROPS}];
uniform vec4 uJets[${MAX_JETS}];

vec3 V;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float cell(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float d = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 r = g + hash2(i + g) * 0.8 + 0.1 - f;
    d = min(d, dot(r, r));
  }
  return d;
}

/* A dim room: a cool ceiling, a warm wall band behind, one warm lamp behind (it is what the
   water mirrors), a soft kicker from the left (what the bowl's flank catches), a faint fill
   from the viewer's side. */
vec3 env(vec3 d, float strip){
  float up = d.z;
  vec3 c = vec3(0.004, 0.005, 0.009) + vec3(0.012, 0.014, 0.022) * smoothstep(-0.1, 0.9, up);
  c += vec3(0.04, 0.031, 0.022) * exp(-pow((up - 0.3) / 0.14, 2.0)) * smoothstep(0.1, -0.7, d.y);
  float k = max(dot(d, uLamp), 0.0);
  c += vec3(1.0, 0.84, 0.6) * (pow(k, 3000.0) * 9.0 + pow(k, 900.0) * 0.09 + pow(k, 90.0) * 0.004);
  // A tall strip light at the front left: the bowl's flank and lip catch it; the water does not.
  vec3 sd = normalize(vec3(-0.75, 0.62, 0.05));
  float kk = max(dot(normalize(vec3(d.x, d.y, d.z * 0.35)), sd), 0.0);
  c += vec3(1.0, 0.88, 0.7) * (pow(kk, 60.0) * 0.8 + pow(kk, 8.0) * 0.05) * strip;
  c += vec3(0.16, 0.15, 0.14) * smoothstep(0.3, 1.0, d.y) * smoothstep(-0.1, 0.7, d.z) * 0.3;
  return c;
}

// Profile: a quarter ellipse from the rim (wall vertical) to the base (wall flat), so the
// silhouette rounds into the foot. t 0..1 = rim..base.
const float RB = 0.46;
const float HP = 1.5707963;
float prof(float t){ return RB + (1.0 - RB) * cos(t * HP); }
float profZ(float t){ return uHb * sin(t * HP); }
float wallY(float t, float x){ float r = prof(t); return uK * sqrt(max(r * r - x * x, 0.0)) + profZ(t) * uCq; }

vec3 metal(vec3 n, vec3 f0, float rough){
  vec3 r = reflect(-V, n);
  float f = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 5.0);
  vec3 spec = env(r, 1.0) * mix(f0, vec3(1.0), f * 0.6);
  // Rough metal: blend in a blurrier read of the room.
  vec3 blur = env(normalize(r + n * rough), 1.0) * f0;
  return mix(spec, blur, rough * 0.6) * 1.9;
}

vec3 outer(vec2 q, out float cover){
  cover = 0.0;
  if (q.y <= 0.0) return vec3(0.0);
  float prevT = 0.0;
  float tHit = -1.0;
  for (int i = 1; i <= 28; i++) {
    float t = float(i) / 28.0;
    if (abs(q.x) >= prof(t)) break;
    if (wallY(t, q.x) >= q.y) {
      float a = prevT, b = t;
      for (int k = 0; k < 6; k++) { float m = (a + b) * 0.5; if (wallY(m, q.x) >= q.y) b = m; else a = m; }
      tHit = b;
      break;
    }
    prevT = t;
  }
  if (tHit < 0.0) return vec3(0.0);
  // Soft silhouette: the lowest point of the wall in this column (the envelope), against the pixel.
  float r = prof(tHit);
  float px = 1.0 / (uR * uPx);
  float ymax = 0.0;
  for (int i = 0; i <= 16; i++) {
    float t = float(i) / 16.0;
    if (abs(q.x) < prof(t)) ymax = max(ymax, wallY(t, q.x));
  }
  float side = (r - abs(q.x)) / px;
  cover = clamp(min((ymax - q.y) / px + 0.5, sqrt(max(side, 0.0)) * 0.7), 0.0, 1.0);

  float ct = clamp(q.x / r, -1.0, 1.0);
  float st = sqrt(1.0 - ct * ct);
  // Outward normal in the (radial, up) plane: perpendicular to the profile's tangent.
  vec2 nrz = normalize(vec2(uHb * cos(tHit * HP), -(1.0 - RB) * sin(tHit * HP)));
  vec3 n = vec3(ct * nrz.x, st * nrz.x, nrz.y);
  // Hammered: shallow dimples over the surface, as normal tilts.
  float th = atan(st, ct);
  vec2 p = vec2(th * 15.0, tHit * 9.0);
  float e = 0.04;
  float h0 = cell(p);
  float hu = cell(p + vec2(e, 0.0)) - h0;
  float hv = cell(p + vec2(0.0, e)) - h0;
  vec3 tu = vec3(-st, ct, 0.0);
  vec3 tv = vec3(-nrz.y * ct, -nrz.y * st, nrz.x);
  n = normalize(n - (tu * hu + tv * hv) / e * 0.014);
  vec3 col = metal(n, vec3(0.2, 0.16, 0.12), 0.3);
  // Patina: a soft, slow mottling, a rare gold fleck that only shows when it catches the light.
  float mott = 0.5 + 0.25 * sin(p.x * 1.3 + sin(p.y * 2.1) * 1.7) + 0.25 * sin(p.y * 1.7 + sin(p.x * 0.9) * 2.3);
  col *= 0.75 + 0.5 * mott;
  col += vec3(0.007, 0.006, 0.005);
  float fleck = step(0.996, hash(floor(p * 18.0)));
  col += uGold * fleck * 0.6 * smoothstep(0.02, 0.2, env(reflect(-V, n), 1.0).r);
  // The gold lip wraps over the top of the outer wall.
  float lip = 1.0 - smoothstep(0.012, 0.04, tHit);
  col = mix(col, metal(n, uGold, 0.2), lip);
  // Darker toward the foot (the floor shadows the underside).
  col *= mix(1.0, 0.35, smoothstep(0.45, 1.0, tHit));
  return col;
}

vec3 rim(vec2 q, float rr){
  float s = clamp((rr - uRi) / (1.0 - uRi), 0.0, 1.0);
  vec2 dir = normalize(vec2(q.x, q.y / uK) + 1e-6);
  float tilt = (s - 0.5) * 2.2;
  vec3 n = normalize(vec3(dir.x * tilt, dir.y * tilt, 1.0));
  return metal(n, uGold, 0.15) + uGold * 0.05;
}

float height(vec2 uv){ return texture(uH, uv).x; }

vec3 water(vec2 q, vec2 w, float wr){
  // A camera at a finite distance: the view (and so the reflection) changes across the water.
  vec3 Vw = normalize(vec3(0.0, 3.2 * uCq, 3.2 * uK) - vec3(w.x, w.y, -uWl));
  vec2 uv = vec2(0.5 + 0.5 * w.x / uRw, 0.5 - 0.5 * w.y / uRw);
  vec2 e = uHTexel;
  float gx = height(uv + vec2(e.x, 0.0)) - height(uv - vec2(e.x, 0.0));
  float gy = -(height(uv + vec2(0.0, e.y)) - height(uv - vec2(0.0, e.y)));
  vec3 n = normalize(vec3(-gx * 4.0, -gy * 4.0, 1.0));
  float cosI = clamp(dot(n, Vw), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
  vec3 refl = env(reflect(-Vw, n), 0.0);

  vec2 off = vec2(n.x, -n.y) * 0.035;
  float fresh = texture(uDye, uv + off).x;
  // The day's older drops: deeper (behind, parallax), softer (a small blur), dimmer.
  vec2 uo = uv + off * 1.8 + vec2(0.0, 0.012);
  vec2 b = uDyeTexel * 2.5;
  float old = (texture(uDye, uo).y * 2.0 + texture(uDye, uo + vec2(b.x, 0.0)).y + texture(uDye, uo - vec2(b.x, 0.0)).y
    + texture(uDye, uo + vec2(0.0, b.y)).y + texture(uDye, uo - vec2(0.0, b.y)).y) / 6.0;

  vec3 col = vec3(0.0009, 0.0011, 0.0024);
  // Older ink glows faintly from below, like gold smoke. The thin haze a fluid smears out is
  // cut away (contrast curve), so only the filaments stay.
  float ao = smoothstep(0.035, 0.6, old);
  col += uGold * vec3(1.0, 0.76, 0.4) * 0.2 * ao;
  // Fresh ink: lit gold near the surface, brightest in its dense core.
  float a = 1.0 - exp(-pow(max(fresh - 0.02, 0.0), 1.1) * 4.0);
  float L = clamp(dot(n, normalize(uLamp + vec3(0.0, 0.0, 0.5))), 0.0, 1.0);
  // Dense ink is deep amber; its thin, stretched edges catch the light pale gold (lit smoke).
  float thin = smoothstep(0.04, 0.25, fresh) * (1.0 - smoothstep(0.45, 1.3, fresh));
  vec3 ink = mix(uGold * vec3(1.0, 0.7, 0.32) * 0.6, uGold * vec3(1.0, 0.85, 0.6) * 1.5, thin);
  ink = mix(ink, uGold * 1.2, smoothstep(0.9, 2.0, fresh));
  ink *= 0.85 + 0.35 * L;
  col = mix(col, ink, a);
  col = col * (1.0 - F * 0.85) + refl * F;
  // Meniscus: a hairline of the gold lip where the water meets the wall.
  col += uGold * 0.12 * smoothstep(uRw - 0.025, uRw, wr);
  return col;
}

vec3 innerWall(vec2 q, vec2 w){
  float a = atan(w.y, w.x);
  vec3 n = normalize(vec3(-cos(a), -sin(a), 0.3));
  vec3 col = metal(n, vec3(0.14, 0.115, 0.09), 0.12) * 0.55;
  // Shadowed toward the waterline.
  col *= mix(0.35, 1.0, smoothstep(uRw, uRw + 0.06, length(w)));
  return col;
}

/* Gold sphere at screen offset s (R units), radius r, stretched e along y. */
vec4 sphere(vec2 q, vec2 s, float r, float e){
  vec2 d = (q - s) / vec2(1.0, e);
  float l = length(d);
  float px = 1.0 / (uR * uPx);
  float a = 1.0 - smoothstep(r - px, r + px, l);
  if (a <= 0.0) return vec4(0.0);
  vec2 u = d / r;
  float z = sqrt(max(1.0 - dot(u, u), 0.0));
  vec3 upS = vec3(0.0, -uK, uCq);
  vec3 n = normalize(vec3(u.x, 0.0, 0.0) - upS * u.y + V * z);
  // Liquid gold: a warm body lit from the upper left, a crisp window glint, the room in the rim.
  float dif = clamp(dot(n, normalize(vec3(-0.5, 0.45, 0.75))), 0.0, 1.0);
  vec3 col = uGold * (0.18 + 0.85 * dif * dif) + metal(n, uGold, 0.1) * 0.6;
  float glint = pow(clamp(dot(reflect(-V, n), normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0), 120.0);
  col += vec3(1.0, 0.95, 0.85) * glint * 2.5;
  return vec4(col, a);
}

vec4 jet(vec2 q, vec2 base, float h, float w){
  vec2 top = base - vec2(0.0, h * uCq);
  vec2 pa = q - top, ba = base - top;
  float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float r = w * mix(0.55, 1.4, k * k);
  float d = length(pa - ba * k);
  float px = 1.0 / (uR * uPx);
  float a = 1.0 - smoothstep(r - px, r + px, d);
  if (a <= 0.0) return vec4(0.0);
  float sx = clamp((q.x - (top.x + ba.x * k)) / r, -1.0, 1.0);
  vec3 n = normalize(vec3(sx, 0.0, 0.0) + V * sqrt(1.0 - sx * sx));
  return vec4(metal(n, uGold, 0.15) + uGold * 0.06, a);
}

vec3 toSrgb(vec3 c){
  // Soft shoulder above 0.6 so highlights roll off; the dark range (the page ground) is untouched.
  c = mix(c, 0.6 + 0.4 * (1.0 - exp(-(c - 0.6) / 0.4)), step(0.6, c));
  return pow(max(c, 0.0), vec3(1.0 / 2.2));
}

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y * uPx - gl_FragCoord.y) / uPx;
  vec2 q = (frag - uC) / uR;
  V = vec3(0.0, uCq, uK);

  // Floor: a faint pool of warm light under the bowl and its soft contact shadow.
  vec3 col = uNight;
  // Faded out before the canvas edges, so the stage never shows as a box on the page.
  vec2 edge = min(frag, uRes - frag);
  float fade = smoothstep(0.0, 90.0, edge.y) * smoothstep(0.0, 90.0, edge.x);
  float pool = exp(-(q.x * q.x / 2.2 + pow((q.y - 0.5) / 0.55, 2.0)) * 1.6) * fade;
  col += vec3(0.007, 0.006, 0.0042) * pool;
  float fy = uHb * uCq + 0.01;
  float sh = exp(-(pow(q.x / 0.7, 2.0) + pow((q.y - fy) / (0.7 * uK), 2.0)) * 2.4);
  col *= 1.0 - 0.8 * sh;
  // A faint gold bounce on the floor in front of the foot.
  col += uGold * 0.006 * exp(-(pow(q.x / 0.5, 2.0) + pow((q.y - fy - 0.06) / 0.08, 2.0)));

  float rr = length(vec2(q.x, q.y / uK));
  float aw = fwidth(rr) * 1.2;

  if (rr > 1.0 - 2.0 * aw) {
    float cover;
    vec3 body = outer(q, cover);
    col = mix(col, body, cover);
  }
  vec3 inside = col;
  if (rr < uRi + 2.0 * aw) {
    vec2 w = vec2(q.x, (q.y - uWl * uCq) / uK);
    float wr = length(w);
    float ww = fwidth(wr) * 1.2;
    vec3 wall = innerWall(q, w);
    inside = wr < uRw + 2.0 * ww ? mix(water(q, w, wr), wall, smoothstep(uRw - ww, uRw + ww, wr)) : wall;
  }
  if (rr < 1.0 + 2.0 * aw) {
    vec3 lip = rim(q, rr);
    vec3 c = mix(inside, lip, smoothstep(uRi - aw, uRi + aw, rr));
    col = mix(c, col, smoothstep(1.0 - aw, 1.0 + aw, rr));
  }

  // Drops: the falling or forming bead (and its faint mirror in the water), then the jets.
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    vec4 d = uDrops[i];
    if (d.w <= 0.0) continue;
    vec4 b = uDropsB[i];
    vec2 s = vec2(d.x, uWl * uCq + d.y * uK - d.z * uCq);
    vec4 sp = sphere(q, s, d.w, b.x);
    // Mirror image under the surface (only over the water, weak, fading with height).
    vec2 m = vec2(d.x, uWl * uCq + d.y * uK + d.z * uCq);
    vec4 mi = sphere(q, m, d.w, b.x);
    vec2 w = vec2(q.x, (q.y - uWl * uCq) / uK);
    float onWater = step(length(w), uRw) * step(rr, uRi);
    col += uGold * 0.5 * mi.a * onWater * exp(-d.z * 30.0) * b.y;
    // A faint aura, so the bead reads as precious against the dark.
    float g = length((q - s) / vec2(1.0, b.x)) / d.w;
    col += uGold * 0.05 * exp(-g * g * 0.25) * b.y;
    col = mix(col, sp.rgb, sp.a * b.y);
  }
  for (int i = 0; i < ${MAX_JETS}; i++) {
    vec4 j = uJets[i];
    if (j.z <= 0.0) continue;
    vec2 base = vec2(j.x, uWl * uCq + j.y * uK);
    vec4 c = jet(q, base, j.z, j.w);
    col = mix(col, c.rgb, c.a);
  }

  vec3 outc = toSrgb(col);
  outc += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  o = vec4(outc, 1.0);
}`;
