"use client";

import { Fragment, useEffect, useRef, type KeyboardEvent } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import type { LabProps } from "../../types";
import { GROUPS, SECTION, toolLabel } from "../bento-loops/data";
import { LabMark, markKind } from "../bento-loops/marks";
import "./spotlight.css";

/** Columns of the widest row (data and cloud has nine tools); shorter rows end in empty cells. */
const COLS = 9;

const COPY = {
  en: {
    hint: "Move or drag across the wall: tools under the light take their brand colours. Point at or tap a group to light all of it.",
    keys: "Keyboard: Tab into the wall, then the arrow keys move the light.",
    wall: "Tool logos",
    tools: (n: number) => `${n} tools`,
    note: "Logos are trademarks of their owners. A tool without a usable mark is set as its name.",
  },
  th: {
    hint: "เลื่อนเมาส์หรือลากนิ้วไปบนผนัง โลโก้ที่อยู่ใต้แสงจะขึ้นสีจริงของแบรนด์ ชี้หรือแตะชื่อกลุ่มเพื่อเปิดไฟทั้งกลุ่ม",
    keys: "ใช้คีย์บอร์ด: กด Tab เข้าผนัง แล้วใช้ปุ่มลูกศรเลื่อนแสง",
    wall: "โลโก้เครื่องมือ",
    tools: (n: number) => `${n} รายการ`,
    note: "โลโก้เป็นเครื่องหมายการค้าของเจ้าของแต่ละราย เครื่องมือที่ไม่มีโลโก้ให้ใช้จะแสดงเป็นชื่อแทน",
  },
} satisfies Record<Locale, unknown>;

/** A name that only breaks at spaces: a hyphenated word ("event-driven") stays whole. */
const unbroken = (label: string) =>
  label
    .split(/(\S*-\S*)/)
    .filter(Boolean)
    .map((part, j) =>
      part.includes("-") ? (
        <span key={j} className="whitespace-nowrap">
          {part}
        </span>
      ) : (
        <Fragment key={j}>{nobr(part)}</Fragment>
      ),
    );

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * A wall of every tool in the theme tone. A soft light follows the pointer (or a finger, or
 * keyboard focus) and brings the logos under it into brand colour with a glow and a small lift;
 * a group's name lights its whole row. Flourish: with nobody pointing, the light drifts slowly
 * across the wall on its own, and the grid's hairlines warm to gold where it passes.
 * One rAF loop, only while the wall is on screen; it writes one custom property per cell that
 * changed. Reduced motion: no drift, no lift, no easing; colour still answers hover and focus.
 */
