"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Locale } from "@/content/schema";
import { Banner } from "../b-banner/banner";
import { useFpsProbe, useReducedMotion, watchVisible } from "../b-banner/hooks";
import "./live-system.css";

/* ------------------------------------------------------------------
   A living architecture drawing: calls and LINE chats arrive as light
   packets and travel speech to text -> model -> code guard -> reply.
   Every so often the guard stops one (a short red flash, a reason tag);
   the rest pass and light the reply node. Nodes breathe on their own.
   SVG in screen units (viewBox = the stage's pixel size), packets are
   moved by one rAF loop that writes transforms only; paths are sampled
   into lookup tables once per resize.
   ------------------------------------------------------------------ */

type NodeId = "call" | "line" | "stt" | "model" | "guard" | "reply";
type EdgeId = "call-stt" | "stt-model" | "line-model" | "model-guard" | "guard-reply";

const LABELS: Record<Locale, Record<NodeId, string>> = {
  en: {
    call: "Phone call",
    line: "LINE chat",
    stt: "Speech to text",
    model: "Model",
    guard: "Code guard",
    reply: "Reply",
  },
  th: {
    call: "สายโทรเข้า",
    line: "แชท LINE",
    stt: "แปลงเสียงเป็นข้อความ",
    model: "โมเดล",
    guard: "ด่านตรวจในโค้ด",
    reply: "ตอบกลับ",
  },
};

/** What the guard stops (the site's own claim: diagnoses, dosing advice, cure claims). */
const REASONS: Record<Locale, string[]> = {
  en: ["blocked: diagnosis", "blocked: dosing advice", "blocked: cure claim"],
  th: ["บล็อก: วินิจฉัยโรค", "บล็อก: แนะนำขนาดยา", "บล็อก: อ้างว่ารักษาหาย"],
};

const PASS: Record<Locale, string> = { en: "sent", th: "ส่งแล้ว" };

/** Node centres as fractions of the stage: a wide flow (left to right) and a tall one (phones). */
const WIDE: Record<NodeId, [number, number]> = {
  call: [0.1, 0.28],
  line: [0.1, 0.74],
  stt: [0.35, 0.28],
  model: [0.55, 0.52],
  guard: [0.74, 0.52],
  reply: [0.91, 0.52],
};
const TALL: Record<NodeId, [number, number]> = {
  call: [0.22, 0.12],
  line: [0.78, 0.12],
  stt: [0.22, 0.36],
  model: [0.5, 0.56],
  guard: [0.5, 0.74],
  reply: [0.5, 0.92],
};

const EDGES: [EdgeId, NodeId, NodeId][] = [
  ["call-stt", "call", "stt"],
  ["stt-model", "stt", "model"],
  ["line-model", "line", "model"],
  ["model-guard", "model", "guard"],
  ["guard-reply", "guard", "reply"],
];
const ROUTES: Record<"call" | "line", EdgeId[]> = {
  call: ["call-stt", "stt-model", "model-guard", "guard-reply"],
  line: ["line-model", "model-guard", "guard-reply"],
};
/** Every few packets one is stopped at the guard; a fixed pattern reads calmer than chance. */
const BLOCK_PATTERN = [false, false, true, false, false, false, true, false];

type Layout = { w: number; h: number; tall: boolean; r: number; at: Record<NodeId, [number, number]> };

function layoutFor(w: number, h: number): Layout {
  const tall = w / h < 0.8;
  const f = tall ? TALL : WIDE;
  // A wide flow in a squarish stage (the desktop column) is pulled towards the middle band.
  const k = tall ? 1 : Math.min(1, 0.6 / (h / w));
  const r = Math.max(16, Math.min(30, Math.min(w, h) * 0.04));
  // Pull both ends in so the end halos (1.7 r) clear the stage edge.
  const pad = tall ? 0 : Math.max(w * 0.03, r * 2.2 - w * 0.09);
  const at = Object.fromEntries(
    Object.entries(f).map(([id, [x, y]]) => [id, [pad + x * (w - 2 * pad), (0.5 + (y - 0.5) * k) * h]]),
  ) as Layout["at"];
  return { w, h, tall, r, at };
}

function edgePath(l: Layout, a: NodeId, b: NodeId): string {
  const [x1, y1] = l.at[a];
  const [x2, y2] = l.at[b];
  if (l.tall) {
    const m = (y2 - y1) * 0.55;
    return `M${x1} ${y1} C${x1} ${y1 + m} ${x2} ${y2 - m} ${x2} ${y2}`;
  }
  const m = (x2 - x1) * 0.55;
  return `M${x1} ${y1} C${x1 + m} ${y1} ${x2 - m} ${y2} ${x2} ${y2}`;
}

