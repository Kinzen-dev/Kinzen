"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { nobr } from "@/lib/thai-nodes";
import { frameLoop, type After, type Loop, type Tick } from "@/motion/frame-governor";
import { ToolMark } from "@/components/tools/tool-mark";
import { groupById, type GroupId, type ViewProps } from "../types";
import { tokens, toolName } from "../shared";
import { COPY } from "./copy";
import "./stack-pipeline.css";

/** The order a request meets the stack: in through a channel, out through the release pipeline. */
const ORDER: GroupId[] = ["integrations", "frontend", "backend", "data-cloud", "ai", "testing"];
const AI = ORDER.indexOf("ai");
/** Comet tail layers: length (px), stroke width, alpha. */
const TRAILS = [
  [240, 6, 0.16],
  [120, 3, 0.42],
  [44, 2.2, 1],
] as const;
/** How long a station stays lit after the light leaves it (time mode). */
const LIT_MS = 2600;

type Phase =
  | { kind: "move"; from: number; to: number; dur: number }
  | { kind: "dwell"; at: number; station: number; dur: number }
  | { kind: "return"; dur: number }
  | { kind: "pause"; dur: number };

/**
 * Stack pipeline: one request drawn as a gold light travelling a single path through six stations
 * (channels, frontend, backend, data, AI with its guard, testing and delivery). Each station's logos
 * sit in the theme tone and turn to brand colour as the light passes. The light loops on a timeline
 * with a soft pause and a return arc (wide screens) or straight back to the top (phones, where the
 * flow runs down the stage). SVG path with dash-offset comet tails; the stations are plain DOM.
 */
