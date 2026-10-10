import { QUAD_VS, program, texture, target, freeTarget, releaseContext, fitCanvas, type Target } from "../kit/gl";
import { readProfile, runLoop, sceneColors, softwareGl } from "../kit/loop";
import * as S from "./shaders";

/*
 * One drop. A bowl of dark water seen from a little above. Two sims share the water disc:
 *  - ripples: a damped wave on a height field (the rings and the light that runs over them);
 *  - ink: a compact Stable Fluids solve (after PavelDoGreat's WebGL-Fluid-Simulation, MIT, via
 *    gold-ink-water) carrying two dyes: R = fresh gold, G = the day's older drops, deeper and dim.
 * A drop is a gold bead that forms above the touch point (it swells while held), falls, dents
 * the surface, throws up a small jet and a droplet, and blooms. Fresh gold settles into the
 * older layer over a minute or so: your drop joins everyone's.
 */

/** Bowl geometry, in units of the rim radius. */
const GEO = { k: 0.4, wl: 0.07, rw: 0.95, hb: 0.4, ri: 0.97 };
const CQ = Math.sqrt(1 - GEO.k * GEO.k);
/** Height (R units) the bead forms at above the water. */
const H0 = 0.5;
const HOLD_MAX = 1.6;

type Double = { read: Target; write: Target; swap: () => void };
type Drop = {
  x: number;
  y: number;
  h: number;
  vh: number;
  r: number;
  w: number;
  /** form: held above the water; fall; droplet: the small one thrown up by the jet; fade: let go. */
  phase: "form" | "fall" | "droplet" | "fade";
  t: number;
  alpha: number;
};
type Jet = { x: number; y: number; t: number; life: number; h: number; w: number; weight: number; spawned: boolean };

export type Bowl = {
  /** Start forming a bead over this point (client px). Returns false if the point is off the bowl area. */
  press: (cx: number, cy: number) => void;
  move: (cx: number, cy: number) => void;
  release: () => void;
  cancel: () => void;
  /** A drop at a disc point (keyboard): weight 0..1. */
  dropAt: (x: number, y: number, weight: number) => void;
  destroy: () => void;
};

