import type { Metadata } from "next";
import { links } from "@/content";
import type { Locale } from "@/content/schema";
import { alternates } from "@/lib/site-url";
import { pageOpenGraph } from "@/lib/open-graph";
import { nobr } from "@/lib/thai-nodes";
import { privacyCopy } from "./copy";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const copy = privacyCopy[locale];
  return {
    title: copy.title,
    description: copy.description,
    alternates: alternates("/privacy", locale),
    openGraph: pageOpenGraph(locale, "/privacy", "website"),
  };
}

/** What the site stores and sends (audit TECH-06). Static, no client code. */
export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const copy = privacyCopy[locale];
  const email = links.find((l) => l.kind === "email");
  const [before, after] = copy.questions.split("{email}");

  return (
    <article className="shell pt-8 md:pt-14">
      <header className="grid max-w-[46rem] gap-4">
        <h1 className="text-2xl tracking-[-0.035em]">{nobr(copy.title)}</h1>
        <p className="text-lg text-ink-2">{nobr(copy.intro)}</p>
      </header>

      {copy.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="mt-14 grid gap-6 border-t border-rule pt-8 md:mt-20 md:grid-cols-12 md:gap-8"
        >
          <h2 id={`${section.id}-title`} className="text-xl tracking-[-0.03em] md:col-span-4">
            {nobr(section.heading)}
          </h2>
          <div className="grid gap-8 md:col-span-8">
            {section.items.map((item) => (
              <div key={item.title} className="grid max-w-[46rem] gap-2">
                <h3 className="font-semibold tracking-[-0.01em]">{nobr(item.title)}</h3>
                <p className="text-ink-2">{nobr(item.body)}</p>
                {item.points.length > 0 ? (
                  <ul className="grid list-disc gap-1 ps-5 text-ink-2 marker:text-ink-3">
                    {item.points.map((point) => (
                      <li key={point}>{nobr(point)}</li>
                    ))}
                  </ul>
                ) : null}
                {item.source ? (
                  <p className="readout text-ink-3">
                    {nobr(copy.sourceLabel)}:{" "}
                    <a className="link" href={item.source.href} hrefLang="en">
                      {nobr(item.source.label)}
                    </a>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}

      {email ? (
        <p className="mt-14 max-w-[46rem] border-t border-rule pt-8 text-ink-2 md:mt-20">
          {nobr(before)}
          <a className="link" href={email.href}>
            {email.label}
          </a>
          {nobr(after)}
        </p>
      ) : null}
    </article>
  );
}
