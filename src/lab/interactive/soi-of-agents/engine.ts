import { runLoop } from "../../hero/a-kit/loop";
import {
  drawAgent,
  drawEmote,
  drawItem,
  makeAgent,
  steer,
  updateFacing,
  type Agent,
  type Item,
  type Obstacle,
} from "./agents";
import { glowSprite, mix, readColors, rgba, rng, type Palette } from "./ink";
import type { Sound } from "./sound";
import { at, buildWorld, locate, type Lantern, type Layout, type Pt } from "./world";

/*
 * The soi, running. A coin is a task: the nearest idle agent fetches it to the noodle stall,
 * the keeper splits it in three, three agents carry the pieces to three stalls (handoffs over
 * the counter), then to the gold gate. The gate checks every piece and turns one back; it is
 * redone at its stall and passes on the second try. At the temple the pieces join, the monk
 * strikes the bell, and the coin rises as a light into a lantern that stays lit.
 *
 * The choreography is written as generators that yield a condition ("until this agent has
 * arrived", "for 0.4 s"); the frame loop resumes each one when its condition holds.
 */

export type CaptionKey = "task" | "split" | "handoff" | "guardrail" | "redo" | "passes" | "merged" | "lit";
export type SoiOptions = {
  captions: Record<CaptionKey, string>;
  still: boolean;
  sound: Sound;
  /** The lantern count changed (the visitor's or a simulated earlier visitor's). */
  onCount: (n: number, mine: boolean) => void;
  /** Narration step (0 idle .. 6 done). */
  onStep: (i: number) => void;
  thai: boolean;
};
export type Soi = { drop: () => void; destroy: () => void };

type Cond = () => boolean;
type Flow = Generator<Cond, void, void>;
type Task = { it: Flow; cond: Cond | null; done: boolean };

type Caption = { text: string; x: number; y: number; t0: number; dur: number };
type Mote = { x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; done: () => void; arc: number };
type Sky = { x: number; y: number; t0: number; phase: number; size: number };
type Steam = { x: number; y: number; age: number; life: number; gold: boolean; ph: number };

