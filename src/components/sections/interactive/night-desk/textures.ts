import * as THREE from "three";
import { AGENTS, SCRIPT, type AgentLine } from "./copy";

/* Canvas-drawn surfaces: everything that reads as drawing on paper or a screen. */

const INK = "#1d1a16";
const CREAM = "#efe8d8";
const GOLD = "#e0ad52";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function tex(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Seeded random, so the city and the scribbles are the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shaky hand-drawn line through points (the pen never lands exactly where it means to). */
function scribble(g: CanvasRenderingContext2D, pts: [number, number][], r: () => number, j = 1) {
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const px = x + (r() - 0.5) * j;
    const py = y + (r() - 0.5) * j;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  });
  g.stroke();
}

/**
 * The skyline as data: R = building mask, G = lit window, B = each window's flicker phase.
 * Bangkok-ish: a dense mid-rise band, a few towers, one stepped tower with a spire.
 */
export function cityTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 512;
  const [c, g] = canvas(W, H);
  const r = rng(7);
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "lighter";
  const base = H * 0.8; // river bank, where buildings stand (the river is drawn by the shader)
  const building = (x: number, w: number, h: number, step = 0) => {
    g.fillStyle = "rgb(255,0,0)";
    g.fillRect(x, base - h, w, h);
    if (step) {
      g.fillRect(x + w * 0.18, base - h - step, w * 0.64, step);
      g.fillRect(x + w * 0.38, base - h - step * 2.2, w * 0.24, step * 1.2);
    }
    // Windows: a grid, most of them lit at night.
    const cw = 6 + Math.floor(r() * 3);
    const ch = 9 + Math.floor(r() * 4);
    const busy = 0.1 + r() * 0.38;
    for (let yy = base - h + 8; yy < base - 6; yy += ch) {
      for (let xx = x + 4; xx < x + w - 6; xx += cw) {
        if (r() > busy) continue;
        const b = Math.floor(r() * 255);
        g.fillStyle = `rgb(0,${150 + Math.floor(r() * 105)},${b})`;
        g.fillRect(xx, yy, 3, 4);
      }
    }
  };
  // Far band, then mid band, then a few towers in front.
  for (let x = -20; x < W;) {
    const w = 30 + r() * 60;
    building(x, w, 50 + r() * 70);
    x += w * (0.7 + r() * 0.4);
  }
  for (let x = 0; x < W;) {
    const w = 24 + r() * 50;
    building(x, w, 70 + r() * 110);
    x += w + r() * 30;
  }
  const towers = [180, 420, 610, 1290, 1530, 1760, 1930];
  for (const x of towers) building(x, 40 + r() * 30, 180 + r() * 120);
  // The landmark: a tall stepped tower with a spire, a little right of centre.
  building(1180, 70, 300, 26);
  g.fillStyle = "rgb(255,0,0)";
  g.fillRect(1213, base - 300 - 26 * 2.2 - 70, 4, 70);
  g.fillStyle = "rgb(0,255,200)";
  g.fillRect(1212, base - 300 - 26 * 2.2 - 74, 6, 6);
  // The elevated train line along the bank.
  g.fillStyle = "rgb(255,0,0)";
  g.fillRect(0, H * 0.745, W, 3);
  for (let x = 30; x < W; x += 120) g.fillRect(x, H * 0.745, 4, base - H * 0.745);
  // The far bank's lamps along the water.
  for (let x = 0; x < W; x += 14 + r() * 20) {
    g.fillStyle = `rgb(0,255,${Math.floor(r() * 255)})`;
    g.fillRect(x, base - 3, 3, 3);
  }
  const t = tex(c, false);
  t.wrapS = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

/** Keyboard top: dark keys with cream outlines. */
export function keyboardTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 320);
  const r = rng(3);
  g.fillStyle = "#1b1f2b";
  g.fillRect(0, 0, 1024, 320);
  g.strokeStyle = "#cfc6b3";
  g.lineWidth = 2.4;
  const rows = [14, 14, 13, 12, 8];
  rows.forEach((n, ri) => {
    const y = 18 + ri * 59;
    const keyW = (1024 - 36) / 14.6;
    let x = 18 + ri * 10;
    for (let k = 0; k < n; k++) {
      const wide = ri === 4 && k === 3 ? 5.2 : 1;
      const w = keyW * wide - 8;
      g.beginPath();
      g.roundRect(x + (r() - 0.5) * 1.5, y + (r() - 0.5) * 1.5, w, 48, 7);
      g.stroke();
      x += keyW * wide;
    }
  });
  return tex(c);
}