/** Small line icons, drawn around (0, 0) in a 24-unit box. */
const ICONS: Record<NodeId, string> = {
  call: "M-6.5-8.5c1.4-.9 3 .1 3.6 1.5l1.2 2.8c.4 1-.1 2-.9 2.6l-1.3.9c.8 2.4 2.6 4.2 5 5l.9-1.3c.6-.8 1.6-1.3 2.6-.9l2.8 1.2c1.4.6 2.4 2.2 1.5 3.6-1.1 1.8-3.2 2.8-5.2 2.3C-1.6 8.6-8.6 1.6-9.6-4.2c-.4-2 .5-3.6 3.1-4.3z",
  line: "M-8-6.5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H-2l-5 4v-4h-1a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM-4.5-1.5h9M-4.5 2h5",
  stt: "M-9 0h2M-5-4v8M-1-8v16M3-5v10M7-2v4M10 0h1",
  model: "M0-9l2.2 6.8L9 0l-6.8 2.2L0 9l-2.2-6.8L-9 0l6.8-2.2z",
  guard: "M0-9.5l8 3v5.5c0 5-3.4 8.6-8 10.5-4.6-1.9-8-5.5-8-10.5v-5.5zM-3.5 0l2.5 2.5L4-2.5",
  reply: "M-8 0h14M1-6l6 6-6 6",
};

const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

type Lut = { xs: Float32Array; ys: Float32Array; len: number };
const SAMPLES = 96;

function sample(p: SVGPathElement): Lut {
  const len = p.getTotalLength();
  const xs = new Float32Array(SAMPLES + 1);
  const ys = new Float32Array(SAMPLES + 1);
  for (let i = 0; i <= SAMPLES; i++) {
    const pt = p.getPointAtLength((i / SAMPLES) * len);
    xs[i] = pt.x;
    ys[i] = pt.y;
  }
  return { xs, ys, len };
}
function at(l: Lut, t: number): [number, number] {
  const f = Math.min(1, Math.max(0, t)) * SAMPLES;
  const i = Math.min(SAMPLES - 1, Math.floor(f));
  const k = f - i;
  return [l.xs[i] + (l.xs[i + 1] - l.xs[i]) * k, l.ys[i] + (l.ys[i + 1] - l.ys[i]) * k];
}

const SVG = "http://www.w3.org/2000/svg";
const TRAIL = 7;

type Packet = {
  g: SVGGElement;
  core: SVGCircleElement;
  halo: SVGCircleElement;
  trail: SVGCircleElement[];
  hist: [number, number][];
  route: EdgeId[];
  seg: number;
  t: number;
  dwell: number;
  blocked: boolean;
  /** Set once the packet is done: shards fly for a moment, then it is removed. */
  dying: number;
  shards: { el: SVGCircleElement; x: number; y: number; vx: number; vy: number }[];
};

