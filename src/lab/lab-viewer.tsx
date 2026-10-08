"use client";

import { createElement, lazy, Suspense, useEffect, useState } from "react";
import type { Locale } from "@/content/schema";
import type { LabBanner, LabDemo } from "./types";
import { demos as heroA } from "./hero/registry-a";
import { demos as heroB } from "./hero/registry-b";
import { demos as playA } from "./play/registry-a";
import { demos as playB } from "./play/registry-b";
import { demos as toolsA } from "./tools/registry-a";
import { demos as toolsB } from "./tools/registry-b";
import { demos as numbersA } from "./numbers/registry-a";
import { demos as numbersB } from "./numbers/registry-b";
import { demos as concepts } from "./concepts/registry";
import { demos as ixA } from "./interactive/registry-a";
import { demos as ixB } from "./interactive/registry-b";
import { demos as ixC } from "./interactive/registry-c";
import "./lab.css";

type Kind = "hero" | "play" | "tools" | "numbers" | "concepts" | "interactive";
const SETS: Record<Kind, LabDemo[]> = {
  hero: [...heroA, ...heroB],
  play: [...playA, ...playB],
  tools: [...toolsA, ...toolsB],
  numbers: [...numbersA, ...numbersB],
  concepts,
  interactive: [...ixA, ...ixB, ...ixC],
};
// Built once at module scope (never during render): one lazy chunk per demo.
const VIEWS = new Map([...SETS.hero, ...SETS.play, ...SETS.tools, ...SETS.numbers, ...SETS.concepts, ...SETS.interactive].map((d) => [d.id, lazy(d.load)]));

/** Lab switcher: one demo at a time (hash = demo id), a bar to move between them. */
export function LabViewer({ kind, locale, banner }: { kind: Kind; locale: Locale; banner: LabBanner }) {
  const list = SETS[kind];
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setId(window.location.hash.slice(1) || list[0]?.id || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [list]);
  const index = Math.max(0, list.findIndex((d) => d.id === id));
  const demo = list[index];
  const View = demo ? VIEWS.get(demo.id) : undefined;
  const go = (i: number) => {
    const next = list[(i + list.length) % list.length];
    if (next) window.location.hash = next.id;
  };

  if (!demo || !View) return <p className="shell py-24 text-ink-2">No demos yet.</p>;
  return (
    <div className="lab">
      <div className="lab-stage" key={demo.id}>
        <Suspense fallback={<div className="lab-loading">Loading {demo.title}…</div>}>
          {/* A lookup into module-scope lazies, not a component made during render. */}
          {createElement(View, { locale, banner })}
        </Suspense>
      </div>
      <nav className="lab-bar" aria-label="Lab demos">
        <button type="button" onClick={() => go(index - 1)} aria-label="Previous demo">
          ←
        </button>
        <div className="lab-bar-text">
          <strong>
            {index + 1}/{list.length} · {demo.title}
          </strong>
          <span>{demo.idea}</span>
          <span className="lab-tech">{demo.technique}</span>
        </div>
        <button type="button" onClick={() => go(index + 1)} aria-label="Next demo">
          →
        </button>
        <ol className="lab-dots">
          {list.map((d, i) => (
            <li key={d.id}>
              <a href={`#${d.id}`} aria-current={i === index ? "true" : undefined} title={d.title}>
                {i + 1}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
