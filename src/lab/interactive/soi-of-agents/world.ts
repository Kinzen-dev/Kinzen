import {
  between,
  curve,
  glowSprite,
  lines,
  mix,
  pick,
  poly,
  ring,
  rgba,
  rng,
  seg,
  type Palette,
  type Rng,
} from "./ink";

/*
 * The soi: one walkway (a path with depth), shophouses behind it, stalls along it, a gold gate
 * across it and a temple with a bell at its end. Every position on the walkway is (s, d): s is
 * the arc length along the far edge, d runs 0 (shopfronts) to 1 (canal side). A laptop lays the
 * path out as one long street; a phone folds it into two terraces joined by a stair, so the soi
 * climbs the screen toward the temple. The view is a cabinet oblique: fronts face us, depth
 * slides down and a little to the right.
 */

export type Pt = { x: number; y: number };

export type StallKind = "noodle" | "fruit" | "satay" | "garland" | "drinks";

export type Stall = {
  s: number;
  kind: StallKind;
  w: number;
  /** Sprite of the cart front (drawn over its keeper), placed at `x, y` in CSS px. */
  sprite: HTMLCanvasElement;
  sx: number;
  sy: number;
  /** Lamp under the awning (dynamic glow) and steam source. */
  lamp: Pt;
  steam: Pt | null;
};

export type Lantern = { x: number; y: number; size: number; phase: number; lit: number; target: number; litAt: number };

export type Layout = {
  W: number;
  H: number;
  phone: boolean;
  path: Pt[];
  cum: number[];
  L: number;
  /** Screen offset of the near edge (d = 1) from the far edge. */
  dv: Pt;
  /** Figure height in CSS px. */
  fig: number;
  stalls: Stall[];
  gateS: number;
  /** The coin can land anywhere before this s. */
  dropMax: number;
  stairS0: number;
  stairS1: number;
  bellS: number;
  /** Where the bell hangs (screen) and its size. */
  bell: Pt & { size: number };
  monkS: number;
  canalY: number;
  lanterns: Lantern[];
  /** Gate geometry (screen): far and near pillar feet, height. */
  gate: { far: Pt; near: Pt; farOut: Pt; nearOut: Pt; h: number };
  gateFront: { sprite: HTMLCanvasElement; x: number; y: number };
  /** Cat on a roof (tail flicks) and the soi dog (sleeps on the walkway). */
  cat: Pt;
  dogS: number;
  stars: { x: number; y: number; r: number; p: number }[];
  /** Spots on the canal that mirror the lantern light. */
  reflections: { x: number; w: number }[];
  /** Foreground leaves sprite (bottom corner). */
  leaves: { sprite: HTMLCanvasElement; x: number; y: number } | null;
};

export function makeLayout(
  W: number,
  H: number,
  phone: boolean,
): Omit<Layout, "stalls" | "gateFront" | "leaves" | "lanterns" | "stars" | "reflections" | "cat"> {
  let path: Pt[];
  let dv: Pt;
  let fig: number;
  let gateX: number;
  let bellX: number;
  let canalY: number;
  if (!phone) {
    const yF = Math.round(H * 0.69);
    const Wd = Math.round(H * 0.165);
    const rise = Math.round(H * 0.125);
    dv = { x: Wd * 0.42, y: Wd };
    path = [
      { x: -30, y: yF },
      { x: W * 0.765, y: yF },
      { x: W * 0.83, y: yF - rise },
      { x: W * 1.03, y: yF - rise },
    ];
    fig = Math.max(40, Math.min(58, H * 0.082));
    gateX = W * 0.69;
    bellX = W * 0.905;
    canalY = yF + Wd + 12;
  } else {
    const Wd = 56;
    const yF1 = Math.round(H * 0.74);
    const yF2 = Math.round(H * 0.39);
    const rise = Math.round(H * 0.07);
    dv = { x: Wd * 0.36, y: Wd };
    path = [
      { x: -30, y: yF1 },
      { x: W - 96, y: yF1 },
      { x: W - 50, y: yF2 },
      { x: W * 0.34, y: yF2 },
      { x: W * 0.22, y: yF2 - rise },
      { x: -30, y: yF2 - rise },
    ];
    fig = 34;
    gateX = W * 0.56;
    bellX = W * 0.1;
    canalY = yF1 + Wd + 12;
  }
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1]! + dist(path[i - 1]!, path[i]!));
  const L = cum[cum.length - 1]!;
  const sAtX = (x: number, leg: number) =>
    cum[leg]! +
    Math.abs(x - path[leg]!.x) * (dist(path[leg]!, path[leg + 1]!) / Math.abs(path[leg + 1]!.x - path[leg]!.x));
  const stairLeg = phone ? 3 : 1;
  const stairS0 = cum[stairLeg]!;
  const stairS1 = cum[stairLeg + 1]!;
  const gateS = sAtX(gateX, phone ? 2 : 0);
  const bellS = sAtX(bellX, phone ? 4 : 2);
  const base = { W, H, phone, path, cum, L, dv, fig, gateS, dropMax: gateS - 34, stairS0, stairS1, bellS, canalY };
  const b = at(base as Layout, bellS, 0.42);
  const size = fig * 0.46;
  // The gate is a small checkpoint pavilion across the walkway; its entry side is the guardrail.
  const gw = fig * 1.05;
  const gs0 = gateS - gw / 2;
  const gs1 = gateS + gw / 2;
  return {
    ...base,
    bell: { x: b.x, y: at(base as Layout, bellS, 0.86).y - 4 - fig * 2.45 + 2, size },
    monkS: bellS + (phone ? -fig * 1.35 : fig * 1.35),
    gate: {
      far: at(base as Layout, gs0, 0.03),
      near: at(base as Layout, gs0, 0.97),
      farOut: at(base as Layout, gs1, 0.03),
      nearOut: at(base as Layout, gs1, 0.97),
      h: fig * 2.25,
    },
    dogS: phone ? sAtX(W * 0.3, 0) : sAtX(W * 0.25, 0),
  };
}

export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/** Screen point of walkway position (s, d). */
export function at(l: Pick<Layout, "path" | "cum" | "dv">, s: number, d: number): Pt {
  const { path, cum, dv } = l;
  let i = 0;
  while (i < cum.length - 2 && s > cum[i + 1]!) i++;
  const a = path[i]!;
  const b = path[i + 1]!;
  const t = (s - cum[i]!) / (cum[i + 1]! - cum[i]! || 1);
  return { x: a.x + (b.x - a.x) * t + dv.x * d, y: a.y + (b.y - a.y) * t + dv.y * d };
}

/** Unit screen direction of increasing s at `s`. */
export function tangent(l: Pick<Layout, "path" | "cum">, s: number): Pt {
  const { path, cum } = l;
  let i = 0;
  while (i < cum.length - 2 && s > cum[i + 1]!) i++;
  const a = path[i]!;
  const b = path[i + 1]!;
  const n = dist(a, b) || 1;
  return { x: (b.x - a.x) / n, y: (b.y - a.y) / n };
}

/** Nearest walkway position to a screen point (coarse search, then refine). */
export function locate(l: Layout, x: number, y: number, sMax = l.L): { s: number; d: number } {
  let best = { s: 0, d: 0.5, e: Infinity };
  for (let s = 0; s <= sMax; s += 6) {
    for (const d of [0.2, 0.5, 0.8]) {
      const p = at(l, s, d);
      const e = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (e < best.e) best = { s, d, e };
    }
  }
  return { s: best.s, d: best.d };
}

/* ------------------------------------------------------------------------------------------
 * Painting the still layer. One canvas holds the sky, the skyline, the shophouses, wires, the
 * temple, the walkway and the canal bank; stall fronts and the gate's near side are separate
 * sprites so agents can walk behind them.
 * ---------------------------------------------------------------------------------------- */

type Ink = {
  ctx: CanvasRenderingContext2D;
  r: Rng;
  P: Palette;
  /** Fill colour for solid shapes (a navy a touch lighter than the night). */
  fill: string;
  deep: string;
  line: (alpha?: number, width?: number) => void;
  glows: { x: number; y: number; r: number; a: number; sy?: number }[];
};

