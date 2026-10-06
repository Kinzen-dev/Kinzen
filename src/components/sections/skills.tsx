import type { Locale } from "@/content/schema";
import { skillItems, skills, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { inlineList } from "@/lib/text";

export function Skills({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section id="skills" aria-labelledby="skills-title" className="shell pt-20 md:pt-28">
      <h2 id="skills-title" className="border-t border-rule-strong pt-5 pb-10 text-2xl tracking-[-0.045em] md:pb-14">
        {dict.sections.skills}
      </h2>
      <dl className="grid border-t border-l border-rule sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((group) => (
          <div key={group.id} className="border-r border-b border-rule p-6 md:p-8">
            <dt className="font-semibold tracking-[-0.01em]">{t(group.label, locale)}</dt>
            <dd className="mt-3 text-ink-2">{inlineList(skillItems(group, locale))}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
