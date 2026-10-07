"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { Glyph, type TileId } from "./glyphs";
import { COPY } from "./copy";
import "./assemble-system.css";

/** The correct tile for each step, in order. */
const ORDER: TileId[] = ["line", "stt", "ts", "model", "guard", "reply"];
/** Tray order: shuffled once, fixed, so the puzzle never starts solved or half solved. */
const TRAY: TileId[] = ["model", "reply", "line", "guard", "ts", "stt"];
const SPARKS = 28;

type Placed = (TileId | null)[];

export default function AssembleSystem({ locale }: { locale: Locale }) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const rootRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const wireRef = useRef<SVGPathElement>(null);
  const litRef = useRef<SVGPathElement>(null);
  const packetRef = useRef<SVGGElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const drag = useRef<{ id: TileId; el: HTMLElement; x0: number; y0: number; moved: boolean; pid: number } | null>(
    null,
  );
  const reduced = useRef(false);
  const tl = useRef<gsap.core.Timeline | null>(null);

  const [placed, setPlaced] = useState<Placed>(() => ORDER.map(() => null));
  const [selected, setSelected] = useState<TileId | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "info" | "wrong" | "ok" }>({ text: "", tone: "info" });
  const [stage, setStage] = useState(-1);
  const [done, setDone] = useState(false);
  const [wire, setWire] = useState({ d: "", w: 0, h: 0 });

  const complete = placed.every((p, i) => p === ORDER[i]);
  const tray = TRAY.filter((id) => !placed.includes(id));

  useLayoutEffect(() => {
    gsap.registerPlugin(Flip, MotionPathPlugin, Physics2DPlugin);
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Route the wire through the socket centres (orthogonal elbows when the board wraps to rows).
  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const pts = [...board.querySelectorAll<HTMLElement>("[data-socket]")].map((s) => {
      const r = s.getBoundingClientRect();
      return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
    });
    let d = "";
    pts.forEach((p, i) => {
      if (i === 0) return void (d = `M${p.x} ${p.y}`);
      const q = pts[i - 1];
      if (Math.abs(p.y - q.y) < 4) d += ` L${p.x} ${p.y}`;
      else {
        const my = (p.y + q.y) / 2;
        d += ` L${q.x} ${my} L${p.x} ${my} L${p.x} ${p.y}`;
      }
    });
    setWire({ d, w: b.width, h: b.height });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (boardRef.current) ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // FLIP every tile from where it was (the drop point, the tray, a socket) to where React put it.
  useLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state || !rootRef.current) return;
    Flip.from(state, {
      targets: rootRef.current.querySelectorAll("[data-flip-id]"),
      duration: reduced.current ? 0 : 0.55,
      ease: "back.out(1.5)",
      absolute: true,
      zIndex: 5,
    });
  }, [placed]);

  const commit = (next: Placed) => {
    if (rootRef.current) flipState.current = Flip.getState(rootRef.current.querySelectorAll("[data-flip-id]"));
    setPlaced(next);
  };

  const wiggleBack = (el: HTMLElement | null, socket: number | null) => {
    if (socket !== null) {
      const s = boardRef.current?.querySelector<HTMLElement>(`[data-socket="${socket}"]`);
      if (s && !reduced.current) gsap.fromTo(s, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.25)" });
    }
    if (!el) return;
    if (reduced.current) return void gsap.set(el, { x: 0, y: 0, rotate: 0 });
    gsap
      .timeline()
      .to(el, { rotate: -7, duration: 0.07 })
      .to(el, { rotate: 6, duration: 0.07 })
      .to(el, { rotate: -4, duration: 0.07 })
      .to(el, { x: 0, y: 0, rotate: 0, duration: 0.6, ease: "elastic.out(1, 0.45)" });
  };

  const tryPlace = (id: TileId, socket: number, el: HTMLElement | null, byKey = false) => {
    if (ORDER[socket] === id && placed[socket] === null) {
      const next = [...placed];
      next[socket] = id;
      if (el) gsap.set(el, { rotate: 0 });
      commit(next);
      // Keyboard and tap flow: the focused drop button is gone, so hand focus to the next part.
      if (byKey)
        requestAnimationFrame(() =>
          rootRef.current?.querySelector<HTMLElement>(".asm-tray .asm-tile, .asm-actions .asm-btn")?.focus(),
        );
      setSelected(null);
      setMessage({ text: c.placed(c.tiles[id], socket + 1), tone: "ok" });
      return;
    }
    setMessage({ text: c.wrong[id], tone: "wrong" });
    wiggleBack(el, socket);
  };

  const unplace = (socket: number) => {
    const next = [...placed];
    next[socket] = null;
    stopRun();
    commit(next);
    setMessage({ text: "", tone: "info" });
  };

  // ---------- pointer drag (mouse, pen, touch) ----------
  const onDown = (id: TileId) => (e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    drag.current = { id, el, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId };
  };
  const onMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      d.el.dataset.dragging = "";
      setSelected(null);
    }
    gsap.set(d.el, { x: dx, y: dy, rotate: Math.max(-8, Math.min(8, dx * 0.02)) });
    // Highlight the socket under the finger.
    const hit = socketAt(e.clientX, e.clientY);
    boardRef.current?.querySelectorAll("[data-socket]").forEach((s, i) => s.toggleAttribute("data-hover", i === hit));
  };
  const onUp = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    drag.current = null;
    delete d.el.dataset.dragging;
    boardRef.current?.querySelectorAll("[data-socket]").forEach((s) => s.removeAttribute("data-hover"));
    if (!d.moved) return; // a tap: the click handler selects
    d.el.dataset.justDragged = "";
    const hit = socketAt(e.clientX, e.clientY);
    if (hit === null) wiggleBack(d.el, null);
    else tryPlace(d.id, hit, d.el);
  };
  const socketAt = (x: number, y: number): number | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const s = (el as HTMLElement).closest?.("[data-socket]");
      if (s) return Number((s as HTMLElement).dataset.socket);
    }
    return null;
  };

  // ---------- the run ----------
  const stopRun = () => {
    tl.current?.kill();
    tl.current = null;
    setStage(-1);
    setDone(false);
  };

  const celebrate = useCallback(() => {
    const host = sparksRef.current;
    const board = boardRef.current;
    if (!host || !board || reduced.current) return;
    const last = board.querySelector<HTMLElement>('[data-socket="5"]');
    if (!last) return;
    const b = board.getBoundingClientRect();
    const r = last.getBoundingClientRect();
    const x = r.left - b.left + r.width / 2;
    const y = r.top - b.top + r.height / 2;
    host.querySelectorAll("i").forEach((s, i) => {
      gsap.killTweensOf(s);
      gsap.set(s, { x, y, opacity: 1, scale: 0.6 + Math.random() * 0.9 });
      gsap.to(s, {
        duration: 1.3 + Math.random() * 0.6,
        physics2D: { velocity: 260 + Math.random() * 280, angle: -90 + (i / SPARKS - 0.5) * 160, gravity: 520 },
        opacity: 0,
        ease: "none",
      });
    });
  }, []);

  const run = useCallback(() => {
    const path = wireRef.current;
    const lit = litRef.current;
    const packet = packetRef.current;
    const board = boardRef.current;
    if (!path || !lit || !packet || !board) return;
    tl.current?.kill();
    setDone(false);
    if (reduced.current) {
      setStage(ORDER.length - 1);
      setDone(true);
      return;
    }
    // Progress along the wire at which the packet reaches each socket centre.
    const total = path.getTotalLength();
    const b = board.getBoundingClientRect();
    const marks = [...board.querySelectorAll<HTMLElement>("[data-socket]")].map((s) => {
      const r = s.getBoundingClientRect();
      const cx = r.left - b.left + r.width / 2;
      const cy = r.top - b.top + r.height / 2;
      let best = 0;
      let bestD = Infinity;
      for (let l = 0; l <= total; l += 4) {
        const p = path.getPointAtLength(l);
        const dd = (p.x - cx) ** 2 + (p.y - cy) ** 2;
        if (dd < bestD) {
          bestD = dd;
          best = l;
        }
      }
      return best / total;
    });
    const t = gsap.timeline({ onComplete: () => (setDone(true), celebrate()) });
    gsap.set(lit, { strokeDasharray: total, strokeDashoffset: total });
    gsap.set(packet, { opacity: 1 });
    setStage(0);
    const proxy = { p: 0 };
    let shown = 0;
    // Hold a beat at every socket so each step's caption can be read.
    marks.forEach((m, i) => {
      if (i === 0) return;
      t.to(proxy, {
        p: m,
        duration: 0.55,
        ease: "power2.inOut",
        delay: 0.85,
        onUpdate: () => {
          const pt = path.getPointAtLength(proxy.p * total);
          gsap.set(packet, { x: pt.x, y: pt.y });
          gsap.set(lit, { strokeDashoffset: total * (1 - proxy.p) });
          const reached = marks.filter((mm) => proxy.p >= mm - 0.002).length - 1;
          if (reached !== shown) {
            shown = reached;
            setStage(reached);
          }
        },
      });
    });
    t.to(packet, { opacity: 0, scale: 2.2, duration: 0.5, delay: 0.5, transformOrigin: "50% 50%" });
    const start = path.getPointAtLength(0);
    gsap.set(packet, { x: start.x, y: start.y, scale: 1 });
    tl.current = t;
  }, [celebrate]);

  useEffect(() => {
    if (!complete) return;
    // Let the last tile land before the packet sets off.
    const id = window.setTimeout(run, reduced.current ? 0 : 650);
    return () => window.clearTimeout(id);
  }, [complete, run]);

  useEffect(() => () => void tl.current?.kill(), []);

  const reset = () => {
    stopRun();
    setSelected(null);
    setMessage({ text: "", tone: "info" });
    commit(ORDER.map(() => null));
  };

  const live =
    stage >= 0 ? c.stages[stage] : selected ? c.selectedHint(c.tiles[selected]) : message.text || c.idle;

  return (
    <section ref={rootRef} className="asm shell" aria-labelledby="asm-title" data-complete={complete || undefined}>
      <header className="asm-head">
        <p className="asm-kicker">
          <i aria-hidden="true" />
          {nobr(c.kicker)}
        </p>
        <h2 id="asm-title" className="asm-title">
          {nobr(c.title)}
        </h2>
        <p className="asm-lede">{nobr(c.lede)}</p>
      </header>

      <div className="asm-card" data-done={done || undefined}>
        <div className="asm-tray" aria-label={c.trayLabel} role="group">
          <span className="asm-tray-label readout" aria-hidden="true">
            {c.trayLabel}
          </span>
          {tray.length === 0 ? <span className="asm-tray-empty readout">{c.trayEmpty}</span> : null}
          {tray.map((id) => (
            <button
              key={id}
              type="button"
              className="asm-tile"
              data-flip-id={id}
              data-tile={id}
              aria-pressed={selected === id}
              onPointerDown={onDown(id)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={(e) => {
                const el = e.currentTarget;
                if (el.dataset.justDragged !== undefined) return void delete el.dataset.justDragged;
                setSelected((s) => (s === id ? null : id));
                setMessage({ text: "", tone: "info" });
              }}
              onKeyDown={(e) => e.key === "Escape" && setSelected(null)}
            >
              <Glyph id={id} />
              <span>{nobr(c.tiles[id])}</span>
            </button>
          ))}
        </div>

        <div
          ref={boardRef}
          className="asm-board"
          data-selecting={selected ? "" : undefined}
          onKeyDown={(e) => e.key === "Escape" && setSelected(null)}
        >
          <svg className="asm-wire" width={wire.w} height={wire.h} aria-hidden="true">
            <path ref={wireRef} d={wire.d} className="asm-wire-base" />
            <path ref={litRef} d={wire.d} className="asm-wire-lit" />
          </svg>
          <svg className="asm-wire asm-packet-layer" width={wire.w} height={wire.h} aria-hidden="true">
            <g ref={packetRef} className="asm-packet" opacity={0}>
              <circle r={16} className="asm-packet-halo" />
              <circle r={5} className="asm-packet-core" />
            </g>
          </svg>
          <div ref={sparksRef} className="asm-sparks" aria-hidden="true">
            {Array.from({ length: SPARKS }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <ol className="asm-sockets">
            {ORDER.map((_, i) => {
              const tile = placed[i];
              const lit = stage >= i;
              return (
                <li key={i} className="asm-socket" data-socket={i} data-lit={lit || undefined} data-filled={tile ? "" : undefined}>
                  <span className="asm-step readout">{String(i + 1).padStart(2, "0")}</span>
                  <span className="asm-hint">{nobr(c.sockets[i])}</span>
                  {tile ? (
                    <button
                      type="button"
                      className="asm-tile asm-tile-placed"
                      data-flip-id={tile}
                      data-tile={tile}
                      aria-label={c.remove(c.tiles[tile])}
                      onClick={() => unplace(i)}
                    >
                      <Glyph id={tile} />
                      <span>{nobr(c.tiles[tile])}</span>
                    </button>
                  ) : selected ? (
                    <button
                      type="button"
                      className="asm-drop"
                      onClick={() =>
                        tryPlace(selected, i, rootRef.current?.querySelector(`[data-flip-id="${selected}"]`) ?? null, true)
                      }
                    >
                      {c.placeHere(c.tiles[selected], i + 1)}
                    </button>
                  ) : (
                    <span className="asm-empty" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="asm-foot">
          <p className="asm-live" data-tone={stage >= 0 ? "run" : message.tone} aria-live="polite">
            {nobr(live)}
          </p>
          <div className="asm-actions">
            {done ? (
              <button type="button" className="asm-btn asm-btn-gold" onClick={run}>
                {c.again}
              </button>
            ) : null}
            <button type="button" className="asm-btn" onClick={reset}>
              {c.reset}
            </button>
          </div>
        </div>
        {done ? (
          <div className="asm-reply" role="status">
            <span className="readout">{c.replyLabel}</span>
            <p>{nobr(c.reply)}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
