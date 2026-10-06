import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { links, profile, projects, t, yearsInProduction } from "@/content";
import { localePath } from "@/lib/site-url";
import type { Dictionary } from "@/i18n/dictionaries";
import { BangkokTime } from "../clock";

/**
 * The first screen. The wordmark is real server-rendered text; the particle field (when the
 * device allows it) is layered in through `fx`.
 * When the field is going to run (dark theme, motion allowed, hardware WebGL2: decided before
 * paint by ThemeScript, html[data-fx="pending"]) the wordmark is held at opacity 0 and the dust
 * condenses into the name instead, so the LCP element is the hero line paragraph below the h1,
 * painted with the first frame. Measured on the production build (M2, metal): 72 to 228 ms
 * unthrottled, 208 to 292 ms at 4x CPU, desktop 1440 and phone 390. In the light theme, under
 * reduced motion and on software GL the wordmark itself is the LCP (72 to 164 ms, 4x CPU 216 to
 * 456 ms). Only if the field fails after the gate does the wordmark become a late LCP entry, when
 * fx.css reveals it (at once on a failure the field reports, by 1.8 s at worst).
 */
export function Hero({ locale, dict, fx }: { locale: Locale; dict: Dictionary; fx?: ReactNode }) {
  const email = links.find((l) => l.kind === "email");
  const linkedin = links.find((l) => l.kind === "linkedin");
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

        <div className="grid gap-10 border-t border-rule-strong pt-6 pb-6 md:grid-cols-12 md:gap-6 md:pb-10">
          <div className="md:col-span-7">
            <h1 id="hero-title" className="text-xl tracking-[-0.03em]">
              <span className="block">{t(profile.displayName, locale)}</span>
              <span className="block text-ink-2">{t(profile.role, locale)}</span>
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg text-ink-2">{t(profile.heroLine, locale)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {email ? (
                <a
                  href={email.href}
                  className="inline-flex h-11 items-center bg-gold px-5 text-sm font-semibold text-gold-ink transition-opacity duration-200 hover:opacity-90"
                >
                  {dict.hero.ctaEmail}
                </a>
              ) : null}
              <a
                href={localePath(locale, "/cv")}
                className="inline-flex h-11 items-center border border-rule-strong px-5 text-sm font-medium transition-colors duration-200 hover:bg-ink hover:text-ground"
              >
                {dict.hero.ctaCv}
              </a>
              {linkedin ? (
                <a
                  href={linkedin.href}
                  rel="me noopener"
                  target="_blank"
                  className="inline-flex h-11 items-center border border-rule px-5 text-sm font-medium transition-colors duration-200 hover:border-rule-strong"
                >
                  {linkedin.label}
                  <span className="sr-only"> {dict.a11y.newTab}</span>
                </a>
              ) : null}
            </div>
          </div>

          <dl className="grid grid-cols-2 self-end border-t border-l border-rule md:col-span-5">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col justify-between gap-2 border-r border-b border-rule p-4">
                <dt className="readout">{fact.label}</dt>
                <dd className="text-lg font-medium tracking-[-0.02em]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
