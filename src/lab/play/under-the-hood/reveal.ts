import { drawBlueprint, type Ink } from "./blueprint";

/**
 * Rub-to-reveal: one canvas over the HTML mockup. A low-res float mask (one cell per CELL css px)
 * collects soft brush stamps along the pointer path, bleeds a little each frame (ink in water),
 * heals back slowly, and is thresholded against a fixed noise field so the edge reads as wet ink
 * rather than a blur. Per frame: mask -> tiny ImageData -> scaled up as alpha, blueprint drawn
 * source-in, then a gold rim on the edge band. The loop sleeps once the mask is empty.
 */
const CELL = 6;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function readInk(host: HTMLElement): Ink {
  const probe = (v: string) => {
    const el = document.createElement("span");
    el.style.cssText = `position:absolute;visibility:hidden;color:${v.startsWith("--") ? `var(${v})` : v}`;
    host.appendChild(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  };
  return {
    ground: probe("color-mix(in oklab, var(--ground) 90%, var(--ink))"),
    surface: probe("--surface"),
    ink: probe("--ink"),
    ink2: probe("--ink-2"),
    ink3: probe("--ink-3"),
    rule: probe("--rule"),
    gold: probe("--gold"),
  };
}

export function createReveal(
  canvas: HTMLCanvasElement,
  opts: { reduced: boolean; th: boolean; font: string; onRub?: () => void },
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  let gw = 0;
  let gh = 0;
  let m = new Float32Array(0);
  let tmp = new Float32Array(0);
  let noise = new Float32Array(0);
  let maskC: OffscreenCanvas | null = null;
  let rimC: OffscreenCanvas | null = null;
  let maskImg: ImageData | null = null;
  let rimImg: ImageData | null = null;
  let bp: OffscreenCanvas | null = null;
  let gold: [number, number, number] = [200, 160, 80];
  let raf = 0;
  let running = false;
  let lastRub = 0;
  let hold = false;
  let sweep = 0;
  let visible = false;
  let introDone = false;

  function goldRgb(css: string): [number, number, number] {
    const c = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
    if (!c) return gold;
    c.fillStyle = css;
    c.fillRect(0, 0, 1, 1);
    const d = c.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }

  function paintBlueprint() {
    const ink = readInk(canvas.parentElement ?? canvas);
    gold = goldRgb(ink.gold);
    bp = new OffscreenCanvas(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)));
    const b = bp.getContext("2d");
    if (!b) return;
    b.scale(dpr, dpr);
    drawBlueprint(b as unknown as CanvasRenderingContext2D, w, h, ink, opts.font, opts.th);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1) return;
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ngw = Math.ceil(w / CELL) + 1;
    const ngh = Math.ceil(h / CELL) + 1;
    const old = m;
    const ogw = gw;
    const ogh = gh;
    gw = ngw;
    gh = ngh;
    m = new Float32Array(gw * gh);
    for (let y = 0; y < Math.min(gh, ogh); y++) for (let x = 0; x < Math.min(gw, ogw); x++) m[y * gw + x] = old[y * ogw + x];
    tmp = new Float32Array(gw * gh);
    // Smooth value noise (two octaves) for the inky edge.
    noise = new Float32Array(gw * gh);
    const lattice = (s: number) => {
      const lw = Math.ceil(gw / s) + 2;
      const lh = Math.ceil(gh / s) + 2;
      const v = Float32Array.from({ length: lw * lh }, () => Math.random());
      for (let y = 0; y < gh; y++)
        for (let x = 0; x < gw; x++) {
          const fx = x / s;
          const fy = y / s;
          const ix = Math.floor(fx);
          const iy = Math.floor(fy);
          const tx = smooth(0, 1, fx - ix);
          const ty = smooth(0, 1, fy - iy);
          const a = v[iy * lw + ix] + (v[iy * lw + ix + 1] - v[iy * lw + ix]) * tx;
          const b = v[(iy + 1) * lw + ix] + (v[(iy + 1) * lw + ix + 1] - v[(iy + 1) * lw + ix]) * tx;
          noise[y * gw + x] += (a + (b - a) * ty) / (s > 6 ? 1.4 : 5);
        }
    };
    lattice(9);
    lattice(4);
    maskC = new OffscreenCanvas(gw, gh);
    rimC = new OffscreenCanvas(gw, gh);
    maskImg = new ImageData(gw, gh);
    rimImg = new ImageData(gw, gh);
    paintBlueprint();
    if (opts.reduced && !introDone) {
      // Composed still: the right side already wiped open.
      introDone = true;
      for (let y = 0; y < gh; y++)
        for (let x = 0; x < gw; x++) m[y * gw + x] = smooth(0.5, 0.62, x / gw + (y / gh) * 0.12);
    }
    composite();
  }

  function stamp(px: number, py: number, r: number, strength: number) {
    const cx = px / CELL;
    const cy = py / CELL;
    const rc = r / CELL;
    const x0 = Math.max(0, Math.floor(cx - rc));
    const x1 = Math.min(gw - 1, Math.ceil(cx + rc));
    const y0 = Math.max(0, Math.floor(cy - rc));
    const y1 = Math.min(gh - 1, Math.ceil(cy + rc));
    const inv = 1 / (rc * rc);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const d2 = ((x - cx) ** 2 + (y - cy) ** 2) * inv;
        if (d2 > 1) continue;
        const i = y * gw + x;
        m[i] = Math.min(1.15, m[i] + strength * (1 - d2) * (1 - d2));
      }
  }

  function segment(ax: number, ay: number, bx: number, by: number) {
    const len = Math.hypot(bx - ax, by - ay);
    const r = Math.min(84, 46 + len * 0.7);
    const steps = Math.max(1, Math.ceil(len / (r * 0.3)));
    for (let k = 1; k <= steps; k++) stamp(ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps, r, 0.7);
    lastRub = performance.now();
    if (!opts.reduced) start();
    else composite();
  }

  function composite() {
    if (!ctx || !maskC || !rimC || !maskImg || !rimImg || !bp) return;
    const md = maskImg.data;
    const rd = rimImg.data;
    for (let i = 0, n = gw * gh; i < n; i++) {
      const v = m[i] + (noise[i] - 0.5) * 0.42;
      const a = smooth(0.3, 0.46, v);
      md[i * 4 + 3] = a * 255;
      const band = smooth(0.22, 0.3, v) * (1 - smooth(0.33, 0.42, v));
      rd[i * 4] = gold[0];
      rd[i * 4 + 1] = gold[1];
      rd[i * 4 + 2] = gold[2];
      rd[i * 4 + 3] = band * 190;
    }
    maskC.getContext("2d")?.putImageData(maskImg, 0, 0);
    rimC.getContext("2d")?.putImageData(rimImg, 0, 0);
    const W = canvas.width;
    const H = canvas.height;
    const sw = gw * CELL * dpr;
    const sh = gh * CELL * dpr;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(maskC, 0, 0, sw, sh);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(bp, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(rimC, 0, 0, sw, sh);
  }

  let last = 0;
  function frame(t: number) {
    const dt = Math.min(3, last ? (t - last) / 16.667 : 1);
    last = t;
    const since = t - lastRub;
    // Heal: nothing for a moment after a rub, then an accelerating fade (about 4 s to close).
    const heal = hold ? 0 : since < 700 ? 0 : (0.0025 + Math.min(1, (since - 700) / 1800) * 0.006) * dt;
    if (hold) sweep = Math.min(1.25, sweep + 0.018 * dt);
    let any = false;
    // Bleed: each cell takes a little of its neighbours' average (soft spreading ink).
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const l = x > 0 ? m[i - 1] : m[i];
        const r = x < gw - 1 ? m[i + 1] : m[i];
        const u = y > 0 ? m[i - gw] : m[i];
        const d = y < gh - 1 ? m[i + gw] : m[i];
        let v = m[i] * 0.88 + (l + r + u + d) * 0.03;
        if (hold) v = Math.max(v, smooth(0, 0.18, sweep - x / gw + (noise[i] - 0.5) * 0.12) * 1.1);
        v -= heal;
        if (v < 0.004) v = 0;
        tmp[i] = v;
        if (v > 0) any = true;
      }
    const sw = m;
    m = tmp;
    tmp = sw;
    composite();
    if (!any && !hold && since > 1000) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || opts.reduced || !visible) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // A one-off scripted rub on first view, so the gesture explains itself.
  let introRaf = 0;
  function intro() {
    if (introDone || opts.reduced) return;
    introDone = true;
    const t0 = performance.now();
    let px = w * 0.2;
    let py = h * 0.55;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1300);
      const x = w * (0.2 + 0.6 * k);
      const y = h * (0.55 + Math.sin(k * Math.PI * 2.2) * 0.16);
      segment(px, py, x, y);
      px = x;
      py = y;
      if (k < 1) introRaf = requestAnimationFrame(step);
    };
    introRaf = requestAnimationFrame(step);
  }

  // ---------- input ----------
  let prev: { x: number; y: number } | null = null;
  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onMove = (e: PointerEvent) => {
    // Mouse rubs on hover; touch and pen rub while pressed.
    if (e.pointerType !== "mouse" && !(e.buttons & 1)) return;
    const p = local(e);
    if (prev) {
      segment(prev.x, prev.y, p.x, p.y);
      opts.onRub?.();
    }
    prev = p;
  };
  const onDown = (e: PointerEvent) => {
    prev = local(e);
    if (e.pointerType !== "mouse") canvas.setPointerCapture(e.pointerId);
    segment(prev.x, prev.y, prev.x + 0.1, prev.y);
  };
  const onEnd = () => (prev = null);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onEnd);
  canvas.addEventListener("pointercancel", onEnd);
  canvas.addEventListener("pointerleave", onEnd);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (!visible) stop();
      else {
        start();
        window.setTimeout(intro, 500);
      }
    },
    { threshold: 0.5 },
  );
  io.observe(canvas);
  // Theme flips repaint the drawing in the new ink.
  const mo = new MutationObserver(() => {
    paintBlueprint();
    composite();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  resize();

  return {
    setHold(on: boolean) {
      hold = on;
      lastRub = performance.now();
      if (opts.reduced) {
        m.fill(on ? 1 : 0);
        composite();
        return;
      }
      if (on) sweep = 0;
      start();
    },
    destroy() {
      stop();
      cancelAnimationFrame(introRaf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onEnd);
      canvas.removeEventListener("pointercancel", onEnd);
      canvas.removeEventListener("pointerleave", onEnd);
    },
  };
}
