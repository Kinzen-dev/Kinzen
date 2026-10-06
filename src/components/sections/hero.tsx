import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { profile, projects, t, yearsInProduction } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { BangkokTime } from "../clock";

/**
 * The first screen. The wordmark is real server-rendered text and the LCP element;
 * the particle field (when the device allows it) is layered in through `fx`.
 */
export function Hero({ locale, dict, fx }: { locale: Locale; dict: Dictionary; fx?: ReactNode }) {
  const years = yearsInProduction(new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-10-06"));

  const facts = [
    { label: dict.facts.bangkokTime, value: <BangkokTime locale={locale} /> },
    { label: dict.facts.yearsInProduction, value: <span className="tabular">{years}</span> },
    { label: dict.facts.systems, value: <span className="tabular">{projects.length}</span> },
    { label: dict.facts.founder, value: "Vesperwerk" },
  ];

  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-clip" data-hero>
      {fx}
      <div className="shell relative">
        <p
          aria-hidden="true"
          data-hero-wordmark
          className="hero-wordmark -mx-[0.04em] pt-[clamp(1.5rem,5vh,4rem)] font-semibold select-none"
        >
          KINZEN
        </p>

        <div className="grid gap-10 border-t border-rule-strong pt-6 pb-16 md:grid-cols-12 md:gap-6 md:pb-24">
          <div className="md:col-span-7">
            <h1 id="hero-title" className="text-xl tracking-[-0.03em]">
              <span className="block">{t(profile.displayName, locale)}</span>
              <span className="block text-ink-2">{t(profile.role, locale)}</span>
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg text-ink-2">{t(profile.heroLine, locale)}</p>
          </div>

          <dl className="grid grid-cols-2 self-end border-t border-l border-rule md:col-span-5">
            {facts.map((fact) => (
              <div key={fact.label} className="border-r border-b border-rule p-4">
                <dt className="readout">{fact.label}</dt>
                <dd className="mt-2 text-lg font-medium tracking-[-0.02em]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
