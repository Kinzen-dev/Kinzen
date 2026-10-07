import { WORDMARK } from "@/fx/baked/wordmark";
import { indexMask, type MaskIndex } from "@/fx/targets/mask";

/**
 * Particle playground field: N gold points on a spring toward a target shape (the KINZEN
 * wordmark, a typed name, or a drawing), stirred by the pointer. CPU physics in typed arrays,
 * drawn as additive WebGL2 points (Canvas 2D fallback). Coordinates are canvas CSS px.
 */
export type Pt = { x: number; y: number };
export type FieldEvents = {
  onShape?: (shape: "home" | "text" | "drawing") => void;
  /** Committed strokes plus the one in progress, for the ink preview. */
  onStroke?: (done: Pt[][], current: Pt[]) => void;
  onFormed?: () => void;
};

const CHAMPAGNE = [250 / 255, 232 / 255, 178 / 255];
const HOLD_MS = 2600;
const DUST = 0.12;

let kinzenMask: MaskIndex | null = null;
const kinzen = () => (kinzenMask ??= indexMask(WORDMARK));

/** A list of ink pixels (canvas px) plus the edge subset, used to pick targets. */
type Ink = { xs: Float32Array; ys: Float32Array; edge: Int32Array; area: number };

function inkFromImage(img: ImageData, step: number): Ink {
  const { width: w, height: h, data } = img;
  const xs: number[] = [];
  const ys: number[] = [];
  const edge: number[] = [];
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 110;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) edge.push(xs.length);
      xs.push(x / step);
      ys.push(y / step);
    }
  }
  return { xs: Float32Array.from(xs), ys: Float32Array.from(ys), edge: Int32Array.from(edge), area: xs.length / (step * step) };
}