/** The phone's rotary dial: gold face, ink finger holes. */
export function dialTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#d9a64b";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.beginPath();
  g.arc(128, 128, 118, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 4;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI * 0.3 + (i / 10) * Math.PI * 1.65;
    g.beginPath();
    g.arc(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82, 19, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.arc(128, 128, 40, 0, Math.PI * 2);
  g.fillStyle = "#f2e6c8";
  g.fill();
  g.stroke();
  return tex(c);
}

/** A framed ink study of a leaf (left wall). */
export function leafArtTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 340);
  const r = rng(11);
  g.fillStyle = "#151a26";
  g.fillRect(0, 0, 256, 340);
  g.strokeStyle = CREAM;
  g.lineWidth = 2;
  g.strokeRect(18, 18, 220, 304);
  g.lineWidth = 2.6;
  scribble(
    g,
    [
      [128, 300],
      [124, 230],
      [126, 160],
      [132, 70],
    ],
    r,
    1.5,
  );
  for (let i = 0; i < 7; i++) {
    const y = 270 - i * 30;
    const s = 1 - i * 0.09;
    for (const side of [-1, 1]) {
      const tipX = 128 + side * 80 * s;
      const tipY = y - 40 * s;
      g.beginPath();
      g.moveTo(127, y);
      g.quadraticCurveTo(128 + side * 60 * s, y + 6, tipX, tipY);
      g.quadraticCurveTo(128 + side * 30 * s, y - 34 * s, 127, y);
      g.stroke();
    }
  }
  return tex(c);
}

/** A polaroid with a tiny gold skyline sketch. */
export function polaroidTexture(seed: number): THREE.CanvasTexture {
  const [c, g] = canvas(200, 240);
  const r = rng(seed);
  g.fillStyle = "#e9e1cf";
  g.fillRect(0, 0, 200, 240);
  g.fillStyle = "#121726";
  g.fillRect(14, 14, 172, 170);
  g.strokeStyle = GOLD;
  g.lineWidth = 2;
  for (let x = 20; x < 180;) {
    const w = 10 + r() * 22;
    const h = 30 + r() * (seed % 2 ? 110 : 70);
    g.strokeRect(x, 170 - h, w, h);
    x += w + 2;
  }
  if (seed % 2 === 0) {
    // A temple roof line.
    scribble(
      g,
      [
        [60, 120],
        [100, 60],
        [140, 120],
      ],
      r,
      2,
    );
    scribble(
      g,
      [
        [70, 120],
        [100, 82],
        [130, 120],
      ],
      r,
      2,
    );
  }
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  scribble(
    g,
    [
      [40, 210],
      [90, 207],
      [140, 211],
    ],
    r,
    2,
  );
  return tex(c);
}

/** A sticky note with a few lines of scribble. */
export function noteTexture(seed: number, color = "#e8d9a8"): THREE.CanvasTexture {
  const [c, g] = canvas(160, 160);
  const r = rng(seed);
  g.fillStyle = color;
  g.fillRect(0, 0, 160, 160);
  g.strokeStyle = INK;
  g.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const y = 34 + i * 28;
    scribble(
      g,
      [
        [18, y],
        [50 + r() * 30, y + r() * 3],
        [80 + r() * 60, y + r() * 2],
      ],
      r,
      3,
    );
  }
  return tex(c);
}

/* ------------------------------------------------------------------ */

/**
 * The notepad: ruled paper, and the call's waveform inked across it in gold as the greeting
 * plays (or all at once under reduced motion).
 */
export class Notepad {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private g: CanvasRenderingContext2D;
  private env: number[] = [];
  private label = "";
  private drawn = -1;

  constructor() {
    const [c, g] = canvas(768, 560);
    this.canvas = c;
    this.g = g;
    this.texture = tex(c);
    this.draw(0);
  }

  setWave(env: number[], label: string) {
    this.env = env;
    this.label = label;
    this.drawn = -1;
  }

