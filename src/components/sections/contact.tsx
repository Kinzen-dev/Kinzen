import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { availability, links, t } from "@/content";
import { localePath } from "@/lib/site-url";
import type { Dictionary } from "@/i18n/dictionaries";
import { BangkokTime, OffsetFromVisitor } from "../clock";
import { CopyEmail } from "../copy-email";
import { nobr } from "@/lib/thai-nodes";

export function Contact({ locale, dict, art }: { locale: Locale; dict: Dictionary; art?: ReactNode }) {
  const email = links.find((l) => l.kind === "email");
  const others = links.filter((l) => l.kind !== "email");
  const doors = availability
    ? [
        { key: "employment", label: dict.contact.employment, text: availability.employment },
        { key: "studio", label: dict.contact.studio, text: availability.studio },
      ].filter((d) => d.text)
    : [];

  return (
    <section id="contact" aria-labelledby="contact-title" className="shell pt-24 md:pt-32">
      <div className="grid gap-10 border-t border-rule-strong pt-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-6">
          {art ? <div className="mb-6 size-20 text-ink">{art}</div> : null}
          <h2 id="contact-title" className="max-w-[18ch] text-2xl tracking-[-0.045em]">
            {nobr(dict.contact.heading)}
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg text-ink-2">{nobr(dict.contact.body)}</p>

          {email ? (
            <div className="mt-10 grid gap-5">
              <a
                href={email.href}
                className="link w-fit text-xl font-semibold tracking-[-0.03em] break-all decoration-2"
              >
                {email.label}
              </a>
              <div className="flex flex-wrap items-center gap-3">
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
                  className="inline-flex h-11 items-center border border-rule-strong px-4 text-sm font-medium transition-colors duration-200 hover:bg-ink hover:text-ground"
                >
                  {nobr(dict.hero.ctaCv)}
                </Link>
                {others.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    rel="me noopener"
                    target="_blank"
                    className="inline-flex h-11 items-center border border-rule px-4 text-sm font-medium transition-colors duration-200 hover:border-rule-strong"
                  >
                    {l.label}
                    <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right column: how to work together, then the local clock (no empty quadrant). */}
        <div className="grid content-start gap-10 md:col-span-6 md:col-start-7">
          {doors.length > 0 ? (
            <dl className="grid border-t border-l border-rule">
              {doors.map((d) => (
                <div key={d.key} className="border-r border-b border-rule p-5">
                  <dt className="readout">
                    {nobr(dict.contact.openTo)}: {d.label}
                  </dt>
                  <dd className="mt-2 text-ink-2">{nobr(t(d.text!, locale))}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <dl>
            <dt className="readout">{nobr(dict.contact.localTime)}</dt>
            <dd className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              <BangkokTime locale={locale} />
            </dd>
            <dd className="mt-1 text-sm text-ink-2">
              <OffsetFromVisitor
                labels={{
                  ahead: dict.facts.aheadOfYou,
                  behind: dict.facts.behindYou,
                  same: dict.facts.sameAsYou,
                  hours: dict.facts.hours,
                }}
              />
            </dd>
          </dl>
        </div>
      </div>
    </section>
  );
}
