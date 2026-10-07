import Link from "next/link";
import type { ReactNode, Ref } from "react";
import type { Locale } from "@/content/schema";
import { getDictionary } from "@/i18n/dictionaries";
import { getV3 } from "@/i18n/v3";
import { localePath } from "@/lib/site-url";
import { nobr } from "@/lib/thai-nodes";
import { bannerCopy, EMAIL, LINKEDIN } from "./copy";
import "@/components/sections/hero.css";
import "./banner.css";

/**
 * The whole top banner, shared by the four lab-hero-b demos: dark scene under the fixed header,
 * KINZEN identity, name and role, the "I build" line (first phrase, held still), the hero line and
 * the three CTAs in the Contact order. Only `stage` (the wow layer) differs between demos.
 * `layout`: "split" puts the stage beside the copy from 64rem (below the copy on phones);
 * "overlay" lays the stage under the whole banner and the copy over it.
 */
export function Banner({
  locale,
  stage,
  layout = "split",
  id,
  ref,
  lineSlot,
}: {
  locale: Locale;
  stage: ReactNode;
  layout?: "split" | "overlay";
  id: string;
  ref?: Ref<HTMLElement>;
  /** Extra node rendered right after the hero line (a demo's own caption or control). */
  lineSlot?: ReactNode;
}) {
  const dict = getDictionary(locale);
  const hero = getV3(locale).hero;
  const copy = bannerCopy(locale);
  const titleId = `${id}-title`;
  const lead = `${hero.lead}${hero.join}${hero.key}`;

  return (
    <section ref={ref} aria-labelledby={titleId} data-scene="dark" className={`hb hb-${layout} ${id}`}>
      <div className="hb-stage">{stage}</div>
      <div className="hb-copy shell">
        <div className="hb-text">
          <p className="hb-mark" aria-hidden="true">
            <span className="hb-mark-dot" />
            KINZEN
          </p>
          <h1 id={titleId} className="hero-title hb-title">
            <span>{nobr(copy.name)}</span> <span className="text-ink-2">{nobr(copy.role)}</span>
          </h1>
          <p className="hb-display">
            <span>{nobr(lead)}</span>
            {hero.join || " "}
            <span className="hb-phrase hb-phrase-wide">{nobr(hero.phrases[0] ?? "")}</span>
            <span className="hb-phrase hb-phrase-phone">{nobr(hero.phrasesPhone[0] ?? "")}</span>
          </p>
          <p className="hb-line" data-hb-line>
            {nobr(copy.heroLine)}
          </p>
          {lineSlot}
          <div className="hero-ctas hb-ctas">
            <a href={EMAIL.href} className="hero-cta hero-cta-primary beam">
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
            <Link href={localePath(locale, "/cv")} prefetch={false} className="hero-cta hero-cta-ghost">
              {nobr(dict.hero.ctaCv)}
            </Link>
            <a href={LINKEDIN.href} rel="me noopener" target="_blank" className="hero-cta hero-cta-ghost">
              {LINKEDIN.label}
              <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
