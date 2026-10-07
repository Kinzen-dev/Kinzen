import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { getProject, projects, t, tPlain } from "@/content";
import type { Locale } from "@/content/schema";
import { getDictionary, getPlainDictionary } from "@/i18n/dictionaries";
import { alternates, localePath, prefetchFor } from "@/lib/site-url";
import { JsonLd, projectJsonLd } from "@/lib/json-ld";
import { ProjectPlate, getPlateSpec } from "@/components/plates";
import { StatusMark } from "@/components/sections/work";
import { periodLabel } from "@/components/work/format";
import { workTitleTransition } from "@/components/work/transition";
import "@/components/work/transitions.css";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";

export const dynamicParams = false;

/** Public projects only: hidden ones are never generated, so their URLs 404. */
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/work/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const project = getProject(slug);
  if (!project) return {};
  const dict = getPlainDictionary(locale);
  const path = `/work/${slug}`;
  const description = tPlain(project.tagline, locale);
  const image = {
    url: localePath(locale, `${path}/og.png`),
    width: 1200,
    height: 630,
    alt: dict.work.ogAlt.replace("{name}", project.name),
  };
  return {
    title: project.name,
    description,
    alternates: alternates(path, locale),
    openGraph: {
      type: "article",
      siteName: "Kinzen",
      title: `${project.name} | Kinzen`,
      description,
      url: localePath(locale, path),
      locale: locale === "th" ? "th_TH" : "en_US",
      alternateLocale: locale === "th" ? "en_US" : "th_TH",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: `${project.name} | Kinzen`, description, images: [image.url] },
  };
}

