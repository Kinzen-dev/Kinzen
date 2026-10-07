"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import "./notes.css";

export type Note = { id: string; pastel: string; tilt: number; body: ReactNode };

type Offset = { x: number; y: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type Drag = { id: number; px: number; py: number; o: Offset; b: Bounds; lastX: number; tilt: number };
type Press = { id: number; x: number; y: number; timer: number };

const STEP = 16;
const BIG_STEP = 64;
const EDGE = 8;
/** Touch: hold this long (without moving) to pick a note up; moving first scrolls the page. */
const HOLD_MS = 380;
const SLOP = 10;

const clamp = (v: number, lo: number, hi: number) => (lo > hi ? 0 : Math.min(hi, Math.max(lo, v)));

/**
 * Pastel sticky notes on a board (v3 "How I work"). Mouse and pen drag a note anywhere on the
 * board. Touch: press and hold a note to pick it up, then drag; a finger that moves before the
 * hold completes scrolls the page as usual (the note never steals a scroll). Keyboard: the notes stay a normal
 * list, each note is focusable and the arrow keys nudge it (Shift for a bigger step). "Put the
 * notes back" returns every note to its place. Moves only write a transform (no layout work).
 */
export function NotesBoard({
  notes,
  labels,
}: {
  notes: Note[];
  labels: { hint: ReactNode; hintTouch: ReactNode; keys: string; reset: ReactNode };
}) {
  const keysId = useId();
  const board = useRef<HTMLDivElement>(null);
  const offsets = useRef(new Map<string, Offset>());
  const drag = useRef<Drag | null>(null);
  const press = useRef<Press | null>(null);
  const frame = useRef(0);
  const top = useRef(notes.length);
  const [moved, setMoved] = useState(false);

  const write = (el: HTMLElement, o: Offset, tilt = 0) => {
    el.style.setProperty("--x", `${o.x.toFixed(1)}px`);
    el.style.setProperty("--y", `${o.y.toFixed(1)}px`);
    el.style.setProperty("--drag-tilt", `${tilt.toFixed(2)}deg`);
  };

  /** How far the note may travel from its home slot and stay on the board. */
  const bounds = (el: HTMLElement, o: Offset): Bounds => {
    const b = board.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const left = r.left - o.x;
    const topEdge = r.top - o.y;
    return {
      minX: b.left + EDGE - left,
      maxX: b.right - EDGE - (left + r.width),
      minY: b.top + EDGE - topEdge,
      maxY: b.bottom - EDGE - (topEdge + r.height),
    };
  };

  const raise = (el: HTMLElement) => {
    top.current += 1;
    el.style.zIndex = String(top.current);
  };

  const commit = useCallback((id: string, o: Offset) => {
    if (o.x === 0 && o.y === 0) offsets.current.delete(id);
    else offsets.current.set(id, o);
    setMoved(offsets.current.size > 0);
  }, []);

  const begin = (el: HTMLElement, id: string, pointerId: number, x: number, y: number) => {
    const o = offsets.current.get(id) ?? { x: 0, y: 0 };
    drag.current = { id: pointerId, px: x, py: y, o, b: bounds(el, o), lastX: x, tilt: 0 };
    try {
      el.setPointerCapture(pointerId);
    } catch {
      /* the pointer already ended */
    }
    el.dataset.dragging = "";
    raise(el);
  };

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (id: string) => (e: PointerEvent<HTMLLIElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    if (e.pointerType === "touch") {
      cancelPress();
      const { pointerId, clientX: x, clientY: y } = e;
      press.current = {
        id: pointerId,
        x,
        y,
        timer: window.setTimeout(() => {
          press.current = null;
          begin(el, id, pointerId, x, y);
          navigator.vibrate?.(8);
        }, HOLD_MS),
      };
      return;
    }
    // No preventDefault: the native mousedown focuses the note (so no keyboard ring appears),
    // and user-select: none keeps text from being selected mid-drag.
    begin(el, id, e.pointerId, e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent<HTMLLIElement>) => {
    const p = press.current;
    if (p && p.id === e.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) cancelPress();
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const el = e.currentTarget;
    const x = clamp(d.o.x + e.clientX - d.px, d.b.minX, d.b.maxX);
    const y = clamp(d.o.y + e.clientY - d.py, d.b.minY, d.b.maxY);
    // The paper swings a little in the direction it is pulled, then settles.
    d.tilt = d.tilt * 0.75 + Math.max(-9, Math.min(9, (e.clientX - d.lastX) * 0.9)) * 0.25;
    d.lastX = e.clientX;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => write(el, { x, y }, d.tilt));
  };

  const onPointerUp = (id: string) => (e: PointerEvent<HTMLLIElement>) => {
    if (press.current?.id === e.pointerId) cancelPress();
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const el = e.currentTarget;
    cancelAnimationFrame(frame.current);
    const o = {
      x: clamp(d.o.x + e.clientX - d.px, d.b.minX, d.b.maxX),
      y: clamp(d.o.y + e.clientY - d.py, d.b.minY, d.b.maxY),
    };
    drag.current = null;
    delete el.dataset.dragging;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    write(el, o);
    commit(id, o);
  };

  // A held note owns the finger: stop the page from scrolling while it is carried. Non-passive,
  // so it has to be a native listener; it does nothing unless a note is being dragged.
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current && e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      if (press.current) window.clearTimeout(press.current.timer);
    };
  }, []);

  const onKeyDown = (id: string) => (e: KeyboardEvent<HTMLLIElement>) => {
    const dir: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const v = dir[e.key];
    if (!v || e.altKey || e.metaKey || e.ctrlKey || e.target !== e.currentTarget) return;
    e.preventDefault();
    const el = e.currentTarget;
    const step = e.shiftKey ? BIG_STEP : STEP;
    const cur = offsets.current.get(id) ?? { x: 0, y: 0 };
    const b = bounds(el, cur);
    const o = { x: clamp(cur.x + v[0] * step, b.minX, b.maxX), y: clamp(cur.y + v[1] * step, b.minY, b.maxY) };
    raise(el);
    write(el, o);
    commit(id, o);
  };

  const reset = () => {
    board.current?.querySelectorAll<HTMLElement>("[data-note]").forEach((el) => write(el, { x: 0, y: 0 }));
    offsets.current.clear();
    setMoved(false);
  };

  return (
    <div className="notes">
      <div ref={board} data-reveal className="notes-board">
        <ul className="notes-list">
          {notes.map((n) => (
            <li
              key={n.id}
              data-note={n.id}
              tabIndex={0}
              aria-describedby={keysId}
              className={`note ${n.pastel}`}
              style={{ "--tilt": `${n.tilt}deg` } as CSSProperties}
              onPointerDown={onPointerDown(n.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp(n.id)}
              onPointerCancel={onPointerUp(n.id)}
              onContextMenu={(e) => {
                // A long press would open the touch callout over the note being picked up.
                if (press.current || drag.current) e.preventDefault();
              }}
              onKeyDown={onKeyDown(n.id)}
            >
              <span aria-hidden="true" className="note-tape" />
              {n.body}
            </li>
          ))}
        </ul>
      </div>
      <div className="notes-bar">
        <p className="notes-hint">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M7.5 9V3.8a1.3 1.3 0 0 1 2.6 0V9m0-1.2V2.9a1.3 1.3 0 0 1 2.6 0v5.3m0-.6V4.4a1.3 1.3 0 0 1 2.6 0v6.7c0 3.6-2.3 6.4-5.6 6.4-2.3 0-3.6-1-4.9-3.1L2.6 11a1.3 1.3 0 0 1 2.1-1.5l2.8 2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="notes-hint-fine">{labels.hint}</span>
          <span className="notes-hint-touch">{labels.hintTouch}</span>
        </p>
        <button type="button" className="notes-reset" data-idle={moved ? undefined : ""} onClick={reset}>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 10a6 6 0 1 0 1.8-4.3M4 3.5v3h3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {labels.reset}
        </button>
      </div>
      <p id={keysId} hidden>
        {labels.keys}
      </p>
    </div>
  );
}
