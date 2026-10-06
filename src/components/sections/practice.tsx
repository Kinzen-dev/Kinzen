import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { practices, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { SectionHeader } from "./section-header";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";

/** How King works with AI agents. `demo` is the interactive guard illustration. */
export function Practice({
  locale,
  dict,
  demo,
  icons,
}: {
  locale: Locale;
  dict: Dictionary;
  demo?: ReactNode;
  icons?: Partial<Record<string, ReactNode>>;
}) {
  return (
    <section id="practice" aria-labelledby="practice-title" className="shell pt-24 md:pt-32">
      <SectionHeader id="practice" title={plain(dict.sections.practice)} intro={dict.sections.practiceIntro} />

      <ul data-reveal-group className="grid border-t border-l border-rule md:grid-cols-3">
        {practices.map((p) => (
          <li key={p.id} className="grid content-start gap-3 border-r border-b border-rule p-6 md:p-8">
            {icons?.[p.id] ? <div className="mb-2 size-16 text-ink">{icons[p.id]}</div> : null}
            <h3 className="text-lg tracking-[-0.02em]">{nobr(t(p.title, locale))}</h3>
            <p className="text-ink-2">{nobr(t(p.text, locale))}</p>
          </li>
        ))}
      </ul>

      {demo ? <div className="mt-12 md:mt-16">{demo}</div> : null}
    </section>
  );
}
