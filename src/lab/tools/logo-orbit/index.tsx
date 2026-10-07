"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { LabProps } from "../../types";
import { nobr } from "@/lib/thai-nodes";
import { COPY } from "./copy";
import { groups, Mark, tokens, toolName, type GroupId } from "./stack";
import "./logo-orbit.css";

/** Core outward: what the products are about first, the infrastructure they run on last. */
const RING_ORDER: GroupId[] = ["ai", "integrations", "backend", "frontend", "testing", "data-cloud"];
/** Seconds per stop of the idle tour (overview, then each ring). */
const TOUR_STEP = 3.8;
/** A pinned ring lets go after this long without input, and the tour carries on. */
const PIN_IDLE_MS = 10000;
const TAU = Math.PI * 2;

type Ctl = {
  hover: number;
  hoverNode: [number, number] | null;
  pinned: number;
  pinnedAt: number;
  paused: boolean;
  kick: () => void;
};

/**
 * Logo orbit: the six tool groups on concentric tilted orbits around a gold KINZEN core. Rings turn
 * at Kepler-ish speeds (inner faster), depth drives scale, opacity and blur, the pointer tilts the
 * plane, and the core sends gold signals out to the tools it uses. Hover, tap or arrow-key a group
 * to lift its ring forward in brand colour with its one-liner. DOM tokens for the marks (real
 * focus, hover and theme CSS), two canvases for the ring arcs behind and in front of the core.
 */
