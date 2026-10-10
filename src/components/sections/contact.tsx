import Link from "next/link";
import type { Locale } from "@/content/schema";
import { availability, links, t } from "@/content";
import { localePath, prefetchFor } from "@/lib/site-url";
import type { Dictionary } from "@/i18n/dictionaries";
import { getV3, type V3Copy } from "@/i18n/v3";
import { Art } from "../art/art";
import { doodleArt } from "../doodles/art.generated";
import { BangkokClockDigits, OffsetFromVisitor } from "../clock";
import { CopyEmail } from "../copy-email";
import { KineticHeading } from "./kinetic-heading";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";
import "./contact.css";
import { BeamRing } from "@/motion/loops";

/**
 * Contact (v3): the closing dark scene. Kinetic heading, the address as a big link, a primary
 * CTA with the border beam, King's portrait throwing a paper plane whose dashed path draws
 * itself to Bangkok as the card scrolls in, the two ways to work together and the Bangkok clock as odometer digits.
 */
export function Contact({ locale, dict, v3 = getV3(locale) }: { locale: Locale; dict: Dictionary; v3?: V3Copy }) {
  const email = links.find((l) => l.kind === "email");
  const others = links.filter((l) => l.kind !== "email");
  const doors = availability
    ? [
        { key: "employment", label: dict.contact.employment, text: availability.employment },
        { key: "studio", label: dict.contact.studio, text: availability.studio },
      ].filter((d) => d.text)
    : [];
  const heading = v3.contact.heading;
  // Project enquiries go to the studio (its own /en or /th); role enquiries stay direct email (C07).
  const studioUrl = availability?.studioUrl
    ? (locale === "th" && availability.studioUrl.th) || availability.studioUrl.en
    : null;

  return (
    <section id="contact" aria-labelledby="contact-title" className="shell pt-24 md:pt-32">
      <div data-scene="dark" className="scene-card contact-card">
        <div className="contact-grid">
          <div className="contact-main">
            <p className="contact-eyebrow readout">
              <span aria-hidden="true" className="contact-live" />
              {nobr(dict.sections.contact)}
            </p>
            <KineticHeading
              id="contact-title"
              units={heading.units.map((u) => nobr(u))}
              keyIndex={heading.key}
              joiner={heading.joiner}
              className="contact-heading"
            />
            <p className="mt-6 max-w-[44ch] text-lg text-ink-2">{nobr(dict.contact.body)}</p>

            {email ? (
              <div className="mt-10 grid gap-6">
                <a href={email.href} className="contact-email link">
                  {email.label}
                </a>
                <div className="contact-actions">
                  <a href={email.href} className="contact-cta beam">
                    <BeamRing />
                    {nobr(dict.contact.emailMe)}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    >
                      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <CopyEmail
                    email={email.label}
                    labels={{
                      copy: dict.contact.copyEmail,
                      copied: dict.contact.copied,
                      failed: dict.contact.copyFailed,
                    }}
                  />
                  <Link
                    href={localePath(locale, "/cv")}
                    prefetch={prefetchFor(localePath(locale, "/cv"))}
                    className="contact-btn"
                  >
                    {nobr(dict.hero.ctaCv)}
                  </Link>
                  {others.map((l) => (
                    <a key={l.href} href={l.href} rel="me noopener" target="_blank" className="contact-btn">
                      {l.label}
                      <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="contact-side">
            {/* King throws the plane; its dashed flight draws itself on scroll to the temple (Bangkok). */}
            <div aria-hidden="true" className="contact-plane">
              <Art name="portrait-paper-plane" className="contact-plane-figure" />
              <svg viewBox="0 0 320 170" fill="none" focusable="false" className="contact-plane-trail">
                <path
                  d="M2 12C46 0 88 10 112 40c20 26 14 56-8 56s-24-30 0-40c40-16 110-6 148 40"
                  pathLength={100}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="2.6 2.4"
                  strokeLinecap="round"
                />
                <g transform="translate(236 80) scale(0.29)">
                  <path fill="currentColor" d={doodleArt["temple-sun"].d} />
                </g>
              </svg>
            </div>

            <dl className="contact-clock">
              <dt className="readout">{nobr(dict.contact.localTime)}</dt>
              <dd className="contact-clock-digits">
                <BangkokClockDigits locale={locale} />
              </dd>
              <dd className="mt-2 text-sm text-ink-2">
                {nobr(dict.facts.bangkokTime)} ·{" "}
                <OffsetFromVisitor
                  labels={{
                    ahead: plain(dict.facts.aheadOfYou),
                    behind: plain(dict.facts.behindYou),
                    same: plain(dict.facts.sameAsYou),
                    hours: dict.facts.hours,
                  }}
                />
              </dd>
            </dl>
          </div>

          {doors.length > 0 ? (
            <dl className="contact-doors">
              {doors.map((d) => (
                <div key={d.key} className="contact-door">
                  <dt className="readout">
                    {nobr(dict.contact.openTo)}: {nobr(d.label)}
                  </dt>
                  <dd className="mt-2 text-ink-2">{nobr(t(d.text!, locale))}</dd>
                  {d.key === "employment" ? (
                    <dd className="mt-3 text-sm font-medium">{nobr(dict.contact.roleRoute)}</dd>
                  ) : studioUrl ? (
                    <dd className="mt-3 text-sm font-medium">
                      {nobr(dict.contact.studioRoute)}{" "}
                      <a href={studioUrl} rel="noopener" target="_blank" className="link">
                        {studioUrl.replace(/^https:\/\//, "").replace(/\/(en|th)$/, "")}
                        <span aria-hidden="true"> ↗</span>
                        <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
                      </a>
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}