function stroke(k: Ink, build: (p: Path2D) => void, alpha = 0.85, width = 1.35, color?: readonly number[]) {
  const p = new Path2D();
  build(p);
  k.ctx.strokeStyle = rgba(color ?? k.P.ink, alpha);
  k.ctx.lineWidth = width;
  k.ctx.stroke(p);
}
function fillPoly(k: Ink, pts: number[], style: string) {
  const p = new Path2D();
  poly(p, pts);
  k.ctx.fillStyle = style;
  k.ctx.fill(p);
}
function box(
  k: Ink,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.85,
  width = 1.35,
  fill: string | null = k.fill,
) {
  const pts = [x, y, x + w, y, x + w, y + h, x, y + h];
  if (fill) fillPoly(k, pts, fill);
  stroke(k, (p) => lines(p, pts, k.r, 1, true), alpha, width);
}

export function newCanvas(w: number, h: number, dpr: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  return [c, ctx];
}

export type Built = { layer: HTMLCanvasElement; world: Layout };

export function buildWorld(W: number, H: number, phone: boolean, dpr: number, P: Palette, seed: number): Built {
  const base = makeLayout(W, H, phone);
  const [layer, ctx] = newCanvas(W, H, dpr);
  const r = rng(seed);
  const k: Ink = {
    ctx,
    r,
    P,
    fill: rgba(mix(P.night, P.ink, 0.045)),
    deep: rgba(mix(P.night, [0, 0, 0], 0.35)),
    line: () => {},
    glows: [],
  };
  const lanterns: Lantern[] = [];
  const glow = glowSprite(P.gold);

  // Sky: night navy at the top, a dusk band low down, warm at the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, rgba(mix(P.night, [0, 0, 0], 0.25)));
  sky.addColorStop(0.42, rgba(mix(P.night, [60, 52, 90], 0.22)));
  sky.addColorStop(0.62, rgba(mix(P.night, P.gold, 0.1)));
  sky.addColorStop(1, rgba(mix(P.night, [0, 0, 0], 0.15)));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const stars = Array.from({ length: phone ? 46 : 110 }, () => ({
    x: r() * W,
    y: Math.pow(r(), 1.6) * H * (phone ? 0.3 : 0.42),
    r: 0.4 + r() * 0.9,
    p: r() * Math.PI * 2,
  }));

  // Moon: a thin crescent with a faint halo.
  const mx = phone ? W * 0.82 : W * 0.6;
  const my = phone ? H * 0.06 : H * 0.11;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.12;
  ctx.drawImage(glow, mx - 60, my - 60, 120, 120);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const moon = new Path2D();
  moon.arc(mx, my, 9, Math.PI * 0.35, Math.PI * 1.65, true);
  moon.arc(mx - 4, my - 1, 8, Math.PI * 1.55, Math.PI * 0.45, false);
  ctx.fillStyle = rgba(P.ink, 0.8);
  ctx.fill(moon);

  drawSkyline(k, base);

  // Facade rows (behind the walkway).
  const rows = phone
    ? [
        { x0: W * 0.3, x1: W + 30, y: base.path[3]!.y, hMin: 104, hMax: 140 },
        { x0: -30, x1: W - 104, y: base.path[0]!.y, hMin: 112, hMax: 150 },
      ]
    : [{ x0: -40, x1: W * 0.775, y: base.path[0]!.y, hMin: H * 0.27, hMax: H * 0.4 }];

  const stringsY: { x0: number; x1: number; y: number }[] = [];
  for (const row of rows) {
    // Trees peek out between the buildings (drawn first, so the houses overlap them).
    for (let x = row.x0 + 40; x < row.x1; x += between(r, 160, 300))
      treeClump(k, x, row.y - row.hMax * between(r, 0.55, 0.85), between(r, 26, 44) * (phone ? 0.75 : 1));
    let x = row.x0;
    const roofs: { x: number; w: number; top: number }[] = [];
    while (x < row.x1 - 30) {
      const w = Math.min(row.x1 - x, phone ? between(r, 74, 104) : between(r, 112, 168));
      const h = between(r, row.hMin, row.hMax);
      shophouse(k, x, row.y, w, h, phone);
      roofs.push({ x, w, top: row.y - h });
      x += w + (r() < 0.25 ? between(r, 4, 14) : 0);
    }
    wires(k, row, roofs, phone);
    stringsY.push({ x0: row.x0 + 6, x1: row.x1 - 8, y: row.y - row.hMin * (phone ? 0.6 : 0.56) });
  }

  // The temple at the end: chedi behind, platform, stair, bell pavilion.
  temple(k, base);

  // Walkway: shopfront curb, paving joints, canal-side curb.
  walkway(k, base);
  canal(k, base);

  // Stalls along the walkway. The first one splits the coin.
  const kinds: StallKind[] = phone ? ["noodle", "fruit", "satay", "garland"] : ["noodle", "fruit", "satay", "garland"];
  const stallX = phone ? [W * 0.15, W * 0.44, W * 0.665, W * 0.82] : [W * 0.125, W * 0.315, W * 0.45, W * 0.585];
  const stalls: Stall[] = stallX.map((x, i) => {
    const leg = phone && i === 3 ? 2 : 0;
    const a = base.path[leg]!;
    const s = base.cum[leg]! + Math.abs(x - a.x);
    return stall(k, base, s, kinds[i]!, phone ? 66 : 92, dpr, i);
  });

  // The gate: far pillar here, the near pillar and lintel as a sprite over the agents.
  gateFar(k, base);
  const gateFront = gateNear(k, base, dpr);

  // Lantern strings in front of the facades (and one over the temple stair).
  const spacing = phone ? 23 : 29;
  const strings = [...stringsY];
  if (!phone) strings.push({ x0: stringsY[0]!.x0 + 70, x1: stringsY[0]!.x1 - 30, y: stringsY[0]!.y - H * 0.085 });
  for (const st of strings) {
    const sag = (st.x1 - st.x0) * 0.025 + 8;
    // A string sags between posts every ~260 px.
    const spans = Math.max(1, Math.round((st.x1 - st.x0) / (phone ? 170 : 260)));
    for (let j = 0; j < spans; j++) {
      const x0 = st.x0 + ((st.x1 - st.x0) * j) / spans;
      const x1 = st.x0 + ((st.x1 - st.x0) * (j + 1)) / spans;
      const y0 = st.y + (r() - 0.5) * 6;
      const y1 = st.y + (r() - 0.5) * 6;
      const sg = Math.min(sag, (x1 - x0) * 0.09);
      const yAt = (t: number) => y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sg;
      stroke(
        k,
        (p) => {
          const pts: number[] = [];
          for (let t = 0; t <= 1.0001; t += 0.1) pts.push(x0 + (x1 - x0) * t, yAt(t));
          curve(p, pts, r, 0.4);
        },
        0.55,
        0.9,
      );
      const n = Math.floor((x1 - x0) / spacing);
      for (let q = 1; q < n; q++) {
        const t = q / n;
        lanterns.push({
          x: x0 + (x1 - x0) * t,
          y: yAt(t),
          size: (phone ? 5.8 : 7.4) * between(r, 0.9, 1.12),
          phase: r() * 6.28,
          lit: 0,
          target: 0,
          litAt: -1,
        });
      }
    }
  }
  // Over the temple stair.
  {
    const a = at(base, base.stairS0 - 10, 0);
    const b = at(base, base.bellS - (phone ? -base.fig : base.fig), 0);
    const y0 = a.y - base.fig * 2.6;
    const y1 = b.y - base.fig * 3.1;
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    const ya = a.x < b.x ? y0 : y1;
    const yb = a.x < b.x ? y1 : y0;
    const yAt = (t: number) => ya + (yb - ya) * t + Math.sin(t * Math.PI) * 10;
    stroke(
      k,
      (p) => {
        const pts: number[] = [];
        for (let t = 0; t <= 1.0001; t += 0.1) pts.push(x0 + (x1 - x0) * t, yAt(t));
        curve(p, pts, r, 0.4);
      },
      0.55,
      0.9,
    );
    const n = Math.floor((x1 - x0) / spacing);
    for (let q = 1; q < n; q++)
      lanterns.push({
        x: x0 + ((x1 - x0) * q) / n,
        y: yAt(q / n),
        size: phone ? 5.8 : 7.4,
        phase: r() * 6.28,
        lit: 0,
        target: 0,
        litAt: -1,
      });
  }

  // Static warm lights (windows, shop interiors) stamped once, additively.
  ctx.globalCompositeOperation = "lighter";
  for (const g of k.glows) {
    const sy = g.sy ?? 1;
    ctx.globalAlpha = g.a;
    ctx.drawImage(glow, g.x - g.r, g.y - g.r * sy, g.r * 2, g.r * 2 * sy);
    // Its broken reflection in the canal.
    if (g.y < base.canalY && g.r > 8 && !g.sy) {
      for (let i = 0; i < 4; i++) {
        const y = base.canalY + 8 + i * 8 + r() * 4;
        if (y > H - 3) break;
        const w = g.r * (0.7 - i * 0.12) * between(r, 0.7, 1.2);
        ctx.globalAlpha = g.a * (0.5 - i * 0.1);
        ctx.fillStyle = rgba(P.gold, 0.8);
        ctx.fillRect(g.x - w / 2 + (r() - 0.5) * 6, y, w, 1.3);
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Cat on a roof, a soi dog asleep on the walkway.
  const catRoof = phone ? rows[0]! : rows[0]!;
  const cat = { x: phone ? W * 0.62 : W * 0.39, y: catRoof.y - catRoof.hMax * 0.98 };

  const reflections = Array.from({ length: phone ? 8 : 16 }, () => ({ x: r() * W, w: between(r, 10, 36) }));

  const leaves = foreground(base, P, dpr, phone);

  return {
    layer,
    world: { ...base, stalls, gateFront, lanterns, stars, reflections, cat, leaves },
  };
}

/* ----- skyline ----------------------------------------------------------------------------- */

function drawSkyline(k: Ink, l: ReturnType<typeof makeLayout>) {
  const { ctx, r, P } = k;
  const { W, H, phone } = l;
  const base = phone ? H * 0.23 : H * 0.47;
  const faint = 0.16;
  // Towers.
  for (let x = -20; x < W;) {
    const w = between(r, 18, 46) * (phone ? 0.7 : 1);
    const h = between(r, 20, phone ? 70 : 140) * (r() < 0.2 ? 1.6 : 1);
    if (r() < 0.75) {
      fillPoly(k, [x, base, x + w, base, x + w, base - h, x, base - h], rgba(mix(P.night, P.ink, 0.03), 0.9));
      stroke(k, (p) => lines(p, [x, base, x, base - h, x + w, base - h, x + w, base], r, 0.6), faint, 1);
      // A few lit windows far away.
      for (let i = 0; i < h / 12; i++)
        if (r() < 0.22) {
          ctx.fillStyle = rgba(P.gold, 0.22 + r() * 0.2);
          ctx.fillRect(x + 3 + r() * (w - 6), base - 6 - r() * (h - 10), 1.5, 1.5);
        }
    }
    x += w + between(r, 2, 30);
  }
  // A cable-stayed bridge on the river side, and a prang, the city's temple silhouette.
  if (!phone) {
    const bx = W * 0.36;
    const top = base - 120;
    stroke(k, (p) => lines(p, [bx, base + 4, bx, top], r, 0.4), faint + 0.08, 1.2);
    stroke(
      k,
      (p) => {
        for (let i = 1; i <= 7; i++) {
          seg(p, bx, top + i * 8, bx - i * 26, base - 4, r, 0.3);
          seg(p, bx, top + i * 8, bx + i * 26, base - 4, r, 0.3);
        }
        seg(p, bx - 220, base - 4, bx + 220, base - 6, r, 0.3);
      },
      faint,
      0.8,
    );
  }
  const px = phone ? W * 0.12 : W * 0.53;
  const ph = phone ? 62 : 110;
  stroke(
    k,
    (p) => {
      curve(
        p,
        [px - ph * 0.28, base, px - ph * 0.17, base - ph * 0.4, px - ph * 0.07, base - ph * 0.82, px, base - ph],
        r,
        0.4,
      );
      curve(
        p,
        [px + ph * 0.28, base, px + ph * 0.17, base - ph * 0.4, px + ph * 0.07, base - ph * 0.82, px, base - ph],
        r,
        0.4,
      );
      for (let i = 1; i < 5; i++) {
        const y = base - ph * (i / 5.4);
        const w = ph * 0.28 * (1 - i / 6);
        seg(p, px - w, y, px + w, y, r, 0.3);
      }
    },
    faint + 0.06,
    1,
  );
}

/* ----- shophouses ------------------------------------------------------------------------- */

function treeClump(k: Ink, x: number, y: number, rad: number) {
  const { r } = k;
  const blobs = 3 + Math.floor(r() * 3);
  const p = new Path2D();
  const outline = new Path2D();
  for (let i = 0; i < blobs; i++) {
    const bx = x + (r() - 0.5) * rad * 1.6;
    const by = y + (r() - 0.5) * rad * 0.8;
    const br = rad * between(r, 0.45, 0.75);
    p.moveTo(bx + br, by);
    p.arc(bx, by, br, 0, Math.PI * 2);
    // Scalloped leaf edge.
    const n = 9;
    for (let j = 0; j < n; j++) {
      const a0 = (j / n) * Math.PI * 2;
      const a1 = ((j + 1) / n) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      outline.moveTo(bx + Math.cos(a0) * br, by + Math.sin(a0) * br);
      outline.quadraticCurveTo(
        bx + Math.cos(am) * br * 1.18,
        by + Math.sin(am) * br * 1.18,
        bx + Math.cos(a1) * br,
        by + Math.sin(a1) * br,
      );
    }
  }
  k.ctx.fillStyle = rgba(mix(k.P.night, [20, 40, 30], 0.25));
  k.ctx.fill(p);
  k.ctx.strokeStyle = rgba(k.P.ink, 0.42);
  k.ctx.lineWidth = 1;
  k.ctx.stroke(outline);
  // Trunk.
  stroke(k, (q) => lines(q, [x, y + rad * 0.4, x + (r() - 0.5) * 6, y + rad * 2.4], r, 0.6), 0.45, 1.2);
}

function shophouse(k: Ink, x: number, base: number, w: number, h: number, phone: boolean) {
  const { r, P } = k;
  const top = base - h;
  const roofType = pick(r, ["pitched", "pitched", "parapet", "gable"] as const);
  const roofH = roofType === "pitched" ? h * 0.13 : roofType === "gable" ? h * 0.18 : h * 0.06;
  // Body.
  box(k, x, top, w, h, 0.86, 1.4);
  // Roof.
  if (roofType === "pitched") {
    const pts = [x - 6, top + 1, x + 8, top - roofH, x + w - 8, top - roofH, x + w + 6, top + 1];
    fillPoly(k, pts, k.fill);
    stroke(k, (p) => lines(p, pts, r, 1), 0.86, 1.4);
    stroke(
      k,
      (p) => {
        for (let i = 1; i < 4; i++) {
          const yy = top - roofH * (i / 4);
          const inset = 6 * (i / 4) + 2;
          seg(p, x - 6 + inset * 2, yy, x + w + 6 - inset * 2, yy, r, 0.6);
        }
        for (let xx = x + 10; xx < x + w - 6; xx += 9) seg(p, xx, top - 2, xx + 3, top - roofH + 3, r, 0.4);
      },
      0.32,
      0.8,
    );
  } else if (roofType === "gable") {
    const pts = [x - 4, top + 1, x + w / 2, top - roofH, x + w + 4, top + 1];
    fillPoly(k, pts, k.fill);
    stroke(k, (p) => lines(p, pts, r, 1), 0.86, 1.4);
    stroke(
      k,
      (p) => lines(p, [x + w * 0.22, top - 2, x + w / 2, top - roofH * 0.68, x + w * 0.78, top - 2], r, 0.6),
      0.4,
      0.9,
    );
    ringStroke(k, x + w / 2, top - roofH * 0.38, roofH * 0.13, 0.5);
  } else {
    box(k, x - 2, top - roofH, w + 4, roofH, 0.8, 1.2);
    // A water tank on the roof.
    if (r() < 0.6) {
      const tx = x + w * between(r, 0.2, 0.65);
      const tw = Math.min(26, w * 0.2);
      box(k, tx, top - roofH - tw * 0.9, tw, tw * 0.9, 0.7, 1.1);
      stroke(
        k,
        (p) => lines(p, [tx + 3, top - roofH, tx + 3, top - roofH + 1, tx + tw - 3, top - roofH], r, 0.4),
        0.5,
        1,
      );
    }
  }
  // Floors: ground (shop) and one or two upper floors.
  const ground = h * (phone ? 0.42 : 0.38);
  const upper = h - ground - (roofType === "parapet" ? 0 : 2);
  const floors = !phone && h > 205 ? 2 : 1;
  const fh = upper / floors;
  for (let f = 0; f < floors; f++) {
    const fy = top + f * fh;
    if (f > 0) stroke(k, (p) => seg(p, x, fy, x + w, fy, r, 0.5), 0.55, 1);
    const n = Math.max(2, Math.round(w / (phone ? 34 : 44)));
    const ww = Math.min(w / n - 10, phone ? 18 : 24);
    for (let i = 0; i < n; i++) {
      const cx = x + (w / n) * (i + 0.5);
      const wy = fy + fh * 0.2;
      const wh = fh * 0.58;
      const lit = r() < 0.46;
      const arched = r() < 0.45;
      const wp = new Path2D();
      if (arched) {
        wp.moveTo(cx - ww / 2, wy + wh);
        wp.lineTo(cx - ww / 2, wy + ww / 2);
        wp.arc(cx, wy + ww / 2, ww / 2, Math.PI, 0);
        wp.lineTo(cx + ww / 2, wy + wh);
        wp.closePath();
      } else wp.rect(cx - ww / 2, wy, ww, wh);
      k.ctx.fillStyle = lit ? rgba(P.gold, 0.42 + r() * 0.2) : k.deep;
      k.ctx.fill(wp);
      if (lit) k.glows.push({ x: cx, y: wy + wh / 2, r: ww * 2.2, a: 0.22 });
      k.ctx.strokeStyle = rgba(P.ink, 0.78);
      k.ctx.lineWidth = 1.1;
      k.ctx.stroke(wp);
      // Shutters or louvres.
      stroke(
        k,
        (p) => {
          if (r() < 0.5) seg(p, cx, wy + (arched ? ww / 2 : 0), cx, wy + wh, r, 0.3);
          else
            for (let yy = wy + wh * 0.35; yy < wy + wh - 2; yy += 4)
              seg(p, cx - ww / 2 + 2, yy, cx + ww / 2 - 2, yy, r, 0.2);
        },
        lit ? 0.5 : 0.4,
        0.7,
      );
    }
    // A balcony rail with plants on the first upper floor.
    if (f === floors - 1 && r() < 0.6) {
      const by = fy + fh * 0.82;
      stroke(
        k,
        (p) => {
          seg(p, x + 4, by, x + w - 4, by, r, 0.5);
          for (let xx = x + 8; xx < x + w - 6; xx += 7) seg(p, xx, by, xx, fy + fh - 1, r, 0.2);
        },
        0.6,
        0.9,
      );
      for (let i = 0; i < 2; i++) if (r() < 0.7) plant(k, x + w * between(r, 0.12, 0.88), by, phone ? 6 : 8);
    }
    // An air conditioner on the wall.
    if (r() < 0.35) {
      const ax = x + w * between(r, 0.1, 0.7);
      const ay = fy + fh * 0.08;
      box(k, ax, ay, 18, 11, 0.6, 1);
      ringStroke(k, ax + 12, ay + 5.5, 3.5, 0.45);
    }
  }
  // Signboard over the shop.
  const gy = base - ground;
  stroke(k, (p) => seg(p, x - 2, gy, x + w + 2, gy, r, 0.5), 0.8, 1.3);
  if (r() < 0.8) {
    const sw = w * between(r, 0.5, 0.8);
    const sx = x + (w - sw) / 2;
    const sh = phone ? 11 : 15;
    const golden = r() < 0.3;
    box(k, sx, gy + 3, sw, sh, golden ? 0.8 : 0.7, 1.1, k.deep);
    stroke(
      k,
      (p) => {
        // Hand-lettering, unreadable on purpose: squiggles.
        let xx = sx + 5;
        const yy = gy + 3 + sh / 2;
        while (xx < sx + sw - 8) {
          const gw = between(r, 3, 7);
          curve(p, [xx, yy + 2, xx + gw * 0.3, yy - 3, xx + gw * 0.7, yy + 3, xx + gw, yy - 1], r, 0.3);
          xx += gw + between(r, 1.5, 4);
        }
      },
      golden ? 0.85 : 0.6,
      0.9,
      golden ? P.gold : P.ink,
    );
  }
  // Shopfront: open (warm light), a rolling shutter, or folding doors.
  const fy0 = gy + (phone ? 16 : 21);
  const fh0 = base - fy0;
  const kind = r();
  if (kind < 0.5) {
    fillPoly(k, [x + 5, fy0, x + w - 5, fy0, x + w - 5, base, x + 5, base], rgba(mix(P.night, P.gold, 0.16)));
    k.glows.push({ x: x + w / 2, y: fy0 + fh0 * 0.5, r: w * 0.7, a: 0.14 });
    stroke(
      k,
      (p) => {
        // Shelves with goods.
        for (let i = 1; i < 3; i++) {
          const yy = fy0 + fh0 * (i / 3.2);
          seg(p, x + 8, yy, x + w - 8, yy, r, 0.4);
          for (let xx = x + 11; xx < x + w - 12; xx += between(r, 5, 10))
            seg(p, xx, yy, xx + 0.5, yy - between(r, 3, 8), r, 0.2);
        }
      },
      0.45,
      0.8,
    );
    stroke(k, (p) => lines(p, [x + 5, base, x + 5, fy0, x + w - 5, fy0, x + w - 5, base], r, 0.6), 0.8, 1.1);
  } else if (kind < 0.8) {
    fillPoly(k, [x + 5, fy0, x + w - 5, fy0, x + w - 5, base, x + 5, base], k.deep);
    stroke(
      k,
      (p) => {
        for (let yy = fy0 + 3; yy < base; yy += 3.4) seg(p, x + 6, yy, x + w - 6, yy, r, 0.2);
      },
      0.28,
      0.7,
    );
    stroke(k, (p) => lines(p, [x + 5, base, x + 5, fy0, x + w - 5, fy0, x + w - 5, base], r, 0.6), 0.75, 1.1);
  } else {
    const n = Math.max(3, Math.round(w / 22));
    stroke(
      k,
      (p) => {
        for (let i = 0; i <= n; i++) {
          const xx = x + 5 + ((w - 10) * i) / n;
          seg(p, xx, fy0, xx, base, r, 0.4);
        }
        seg(p, x + 5, fy0, x + w - 5, fy0, r, 0.4);
      },
      0.6,
      1,
    );
  }
}

function ringStroke(k: Ink, x: number, y: number, rad: number, alpha: number) {
  stroke(k, (p) => ring(p, x, y, rad, rad, k.r, 0.7), alpha, 0.9);
}

function plant(k: Ink, x: number, y: number, size: number) {
  const { r } = k;
  box(k, x - size * 0.45, y - size * 0.6, size * 0.9, size * 0.6, 0.6, 0.9, k.deep);
  stroke(
    k,
    (p) => {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45 + (r() - 0.5) * 0.3;
        const len = size * between(r, 0.8, 1.4);
        curve(
          p,
          [
            x,
            y - size * 0.6,
            x + Math.cos(a) * len * 0.5,
            y - size * 0.6 + Math.sin(a) * len * 0.6,
            x + Math.cos(a) * len,
            y - size * 0.6 + Math.sin(a) * len,
          ],
          r,
          0.3,
        );
      }
    },
    0.6,
    0.9,
  );
}

/** Poles and the soi's tangle of cables, slung across the facades. */
function wires(
  k: Ink,
  row: { x0: number; x1: number; y: number; hMin: number },
  roofs: { x: number; w: number; top: number }[],
  phone: boolean,
) {
  const { r } = k;
  const poles: number[] = [];
  for (let x = row.x0 + between(r, 60, 140); x < row.x1 - 30; x += phone ? 230 : between(r, 300, 420)) poles.push(x);
  const poleTop = row.y - row.hMin * 0.95;
  for (const x of poles) {
    stroke(
      k,
      (p) => {
        lines(p, [x, row.y, x + 1, poleTop], r, 0.5);
        seg(p, x - 10, poleTop + 8, x + 10, poleTop + 7, r, 0.4);
        seg(p, x - 7, poleTop + 16, x + 7, poleTop + 16, r, 0.4);
      },
      0.75,
      1.5,
    );
    box(k, x + 2, poleTop + 24, 8, 12, 0.6, 0.9, k.deep);
  }
  const anchors = [row.x0 - 10, ...poles, row.x1 + 10];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]!;
    const b = anchors[i + 1]!;
    const n = 3 + Math.floor(r() * 3);
    stroke(
      k,
      (p) => {
        for (let j = 0; j < n; j++) {
          const y0 = poleTop + 6 + j * 3 + r() * 4;
          const y1 = poleTop + 6 + j * 3 + r() * 4;
          const sag = between(r, 6, 22);
          const pts: number[] = [];
          for (let t = 0; t <= 1.0001; t += 0.125)
            pts.push(a + (b - a) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag);
          curve(p, pts, r, 0.3);
        }
      },
      0.34,
      0.7,
    );
  }
  void roofs;
}

