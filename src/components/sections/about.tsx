import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { education, languages, personal, profile, t, tList } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { SectionHeader } from "./section-header";
import { plain } from "@/lib/thai";

export function About({ locale, dict, offClockArt }: { locale: Locale; dict: Dictionary; offClockArt?: ReactNode }) {
  return (
    <section id="about" aria-labelledby="about-title" className="shell pt-24 md:pt-32">
      <SectionHeader id="about" title={plain(dict.sections.about)} />

      <div className="grid gap-12 md:grid-cols-12 md:gap-6">
        <div className="grid gap-5 md:col-span-7">
          {tList(profile.bioLong, locale).map((para) => (
            <p key={para.slice(0, 24)} className="max-w-[60ch] text-lg">
              {para}
            </p>
          ))}
        </div>

        <aside className="grid content-start gap-8 md:col-span-4 md:col-start-9">
          <div>
            <h3 className="readout">{dict.sections.education}</h3>
            {education.map((e) => (
              <p key={e.school.en} className="mt-2">
                {t(e.degree, locale)}
                <span className="block text-ink-2">
                  {t(e.school, locale)}, {e.start} → {e.end}
                </span>
              </p>
            ))}
          </div>
          <div>
            <h3 className="readout">{dict.sections.languages}</h3>
            <ul className="mt-2">
              {languages.map((l) => (
                <li key={l.name.en}>
                  {t(l.name, locale)} <span className="text-ink-2">({t(l.level, locale)})</span>
                </li>
              ))}
            </ul>
          </div>
          {personal.length > 0 ? (
            <div>
              <h3 className="readout">{dict.sections.offTheClock}</h3>
              {offClockArt ? <div className="mt-3 flex gap-4 text-ink">{offClockArt}</div> : null}
              {personal.map((line) => (
                <p key={line.en} className="mt-2 text-ink-2">
                  {t(line, locale)}
                </p>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
