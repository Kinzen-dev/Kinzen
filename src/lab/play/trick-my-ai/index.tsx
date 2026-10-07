"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { nobr } from "@/lib/thai-nodes";
import { PlayFrame, useReducedMotion } from "./frame";
import { judge, repair, repairedText, RULES, type Verdict } from "./rules";
import "./trick-my-ai.css";

const COPY = {
  en: {
    eyebrow: "Lab · interactive",
    title: "Trick my AI",
    instruction:
      "Write the clinic's reply yourself and try to slip a diagnosis, a dose, a cure promise or hype past the guard.",
    note: "Simplified illustration of the approach: a few phrase lists and patterns in English and Thai, running in your browser. Not the production rule set, and nothing you type leaves this page.",
    patientLabel: "Patient · LINE (fictional)",
    patient: "My back tooth hurts when I drink something cold. What should I do?",
    editorLabel: "Your reply, as the clinic's AI",
    placeholder: "Type a reply…",
    tryLabel: "Try this",
    tries: [
      { label: "Diagnose + dose", text: "Sounds like a cavity. Take 400 mg ibuprofen every 6 hours and it will settle." },
      { label: "Cure promise", text: "Our sensitivity treatment cures it 100%, guaranteed. Painless too!" },
      { label: "Hype", text: "We're the best clinic in Bangkok, and you're a perfect candidate for implants." },
    ],
    send: "Send to patient",
    clear: "Clear",
    meter: "Guard meter",
    pass: "Pass",
    block: "Blocked",
    idle: "Waiting",
    flagged: (n: number) => (n === 1 ? "1 phrase flagged" : `${n} phrases flagged`),
    checks: "Checks",
    fixTitle: "How the guard would fix it",
    fixIdle: "Type a reply to see the guard work.",
    fixClean: "Nothing to fix: this reply passes every check.",
    sentPass: "Sent. Passed all 5 checks.",
    sentBlocked: "Blocked by the guard",
    sentInstead: "Sent instead, after the guard's fix",
    announcePass: "The reply passes every check.",
    announceBlock: (rules: string) => `Blocked. Rules broken: ${rules}.`,
  },
  th: {
    eyebrow: "ห้องทดลอง · ลองเล่น",
    title: "ลองหลอก AI ของผมดู",
    instruction:
      "พิมพ์คำตอบแทน AI ของคลินิกเอง แล้วลองแอบใส่คำวินิจฉัย ขนาดยา คำสัญญาว่ารักษาหาย หรือคำโฆษณาเกินจริง ดูว่าผ่านชุดตรวจได้ไหม",
    note: "ตัวอย่างแบบย่อของแนวทางนี้: ชุดคำและรูปแบบข้อความภาษาไทยและอังกฤษไม่กี่ชุด ทำงานในเบราว์เซอร์ของคุณ ไม่ใช่ชุดกฎที่ใช้งานจริง และข้อความที่พิมพ์ไม่ถูกส่งออกจากหน้านี้",
    patientLabel: "คนไข้ · LINE (สมมติ)",
    patient: "ฟันกรามเสียวเวลากินของเย็นครับ ควรทำยังไงดีครับ",
    editorLabel: "คำตอบของคุณ ในฐานะ AI ของคลินิก",
    placeholder: "พิมพ์คำตอบ…",
    tryLabel: "ลองอันนี้",
    tries: [
      { label: "วินิจฉัย + ขนาดยา", text: "น่าจะเป็นฟันผุค่ะ กินยาไอบูโพรเฟน 400 มก. ทุก 6 ชั่วโมงก็ดีขึ้นค่ะ" },
      { label: "สัญญาว่าหาย", text: "รักษาอาการเสียวฟันหายขาด 100% รับประกันผล ไม่เจ็บเลยค่ะ" },
      { label: "โฆษณาเกินจริง", text: "คลินิกเราดีที่สุดในกรุงเทพฯ และคุณเหมาะกับการทำรากเทียมแน่นอนค่ะ" },
    ],
    send: "ส่งให้คนไข้",
    clear: "ล้าง",
    meter: "มาตรวัดความเสี่ยง",
    pass: "ผ่าน",
    block: "ถูกบล็อก",
    idle: "รอคำตอบ",
    flagged: (n: number) => `เจอ ${n} จุด`,
    checks: "รายการตรวจ",
    fixTitle: "ชุดตรวจจะแก้แบบนี้",
    fixIdle: "พิมพ์คำตอบเพื่อดูชุดตรวจทำงาน",
    fixClean: "ไม่มีอะไรต้องแก้ คำตอบนี้ผ่านทุกข้อ",
    sentPass: "ส่งแล้ว ผ่านการตรวจครบ 5 ข้อ",
    sentBlocked: "ชุดตรวจบล็อกไว้",
    sentInstead: "ส่งฉบับที่ชุดตรวจแก้แล้วแทน",
    announcePass: "คำตอบนี้ผ่านทุกข้อ",
    announceBlock: (rules: string) => `ถูกบล็อก กฎที่ไม่ผ่าน: ${rules}`,
  },
} as const;

