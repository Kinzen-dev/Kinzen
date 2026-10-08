import { rgba, mix, type Palette, type Rng } from "./ink";
import { at, type Layout, type Pt } from "./world";

/*
 * The soi's people. Walkers steer in walkway space (s along the soi, v across it in px) with
 * Reynolds' behaviours: wander with pauses while idle, arrive at a target when they have a job,
 * separation from each other (and from the sleeping dog), soft walls at the walkway edges.
 * Keepers stand behind their stalls; a monk keeps the bell. Figures are drawn as dark
 * silhouettes with a cream outline, the way the concept frame draws them.
 */

export type Role = "walker" | "keeper" | "monk";
export type Hat = "none" | "cone" | "cap" | "bun" | "band";
export type Emote = { kind: "!" | "x" | "ok" | "chat"; t: number; dur: number };

export type Item = {
  id: number;
  kind: "coin" | "shard";
  part: number;
  x: number;
  y: number;
  holder: Agent | null;
  /** In flight between hands or to a point: eased arc from (x0, y0) to a moving target. */
  fly: { x0: number; y0: number; t: number; dur: number; lift: number; to: () => Pt; done: () => void } | null;
  /** Falling onto the street. */
  drop: { vy: number; ground: number; bounces: number } | null;
  /** Where it rests on the walkway when lying there. */
  rest: { s: number; d: number } | null;
  spin: number;
  flag: "none" | "stopped" | "redone";
  flash: number;
  alpha: number;
};

export type Agent = {
  id: number;
  role: Role;
  s: number;
  /** Across the walkway in px (0 = shopfronts, depth = canal side). */
  v: number;
  vs: number;
  vv: number;
  max: number;
  target: { s: number; v: number } | null;
  arrived: boolean;
  busy: boolean;
  anchor: number;
  zone: number;
  wander: number;
  pause: number;
  walk: number;
  face: 1 | -1;
  /** Face this way while standing (keepers, the monk, chatting walkers). */
  faceHold: 1 | -1 | 0;
  hold: Item | null;
  emote: Emote | null;
  bump: number;
  /** Arm reach for a handoff (0..1), and the keeper's busy hands. */
  reach: number;
  reachT: number;
  work: number;
  /** Walking back to its own stretch of the soi after a job. */
  homing: boolean;
  hat: Hat;
  pack: boolean;
  /** Last drawn hand position (where a held item sits). */
  hand: Pt;
  stall: number;
};

export function makeAgent(id: number, role: Role, s: number, v: number, r: Rng): Agent {
  return {
    id,
    role,
    s,
    v,
    vs: 0,
    vv: 0,
    max: 1,
    target: null,
    arrived: false,
    busy: false,
    anchor: s,
    zone: 120,
    wander: r() * Math.PI * 2,
    pause: r() * 2,
    walk: r() * 6,
    face: r() < 0.5 ? 1 : -1,
    faceHold: 0,
    hold: null,
    emote: null,
    bump: 0,
    reach: 0,
    reachT: 0,
    work: 0,
    homing: false,
    hat:
      role === "keeper"
        ? r() < 0.6
          ? "cone"
          : "band"
        : role === "monk"
          ? "none"
          : r() < 0.3
            ? "cap"
            : r() < 0.55
              ? "bun"
              : "none",
    pack: role === "walker" && r() < 0.7,
    hand: { x: 0, y: 0 },
    stall: -1,
  };
}

export type Obstacle = { s: number; v: number; r: number };