export function createBowl(
  host: HTMLElement,
  scene: HTMLElement,
  opts: { onImpact?: (weight: number, small: boolean) => void },
): Bowl | "software" | null {
  const prof = readProfile(2);
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false });
  if (!gl) {
    canvas.remove();
    return null;
  }
  if (softwareGl(gl)) {
    releaseContext(gl);
    canvas.remove();
    return "software";
  }
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_color_buffer_half_float");
  const { gold, ground } = sceneColors(scene);
  const lin = (c: [number, number, number]) => c.map((v) => Math.pow(v, 2.2)) as [number, number, number];
  const goldL = lin(gold);
  const nightL = lin(ground);

  const P = {
    rStep: program(gl, QUAD_VS, S.RIPPLE_STEP),
    rSplat: program(gl, QUAD_VS, S.RIPPLE_SPLAT),
    push: program(gl, QUAD_VS, S.PUSH),
    ink: program(gl, QUAD_VS, S.INK),
    current: program(gl, QUAD_VS, S.CURRENT),
    advVel: program(gl, QUAD_VS, S.ADVECT_VEL),
    advDye: program(gl, QUAD_VS, S.ADVECT_DYE),
    curl: program(gl, QUAD_VS, S.CURL),
    vort: program(gl, QUAD_VS, S.VORTICITY),
    div: program(gl, QUAD_VS, S.DIVERGENCE),
    scale: program(gl, QUAD_VS, S.SCALE),
    pres: program(gl, QUAD_VS, S.PRESSURE),
    grad: program(gl, QUAD_VS, S.GRADIENT),
    show: program(gl, QUAD_VS, S.DISPLAY),
  };
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const rt = (n: number) => target(gl, [texture(gl, n, n, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR)], n, n);
  const dbl = (n: number): Double => {
    const d: Double = {
      read: rt(n),
      write: rt(n),
      swap: () => {
        [d.read, d.write] = [d.write, d.read];
      },
    };
    return d;
  };
  // Sim sizes: phones get about half the cells in each direction.
  const NV = prof.phone ? 112 : 192;
  const ND = prof.phone ? 320 : 640;
  const NH = prof.phone ? 200 : 320;
  const vel = dbl(NV);
  const pres = dbl(NV);
  const dye = dbl(ND);
  const ripple = dbl(NH);
  const curl = rt(NV);
  const divg = rt(NV);
  for (const t of [
    vel.read,
    vel.write,
    pres.read,
    pres.write,
    dye.read,
    dye.write,
    ripple.read,
    ripple.write,
    curl,
    divg,
  ]) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  let unit = 0;
  const bind = (p: S_Program) => {
    gl.useProgram(p.prog);
    unit = 0;
  };
  const tex = (p: S_Program, name: string, t: WebGLTexture | null) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.uniform1i(p.u[name] ?? null, unit++);
  };
  const blit = (t: Target | null) => {
    if (t) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, t.w, t.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // Layout: the bowl centred, sized to the stage, room above it for the bead to form.
  let cssW = 1;
  let cssH = 1;
  let R = 100;
  let cx = 0;
  let cy = 0;
  /** The governor's adaptive resolution scale (the display pass only; the sims keep their size). */
  let quality = 1;
  const layout = () => {
    const r = host.getBoundingClientRect();
    cssW = Math.max(1, r.width);
    cssH = Math.max(1, r.height);
    fitCanvas(canvas, cssW, cssH, prof.dpr * quality, prof.phone ? 2_200_000 : 4_200_000);
    // The bowl spans about -0.4R (rim back) .. +0.56R (foot front); the bead forms ~0.45R above
    // the water, so the stage holds about 1.5R of height.
    R = Math.min(cssW * (prof.phone ? 0.46 : 0.3), cssH / 1.55);
    cx = cssW / 2;
    // Centre the bowl's whole extent (bead headroom 0.85R above the rim centre, foot 0.62R below).
    cy = (cssH - 1.47 * R) / 2 + 0.85 * R;
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(host);

  /** Disc point (R units) to sim uv. */
  const uvOf = (x: number, y: number): [number, number] => [0.5 + (0.5 * x) / GEO.rw, 0.5 - (0.5 * y) / GEO.rw];
  /** Client px to a disc point, clamped inside the water. */
  const toDisc = (clientX: number, clientY: number): [number, number] => {
    const b = host.getBoundingClientRect();
    const qx = (clientX - b.left - cx) / R;
    const qy = (clientY - b.top - cy) / R;
    let x = qx;
    let y = (qy - GEO.wl * CQ) / GEO.k;
    const l = Math.hypot(x, y);
    const max = 0.72;
    if (l > max) {
      x *= max / l;
      y *= max / l;
    }
    return [x, y];
  };

  const rippleSplat = (x: number, y: number, radius: number, amp: number) => {
    const [u, v] = uvOf(x, y);
    bind(P.rSplat);
    tex(P.rSplat, "uH", ripple.read.tex[0]);
    gl.uniform2f(P.rSplat.u.uPoint, u, v);
    gl.uniform1f(P.rSplat.u.uRadius, radius);
    gl.uniform1f(P.rSplat.u.uAmp, amp);
    blit(ripple.write);
    ripple.swap();
  };
  /** Velocity splat at a disc point: dx, dy in texels/s along uv axes, plus a swirl. */
  const push = (x: number, y: number, radius: number, dx: number, dy: number, swirl: number) => {
    const [u, v] = uvOf(x, y);
    bind(P.push);
    tex(P.push, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.push.u.uPoint, u, v);
    gl.uniform2f(P.push.u.uDir, dx, dy);
    gl.uniform1f(P.push.u.uRadius, radius);
    gl.uniform1f(P.push.u.uSwirl, swirl);
    blit(vel.write);
    vel.swap();
  };
  const ink = (x: number, y: number, radius: number, fresh: number, old: number) => {
    const [u, v] = uvOf(x, y);
    bind(P.ink);
    tex(P.ink, "uDye", dye.read.tex[0]);
    gl.uniform2f(P.ink.u.uPoint, u, v);
    gl.uniform1f(P.ink.u.uRadius, radius);
    gl.uniform2f(P.ink.u.uAmount, fresh, old);
    blit(dye.write);
    dye.swap();
  };

  let rnd = 0x2f6e2b1;
  const rand = () => {
    rnd = (rnd * 1664525 + 1013904223) >>> 0;
    return rnd / 2 ** 32;
  };
  const randDisc = (max: number): [number, number] => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * max;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };

  /** The splash itself: a dent, an outward shove with a twist, and the gold. */
  const impact = (x: number, y: number, w: number, small = false) => {
    const k = small ? 0.35 : 1;
    rippleSplat(x, y, (0.009 + 0.01 * w) * (small ? 0.7 : 1), -(0.55 + 1.1 * w) * k);
    const swirl = (rand() - 0.5) * 2;
    push(x, y, 0.04 + 0.03 * w, 0, 0, (40 + 60 * w) * swirl * k);
    ink(x, y, (0.008 + 0.011 * w) * (small ? 0.6 : 1), (2.4 + 2.6 * w) * k, 0);
    // The bloom: a few shoves outward from the impact; each turns into a curling vortex pair
    // that drags a tendril of gold with it. Heavier drops throw more, further.
    const n = small ? 0 : 4 + Math.round(4 * w);
    const a0 = rand() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.8;
      const sp = (260 + 380 * w) * (0.6 + rand() * 0.6);
      const off = (0.012 + 0.012 * w) / GEO.rw;
      // Disc y grows toward the viewer; uv y grows away, hence the sign flips.
      const ox = x + Math.cos(a) * off;
      const oy = y + Math.sin(a) * off;
      push(ox, oy, 0.02 + 0.014 * w, Math.cos(a) * sp, -Math.sin(a) * sp, 0);
      ink(ox, oy, 0.006 + 0.005 * w, 0.5 + 0.6 * w, 0);
    }
    opts.onImpact?.(w, small);
  };

  /** Another visitor's drop (SIMULATED in this prototype): faint gold into the deep layer. */
  const ghost = (x: number, y: number, amount: number) => {
    ink(x, y, 0.014 + rand() * 0.012, 0, amount);
    const a = rand() * Math.PI * 2;
    const sp = 60 + rand() * 60;
    push(x, y, 0.04, Math.cos(a) * sp, Math.sin(a) * sp, (rand() - 0.5) * 70);
  };

  let simTime = rand() * 100;
  let rippleClock = 0;
  // Calm rings: about a third of the bowl's radius per second.
  const RIPPLE_HZ = prof.phone ? 55 : 80;
  const sim = (dt: number) => {
    simTime += dt;
    const tv = 1 / NV;
    gl.disable(gl.BLEND);

    // Ripples step at a fixed rate (the wave speed is per step), whatever the display's refresh.
    rippleClock = Math.min(rippleClock + dt * RIPPLE_HZ, 4);
    const steps = Math.floor(rippleClock);
    rippleClock -= steps;
    bind(P.rStep);
    gl.uniform2f(P.rStep.u.uTexel, 1 / NH, 1 / NH);
    gl.uniform1f(P.rStep.u.uDamp, 0.992);
    for (let i = 0; i < steps; i++) {
      unit = 0;
      tex(P.rStep, "uH", ripple.read.tex[0]);
      blit(ripple.write);
      ripple.swap();
    }

    bind(P.current);
    tex(P.current, "uVel", vel.read.tex[0]);
    gl.uniform1f(P.current.u.uTime, simTime);
    gl.uniform1f(P.current.u.uDt, dt);
    gl.uniform1f(P.current.u.uK, 5.5);
    blit(vel.write);
    vel.swap();

    bind(P.curl);
    tex(P.curl, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.curl.u.uTexel, tv, tv);
    blit(curl);

    bind(P.vort);
    tex(P.vort, "uVel", vel.read.tex[0]);
    tex(P.vort, "uCurl", curl.tex[0]);
    gl.uniform2f(P.vort.u.uTexel, tv, tv);
    gl.uniform1f(P.vort.u.uCurlK, 28);
    gl.uniform1f(P.vort.u.uDt, dt);
    blit(vel.write);
    vel.swap();

    bind(P.div);
    tex(P.div, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.div.u.uTexel, tv, tv);
    blit(divg);

    bind(P.scale);
    tex(P.scale, "uTex", pres.read.tex[0]);
    gl.uniform1f(P.scale.u.uK, 0.8);
    blit(pres.write);
    pres.swap();

    bind(P.pres);
    gl.uniform2f(P.pres.u.uTexel, tv, tv);
    for (let i = 0; i < (prof.phone ? 12 : 20); i++) {
      unit = 0;
      tex(P.pres, "uDiv", divg.tex[0]);
      tex(P.pres, "uP", pres.read.tex[0]);
      blit(pres.write);
      pres.swap();
    }

    bind(P.grad);
    tex(P.grad, "uP", pres.read.tex[0]);
    tex(P.grad, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.grad.u.uTexel, tv, tv);
    blit(vel.write);
    vel.swap();

    bind(P.advVel);
    tex(P.advVel, "uVel", vel.read.tex[0]);
    gl.uniform2f(P.advVel.u.uTexel, tv, tv);
    gl.uniform1f(P.advVel.u.uDt, dt);
    gl.uniform1f(P.advVel.u.uDiss, 0.55);
    blit(vel.write);
    vel.swap();

    bind(P.advDye);
    tex(P.advDye, "uVel", vel.read.tex[0]);
    tex(P.advDye, "uDye", dye.read.tex[0]);
    gl.uniform2f(P.advDye.u.uTexel, tv, tv);
    gl.uniform1f(P.advDye.u.uDt, dt);
    gl.uniform1f(P.advDye.u.uSettle, 0.008);
    gl.uniform1f(P.advDye.u.uFade, 0.005);
    blit(dye.write);
    dye.swap();
  };

  const drops: Drop[] = [];
  const jets: Jet[] = [];
  const dropBuf = new Float32Array(S.MAX_DROPS * 4);
  const dropBufB = new Float32Array(S.MAX_DROPS * 4);
  const jetBuf = new Float32Array(S.MAX_JETS * 4);
  let time = 0;
  let lamp = 0;
  let nextGhost = 6;

  const draw = () => {
    dropBuf.fill(0);
    dropBufB.fill(0);
    drops.slice(0, S.MAX_DROPS).forEach((d, i) => {
      // Stretch along the fall, a gentle wobble while it forms.
      const e =
        d.phase === "form" ? 1 + 0.05 * Math.sin(d.t * 11) + 0.08 * d.w : 1 + Math.min(0.55, Math.abs(d.vh) * 0.09);
      dropBuf.set([d.x, d.y, Math.max(0, d.h), d.r], i * 4);
      dropBufB.set([e, d.alpha, 0, 0], i * 4);
    });
    jetBuf.fill(0);
    jets.slice(0, S.MAX_JETS).forEach((j, i) => jetBuf.set([j.x, j.y, j.h, j.w], i * 4));

    // The lamp drifts a little, so the light on the water is never fixed.
    // Placed so its glint sits on the back left of the water and wanders a little.
    const L = [-0.12 + 0.07 * Math.sin(lamp * 0.07), -0.92, 0.37 + 0.03 * Math.sin(lamp * 0.05)];
    const ll = Math.hypot(L[0], L[1], L[2]);

    const p = P.show;
    bind(p);
    tex(p, "uH", ripple.read.tex[0]);
    tex(p, "uDye", dye.read.tex[0]);
    gl.uniform2f(p.u.uHTexel, 1 / NH, 1 / NH);
    gl.uniform2f(p.u.uDyeTexel, 1 / ND, 1 / ND);
    gl.uniform2f(p.u.uRes, cssW, cssH);
    gl.uniform2f(p.u.uC, cx, cy);
    gl.uniform1f(p.u.uPx, canvas.width / cssW);
    gl.uniform1f(p.u.uR, R);
    gl.uniform1f(p.u.uK, GEO.k);
    gl.uniform1f(p.u.uCq, CQ);
    gl.uniform1f(p.u.uWl, GEO.wl);
    gl.uniform1f(p.u.uRw, GEO.rw);
    gl.uniform1f(p.u.uHb, GEO.hb);
    gl.uniform1f(p.u.uRi, GEO.ri);
    gl.uniform1f(p.u.uTime, time);
    gl.uniform3f(p.u.uNight, nightL[0], nightL[1], nightL[2]);
    gl.uniform3f(p.u.uGold, goldL[0], goldL[1], goldL[2]);
    gl.uniform3f(p.u.uLamp, L[0] / ll, L[1] / ll, L[2] / ll);
    gl.uniform4fv(p.u.uDrops ?? null, dropBuf);
    gl.uniform4fv(p.u.uDropsB ?? null, dropBufB);
    gl.uniform4fv(p.u.uJets ?? null, jetBuf);
    blit(null);
  };

  /* Bead size from hold time: a tap is a small drop, a long hold a heavy one. */
  const beadR = (w: number) => 0.011 + 0.021 * w;

  const update = (dt: number) => {
    time += dt;
    lamp += dt;
    // Gravity tuned so a drop takes ~0.45 s from where it forms.
    const g = (2 * H0) / (0.45 * 0.45);
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t += dt;
      if (d.phase === "form") {
        const w = Math.min(1, d.t / HOLD_MAX);
        d.w = 1 - Math.pow(1 - w, 2);
        d.r = beadR(d.w);
        d.alpha = Math.min(1, d.t / 0.12);
      } else if (d.phase === "fade") {
        d.alpha -= dt * 4;
        d.r *= 1 - dt * 2;
        if (d.alpha <= 0) drops.splice(i, 1);
      } else {
        d.vh -= g * dt;
        d.h += d.vh * dt;
        if (d.h <= 0) {
          drops.splice(i, 1);
          if (d.phase === "droplet") impact(d.x, d.y, d.w * 0.5, true);
          else {
            impact(d.x, d.y, d.w);
            const life = 0.3 + 0.22 * d.w;
            jets.push({ x: d.x, y: d.y, t: 0, life, h: 0, w: d.r * 0.55, weight: d.w, spawned: false });
            if (jets.length > S.MAX_JETS) jets.shift();
          }
        }
      }
    }
    // Worthington jet: a column rises and falls; at its peak a droplet pinches off.
    for (let i = jets.length - 1; i >= 0; i--) {
      const j = jets[i];
      j.t += dt;
      const s = j.t / j.life;
      const peak = 0.07 + 0.09 * j.weight;
      j.h = Math.max(0, Math.sin(Math.min(1, s) * Math.PI)) * peak;
      if (!j.spawned && s > 0.48) {
        j.spawned = true;
        drops.push({
          x: j.x,
          y: j.y,
          h: j.h + j.w * 1.2,
          vh: 0.55 + 0.45 * j.weight,
          r: j.w * 1.05,
          w: j.weight,
          phase: "droplet",
          t: 0,
          alpha: 1,
        });
      }
      if (s >= 1) jets.splice(i, 1);
    }
    // Other visitors (SIMULATED): now and then a faint drop joins the deep layer, with a whisper of a ring.
    if (time > nextGhost) {
      nextGhost = time + 11 + rand() * 12;
      const [x, y] = randDisc(0.7);
      ghost(x, y, 0.35 + rand() * 0.3);
      rippleSplat(x, y, 0.01, -0.35);
    }
  };

  // Seed the day: older drops, already unfurled (SIMULATED for this prototype).
  const seed = (n: number, steps: number) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = randDisc(0.78);
      ghost(x, y, 0.45 + rand() * 0.6);
    }
    for (let i = 0; i < steps; i++) sim(1 / 60);
  };
  seed(16, 220);
  // Let the seed's ripples die out (the seed makes no rings anyway, but stay clean).
  for (const t of [ripple.read, ripple.write]) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  let held: Drop | null = null;
  let stop = () => {};
  const still = prof.still;

  const press = (clientX: number, clientY: number) => {
    const [x, y] = toDisc(clientX, clientY);
    if (still) {
      // Reduced motion: no fall; the bloom is computed out of sight, then shown.
      impact(x, y, 0.5);
      for (let i = 0; i < 70; i++) sim(1 / 60);
      draw();
      return;
    }
    if (held) held.phase = "fade";
    held = { x, y, h: H0, vh: 0, r: beadR(0), w: 0, phase: "form", t: 0, alpha: 0 };
    drops.push(held);
    trim();
  };
  const move = (clientX: number, clientY: number) => {
    if (!held) return;
    const [x, y] = toDisc(clientX, clientY);
    held.x += (x - held.x) * 0.5;
    held.y += (y - held.y) * 0.5;
  };
  const release = () => {
    if (!held) return;
    held.phase = "fall";
    held.vh = 0;
    held = null;
  };
  const cancel = () => {
    if (!held) return;
    held.phase = "fade";
    held = null;
  };
  /** Never more than the shader can draw: the oldest in flight lands at once. */
  const trim = () => {
    while (drops.length > S.MAX_DROPS) {
      const d = drops.shift()!;
      if (d.phase === "fall") impact(d.x, d.y, d.w);
    }
  };
  const dropAt = (x: number, y: number, weight: number) => {
    if (still) {
      impact(x, y, weight);
      for (let i = 0; i < 70; i++) sim(1 / 60);
      draw();
      return;
    }
    drops.push({ x, y, h: H0, vh: 0, r: beadR(weight), w: weight, phase: "fall", t: 0, alpha: 1 });
    trim();
  };

  if (still) {
    // A composed still: the day's ink, one fresh bloom mid-unfurl, its rings frozen mid-spread.
    impact(0.12, 0.08, 0.7);
    for (let i = 0; i < 90; i++) sim(1 / 60);
    impact(0.12, 0.08, 0.3);
    for (let i = 0; i < 26; i++) sim(1 / 60);
    draw();
    ro.disconnect();
    const ro2 = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro2.observe(host);
    stop = () => ro2.disconnect();
  } else {
    // The ink never rests (the currents keep unfurling it): paced, light when idle, never settled.
    const onScale = (q: number) => {
      quality = q;
      layout();
    };
    stop = runLoop(
      host,
      (_t, dt) => {
        update(dt);
        sim(dt);
        draw();
      },
      { name: "play/one-drop", adaptive: { onScale } },
    ).stop;
  }

  return {
    press,
    move,
    release,
    cancel,
    dropAt,
    destroy: () => {
      stop();
      ro.disconnect();
      for (const d of [vel, pres, dye, ripple]) {
        freeTarget(gl, d.read);
        freeTarget(gl, d.write);
      }
      freeTarget(gl, curl);
      freeTarget(gl, divg);
      Object.values(P).forEach((p) => gl.deleteProgram(p.prog));
      gl.deleteVertexArray(vao);
      releaseContext(gl);
      canvas.remove();
    },
  };
}

type S_Program = ReturnType<typeof program>;
