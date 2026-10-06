import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { Locale } from "@/content/schema";
import { education, experience, languages, links, profile, projects, skillItems, skills, t } from "@/content";
import { getDictionary } from "@/i18n/dictionaries";
import { alternates, localePath, SITE_URL } from "@/lib/site-url";
import { monthYear } from "@/components/timeline/format";
import { PrintButton } from "./print-button";
import "./cv.css";
import { inlineList } from "@/lib/text";

export async function generateMetadata({ params }: PageProps<"/[lang]/cv">): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  return {
    title: dict.cv.title,
    description: dict.cv.description,
    alternates: { ...alternates("/cv"), canonical: localePath(locale, "/cv") },
  };
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`cv-${id}`} className="cv-section">
      <h2 id={`cv-${id}`} className="cv-h2">
        {title}
      </h2>
      <div className="cv-body">{children}</div>
    </section>
  );
}

function displayUrl(href: string) {
  return href.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export default async function CvPage({ params }: PageProps<"/[lang]/cv">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const email = links.find((l) => l.kind === "email");
  const linkedin = links.find((l) => l.kind === "linkedin");
  const range = (start: string, end?: string) => {
    const from = monthYear(start, locale);
    if (!end) return from;
    const to = end === "present" ? dict.cv.present : monthYear(end, locale);
    return from === to ? from : `${from} → ${to}`;
  };
  const place =
    locale === "th"
      ? `${t(profile.location.city, locale)} ${t(profile.location.country, locale)}`
      : `${t(profile.location.city, locale)}, ${t(profile.location.country, locale)}`;

  return (
    <article data-cv className="cv shell">
      <header className="cv-head">
        <div className="cv-id">
          <h1 className="cv-name">{t(profile.displayName, locale)}</h1>
          {locale === "th" ? <p className="cv-alt-name">{profile.name}</p> : null}
          <p className="cv-role">{t(profile.role, locale)}</p>
        </div>
        <div className="cv-print-action">
          <PrintButton label={dict.cv.print} />
        </div>
        <p className="cv-lede">{t(profile.oneLiner, locale)}</p>
        <ul className="cv-contact" aria-label={dict.cv.contact}>
          <li>
            {place}
            {profile.location.remote ? ` (${dict.cv.remote})` : null}
          </li>
          {email ? (
            <li>
              <a href={email.href} className="link">
                {email.label}
              </a>
            </li>
          ) : null}
          {linkedin ? (
            <li>
              <a href={linkedin.href} className="link" rel="me">
                {displayUrl(linkedin.href)}
              </a>
            </li>
          ) : null}
          <li>
            <a href={SITE_URL} className="link">
              {displayUrl(SITE_URL)}
            </a>
          </li>
        </ul>
      </header>

      <Section id="experience" title={dict.cv.experience}>
        <ol className="cv-list">
          {experience.map((era) => (
            <li key={era.id} className="cv-entry">
              <div className="cv-entry-head">
                <h3 className="cv-entry-title">{t(era.title, locale)}</h3>
                <p className="cv-dates readout">{range(era.start, era.end)}</p>
              </div>
              <p className="cv-meta">
                {era.org.name}
                <span className="text-ink-3"> / </span>
                {t(era.location, locale)}
              </p>
              <ul className="cv-points">
                {era.highlights.map((h) => (
                  <li key={h.text.en.slice(0, 24)}>{t(h.text, locale)}</li>
                ))}
              </ul>
              <p className="cv-stack readout">
                <span className="sr-only">{dict.cv.stack}: </span>
                {inlineList(era.stack)}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="projects" title={dict.cv.projects}>
        <ul className="cv-list">
          {projects.map((p) => (
            <li key={p.id} className="cv-entry">
              <div className="cv-entry-head">
                <h3 className="cv-entry-title">{p.name}</h3>
                <p className="cv-dates readout">{range(p.period.start, p.period.end)}</p>
              </div>
              <p className="cv-text">{t(p.tagline, locale)}</p>
              <p className="cv-stack readout">
                <span className="sr-only">{dict.cv.stack}: </span>
                {inlineList(p.stack)}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="skills" title={dict.cv.skills}>
        <dl className="cv-skills">
          {skills.map((group) => (
            <div key={group.id} className="cv-skill-row">
              <dt>{t(group.label, locale)}</dt>
              <dd>{inlineList(skillItems(group, locale))}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="education" title={dict.cv.education}>
        {education.map((e) => (
          <div key={e.school.en} className="cv-entry-head">
            <p>
              <span className="cv-entry-title">{t(e.degree, locale)}</span>
              <span className="cv-meta block">{t(e.school, locale)}</span>
            </p>
            <p className="cv-dates readout">
              {e.start} → {e.end}
            </p>
          </div>
        ))}
      </Section>

      <Section id="languages" title={dict.cv.languages}>
        <ul className="cv-langs">
          {languages.map((l) => (
            <li key={l.name.en}>
              {t(l.name, locale)} <span className="cv-meta">({t(l.level, locale)})</span>
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}