/** One steering step for every walker. Speeds in px/s; `depth` is the walkway depth in px. */
export function steer(agents: Agent[], obstacles: Obstacle[], l: Layout, dt: number, r: Rng) {
  const depth = l.dv.y;
  const base = l.fig * 2.2;
  for (const a of agents) {
    if (a.role !== "walker") continue;
    let fs = 0;
    let fv = 0;
    const max = base * a.max;
    if (a.target) {
      const ds = a.target.s - a.s;
      const dv = a.target.v - a.v;
      const dd = Math.hypot(ds, dv);
      const slow = l.fig * 1.1;
      const want = dd < 1.5 ? 0 : max * Math.min(1, dd / slow);
      const ds0 = dd ? (ds / dd) * want : 0;
      const dv0 = dd ? (dv / dd) * want : 0;
      fs += (ds0 - a.vs) * 6;
      fv += (dv0 - a.vv) * 6;
      a.arrived = dd < Math.max(4, l.fig * 0.16);
      if (a.arrived && a.homing) {
        a.target = null;
        a.homing = false;
      }
    } else {
      a.arrived = false;
      if (a.pause > 0) {
        a.pause -= dt;
        fs -= a.vs * 5;
        fv -= a.vv * 5;
      } else {
        // Wander: a heading that drifts; the walkway is long, so the wander favours its length.
        a.wander += (r() - 0.5) * 3.2 * dt;
        const ws = max * 0.38;
        fs += (Math.cos(a.wander) * ws - a.vs) * 1.6;
        fv += (Math.sin(a.wander) * ws * 0.45 - a.vv) * 1.6;
        // Home zone.
        const off = a.s - a.anchor;
        if (Math.abs(off) > a.zone) fs -= Math.sign(off) * max * 1.2;
        if (r() < dt * 0.22) {
          a.pause = 1 + r() * 3;
          if (r() < 0.5) a.wander += Math.PI;
        }
      }
    }
    // Separation from the others and from obstacles.
    const R = l.fig * 0.62;
    for (const b of agents) {
      if (b === a || b.role === "keeper") continue;
      const ds = a.s - b.s;
      const dv = a.v - b.v;
      const d2 = ds * ds + dv * dv;
      if (d2 > R * R || d2 < 1e-4) continue;
      const d = Math.sqrt(d2);
      const k = ((R - d) / R) * max * (a.target ? (b.target ? 1.4 : 2.6) : 4.5);
      fs += (ds / d) * k;
      fv += (dv / d) * k * 1.4;
    }
    for (const o of obstacles) {
      const ds = a.s - o.s;
      const dv = a.v - o.v;
      const d = Math.hypot(ds, dv);
      if (d > o.r || d < 1e-3) continue;
      const k = ((o.r - d) / o.r) * max * 6;
      fs += (ds / d) * k;
      fv += (dv / d) * k * 1.6;
    }
    // Soft walls at the walkway edges.
    const vMin = depth * 0.2;
    const vMax = depth * 0.95;
    if (a.v < vMin) fv += (vMin - a.v) * 14;
    if (a.v > vMax) fv -= (a.v - vMax) * 14;
    // Integrate with a force cap.
    const fm = Math.hypot(fs, fv);
    const cap = max * 7;
    if (fm > cap) {
      fs *= cap / fm;
      fv *= cap / fm;
    }
    a.vs += fs * dt;
    a.vv += fv * dt;
    const sp = Math.hypot(a.vs, a.vv);
    if (sp > max) {
      a.vs *= max / sp;
      a.vv *= max / sp;
    }
    // A bounce off the guardrail pushes back along the soi.
    if (a.bump > 0) {
      a.vs -= a.bump * max * 6 * dt;
      a.bump = Math.max(0, a.bump - dt * 2.2);
    }
    a.s = Math.max(4, Math.min(l.L - 6, a.s + a.vs * dt));
    a.v = Math.max(0, Math.min(depth, a.v + a.vv * dt));
    a.walk += (Math.hypot(a.vs, a.vv) * dt) / (l.fig * 0.085);
  }
}

