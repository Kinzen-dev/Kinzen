import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { availability, links, profile, t } from "@/content";
import { localePath, prefetchFor } from "@/lib/site-url";
import type { Dictionary } from "@/i18n/dictionaries";
import { BangkokTime } from "../clock";
import { nobr } from "@/lib/thai-nodes";
import { getV3, type V3Copy } from "@/i18n/v3";
import { HeroKinetic } from "./hero-kinetic";
import { HeroScale } from "./hero-scale";
import { InkArt } from "@/fx/ink/ink-art";
import { HeroControls } from "@/fx/react/hero-controls";
import "./hero.css";
import { BeamRing } from "@/motion/loops";

/**
 * The first screen. Its top band is a stage (v4): the ink desk, server-rendered finished inside
 * the wordmark paragraph, draws itself and then turns into the gold KINZEN in four materials
 * (dust, metal, ink in water, keycaps) and back, forever; the sequence is layered in through `fx`
 * after first paint (fx/sequence). The KINZEN text stays in the paragraph as the band's layout box
 * and the slot every scene draws the name into, never painted; so the LCP element is always real
 * text below it (the kinetic line or the hero line), painted with the first frame. Without
 * scripting and under reduced motion the band is the finished ink desk, still.
 * v3: the hero is a dark scene in both themes. Under the name, a kinetic line ("I build" + a
 * cycling phrase, the first phrase painted with the first frame, so it is real LCP-eligible text);
 * pill CTAs in the Contact order (email, CV, LinkedIn); glass fact chips; and on scroll the whole
 * scene scales down into a rounded card (HeroScale).
 */
export function Hero({ locale, dict, fx, v3 }: { locale: Locale; dict: Dictionary; fx?: ReactNode; v3?: V3Copy }) {
  const copy = (v3 ?? getV3(locale)).hero;
  const email = links.find((l) => l.kind === "email");
  const linkedin = links.find((l) => l.kind === "linkedin");
  // Who and how to work with (profile.availability); the numbers are the strip's job.
  const f = copy.facts;
  const facts: { label: string; value: ReactNode; live?: boolean }[] = [
    { label: dict.facts.bangkokTime, value: <BangkokTime locale={locale} />, live: true },
    ...(availability
      ? [
          { label: f.works.label, value: nobr(f.works.value) },
          { label: f.openTo.label, value: nobr(f.openTo.value) },
        ]
      : []),
    { label: f.projects.label, value: f.projects.value },
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
          className="hero-wordmark pt-[clamp(1.5rem,5vh,4rem)] select-none"
        >
          <span className="hero-wordmark-text">KINZEN</span>
          <InkArt />
        </p>

        <div className="hero-body grid gap-6 pt-6 pb-12 md:grid-cols-12 md:gap-x-6 md:gap-y-8 md:pt-7 md:pb-14">
          <div className="hero-head md:col-span-12">
            <h1 id="hero-title" className="hero-title">
              <span>{nobr(t(profile.displayName, locale))}</span>{" "}
              <span className="text-ink-2">{nobr(t(profile.role, locale))}</span>
            </h1>
            <HeroKinetic
              lead={nobr(copy.lead)}
              word={nobr(copy.key)}
              join={copy.join}
              phrases={copy.phrases.map((p, i) => {
                const phone = copy.phrasesPhone[i] ?? p;
                if (phone === p) return nobr(p);
                // Both variants stay in the DOM; CSS shows one per breakpoint (display: none takes
                // the other out of layout and of the accessibility tree), so the box never reflows.
                return (
                  <>
                    <span className="kinetic-wide">{nobr(p)}</span>
                    <span className="kinetic-phone">{nobr(phone)}</span>
                  </>
                );
              })}
            />
          </div>
          <div className="hero-act self-end md:col-span-12 xl:col-span-5">
            <p className="hero-line max-w-[46ch] text-ink-2 md:text-lg">{nobr(t(profile.heroLine, locale))}</p>
            <div className="hero-ctas mt-7">
              {email ? (
                <a href={email.href} className="hero-cta hero-cta-primary beam">
                  <BeamRing />
                  {nobr(dict.hero.ctaEmail)}
                  <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16" fill="none">
                    <path
                      d="M3 8h9M8.5 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ) : null}
              <Link
                href={localePath(locale, "/cv")}
                prefetch={prefetchFor(localePath(locale, "/cv"))}
                className="hero-cta hero-cta-ghost"
              >
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

          <dl className="hero-facts self-end md:col-span-12 xl:col-span-7">
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
        <HeroControls pause={copy.stage.pause} play={copy.stage.play} />
      </div>
    </section>
  );
}