/* ----- temple ----------------------------------------------------------------------------- */

function temple(k: Ink, l: ReturnType<typeof makeLayout>) {
  const { r, P, ctx } = k;
  const { fig, phone, W, H } = l;
  const top = at(l, l.bellS, 0).y;
  // The terrace wall drops to the walkway it rises from (the upper terrace on a phone).
  const ground = l.path[phone ? 3 : 0]!.y;

  // Chedi behind, rising into the sky (bell dome, rings, spire).
  const cx = phone ? W * 0.13 : W * 0.95;
  const cb = top - fig * (phone ? 0.2 : 0.3);
  const ch = phone ? H * 0.2 : H * 0.48;
  const cw = phone ? 40 : 86;
  const dome = new Path2D();
  dome.moveTo(cx - cw / 2, cb - ch * 0.12);
  dome.bezierCurveTo(cx - cw / 2, cb - ch * 0.42, cx - cw * 0.12, cb - ch * 0.45, cx - cw * 0.08, cb - ch * 0.5);
  dome.lineTo(cx - 2, cb - ch);
  dome.lineTo(cx + 2, cb - ch);
  dome.lineTo(cx + cw * 0.08, cb - ch * 0.5);
  dome.bezierCurveTo(cx + cw * 0.12, cb - ch * 0.45, cx + cw / 2, cb - ch * 0.42, cx + cw / 2, cb - ch * 0.12);
  dome.closePath();
  ctx.fillStyle = k.fill;
  ctx.fill(dome);
  ctx.strokeStyle = rgba(P.gold, 0.55);
  ctx.lineWidth = 1.3;
  ctx.stroke(dome);
  stroke(
    k,
    (p) => {
      for (let i = 0; i < 3; i++)
        seg(
          p,
          cx - cw * (0.6 - i * 0.06),
          cb - ch * (0.04 + i * 0.04),
          cx + cw * (0.6 - i * 0.06),
          cb - ch * (0.04 + i * 0.04),
          r,
          0.5,
        );
      for (let i = 0; i < 7; i++) {
        const y = cb - ch * (0.52 + i * 0.05);
        const w = cw * 0.08 * (1 - i / 9);
        seg(p, cx - w, y, cx + w, y, r, 0.2);
      }
    },
    0.5,
    0.9,
    P.gold,
  );
  k.glows.push({ x: cx, y: cb - ch * 0.9, r: 26, a: 0.18 });
  treeClump(k, cx + (phone ? 36 : -cw * 0.95), cb - ch * 0.12, phone ? 22 : 34);
  if (!phone) treeClump(k, cx - cw * 1.6, cb - ch * 0.05, 30);

  // Platform: the walkway rises up the stair to a stone terrace with a retaining wall.
  const s0 = l.stairS0;
  const s1 = l.stairS1;
  const nearA = at(l, s0, 1);
  const nearB = at(l, s1, 1);
  const end = phone ? -40 : W + 40;
  const wallBottom = ground + l.dv.y;
  const wall = [nearA.x, wallBottom, nearB.x, nearB.y, end, nearB.y, end, wallBottom];
  fillPoly(k, wall, k.fill);
  stroke(k, (p) => lines(p, [nearA.x, nearA.y, nearB.x, nearB.y, end, nearB.y], r, 0.7), 0.85, 1.4);
  stroke(
    k,
    (p) => {
      for (let y = nearB.y + 9; y < wallBottom - 2; y += 9) {
        const xa = nearA.x + ((nearB.x - nearA.x) * (wallBottom - y)) / (wallBottom - nearB.y);
        const off = ((y / 9) % 2) * 9;
        const xs = Math.min(xa, end);
        const xe = Math.max(xa, end);
        for (let x = xs + off; x < xe - 6; x += 18) seg(p, x, y, x + 15, y, r, 0.3);
      }
    },
    0.22,
    0.8,
  );
  // Terrace floor lines and the far edge.
  const farB = at(l, s1, 0);
  stroke(k, (p) => lines(p, [at(l, s0, 0).x, at(l, s0, 0).y, farB.x, farB.y, end, farB.y], r, 0.6), 0.6, 1.1);
  stairs(k, l, s0, s1, phone ? 7 : 8);
  // Naga balustrade posts along the stair's near side.
  stroke(
    k,
    (p) => {
      const n = 4;
      for (let i = 0; i <= n; i++) {
        const b = at(l, s0 + ((s1 - s0) * i) / n, 1);
        seg(p, b.x, b.y, b.x, b.y - fig * 0.42, r, 0.3);
      }
      const a = at(l, s0, 1);
      const b = at(l, s1, 1);
      seg(p, a.x, a.y - fig * 0.42, b.x, b.y - fig * 0.42, r, 0.4);
    },
    0.6,
    1.1,
    P.gold,
  );

  // Bell pavilion (ho rakhang): pillars, a two-tier roof with chofa horns, a spire.
  const c = at(l, l.bellS, 0.42);
  const pw = fig * 2.1;
  const ph = fig * 2.45;
  const fl = at(l, l.bellS, 0.06);
  const fr = at(l, l.bellS, 0.86);
  const left = c.x - pw / 2;
  const right = c.x + pw / 2;
  // Floor slab.
  box(k, left - 8, fr.y - 4, pw + 16 + (fr.x - fl.x) * 0.4, 6, 0.75, 1.1);
  // Back pillars (thin), front pillars.
  stroke(
    k,
    (p) => {
      seg(p, left + (fl.x - c.x) * 0.4, fl.y, left + (fl.x - c.x) * 0.4, fl.y - ph, r, 0.4);
      seg(p, right + (fl.x - c.x) * 0.4, fl.y, right + (fl.x - c.x) * 0.4, fl.y - ph, r, 0.4);
    },
    0.45,
    1.2,
  );
  for (const x of [left, right]) {
    fillPoly(k, [x - 2.5, fr.y - 4, x + 2.5, fr.y - 4, x + 2.5, fr.y - 4 - ph, x - 2.5, fr.y - 4 - ph], k.fill);
    stroke(
      k,
      (p) => lines(p, [x - 2.5, fr.y - 4, x - 2.5, fr.y - 4 - ph, x + 2.5, fr.y - 4 - ph, x + 2.5, fr.y - 4], r, 0.4),
      0.85,
      1.2,
    );
  }
  // Beam.
  const beamY = fr.y - 4 - ph;
  stroke(k, (p) => seg(p, left - 6, beamY, right + 6, beamY, r, 0.4), 0.85, 1.6);
  // Roof tiers.
  const tier = (y: number, w: number, h: number) => {
    const pts = [c.x - w / 2, y, c.x - w * 0.3, y - h, c.x + w * 0.3, y - h, c.x + w / 2, y];
    fillPoly(k, pts, k.fill);
    stroke(k, (p) => lines(p, pts, r, 0.7), 0.85, 1.3);
    // Chofa horns at the eaves, in gold.
    stroke(
      k,
      (p) => {
        curve(p, [c.x - w / 2, y, c.x - w / 2 - 5, y - 4, c.x - w / 2 - 3, y - 10], r, 0.2);
        curve(p, [c.x + w / 2, y, c.x + w / 2 + 5, y - 4, c.x + w / 2 + 3, y - 10], r, 0.2);
        // Serrated gable edge (bai raka).
        for (let i = 1; i < 6; i++) {
          const t = i / 6;
          const xa = c.x - w / 2 + (w * 0.2 * t) / 1;
          const ya = y - h * t;
          seg(p, xa, ya, xa - 3, ya - 3, r, 0.2);
          seg(p, c.x + w / 2 - w * 0.2 * t, ya, c.x + w / 2 - w * 0.2 * t + 3, ya - 3, r, 0.2);
        }
      },
      0.8,
      1.1,
      P.gold,
    );
  };
  tier(beamY - 2, pw + fig * 1.1, fig * 0.62);
  tier(beamY - 2 - fig * 0.62, pw * 0.82, fig * 0.5);
  // Spire.
  const sb = beamY - 2 - fig * 1.12;
  stroke(
    k,
    (p) => {
      lines(p, [c.x - fig * 0.22, sb, c.x, sb - fig * 1.1, c.x + fig * 0.22, sb], r, 0.4);
      for (let i = 1; i < 5; i++) {
        const y = sb - fig * 0.2 * i;
        const w = fig * 0.2 * (1 - i / 5.5);
        seg(p, c.x - w, y, c.x + w, y, r, 0.2);
      }
    },
    0.85,
    1.1,
    P.gold,
  );
  k.glows.push({ x: c.x, y: sb - fig * 0.6, r: fig * 0.9, a: 0.16 });
  // A frangipani by the pavilion.
  treeClump(k, phone ? c.x + pw * 1.1 : c.x - pw * 1.25, beamY - fig * 0.1, fig * 0.7);
}