function LiveSystemStage({ locale }: { locale: Locale }) {
  const host = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const reduced = useReducedMotion();
  useFpsProbe("live-system");

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lay = size ? layoutFor(size.w, size.h) : null;

  useEffect(() => {
    const svg = svgRef.current;
    const g = layer.current;
    if (!svg || !g || !lay || reduced !== false) return;
    const luts = new Map<EdgeId, Lut>();
    for (const [id] of EDGES) {
      const p = svg.querySelector<SVGPathElement>(`[data-edge="${id}"]`);
      if (p) luts.set(id, sample(p));
    }
    const nodeEl = (id: NodeId) => svg.querySelector<SVGGElement>(`[data-node="${id}"]`);
    const tagEl = svg.querySelector<SVGGElement>("[data-tag]");
    const tagText = tagEl?.querySelector("text");
    const reasons = REASONS[locale];
    const speed = Math.max(140, Math.min(lay.w, lay.h) * 0.42); // px per second
    const packets: Packet[] = [];
    let spawned = 0;
    let nextSpawn = 0.3;
    let clock = 0;
    let last = 0;
    let raf = 0;
    let running = false;

    const flash = (id: NodeId, cls: string, ms = 700) => {
      const n = nodeEl(id);
      if (!n) return;
      // Restart the CSS animation: off now, on two frames later (no forced layout mid-frame).
      n.classList.remove(cls);
      requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add(cls)));
      window.setTimeout(() => n.classList.remove(cls), ms);
    };
    const showTag = (text: string, kind: "deny" | "pass") => {
      if (!tagEl || !tagText) return;
      tagText.textContent = text;
      tagEl.dataset.kind = kind;
      tagEl.classList.remove("on");
      requestAnimationFrame(() => requestAnimationFrame(() => tagEl.classList.add("on")));
    };

    const spawn = () => {
      const source = spawned % 2 === 0 ? "call" : "line";
      const blocked = BLOCK_PATTERN[spawned % BLOCK_PATTERN.length] ?? false;
      spawned++;
      const pg = document.createElementNS(SVG, "g");
      pg.setAttribute("class", `ls-packet ls-packet-${source}`);
      const trail: SVGCircleElement[] = [];
      for (let i = 0; i < TRAIL; i++) {
        const c = document.createElementNS(SVG, "circle");
        c.setAttribute("r", String(3.2 * (1 - i / TRAIL) + 0.6));
        c.setAttribute("class", "ls-trail");
        c.style.opacity = String(0.55 * (1 - i / TRAIL));
        pg.appendChild(c);
        trail.push(c);
      }
      const halo = document.createElementNS(SVG, "circle");
      halo.setAttribute("r", "13");
      halo.setAttribute("class", "ls-halo");
      const core = document.createElementNS(SVG, "circle");
      core.setAttribute("r", "4.2");
      core.setAttribute("class", "ls-core");
      pg.append(halo, core);
      g.appendChild(pg);
      flash(source, "hit", 600);
      packets.push({
        g: pg,
        core,
        halo,
        trail,
        hist: [],
        route: ROUTES[source],
        seg: 0,
        t: 0,
        dwell: 0,
        blocked,
        dying: -1,
        shards: [],
      });
    };

    const kill = (p: Packet, x: number, y: number) => {
      p.dying = 0;
      p.core.style.opacity = "0";
      p.halo.style.opacity = "0";
      for (const c of p.trail) c.style.opacity = "0";
      if (!p.blocked) return;
      for (let i = 0; i < 5; i++) {
        const el = document.createElementNS(SVG, "circle");
        el.setAttribute("r", "2.2");
        el.setAttribute("class", "ls-shard");
        p.g.appendChild(el);
        const a = (i / 5) * Math.PI * 2 + 0.4;
        const v = 34 + (i % 3) * 14;
        p.shards.push({ el, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      clock += dt;
      if (clock >= nextSpawn) {
        spawn();
        nextSpawn = clock + 1.55;
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        if (p.dying >= 0) {
          p.dying += dt;
          for (const s of p.shards) {
            s.x += s.vx * dt;
            s.y += s.vy * dt + 30 * p.dying * dt;
            s.el.setAttribute("cx", s.x.toFixed(1));
            s.el.setAttribute("cy", s.y.toFixed(1));
            s.el.style.opacity = String(Math.max(0, 1 - p.dying / 0.7));
          }
          if (p.dying > 0.75) {
            p.g.remove();
            packets.splice(i, 1);
          }
          continue;
        }
        const edge = p.route[p.seg];
        const lut = edge ? luts.get(edge) : undefined;
        if (!edge || !lut) continue;
        if (p.dwell > 0) {
          p.dwell -= dt;
        } else {
          p.t += (dt * speed) / lut.len;
        }
        const [x, y] = at(lut, ease(Math.min(1, p.t)));
        p.core.setAttribute("cx", x.toFixed(1));
        p.core.setAttribute("cy", y.toFixed(1));
        p.halo.setAttribute("cx", x.toFixed(1));
        p.halo.setAttribute("cy", y.toFixed(1));
        p.hist.unshift([x, y]);
        if (p.hist.length > TRAIL * 2) p.hist.length = TRAIL * 2;
        for (let k = 0; k < TRAIL; k++) {
          const h = p.hist[Math.min(p.hist.length - 1, k * 2 + 1)];
          if (!h) continue;
          p.trail[k].setAttribute("cx", h[0].toFixed(1));
          p.trail[k].setAttribute("cy", h[1].toFixed(1));
        }
        if (p.t >= 1) {
          const to = EDGES.find(([id]) => id === edge)?.[2];
          if (!to) continue;
          if (to === "guard" && p.blocked) {
            flash("guard", "deny", 900);
            showTag(reasons[Math.floor(spawned / 3) % reasons.length] ?? "", "deny");
            kill(p, x, y);
            continue;
          }
          if (to === "reply") {
            flash("reply", "lit", 900);
            showTag(PASS[locale], "pass");
            kill(p, x, y);
            continue;
          }
          flash(to, to === "guard" ? "check" : "hit", 600);
          p.seg++;
          p.t = 0;
          p.dwell = to === "guard" ? 0.32 : 0.18;
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const stopWatch = watchVisible(svg, (visible) => {
      if (visible && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    return () => {
      stopWatch();
      cancelAnimationFrame(raf);
      for (const p of packets) p.g.remove();
    };
  }, [lay?.w, lay?.h, reduced, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const labels = LABELS[locale];
  return (
    <div ref={host} className="ls-host" aria-hidden="true">
      {lay ? (
        <svg ref={svgRef} className="ls-svg" viewBox={`0 0 ${lay.w} ${lay.h}`} data-tall={lay.tall || undefined}>
          <defs>
            <radialGradient id="ls-halo-g">
              <stop offset="0" stopColor="var(--gold)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ls-glow-g">
              <stop offset="0" stopColor="var(--gold)" stopOpacity="0.16" />
              <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            className="ls-ambient"
            cx={lay.at.guard[0]}
            cy={lay.at.guard[1]}
            r={Math.max(lay.w, lay.h) * 0.42}
            fill="url(#ls-glow-g)"
          />
          <g className="ls-edges">
            {EDGES.map(([id, a, b]) => (
              <g key={id}>
                <path className="ls-edge" d={edgePath(lay, a, b)} data-edge={id} />
                <path className="ls-flow" d={edgePath(lay, a, b)} />
              </g>
            ))}
          </g>
          <g ref={layer} className="ls-packets">
            {reduced ? <StillPackets lay={lay} /> : null}
          </g>
          {(Object.keys(lay.at) as NodeId[]).map((id, i) => {
            const [x, y] = lay.at[id];
            const side = lay.tall && (id === "reply" || id === "guard" || id === "model");
            // In the wide flow "Speech to text" sits above its node, clear of "Phone call" beside it.
            const above = !lay.tall && id === "stt";
            return (
              <g
                key={id}
                data-node={id}
                className={`ls-node ls-node-${id}${reduced && (id === "reply" || id === "guard") ? " still" : ""}`}
                transform={`translate(${x} ${y})`}
                style={{ animationDelay: `${-i * 0.7}s` }}
              >
                <circle className="ls-breath" r={lay.r * 1.7} style={{ animationDelay: `${-i * 0.9}s` }} />
                <circle className="ls-ring" r={lay.r * 1.35} />
                <circle className="ls-disc" r={lay.r} />
                <path className="ls-icon" d={ICONS[id]} transform={`scale(${lay.r / 17})`} />
                <text
                  className="ls-label"
                  x={side ? lay.r * 1.7 : 0}
                  y={side ? 4 : above ? -(lay.r * 1.35 + 9) : lay.r * 1.35 + 18}
                  textAnchor={side ? "start" : "middle"}
                >
                  {labels[id]}
                </text>
              </g>
            );
          })}
          <g
            data-tag
            data-kind={reduced ? "deny" : undefined}
            className={`ls-tag${reduced ? " on still" : ""}`}
            transform={
              lay.tall
                ? `translate(${lay.at.guard[0] - lay.r * 1.9} ${lay.at.guard[1] + 4})`
                : `translate(${lay.at.guard[0]} ${lay.at.guard[1] - lay.r * 2.4})`
            }
          >
            <text textAnchor={lay.tall ? "end" : "middle"}>{reduced ? REASONS[locale][1] : ""}</text>
          </g>
        </svg>
      ) : null}
    </div>
  );
}

/** Reduced motion: a composed still (one packet on its way, one stopped at the guard). */
function StillPackets({ lay }: { lay: Layout }) {
  const mid = (a: NodeId, b: NodeId, k: number): [number, number] => [
    lay.at[a][0] + (lay.at[b][0] - lay.at[a][0]) * k,
    lay.at[a][1] + (lay.at[b][1] - lay.at[a][1]) * k,
  ];
  const dots = [mid("stt", "model", 0.5), mid("line", "model", 0.62), mid("guard", "reply", 0.5)];
  return (
    <>
      {dots.map(([x, y], i) => (
        <g key={i} className="ls-packet">
          <circle className="ls-halo" cx={x} cy={y} r={13} />
          <circle className="ls-core" cx={x} cy={y} r={4.2} />
        </g>
      ))}
    </>
  );
}

export default function LiveSystem({ locale }: { locale: Locale }) {
  return <Banner id="ls" locale={locale} stage={<LiveSystemStage locale={locale} />} />;
}