  /** Paint the page with the waveform drawn up to `p` (0..1). */
  draw(p: number) {
    const q = Math.round(p * 400);
    if (q === this.drawn) return;
    this.drawn = q;
    const { g } = this;
    const W = 768;
    const H = 560;
    g.fillStyle = "#ece4d0";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(60,70,95,0.28)";
    g.lineWidth = 2;
    for (let y = 120; y < H - 20; y += 44) {
      g.beginPath();
      g.moveTo(30, y);
      g.lineTo(W - 30, y);
      g.stroke();
    }
    g.strokeStyle = "rgba(160,60,50,0.35)";
    g.beginPath();
    g.moveTo(84, 70);
    g.lineTo(84, H - 10);
    g.stroke();
    // Spiral binding along the top.
    g.strokeStyle = INK;
    g.lineWidth = 4;
    for (let x = 50; x < W - 30; x += 38) {
      g.beginPath();
      g.ellipse(x, 30, 9, 18, 0, 0, Math.PI * 2);
      g.stroke();
    }
    if (this.label) {
      g.fillStyle = "rgba(29,26,22,0.75)";
      g.font = "600 30px ui-monospace, Menlo, monospace";
      g.fillText(this.label, 104, 102);
    }
    if (!this.env.length || p <= 0) {
      this.texture.needsUpdate = true;
      return;
    }
    const x0 = 100;
    const x1 = W - 50;
    const mid = 300;
    const n = this.env.length;
    const upto = Math.max(1, Math.floor(n * Math.min(1, p)));
    g.strokeStyle = "#b07a1e";
    g.lineWidth = 4.5;
    g.lineJoin = "round";
    g.beginPath();
    let tipX = x0;
    let tipY = mid;
    for (let i = 0; i < upto; i++) {
      const x = x0 + ((x1 - x0) * i) / (n - 1);
      const a = this.env[i] * 150 * (i % 2 ? -1 : 1);
      tipX = x;
      tipY = mid + a;
      if (i === 0) g.moveTo(x, mid);
      else g.lineTo(x, tipY);
    }
    g.stroke();
    if (p < 1) {
      g.fillStyle = "#7a520f";
      g.beginPath();
      g.arc(tipX, tipY, 7, 0, Math.PI * 2);
      g.fill();
    }
    this.texture.needsUpdate = true;
  }
}

/* ------------------------------------------------------------------ */

/**
 * The cat doodle on a sticky note (right wall). Its eyes follow the pointer, the tail swishes,
 * it blinks, it jumps when the phone rings or when poked, and its eyes glow gold in the dark.
 */
export class CatDoodle {
  readonly texture: THREE.CanvasTexture;
  private g: CanvasRenderingContext2D;
  look = { x: 0, y: 0 };
  glow = 0;
  /** 0..1 spring-driven hop (set `kick` to start one). */
  hop = 0;
  private hopV = 0;
  private blink = 0;
  private nextBlink = 2;
  private t = 0;
  private acc = 0;
  stretch = 0;

  constructor() {
    const [c, g] = canvas(320, 320);
    this.g = g;
    this.texture = tex(c);
    this.draw();
  }

  kick(strength = 1) {
    this.hopV += 7 * strength;
  }

  update(dt: number, still = false) {
    this.t += dt;
    this.hopV += (-this.hop * 120 - this.hopV * 9) * dt;
    this.hop += this.hopV * dt;
    this.nextBlink -= dt;
    if (this.nextBlink < 0) {
      this.blink = 1;
      this.nextBlink = 2.5 + Math.random() * 4;
    }
    this.blink = Math.max(0, this.blink - dt * 7);
    this.stretch = Math.max(0, this.stretch - dt * 0.6);
    // Redraw at about 20 fps: it is a doodle, a little stepping suits it.
    this.acc += dt;
    if (this.acc > 0.05 || still) {
      this.acc = 0;
      this.draw();
    }
  }

