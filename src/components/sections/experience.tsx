import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { experience, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { Art } from "../art/art";
import { Doodle } from "../doodles/doodle";
import { EraThread } from "../timeline/era-thread";
import { monthYear } from "../timeline/format";
import { SectionHeader } from "./section-header";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";

/** Era icon and area pastel, by experience id. An era without an entry gets a plain card. */
const ERA_LOOK: Record<string, { icon: ReactNode; pastel: string }> = {
  "exp-founder": { icon: <Art name="era-evening-star" className="h-[78%]" />, pastel: "pastel-ai" },
  "exp-anymind": { icon: <Doodle name="shop-bag" className="h-[72%]" />, pastel: "pastel-commerce" },
  // The first era (career start): the laptop with the rocket leaving it.
  "exp-zygen": { icon: <Art name="era-laptop-start" className="h-[78%]" />, pastel: "pastel-tools" },
};

export function Experience({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section id="experience" aria-labelledby="experience-title" className="shell pt-24 md:pt-32">
      <SectionHeader id="experience" title={plain(dict.sections.experience)} intro={dict.sections.experienceIntro} />

      <div data-era-timeline className="era-timeline">
        <ol data-era-list>
          {experience.map((era, n) => {
            const current = era.end === "present";
            const end = current ? dict.experience.present : monthYear(era.end, locale);
            const look = ERA_LOOK[era.id];
            return (
              <li key={era.id} data-era className="relative grid gap-6 border-t border-rule md:grid-cols-12 md:gap-6">
                <span data-era-node aria-hidden="true" className="era-node" />
                <div className="md:sticky md:top-[calc(var(--header-h)+1.5rem)] md:col-span-5 md:self-start lg:col-span-4">
                  <div data-reveal className={["era-card", look?.pastel].filter(Boolean).join(" ")}>
                    <div className="flex items-start justify-between gap-4">
                      {/* No art, no tile (the confidential entry carries no images): the index stays right. */}
                      {look ? (
                        <span aria-hidden="true" className="era-icon">
                          {look.icon}
                        </span>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                      <span aria-hidden="true" className="era-index tabular">
                        {String(experience.length - n).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="readout mt-5 flex flex-wrap items-center gap-x-2">
                      <span>
                        {monthYear(era.start, locale)} → {nobr(end)}
                      </span>
                      {current ? <span aria-hidden="true" className="era-live" /> : null}
                    </p>
                    <h3 className="mt-2 text-xl tracking-[-0.035em]">{era.org.name}</h3>
                    <p className="mt-1 text-ink-2">{nobr(t(era.title, locale))}</p>
                  </div>
                </div>
                <div className="md:col-span-7 md:col-start-6 lg:col-start-6">
                  <p className="max-w-[56ch] text-lg">{nobr(t(era.summary, locale))}</p>
                  <ul className="mt-6 grid gap-3">
                    {era.highlights.map((h) => (
                      <li
                        key={h.provenance.claimId + h.text.en.slice(0, 16)}
                        className="flex max-w-[64ch] gap-3 text-ink-2"
                      >
                        <span aria-hidden="true" className="mt-[0.7em] h-px w-3 shrink-0 bg-ink-3" />
                        <span>{nobr(t(h.text, locale))}</span>
                      </li>
                    ))}
                  </ul>
                  <ul aria-label={plain(dict.experience.stack)} className="mt-6 flex flex-wrap gap-2">
                    {era.stack.map((s) => (
                      <li key={s} className="era-chip">
                        {s}
                      </li>
                    ))}
                  </ul>
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