/** A flight of steps on the walkway between s0 and s1: lit treads, shaded risers, ink edges. */
function stairs(k: Ink, l: ReturnType<typeof makeLayout>, s0: number, s1: number, n: number) {
  const { r, P } = k;
  const A = (i: number, d: number) => at(l, s0 + ((s1 - s0) * i) / n, d);
  const C = (i: number, d: number) => ({ x: A(i + 1, d).x, y: A(i, d).y });
  for (let i = 0; i < n; i++) {
    const tread = [A(i, 0).x, A(i, 0).y, C(i, 0).x, C(i, 0).y, C(i, 1).x, C(i, 1).y, A(i, 1).x, A(i, 1).y];
    fillPoly(k, tread, rgba(mix(P.night, P.ink, 0.09)));
    const rise = [
      C(i, 0).x,
      C(i, 0).y,
      A(i + 1, 0).x,
      A(i + 1, 0).y,
      A(i + 1, 1).x,
      A(i + 1, 1).y,
      C(i, 1).x,
      C(i, 1).y,
    ];
    fillPoly(k, rise, rgba(mix(P.night, [0, 0, 0], 0.08)));
  }
  stroke(
    k,
    (p) => {
      for (let i = 0; i < n; i++) {
        const c0 = C(i, 0);
        const c1 = C(i, 1);
        seg(p, c0.x, c0.y, c1.x, c1.y, r, 0.2);
        seg(p, A(i, 1).x, A(i, 1).y, c1.x, c1.y, r, 0.2);
        seg(p, c1.x, c1.y, A(i + 1, 1).x, A(i + 1, 1).y, r, 0.2);
      }
    },
    0.5,
    0.9,
  );
  stroke(
    k,
    (p) => {
      for (let i = 0; i < n; i++) {
        seg(p, A(i, 0).x, A(i, 0).y, C(i, 0).x, C(i, 0).y, r, 0.2);
        seg(p, C(i, 0).x, C(i, 0).y, A(i + 1, 0).x, A(i + 1, 0).y, r, 0.2);
      }
    },
    0.35,
    0.8,
  );
}

