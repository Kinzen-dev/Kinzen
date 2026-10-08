import type { Locale } from "@/content/schema";
import { skillItems, skills, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { getV3, type V3Copy } from "@/i18n/v3";
import { SectionHeader } from "./section-header";
import { plain } from "@/lib/thai";
import { ToolMarkTap } from "@/components/tools/tool-mark-tap";
import { BentoMarkup } from "./tools/bento-loops/markup";
import { ToolsShowcase } from "./tools/showcase";
import type { GroupId, ToolGroup } from "./tools/types";

/** The skill groups as plain data for the client views: the English name picks the mark. */
function toolGroups(locale: Locale): ToolGroup[] {
  return skills.map((group) => {
    const labels = skillItems(group, locale);
    return {
      id: group.id as GroupId,
      label: t(group.label, locale),
      tools: group.items.map((item, i) => ({ key: typeof item === "string" ? item : item.en, label: labels[i] })),
    };
  });
}

/**
 * Tools (v4): one section, four switchable views of the same stack (King's pick from the lab):
 * a bento of looping mini demos, a logo wall with a spotlight, a logo orbit and a request
 * pipeline. The server renders the bento's finished frame (every group and tool name as real
 * text); each view's live version is its own lazy chunk.
 */
export function Skills({ locale, dict, v3 = getV3(locale) }: { locale: Locale; dict: Dictionary; v3?: V3Copy }) {
  const groups = toolGroups(locale);
  const { views, hints, switcher, showing } = v3.tools;
  return (
    <section id="skills" aria-labelledby="skills-title" className="overflow-x-clip pt-24 md:pt-32">
      <ToolMarkTap />
      <div className="shell">
        <SectionHeader id="skills" title={plain(dict.sections.skills)} intro={v3.tools.intro} />
        <ToolsShowcase locale={locale} groups={groups} copy={{ views, hints, switcher, showing }}>
          <BentoMarkup locale={locale} groups={groups} />
        </ToolsShowcase>
      </div>
    </section>
  );
}