  draw() {
    const g = this.g;
    g.fillStyle = "#e6d39c";
    g.fillRect(0, 0, 320, 320);
    g.save();
    g.translate(160, 196 - Math.max(0, this.hop) * 30);
    g.strokeStyle = INK;
    g.lineWidth = 6;
    g.lineCap = "round";
    g.lineJoin = "round";
    const sx = 1 + this.stretch * 0.25;
    g.scale(sx, 1 - this.stretch * 0.15);
    // Body (a pear) and head.
    g.beginPath();
    g.moveTo(-34, 80);
    g.bezierCurveTo(-62, 70, -58, 4, -26, -10);
    g.moveTo(34, 80);
    g.bezierCurveTo(62, 70, 58, 4, 26, -10);
    g.moveTo(-34, 80);
    g.lineTo(34, 80);
    g.stroke();
    g.beginPath();
    g.ellipse(0, -40, 46, 38, 0, 0, Math.PI * 2);
    g.stroke();
    // Ears: they flatten a little mid-hop.
    const ear = 34 - Math.max(0, this.hop) * 10;
    g.beginPath();
    g.moveTo(-38, -58);
    g.lineTo(-34, -58 - ear);
    g.lineTo(-12, -74);
    g.moveTo(38, -58);
    g.lineTo(34, -58 - ear);
    g.lineTo(12, -74);
    g.stroke();
    // Tail swish.
    const sw = Math.sin(this.t * 2.2) * 0.6 + Math.sin(this.t * 0.7) * 0.3;
    g.beginPath();
    g.moveTo(36, 74);
    g.bezierCurveTo(90, 76, 96 + sw * 20, 20, 74 + sw * 30, -6);
    g.stroke();
    // Whiskers and nose.
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-14, -26);
    g.lineTo(-48, -30);
    g.moveTo(-14, -22);
    g.lineTo(-46, -16);
    g.moveTo(14, -26);
    g.lineTo(48, -30);
    g.moveTo(14, -22);
    g.lineTo(46, -16);
    g.stroke();
    g.beginPath();
    g.moveTo(-5, -30);
    g.lineTo(5, -30);
    g.lineTo(0, -24);
    g.closePath();
    g.fillStyle = INK;
    g.fill();
    // Eyes: follow the pointer, blink, glow gold when the lamp is off.
    const lx = Math.max(-1, Math.min(1, this.look.x)) * 6;
    const ly = Math.max(-1, Math.min(1, this.look.y)) * 4;
    const open = 1 - this.blink;
    for (const ex of [-18, 18]) {
      if (this.glow > 0.05) {
        g.fillStyle = `rgba(240,180,70,${0.35 + this.glow * 0.65})`;
        g.beginPath();
        g.ellipse(ex, -46, 10, 10 * Math.max(0.12, open), 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(ex + lx, -46 + ly, 5, 6 * Math.max(0.12, open), 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    this.texture.needsUpdate = true;
  }
}

/* ------------------------------------------------------------------ */

type Ticket = { from: number; to: number; t: number; text: string };
type PaneLine = { text: string; kind?: AgentLine["kind"]; typed: number };

/**
 * The ultrawide monitor: three agent panes typing their part of a task and handing it on (a
 * gold ticket flies between panes). Script in ./copy.ts; fictional work, readable when zoomed.
 */
export class AgentScreen {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private g: CanvasRenderingContext2D;
  private panes: PaneLine[][] = [[], [], []];
  private task = 0;
  private line = 0;
  private wait = 0.8;
  private ticket: Ticket | null = null;
  private acc = 0;
  private t = 0;
  private font: string;
  /** Typing speed multiplier (the zoomed-in view types a little slower, so it can be read). */
  speed = 1;

  constructor(font: string) {
    const [c, g] = canvas(2048, 784);
    this.canvas = c;
    this.g = g;
    this.font = font;
    this.texture = tex(c);
    this.texture.anisotropy = 8;
    // Start mid-task so the screen is never empty.
    for (let i = 0; i < 6; i++) this.pushLine(SCRIPT[2][i], true);
    this.task = 0;
    this.draw();
  }

  private pushLine(l: AgentLine, done = false) {
    const pane = this.panes[l.pane];
    pane.push({ text: l.text, kind: l.kind, typed: done ? l.text.length : 0 });
    if (pane.length > 15) pane.shift();
  }

  private current(): PaneLine | undefined {
    const l = SCRIPT[this.task][this.line - 1];
    if (!l) return undefined;
    const pane = this.panes[l.pane];
    return pane[pane.length - 1];
  }

  /** Advance the script; redraws at about 24 fps. */
  update(dt: number, visible: boolean) {
    this.t += dt;
    const step = dt * this.speed;
    const cur = this.current();
    if (cur && cur.typed < cur.text.length) {
      cur.typed = Math.min(cur.text.length, cur.typed + step * (cur.kind === "dim" ? 70 : 34));
    } else if (this.ticket) {
      this.ticket.t += step / 0.9;
      if (this.ticket.t >= 1) this.ticket = null;
    } else {
      this.wait -= step;
      if (this.wait <= 0) this.next();
    }
    this.acc += dt;
    if (visible && this.acc > 1 / 24) {
      this.acc = 0;
      this.draw();
    }
  }

  private next() {
    const task = SCRIPT[this.task];
    const prev = task[this.line - 1];
    if (prev?.kind === "hand") {
      // Hand-offs go to the pane named on the line ("-> builder").
      const to = AGENTS.findIndex((a) => prev.text.includes(a));
      if (to >= 0 && to !== prev.pane && !this.handed) {
        this.handed = true;
        this.ticket = { from: prev.pane, to, t: 0, text: prev.text.replace(/^->\s*\w+:\s*/, "") };
        return;
      }
    }
    this.handed = false;
    if (this.line >= task.length) {
      this.task = (this.task + 1) % SCRIPT.length;
      this.line = 0;
      this.wait = 1.4;
      for (const p of this.panes) p.push({ text: "", typed: 0 });
      return;
    }
    const l = task[this.line++];
    this.pushLine(l);
    this.wait = l.kind === "ok" ? 0.9 : l.kind === "hand" ? 0.25 : 0.45;
  }
  private handed = false;

  /** Which pane is busy right now (0..2), for the status dots. */
  private busy(): number {
    const l = SCRIPT[this.task][Math.max(0, this.line - 1)];
    return l?.pane ?? 0;
  }

  draw() {
    const g = this.g;
    const W = 2048;
    const H = 784;
    g.fillStyle = "#070a12";
    g.fillRect(0, 0, W, H);
    const gap = 16;
    const pw = (W - gap * 4) / 3;
    const busy = this.busy();
    for (let p = 0; p < 3; p++) {
      const x = gap + p * (pw + gap);
      const y = gap;
      const h = H - gap * 2;
      g.fillStyle = "#0d1220";
      g.beginPath();
      g.roundRect(x, y, pw, h, 14);
      g.fill();
      g.strokeStyle = p === busy ? "rgba(224,173,82,0.7)" : "rgba(239,232,216,0.16)";
      g.lineWidth = 3;
      g.stroke();
      // Title bar.
      g.fillStyle = p === busy ? GOLD : "rgba(239,232,216,0.35)";
      g.beginPath();
      g.arc(x + 34, y + 38, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(239,232,216,0.9)";
      g.font = `600 34px ${this.font}`;
      g.fillText(AGENTS[p], x + 58, y + 50);
      g.fillStyle = "rgba(239,232,216,0.35)";
      g.font = `400 26px ${this.font}`;
      g.fillText(p === busy ? "working" : "idle", x + pw - 120, y + 50);
      g.fillStyle = "rgba(239,232,216,0.08)";
      g.fillRect(x + 16, y + 74, pw - 32, 2);
      // Lines, newest at the bottom.
      g.font = `400 27px ${this.font}`;
      g.save();
      g.beginPath();
      g.rect(x + 8, y + 80, pw - 16, h - 90);
      g.clip();
      const lines = this.panes[p];
      const lh = 43;
      let ly = y + 128;
      const start = Math.max(0, lines.length - 14);
      for (let i = start; i < lines.length; i++) {
        const l = lines[i];
        const text = l.text.slice(0, Math.floor(l.typed));
        g.fillStyle =
          l.kind === "ok"
            ? "#9fd3a8"
            : l.kind === "hand"
              ? GOLD
              : l.kind === "dim"
                ? "rgba(239,232,216,0.45)"
                : l.kind === "cmd"
                  ? "rgba(239,232,216,0.98)"
                  : "rgba(239,232,216,0.78)";
        if (text) g.fillText((l.kind === "cmd" ? "$ " : "  ") + text, x + 26, ly);
        const typing = l.typed < l.text.length;
        if (typing || (i === lines.length - 1 && p === busy && Math.sin(this.t * 7) > 0)) {
          const w = g.measureText((l.kind === "cmd" ? "$ " : "  ") + text).width;
          g.fillStyle = GOLD;
          g.fillRect(x + 28 + w, ly - 24, 14, 30);
        }
        ly += lh;
      }
      g.restore();
    }
    // The hand-off ticket arcing between panes.
    if (this.ticket) {
      const { from, to, t, text } = this.ticket;
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const ax = gap + from * (pw + gap) + pw * 0.5;
      const bx = gap + to * (pw + gap) + pw * 0.5;
      const cx = ax + (bx - ax) * e;
      const cy = H * 0.55 - Math.sin(e * Math.PI) * 220;
      g.font = `600 28px ${this.font}`;
      const w = g.measureText(text).width + 48;
      g.save();
      g.translate(cx, cy);
      g.rotate((bx > ax ? 1 : -1) * Math.sin(e * Math.PI) * 0.08);
      g.shadowColor = "rgba(224,173,82,0.6)";
      g.shadowBlur = 30;
      g.fillStyle = GOLD;
      g.beginPath();
      g.roundRect(-w / 2, -30, w, 60, 30);
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = "#1b1407";
      g.fillText(text, -w / 2 + 24, 10);
      g.restore();
    }
    this.texture.needsUpdate = true;
  }
}