export function createField(canvas: HTMLCanvasElement, opts: { reduced: boolean; gold: number[]; font: string } & FieldEvents) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  let N = 0;
  let pos = new Float32Array(0);
  let vel = new Float32Array(0);
  let tgt = new Float32Array(0);
  let stiff = new Float32Array(0);
  let release = new Float32Array(0);
  let seed = new Float32Array(0);
  /** xy + speed per particle, uploaded each frame. */
  let draw = new Float32Array(0);
  let alpha = 0.5;
  let alphaGoal = 0.5;
  let shape: "home" | "text" | "drawing" = "home";
  let lastText = "";
  let lastStrokes: Pt[][] = [];
  let homeTimer = 0;
  let raf = 0;
  let running = false;
  let visible = false;
  const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };

  // ---------- renderer ----------
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true });
  const ctx2d = gl ? null : canvas.getContext("2d");
  let prog: WebGLProgram | null = null;
  let posBuf: WebGLBuffer | null = null;
  let seedBuf: WebGLBuffer | null = null;
  let uSize: WebGLUniformLocation | null = null;
  let uView: WebGLUniformLocation | null = null;
  let uAlpha: WebGLUniformLocation | null = null;

  if (gl) {
    const vs = `#version 300 es
      layout(location=0) in vec3 aPos; layout(location=1) in vec2 aSeed;
      uniform vec2 uView; uniform float uSize; uniform float uAlpha; uniform vec3 uGold; uniform vec3 uHot;
      out vec3 vCol;
      void main() {
        vec2 c = aPos.xy / uView * 2.0 - 1.0;
        gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
        float heat = clamp(aPos.z / 9.0, 0.0, 1.0);
        float dust = step(0.5, aSeed.y);
        gl_PointSize = uSize * mix(0.75, 1.35, aSeed.x) * mix(1.0, 0.8, dust);
        vec3 base = mix(uGold * mix(0.62, 1.0, aSeed.x), uHot, heat * 0.85 + step(0.86, aSeed.x) * 0.4);
        vCol = base * uAlpha * mix(1.0, 0.45, dust) * (1.0 + heat * 0.6);
      }`;
    const fs = `#version 300 es
      precision mediump float; in vec3 vCol; out vec4 o;
      void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.15, d); o = vec4(vCol * a, a); }`;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    posBuf = gl.createBuffer();
    seedBuf = gl.createBuffer();
    uSize = gl.getUniformLocation(prog, "uSize");
    uView = gl.getUniformLocation(prog, "uView");
    uAlpha = gl.getUniformLocation(prog, "uAlpha");
    const g = opts.gold.map((c) => c / 255);
    gl.uniform3f(gl.getUniformLocation(prog, "uGold"), g[0], g[1], g[2]);
    gl.uniform3f(gl.getUniformLocation(prog, "uHot"), CHAMPAGNE[0], CHAMPAGNE[1], CHAMPAGNE[2]);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
  }

  const pointSize = () => (w < 560 ? 2.2 : 2.8) * dpr;

  function render() {
    if (gl && prog) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, draw, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uView, w, h);
      gl.uniform1f(uSize, pointSize());
      gl.uniform1f(uAlpha, alpha);
      gl.drawArrays(gl.POINTS, 0, N);
    } else if (ctx2d) {
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.globalCompositeOperation = "lighter";
      const [r, g, b] = opts.gold;
      ctx2d.fillStyle = `rgba(${r},${g},${b},${Math.min(1, alpha * 1.4)})`;
      for (let i = 0; i < N; i++) ctx2d.fillRect(draw[i * 3] - 0.8, draw[i * 3 + 1] - 0.8, 1.6, 1.6);
      ctx2d.globalCompositeOperation = "source-over";
    }
  }

  // ---------- targets ----------
  function pick(ink: Ink, i: number) {
    const useEdge = ink.edge.length > 0 && Math.random() < 0.28;
    const j = useEdge ? ink.edge[(Math.random() * ink.edge.length) | 0] : (Math.random() * ink.xs.length) | 0;
    tgt[i * 2] = ink.xs[j] + Math.random() * 0.9;
    tgt[i * 2 + 1] = ink.ys[j] + Math.random() * 0.9;
  }

  function setTargets(ink: Ink | null) {
    const now = performance.now();
    const glyphs = Math.round(N * (1 - DUST));
    for (let i = 0; i < N; i++) {
      if (i < glyphs && ink && ink.xs.length) pick(ink, i);
      else {
        tgt[i * 2] = Math.random() * w;
        tgt[i * 2 + 1] = h * 0.5 + (Math.random() - 0.5) * h * 0.95;
      }
      // Left-to-right formation wave with a little scatter: reads as "flying in", not snapping.
      release[i] = now + (tgt[i * 2] / Math.max(1, w)) * 380 + Math.random() * 220;
    }
    // Brightness: keep the summed glow of a shape about the same whatever its ink area.
    const area = ink ? Math.max(ink.area, 1) : w * h;
    const density = glyphs / area;
    const ps = pointSize() / dpr;
    alphaGoal = Math.min(0.95, Math.max(0.2, 1.25 / (density * ps * ps)));
    if (opts.reduced) {
      for (let i = 0; i < N * 2; i++) pos[i] = tgt[i];
      alpha = alphaGoal;
      pack(0);
      render();
    }
  }

  function textInk(text: string): Ink | null {
    const step = w < 560 ? 1 : 0.75;
    const cw = Math.max(1, Math.round(w * step));
    const ch = Math.max(1, Math.round(h * step));
    const off = new OffscreenCanvas(cw, ch);
    const c = off.getContext("2d", { willReadFrequently: true });
    if (!c) return null;
    let size = ch * 0.4;
    c.font = `600 ${size}px ${opts.font}`;
    const m0 = c.measureText(text);
    size = Math.min(size, (size * cw * 0.86) / Math.max(1, m0.width));
    c.font = `600 ${size}px ${opts.font}`;
    const m = c.measureText(text);
    // Centre the INK (Thai marks above and below included), not the line box.
    const asc = m.actualBoundingBoxAscent;
    const desc = m.actualBoundingBoxDescent;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = "#fff";
    c.fillText(text, cw / 2, ch / 2 + (asc - desc) / 2);
    return inkFromImage(c.getImageData(0, 0, cw, ch), step);
  }

  function strokeInk(strokes: Pt[][]): Ink | null {
    const off = new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    const c = off.getContext("2d", { willReadFrequently: true });
    if (!c) return null;
    c.strokeStyle = "#fff";
    c.lineCap = "round";
    c.lineJoin = "round";
    c.lineWidth = Math.max(9, Math.min(20, Math.min(w, h) * 0.035));
    for (const s of strokes) {
      if (!s.length) continue;
      c.beginPath();
      c.moveTo(s[0].x, s[0].y);
      for (const p of s) c.lineTo(p.x, p.y);
      if (s.length === 1) c.lineTo(s[0].x + 0.1, s[0].y);
      c.stroke();
    }
    return inkFromImage(c.getImageData(0, 0, off.width, off.height), 1);
  }

  function homeInk(): Ink {
    const m = kinzen();
    const fit = Math.min((w * 0.84) / m.w, (h * 0.5) / m.h);
    const ox = (w - m.w * fit) / 2;
    const oy = (h - m.h * fit) / 2;
    const map = (list: Int32Array) => {
      const xs = new Float32Array(list.length);
      const ys = new Float32Array(list.length);
      for (let k = 0; k < list.length; k++) {
        const v = list[k];
        const x = v % m.w;
        xs[k] = ox + x * fit;
        ys[k] = oy + ((v - x) / m.w) * fit;
      }
      return { xs, ys };
    };
    const ink = map(m.ink);
    const edgeSet = map(m.edge);
    // Edge pixels as extra entries appended to the ink list so pick() can index them.
    const xs = new Float32Array(ink.xs.length + edgeSet.xs.length);
    const ys = new Float32Array(xs.length);
    xs.set(ink.xs);
    xs.set(edgeSet.xs, ink.xs.length);
    ys.set(ink.ys);
    ys.set(edgeSet.ys, ink.ys.length);
    const edge = new Int32Array(edgeSet.xs.length).map((_, k) => ink.xs.length + k);
    return { xs, ys, edge, area: m.ink.length * fit * fit };
  }

  function setShape(next: "home" | "text" | "drawing") {
    shape = next;
    window.clearTimeout(homeTimer);
    if (next === "home") setTargets(homeInk());
    else if (next === "text") setTargets(textInk(lastText));
    else setTargets(strokeInk(lastStrokes));
    opts.onShape?.(next);
    if (next !== "home" && !opts.reduced) homeTimer = window.setTimeout(() => setShape("home"), HOLD_MS + 1200);
  }

  // ---------- simulation ----------
  function pack(t: number) {
    for (let i = 0; i < N; i++) {
      const o = i * 2;
      // Formed particles breathe a little around their target.
      const b = Math.sin(t * 0.0016 + seed[o] * 40) * 0.35;
      draw[i * 3] = pos[o] + b;
      draw[i * 3 + 1] = pos[o + 1] + Math.cos(t * 0.0013 + seed[o] * 31) * 0.35;
      draw[i * 3 + 2] = Math.hypot(vel[o], vel[o + 1]);
    }
  }

  let last = 0;
  function step(t: number) {
    raf = requestAnimationFrame(step);
    const dt = Math.min(2.5, last ? (t - last) / 16.667 : 1);
    last = t;
    alpha += (alphaGoal - alpha) * 0.06 * dt;
    const damp = Math.pow(0.87, dt);
    const stirOn = t - pointer.t < 900;
    const R = w < 560 ? 70 : 95;
    const R2 = R * R;
    const glyphs = Math.round(N * (1 - DUST));
    for (let i = 0; i < N; i++) {
      const o = i * 2;
      let ax = 0;
      let ay = 0;
      if (t >= release[i]) {
        const k = stiff[i];
        ax = (tgt[o] - pos[o]) * k;
        ay = (tgt[o + 1] - pos[o + 1]) * k;
      }
      if (i >= glyphs) {
        // Dust drifts on a slow curl so the scene never freezes.
        ax += Math.sin(pos[o + 1] * 0.012 + t * 0.0004 + seed[o] * 6) * 0.02;
        ay += Math.cos(pos[o] * 0.011 + t * 0.0003) * 0.02;
      }
      if (stirOn) {
        const dx = pos[o] - pointer.x;
        const dy = pos[o + 1] - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + 0.001;
          const f = (1 - d / R) * (1 - d / R);
          ax += (dx / d) * f * 3.2 + pointer.vx * f * 0.09 - (dy / d) * f * 1.2;
          ay += (dy / d) * f * 3.2 + pointer.vy * f * 0.09 + (dx / d) * f * 1.2;
        }
      }
      vel[o] = (vel[o] + ax * dt) * damp;
      vel[o + 1] = (vel[o + 1] + ay * dt) * damp;
      pos[o] += vel[o] * dt;
      pos[o + 1] += vel[o + 1] * dt;
    }
    pointer.vx *= 0.9;
    pointer.vy *= 0.9;
    pack(t);
    render();
  }

  function start() {
    if (running || opts.reduced) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const nw = Math.max(1, r.width);
    const nh = Math.max(1, r.height);
    if (Math.abs(nw - w) < 1 && Math.abs(nh - h) < 1) return;
    const first = N === 0;
    w = nw;
    h = nh;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (first) {
      const cores = navigator.hardwareConcurrency || 4;
      N = Math.round(Math.min(gl ? (cores >= 8 ? 16000 : 11000) : 3500, Math.max(2500, (w * h) / 30)));
      pos = new Float32Array(N * 2);
      vel = new Float32Array(N * 2);
      tgt = new Float32Array(N * 2);
      stiff = new Float32Array(N);
      release = new Float32Array(N);
      seed = new Float32Array(N * 2);
      draw = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        // Opening state: a loose cloud of dust that condenses on first view.
        pos[i * 2] = Math.random() * w;
        pos[i * 2 + 1] = h * 0.5 + (Math.random() - 0.5) * h;
        stiff[i] = 0.028 + Math.random() * 0.04;
        seed[i * 2] = Math.random();
        seed[i * 2 + 1] = i >= Math.round(N * (1 - DUST)) ? 1 : 0;
      }
      if (gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
        gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);
      }
      pack(0);
      render();
    } else {
      setShape(shape);
    }
  }

  // ---------- input ----------
  let drawing = false;
  let drawMode = false;
  let current: Pt[] = [];
  let formTimer = 0;
  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onMove = (e: PointerEvent) => {
    const p = local(e);
    const now = performance.now();
    if (pointer.t && now - pointer.t < 100) {
      pointer.vx = pointer.vx * 0.5 + (p.x - pointer.x) * 0.5;
      pointer.vy = pointer.vy * 0.5 + (p.y - pointer.y) * 0.5;
    }
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.t = now;
    if (drawing) {
      current.push(p);
      opts.onStroke?.(lastStrokes, current);
    }
  };
  const onDown = (e: PointerEvent) => {
    if (!drawMode) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    window.clearTimeout(formTimer);
    window.clearTimeout(homeTimer);
    current = [local(e)];
    opts.onStroke?.(lastStrokes, current);
  };
  const onUp = () => {
    if (!drawing) return;
    drawing = false;
    if (current.length) lastStrokes = [...lastStrokes, current];
    current = [];
    // A short pause lets the visitor add another stroke before the particles commit.
    formTimer = window.setTimeout(() => {
      if (!lastStrokes.length) return;
      setShape("drawing");
      opts.onFormed?.();
    }, 650);
  };
  const onLeave = () => {
    pointer.t = 0;
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting;
    if (visible && !document.hidden) start();
    else stop();
    if (visible && !was && shape === "home") setShape("home");
  });
  io.observe(canvas);
  const onVis = () => (document.hidden || !visible ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  resize();

  return {
    setText(text: string) {
      lastText = text.trim();
      if (!lastText) setShape("home");
      else setShape("text");
    },
    setDrawMode(on: boolean) {
      drawMode = on;
      if (!on) {
        lastStrokes = [];
        opts.onStroke?.([], []);
      }
    },
    clearDrawing() {
      lastStrokes = [];
      opts.onStroke?.([], []);
    },
    home() {
      lastStrokes = [];
      opts.onStroke?.([], []);
      setShape("home");
    },
    get count() {
      return N;
    },
    get webgl() {
      return !!gl;
    },
    destroy() {
      stop();
      window.clearTimeout(homeTimer);
      window.clearTimeout(formTimer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      if (gl) {
        gl.deleteBuffer(posBuf);
        gl.deleteBuffer(seedBuf);
        gl.deleteProgram(prog);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    },
  };
}

export type Field = ReturnType<typeof createField>;
