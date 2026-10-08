import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import type { V3Copy } from "@/i18n/v3";
import { nobr } from "@/lib/thai-nodes";
import { NumbersShowcase } from "./showcase";
import { FlapBoard } from "./split-flap/markup";
import "./numbers.css";

/**
 * Numbers (v4): one section, the same four stats shown five ways (King's picks from the lab):
 * a split-flap board, honest pictures to scale, a story, gold dust and editorial print, behind a
 * quiet switcher that moves on by itself while nobody holds it. The server renders the board
 * finished (every figure and caption as real text); each view's live version is its own chunk.
 */
export function NumbersStrip({ locale, v3 }: { locale: Locale; dict: Dictionary; v3: V3Copy }) {
  const copy = v3.numbers;
  return (
    <section aria-labelledby="numbers-title" className="numbers" data-numbers>
      <div className="shell">
        <h2 id="numbers-title" className="numbers-title">
          {nobr(copy.title)}
        </h2>
        <NumbersShowcase locale={locale} copy={copy}>
          <FlapBoard locale={locale} copy={copy} />
        </NumbersShowcase>
      </div>
    </section>
  );
}