/* ----- walkway and canal ------------------------------------------------------------------ */

function walkway(k: Ink, l: ReturnType<typeof makeLayout>) {
  const { r, P } = k;
  const legs = l.phone ? [0, 2] : [0];
  for (const leg of legs) {
    const s0 = l.cum[leg]!;
    const s1 = l.cum[leg + 1]!;
    const a0 = at(l, s0, 0);
    const a1 = at(l, s1, 0);
    const b0 = at(l, s0, 1);
    const b1 = at(l, s1, 1);
    // Paving: a slightly lighter band.
    const g = k.ctx.createLinearGradient(0, a0.y, 0, b0.y);
    g.addColorStop(0, rgba(mix(P.night, P.ink, 0.07)));
    g.addColorStop(1, rgba(mix(P.night, P.ink, 0.035)));
    const path = new Path2D();
    poly(path, [a0.x, a0.y, a1.x, a1.y, b1.x, b1.y, b0.x, b0.y]);
    k.ctx.fillStyle = g;
    k.ctx.fill(path);
    stroke(k, (p) => seg(p, a0.x, a0.y, a1.x, a1.y, r, 0.6), 0.7, 1.2);
    // Dusk warmth spilling out of the shops onto the paving.
    const warm = k.ctx.createLinearGradient(0, a0.y, 0, b0.y);
    warm.addColorStop(0, rgba(P.gold, 0.1));
    warm.addColorStop(1, rgba(P.gold, 0));
    k.ctx.globalCompositeOperation = "lighter";
    k.ctx.fillStyle = warm;
    k.ctx.fill(path);
    k.ctx.globalCompositeOperation = "source-over";
    stroke(
      k,
      (p) => {
        seg(p, b0.x, b0.y, b1.x, b1.y, r, 0.6);
        seg(p, b0.x, b0.y + 4, b1.x, b1.y + 4, r, 0.6);
      },
      0.75,
      1.3,
    );
    // Joints: courses along the street, and staggered cross joints that follow the depth.
    stroke(
      k,
      (p) => {
        const lo = Math.min(s0, s1);
        const hi = Math.max(s0, s1);
        for (let row = 1; row < 4; row++) {
          const d = row / 4;
          for (let s = lo + r() * 30; s < hi - 10; s += between(r, 22, 60)) {
            const a = at(l, s, d);
            const len = between(r, 8, 26);
            const b = at(l, Math.min(hi, s + len), d);
            seg(p, a.x, a.y, b.x, b.y, r, 0.3);
          }
          for (let s = lo + r() * 20; s < hi - 6; s += between(r, 30, 56)) {
            const a = at(l, s, d - 0.25);
            const b = at(l, s, d);
            seg(p, a.x, a.y, b.x, b.y, r, 0.2);
          }
        }
      },
      0.14,
      0.8,
    );
  }
  if (l.phone) {
    // The stair joining the two terraces (on the right), with its own steps and rail.
    const s0 = l.cum[1]!;
    const s1 = l.cum[2]!;
    stairs(k, l, s0, s1, 15);
    const n0 = at(l, s0, 1);
    const n1 = at(l, s1, 1);
    stroke(k, (p) => seg(p, n0.x + 2, n0.y - 16, n1.x + 2, n1.y - 16, r, 0.5), 0.55, 1, P.gold);
    // Retaining wall under the upper terrace, between the two rows.
    const y = at(l, l.cum[3]!, 1).y + 4;
    stroke(
      k,
      (p) => {
        for (let x = l.W * 0.3; x < l.W - 60; x += 16) seg(p, x, y + 4, x + 12, y + 4, r, 0.3);
      },
      0.18,
      0.8,
    );
  }
}

