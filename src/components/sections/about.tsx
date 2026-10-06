import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { education, languages, personal, profile, t, tList } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { Art, type ArtName } from "../art/art";
import { SectionHeader } from "./section-header";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";
import "./about.css";

/**
 * The portrait slot (D7). Until King's portrait illustration arrives this is the workbench scene;
 * when the portrait-* art lands in the manifest, swap this one line to "portrait-wave".
 */
const PORTRAIT: ArtName = "scene-workbench";

export function About({ locale, dict, offClockArt }: { locale: Locale; dict: Dictionary; offClockArt?: ReactNode }) {
  return (
    <section id="about" aria-labelledby="about-title" className="shell pt-24 md:pt-32">
      <SectionHeader id="about" title={plain(dict.sections.about)} />

      <div className="grid gap-10 md:grid-cols-12 md:gap-6">
        <div aria-hidden="true" data-reveal className="about-portrait pastel-commerce md:col-span-5">
          <Art name={PORTRAIT} className="about-portrait-art" />
        </div>

        <div className="grid content-start gap-5 md:col-span-7 md:col-start-6 lg:col-span-6 lg:col-start-7">
          {tList(profile.bioLong, locale).map((para, i) => (
            <p key={para.slice(0, 24)} className={i === 0 ? "max-w-[60ch] text-xl tracking-[-0.02em]" : "max-w-[60ch] text-lg text-ink-2"}>
              {nobr(para)}
            </p>
          ))}
        </div>
      </div>

      <div data-reveal-group className="mt-12 grid gap-3 md:mt-16 md:grid-cols-12 md:gap-6">
        <div className="about-card md:col-span-7">
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
            <div>
              <h3 className="readout">{nobr(dict.sections.education)}</h3>
              {education.map((e) => (
                <p key={e.school.en} className="mt-3">
                  {nobr(t(e.degree, locale))}
                  <span className="mt-1 block text-ink-2">{nobr(t(e.school, locale))}</span>
                  <span className="readout mt-1 block">
                    {e.start} → {e.end}
                  </span>
                </p>
              ))}
            </div>
            <div>
              <h3 className="readout">{nobr(dict.sections.languages)}</h3>
              <ul className="mt-3 grid gap-2">
                {languages.map((l) => (
                  <li key={l.name.en}>
                    {nobr(t(l.name, locale))}
                    <span className="block text-ink-2">{nobr(t(l.level, locale))}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        {personal.length > 0 ? (
          <div className="about-card about-card-pastel pastel-games md:col-span-5">
            <h3 className="readout">{nobr(dict.sections.offTheClock)}</h3>
            {offClockArt ? <div className="about-doodles">{offClockArt}</div> : null}
            {personal.map((line) => (
              <p key={line.en} className="mt-4">
                {nobr(t(line, locale))}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
