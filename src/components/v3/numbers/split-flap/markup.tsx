import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { STAT_KEYS, type NumbersCopy } from "@/i18n/v3/numbers";
import { nobr } from "@/lib/thai-nodes";
import "./flap.css";

/**
 * The split-flap board as plain markup (no hooks): the server renders it as the section's first,
 * complete view, and the live view (./index.tsx) renders the same tree and drives the flaps.
 * Every figure is set right-aligned in six flaps (the second is a narrow one for the thousands
 * comma), so the four figures share one column like a departures board.
 */
export const SLOTS = 6;
/** The narrow slot (holds the comma of 6,000+, blank on every other row). */
export const NARROW = 1;
export const BLANK = " ";

export function padFigure(fig: string, slots = SLOTS): string[] {
  const chars = [...fig];
  return [...Array(Math.max(0, slots - chars.length)).fill(BLANK), ...chars];
}

/** One flap: static top and bottom halves, two hinged leaves that carry the flip. */
export function Tile({ ch, narrow, small }: { ch: string; narrow?: boolean; small?: boolean }) {
  const cls = ["sf-tile", narrow ? "sf-tile-narrow" : "", small ? "sf-tile-sm" : ""].filter(Boolean).join(" ");
  return (
    <span className={cls} data-target={ch} data-narrow={narrow ? "" : undefined} data-blank={ch === BLANK ? "" : undefined}>
      <span className="sf-half sf-top">
        <span className="sf-g">{ch}</span>
      </span>
      <span className="sf-half sf-bot">
        <span className="sf-g">{ch}</span>
      </span>
      <span className="sf-leaf sf-leaf-top">
        <span className="sf-g">{ch}</span>
        <span className="sf-shade" />
      </span>
      <span className="sf-leaf sf-leaf-bot">
        <span className="sf-g">{ch}</span>
        <span className="sf-shade" />
      </span>
    </span>
  );
}

function Flaps({ fig, slots = SLOTS, small }: { fig: string; slots?: number; small?: boolean }) {
  return (
    <p className={small ? "sf-fig sf-fig-sm" : "sf-fig"}>
      <span className="sr-only">{fig}</span>
      <span className="sf-tiles" aria-hidden="true">
        {padFigure(fig, slots).map((ch, i) => (
          <Tile key={i} ch={ch} narrow={slots === SLOTS && i === NARROW} small={small} />
        ))}
      </span>
    </p>
  );
}

const graphemes =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;
const thaiWords =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("th", { granularity: "word" }) : null;

/**
 * Copy that can "type in": the nobr() text with every unit in its own inline span carrying `--i`.
 * English types per grapheme; Thai per word (never per character: a leading vowel would detach
 * from its consonant). A parent animates `--shown`; CSS reveals each unit from it, so typing never
 * reflows the paragraph (the space is reserved from the first frame).
 */
function typed(text: string, locale: Locale): { node: ReactNode; count: number } {
  let i = 0;
  const seg = locale === "th" ? thaiWords : graphemes;
  const split = (s: string) => (seg ? [...seg.segment(s)].map((x) => x.segment) : [...s]);
  const walk = (n: ReactNode): ReactNode => {
    if (typeof n === "string")
      return split(n).map((g) => (
        <span key={i} className="tp-ch" style={{ ["--i" as string]: i++ }}>
          {g}
        </span>
      ));
    if (isValidElement(n)) {
      const el = n as ReactElement<{ children?: ReactNode }>;
      return cloneElement(el, undefined, ...Children.toArray(el.props.children).map(walk));
    }
    return n;
  };
  const node = <span className="tp">{walk(nobr(text))}</span>;
  return { node, count: i };
}

function Caption({ text, locale, className }: { text: string; locale: Locale; className: string }) {
  const t = typed(text, locale);
  return (
    <p className={`sf-type ${className}`} data-count={t.count}>
      {t.node}
    </p>
  );
}

export function FlapBoard({ locale, copy }: { locale: Locale; copy: NumbersCopy }) {
  const { stats, ui } = copy;
  const rp = stats.replay;
  return (
    <div className="sf" data-view-root="split-flap">
      <div className="sf-board" data-scene="dark">
        <div className="sf-cols" aria-hidden="true">
          <span>{nobr(ui.figure)}</span>
          <span>{nobr(ui.what)}</span>
          <span>{nobr(ui.context)}</span>
        </div>
        <ol className="sf-rows">
          {STAT_KEYS.filter((k) => k !== "replay").map((k) => {
            const s = stats[k as Exclude<typeof k, "replay">];
            return (
              <li key={k} className="sf-row" data-row={k}>
                <Flaps fig={s.figure} />
                <Caption text={s.label} locale={locale} className="sf-label" />
                <p className="sf-note">{nobr(s.note)}</p>
              </li>
            );
          })}
          <li className="sf-row sf-group" data-row="replay">
            <Flaps fig={rp.figure} />
            <Caption text={rp.label} locale={locale} className="sf-label" />
            <div className="sf-note sf-note-group">
              <p>{nobr(rp.note)}</p>
              <p className="sf-source">{nobr(rp.product)}</p>
            </div>
            <div className="sf-sub">
              <Flaps fig={rp.caught} slots={2} small />
              <Caption text={rp.caughtLabel} locale={locale} className="sf-label sf-label-sm" />
            </div>
            <div className="sf-passed">
              <span className="sf-check" aria-hidden="true">
                <Tile ch="✓" small />
              </span>
              <Caption text={rp.passed} locale={locale} className="sf-passed-text" />
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
