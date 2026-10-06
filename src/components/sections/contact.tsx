import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { links } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { BangkokTime, OffsetFromVisitor } from "../clock";
import { CopyEmail } from "../copy-email";

export function Contact({ locale, dict, art }: { locale: Locale; dict: Dictionary; art?: ReactNode }) {
  const email = links.find((l) => l.kind === "email");
  const others = links.filter((l) => l.kind !== "email");

  return (
    <section id="contact" aria-labelledby="contact-title" className="shell pt-24 md:pt-32">
      <div className="grid gap-10 border-t border-rule-strong pt-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-8">
          {art ? <div className="mb-6 size-20 text-ink">{art}</div> : null}
          <h2 id="contact-title" className="max-w-[18ch] text-2xl tracking-[-0.045em]">
            {dict.contact.heading}
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg text-ink-2">{dict.contact.body}</p>

          {email ? (
            <div className="mt-10 grid gap-5">
              <a
                href={email.href}
                className="link w-fit text-xl font-semibold tracking-[-0.03em] break-all decoration-2"
              >
                {email.label}
              </a>
              <div className="flex flex-wrap items-center gap-3">
                <CopyEmail email={email.label} labels={{ copy: dict.contact.copyEmail, copied: dict.contact.copied }} />
                {others.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    rel="me noopener"
                    target="_blank"
                    className="inline-flex h-11 items-center border border-rule px-4 text-sm font-medium transition-colors duration-200 hover:border-rule-strong"
                  >
                    {l.label}
                    <span className="sr-only"> {dict.a11y.newTab}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <dl className="self-end md:col-span-3 md:col-start-10">
          <dt className="readout">{dict.contact.localTime}</dt>
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
    </section>
  );
}
