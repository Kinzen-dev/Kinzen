import { Fragment } from "react";
import type { Locale, SkillGroup } from "@/content/schema";
import { skillItems, skills, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { getV3, type V3Copy } from "@/i18n/v3";
import { Marquee } from "@/motion/marquee";
import { MarqueeGroup } from "@/motion/marquee-group";
import { SectionHeader } from "./section-header";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";
import { ToolMark } from "@/components/tools/tool-mark";
import { ToolMarkTap } from "@/components/tools/tool-mark-tap";
import "../v3/tools/tools.css";

/** Dot colour before each group title (area pastels; "plain" = paper with a rule). */
const GROUP_TINT: Record<string, string> = {
  backend: "pastel-tools",
  frontend: "pastel-games",
  "data-cloud": "plain",
  testing: "plain",
  integrations: "pastel-commerce",
  ai: "pastel-ai",
};
/** The marquee pause control (audit TECH-11 wording, TH per the audit's suggestion). */
const MOTION_LABELS: Record<Locale, { pause: string; resume: string }> = {
  en: { pause: "Pause motion", resume: "Resume motion" },
  th: { pause: "หยุดภาพเคลื่อนไหว", resume: "เล่นภาพเคลื่อนไหวต่อ" },
};
/** Which groups ride which marquee row (the rows run in opposite directions). */
const ROWS = [
  ["backend", "integrations", "data-cloud"],
  ["ai", "frontend", "testing"],
];

type Tool = { key: string; label: string };

/** A group's tools: the English name picks the mark, the label is what the reader sees. */
function tools(group: SkillGroup, locale: Locale): Tool[] {
  const labels = skillItems(group, locale);
  return group.items.map((item, i) => ({ key: typeof item === "string" ? item : item.en, label: labels[i] }));
}

/** Round-robin through the groups so neighbouring chips come from different jobs. */
function interleave(lists: Tool[][]) {
  const out: Tool[] = [];
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}

/**
 * A tool's name that only breaks at spaces: short names stay whole, and a hyphenated word
 * ("speech-to-text", "event-driven") never breaks at its hyphens.
 */
function toolLabel(label: string) {
  if (label.length <= 20) return <span className="whitespace-nowrap">{nobr(label)}</span>;
  return label
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
}

/** A group's tools as a wrapped list of mark + name. */
function toolList(items: Tool[]) {
  return (
    <ul className="tools-list">
      {items.map((item) => (
        <li key={item.key} data-tool-host>
          <ToolMark name={item.key} />
          <span>{toolLabel(item.label)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tools (v3): two marquee rows of the stack as brand-mark chips on the plain surface, running in
 * opposite directions, then the same stack grouped by job in compact cards. The marquees are decoration (the cards
 * carry the content for assistive tech) with a visible pause button; under reduced motion they
 * become wrapped, still chips.
 */
export function Skills({ locale, dict, v3 = getV3(locale) }: { locale: Locale; dict: Dictionary; v3?: V3Copy }) {
  const byId = new Map(skills.map((g) => [g.id, g]));
  const rows = ROWS.map((ids) =>
    interleave(
      ids
        .map((id) => byId.get(id))
        .filter((g) => g !== undefined)
        .map((g) => tools(g, locale)),
    ),
  );

  return (
    <section id="skills" aria-labelledby="skills-title" className="pt-24 md:pt-32">
      <ToolMarkTap />
      <div className="shell">
        <SectionHeader id="skills" title={plain(dict.sections.skills)} intro={v3.tools.intro} />
      </div>

      <MarqueeGroup
        className="tools-marquees"
        labels={{ pause: nobr(MOTION_LABELS[locale].pause), resume: nobr(MOTION_LABELS[locale].resume) }}
      >
        {rows.map((row, i) => (
          <Marquee
            key={i}
            reverse={i % 2 === 1}
            seconds={i % 2 === 1 ? 62 : 54}
            className="tools-marquee"
            items={row.map((tool) => (
              <span key={tool.key} className="tool-chip" data-tool-host>
                <ToolMark name={tool.key} />
                <span>{toolLabel(tool.label)}</span>
              </span>
            ))}
          />
        ))}
      </MarqueeGroup>

      <div className="shell">
        <dl data-reveal-group className="tools-groups">
          {skills.map((group) => {
            const tint = GROUP_TINT[group.id] ?? "plain";
            return (
              <div key={group.id} className={`tools-card ${tint === "plain" ? "" : tint}`}>
                <dt className="flex items-center gap-2.5 font-semibold tracking-[-0.01em]">
                  <span aria-hidden="true" className={`tools-swatch ${tint === "plain" ? "tools-swatch-plain" : ""}`} />
                  {nobr(t(group.label, locale))}
                </dt>
                <dd className="mt-3.5 text-ink-2">{toolList(tools(group, locale))}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
