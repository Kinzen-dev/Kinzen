import type { Locale } from "@/content/schema";
import { experience, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { SectionHeader } from "./section-header";

function monthYear(value: string, locale: Locale) {
  const [y, m] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-gregory" : "en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(y, m - 1, 1));
}

export function Experience({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section id="experience" aria-labelledby="experience-title" className="shell pt-24 md:pt-32">
      <SectionHeader id="experience" title={dict.sections.experience} />

      <ol data-era-list className="relative">
        {experience.map((era) => {
          const end = era.end === "present" ? dict.experience.present : monthYear(era.end, locale);
          return (
            <li
              key={era.id}
              data-era
              className="grid gap-6 border-t border-rule py-10 md:grid-cols-12 md:gap-6 md:py-14"
            >
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
    </section>
  );
}
