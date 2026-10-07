"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";
import type { Locale } from "@/content/schema";
import { getDictionary } from "@/i18n/dictionaries";
import { getV3 } from "@/i18n/v3";
import { nobr } from "@/lib/thai-nodes";
import { WORDMARK_EM } from "@/fx/baked/geometry";
import { HeroKinetic } from "@/components/sections/hero-kinetic";
import type { LabBanner as BannerFacts } from "../../types";
import "@/components/sections/hero.css";
import "./banner.css";

/**
 * The home hero's first screen for the lab-hero-a demos: the same type, line, CTAs and layout as
 * src/components/sections/hero.tsx (fact chips left out: the banner is about the wow layer). The
 * wordmark is not text here: `slotRef` marks the exact box the shipped KINZEN ink occupies (the
 * baked Geist 600 ink box, in em of the hero wordmark size), and each demo draws its own name
 * there. `stage` is the full-bleed effect layer under the copy.
 */
export function LabBanner({
  locale,
  banner,
  stage,
  slotRef,
  sectionRef,
  scrim = false,
  className,
  children,
}: {
  locale: Locale;
  /** Facts from site.ts, resolved by the lab page on the server. */
  banner: BannerFacts;
  stage: ReactNode;
  slotRef: Ref<HTMLDivElement>;
  /** The banner section: demos listen for the pointer on it, so it works over the copy too. */
  sectionRef?: Ref<HTMLElement>;
  /** A soft navy wash behind the copy, for effects that fill the whole banner. */
  scrim?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const dict = getDictionary(locale);
  const copy = getV3(locale).hero;
  const em = WORDMARK_EM;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="lab-hero-title"
      className={["a-hero relative isolate overflow-clip", className].filter(Boolean).join(" ")}
      data-scene="dark"
      data-scrim={scrim || undefined}
    >
      <div className="a-stage" aria-hidden="true">
        {stage}
      </div>
      <div className="a-copy shell relative">
        <div aria-hidden="true" className="a-wordmark-pad">
          <div className="hero-wordmark a-wordmark -mx-[0.04em]">
            <div
              ref={slotRef}
              className="a-slot"
              style={{ left: `${em.x0}em`, top: `${em.y0}em`, width: `${em.w}em`, height: `${em.h}em` }}
            />
          </div>
        </div>
        <p className="sr-only">KINZEN</p>

        <div className="a-body hero-body grid gap-6 border-t border-rule pt-6 pb-12 md:grid-cols-12 md:gap-x-6 md:gap-y-8 md:pt-7 md:pb-14">
          <div className="hero-head md:col-span-12">
            <h1 id="lab-hero-title" className="hero-title">
              <span>{nobr(banner.name)}</span> <span className="text-ink-2">{nobr(banner.role)}</span>
            </h1>
            <HeroKinetic
              lead={nobr(copy.lead)}
              word={nobr(copy.key)}
              join={copy.join}
              phrases={copy.phrases.map((p, i) => {
                const phone = copy.phrasesPhone[i] ?? p;
                if (phone === p) return nobr(p);
                return (
                  <>
                    <span className="kinetic-wide">{nobr(p)}</span>
                    <span className="kinetic-phone">{nobr(phone)}</span>
                  </>
                );
              })}
            />
          </div>
          <div className="hero-act self-end md:col-span-12 xl:col-span-7">
            <p className="hero-line max-w-[46ch] text-ink-2 md:text-lg">{nobr(banner.heroLine)}</p>
            <div className="hero-ctas mt-7">
              <a href={banner.email} className="hero-cta hero-cta-primary beam">
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
              <Link href={banner.cvHref} prefetch={false} className="hero-cta hero-cta-ghost">
                {nobr(dict.hero.ctaCv)}
              </Link>
              <a href={banner.linkedin} rel="me noopener" target="_blank" className="hero-cta hero-cta-ghost">
                LinkedIn
                <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}