export default function LogoOrbit({ locale }: LabProps) {
  const c = COPY[locale];
  const rings = useMemo(() => {
    const all = groups(locale);
    return RING_ORDER.map((id) => {
      const group = all.find((g) => g.id === id)!;
      return { group, nodes: tokens(group) };
    });
  }, [locale]);
  const total = rings.reduce((n, r) => n + r.group.tools.length, 0);

  const stageRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const legendRef = useRef<HTMLOListElement>(null);
  const nodeEls = useRef<(HTMLElement | null)[][]>([]);
  const ctl = useRef<Ctl>({ hover: -1, hoverNode: null, pinned: -1, pinnedAt: 0, paused: false, kick: () => {} });

  const [focus, setFocus] = useState(-1);
  const [touring, setTouring] = useState(false);
  const [paused, setPaused] = useState(false);
  const [canHover, setCanHover] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    const back = backRef.current;
    const front = frontRef.current;
    const tip = tipRef.current;
    const legend = legendRef.current;
    const tag = tagRef.current;
    const bctx = back?.getContext("2d");
    const fctx = front?.getContext("2d");
    if (!stage || !back || !front || !tip || !tag || !legend || !bctx || !fctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);
    setCanHover(window.matchMedia("(hover: hover)").matches);
    const st = ctl.current;
    const n = rings.length;
    const counts = rings.map((r) => r.nodes.length);
    const lift = new Float32Array(n);
    const dim = new Float32Array(n);
    const phase = new Float32Array(n);
    const omega = new Float32Array(n);
    const offset = rings.map((_, i) => i * 0.83 + 0.4);
    const ping = counts.map((k) => new Float64Array(k));
    const pos = counts.map((k) => Array.from({ length: k }, () => ({ x: 0, y: 0, d: 0, s: 1 })));
    const prev = counts.map((k) => Array.from({ length: k }, () => ({ lit: false, z: -1, blur: -1 })));
    const beams: { i: number; j: number; t: number }[] = [];

    let W = 0;
    let H = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let phone = false;
    let coreR = 60;
    let nodeSize = 46;
    let baseTilt = 0.36;
    let rxs: number[] = [];
    let tilt = baseTilt;
    let roll = 0;
    let px = 0;
    let py = 0;
    let tpx = 0;
    let tpy = 0;
    let tourClock = 0;
    let nextBeam = 0.6;
    let last = 0;
    let raf = 0;
    let running = false;
    let visible = true;
    let shown = -2;
    let tourShown: boolean | null = null;
    let tapNode: [number, number] | null = null;
    let tapUntil = 0;
    let tipKey = "";
    let gold = "#c49a3c";
    let ink = "#2a2520";

    // Canvas colours come from the theme tokens, resolved through a probe element.
    const readColors = () => {
      const probe = document.createElement("span");
      stage.appendChild(probe);
      probe.style.color = "var(--gold)";
      gold = getComputedStyle(probe).color;
      probe.style.color = "var(--ink)";
      ink = getComputedStyle(probe).color;
      probe.remove();
    };

    const layout = () => {
      const r = stage.getBoundingClientRect();
      W = r.width;
      H = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const cv of [back, front]) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      phone = W < 560;
      baseTilt = phone ? 0.6 : 0.42;
      cx = W / 2;
      cy = H / 2;
      coreR = phone ? Math.min(44, Math.max(30, W * 0.1)) : Math.min(76, Math.max(48, W * 0.072));
      nodeSize = phone ? 30 : 46;
      stage.style.setProperty("--core", `${coreR * 2}px`);
      stage.style.setProperty("--node", `${nodeSize}px`);
      const rxMax = Math.min(W * 0.47 - nodeSize * 0.4, (H / 2 - nodeSize * 0.75) / (baseTilt + 0.16));
      const rxMin = coreR * (phone ? 1.6 : 1.85);
      rxs = rings.map((_, i) => rxMin + ((rxMax - rxMin) * i) / (n - 1));
      rxs.forEach((rx, i) => (omega[i] = 0.06 * Math.pow(rxMax / rx, 0.9)));
    };

    /** Which ring the pointer is on (stage coords), or -1. */
    const hit = (mx: number, my: number) => {
      const x = mx - cx;
      const y = my - cy;
      if (Math.hypot(x, y) < coreR) return -1;
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const xr = x * cr + y * sr;
      const yr = -x * sr + y * cr;
      let best = -1;
      let bd = Infinity;
      for (let i = 0; i < n; i++) {
        const rx = rxs[i];
        const ry = rx * (tilt + 0.14 * lift[i]);
        const yy = yr + lift[i] * (phone ? 8 : 18);
        const e = Math.hypot(xr / rx, yy / ry);
        const dist = Math.hypot(xr, yy) * Math.abs(1 - 1 / e);
        if (dist < bd) {
          bd = dist;
          best = i;
        }
      }
      return bd < (phone ? 14 : 24) ? best : -1;
    };

    const ringPath = (ctx: CanvasRenderingContext2D, i: number, a0: number, a1: number) => {
      const rx = rxs[i];
      const ry = rx * (tilt + 0.14 * lift[i]);
      ctx.beginPath();
      ctx.ellipse(0, -lift[i] * (phone ? 8 : 18), rx, ry, 0, a0, a1);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const moving = !reduce && !st.paused;
      if (moving) for (let i = 0; i < n; i++) phase[i] += omega[i] * dt;

      if (st.pinnedAt < 0) st.pinnedAt = now;
      // A pinned ring lets go after a quiet spell (unless the keyboard is still in the legend).
      if (st.pinned >= 0 && st.hover < 0 && now - st.pinnedAt > PIN_IDLE_MS && !legend.contains(document.activeElement))
        st.pinned = -1;
      const tourOn = moving && st.hover < 0 && st.pinned < 0;
      if (tourOn) tourClock += dt;
      const tourF = (Math.floor(tourClock / TOUR_STEP) % (n + 1)) - 1;
      const eff = st.hover >= 0 ? st.hover : st.pinned >= 0 ? st.pinned : reduce ? -1 : tourF;
      if (eff !== shown) {
        shown = eff;
        setFocus(eff);
      }
      if (tourOn !== tourShown) {
        tourShown = tourOn;
        setTouring(tourOn);
      }
      if (tourOn) legend.style.setProperty("--tour-p", ((tourClock % TOUR_STEP) / TOUR_STEP).toFixed(4));

      const kl = reduce ? 1 : 1 - Math.exp(-dt * 5);
      let settled = true;
      for (let i = 0; i < n; i++) {
        const tl = eff === i ? 1 : 0;
        const td = eff >= 0 && eff !== i ? 1 : 0;
        lift[i] += (tl - lift[i]) * kl;
        dim[i] += (td - dim[i]) * kl;
        if (Math.abs(tl - lift[i]) > 0.002 || Math.abs(td - dim[i]) > 0.002) settled = false;
      }
      const kp = reduce ? 1 : 1 - Math.exp(-dt * 3);
      px += (tpx - px) * kp;
      py += (tpy - py) * kp;
      if (Math.abs(tpx - px) > 0.001 || Math.abs(tpy - py) > 0.001) settled = false;
      tilt = baseTilt + py * 0.05;
      roll = px * 0.045;
      // The orb's lit side follows the pointer a little, as if the light source moved with it.
      stage.style.setProperty("--lx", `${(34 + px * 9).toFixed(1)}%`);
      stage.style.setProperty("--ly", `${(28 + py * 7).toFixed(1)}%`);
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const para = phone ? 4 : 12;

      // Tokens: position on the ring, then depth (scale, opacity, blur, stacking) and lit state.
      for (let i = 0; i < n; i++) {
        const rx = rxs[i];
        const ry = rx * (tilt + 0.14 * lift[i]);
        const oy = -lift[i] * (phone ? 8 : 18);
        for (let j = 0; j < counts[i]; j++) {
          const el = nodeEls.current[i]?.[j];
          if (!el) continue;
          const a = phase[i] + offset[i] + (j * TAU) / counts[i];
          const d = Math.sin(a);
          const x = rx * Math.cos(a) + px * d * para;
          const y = ry * d + oy;
          const X = cx + x * cr - y * sr;
          const Y = cy + x * sr + y * cr;
          const k = (d + 1) / 2;
          const s = (0.62 + 0.38 * k) * (1 + 0.14 * lift[i]) * (1 - (phone ? 0.3 : 0.12) * dim[i]);
          const o = (0.4 + 0.6 * k) * (1 - 0.72 * dim[i]) + 0.4 * lift[i] * (1 - k);
          const blur = Math.round(((1 - k) * 1.5 * (1 - lift[i]) + dim[i] * 1.2) * 4) / 4;
          const p = pos[i][j];
          p.x = X;
          p.y = Y;
          p.d = d;
          p.s = s;
          el.style.transform = `translate3d(${X.toFixed(1)}px,${Y.toFixed(1)}px,0) translate(-50%,-50%) scale(${s.toFixed(3)})`;
          el.style.opacity = Math.min(1, o).toFixed(3);
          const pr = prev[i][j];
          if (blur !== pr.blur) {
            pr.blur = blur;
            el.style.filter = blur > 0 ? `blur(${blur}px)` : "";
          }
          const z = 10 + Math.round(k * 100);
          if (z !== pr.z) {
            pr.z = z;
            el.style.zIndex = String(z);
          }
          const hovered =
            (st.hoverNode && st.hoverNode[0] === i && st.hoverNode[1] === j) ||
            (tapNode !== null && tapNode[0] === i && tapNode[1] === j && now < tapUntil);
          const lit = eff === i || ping[i][j] > now || !!hovered;
          if (lit !== pr.lit) {
            pr.lit = lit;
            el.toggleAttribute("data-lit", lit);
          }
          if (ping[i][j] > now) settled = false;
        }
      }

      // The name of the token under the pointer (or the last one tapped).
      // A word chip already shows its name: it only gets a tip when the full name is longer.
      let tn = st.hoverNode ?? (tapNode && now < tapUntil ? tapNode : null);
      if (tn) {
        const t = rings[tn[0]].nodes[tn[1]];
        if (!t.mark && t.short === t.label) tn = null;
      }
      const key = tn ? `${tn[0]}:${tn[1]}` : "";
      if (key !== tipKey) {
        tipKey = key;
        if (tn) tip.textContent = rings[tn[0]].nodes[tn[1]].label;
        tip.toggleAttribute("data-on", !!tn);
      }
      if (tn) {
        const p = pos[tn[0]][tn[1]];
        tip.style.transform = `translate3d(${p.x.toFixed(1)}px,${(p.y - (nodeSize * p.s) / 2 - 10).toFixed(1)}px,0) translate(-50%,-100%)`;
      }
      if (tapNode && now < tapUntil) settled = false;

      // The lifted ring's name, riding the top of its ellipse.
      let li = -1;
      for (let i = 0; i < n; i++) if (li < 0 || lift[i] > lift[li]) li = i;
      if (li >= 0 && lift[li] > 0.02) {
        const ry = rxs[li] * (tilt + 0.14 * lift[li]);
        const ty = -ry - lift[li] * (phone ? 8 : 18) - (phone ? 16 : 26);
        tag.style.transform = `translate3d(${(cx - ty * sr).toFixed(1)}px,${(cy + ty * cr).toFixed(1)}px,0) translate(-50%,-50%)`;
        tag.style.opacity = lift[li].toFixed(3);
        if (tag.dataset.ring !== String(li)) {
          tag.dataset.ring = String(li);
          tag.textContent = `${String(li + 1).padStart(2, "0")}  ${rings[li].group.label}`;
        }
      } else tag.style.opacity = "0";

      // Signals: the core sends a gold beam to a tool on the lit ring (any ring in the overview).
      if (moving) {
        nextBeam -= dt;
        if (nextBeam <= 0) {
          nextBeam = 0.7 + Math.random() * 0.7;
          const i = eff >= 0 ? eff : Math.floor(Math.random() * n);
          beams.push({ i, j: Math.floor(Math.random() * counts[i]), t: 0 });
        }
      }
      for (const b of beams) b.t += dt / 0.75;
      for (let b = beams.length - 1; b >= 0; b--) {
        if (beams[b].t >= 1) {
          ping[beams[b].i][beams[b].j] = now + 1100;
          beams.splice(b, 1);
        }
      }

      // Ring arcs: back halves under the core and tokens, front halves over the core.
      for (const [ctx, isFront] of [
        [bctx, false],
        [fctx, true],
      ] as const) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.translate(cx, cy);
        ctx.rotate(roll);
        const a0 = isFront ? 0 : Math.PI;
        const a1 = isFront ? Math.PI : TAU;
        for (let i = 0; i < n; i++) {
          const ry = rxs[i] * (tilt + 0.14 * lift[i]);
          ctx.save();
          // The parallax shear that moves the tokens, applied to their ring too.
          ctx.transform(1, 0, (px * para) / ry, 1, (px * para * lift[i] * (phone ? 8 : 18)) / ry, 0);
          ringPath(ctx, i, a0, a1);
          ctx.strokeStyle = ink;
          ctx.lineWidth = 1;
          ctx.globalAlpha = (isFront ? 0.2 : 0.1) * (1 - 0.6 * dim[i]) * (1 - lift[i]);
          ctx.stroke();
          if (lift[i] > 0.01) {
            ctx.strokeStyle = gold;
            ctx.lineWidth = 1.4;
            ctx.globalAlpha = lift[i] * (isFront ? 0.9 : 0.4);
            ctx.stroke();
          }
          // A comet running round the ring: brighter on the lifted ring, absent on dimmed ones.
          const amp = reduce ? 0 : (1 - dim[i]) * (0.35 + 0.65 * lift[i]);
          if (amp > 0.02) {
            const head = phase[i] * 2.6 + i * 1.7;
            const SEG = 16;
            const len = 0.7;
            ctx.strokeStyle = gold;
            ctx.lineWidth = 1.8;
            ctx.lineCap = "round";
            for (let s = 0; s < SEG; s++) {
              const s0 = head - len + (len * s) / SEG;
              const s1 = s0 + len / SEG + 0.004;
              if (Math.sin((s0 + s1) / 2) > 0 !== isFront) continue;
              ctx.globalAlpha = amp * Math.pow((s + 1) / SEG, 2);
              ringPath(ctx, i, s0, s1);
              ctx.stroke();
            }
            if (Math.sin(head) > 0 === isFront) {
              const rx = rxs[i];
              const hx = rx * Math.cos(head);
              const hy = ry * Math.sin(head) - lift[i] * (phone ? 8 : 18);
              ctx.fillStyle = gold;
              ctx.globalAlpha = amp * 0.22;
              ctx.beginPath();
              ctx.arc(hx, hy, 6, 0, TAU);
              ctx.fill();
              ctx.globalAlpha = amp;
              ctx.beginPath();
              ctx.arc(hx, hy, 2, 0, TAU);
              ctx.fill();
            }
          }
          ctx.restore();
        }
        // Beams, in screen space: behind the core when the target sits on the far side.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const b of beams) {
          const p = pos[b.i][b.j];
          if (p.d > 0 !== isFront) continue;
          const e = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
          const h = e(b.t);
          const tl = e(b.t - 0.3);
          const hx = cx + (p.x - cx) * h;
          const hy = cy + (p.y - cy) * h;
          const tx = cx + (p.x - cx) * tl;
          const ty = cy + (p.y - cy) * tl;
          const g = ctx.createLinearGradient(tx, ty, hx, hy);
          g.addColorStop(0, "transparent");
          g.addColorStop(1, gold);
          const fade = 1 - Math.max(0, b.t - 0.85) / 0.15;
          ctx.strokeStyle = g;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx, hy);
          ctx.globalAlpha = 0.22 * fade;
          ctx.lineWidth = 6;
          ctx.stroke();
          ctx.globalAlpha = 0.95 * fade;
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.globalAlpha = 0.25 * fade;
          ctx.fillStyle = gold;
          ctx.beginPath();
          ctx.arc(hx, hy, 7, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = fade;
          ctx.fillStyle = gold;
          ctx.beginPath();
          ctx.arc(hx, hy, 2.2, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (visible && (moving || !settled || beams.length > 0)) raf = requestAnimationFrame(frame);
      else running = false;
    };

    const kick = () => {
      if (running || !visible) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    st.kick = kick;

    const local = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const nodeOf = (e: Event): [number, number] | null => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(".lo-node");
      if (!el || !stage.contains(el)) return null;
      return [Number(el.dataset.ring), Number(el.dataset.idx)];
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const [mx, my] = local(e);
      tpx = (mx / W) * 2 - 1;
      tpy = (my / H) * 2 - 1;
      const node = nodeOf(e);
      st.hoverNode = node;
      st.hover = node ? node[0] : hit(mx, my);
      kick();
    };
    const onLeave = () => {
      st.hover = -1;
      st.hoverNode = null;
      tpx = 0;
      tpy = 0;
      kick();
    };
    const onClick = (e: MouseEvent) => {
      const r = stage.getBoundingClientRect();
      const node = nodeOf(e);
      const ring = node ? node[0] : hit(e.clientX - r.left, e.clientY - r.top);
      st.pinned = ring >= 0 && ring === st.pinned && !node ? -1 : ring;
      st.pinnedAt = performance.now();
      if (node) {
        tapNode = node;
        tapUntil = performance.now() + 1800;
      }
      kick();
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("click", onClick);

    readColors();
    layout();
    const ro = new ResizeObserver(() => {
      layout();
      kick();
    });
    ro.observe(stage);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    });
    io.observe(stage);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onTheme = () => {
      readColors();
      kick();
    };
    scheme.addEventListener("change", onTheme);
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const onVis = () => {
      visible = !document.hidden;
      if (visible) kick();
    };
    document.addEventListener("visibilitychange", onVis);
    kick();

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      st.kick = () => {};
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("click", onClick);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      scheme.removeEventListener("change", onTheme);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [rings]);

  useEffect(() => {
    ctl.current.paused = paused;
    ctl.current.kick();
  }, [paused]);

  const pin = (i: number) => {
    const st = ctl.current;
    st.pinned = i;
    st.pinnedAt = -1; // stamped by the next frame
    st.kick();
  };
  const onLegendKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const n = rings.length;
    const cur = ctl.current.pinned >= 0 ? ctl.current.pinned : Math.max(0, focus);
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (cur + 1) % n
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (cur - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : e.key === "Escape"
                ? -1
                : null;
    if (next === null) return;
    e.preventDefault();
    pin(next);
    if (next >= 0) legendRef.current?.querySelectorAll<HTMLButtonElement>(".lo-row-btn")[next]?.focus();
  };
  const tabStop = focus >= 0 ? focus : 0;

  return (
    <section className="lo" aria-labelledby="lo-title">
      <div className="shell lo-grid">
        <div className="lo-head">
          <p className="lo-kicker">
            <i aria-hidden="true" />
            {nobr(c.kicker)}
          </p>
          <h2 id="lo-title" className="lo-title">
            {nobr(c.title)}
          </h2>
          <p className="lo-lede">{nobr(c.lede)}</p>
          <p className="lo-hint">{nobr(canHover ? c.hintHover : c.hintTouch)}</p>
        </div>

        <div className="lo-stage" ref={stageRef} data-focus={focus >= 0 || undefined}>
          <div className="lo-glow" aria-hidden="true" />
          <canvas ref={backRef} className="lo-canvas lo-back" aria-hidden="true" />
          <div className="lo-core" aria-hidden="true">
            <span className="lo-core-halo" />
            <span className="lo-core-orb" />
            <span className="lo-core-word">KINZEN</span>
          </div>
          <canvas ref={frontRef} className="lo-canvas lo-front" aria-hidden="true" />
          <div className="lo-nodes" aria-hidden="true">
            {rings.map(({ nodes }, i) =>
              nodes.map((t, j) => (
                <span
                  key={`${i}-${t.key}`}
                  ref={(el) => {
                    (nodeEls.current[i] ??= [])[j] = el;
                  }}
                  className="lo-node"
                  data-ring={i}
                  data-idx={j}
                  data-text={t.mark ? undefined : ""}
                >
                  {t.mark && t.mark !== "practice" ? <Mark slug={t.mark} /> : t.short}
                </span>
              )),
            )}
          </div>
          <span ref={tipRef} className="lo-tip" aria-hidden="true" />
          <span ref={tagRef} className="lo-tag" aria-hidden="true" />
          {!reduced && (
            <button type="button" className="lo-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              <span aria-hidden="true" className="lo-pause-icon" data-paused={paused || undefined} />
              {nobr(paused ? c.resume : c.pause)}
            </button>
          )}
        </div>

        <div className="lo-list">
          <ol
            ref={legendRef}
            className="lo-legend"
            aria-label={c.groupsLabel}
            data-touring={touring || undefined}
            onKeyDown={onLegendKey}
          >
            {rings.map(({ group }, i) => {
              const active = focus === i;
              return (
                <li key={group.id} className="lo-row" data-active={active || undefined}>
                  <button
                    type="button"
                    className="lo-row-btn"
                    aria-pressed={active}
                    tabIndex={i === tabStop ? 0 : -1}
                    onClick={() => pin(ctl.current.pinned === i ? -1 : i)}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "touch") return;
                      ctl.current.hover = i;
                      ctl.current.kick();
                    }}
                    onPointerLeave={() => {
                      ctl.current.hover = -1;
                      ctl.current.kick();
                    }}
                  >
                    <span className="lo-row-idx" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="lo-row-label">{nobr(group.label)}</span>
                    <span className="lo-row-count">{nobr(c.tools(group.tools.length))}</span>
                    <span className="lo-row-bar" aria-hidden="true" />
                  </button>
                  <div className="sr-only">
                    <p>{nobr(c.lines[group.id])}</p>
                    <ul>
                      {group.tools.map((t) => (
                        <li key={t.key}>{nobr(t.label)}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>
          {/* One detail block under a still list (no row ever moves under the pointer): every
              group's line and tools stacked in one cell, the active one shown. */}
          <div className="lo-detail" aria-hidden="true">
            <div className="lo-detail-item" data-on={focus < 0 || undefined}>
              <p className="lo-detail-line lo-detail-overview">{nobr(c.overview(total))}</p>
            </div>
            {rings.map(({ group }, i) => (
              <div key={group.id} className="lo-detail-item" data-on={focus === i || undefined}>
                <p className="lo-detail-line">{toolName(c.lines[group.id])}</p>
                <ul className="lo-detail-tools" data-lit={focus === i || undefined}>
                  {group.tools.map((t) => (
                    <li key={t.key}>
                      {t.mark && t.mark !== "practice" ? <Mark slug={t.mark} /> : <i />}
                      <span>{toolName(t.label)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