function canal(k: Ink, l: ReturnType<typeof makeLayout>) {
  const { r, P, ctx } = k;
  const { W, H, canalY } = l;
  const g = ctx.createLinearGradient(0, canalY, 0, H);
  g.addColorStop(0, rgba(mix(P.night, [0, 0, 0], 0.3)));
  g.addColorStop(1, rgba(mix(P.night, [0, 0, 0], 0.5)));
  ctx.fillStyle = g;
  ctx.fillRect(0, canalY, W, H - canalY);
  stroke(
    k,
    (p) => {
      seg(p, -10, canalY, W + 10, canalY, r, 0.5);
      for (let x = -10 + r() * 20; x < W; x += 22) seg(p, x, canalY - 9, x + 18, canalY - 9, r, 0.2);
    },
    0.5,
    1,
  );
  stroke(
    k,
    (p) => {
      for (let i = 0; i < (l.phone ? 26 : 60); i++) {
        const x = r() * W;
        const y = canalY + 12 + Math.pow(r(), 0.8) * (H - canalY - 16);
        const w = between(r, 8, 40);
        seg(p, x, y, x + w, y, r, 0.2);
      }
    },
    0.16,
    0.8,
  );
}

/* ----- stalls ----------------------------------------------------------------------------- */

function stall(
  k0: Ink,
  l: ReturnType<typeof makeLayout>,
  s: number,
  kind: StallKind,
  w: number,
  dpr: number,
  i: number,
): Stall {
  const { fig } = l;
  // Bounding box of the sprite in screen space.
  const a = at(l, s - w / 2, 0);
  const b = at(l, s + w / 2, 0);
  const x0 = Math.min(a.x, b.x) - 14;
  const x1 = Math.max(a.x, b.x) + l.dv.x * 0.45 + 16;
  const yTop = a.y - fig * 2.1;
  const yBot = a.y + l.dv.y * 0.45 + 8;
  const [sprite, ctx] = newCanvas(x1 - x0, yBot - yTop, dpr);
  ctx.translate(-x0, -yTop);
  const k: Ink = { ...k0, ctx, r: rng(1000 + i * 77), glows: [] };
  const { r, P } = k;
  const L = Math.min(a.x, b.x);
  const R = Math.max(a.x, b.x);
  const front = 0.3;
  const o = { x: l.dv.x * front, y: l.dv.y * front };
  const counterH = fig * 0.62;
  const yb = a.y + o.y; // front face bottom
  const fx0 = L + o.x;
  const fx1 = R + o.x;
  // Top of the counter (parallelogram), then front face.
  const top = [L, a.y - counterH, R, a.y - counterH, fx1, yb - counterH, fx0, yb - counterH];
  fillPoly(k, top, rgba(mix(P.night, P.ink, 0.1)));
  stroke(k, (p) => lines(p, top, r, 0.6, true), 0.75, 1.1);
  box(k, fx0, yb - counterH, fx1 - fx0, counterH, 0.9, 1.4);
  // Wheels for carts.
  if (kind === "noodle" || kind === "satay") {
    for (const wx of [fx0 + 12, fx1 - 12]) stroke(k, (p) => ring(p, wx, yb, 6, 6, r, 0.6), 0.85, 1.2);
  }
  // Front panel detail.
  stroke(
    k,
    (p) => {
      seg(p, fx0 + 4, yb - counterH * 0.55, fx1 - 4, yb - counterH * 0.55, r, 0.4);
      if (kind === "noodle")
        for (let x = fx0 + 8; x < fx1 - 6; x += 10) seg(p, x, yb - counterH * 0.5, x, yb - 4, r, 0.2);
    },
    0.45,
    0.9,
  );
  // Goods on the counter.
  const gy = a.y - counterH + o.y * 0.5;
  let steam: Pt | null = null;
  if (kind === "noodle") {
    for (const [px, pw] of [
      [0.22, 0.22],
      [0.5, 0.18],
    ] as const) {
      const cx = fx0 + (fx1 - fx0) * px;
      box(k, cx - (w * pw) / 2, gy - fig * 0.32, w * pw, fig * 0.32, 0.85, 1.1, rgba(mix(P.night, P.ink, 0.12)));
      stroke(k, (p) => ring(p, cx, gy - fig * 0.32, (w * pw) / 2, 2.5, r, 0.4), 0.7, 1);
    }
    steam = { x: fx0 + (fx1 - fx0) * 0.22, y: gy - fig * 0.36 };
    for (let j = 0; j < 3; j++)
      stroke(k, (p) => ring(p, fx0 + (fx1 - fx0) * (0.68 + j * 0.09), gy - 3, 4, 2.2, r, 0.4), 0.7, 1);
  } else if (kind === "fruit") {
    for (let j = 0; j < 14; j++) {
      const cx = fx0 + 8 + r() * (fx1 - fx0 - 16);
      const cy = gy - 2 - Math.pow(r(), 2) * 8;
      const rr = between(r, 2.5, 4.2);
      const p = new Path2D();
      p.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fillStyle = rgba(mix(P.night, P.gold, 0.25 + r() * 0.25));
      ctx.fill(p);
      stroke(k, (q) => ring(q, cx, cy, rr, rr, r, 0.4), 0.7, 0.9);
    }
  } else if (kind === "satay") {
    box(k, fx0 + 6, gy - 6, (fx1 - fx0) * 0.6, 6, 0.85, 1.1, rgba(mix(P.night, P.gold, 0.2)));
    stroke(
      k,
      (p) => {
        for (let x = fx0 + 9; x < fx0 + (fx1 - fx0) * 0.6; x += 4) seg(p, x, gy - 4, x + 9, gy - 10, r, 0.2);
      },
      0.6,
      0.8,
    );
    steam = { x: fx0 + (fx1 - fx0) * 0.35, y: gy - 10 };
  } else if (kind === "garland") {
    // Jasmine garlands (phuang malai) hanging from the awning.
    for (let j = 0; j < 5; j++) {
      const cx = fx0 + 10 + ((fx1 - fx0 - 20) * j) / 4;
      stroke(k, (p) => ring(p, cx, gy - fig * 0.95, 4.5, 9, r, 0.4), 0.75, 1);
      stroke(k, (p) => seg(p, cx, gy - fig * 0.95 + 9, cx, gy - fig * 0.95 + 16, r, 0.2), 0.8, 1, P.gold);
    }
  } else {
    for (let j = 0; j < 6; j++) {
      const cx = fx0 + 8 + j * 7;
      box(k, cx, gy - 12, 4, 12, 0.7, 0.9, rgba(mix(P.night, P.ink, 0.14)));
    }
  }
  // Posts and awning: a sloped canopy with a scalloped front edge.
  const awY = a.y - fig * 1.75;
  const postX = [fx0 + 2, fx1 - 2];
  stroke(
    k,
    (p) => {
      for (const x of postX) seg(p, x, yb - counterH, x, awY + l.dv.y * front + 2, r, 0.3);
    },
    0.8,
    1.2,
  );
  const aw = [L - 8, awY - 6, R + 8, awY - 6, fx1 + 10, awY + o.y + 6, fx0 - 10, awY + o.y + 6];
  fillPoly(k, aw, rgba(mix(P.night, P.ink, 0.08)));
  stroke(k, (p) => lines(p, aw, r, 0.7, true), 0.88, 1.3);
  // Stripes.
  stroke(
    k,
    (p) => {
      const n = Math.round(w / 12);
      for (let j = 1; j < n; j++) {
        const t = j / n;
        seg(p, L - 8 + (R - L + 16) * t, awY - 6, fx0 - 10 + (fx1 - fx0 + 20) * t, awY + o.y + 6, r, 0.2);
      }
    },
    0.3,
    0.9,
  );
  // Scallops.
  const scal = new Path2D();
  const n = Math.round((fx1 - fx0 + 20) / 10);
  for (let j = 0; j < n; j++) {
    const xa = fx0 - 10 + ((fx1 - fx0 + 20) * j) / n;
    const xb = fx0 - 10 + ((fx1 - fx0 + 20) * (j + 1)) / n;
    scal.moveTo(xa, awY + o.y + 6);
    scal.quadraticCurveTo((xa + xb) / 2, awY + o.y + 13, xb, awY + o.y + 6);
  }
  ctx.fillStyle = rgba(mix(P.night, P.ink, 0.08));
  ctx.fill(scal);
  ctx.strokeStyle = rgba(P.ink, 0.85);
  ctx.lineWidth = 1.2;
  ctx.stroke(scal);
  // A small hanging lamp (its light is dynamic).
  const lamp = { x: (fx0 + fx1) / 2 + 6, y: awY + o.y + 18 };
  // A warm pool of lamplight on the paving in front of the cart.
  k0.glows.push({ x: (fx0 + fx1) / 2 + l.dv.x * 0.3, y: a.y + l.dv.y * 0.55, r: w * 1.15, a: 0.2, sy: 0.3 });
  stroke(k, (p) => seg(p, lamp.x, awY + o.y + 8, lamp.x, lamp.y - 4, r, 0.2), 0.6, 0.8);
  const lp = new Path2D();
  lp.arc(lamp.x, lamp.y, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = rgba(P.gold, 0.95);
  ctx.fill(lp);
  // Stools in front.
  if (i % 2 === 0) {
    for (const sx of [fx0 + (fx1 - fx0) * 0.25, fx0 + (fx1 - fx0) * 0.7]) {
      const sy = yb + l.dv.y * 0.12;
      const sx2 = sx + l.dv.x * 0.12;
      stroke(k, (p) => ring(p, sx2, sy - fig * 0.3, 5, 2, r, 0.4), 0.7, 1);
      stroke(
        k,
        (p) => {
          seg(p, sx2 - 4, sy - fig * 0.3, sx2 - 4, sy, r, 0.2);
          seg(p, sx2 + 4, sy - fig * 0.3, sx2 + 4, sy, r, 0.2);
        },
        0.6,
        1,
      );
    }
  }
  return { s, kind, w, sprite, sx: x0, sy: yTop, lamp, steam };
}

/* ----- gate ------------------------------------------------------------------------------- */

function gateFar(k: Ink, l: ReturnType<typeof makeLayout>) {
  const { far, farOut, h } = l.gate;
  const { r, P } = k;
  // Back pillars and the back beam of the checkpoint pavilion.
  stroke(
    k,
    (p) => {
      for (const q of [far, farOut]) {
        seg(p, q.x - 2.5, q.y, q.x - 2.5, q.y - h, r, 0.3);
        seg(p, q.x + 2.5, q.y, q.x + 2.5, q.y - h, r, 0.3);
      }
      seg(p, Math.min(far.x, farOut.x) - 6, far.y - h, Math.max(far.x, farOut.x) + 6, far.y - h, r, 0.3);
    },
    0.6,
    1.2,
    P.gold,
  );
}

function gateNear(k0: Ink, l: ReturnType<typeof makeLayout>, dpr: number) {
  const { near, nearOut, h } = l.gate;
  const { dv, fig } = l;
  const L = Math.min(near.x, nearOut.x);
  const R = Math.max(near.x, nearOut.x);
  const gh = fig * 1.05;
  const top = near.y - h;
  const back = { x: -dv.x * 0.94, y: -dv.y * 0.94 };
  const x0 = L - 40 + back.x;
  const x1 = R + 40;
  const y0 = top - gh + back.y - 24;
  const y1 = near.y + 8;
  const [sprite, ctx] = newCanvas(x1 - x0, y1 - y0, dpr);
  ctx.translate(-x0, -y0);
  const k: Ink = { ...k0, ctx, r: rng(4242), glows: [] };
  const { r, P } = k;
  const cx = (L + R) / 2;
  const eL = { x: L - 12, y: top - 4 };
  const eR = { x: R + 12, y: top - 4 };
  const apex = { x: cx, y: top - gh };
  // The roof runs back over the walkway: only its ridge and eave are hinted, faintly.
  stroke(
    k,
    (p) => {
      seg(p, apex.x, apex.y, apex.x + back.x * 0.55, apex.y + back.y * 0.55, r, 0.2);
      seg(p, eL.x, eL.y, eL.x + back.x * 0.55, eL.y + back.y * 0.55, r, 0.2);
    },
    0.35,
    1,
    P.gold,
  );
  // Front pillars with bases.
  for (const q of [near, nearOut]) {
    const pil = [q.x - 4, q.y, q.x + 4, q.y, q.x + 4, top, q.x - 4, top];
    fillPoly(k, pil, k.fill);
    stroke(k, (p) => lines(p, pil, r, 0.4, true), 0.95, 1.3, P.gold);
    box(k, q.x - 7, q.y - 7, 14, 7, 0.9, 1.1);
  }
  // Front beam.
  const beam = [L - 8, top + 4, R + 8, top + 4, R + 8, top - 4, L - 8, top - 4];
  fillPoly(k, beam, k.fill);
  stroke(k, (p) => lines(p, beam, r, 0.4, true), 0.95, 1.3, P.gold);
  // Front gable facing the street, with the chofa horn at the peak and hooks at the eaves.
  const gable = [eL.x, eL.y, apex.x, apex.y, eR.x, eR.y];
  fillPoly(k, gable, k.fill);
  stroke(k, (p) => lines(p, gable, r, 0.5), 1, 1.5, P.gold);
  stroke(
    k,
    (p) => {
      lines(p, [eL.x + 9, eL.y - 3, apex.x, apex.y + gh * 0.3, eR.x - 9, eR.y - 3], r, 0.3);
      ring(p, cx, top - gh * 0.3, gh * 0.12, gh * 0.12, r, 0.4);
      curve(p, [apex.x, apex.y, apex.x + 3, apex.y - 7, apex.x + 9, apex.y - 9], r, 0.2);
      curve(p, [eL.x, eL.y, eL.x - 6, eL.y - 3, eL.x - 5, eL.y - 10], r, 0.2);
      curve(p, [eR.x, eR.y, eR.x + 6, eR.y - 3, eR.x + 5, eR.y - 10], r, 0.2);
      // Serrated edge (bai raka) down both slopes.
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        const lx = eL.x + (apex.x - eL.x) * t;
        const ly = eL.y + (apex.y - eL.y) * t;
        const rx = eR.x + (apex.x - eR.x) * t;
        seg(p, lx, ly, lx - 2, ly - 4, r, 0.2);
        seg(p, rx, ly, rx + 2, ly - 4, r, 0.2);
      }
    },
    0.85,
    1.1,
    P.gold,
  );
  return { sprite, x: x0, y: y0 };
}