const graphemes = (s: string) => {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return [...seg.segment(s)].map((g) => g.segment);
};

/** The text with every hit wrapped in a mark (drawn behind the transparent textarea). */
function mirror(text: string, verdict: Verdict): ReactNode[] {
  const out: ReactNode[] = [];
  const seen = new Map<string, number>();
  let at = 0;
  for (const h of verdict.hits) {
    if (h.start > at) out.push(text.slice(at, h.start));
    // Keyed by rule and phrase (not offset), so typing earlier in the text does not replay the sweep.
    const base = `${h.rule}:${h.text.toLowerCase()}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push(
      <mark key={`${base}:${n}`} data-rule={h.rule} data-tag={h.rule}>
        {h.text}
      </mark>,
    );
    at = h.end;
  }
  out.push(text.slice(at) + " ");
  return out;
}

type Sent = { draft: string; verdict: Verdict; fixed: string; key: number };

export default function TrickMyAi({ locale }: { locale: Locale }) {
  const c = COPY[locale];
  const reduced = useReducedMotion();
  const inputId = useId();
  const statusId = useId();
  const [text, setText] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const typer = useRef<number | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const verdict = useMemo(() => judge(text), [text]);
  const parts = useMemo(() => repair(text, verdict), [text, verdict]);
  const empty = text.trim() === "";
  const state = empty ? "idle" : verdict.pass ? "pass" : "block";

  // A rule tag that would run past the editor's right edge opens to the left instead.
  useLayoutEffect(() => {
    const box = mirrorRef.current;
    if (!box) return;
    const right = box.getBoundingClientRect().right - 8;
    for (const m of box.querySelectorAll<HTMLElement>("mark")) {
      const r = m.getClientRects();
      const first = r[0];
      if (!first) continue;
      const tag = (m.dataset.tag?.length ?? 0) * 6.2 + 12;
      m.toggleAttribute("data-flip", first.left + tag > right);
    }
  }, [text]);

  const stopTyping = () => {
    if (typer.current !== null) window.clearInterval(typer.current);
    typer.current = null;
  };
  useEffect(() => stopTyping, []);

  /** A "try this" prompt types itself in (all at once under reduced motion). */
  const typeIn = (value: string) => {
    stopTyping();
    setSent(null);
    if (reduced) {
      setText(value);
      return;
    }
    const chars = graphemes(value);
    let i = 0;
    setText("");
    typer.current = window.setInterval(() => {
      i = Math.min(chars.length, i + 2);
      setText(chars.slice(0, i).join(""));
      if (i >= chars.length) stopTyping();
    }, 34);
  };

  const send = () => {
    if (empty) return;
    stopTyping();
    setSent({ draft: text, verdict, fixed: repairedText(parts), key: Date.now() });
  };

  const announce = empty
    ? ""
    : verdict.pass
      ? c.announcePass
      : c.announceBlock(verdict.fired.join(", "));

  return (
    <PlayFrame eyebrow={c.eyebrow} title={c.title} instruction={c.instruction} note={c.note}>
      <div className="tm" data-state={state}>
        <div className="tm-main">
          <div className="tm-thread">
            <div className="tm-bubble tm-patient">
              <span className="pa-label">{nobr(c.patientLabel)}</span>
              <p>{nobr(c.patient)}</p>
            </div>
            {sent && (
              <div className="tm-sent" key={sent.key} data-pass={sent.verdict.pass} role="status">
                {sent.verdict.pass ? (
                  <div className="tm-bubble tm-out">
                    <p>{sent.draft}</p>
                    <span className="tm-sent-note tm-ok">✓ {nobr(c.sentPass)}</span>
                  </div>
                ) : (
                  <>
                    <div className="tm-bubble tm-out tm-bounced">
                      <p>{sent.draft}</p>
                      <span className="tm-sent-note tm-bad">
                        ✕ {nobr(c.sentBlocked)}: <code>{sent.verdict.fired.join(", ")}</code>
                      </span>
                    </div>
                    <div className="tm-bubble tm-out tm-instead">
                      <p>{sent.fixed}</p>
                      <span className="tm-sent-note tm-ok">✓ {nobr(c.sentInstead)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <label className="pa-label tm-editor-label" htmlFor={inputId}>
            {nobr(c.editorLabel)}
          </label>
          <div className="tm-editor">
            <div className="tm-mirror" aria-hidden="true" ref={mirrorRef}>
              {mirror(text, verdict)}
            </div>
            <textarea
              id={inputId}
              ref={area}
              className="tm-input"
              value={text}
              placeholder={c.placeholder}
              spellCheck={false}
              aria-describedby={statusId}
              onChange={(e) => {
                stopTyping();
                setText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
            />
          </div>

          <div className="tm-mini" aria-hidden="true">
            <span key={state} className="tm-verdict" data-state={state}>
              {state === "idle" ? nobr(c.idle) : state === "pass" ? `✓ ${c.pass}` : `✕ ${c.block}`}
            </span>
            <div className="tm-meter" style={{ "--v": verdict.score / 100 } as CSSProperties}>
              <i className="tm-meter-cover" />
              <i className="tm-meter-needle" />
            </div>
            <span className="readout tabular">{verdict.score}</span>
          </div>

          <div className="tm-try">
            <span className="pa-label">{nobr(c.tryLabel)}</span>
            {c.tries.map((t) => (
              <button key={t.label} type="button" className="pa-chip" onClick={() => typeIn(t.text)}>
                {nobr(t.label)}
              </button>
            ))}
          </div>
          <div className="tm-actions">
            <button type="button" className="pa-btn" data-primary="" onClick={send} disabled={empty}>
              {nobr(c.send)}
            </button>
            <button
              type="button"
              className="pa-btn"
              disabled={empty && !sent}
              onClick={() => {
                stopTyping();
                setText("");
                setSent(null);
                area.current?.focus();
              }}
            >
              {nobr(c.clear)}
            </button>
          </div>
        </div>

        <aside className="tm-guard" aria-label={c.meter}>
          <div className="tm-meter-head">
            <span className="pa-label">{nobr(c.meter)}</span>
            <span key={state} className="tm-verdict" data-state={state}>
              {state === "idle" ? nobr(c.idle) : state === "pass" ? `✓ ${c.pass}` : `✕ ${c.block}`}
            </span>
          </div>
          <div className="tm-meter" style={{ "--v": verdict.score / 100 } as CSSProperties} aria-hidden="true">
            <i className="tm-meter-cover" />
            <i className="tm-meter-needle" />
          </div>
          <p className="tm-score readout">
            <span className="tabular">{String(verdict.score).padStart(3, " ")}</span> / 100
            {!empty && !verdict.pass && <span> · {nobr(c.flagged(verdict.hits.length))}</span>}
          </p>
          <p id={statusId} className="sr-only-focusable" aria-live="polite">
            {announce}
          </p>

          <span className="pa-label">{nobr(c.checks)}</span>
          <ul className="tm-checks">
            {RULES.map((r) => {
              const bad = verdict.fired.includes(r.id);
              return (
                <li key={r.id} data-bad={bad} data-rule={r.id}>
                  <span className="tm-check-icon" aria-hidden="true">
                    {bad ? "✕" : "✓"}
                  </span>
                  <code>{r.id}</code>
                  <span className="tm-check-label">{nobr(r.label[locale])}</span>
                </li>
              );
            })}
          </ul>

          <div className="tm-fix">
            <span className="pa-label">{nobr(c.fixTitle)}</span>
            <p className="tm-fix-body" key={verdict.fired.join("|")}>
              {empty
                ? nobr(c.fixIdle)
                : verdict.pass
                  ? nobr(c.fixClean)
                  : parts.map((p, i) =>
                      p.kind === "drop" ? (
                        <del key={i}>{p.text} </del>
                      ) : p.kind === "add" ? (
                        <ins key={i}>{p.text} </ins>
                      ) : (
                        <span key={i}>{p.text} </span>
                      ),
                    )}
            </p>
          </div>
        </aside>
      </div>
    </PlayFrame>
  );
}
