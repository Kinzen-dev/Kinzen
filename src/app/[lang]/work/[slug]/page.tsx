import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { getProject, projects, t, tList, tPlain } from "@/content";
import type { Locale } from "@/content/schema";
import { getDictionary, getPlainDictionary } from "@/i18n/dictionaries";
import { alternates, localePath, prefetchFor } from "@/lib/site-url";
import { JsonLd, projectJsonLd } from "@/lib/json-ld";
import { ProjectPlate, getPlateSpec } from "@/components/plates";
import { isLive } from "@/components/work/rows";
import { periodLabel } from "@/components/work/format";
import { workTitleTransition } from "@/components/work/transition";
import "@/components/work/transitions.css";
import { Art } from "@/components/art/art";
import { PROJECT_ART } from "@/components/v3/more-work/work-cards";
import { PlateFrame } from "@/components/v3/project/plate-frame";
import { getV3 } from "@/i18n/v3";
import "@/components/v3/project/project.css";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";
import { CaseCta } from "@/components/case-cta";

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
    // Solo builds say "built by"; team work names the role instead (TH-57).
    alt:
      project.role.en === "Solo build"
        ? dict.work.ogAlt.replace("{name}", project.name)
        : dict.work.ogAltLed.replace("{name}", project.name).replace("{role}", tPlain(project.role, locale)),
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
    {
      label: dict.ledger.status,
      // Not StatusMark (nowrap): a long Thai status must wrap inside the chip, not run into its padding.
      value: (
        <span className="pj-status">
          <span aria-hidden="true" className="pj-status-dot" data-live={isLive(project.status) || undefined} />
          <span>{nobr(dict.status[project.status])}</span>
        </span>
      ),
    },
    { label: dict.ledger.area, value: dict.areas[project.area] },
  ];

  const art = PROJECT_ART[project.id];
  const nextArt = PROJECT_ART[next.id];

  return (
    <article className="pj shell pt-6 md:pt-10">
      <header className={`pj-hero pastel-${project.area}`}>
        <div className="pj-hero-text">
          <p>
            <Link
              href={localePath(locale, "/work")}
              prefetch={prefetchFor(localePath(locale, "/work"))}
              className="pj-back"
            >
              <span aria-hidden="true">←</span>
              {nobr(dict.project.back)}
            </Link>
          </p>
          <div>
            <h1 className="pj-title">
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
            <p className="pj-tagline">{nobr(t(project.tagline, locale))}</p>
          </div>
        </div>
        {art ? (
          <div className="pj-hero-art" aria-hidden="true">
            <Art name={art} className="pj-art-ink" />
          </div>
        ) : null}
      </header>

      <dl className="pj-facts">
        {facts.map((f) => (
          <div key={f.label} className="pj-fact">
            <dt className="readout">{nobr(f.label)}</dt>
            <dd>{typeof f.value === "string" ? nobr(f.value) : f.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="outcomes-title" className={`pj-section pastel-${project.area}`}>
        <h2 id="outcomes-title" className="pj-h2">
          {nobr(dict.project.outcomes)}
        </h2>
        <ol className="pj-outcomes">
          {project.outcomes.map((o, n) => (
            <li key={o.text.en} className="pj-outcome">
              <span aria-hidden="true" className="pj-num tabular">
                {String(n + 1).padStart(2, "0")}
              </span>
              <span>{nobr(t(o.text, locale))}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="stack-title" className="pj-section">
        <h2 id="stack-title" className="pj-h2">
          {nobr(dict.project.stack)}
        </h2>
        <ul className="pj-pills">
          {project.stack.map((s) => (
            <li key={s} className="pj-pill">
              {s}
            </li>
          ))}
        </ul>
      </section>

      {links.length > 0 && (
        <section aria-labelledby="links-title" className="pj-section">
          <h2 id="links-title" className="pj-h2">
            {nobr(dict.project.links)}
          </h2>
          <ul className="pj-links">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="pj-linkbtn" rel="noopener" target="_blank">
                  {l.label}
                  <span aria-hidden="true" className="pj-ext">
                    ↗
                  </span>
                  <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PlateSection projectId={project.id} projectName={project.name} locale={locale} />

      {caseStudy && (
        <section data-case-study aria-labelledby="case-title" className="pj-section">
          <h2 id="case-title" className="pj-h2">
            {nobr(dict.work.caseStudy.heading)}
          </h2>
          <div className="pj-body grid gap-8">
            <CaseBlock label={dict.work.caseStudy.context}>
              <p className="mt-2 text-lg">{nobr(t(caseStudy.context, locale))}</p>
            </CaseBlock>
            {caseStudy.scope && (
              <CaseBlock label={dict.work.caseStudy.scope}>
                <p className="mt-2">{nobr(t(caseStudy.scope, locale))}</p>
              </CaseBlock>
            )}
            <CaseBlock label={dict.work.caseStudy.approach}>
              <ul className="mt-2 grid gap-3">
                {tList(caseStudy.approach, locale).map((a) => (
                  <li key={a} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.8em] h-px w-3 shrink-0 bg-ink-3" />
                    <span>{nobr(a)}</span>
                  </li>
                ))}
              </ul>
            </CaseBlock>
            {caseStudy.validation && (
              <CaseBlock label={dict.work.caseStudy.validation}>
                <p className="mt-2">{nobr(t(caseStudy.validation, locale))}</p>
              </CaseBlock>
            )}
            <CaseBlock label={dict.work.caseStudy.result}>
              <p className="mt-2">{nobr(t(caseStudy.result, locale))}</p>
            </CaseBlock>
            <CaseBlock label={dict.work.caseStudy.limits}>
              <p className="mt-2 text-ink-2">{nobr(t(caseStudy.limits, locale))}</p>
            </CaseBlock>
          </div>
        </section>
      )}

      <CaseCta locale={locale} dict={dict} />

      {next.id !== project.id && (
        <nav aria-label={plain(dict.project.next)} className="pj-next-wrap">
          <Link href={localePath(locale, `/work/${next.slug}`)} className={`pj-next pastel-${next.area}`}>
            <span className="pj-next-text">
              <span className="readout pj-next-label">
                {nobr(dict.project.next)} <span aria-hidden="true">→</span>
              </span>
              <span className="pj-next-name">{next.name}</span>
              <span className="pj-next-tagline">{nobr(t(next.tagline, locale))}</span>
            </span>
            {nextArt ? (
              <span className="pj-next-art" aria-hidden="true">
                <Art name={nextArt} className="pj-art-ink" />
              </span>
            ) : null}
          </Link>
        </nav>
      )}

      <JsonLd data={projectJsonLd(project, locale)} />
    </article>
  );
}

function CaseBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-normal text-ink-3">{nobr(label)}</h3>
      {children}
    </div>
  );
}

function PlateSection({ projectId, projectName, locale }: { projectId: string; projectName: string; locale: Locale }) {
  if (!getPlateSpec(projectId)) return null;
  const dict = getDictionary(locale);
  return (
    <section aria-labelledby="architecture-title" className="pj-section pj-section-wide">
      <h2 id="architecture-title" className="pj-h2">
        {nobr(dict.work.architecture)}
      </h2>
      <PlateFrame {...getV3(locale).moreWork.plate}>
        <ProjectPlate
          projectId={projectId}
          projectName={projectName}
          locale={locale}
          dict={dict}
          idPrefix="page-plate"
        />
      </PlateFrame>
    </section>
  );
}
