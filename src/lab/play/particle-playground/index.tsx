"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { readPalette } from "@/fx/engine/palette";
import { createField, type Field, type Pt } from "./field";
import "./particle-playground.css";

const COPY = {
  en: {
    kicker: "Play · particles",
    title: "Write your name in gold",
    lede: "Type a name, or switch to Draw and sketch. Move across the field to stir it.",
    type: "Type",
    draw: "Draw",
    mode: "Input mode",
    label: "Your name",
    placeholder: "A name, Latin or Thai",
    home: "Back to KINZEN",
    clear: "Clear drawing",
    drawHere: "Draw here, then let go",
    home_s: "KINZEN",
    text_s: (n: string) => `Forming “${n}”, then back to KINZEN`,
    drawing_s: "Your drawing, then back to KINZEN",
    stage: "Gold particle field",
  },
  th: {
    kicker: "ลองเล่น · อนุภาค",
    title: "เขียนชื่อคุณด้วยทอง",
    lede: "พิมพ์ชื่อ หรือสลับไปโหมดวาดแล้ววาดอะไรก็ได้ ลากผ่านอนุภาคเพื่อกวนให้กระจาย",
    type: "พิมพ์",
    draw: "วาด",
    mode: "โหมดป้อนข้อมูล",
    label: "ชื่อของคุณ",
    placeholder: "ชื่อภาษาไทยหรืออังกฤษก็ได้",
    home: "กลับเป็น KINZEN",
    clear: "ล้างภาพวาด",
    drawHere: "วาดตรงนี้ แล้วปล่อยมือ",
    home_s: "KINZEN",
    text_s: (n: string) => `กำลังเรียงเป็น “${n}” แล้วกลับเป็น KINZEN`,
    drawing_s: "ภาพวาดของคุณ แล้วกลับเป็น KINZEN",
    stage: "ลานอนุภาคสีทอง",
  },
};

const pathOf = (s: Pt[]) =>
  s.length ? s.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") : "";

export default function ParticlePlayground({ locale }: { locale: Locale }) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<SVGPathElement>(null);
  const fieldRef = useRef<Field | null>(null);
  const fontRef = useRef("sans-serif");
  const [mode, setMode] = useState<"type" | "draw">("type");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ shape: "home" | "text" | "drawing"; text: string }>({
    shape: "home",
    text: "",
  });
  const [inked, setInked] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    let dead = false;
    const family = getComputedStyle(root).fontFamily || "sans-serif";
    fontRef.current = family;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Fonts first, so the very first sample uses the site face (Thai faces load per glyph range).
    document.fonts
      .load(`600 64px ${family}`, "KINZEN กขค")
      .catch(() => undefined)
      .then(() => {
        if (dead) return;
        const field = createField(canvas, {
          reduced,
          gold: [...readPalette(root).glow],
          font: family,
          onShape: (shape) => setStatus((s) => ({ ...s, shape })),
          onStroke: (done, current) => {
            const d = [...done, current].map(pathOf).join(" ");
            inkRef.current?.setAttribute("d", d);
            setInked(d.trim().length > 0);
          },
        });
        fieldRef.current = field;
        root.dataset.ready = field.webgl ? "webgl" : "2d";
        root.dataset.count = String(field.count);
      });
    return () => {
      dead = true;
      fieldRef.current?.destroy();
      fieldRef.current = null;
    };
  }, []);

  // Typing forms the name after a short pause (every keystroke would restart the flight).
  useEffect(() => {
    if (mode !== "type") return;
    const text = name.trim();
    const id = window.setTimeout(() => {
      document.fonts
        .load(`600 64px ${fontRef.current}`, text || "K")
        .catch(() => undefined)
        .then(() => {
          fieldRef.current?.setText(text);
          setStatus({ shape: text ? "text" : "home", text });
        });
    }, 320);
    return () => window.clearTimeout(id);
  }, [name, mode]);

  const pickMode = (next: "type" | "draw") => {
    setMode(next);
    fieldRef.current?.setDrawMode(next === "draw");
  };

  const statusText =
    status.shape === "text" && status.text ? c.text_s(status.text) : status.shape === "drawing" ? c.drawing_s : c.home_s;

  return (
    <section ref={rootRef} className="ppg shell" aria-labelledby="ppg-title">
      <header className="ppg-head">
        <p className="ppg-kicker">
          <i aria-hidden="true" />
          {nobr(c.kicker)}
        </p>
        <h2 id="ppg-title" className="ppg-title">
          {nobr(c.title)}
        </h2>
        <p className="ppg-lede">{nobr(c.lede)}</p>
      </header>

      <div className="ppg-card scene-card" data-scene="dark" data-mode={mode}>
        <div className="ppg-controls">
          <div className="ppg-seg" role="group" aria-label={c.mode}>
            <button type="button" aria-pressed={mode === "type"} onClick={() => pickMode("type")}>
              {c.type}
            </button>
            <button type="button" aria-pressed={mode === "draw"} onClick={() => pickMode("draw")}>
              {c.draw}
            </button>
          </div>
          {mode === "type" ? (
            <form
              className="ppg-form"
              onSubmit={(e) => {
                e.preventDefault();
                const text = name.trim();
                fieldRef.current?.setText(text);
                setStatus({ shape: text ? "text" : "home", text });
              }}
            >
              <label className="sr-only" htmlFor="ppg-name">
                {c.label}
              </label>
              <input
                id="ppg-name"
                className="ppg-input"
                value={name}
                maxLength={24}
                autoComplete="off"
                spellCheck={false}
                placeholder={c.placeholder}
                onChange={(e) => setName(e.target.value)}
              />
            </form>
          ) : (
            <button
              type="button"
              className="ppg-btn"
              onClick={() => fieldRef.current?.clearDrawing()}
              disabled={!inked}
            >
              {c.clear}
            </button>
          )}
          <button
            type="button"
            className="ppg-btn"
            onClick={() => {
              setName("");
              fieldRef.current?.home();
              setStatus({ shape: "home", text: "" });
            }}
          >
            {c.home}
          </button>
        </div>

        <div className="ppg-stage">
          <canvas ref={canvasRef} className="ppg-canvas" role="img" aria-label={c.stage} />
          <svg className="ppg-ink" aria-hidden="true">
            <path ref={inkRef} />
          </svg>
          {mode === "draw" && !inked ? (
            <p className="ppg-hint" aria-hidden="true">
              {nobr(c.drawHere)}
            </p>
          ) : null}
          <p className="ppg-status readout" aria-live="polite">
            {statusText}
          </p>
        </div>
      </div>
    </section>
  );
}