export default async function ProjectPage({ params }: PageProps<"/[lang]/work/[slug]">) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const project = getProject(slug);
  if (!project) notFound();
  const dict = getDictionary(locale);

  const index = projects.findIndex((p) => p.id === project.id);
  const next = projects[(index + 1) % projects.length];
  const links = project.links.filter((l) => l.visibility === "public");
  const caseStudy = project.caseStudyVisibility === "public" ? project.caseStudy : undefined;

  const facts = [
    {
      label: dict.project.period,
      value: <span className="tabular">{periodLabel(project.period, locale, dict.ledger.present)}</span>,
    },
    { label: dict.project.role, value: t(project.role, locale) },
    { label: dict.ledger.status, value: <StatusMark status={project.status} dict={dict} /> },
    { label: dict.ledger.area, value: dict.areas[project.area] },
  ];

  return (
    <article className="shell pt-8 md:pt-14">
      <p>
        <Link
          href={localePath(locale, "/work")}
          prefetch={prefetchFor(localePath(locale, "/work"))}
          className="link text-sm text-ink-2"
        >
          <span aria-hidden="true">← </span>
          {nobr(dict.project.back)}
        </Link>
      </p>

      <header className="mt-8 grid gap-6 border-t border-rule-strong pt-6 md:mt-12 md:grid-cols-12">
        <h1 className="text-2xl tracking-[-0.045em] md:col-span-8">
          {/* A tight inline box, like the ledger row name, so the morph keeps the text's aspect. */}
          {/* Morph only on the way in (row to page). On the way back the big title over a
              scrolled ledger read as a doubled ghost (review round 6). */}
          <ViewTransition
            name={workTitleTransition(project.slug)}
            share={{ "nav-forward": "morph", default: "none" }}
            default="none"
          >
            <span className="inline-block">{project.name}</span>
          </ViewTransition>
        </h1>
        <p className="max-w-[44ch] text-lg text-ink-2 md:col-span-7">{nobr(t(project.tagline, locale))}</p>
      </header>

      <dl className="mt-10 grid grid-cols-2 border-t border-l border-rule md:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="border-r border-b border-rule p-4">
            <dt className="text-sm text-ink-3">{f.label}</dt>
            <dd className="mt-2 font-medium tracking-[-0.01em]">{f.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="outcomes-title" className="mt-16 grid gap-6 md:mt-24 md:grid-cols-12">
        <h2 id="outcomes-title" className="text-xl tracking-[-0.035em] md:col-span-4">
          {nobr(dict.project.outcomes)}
        </h2>
        <ul className="grid gap-4 md:col-span-7 md:col-start-6">
          {project.outcomes.map((o) => (
            <li key={o.text.en} className="flex max-w-[64ch] gap-3 text-lg">
              <span aria-hidden="true" className="mt-[0.8em] h-px w-3 shrink-0 bg-ink-3" />
              <span>{nobr(t(o.text, locale))}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stack-title" className="mt-16 grid gap-6 border-t border-rule pt-6 md:grid-cols-12">
        <h2 id="stack-title" className="text-xl tracking-[-0.035em] md:col-span-4">
          {nobr(dict.project.stack)}
        </h2>
        <ul className="readout flex flex-wrap gap-x-5 gap-y-2 text-sm md:col-span-7 md:col-start-6">
          {project.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      {links.length > 0 && (
        <section aria-labelledby="links-title" className="mt-16 grid gap-6 border-t border-rule pt-6 md:grid-cols-12">
          <h2 id="links-title" className="text-xl tracking-[-0.035em] md:col-span-4">
            {nobr(dict.project.links)}
          </h2>
          <ul className="grid gap-2 md:col-span-7 md:col-start-6">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="link text-lg" rel="noopener" target="_blank">
                  {l.label}
                  <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PlateSection projectId={project.id} projectName={project.name} locale={locale} />

      {caseStudy && (
        <section
          data-case-study
          aria-labelledby="case-title"
          className="mt-16 grid gap-6 border-t border-rule pt-6 md:grid-cols-12"
        >
          <h2 id="case-title" className="text-xl tracking-[-0.035em] md:col-span-4">
            {nobr(dict.work.caseStudy.heading)}
          </h2>
          <div className="grid gap-8 md:col-span-7 md:col-start-6">
            <div>
              <h3 className="text-sm font-normal text-ink-3">{nobr(dict.work.caseStudy.problem)}</h3>
              <p className="mt-2 text-lg">{nobr(t(caseStudy.problem, locale))}</p>
            </div>
            <div>
              <h3 className="text-sm font-normal text-ink-3">{nobr(dict.work.caseStudy.approach)}</h3>
              <ul className="mt-2 grid gap-3">
                {(locale === "th" && caseStudy.approach.th ? caseStudy.approach.th : caseStudy.approach.en).map((a) => (
                  <li key={a} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.8em] h-px w-3 shrink-0 bg-ink-3" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-normal text-ink-3">{nobr(dict.work.caseStudy.result)}</h3>
              <p className="mt-2">{nobr(t(caseStudy.result, locale))}</p>
            </div>
            <div>
              <h3 className="text-sm font-normal text-ink-3">{nobr(dict.work.caseStudy.limits)}</h3>
              <p className="mt-2 text-ink-2">{nobr(t(caseStudy.limits, locale))}</p>
            </div>
          </div>
        </section>
      )}

      {next.id !== project.id && (
        <nav aria-label={plain(dict.project.next)} className="mt-24 border-t border-rule-strong pt-6">
          <p className="text-sm text-ink-3">{nobr(dict.project.next)}</p>
          <Link href={localePath(locale, `/work/${next.slug}`)} className="group mt-2 block">
            <span className="block text-2xl font-semibold tracking-[-0.045em] transition-colors duration-200 group-hover:text-gold">
              {next.name}
            </span>
            <span className="mt-2 block max-w-[52ch] text-ink-2">{nobr(t(next.tagline, locale))}</span>
          </Link>
        </nav>
      )}

      <JsonLd data={projectJsonLd(project, locale)} />
    </article>
  );
}

function PlateSection({ projectId, projectName, locale }: { projectId: string; projectName: string; locale: Locale }) {
  if (!getPlateSpec(projectId)) return null;
  const dict = getDictionary(locale);
  return (
    <section aria-labelledby="architecture-title" className="mt-16 border-t border-rule pt-6 md:mt-24">
      <h2 id="architecture-title" className="text-xl tracking-[-0.035em]">
        {nobr(dict.work.architecture)}
      </h2>
      <div className="mt-8">
        <ProjectPlate
          projectId={projectId}
          projectName={projectName}
          locale={locale}
          dict={dict}
          idPrefix="page-plate"
        />
      </div>
    </section>
  );
}
