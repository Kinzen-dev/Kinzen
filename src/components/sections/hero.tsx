import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { links, profile, projects, t, yearsInProduction } from "@/content";
import { localePath } from "@/lib/site-url";
import type { Dictionary } from "@/i18n/dictionaries";
import { BangkokTime } from "../clock";
import { nobr } from "@/lib/thai-nodes";
import { getV3, type V3Copy } from "@/i18n/v3";
import { HeroKinetic } from "./hero-kinetic";
import { HeroScale } from "./hero-scale";
import "./hero.css";

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
 * v3: the hero is a dark scene in both themes. Under the name, a kinetic line ("I build" + a
 * cycling phrase, the first phrase painted with the first frame, so it is real LCP-eligible text);
 * pill CTAs in the Contact order (email, CV, LinkedIn); glass fact chips; and on scroll the whole
 * scene scales down into a rounded card (HeroScale).
 */
export function Hero({ locale, dict, fx, v3 }: { locale: Locale; dict: Dictionary; fx?: ReactNode; v3?: V3Copy }) {
  const copy = (v3 ?? getV3(locale)).hero;
  const email = links.find((l) => l.kind === "email");
  const linkedin = links.find((l) => l.kind === "linkedin");
  const years = yearsInProduction(new Date(process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-10-06"));

  const facts = [
    { label: dict.facts.bangkokTime, value: <BangkokTime locale={locale} />, live: true },
    { label: dict.facts.yearsInProduction, value: <span className="tabular">{years}</span> },
    { label: dict.facts.systems, value: <span className="tabular">{projects.length}</span> },
    { label: dict.facts.founder, value: "Vesperwerk" },
  ];

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate overflow-clip"
      data-hero
      data-scene="dark"
    >
      {fx}
      <HeroScale />
      <div className="shell relative">
        <p
          aria-hidden="true"
          data-hero-wordmark
          className="hero-wordmark -mx-[0.04em] pt-[clamp(1.5rem,5vh,4rem)] font-semibold select-none"
        >
          KINZEN
        </p>

        <div className="grid gap-8 border-t border-rule pt-6 pb-12 md:grid-cols-12 md:gap-x-6 md:gap-y-8 md:pt-7 md:pb-14">
          <div className="md:col-span-12">
            <h1 id="hero-title" className="hero-title">
              <span>{nobr(t(profile.displayName, locale))}</span>{" "}
              <span className="text-ink-2">{nobr(t(profile.role, locale))}</span>
            </h1>
            <HeroKinetic
              lead={nobr(copy.lead)}
              word={nobr(copy.key)}
              join={copy.join}
              phrases={copy.phrases.map((p) => nobr(p))}
            />
          </div>
          <div className="self-end md:col-span-12 lg:col-span-6">
            <p className="max-w-[46ch] text-ink-2 md:text-lg">{nobr(t(profile.heroLine, locale))}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {email ? (
                <a href={email.href} className="hero-cta hero-cta-primary beam">
                  {nobr(dict.hero.ctaEmail)}
                  <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16" fill="none">
                    <path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              ) : null}
              <Link href={localePath(locale, "/cv")} className="hero-cta hero-cta-ghost">
                {nobr(dict.hero.ctaCv)}
              </Link>
              {linkedin ? (
                <a href={linkedin.href} rel="me noopener" target="_blank" className="hero-cta hero-cta-ghost">
                  {linkedin.label}
                  <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
                </a>
              ) : null}
            </div>
          </div>

          <dl className="hero-facts self-end md:col-span-12 lg:col-span-6">
            {facts.map((fact) => (
              <div key={fact.label} className="hero-chip">
                <dt className="readout">
                  {fact.live ? <span className="hero-live" aria-hidden="true" /> : null}
                  {nobr(fact.label)}
                </dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
