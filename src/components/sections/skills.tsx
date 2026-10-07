import type { Locale } from "@/content/schema";
import { skillItems, skills, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { getV3, type V3Copy } from "@/i18n/v3";
import { Marquee } from "@/motion/marquee";
import { SectionHeader } from "./section-header";
import { inlineList } from "@/lib/text";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";
import "../v3/tools/tools.css";

/** Chip colour per skill group (area pastels; "plain" = paper with a rule). */
const GROUP_TINT: Record<string, string> = {
  backend: "pastel-tools",
  frontend: "pastel-games",
  "data-cloud": "plain",
  testing: "plain",
  integrations: "pastel-commerce",
  ai: "pastel-ai",
};
/** Which groups ride which marquee row (the rows run in opposite directions). */
const ROWS = [
  ["backend", "integrations", "data-cloud"],
  ["ai", "frontend", "testing"],
];

/** Round-robin through the groups so neighbouring chips change colour. */
function interleave(lists: { tint: string; label: string }[][]) {
  const out: { tint: string; label: string }[] = [];
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}

/**
 * Tools (v3): two marquee rows of the stack in pastel chips, running in opposite directions,
 * then the same stack grouped by job in compact cards. The marquees are decoration (the cards
 * carry the content for assistive tech); under reduced motion they become wrapped, still chips.
 */
export function Skills({ locale, dict, v3 = getV3(locale) }: { locale: Locale; dict: Dictionary; v3?: V3Copy }) {
  const byId = new Map(skills.map((g) => [g.id, g]));
  const rows = ROWS.map((ids) =>
    interleave(
      ids
        .map((id) => byId.get(id))
        .filter((g) => g !== undefined)
        .map((g) => skillItems(g, locale).map((label) => ({ tint: GROUP_TINT[g.id] ?? "plain", label }))),
    ),
  );

  return (
    <section id="skills" aria-labelledby="skills-title" className="pt-24 md:pt-32">
      <div className="shell">
        <SectionHeader id="skills" title={plain(dict.sections.skills)} intro={v3.tools.intro} />
      </div>

      <div aria-hidden="true" className="tools-marquees">
        {rows.map((row, i) => (
          <Marquee
            key={i}
            reverse={i % 2 === 1}
            seconds={i % 2 === 1 ? 62 : 54}
            className="tools-marquee"
            items={row.map((chip) => (
              <span key={chip.label} className={`tool-chip ${chip.tint === "plain" ? "tool-chip-plain" : chip.tint}`}>
                {nobr(chip.label)}
              </span>
            ))}
          />
        ))}
      </div>

      <div className="shell">
        <dl data-reveal-group className="tools-groups">
          {skills.map((group) => {
            const tint = GROUP_TINT[group.id] ?? "plain";
            return (
              <div key={group.id} className={`tools-card ${tint === "plain" ? "" : tint}`}>
                <dt className="flex items-center gap-2.5 font-semibold tracking-[-0.01em]">
                  <span aria-hidden="true" className={`tools-swatch ${tint === "plain" ? "tool-chip-plain" : ""}`} />
                  {nobr(t(group.label, locale))}
                </dt>
                <dd className="mt-3 text-ink-2">{inlineList(skillItems(group, locale))}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