/** Screen facing from walkway velocity (the path may run right to left). */
export function updateFacing(a: Agent, l: Layout) {
  if (a.faceHold) {
    a.face = a.faceHold;
    return;
  }
  const p0 = at(l, a.s, a.v / l.dv.y);
  const p1 = at(l, a.s + a.vs * 0.05, (a.v + a.vv * 0.05) / l.dv.y);
  const dx = p1.x - p0.x;
  if (Math.abs(dx) > 0.15) a.face = dx > 0 ? 1 : -1;
}

/* ----- drawing ---------------------------------------------------------------------------- */

const jit = (id: number, boil: number, k: number) => {
  const x = Math.sin(id * 12.9898 + boil * 78.233 + k * 37.719) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.7;
};

export function drawAgent(
  ctx: CanvasRenderingContext2D,
  a: Agent,
  p: Pt,
  h: number,
  P: Palette,
  t: number,
  boil: number,
) {
  const f = a.face;
  const sp = Math.min(1, Math.hypot(a.vs, a.vv) / (h * 1.2));
  const sw = Math.sin(a.walk) * 0.55 * sp;
  const bob = Math.abs(Math.cos(a.walk)) * h * 0.035 * sp;
  const x = p.x;
  const y = p.y;
  const dark = rgba(mix(P.night, [0, 0, 0], 0.25));
  const line = rgba(P.ink, 0.92);
  const lean = f * sp * h * 0.04;
  const hipY = y - h * 0.32 - bob;
  const shY = y - h * 0.63 - bob;
  const headY = y - h * 0.8 - bob;
  const headR = h * 0.135;
  const bw = h * 0.25;
  const limb = h * 0.085;
  const j = (k: number) => jit(a.id, boil, k);

  // Shadow on the ground.
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y + 1, h * 0.22, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hand target.
  let hx: number;
  let hy: number;
  const holding = !!a.hold && !a.hold.fly;
  if (a.reach > 0.01) {
    hx = x + f * h * (0.18 + 0.2 * a.reach);
    hy = shY + h * (0.16 - 0.1 * a.reach);
  } else if (holding) {
    hx = x + f * h * 0.12 + lean;
    hy = y - h * 1.04 - bob;
  } else if (a.role === "keeper" && a.work > 0) {
    hx = x + f * h * 0.26;
    hy = shY + h * 0.12 + Math.sin(t * 22) * h * 0.06;
  } else {
    hx = x - sw * h * 0.24 + f * h * 0.04;
    hy = shY + h * 0.3;
  }
  a.hand = { x: hx, y: hy };
  const back = { x: x + sw * h * 0.22 - f * h * 0.03, y: shY + h * 0.3 };
  const sh = { x: x + lean * 0.8, y: shY + h * 0.05 };
  const robe = a.role === "monk";

  const legs = (w: number, style: string) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      const fx = x + side * sw * h * 0.22;
      const kx = x + side * sw * h * 0.1 + f * h * 0.035;
      ctx.moveTo(x + lean * 0.3, hipY);
      ctx.quadraticCurveTo(kx, y - h * 0.15 - bob * 0.5, fx + f * h * 0.03, y - limb * 0.3);
    }
    ctx.stroke();
  };
  const arms = (w: number, style: string) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y);
    ctx.quadraticCurveTo((sh.x + hx) / 2 + f * h * 0.04, (sh.y + hy) / 2 + h * 0.02, hx, hy);
    if (holding && a.reach < 0.01) {
      // Both hands up for the coin.
      ctx.moveTo(sh.x, sh.y);
      ctx.quadraticCurveTo(sh.x - f * h * 0.06, (sh.y + hy) / 2, hx - f * h * 0.1, hy + h * 0.04);
    } else {
      ctx.moveTo(sh.x, sh.y);
      ctx.quadraticCurveTo((sh.x + back.x) / 2 - f * h * 0.03, (sh.y + back.y) / 2, back.x, back.y);
    }
    ctx.stroke();
  };
  const torso = () => {
    ctx.beginPath();
    const top = shY - h * 0.03;
    const bot = robe ? y - h * 0.1 : hipY + h * 0.04;
    const tw = robe ? bw * 1.2 : bw;
    ctx.moveTo(x - tw / 2 + lean + j(1), top);
    ctx.quadraticCurveTo(x + lean, top - h * 0.05, x + tw / 2 + lean + j(2), top);
    ctx.lineTo(x + tw / 2 + (robe ? h * 0.06 : 0) + j(3), bot);
    ctx.quadraticCurveTo(x, bot + h * 0.04, x - tw / 2 - (robe ? h * 0.06 : 0) + j(4), bot);
    ctx.closePath();
  };
  const head = () => {
    ctx.beginPath();
    ctx.arc(x + lean + f * h * 0.01 + j(5), headY + j(6), headR, 0, Math.PI * 2);
  };
  const pack = () => {
    ctx.beginPath();
    const px = x - f * bw * 0.62 + lean * 0.6;
    ctx.roundRect(px - h * 0.08, shY + h * 0.02, h * 0.16, h * 0.25, h * 0.05);
  };

  // Outline pass (cream, thicker), then the dark silhouette over it.
  const o = 2.4;
  legs(limb + o, line);
  arms(limb * 0.85 + o, line);
  ctx.strokeStyle = line;
  ctx.lineWidth = o;
  torso();
  ctx.stroke();
  head();
  ctx.stroke();
  if (a.pack) {
    pack();
    ctx.stroke();
  }
  legs(limb, dark);
  arms(limb * 0.85, dark);
  ctx.fillStyle = robe ? rgba(mix(P.night, P.gold, 0.42)) : dark;
  torso();
  ctx.fill();
  if (robe) {
    // A sash across the robe.
    ctx.strokeStyle = rgba(mix(P.night, P.gold, 0.7));
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.5, shY);
    ctx.lineTo(x + bw * 0.55, shY + h * 0.35);
    ctx.stroke();
  }
  ctx.fillStyle = dark;
  head();
  ctx.fill();
  if (a.pack) {
    ctx.fillStyle = dark;
    pack();
    ctx.fill();
    ctx.strokeStyle = rgba(P.ink, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - f * bw * 0.2 + lean, shY);
    ctx.lineTo(x - f * bw * 0.32 + lean, shY + h * 0.22);
    ctx.stroke();
  }
  // Eye (and the hint of a smile on keepers).
  const hxc = x + lean + f * h * 0.01;
  ctx.fillStyle = line;
  ctx.beginPath();
  ctx.arc(hxc + f * headR * 0.45, headY - headR * 0.1, h * 0.022, 0, Math.PI * 2);
  ctx.fill();
  // Hats.
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.3;
  if (a.hat === "cone") {
    ctx.fillStyle = rgba(mix(P.night, P.ink, 0.12));
    ctx.beginPath();
    ctx.moveTo(hxc - headR * 1.9, headY - headR * 0.35);
    ctx.lineTo(hxc + j(7), headY - headR * 1.75);
    ctx.lineTo(hxc + headR * 1.9, headY - headR * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (a.hat === "cap") {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(hxc, headY - headR * 0.15, headR * 1.02, Math.PI, 0);
    ctx.lineTo(hxc + f * headR * 1.7, headY - headR * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (a.hat === "bun") {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(hxc - f * headR * 0.55, headY - headR * 1.05, headR * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (a.hat === "band") {
    ctx.strokeStyle = rgba(P.gold, 0.85);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(hxc, headY, headR * 1.02, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  // Keeper's apron.
  if (a.role === "keeper") {
    ctx.strokeStyle = rgba(P.ink, 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.28 + lean, shY + h * 0.12);
    ctx.lineTo(x + bw * 0.3 + lean, shY + h * 0.12);
    ctx.stroke();
  }
  // The monk's mallet when striking.
  if (robe && a.reach > 0.01) {
    ctx.strokeStyle = rgba(P.ink, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + f * h * 0.2, hy - h * 0.12);
    ctx.stroke();
  }
}

export function drawEmote(ctx: CanvasRenderingContext2D, a: Agent, p: Pt, h: number, P: Palette, t: number) {
  const e = a.emote;
  if (!e) return;
  const k = Math.min(1, (t - e.t) / 0.15) * Math.min(1, (e.t + e.dur - t) / 0.3);
  if (k <= 0) return;
  const x = p.x + a.face * h * 0.25;
  const y = p.y - h * 1.35 - (1 - k) * 4;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  if (e.kind === "!") {
    ctx.strokeStyle = rgba(P.gold, 1);
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.22);
    ctx.lineTo(x + 0.6, y - h * 0.05);
    ctx.stroke();
    ctx.fillStyle = rgba(P.gold, 1);
    ctx.beginPath();
    ctx.arc(x + 0.7, y + h * 0.03, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === "x") {
    const s = h * 0.1;
    ctx.strokeStyle = rgba(P.ink, 1);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s - h * 0.08);
    ctx.lineTo(x + s, y + s - h * 0.08);
    ctx.moveTo(x + s, y - s - h * 0.08);
    ctx.lineTo(x - s, y + s - h * 0.08);
    ctx.stroke();
  } else if (e.kind === "ok") {
    const s = h * 0.1;
    ctx.strokeStyle = rgba(P.gold, 1);
    ctx.beginPath();
    ctx.moveTo(x - s, y - h * 0.08);
    ctx.lineTo(x - s * 0.2, y + s * 0.8 - h * 0.08);
    ctx.lineTo(x + s * 1.3, y - s * 1.2 - h * 0.08);
    ctx.stroke();
  } else {
    ctx.fillStyle = rgba(P.ink, 0.85);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - 4 + i * 4, y - h * 0.06 + Math.sin(t * 6 + i) * 0.8, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A coin or one third of it, in gold with an ink edge. */
export function drawItem(
  ctx: CanvasRenderingContext2D,
  it: Item,
  x: number,
  y: number,
  size: number,
  P: Palette,
  glow: HTMLCanvasElement,
) {
  ctx.save();
  ctx.globalAlpha = it.alpha;
  ctx.globalCompositeOperation = "lighter";
  const g = size * (4.2 + it.flash * 5);
  ctx.globalAlpha = it.alpha * (0.45 + it.flash * 0.5);
  ctx.drawImage(glow, x - g, y - g, g * 2, g * 2);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = it.alpha;
  ctx.translate(x, y);
  const squash = Math.abs(Math.cos(it.spin));
  ctx.scale(Math.max(0.12, squash), 1);
  const gold = rgba(mix(P.gold, [255, 240, 200], 0.15 + it.flash * 0.5));
  const deep = rgba(mix(P.gold, [60, 40, 10], 0.45));
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = rgba(mix(P.gold, [40, 25, 5], 0.6));
  if (it.kind === "coin") {
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = deep;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    // A tiny square hole, like an old coin.
    ctx.fillStyle = deep;
    ctx.fillRect(-size * 0.16, -size * 0.16, size * 0.32, size * 0.32);
  } else {
    const a0 = -Math.PI / 2 + it.part * ((Math.PI * 2) / 3);
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size * 0.92, a0 + 0.08, a0 + (Math.PI * 2) / 3 - 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (it.flag === "stopped") {
      // A crack: what the gate caught.
      ctx.strokeStyle = deep;
      ctx.lineWidth = 1.1;
      const am = a0 + Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(am) * size * 0.2, Math.sin(am) * size * 0.2);
      ctx.lineTo(Math.cos(am + 0.3) * size * 0.5, Math.sin(am + 0.3) * size * 0.5);
      ctx.lineTo(Math.cos(am - 0.2) * size * 0.8, Math.sin(am - 0.2) * size * 0.8);
      ctx.stroke();
    }
  }
  ctx.restore();
}