export default function LogoSpotlight({ locale }: LabProps) {
  const wallRef = useRef<HTMLDivElement>(null);
  const c = COPY[locale];
  const s = SECTION[locale];

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const glow = wall.querySelector<HTMLElement>(".ls-glow")!;
    const cells = Array.from(wall.querySelectorAll<HTMLElement>("[data-cell]"));
    const labels = Array.from(wall.querySelectorAll<HTMLButtonElement>("[data-group-btn]"));
    const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let centers: { x: number; y: number }[] = [];
    let w = 1;
    let h = 1;
    const measure = () => {
      const r = wall.getBoundingClientRect();
      w = r.width;
      h = r.height;
      centers = cells.map((cell) => {
        const b = cell.getBoundingClientRect();
        return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 };
      });
    };

    const pos = { x: w * 0.3, y: h * 0.4 };
    const target = { ...pos };
    const ks = cells.map(() => -1);
    let pointerUntil = 0; // the pointer (or a tap) owns the light until this time
    let focused = -1;
    let group: string | null = null;
    let visible = false;
    let raf = 0;
    let last = 0;
    let start = performance.now();

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      const still = reduce();
      const idle = now > pointerUntil && focused < 0 && !group;
      if (idle && !still) {
        // Slow Lissajous drift across the wall.
        const t = (now - start) / 1000;
        target.x = w * (0.5 + 0.38 * Math.sin(t * 0.23));
        target.y = h * (0.5 + 0.36 * Math.sin(t * 0.37 + 1.2));
      }
      const a = still ? 1 : 1 - Math.exp(-dt * (idle ? 3 : 11));
      pos.x += (target.x - pos.x) * a;
      pos.y += (target.y - pos.y) * a;
      glow.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
      glow.style.opacity = still && idle ? "0" : "1";

      const radius = Math.max(150, Math.min(240, w * 0.16));
      let moving = !still && (Math.abs(target.x - pos.x) > 0.5 || Math.abs(target.y - pos.y) > 0.5 || idle);
      cells.forEach((cell, i) => {
        const p = centers[i];
        let k = still && idle ? 0 : smooth(radius, radius * 0.18, Math.hypot(p.x - pos.x, p.y - pos.y));
        if (group) k = cell.dataset.group === group ? 1 : k * 0.25;
        if (i === focused) k = 1;
        const prev = ks[i] < 0 ? 0 : ks[i];
        const next = still ? k : prev + (k - prev) * (1 - Math.exp(-dt * 14));
        if (Math.abs(next - k) > 0.004) moving = true;
        if (Math.abs(next - ks[i]) > 0.003) {
          ks[i] = next;
          cell.style.setProperty("--k", next.toFixed(3));
        }
      });
      if (moving && visible) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    // Group names: hover or focus lights the row; a tap toggles it.
    const lightGroup = (id: string | null, from?: HTMLElement) => {
      group = id;
      for (const b of labels) b.setAttribute("aria-pressed", String(b.dataset.groupBtn === id));
      if (from) {
        const r = wall.getBoundingClientRect();
        const row = from.closest<HTMLElement>(".ls-row")!.getBoundingClientRect();
        target.x = row.left - r.left + row.width * 0.55;
        target.y = row.top - r.top + row.height / 2;
      }
      kick();
    };
    const local = (e: PointerEvent) => {
      const r = wall.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      // Over a group name the light stays on that group's row.
      if ((e.target as Element).closest("[data-group-btn]")) return;
      if (group && e.pointerType === "mouse") lightGroup(null);
      Object.assign(target, local(e));
      pointerUntil = performance.now() + (e.pointerType === "mouse" ? 1e9 : 2600);
      kick();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointerUntil = performance.now() + 900;
      start = performance.now() - 4000 * Math.random();
      kick();
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest("[data-group-btn]")) return;
      group = null;
      onMove(e);
    };
    wall.addEventListener("pointermove", onMove);
    wall.addEventListener("pointerdown", onDown);
    wall.addEventListener("pointerleave", onLeave);

    const offs: (() => void)[] = [];
    for (const b of labels) {
      const id = b.dataset.groupBtn!;
      const enter = (e: PointerEvent) => e.pointerType === "mouse" && lightGroup(id, b);
      const leave = (e: PointerEvent) => e.pointerType === "mouse" && lightGroup(null);
      const click = () => lightGroup(group === id ? null : id, b);
      const focus = () => b.matches(":focus-visible") && lightGroup(id, b);
      const blur = () => group === id && lightGroup(null);
      b.addEventListener("pointerenter", enter);
      b.addEventListener("pointerleave", leave);
      b.addEventListener("click", click);
      b.addEventListener("focus", focus);
      b.addEventListener("blur", blur);
      offs.push(() => {
        b.removeEventListener("pointerenter", enter);
        b.removeEventListener("pointerleave", leave);
        b.removeEventListener("click", click);
        b.removeEventListener("focus", focus);
        b.removeEventListener("blur", blur);
      });
    }

    // Keyboard focus on a cell moves the light there.
    const onFocusIn = (e: FocusEvent) => {
      const i = cells.indexOf(e.target as HTMLElement);
      if (i < 0) return;
      focused = i;
      group = null;
      Object.assign(target, centers[i]);
      kick();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (cells.includes(e.target as HTMLElement)) focused = -1;
      kick();
    };
    wall.addEventListener("focusin", onFocusIn);
    wall.addEventListener("focusout", onFocusOut);

    const ro = new ResizeObserver(() => {
      measure();
      kick();
    });
    ro.observe(wall);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(wall);
    measure();
    Object.assign(pos, { x: w * 0.3, y: h * 0.4 });
    kick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      wall.removeEventListener("pointermove", onMove);
      wall.removeEventListener("pointerdown", onDown);
      wall.removeEventListener("pointerleave", onLeave);
      wall.removeEventListener("focusin", onFocusIn);
      wall.removeEventListener("focusout", onFocusOut);
      for (const off of offs) off();
    };
  }, []);

  /** Roving focus across the cells: arrows move within and between rows, Home/End jump. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!cell || !wallRef.current) return;
    const rows = Array.from(wallRef.current.querySelectorAll<HTMLElement>(".ls-cells")).map((ul) =>
      Array.from(ul.querySelectorAll<HTMLElement>("[data-cell]")),
    );
    const r = rows.findIndex((row) => row.includes(cell));
    const i = rows[r].indexOf(cell);
    const flat = rows.flat();
    const at = flat.indexOf(cell);
    let next: HTMLElement | undefined;
    if (e.key === "ArrowRight") next = flat[(at + 1) % flat.length];
    else if (e.key === "ArrowLeft") next = flat[(at - 1 + flat.length) % flat.length];
    else if (e.key === "ArrowDown") next = rows[(r + 1) % rows.length]?.[Math.min(i, rows[(r + 1) % rows.length].length - 1)];
    else if (e.key === "ArrowUp") {
      const up = rows[(r - 1 + rows.length) % rows.length];
      next = up[Math.min(i, up.length - 1)];
    } else if (e.key === "Home") next = flat[0];
    else if (e.key === "End") next = flat[flat.length - 1];
    if (!next) return;
    e.preventDefault();
    cell.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  };

  return (
    <section className="ls shell" aria-labelledby="ls-title">
      <header className="ls-section-head">
        <h2 id="ls-title">{nobr(s.title)}</h2>
        <div className="ls-section-intro">
          <p>{nobr(s.intro)}</p>
          <p className="ls-hint">{nobr(c.hint)}</p>
        </div>
      </header>

      <div className="ls-wall" ref={wallRef} role="group" aria-label={c.wall} aria-describedby="ls-keys" onKeyDown={onKeyDown}>
        <span className="ls-glow" aria-hidden="true" />
        {GROUPS.map((g, gi) => (
          <div key={g.id} className="ls-row">
            <button type="button" className="ls-label" data-group-btn={g.id} aria-pressed="false">
              <span className="ls-label-idx">{String(gi + 1).padStart(2, "0")}</span>
              <span className="ls-label-name">{nobr(g.label[locale])}</span>
              <span className="ls-label-n">{nobr(c.tools(g.tools.length))}</span>
            </button>
            <ul className="ls-cells">
              {g.tools.map((tool, ti) => {
                const kind = markKind(tool.key);
                const label = toolLabel(tool, locale);
                const tab = gi === 0 && ti === 0 ? 0 : -1;
                return (
                  <li key={tool.key} className="ls-cell" data-cell data-group={g.id} data-kind={kind} tabIndex={tab}>
                    {kind === "mark" ? (
                      <LabMark name={tool.key} />
                    ) : (
                      <span className="ls-word" aria-hidden="true">
                        {kind === "practice" ? <LabMark name={tool.key} /> : null}
                        <span>{unbroken(label)}</span>
                      </span>
                    )}
                    <span className={kind === "mark" ? "ls-name" : "sr-only"}>{unbroken(label)}</span>
                  </li>
                );
              })}
              {Array.from({ length: COLS - g.tools.length }, (_, i) => (
                <li key={`f${i}`} className="ls-fill" aria-hidden="true" />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="ls-foot">
        <span id="ls-keys">{nobr(c.keys)}</span> <span>{nobr(c.note)}</span>
      </p>
    </section>
  );
}
