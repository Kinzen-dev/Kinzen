import type { Locale } from "@/content/schema";
import { experience, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { EraThread } from "../timeline/era-thread";
import { monthYear } from "../timeline/format";
import { SectionHeader } from "./section-header";

export function Experience({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section id="experience" aria-labelledby="experience-title" className="shell pt-24 md:pt-32">
      <SectionHeader id="experience" title={dict.sections.experience} />

      <div data-era-timeline className="era-timeline">
        <ol data-era-list>
          {experience.map((era) => {
            const end = era.end === "present" ? dict.experience.present : monthYear(era.end, locale);
            return (
              <li
                key={era.id}
                data-era
                className="relative grid gap-6 border-t border-rule py-10 md:grid-cols-12 md:gap-6 md:py-14"
              >
                <span data-era-node aria-hidden="true" className="era-node" />
                <div className="md:sticky md:top-[calc(var(--header-h)+1.5rem)] md:col-span-4 md:self-start">
                  <p className="readout">
                    {monthYear(era.start, locale)} → {end}
                  </p>
                  <h3 className="mt-3 text-xl tracking-[-0.035em]">{era.org.name}</h3>
                  <p className="mt-1 text-ink-2">{t(era.title, locale)}</p>
                </div>
                <div className="md:col-span-7 md:col-start-6">
                  <p className="max-w-[52ch] text-lg">{t(era.summary, locale)}</p>
                  <ul className="mt-6 grid gap-3">
                    {era.highlights.map((h) => (
                      <li
                        key={h.provenance.claimId + h.text.en.slice(0, 16)}
                        className="flex max-w-[64ch] gap-3 text-ink-2"
                      >
                        <span aria-hidden="true" className="mt-[0.7em] h-px w-3 shrink-0 bg-ink-3" />
                        <span>{t(h.text, locale)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="readout mt-6">
                    <span className="sr-only">{dict.experience.stack}: </span>
                    {era.stack.join(", ")}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <EraThread />
      </div>
    </section>
  );
}
