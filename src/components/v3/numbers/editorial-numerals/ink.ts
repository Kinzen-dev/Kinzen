import { readPalette } from "@/fx/engine/palette";
import { DRIFT, frameLoop, type After, type Loop, type Tick } from "@/motion/frame-governor";

/**
 * Editorial numerals (numbers view 5): one figure at a time drawn in gold ink, on the section's
 * single WebGL context (the caller holds the lease, see ../gl-lease). The figure is rendered in the
 * site face on a 2D canvas (the mask), and a fragment shader fills it with slow domain-warped
 * marbling (gold leaf with darker ink veins) that bleeds in from the cropped edge each time a new
 * figure arrives. The pointer swirls the ink locally. The canvas is transparent outside the glyph,
 * so the page ground shows through in both themes.
 */

const VS = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform float uTime, uScale, uReveal, uSide, uMode;
uniform vec3 uDeep, uMid, uHigh, uVein;
uniform vec3 uPtr;
in vec2 vUv;
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.02 + 3.1; a *= 0.5; }
  return v;
}
void main(){
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  float m = texture(uMask, vec2(vUv.x, 1.0 - vUv.y)).r;
  if (m < 0.003) { o = vec4(0.0); return; }
  vec2 p = px / uScale;
  // Pointer: a soft local swirl of the ink.
  vec2 d = px - uPtr.xy;
  float pr = exp(-dot(d, d) / (uScale * uScale * 0.09)) * uPtr.z;
  p += vec2(-d.y, d.x) / uScale * pr * 0.9;
  float t = uTime * 0.05;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.6 * q + vec2(1.7, 9.2) + t * 1.3), fbm(p + 3.6 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 3.2 * r);
  // Marbling: smooth tone from f, fine dark veins where the warped field folds.
  vec3 c = mix(uDeep, uMid, smoothstep(0.2, 0.52, f));
  c = mix(c, uHigh, smoothstep(0.55, 0.8, f) * (0.6 + 0.4 * length(q)));
  float vein = 1.0 - smoothstep(0.0, 0.04, abs(fract(f * 7.0 + r.x * 1.5) - 0.5) - 0.44);
  c = mix(c, uVein, vein * 0.4 * smoothstep(0.25, 0.55, length(r)));
  // Leaf sheen: a slow, soft band of light travelling across the gold.
  float band = sin((px.x * 0.55 + px.y) / (uScale * 2.4) - uTime * 0.32 + f * 2.4);
  c = mix(c, uHigh, pow(max(band, 0.0), 10.0) * 0.45);
  // Reveal: the ink bleeds in from the cropped side, with a ragged, slightly darker wet front.
  float from = uSide > 0.5 ? 1.0 - vUv.x : vUv.x;
  float edge = from * 0.82 + fbm(p * 1.7 + 11.0) * 0.32;
  float front = uReveal * 1.25 - edge;
  float a = smoothstep(0.0, 0.05, front);
  c = mix(c, uVein, (1.0 - smoothstep(0.0, 0.12, front)) * a * 0.5);
  // Paper: a hairline darker rim inside the glyph edge reads as printed ink, not a flat fill.
  float rim = smoothstep(0.5, 1.0, m);
  c *= mix(uMode > 0.5 ? 0.82 : 1.25, 1.0, rim);
  a *= m;
  o = vec4(c * a, a);
}`;

/** A CSS colour as sRGB bytes (oklch() included). */
function rgbOf(css: string): number[] {
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return [0, 0, 0];
  c.fillStyle = css;
  c.fillRect(0, 0, 1, 1);
  return [...c.getImageData(0, 0, 1, 1).data.slice(0, 3)];
}
/** The emission gold (dark-scheme --gold). readPalette's glow resolves to the light value on a
    light page, because light-dark() in a custom property resolves where it is declared. */
const GLOW = "oklch(0.76 0.115 80)";

const lin = (c: readonly number[]) => c.map((v) => v / 255) as [number, number, number];
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

export type Ink = {
  /** Show `figure` cropped by the edge on `side`: the current one fades, the new one bleeds in. */
  show(figure: string, side: "left" | "right"): void;
  destroy(): void;
};

export function createInk(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  opts: {
    figure: string;
    side: "left" | "right";
    font: string;
    reduced: boolean;
    /** Narrow stages set the figure on top, as wide as the stage allows. */
    narrow: () => boolean;
    /** Where the drawn ink starts and ends (CSS px from the canvas's left edge). */
    onLayout?: (ink: { left: number; right: number }) => void;
  },
): Ink | null {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }
  gl.useProgram(prog);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = {
    res: u("uRes"),
    time: u("uTime"),
    scale: u("uScale"),
    reveal: u("uReveal"),
    side: u("uSide"),
    mode: u("uMode"),
    deep: u("uDeep"),
    mid: u("uMid"),
    high: u("uHigh"),
    vein: u("uVein"),
    ptr: u("uPtr"),
  };
  gl.uniform1i(u("uMask"), 0);
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.clearColor(0, 0, 0, 0);

  /** Gold tones from the tokens: deep ink, body, highlight and vein, per theme. */
  function palette() {
    const p = readPalette(host);
    const dark = p.mode === "dark";
    p.glow = rgbOf(GLOW) as unknown as typeof p.glow;
    const champagne = [250, 232, 178];
    // On paper the leaf must still read as gold, not brown: the deep tone is a lifted ink gold.
    const deep = dark ? mix([...p.glow], [30, 20, 6], 0.42) : mix([...p.ink], [...p.glow], 0.4);
    const mid = dark ? [...p.glow] : mix([...p.ink], [...p.glow], 0.9);
    const high = dark ? mix([...p.glow], champagne, 0.8) : mix([...p.glow], champagne, 0.6);
    const vein = dark ? mix([...p.glow], [16, 10, 2], 0.72) : mix([...p.ink], [24, 16, 4], 0.3);
    gl!.useProgram(prog);
    gl!.uniform3fv(U.deep, lin(deep));
    gl!.uniform3fv(U.mid, lin(mid));
    gl!.uniform3fv(U.high, lin(high));
    gl!.uniform3fv(U.vein, lin(vein));
    gl!.uniform1f(U.mode, dark ? 0 : 1);
  }

  let W = 0;
  let H = 0;
  let dpr = 1;
  let scale = 200;
  /** Draw the figure into the mask: as tall as the box allows, cropped by the edge on its side. */
  function layout() {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw < 2 || ch < 2) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(2_200_000 / (cw * ch)));
    W = Math.round(cw * dpr);
    H = Math.round(ch * dpr);
    canvas.width = W;
    canvas.height = H;
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const c = off.getContext("2d") as CanvasRenderingContext2D & { letterSpacing?: string };
    const phone = opts.narrow();
    gl!.useProgram(prog);
    gl!.uniform1f(U.side, opts.side === "right" ? 1 : 0);
    c.font = `600 100px ${opts.font}`;
    if ("letterSpacing" in c) c.letterSpacing = "-5px";
    const m0 = c.measureText(opts.figure);
    const iw0 = m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight;
    const ih0 = m0.actualBoundingBoxAscent + m0.actualBoundingBoxDescent;
    // Crop: a single digit loses a confident slice to the edge; a longer figure only a sliver.
    const multi = opts.figure.length > 1;
    const crop = multi ? (phone ? 0.03 : 0.05) : 0.14;
    const maxW = (phone ? (multi ? 0.97 : 1.02) : multi ? 0.56 : 0.5) * cw;
    const fsCss = Math.min((ch * 0.94) / ih0, maxW / (iw0 * (1 - crop))) * 100;
    const fs = fsCss * dpr;
    c.font = `600 ${fs}px ${opts.font}`;
    if ("letterSpacing" in c) c.letterSpacing = `${-0.05 * fs}px`;
    const m = c.measureText(opts.figure);
    const iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const bottom = H - Math.round(0.03 * H);
    const left = opts.side === "left" ? -crop * iw : W + crop * iw - iw;
    c.fillStyle = "#fff";
    c.fillText(opts.figure, left + m.actualBoundingBoxLeft, bottom - m.actualBoundingBoxDescent);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, off);
    // The red channel of white text is its coverage; the shader samples .r.
    scale = fs * 0.42;
    opts.onLayout?.({ left: left / dpr, right: (left + iw) / dpr });
    return true;
  }

  let reveal = opts.reduced ? 1 : 0;
  let revealFrom = -1;
  /** While a figure leaves: the time its fade began (the next one is laid out when it ends). */
  let leaveFrom = -1;
  let pending: { figure: string; side: "left" | "right" } | null = null;
  let fade = 1;
  const ptr = { x: -1e5, y: -1e5, z: 0, goal: 0, at: 0 };
  let loop: Loop | null = null;
  let visible = false;
  let last = 0;
  const t0 = performance.now();

  function draw(now: number) {
    gl!.viewport(0, 0, W, H);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.useProgram(prog);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.uniform2f(U.res, W, H);
    gl!.uniform1f(U.time, opts.reduced ? 12 : (now - t0) / 1000);
    gl!.uniform1f(U.scale, scale);
    gl!.uniform1f(U.reveal, reveal * fade);
    gl!.uniform3f(U.ptr, ptr.x, ptr.y, ptr.z);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function frame({ now }: Tick): After {
    const busy = leaveFrom >= 0 || (revealFrom >= 0 && reveal < 1) || now - ptr.at < 1500 || ptr.z > 0.01;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    if (leaveFrom >= 0) {
      fade = 1 - Math.min(1, (now - leaveFrom) / 320);
      if (fade <= 0 && pending) {
        opts.figure = pending.figure;
        opts.side = pending.side;
        pending = null;
        leaveFrom = -1;
        fade = 1;
        reveal = 0;
        revealFrom = now;
        layout();
      }
    }
    if (revealFrom >= 0 && reveal < 1) {
      const k = Math.min(1, (now - revealFrom) / 2200);
      reveal = 1 - Math.pow(1 - k, 3);
    }
    ptr.z += (ptr.goal - ptr.z) * Math.min(1, dt * 5);
    draw(now);
    // The marbling drifts slowly: the rest rate is enough at rest, full rate while it reacts.
    return busy ? undefined : DRIFT;
  }

  const start = () => {
    if (loop || opts.reduced) return;
    last = 0;
    loop = frameLoop({ name: "numbers/editorial-numerals", host: canvas, heavy: true, wakeOn: host }, frame);
  };
  const stop = () => {
    loop?.stop();
    loop = null;
  };
  const sync = () => (visible && !document.hidden ? start() : stop());

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) * dpr;
    ptr.y = (e.clientY - r.top) * dpr;
    ptr.goal = 1;
    ptr.at = performance.now();
  };
  const onLeave = () => {
    ptr.goal = 0;
  };
  host.addEventListener("pointermove", onMove, { passive: true });
  host.addEventListener("pointerleave", onLeave);

  const ro = new ResizeObserver(() => {
    if (layout()) draw(performance.now());
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  // Theme switches (system or the site toggle) re-read the gold tones.
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onTheme = () => {
    palette();
    draw(performance.now());
  };
  mql.addEventListener("change", onTheme);
  const mo = new MutationObserver(onTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

  palette();
  if (layout()) draw(performance.now());

  return {
    show(figure, side) {
      if (figure === opts.figure && side === opts.side && !pending) {
        if (revealFrom < 0 && !opts.reduced) {
          revealFrom = performance.now();
          loop?.wake();
        }
        return;
      }
      if (opts.reduced || !loop) {
        // Still (or off screen): swap at once, fully drawn.
        opts.figure = figure;
        opts.side = side;
        pending = null;
        leaveFrom = -1;
        fade = 1;
        reveal = opts.reduced ? 1 : 0;
        revealFrom = opts.reduced ? -1 : performance.now();
        if (layout()) draw(performance.now());
        return;
      }
      pending = { figure, side };
      if (leaveFrom < 0) leaveFrom = performance.now();
      loop.wake();
    },
    destroy() {
      stop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      mql.removeEventListener("change", onTheme);
      document.removeEventListener("visibilitychange", sync);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl!.deleteTexture(tex);
      gl!.deleteProgram(prog);
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
