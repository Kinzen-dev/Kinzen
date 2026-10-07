import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import type { V3Copy } from "@/i18n/v3";
import { Odometer } from "@/motion/odometer";
import { nobr } from "@/lib/thai-nodes";
import { numberFacts } from "./facts";
import "./numbers.css";

/** One pastel per card, in reading order (decorative grounds, not area claims). */
const PASTEL = {
  production: "pastel-games",
  techLead: "pastel-commerce",
  replayed: "pastel-ai",
  caught: "pastel-tools",
};

/**
 * Numbers strip (ticket v3-03): a light scene right after the hero. Four facts already in content,
 * each a rounded pastel card whose figure rolls in on an odometer when it scrolls into view. The
 * number is real text (the odometer's columns are decorative), so the card reads as one sentence:
 * "7 years building production systems, since 2019".
 */
export function NumbersStrip({ v3 }: { locale: Locale; dict: Dictionary; v3: V3Copy }) {
  const copy = v3.numbers;
  const facts = numberFacts(new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-10-06"));
  return (
    <section aria-labelledby="numbers-title" className="numbers" data-numbers>
      <div className="shell">
        <h2 id="numbers-title" className="sr-only">
          {nobr(copy.title)}
        </h2>
        <ul className="numbers-grid" data-reveal-group>
          {facts.map((f) => (
            <li key={f.key} className={`numbers-card ${PASTEL[f.key]}`}>
              <p className="numbers-note readout">{nobr(copy[f.key].note)}</p>
              <p className="numbers-value">
                <Odometer value={f.value} />
              </p>
              <p className="numbers-label">{nobr(copy[f.key].label)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