export default function StackPipeline({ locale, groups }: ViewProps) {
  const c = COPY[locale];
  const stations = useMemo(() => {
    return ORDER.map((id) => {
      const group = groupById(groups, id);
      return { group, toks: tokens(group) };
    });
  }, [groups]);

  const flowRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<SVGPathElement>(null);
  const doneRef = useRef<SVGPathElement>(null);
  const retRef = useRef<SVGPathElement>(null);
  const retLitRef = useRef<SVGPathElement>(null);
  const trailRefs = useRef<(SVGPathElement | null)[]>([]);
  const lightRef = useRef<HTMLSpanElement>(null);
  const startRef = useRef<HTMLSpanElement>(null);
  const endRef = useRef<HTMLSpanElement>(null);
  const stationEls = useRef<(HTMLLIElement | null)[]>([]);
  const ctl = useRef({ paused: false, kick: () => {} });

  const [mode, setMode] = useState<"time" | "still">("time");
  const [inspect, setInspect] = useState(-1);
  const [guardOk, setGuardOk] = useState(false);
  const [paused, setPaused] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const flow = flowRef.current;
    const base = baseRef.current;
    const done = doneRef.current;
    const ret = retRef.current;
    const retLit = retLitRef.current;
    const light = lightRef.current;
    const startTag = startRef.current;
    const endTag = endRef.current;
    // Snapshots: a detached ref (unmount, Strict Mode) must not reach a running frame.
    const trails = trailRefs.current.slice();
    const lis = stationEls.current.slice();
    if (
      !flow ||
      !base ||
      !done ||
      !ret ||
      !retLit ||
      !light ||
      !startTag ||
      !endTag ||
      trails.some((t) => !t) ||
      lis.some((li) => !li)
    )
      return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = ctl.current;
    const n = stations.length;
    const at: number[] = new Array(n).fill(0);
    const enter: number[] = new Array(n).fill(0);
    const exit: number[] = new Array(n).fill(0);
    let current = -1;
    const litAt: number[] = new Array(n).fill(-1e9);
    const litPrev: boolean[] = new Array(n).fill(false);
    let L = 0;
    let RL = 0;
    let W = 0;
    let H = 0;
    let vertical = false;
    let phases: Phase[] = [];
    let cycle = 0;
    let t = 0;
    let loop: Loop | null = null;
    let guardShown = false;
    let modeShown = "";

    const prefixLength = (d: string) => {
      base.setAttribute("d", d);
      return base.getTotalLength();
    };

    const layout = () => {
      const f = flow.getBoundingClientRect();
      W = f.width;
      H = f.height;
      setBox({ w: W, h: H });
      vertical = window.matchMedia("(max-width: 63.99rem)").matches;
      const docks = lis.map((li) => {
        const r = li!.querySelector<HTMLElement>(".sp-dock")!.getBoundingClientRect();
        const l = r.left - f.left;
        const tp = r.top - f.top;
        return { l, r: l + r.width, t: tp, b: tp + r.height, cx: l + r.width / 2, cy: tp + r.height / 2 };
      });
      const first = docks[0];
      const lastDock = docks[n - 1];
      let d = "";
      let retD = "";
      if (!vertical) {
        d = `M0 ${first.cy} L${first.l} ${first.cy}`;
        enter[0] = prefixLength(d);
        d += ` L${first.cx} ${first.cy}`;
        at[0] = prefixLength(d);
        d += ` L${first.r} ${first.cy}`;
        exit[0] = prefixLength(d);
        for (let i = 1; i < n; i++) {
          const a = docks[i - 1];
          const b = docks[i];
          const dx = b.l - a.r;
          d += ` C${a.r + dx * 0.55} ${a.cy} ${b.l - dx * 0.55} ${b.cy} ${b.l} ${b.cy}`;
          enter[i] = prefixLength(d);
          d += ` L${b.cx} ${b.cy}`;
          at[i] = prefixLength(d);
          d += ` L${b.r} ${b.cy}`;
          exit[i] = prefixLength(d);
        }
        d += ` L${W} ${lastDock.cy}`;
        // The loop home: up from the exit and back over the top to the entry.
        const top = Math.min(...docks.map((k) => k.t)) - 44;
        retD = `M${W} ${lastDock.cy} C${W + 26} ${lastDock.cy} ${W + 26} ${top} ${W - 60} ${top} L60 ${top} C-26 ${top} -26 ${first.cy} 0 ${first.cy}`;
        startTag.style.transform = `translate(0, ${first.cy - 30}px)`;
        endTag.style.transform = `translate(${W}px, ${lastDock.cy - 30}px) translateX(-100%)`;
      } else {
        d = `M${first.cx} 0 L${first.cx} ${first.t}`;
        enter[0] = prefixLength(d);
        d += ` L${first.cx} ${first.cy}`;
        at[0] = prefixLength(d);
        d += ` L${first.cx} ${first.b}`;
        exit[0] = prefixLength(d);
        for (let i = 1; i < n; i++) {
          const a = docks[i - 1];
          const b = docks[i];
          const dy = b.t - a.b;
          d += ` C${a.cx} ${a.b + dy * 0.55} ${b.cx} ${b.t - dy * 0.55} ${b.cx} ${b.t}`;
          enter[i] = prefixLength(d);
          d += ` L${b.cx} ${b.cy}`;
          at[i] = prefixLength(d);
          d += ` L${b.cx} ${b.b}`;
          exit[i] = prefixLength(d);
        }
        d += ` L${lastDock.cx} ${H}`;
        startTag.style.transform = `translate(${first.cx + 12}px, 2px)`;
        endTag.style.transform = `translate(${lastDock.cx + 12}px, ${H - 22}px)`;
      }
      base.setAttribute("d", d);
      L = base.getTotalLength();
      for (const p of [done, ...trails]) p!.setAttribute("d", d);
      ret.setAttribute("d", retD);
      retLit.setAttribute("d", retD);
      RL = retD ? ret.getTotalLength() : 0;

      // The loop: glide between stations (eased), a short stop inside each (longer at the guard),
      // out the far end, a soft pause, home over the return arc.
      phases = [{ kind: "move", from: 0, to: at[0], dur: 0.9 }];
      for (let i = 0; i < n; i++) {
        phases.push({ kind: "dwell", at: at[i], station: i, dur: i === AI ? 1.1 : 0.4 });
        const to = i < n - 1 ? at[i + 1] : L;
        phases.push({ kind: "move", from: at[i], to, dur: Math.min(1.35, Math.max(0.75, (to - at[i]) / 300)) });
      }
      phases.push({ kind: "pause", dur: 0.7 }, { kind: "return", dur: RL ? 1.5 : 0.01 }, { kind: "pause", dur: 0.5 });
      cycle = phases.reduce((a, p) => a + p.dur, 0);

      const nextMode = reduce ? "still" : "time";
      if (nextMode !== modeShown) {
        modeShown = nextMode;
        setMode(nextMode);
      }
    };

    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

    const setLit = (i: number, on: boolean) => {
      if (litPrev[i] === on) return;
      litPrev[i] = on;
      lis[i]?.toggleAttribute("data-lit", on);
    };

    const draw = (pos: number, onReturn: number, alpha: number, doneAlpha: number) => {
      // The station the light is inside right now glows hardest.
      let cur = -1;
      if (onReturn < 0) for (let i = 0; i < n; i++) if (pos >= enter[i] - 6 && pos <= exit[i] + 6) cur = i;
      if (cur !== current) {
        lis[current]?.removeAttribute("data-current");
        current = cur;
        lis[cur]?.setAttribute("data-current", "");
      }
      // Comet tails on the main path (or on the return arc while going home).
      trails.forEach((p, k) => {
        const [len, , a] = TRAILS[k];
        p!.style.strokeDasharray = `${len} ${L + len}`;
        p!.style.strokeDashoffset = String(len - pos);
        p!.style.opacity = String(onReturn < 0 ? a * alpha : 0);
      });
      done.style.strokeDasharray = `${Math.max(0, pos)} ${L + 10}`;
      done.style.opacity = String(doneAlpha);
      if (onReturn >= 0 && RL) {
        retLit.style.strokeDasharray = `140 ${RL + 140}`;
        retLit.style.strokeDashoffset = String(140 - onReturn);
        retLit.style.opacity = String(0.55 * alpha);
      } else retLit.style.opacity = "0";
      const pt =
        onReturn >= 0 && RL ? ret.getPointAtLength(onReturn) : base.getPointAtLength(Math.max(0, Math.min(L, pos)));
      light.style.transform = `translate3d(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px,0) translate(-50%,-50%)`;
      light.style.opacity = String(alpha * (onReturn >= 0 ? 0.7 : 1));
    };

    const frame = ({ now, dt }: Tick): After => {
      let keep = true;
      {
        if (!st.paused) t = (t + dt) % cycle;
        // Find the phase at time t.
        let acc = 0;
        let ph = phases[0];
        for (const p of phases) {
          if (t < acc + p.dur) {
            ph = p;
            break;
          }
          acc += p.dur;
        }
        const u = Math.min(1, (t - acc) / ph.dur);
        let pos = 0;
        let onReturn = -1;
        const alpha = 1;
        let doneAlpha = 0.45;
        const idx = phases.indexOf(ph);
        const afterEnd = idx >= phases.length - 3;
        if (ph.kind === "move") pos = ph.from + (ph.to - ph.from) * ease(u);
        else if (ph.kind === "dwell") {
          pos = ph.at;
          if (litAt[ph.station] < now - 200) litAt[ph.station] = now;
        } else if (ph.kind === "return") {
          pos = L;
          onReturn = RL * ease(u);
          doneAlpha = 0;
        } else if (idx === phases.length - 1) {
          // Home: the light waits at the entry before the next request.
          pos = 0;
          doneAlpha = 0;
        } else {
          // Out the far end: the light holds while the route it lit fades.
          pos = L;
          doneAlpha = 0.45 * (1 - u);
        }
        if (afterEnd && ph.kind !== "pause") doneAlpha = 0;
        for (let i = 0; i < n; i++) setLit(i, now - litAt[i] < LIT_MS);
        const ok =
          now - litAt[AI] < LIT_MS + 400 && litAt[AI] > 0 && (ph.kind !== "dwell" || ph.station !== AI || u > 0.55);
        if (ok !== guardShown) {
          guardShown = ok;
          setGuardOk(ok);
        }
        draw(pos, onReturn, alpha, doneAlpha);
        if (st.paused) keep = false;
      }
      // Paused: this frame shows where the light stopped, then nothing until play or input.
      return keep ? undefined : false;
    };

    // The frame governor: 60 on phones, only on screen, half rate when the visitor is idle.
    if (!reduce) loop = frameLoop({ name: "tools/pipeline", host: flow, heavy: true }, frame);
    const kick = () => loop?.wake();
    st.kick = kick;

    layout();
    if (reduce) {
      // A composed still: the whole route traced faintly, every station in its resting tone.
      done.style.strokeDasharray = "none";
      done.style.opacity = "0.5";
      light.style.opacity = "0";
    }
    kick();

    const ro = new ResizeObserver(() => {
      layout();
      kick();
    });
    ro.observe(flow);

    return () => {
      loop?.stop();
      loop = null;
      st.kick = () => {};
      ro.disconnect();
    };
  }, [stations]);

  useEffect(() => {
    ctl.current.paused = paused;
    ctl.current.kick();
  }, [paused]);

  return (
    <div className="sp">
      {mode === "time" && (
        <button type="button" className="sp-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
          <span aria-hidden="true" className="sp-pause-icon" data-paused={paused || undefined} />
          {nobr(paused ? c.resume : c.pause)}
        </button>
      )}
      <div className="sp-flow" ref={flowRef} data-mode={mode}>
        <svg
          className="sp-svg"
          width={box.w}
          height={box.h}
          viewBox={`0 0 ${box.w || 1} ${box.h || 1}`}
          aria-hidden="true"
          focusable="false"
        >
          <path ref={retRef} className="sp-ret" />
          <path ref={retLitRef} className="sp-ret-lit" />
          <path ref={baseRef} className="sp-base" />
          <path ref={doneRef} className="sp-done" />
          {TRAILS.map(([, w], k) => (
            <path
              key={k}
              ref={(el) => {
                trailRefs.current[k] = el;
              }}
              className="sp-trail"
              style={{ strokeWidth: w } as CSSProperties}
            />
          ))}
        </svg>
        <span ref={lightRef} className="sp-light" aria-hidden="true" />
        <span ref={startRef} className="sp-end-tag" aria-hidden="true">
          {nobr(c.start)}
        </span>
        <span ref={endRef} className="sp-end-tag" aria-hidden="true">
          {nobr(c.end)}
        </span>

        <ol className="sp-stations" aria-label={c.stationsLabel}>
          {stations.map(({ group, toks }, i) => (
            <li
              key={group.id}
              ref={(el) => {
                stationEls.current[i] = el;
              }}
              className="sp-station"
              data-inspect={inspect === i || undefined}
              tabIndex={0}
              onPointerEnter={(e) => e.pointerType !== "touch" && setInspect(i)}
              onPointerLeave={(e) => e.pointerType !== "touch" && setInspect(-1)}
              onFocus={() => setInspect(i)}
              onBlur={() => setInspect(-1)}
            >
              <div className="sp-dock-wrap">
                <div className="sp-dock" data-count={toks.length}>
                  {toks.map((t, k) => (
                    <span
                      key={t.key}
                      className="sp-tok"
                      data-text={t.mark ? undefined : ""}
                      style={{ "--k": k } as CSSProperties}
                    >
                      {t.mark && t.mark !== "practice" ? <ToolMark name={t.key} /> : nobr(t.short)}
                    </span>
                  ))}
                </div>
                {i === AI && (
                  <span className="sp-guard" data-ok={guardOk || undefined} aria-hidden="true">
                    <svg viewBox="0 0 16 16" className="sp-guard-icon">
                      <path d="M8 1.5 13.5 3.6v4.1c0 3.2-2.3 5.6-5.5 6.8C4.8 13.3 2.5 10.9 2.5 7.7V3.6Z" />
                      <path className="sp-guard-tick" d="m5.4 8.1 1.9 1.9 3.4-3.6" />
                    </svg>
                    {nobr(guardOk ? c.checked : c.guard)}
                  </span>
                )}
              </div>
              <div className="sp-cap">
                <p className="sp-cap-idx" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="sp-cap-label">{nobr(group.label)}</h3>
                <p className="sp-cap-line">{toolName(c.lines[group.id])}</p>
                <div className="sp-names">
                  <ul>
                    {group.tools.map((t) => (
                      <li key={t.key}>{toolName(t.label)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