export function startSoi(host: HTMLElement, o: SoiOptions): Soi {
  const canvas = document.createElement("canvas");
  canvas.className = "soi-canvas";
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const P: Palette = readColors(host);
  const glow = glowSprite(P.gold);
  const warm = glowSprite(mix(P.gold, [255, 200, 120], 0.35));
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;font-family:var(--font-mono)";
  host.appendChild(probe);
  const mono = getComputedStyle(probe).fontFamily || "monospace";
  probe.remove();
  const sans = getComputedStyle(host).fontFamily || "sans-serif";

  let W = 1;
  let H = 1;
  let dpr = 1;
  let phone = false;
  let layer: HTMLCanvasElement | null = null;
  let world: Layout | null = null;
  let agents: Agent[] = [];
  let keepers: Agent[] = [];
  let monk: Agent | null = null;
  let obstacles: Obstacle[] = [];
  let items: Item[] = [];
  let tasks: Task[] = [];
  let captions: Caption[] = [];
  let motes: Mote[] = [];
  let sky: Sky[] = [];
  let steam: Steam[] = [];
  let stallFlash: number[] = [];
  const bell = { ang: 0, vel: 0, glow: 0, busy: false, waves: [] as number[] };
  const gate = { pulse: 0, block: 0, pass: 0, scan: -1 };
  let T = 0;
  let boil = 0;
  let boilT = 0;
  let r = rng(1);
  let itemId = 0;
  let nextOther = 6;
  let stepIdle = 0;
  let hover: { x: number; y: number; on: boolean } = { x: 0, y: 0, on: false };

  // Lanterns lit today: the earlier ones are simulated (seeded from the date and the hour).
  const now = new Date();
  const daySeed = now.getFullYear() * 400 + now.getMonth() * 32 + now.getDate();
  const mins = now.getHours() * 60 + now.getMinutes();
  let count = 18 + Math.floor(mins / 5.5) + Math.floor(rng(daySeed)() * 9);
  o.onCount(count, false);

  /* ----- build ---------------------------------------------------------------------------- */

  const build = () => {
    const rect = host.getBoundingClientRect();
    W = Math.max(280, Math.round(rect.width));
    H = Math.max(360, Math.round(rect.height));
    phone = W < 640;
    const budget = phone ? 1_900_000 : 3_600_000;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (W * H * dpr * dpr > budget) dpr = Math.sqrt(budget / (W * H));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const built = buildWorld(W, H, phone, dpr, P, 20261008);
    layer = built.layer;
    world = built.world;
    const l = world;
    r = rng(daySeed);
    const depth = l.dv.y;

    keepers = l.stalls.map((st, i) => {
      const a = makeAgent(100 + i, "keeper", st.s - st.w * 0.12 * (phone && i === 3 ? -1 : 1), depth * 0.03, r);
      a.stall = i;
      a.faceHold = 1;
      return a;
    });
    // Keepers face the street's direction of travel (toward the next stall).
    for (const k of keepers) {
      const t = at(l, k.s + 1, 0).x - at(l, k.s, 0).x;
      k.faceHold = t >= 0 ? -1 : 1;
    }
    monk = makeAgent(200, "monk", l.monkS, depth * 0.4, r);
    monk.faceHold = at(l, l.bellS, 0).x > at(l, l.monkS, 0).x ? 1 : -1;
    const n = phone ? 6 : 10;
    const walkers: Agent[] = [];
    for (let i = 0; i < n; i++) {
      const anchor = 20 + ((l.dropMax - 30) * (i + 0.5)) / n;
      const a = makeAgent(i, "walker", anchor + (r() - 0.5) * 40, depth * (0.3 + r() * 0.6), r);
      a.anchor = anchor;
      a.zone = phone ? 60 : 110;
      a.max = 0.8 + r() * 0.3;
      walkers.push(a);
    }
    agents = [...walkers, ...keepers, monk];
    obstacles = [{ s: l.dogS, v: depth * 0.82, r: l.fig * 0.75 }];
    items = [];
    tasks = [];
    captions = [];
    motes = [];
    sky = [];
    steam = [];
    stallFlash = l.stalls.map(() => 0);
    // Seed the lanterns: about half already lit (simulated earlier visitors).
    const lr = rng(daySeed + 7);
    for (const ln of l.lanterns) {
      const lit = lr() < 0.5 ? 1 : 0;
      ln.lit = ln.target = lit;
      ln.litAt = lit ? -100 - lr() * 100 : -1;
    }
    o.onStep(0);
  };

  /* ----- flow helpers --------------------------------------------------------------------- */

  const spawn = (it: Flow): Task => {
    const t: Task = { it, cond: null, done: false };
    tasks.push(t);
    return t;
  };
  const wait = (sec: number): Cond => {
    const end = T + sec;
    return () => T >= end;
  };
  const until = (c: Cond, timeout = 14): Cond => {
    const end = T + timeout;
    return () => c() || T >= end;
  };
  const allDone =
    (ts: Task[]): Cond =>
    () =>
      ts.every((t) => t.done);

  const depthPx = () => world!.dv.y;
  const posOf = (a: Agent) => at(world!, a.s, a.v / depthPx());
  const goTo = (a: Agent, s: number, d: number, speed = 1.6) => {
    a.target = { s, v: d * depthPx() };
    a.arrived = false;
    a.max = speed;
    a.homing = false;
    a.pause = 0;
  };
  const free = () => agents.filter((a) => a.role === "walker" && !a.busy);
  const recruit = (s: number, v: number, not: Agent[] = []): Agent | null => {
    let best: Agent | null = null;
    let bd = Infinity;
    for (const a of free()) {
      if (not.includes(a)) continue;
      const d = Math.hypot(a.s - s, (a.v - v) * 1.5);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    if (best) {
      best.busy = true;
      best.homing = false;
      best.faceHold = 0;
    }
    return best;
  };
  const release = (a: Agent) => {
    a.busy = false;
    a.faceHold = 0;
    a.reachT = 0;
    a.max = 0.8 + r() * 0.3;
    a.target = { s: a.anchor + (r() - 0.5) * 40, v: depthPx() * (0.3 + r() * 0.55) };
    a.homing = true;
  };
  const emote = (a: Agent, kind: NonNullable<Agent["emote"]>["kind"], dur = 1.1) => {
    a.emote = { kind, t: T, dur };
  };
  const caption = (key: CaptionKey, p: Pt, dur = 2.2) => {
    captions.push({ text: o.captions[key], x: p.x, y: p.y, t0: T, dur });
  };
  const pan = (x: number) => Math.max(-0.8, Math.min(0.8, (x / W) * 2 - 1));
  let step = 0;
  const narrate = (i: number) => {
    if (i < step && i !== 0) return;
    step = i;
    o.onStep(i);
  };

  /** Hand an item from one agent to another over an arc (both reach for it). */
  function* give(it: Item, from: Agent, to: Agent): Flow {
    const fp = posOf(from);
    const tp = posOf(to);
    from.faceHold = tp.x >= fp.x ? 1 : -1;
    to.faceHold = fp.x >= tp.x ? 1 : -1;
    from.reachT = 1;
    to.reachT = 1;
    yield wait(0.16);
    it.holder = null;
    it.fly = {
      x0: it.x,
      y0: it.y,
      t: 0,
      dur: 0.38,
      lift: world!.fig * 0.45,
      to: () => to.hand,
      done: () => {
        it.holder = to;
        it.fly = null;
      },
    };
    o.sound.play("tick", pan(fp.x));
    yield until(() => it.fly === null, 2);
    from.reachT = 0;
    to.reachT = 0;
    if (from.role === "walker") from.faceHold = 0;
    if (to.role === "walker") to.faceHold = 0;
    yield wait(0.1);
  }

  /** The keeper of stall i works for `dur` seconds (busy hands, the lamp flares, gold steam). */
  function* work(i: number, dur: number): Flow {
    const k = keepers[i]!;
    k.work = dur;
    stallFlash[i] = 1;
    yield wait(dur);
  }

  /** One piece: to its stall, worked on, to the gate; the flagged one is turned back once. */
  function* piece(c: Agent, it: Item, si: number, flagged: boolean, slot: number, first: boolean): Flow {
    const l = world!;
    const st = l.stalls[si]!;
    const k = keepers[si]!;
    goTo(c, st.s + (r() - 0.5) * 6, 0.62);
    yield until(() => c.arrived, 10);
    yield* give(it, c, k);
    if (first) {
      caption("handoff", { x: k.hand.x, y: k.hand.y - l.fig * 0.5 });
      narrate(3);
    }
    yield* work(si, 0.6);
    yield* give(it, k, c);
    // To the gate (each piece queues at its own spot before it).
    const front = l.gateS - l.fig * (0.95 + slot * 0.42);
    goTo(c, front, 0.38 + slot * 0.22);
    yield until(() => c.arrived, 12);
    gate.scan = T;
    yield wait(0.4);
    if (flagged) {
      gate.block = 1;
      c.bump = 1;
      it.flag = "stopped";
      it.flash = 1;
      emote(c, "x", 1.4);
      o.sound.play("thud", pan(l.gate.far.x));
      caption("guardrail", { x: (l.gate.far.x + l.gate.near.x) / 2, y: l.gate.near.y - l.gate.h - l.fig * 1.5 }, 2.6);
      narrate(4);
      yield wait(0.9);
      // Turned back: redone at the stall nearest the gate.
      const ri = l.stalls.length - 1;
      const rk = keepers[ri]!;
      goTo(c, l.stalls[ri]!.s + 4, 0.66, 1.8);
      yield until(() => c.arrived, 10);
      yield* give(it, c, rk);
      yield* work(ri, 0.8);
      it.flag = "redone";
      it.flash = 1;
      caption("redo", { x: rk.hand.x, y: rk.hand.y - l.fig * 0.5 });
      yield* give(it, rk, c);
      goTo(c, l.gateS - l.fig * 0.95, 0.5, 1.8);
      yield until(() => c.arrived, 12);
      gate.scan = T;
      yield wait(0.5);
      gate.pass = 1;
      emote(c, "ok", 1.2);
      caption("passes", { x: (l.gate.far.x + l.gate.near.x) / 2, y: l.gate.near.y - l.gate.h - l.fig * 1.5 }, 1.8);
      narrate(5);
      o.sound.play("tick", pan(l.gate.far.x));
    } else {
      gate.pass = 1;
      emote(c, "ok", 0.9);
    }
    yield wait(0.25);
    // Up to the bell: stand in a little arc in front of the pavilion.
    const sideS = l.bellS + (slot - 1) * l.fig * 0.9 * (l.phone ? -1 : 1) - (l.phone ? -1 : 1) * l.fig * 0.35;
    goTo(c, sideS, 0.66 + Math.abs(slot - 1) * 0.12, 1.6);
    yield until(() => c.arrived, 14);
    c.faceHold = at(l, l.bellS, 0).x >= posOf(c).x ? 1 : -1;
  }

  /** The whole run for one coin. */
  function* run(coin: Item, s: number, d: number): Flow {
    const l = world!;
    const depth = depthPx();
    caption("task", { x: at(l, s, d).x, y: at(l, s, d).y - l.fig * 1.4 });
    narrate(1);
    yield until(() => !coin.drop, 3);
    let runner: Agent | null = null;
    yield until(() => (runner = recruit(s, d * depth)) !== null, 600);
    if (!runner) return;
    const ru: Agent = runner;
    emote(ru, "!", 0.9);
    yield wait(0.3);
    goTo(ru, s - 2, Math.min(0.9, d + 0.04), 1.75);
    yield until(() => ru.arrived, 10);
    coin.rest = null;
    coin.holder = ru;
    o.sound.play("tick", pan(posOf(ru).x));
    // Three more agents start toward the noodle stall while the coin is carried there.
    const st0 = l.stalls[0]!;
    const k0 = keepers[0]!;
    goTo(ru, st0.s, 0.58, 1.7);
    const carriers: Agent[] = [];
    for (let i = 0; i < 3; i++) {
      let c: Agent | null = null;
      yield until(() => (c = recruit(st0.s, depth * 0.6, [ru, ...carriers])) !== null, 600);
      if (!c) return;
      carriers.push(c);
      goTo(c, st0.s + (i + 1) * l.fig * 0.7 * (l.phone ? 0.8 : 1), 0.5 + (i % 2) * 0.32, 1.6);
    }
    yield until(() => ru.arrived, 10);
    yield* give(coin, ru, k0);
    release(ru);
    narrate(2);
    yield* work(0, 0.7);
    // Split in three.
    const shards: Item[] = [0, 1, 2].map((part) => ({
      ...newItem("shard"),
      part,
      x: coin.x,
      y: coin.y,
      holder: k0,
      flash: 1,
    }));
    items = items.filter((x) => x !== coin);
    items.push(...shards);
    caption("split", { x: k0.hand.x, y: k0.hand.y - l.fig * 0.55 });
    o.sound.play("clink", pan(k0.hand.x));
    yield wait(0.2);
    yield until(() => carriers.every((c) => c.arrived), 8);
    // The keeper hands the three pieces out almost at once.
    const handOut = (i: number): Flow =>
      (function* () {
        yield wait(i * 0.18);
        yield* give(shards[i]!, k0, carriers[i]!);
      })();
    yield allDone([0, 1, 2].map((i) => spawn(handOut(i))));
    const flagged = Math.floor(r() * 2);
    const kids = carriers.map((c, i) => spawn(piece(c, shards[i]!, i + 1, i === flagged, i, i === 0)));
    yield allDone(kids);
    // At the temple: the pieces join under the bell, the monk strikes, a lantern is lit.
    yield until(() => !bell.busy, 30);
    bell.busy = true;
    const under = { x: l.bell.x, y: l.bell.y + l.bell.size * 3.1 };
    for (let i = 0; i < 3; i++) {
      const it = shards[i]!;
      const from = carriers[i]!;
      from.reachT = 1;
      it.holder = null;
      it.fly = {
        x0: it.x,
        y0: it.y,
        t: 0,
        dur: 0.6 + i * 0.12,
        lift: l.fig * 0.6,
        to: () => under,
        done: () => (it.fly = null),
      };
    }
    yield until(() => shards.every((x) => !x.fly), 3);
    carriers.forEach((c) => (c.reachT = 0));
    const whole: Item = { ...newItem("coin"), x: under.x, y: under.y, flash: 1.4 };
    items = items.filter((x) => !shards.includes(x));
    items.push(whole);
    caption("merged", { x: under.x, y: under.y + l.fig * 0.9 });
    o.sound.play("clink", pan(under.x));
    yield wait(0.45);
    if (monk) monk.reachT = 1;
    yield wait(0.22);
    if (monk) monk.reachT = 0;
    bell.vel += 2.6;
    bell.glow = 1;
    bell.waves.push(T);
    o.sound.play("bell", pan(l.bell.x));
    narrate(6);
    yield wait(0.5);
    bell.waves.push(T);
    // The coin rises as a light into a lantern.
    const ln = claimLantern(l.bell);
    items = items.filter((x) => x !== whole);
    let landed = false;
    motes.push({
      x0: under.x,
      y0: under.y,
      x1: ln.x,
      y1: ln.y + ln.size * 1.6,
      t0: T,
      dur: 1.15,
      arc: l.fig * 2.2,
      done: () => (landed = true),
    });
    yield until(() => landed, 3);
    ln.target = 1;
    ln.litAt = T;
    count++;
    o.onCount(count, true);
    o.sound.play("shimmer", pan(ln.x));
    caption("lit", { x: ln.x, y: ln.y - l.fig * 0.5 }, 2.4);
    bell.busy = false;
    yield wait(0.6);
    carriers.forEach(release);
    stepIdle = T + 5;
  }

  const newItem = (kind: Item["kind"]): Item => ({
    id: itemId++,
    kind,
    part: 0,
    x: 0,
    y: 0,
    holder: null,
    fly: null,
    drop: null,
    rest: null,
    spin: 0,
    flag: "none",
    flash: 0,
    alpha: 1,
  });

  /** An unlit lantern near `p`; when every lantern is lit, the oldest floats off as a sky lantern. */
  const claimLantern = (p: Pt, anywhere = false): Lantern => {
    const l = world!;
    let unlit = l.lanterns.filter((x) => x.target === 0);
    if (!unlit.length) {
      const oldest = [...l.lanterns].sort((a, b) => a.litAt - b.litAt)[0]!;
      sky.push({ x: oldest.x, y: oldest.y + oldest.size, t0: T, phase: r() * 6, size: oldest.size });
      oldest.lit = 0;
      oldest.target = 0;
      unlit = [oldest];
    }
    if (anywhere) return unlit[Math.floor(r() * unlit.length)]!;
    unlit.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    return unlit[Math.floor(r() * Math.min(5, unlit.length))]!;
  };

  /* ----- input ---------------------------------------------------------------------------- */

  const dropAt = (x: number, y: number) => {
    if (!world) return;
    const l = world;
    const waiting = items.filter((i) => i.kind === "coin").length + tasks.filter((t) => !t.done).length;
    if (waiting > 8) return;
    const { s, d } = locate(l, x, y, l.dropMax);
    const g = at(l, s, d);
    const coin = newItem("coin");
    coin.x = g.x;
    coin.y = Math.min(y, g.y - l.fig * 0.8) - l.fig * 2.2;
    coin.drop = { vy: 0, ground: g.y - 3, bounces: 0 };
    coin.rest = { s, d };
    items.push(coin);
    if (o.still) {
      // Reduced motion: no run; the bell is rung and a lantern lit at once.
      items = items.filter((i) => i !== coin);
      const ln = claimLantern(l.bell);
      ln.lit = ln.target = 1;
      ln.litAt = T;
      bell.glow = 0.8;
      count++;
      o.onCount(count, true);
      o.onStep(6);
      draw();
      return;
    }
    spawn(run(coin, s, d));
  };
  const local = (e: PointerEvent | MouseEvent) => {
    const rc = canvas.getBoundingClientRect();
    return { x: e.clientX - rc.left, y: e.clientY - rc.top };
  };
  const onClick = (e: MouseEvent) => {
    const p = local(e);
    dropAt(p.x, p.y);
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const p = local(e);
    hover = { x: p.x, y: p.y, on: true };
  };
  const onLeave = () => {
    hover.on = false;
  };
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);

  /* ----- simulation ----------------------------------------------------------------------- */

  const update = (dt: number) => {
    const l = world!;
    T += dt;
    boilT += dt;
    if (boilT > 0.125) {
      boilT = 0;
      boil = (boil + 1) % 3;
    }
    // Flows.
    for (const t of [...tasks]) {
      let guard = 0;
      while (!t.done && (!t.cond || t.cond()) && guard++ < 32) {
        const res = t.it.next();
        if (res.done) t.done = true;
        else t.cond = res.value;
      }
    }
    tasks = tasks.filter((t) => !t.done);
    if (step === 6 && T > stepIdle && !tasks.length) {
      step = 0;
      o.onStep(0);
    }

    steer(agents, obstacles, l, dt, r);
    for (const a of agents) {
      updateFacing(a, l);
      a.reach += (a.reachT - a.reach) * Math.min(1, dt * 12);
      if (a.work > 0) a.work = Math.max(0, a.work - dt);
      if (a.emote && T > a.emote.t + a.emote.dur) a.emote = null;
    }
    // Idle walkers that stop near each other turn and chat.
    for (const a of agents) {
      if (a.role !== "walker" || a.busy || a.target || a.pause <= 0) continue;
      for (const b of agents) {
        if (b === a || b.role !== "walker" || b.busy || b.pause <= 0) continue;
        if (Math.abs(a.s - b.s) < l.fig * 1.1 && Math.abs(a.v - b.v) < l.fig * 0.8) {
          a.faceHold = b.s > a.s === at(l, a.s + 1, 0).x > at(l, a.s, 0).x ? 1 : -1;
          if (!a.emote && r() < dt * 0.35) emote(a, "chat", 1.6);
        }
      }
      if (a.pause <= 0.05) a.faceHold = 0;
    }

    // Items.
    for (const it of items) {
      it.flash = Math.max(0, it.flash - dt * 1.6);
      if (it.drop) {
        it.drop.vy += 1900 * dt;
        it.y += it.drop.vy * dt;
        it.spin += dt * 14;
        if (it.y >= it.drop.ground) {
          it.y = it.drop.ground;
          if (it.drop.vy > 120 && it.drop.bounces < 3) {
            if (it.drop.bounces === 0) {
              o.sound.play("clink", pan(it.x));
              it.flash = 1;
            }
            it.drop.vy = -it.drop.vy * 0.34;
            it.drop.bounces++;
          } else {
            it.drop = null;
            it.spin = 0;
          }
        }
      } else if (it.fly) {
        const f = it.fly;
        f.t = Math.min(1, f.t + dt / f.dur);
        const e = f.t < 0.5 ? 2 * f.t * f.t : 1 - (-2 * f.t + 2) ** 2 / 2;
        const tg = f.to();
        it.x = f.x0 + (tg.x - f.x0) * e;
        it.y = f.y0 + (tg.y - l.fig * 0.12 - f.y0) * e - Math.sin(f.t * Math.PI) * f.lift;
        it.spin += dt * 9;
        if (f.t >= 1) f.done();
      } else if (it.holder) {
        it.x = it.holder.hand.x;
        it.y = it.holder.hand.y - l.fig * 0.12;
        it.spin *= Math.exp(-dt * 8);
      } else if (it.rest) {
        const g = at(l, it.rest.s, it.rest.d);
        it.x = g.x;
        it.y = g.y - 3;
      }
    }

    // Bell: a damped swing; its glow fades.
    bell.vel += (-bell.ang * 26 - bell.vel * 1.4) * dt;
    bell.ang += bell.vel * dt;
    bell.glow = Math.max(0, bell.glow - dt * 0.35);
    bell.waves = bell.waves.filter((t0) => T - t0 < 2.2);
    gate.block = Math.max(0, gate.block - dt * 0.55);
    gate.pass = Math.max(0, gate.pass - dt * 1.6);
    gate.pulse += dt;
    stallFlash = stallFlash.map((v) => Math.max(0, v - dt * 0.9));

    // Lanterns ease toward lit; sky lanterns rise.
    for (const ln of l.lanterns) ln.lit += (ln.target - ln.lit) * Math.min(1, dt * 3);
    sky = sky.filter((s) => T - s.t0 < 26);

    // Steam from the noodle pot and the grill (gold while a keeper works).
    l.stalls.forEach((st, i) => {
      if (!st.steam) return;
      if (r() < dt * (keepers[i]!.work > 0 ? 14 : 4)) {
        steam.push({
          x: st.steam.x + (r() - 0.5) * 6,
          y: st.steam.y,
          age: 0,
          life: 1.6 + r() * 1.2,
          gold: keepers[i]!.work > 0,
          ph: r() * 6,
        });
      }
    });
    for (const p of steam) {
      p.age += dt;
      p.y -= dt * 13;
      p.x += Math.sin(p.age * 2 + p.ph) * dt * 6;
    }
    steam = steam.filter((p) => p.age < p.life);

    // Earlier visitors (simulated): now and then a lantern lights somewhere on its own.
    if (T > nextOther) {
      nextOther = T + 9 + r() * 10;
      const ln = claimLantern({ x: 0, y: 0 }, true);
      ln.target = 1;
      ln.litAt = T;
      count++;
      o.onCount(count, false);
    }
    captions = captions.filter((c) => T - c.t0 < c.dur);
    motes = motes.filter((m) => {
      if (T - m.t0 >= m.dur) {
        m.done();
        return false;
      }
      return true;
    });
  };

  /* ----- drawing -------------------------------------------------------------------------- */

  const stamp = (img: HTMLCanvasElement, x: number, y: number, rad: number, a: number) => {
    if (a <= 0.003) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(img, x - rad, y - rad, rad * 2, rad * 2);
  };

  const drawLantern = (ln: Lantern) => {
    const sway = Math.sin(T * 1.1 + ln.phase) * 0.07 + Math.sin(T * 0.37 + ln.phase * 2) * 0.03;
    const s = ln.size;
    ctx.save();
    ctx.translate(ln.x, ln.y);
    ctx.rotate(sway);
    ctx.strokeStyle = rgba(P.ink, 0.5);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s * 0.45);
    ctx.stroke();
    const cy = s * 0.45 + s * 1.05;
    const flick = 0.92 + Math.sin(T * 9 + ln.phase * 5) * 0.04 + Math.sin(T * 13.7 + ln.phase) * 0.03;
    const lit = ln.lit * flick;
    ctx.fillStyle =
      lit > 0.02
        ? rgba(mix(mix(P.night, P.gold, 0.3), mix(P.gold, [255, 236, 190], 0.3), Math.min(1, lit)))
        : rgba(mix(P.night, P.ink, 0.06));
    ctx.beginPath();
    ctx.ellipse(0, cy, s * 0.78, s * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lit > 0.02 ? rgba(mix(P.gold, [90, 50, 10], 0.35), 0.9) : rgba(P.ink, 0.55);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // Ribs and caps.
    ctx.beginPath();
    ctx.moveTo(0, cy - s * 1.05);
    ctx.lineTo(0, cy + s * 1.05);
    ctx.ellipse(0, cy, s * 0.4, s * 1.05, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = rgba(P.ink, 0.7);
    ctx.fillRect(-s * 0.4, cy - s * 1.12, s * 0.8, s * 0.18);
    ctx.fillRect(-s * 0.4, cy + s * 0.96, s * 0.8, s * 0.18);
    ctx.restore();
    if (ln.lit > 0.02) {
      const fresh = ln.litAt > 0 ? Math.max(0, 1 - (T - ln.litAt) / 1.4) : 0;
      ctx.globalCompositeOperation = "lighter";
      stamp(glow, ln.x + Math.sin(sway) * -cy, ln.y + cy, s * (5.5 + fresh * 9), (0.32 + fresh * 0.7) * lit);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  };

  const drawSkyLantern = (s: Sky) => {
    const age = T - s.t0;
    const x = s.x + Math.sin(age * 0.6 + s.phase) * 10 + age * 3;
    const y = s.y - age * 16 - age * age * 0.2;
    const a = Math.min(1, age * 2) * Math.max(0, 1 - age / 26) * (y > -20 ? 1 : 0);
    if (a <= 0) return;
    ctx.globalCompositeOperation = "lighter";
    stamp(warm, x, y, s.size * 5, 0.45 * a);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = a;
    ctx.fillStyle = rgba(mix(P.gold, [255, 236, 190], 0.3));
    ctx.beginPath();
    ctx.moveTo(x - s.size * 0.7, y - s.size);
    ctx.lineTo(x + s.size * 0.7, y - s.size);
    ctx.lineTo(x + s.size * 0.5, y + s.size);
    ctx.lineTo(x - s.size * 0.5, y + s.size);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const drawBell = () => {
    const l = world!;
    const b = l.bell;
    const s = b.size;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(bell.ang * 0.25);
    ctx.strokeStyle = rgba(P.ink, 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s * 0.5);
    ctx.stroke();
    const bp = new Path2D();
    bp.moveTo(-s * 0.35, s * 0.6);
    bp.bezierCurveTo(-s * 0.6, s * 0.65, -s * 0.62, s * 1.6, -s * 1.05, s * 2.35);
    bp.lineTo(s * 1.05, s * 2.35);
    bp.bezierCurveTo(s * 0.62, s * 1.6, s * 0.6, s * 0.65, s * 0.35, s * 0.6);
    bp.closePath();
    ctx.fillStyle = rgba(mix(P.night, P.gold, 0.32 + bell.glow * 0.5));
    ctx.fill(bp);
    ctx.strokeStyle = rgba(P.gold, 0.95);
    ctx.lineWidth = 1.4;
    ctx.stroke(bp);
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, s * 2.05);
    ctx.lineTo(s * 0.85, s * 2.05);
    ctx.moveTo(-s * 0.5, s * 1.2);
    ctx.lineTo(s * 0.5, s * 1.2);
    ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    stamp(glow, b.x, b.y + s * 1.5, s * (4 + bell.glow * 8), 0.22 + bell.glow * 0.75);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    // Sound rings: hand-drawn arcs spreading from the bell.
    for (const t0 of bell.waves) {
      const k = (T - t0) / 2.2;
      const rad = s * 2 + k * l.fig * 2.6;
      ctx.strokeStyle = rgba(P.gold, 0.7 * (1 - k));
      ctx.lineWidth = 1.4;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          b.x,
          b.y + s * 1.5,
          rad,
          side < 0 ? Math.PI * 0.8 : -Math.PI * 0.2,
          side < 0 ? Math.PI * 1.2 : Math.PI * 0.2,
        );
        ctx.stroke();
      }
    }
  };

  const drawGate = (front: boolean) => {
    const l = world!;
    const { far, near, h } = l.gate;
    if (front) {
      ctx.drawImage(
        l.gateFront.sprite,
        l.gateFront.x,
        l.gateFront.y,
        l.gateFront.sprite.width / dpr,
        l.gateFront.sprite.height / dpr,
      );
      return;
    }
    // The guardrail field between the pillars.
    const base = 0.05 + Math.sin(gate.pulse * 1.6) * 0.02;
    const scanK = gate.scan >= 0 ? Math.max(0, 1 - (T - gate.scan) / 0.6) : 0;
    const field = base + gate.block * 0.3 + gate.pass * 0.12 + scanK * 0.1;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const quad = new Path2D();
    quad.moveTo(far.x, far.y);
    quad.lineTo(near.x, near.y);
    quad.lineTo(near.x, near.y - h);
    quad.lineTo(far.x, far.y - h);
    quad.closePath();
    ctx.fillStyle = rgba(P.gold, field * 0.55);
    ctx.fill(quad);
    ctx.clip(quad);
    ctx.strokeStyle = rgba(P.gold, Math.min(0.8, field * 1.6));
    ctx.lineWidth = 1;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = (i + ((gate.pulse * 0.6) % 1)) / n;
      ctx.beginPath();
      ctx.moveTo(far.x + (near.x - far.x) * t, far.y + (near.y - far.y) * t);
      ctx.lineTo(far.x + (near.x - far.x) * t, far.y - h + (near.y - far.y) * t);
      ctx.stroke();
    }
    if (scanK > 0) {
      const y = far.y - h * (1 - scanK);
      ctx.strokeStyle = rgba(P.gold, 0.9 * scanK);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(far.x, y);
      ctx.lineTo(near.x, y + (near.y - far.y));
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    const gx = (far.x + near.x) / 2;
    const gy = (far.y + near.y) / 2 - h - l.fig * 0.55;
    stamp(glow, gx, gy, l.fig * (1.6 + gate.block * 2.5), 0.3 + gate.block * 0.6 + gate.pass * 0.4);
    stamp(
      glow,
      gx,
      (far.y + near.y) / 2 - h * 0.5,
      l.fig * (1.2 + gate.block * 2.2),
      gate.block * 0.55 + gate.pass * 0.3,
    );
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  const drawDog = () => {
    const l = world!;
    const p = at(l, l.dogS, 0.82);
    const s = l.fig * 0.42;
    const br = 1 + Math.sin(T * 1.6) * 0.04;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, s * 1.4, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(mix(P.night, P.ink, 0.1));
    ctx.strokeStyle = rgba(P.ink, 0.85);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - s * 0.38 * br, s * 1.1, s * 0.42 * br, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(p.x + s * 1.05, p.y - s * 0.3, s * 0.42, s * 0.32, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x + s * 0.95, p.y - s * 0.55);
    ctx.lineTo(p.x + s * 1.05, p.y - s * 0.85);
    ctx.lineTo(p.x + s * 1.2, p.y - s * 0.58);
    ctx.moveTo(p.x - s * 1.05, p.y - s * 0.3);
    ctx.quadraticCurveTo(p.x - s * 1.6, p.y - s * 0.1, p.x - s * 1.3, p.y + s * 0.05);
    ctx.stroke();
    // Zz.
    const z = (T * 0.5) % 3;
    if (z < 1.6) {
      ctx.globalAlpha = Math.sin((z / 1.6) * Math.PI) * 0.7;
      ctx.font = `${Math.round(s * 0.7)}px ${mono}`;
      ctx.fillStyle = rgba(P.ink, 1);
      ctx.fillText("z", p.x + s * 1.3 + z * 4, p.y - s * 1.2 - z * 7);
      ctx.globalAlpha = 1;
    }
  };

  const drawCat = () => {
    const l = world!;
    const { x, y } = l.cat;
    const s = l.fig * 0.32;
    ctx.fillStyle = rgba(mix(P.night, [0, 0, 0], 0.2));
    ctx.strokeStyle = rgba(P.ink, 0.85);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.6, s * 0.55, s * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s * 0.3, y - s * 1.35, s * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.05, y - s * 1.55);
    ctx.lineTo(x + s * 0.1, y - s * 1.95);
    ctx.lineTo(x + s * 0.3, y - s * 1.68);
    ctx.lineTo(x + s * 0.5, y - s * 1.95);
    ctx.lineTo(x + s * 0.58, y - s * 1.55);
    ctx.stroke();
    const flick = Math.sin(T * 2.2) * 0.5 + Math.sin(T * 0.7) * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.15);
    ctx.quadraticCurveTo(x - s * 1.2, y - s * 0.1, x - s * (1.1 + flick * 0.2), y - s * (0.9 + flick * 0.4));
    ctx.stroke();
  };

  /** A longtail boat moored on the canal, bobbing, a small lamp on its bow. */
  const drawBoat = () => {
    const l = world!;
    const water = H - l.canalY;
    if (water < l.fig * 1.2) return;
    const s = l.fig * (phone ? 0.8 : 0.72);
    const x = phone ? W * 0.62 : W * 0.43;
    const y = l.canalY + water * 0.42 + Math.sin(T * 1.2) * 1.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(T * 0.9) * 0.025);
    const hull = new Path2D();
    hull.moveTo(-s * 1.9, -s * 0.22);
    hull.quadraticCurveTo(-s * 1.2, s * 0.2, 0, s * 0.18);
    hull.quadraticCurveTo(s * 1.4, s * 0.16, s * 2.1, -s * 0.5);
    hull.lineTo(s * 1.75, -s * 0.12);
    hull.lineTo(-s * 1.7, -s * 0.12);
    hull.closePath();
    ctx.fillStyle = rgba(mix(P.night, P.ink, 0.06));
    ctx.fill(hull);
    ctx.strokeStyle = rgba(P.ink, 0.8);
    ctx.lineWidth = 1.2;
    ctx.stroke(hull);
    ctx.beginPath();
    ctx.moveTo(-s * 1.5, -s * 0.02);
    ctx.lineTo(s * 1.5, 0);
    // The long-tail engine shaft at the stern.
    ctx.moveTo(-s * 1.8, -s * 0.25);
    ctx.lineTo(-s * 2.9, s * 0.2);
    // A canopy on two posts.
    ctx.moveTo(-s * 0.7, -s * 0.12);
    ctx.lineTo(-s * 0.7, -s * 0.85);
    ctx.moveTo(s * 0.5, -s * 0.12);
    ctx.lineTo(s * 0.5, -s * 0.85);
    ctx.moveTo(-s * 0.95, -s * 0.85);
    ctx.quadraticCurveTo(-s * 0.1, -s * 1.05, s * 0.75, -s * 0.85);
    ctx.stroke();
    // Garland on the bow.
    ctx.strokeStyle = rgba(P.gold, 0.85);
    ctx.beginPath();
    ctx.moveTo(s * 1.9, -s * 0.38);
    ctx.quadraticCurveTo(s * 2.0, -s * 0.1, s * 1.75, -s * 0.15);
    ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    stamp(warm, x + s * 1.95, y - s * 0.55, s * 1.4, 0.35 + Math.sin(T * 5) * 0.03);
    // Its light, broken on the water below.
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.25 - i * 0.06;
      ctx.fillStyle = rgba(P.gold, 1);
      const w = s * (0.9 - i * 0.2) * (1 + Math.sin(T * 2 + i) * 0.3);
      ctx.fillRect(x + s * 1.95 - w / 2 + Math.sin(T * 1.6 + i) * 2, y + s * (0.5 + i * 0.28), w, 1.3);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  const draw = () => {
    if (!world || !layer) return;
    const l = world;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(layer, 0, 0, W, H);

    // Twinkling stars in open sky.
    for (const s of l.stars) {
      const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(T * (0.8 + s.r) + s.p));
      ctx.fillStyle = rgba(P.ink, a * 0.8);
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    for (const s of sky) drawSkyLantern(s);

    // Canal: lantern and lamp light broken up on the water.
    ctx.globalCompositeOperation = "lighter";
    for (const ln of l.lanterns) {
      if (ln.lit < 0.05 || ln.y < l.canalY - H * 0.45) continue;
      for (let i = 0; i < 3; i++) {
        const y = l.canalY + 14 + i * 9 + (ln.y % 7);
        if (y > H - 4) break;
        const w = ln.size * (2.4 - i * 0.5) * (1 + Math.sin(T * 1.7 + ln.phase + i) * 0.25);
        ctx.fillStyle = rgba(P.gold, 0.14 * ln.lit * (1 - i * 0.25));
        ctx.fillRect(ln.x - w / 2 + Math.sin(T * 1.3 + i + ln.phase) * 2, y, w, 1.4);
      }
    }
    ctx.globalCompositeOperation = "source-over";

    for (const ln of l.lanterns) drawLantern(ln);
    drawBoat();

    // Stall lamps.
    ctx.globalCompositeOperation = "lighter";
    l.stalls.forEach((st, i) => {
      const f = 0.9 + Math.sin(T * 7 + i * 2) * 0.05;
      stamp(warm, st.lamp.x, st.lamp.y, l.fig * (1.3 + stallFlash[i]! * 1.4), (0.42 + stallFlash[i]! * 0.5) * f);
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    drawCat();
    drawGate(false);

    // Everything on the walkway, back to front.
    type D = { y: number; draw: () => void };
    const list: D[] = [];
    const depth = l.dv.y;
    for (const a of agents) {
      const p = posOf(a);
      list.push({
        y: p.y + (a.role === "keeper" ? -0.5 : 0),
        draw: () => drawAgent(ctx, a, p, l.fig * (a.role === "monk" ? 1.02 : 1), P, T, boil),
      });
    }
    l.stalls.forEach((st) => {
      const y = at(l, st.s, 0.3).y - 0.1;
      list.push({
        y,
        draw: () => ctx.drawImage(st.sprite, st.sx, st.sy, st.sprite.width / dpr, st.sprite.height / dpr),
      });
    });
    list.push({ y: at(l, l.dogS, 0.82).y, draw: drawDog });
    list.push({ y: l.gate.near.y + 0.5, draw: () => drawGate(true) });
    list.push({ y: at(l, l.bellS, 0.2).y, draw: drawBell });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    void depth;

    // Steam.
    for (const p of steam) {
      const k = p.age / p.life;
      ctx.strokeStyle = p.gold ? rgba(P.gold, 0.55 * (1 - k)) : rgba(P.ink, 0.28 * (1 - k));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + k * 5, Math.PI * 0.9, Math.PI * 1.9);
      ctx.stroke();
    }

    // Items over everything on the street.
    const isz = l.fig * 0.2;
    for (const it of items) drawItem(ctx, it, it.x, it.y, isz, P, glow);
    for (const m of motes) {
      const k = Math.min(1, (T - m.t0) / m.dur);
      const e = 1 - (1 - k) ** 3;
      const x = m.x0 + (m.x1 - m.x0) * e;
      const y = m.y0 + (m.y1 - m.y0) * e - Math.sin(k * Math.PI) * m.arc;
      ctx.globalCompositeOperation = "lighter";
      stamp(glow, x, y, l.fig * 0.9, 0.9);
      for (let i = 1; i < 6; i++) {
        const kk = Math.max(0, k - i * 0.03);
        const ee = 1 - (1 - kk) ** 3;
        stamp(
          glow,
          m.x0 + (m.x1 - m.x0) * ee,
          m.y0 + (m.y1 - m.y0) * ee - Math.sin(kk * Math.PI) * m.arc,
          l.fig * 0.5,
          0.35 * (1 - i / 6),
        );
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    for (const a of agents) drawEmote(ctx, a, posOf(a), l.fig, P, T);

    // Captions: small mono labels with a hairline down to the event.
    for (const c of captions) {
      const k = Math.min(1, (T - c.t0) / 0.25) * Math.min(1, (c.t0 + c.dur - T) / 0.5);
      if (k <= 0) continue;
      const fs = phone ? 10.5 : 12;
      ctx.font = o.thai ? `500 ${fs + 1}px ${sans}` : `500 ${fs}px ${mono}`;
      const tw = ctx.measureText(c.text).width;
      const x = Math.max(8 + tw / 2, Math.min(W - 8 - tw / 2, c.x));
      const y = c.y - (1 - k) * 6;
      ctx.globalAlpha = k;
      ctx.fillStyle = rgba(mix(P.night, [0, 0, 0], 0.3), 0.72);
      ctx.beginPath();
      ctx.roundRect(x - tw / 2 - 7, y - fs - 4, tw + 14, fs + 10, 6);
      ctx.fill();
      ctx.strokeStyle = rgba(P.gold, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = rgba(P.ink, 0.95);
      ctx.textAlign = "center";
      ctx.fillText(c.text, x, y);
      ctx.textAlign = "start";
      ctx.globalAlpha = 1;
    }

    if (l.leaves)
      ctx.drawImage(l.leaves.sprite, l.leaves.x, l.leaves.y, l.leaves.sprite.width / dpr, l.leaves.sprite.height / dpr);

    // Hover: a ghost coin over the pointer, a dotted fall line to where it would land.
    const near = hover.on && !o.still ? locate(l, hover.x, hover.y, l.dropMax) : null;
    const g = near ? at(l, near.s, near.d) : null;
    // Only near the street: far up in the sky the line would be noise (a click still drops).
    if (g && Math.abs(g.x - hover.x) < l.fig * 1.5 && g.y - hover.y < l.fig * 4.5 && hover.y - g.y < l.fig) {
      const top = Math.min(hover.y, g.y - l.fig * 0.8);
      ctx.strokeStyle = rgba(P.gold, 0.45);
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(g.x, top + isz);
      ctx.lineTo(g.x, g.y - 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, isz * 1.4, isz * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      const ghost: Item = { ...newItem("coin"), spin: T * 2, alpha: 0.7 };
      itemId--;
      drawItem(ctx, ghost, g.x, top + Math.sin(T * 3) * 2, isz, P, glow);
    }
  };

  /* ----- run ------------------------------------------------------------------------------ */

  build();
  let stop = () => {};
  if (o.still) {
    tableau();
    draw();
  } else {
    // A few seconds of life before the first frame, so the soi is already going.
    for (let i = 0; i < 90; i++) update(1 / 60);
    stop = runLoop(host, (_t, dt) => {
      update(dt);
      draw();
    });
  }
  let lastW = W;
  const ro = new ResizeObserver(() => {
    const w = Math.round(host.getBoundingClientRect().width);
    if (Math.abs(w - lastW) < 2) return;
    lastW = w;
    build();
    if (o.still) tableau();
    draw();
  });
  ro.observe(host);

  /** Reduced motion: one composed frame that tells the whole story at once. */
  function tableau() {
    const l = world!;
    const depth = l.dv.y;
    const w = agents.filter((a) => a.role === "walker");
    const place = (a: Agent | undefined, s: number, d: number, face: 1 | -1, reach = 0) => {
      if (!a) return;
      a.s = s;
      a.v = d * depth;
      a.vs = a.vv = 0;
      a.faceHold = face;
      a.face = face;
      a.reach = reach;
    };
    const st = l.stalls;
    const k0 = keepers[0]!;
    place(w[0], st[0]!.s + l.fig * 0.2, 0.6, at(l, st[0]!.s, 0).x > at(l, st[0]!.s + 1, 0).x ? 1 : -1, 1);
    k0.reach = 1;
    place(w[1], st[2]!.s, 0.62, -1);
    place(w[2], l.gateS - l.fig * 0.7, 0.5, -1);
    place(w[3], l.bellS - l.fig * (l.phone ? -1 : 1), 0.7, l.phone ? -1 : 1);
    const mk = (kind: Item["kind"], part: number, holder: Agent | undefined): Item => ({
      ...newItem(kind),
      part,
      holder: holder ?? null,
    });
    const s1 = mk("shard", 0, w[1]);
    const s2 = { ...mk("shard", 1, w[2]), flag: "stopped" as const };
    const s3 = mk("shard", 2, k0);
    items = [s1, s2, s3];
    if (w[2]) w[2].emote = { kind: "x", t: 0, dur: 1e9 };
    gate.block = 0.8;
    bell.glow = 0.6;
    // Hands are measured while drawing; draw once to place them, then put the items there.
    draw();
    for (const it of items)
      if (it.holder) {
        it.x = it.holder.hand.x;
        it.y = it.holder.hand.y - l.fig * 0.12;
      }
    captions = [
      { text: o.captions.handoff, x: at(l, st[0]!.s, 0).x, y: at(l, st[0]!.s, 0).y - l.fig * 1.5, t0: -1, dur: 1e9 },
      {
        text: o.captions.guardrail,
        x: (l.gate.far.x + l.gate.near.x) / 2,
        y: l.gate.far.y - l.gate.h - l.fig * 1.3,
        t0: -1,
        dur: 1e9,
      },
    ];
    T = 0.6;
  }

  return {
    drop: () => {
      if (!world) return;
      const l = world;
      const s = 30 + r() * (l.dropMax * 0.5);
      const g = at(l, s, 0.6);
      dropAt(g.x, g.y);
    },
    destroy: () => {
      stop();
      ro.disconnect();
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      tasks = [];
      canvas.remove();
    },
  };
}