/* ----- foreground ------------------------------------------------------------------------- */

function foreground(l: ReturnType<typeof makeLayout>, P: Palette, dpr: number, phone: boolean) {
  const size = phone ? 110 : 190;
  const [sprite, ctx] = newCanvas(size, size, dpr);
  const r = rng(77);
  // Two banana leaves leaning in from the bottom-left corner.
  for (const [ang, len] of [
    [-1.05, size * 0.95],
    [-0.55, size * 0.8],
    [-1.45, size * 0.7],
  ] as const) {
    const bx = size * 0.02;
    const by = size;
    const tip = { x: bx + Math.cos(ang) * len, y: by + Math.sin(ang) * len };
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const wd = len * 0.18;
    const p = new Path2D();
    p.moveTo(bx, by);
    p.quadraticCurveTo((bx + tip.x) / 2 + nx * wd, (by + tip.y) / 2 + ny * wd, tip.x, tip.y);
    p.quadraticCurveTo((bx + tip.x) / 2 - nx * wd, (by + tip.y) / 2 - ny * wd, bx, by);
    ctx.fillStyle = rgba(mix(P.night, [0, 0, 0], 0.4));
    ctx.fill(p);
    ctx.strokeStyle = rgba(P.ink, 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke(p);
    const v = new Path2D();
    v.moveTo(bx, by);
    v.lineTo(tip.x, tip.y);
    for (let t = 0.15; t < 0.95; t += 0.09) {
      const mx = bx + (tip.x - bx) * t;
      const my = by + (tip.y - by) * t;
      const w = wd * Math.sin(t * Math.PI) * 0.9;
      v.moveTo(mx, my);
      v.lineTo(mx + nx * w + (tip.x - bx) * 0.05, my + ny * w + (tip.y - by) * 0.05);
      v.moveTo(mx, my);
      v.lineTo(mx - nx * w + (tip.x - bx) * 0.05, my - ny * w + (tip.y - by) * 0.05);
    }
    ctx.strokeStyle = rgba(P.ink, 0.22);
    ctx.lineWidth = 0.8;
    ctx.stroke(v);
    void r;
  }
  return { sprite, x: -size * 0.12, y: l.H - size * 0.92 };
}
