import type { Locale, Project } from "@/content/schema";
import { education, experience, lastUpdated, links, profile, skills, t } from "@/content";
import { SITE_URL, localePath } from "./site-url";

/**
 * schema.org structured data built from the content module only. Rendered as
 * <script type="application/ld+json"> with `<` escaped (see Next's JSON-LD guide).
 */
type Json = Record<string, unknown>;

const PERSON_ID = `${SITE_URL}/#person`;
const abs = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;
const inLanguage = (locale: Locale) => (locale === "th" ? "th-TH" : "en");

export function JsonLd({ data }: { data: Json }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

function person(locale: Locale): Json {
  const studio = experience.find((e) => e.type === "founder" && e.end === "present");
  const email = links.find((l) => l.kind === "email");
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: profile.name,
    alternateName: [profile.preferredName, profile.handle, profile.displayName.th].filter(Boolean),
    jobTitle: t(profile.role, locale),
    description: t(profile.oneLiner, locale),
    url: abs(localePath(locale, "/")),
    image: abs(localePath(locale, "/og.png")),
    ...(email ? { email: email.href } : {}),
    sameAs: links
      .filter((l) => l.kind === "linkedin" || l.kind === "github" || l.kind === "website")
      .map((l) => l.href),
    ...(studio ? { worksFor: { "@type": "Organization", name: studio.org.name } } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: profile.location.city.en,
      addressCountry: "TH",
    },
    alumniOf: education.map((e) => ({ "@type": "CollegeOrUniversity", name: t(e.school, locale) })),
    knowsAbout: skills.flatMap((s) => s.items),
    knowsLanguage: ["th", "en"],
  };
}

/** Home page: ProfilePage whose main entity is the Person. */
export function profilePageJsonLd(locale: Locale, title: string): Json {
  const url = abs(localePath(locale, "/"));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${url}#page`,
        url,
        name: title,
        inLanguage: inLanguage(locale),
        dateModified: lastUpdated,
        mainEntity: { "@id": PERSON_ID },
      },
      person(locale),
    ],
  };
}

/** Project page: a CreativeWork created by the Person. */
export function projectJsonLd(project: Project, locale: Locale): Json {
  const url = abs(localePath(locale, `/work/${project.slug}`));
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${url}#work`,
    name: project.name,
    description: t(project.tagline, locale),
    url,
    image: abs(localePath(locale, `/work/${project.slug}/og.png`)),
    inLanguage: inLanguage(locale),
    dateCreated: project.period.start,
    keywords: project.stack.join(", "),
    creator: { "@type": "Person", "@id": PERSON_ID, name: profile.name, url: abs(localePath(locale, "/")) },
  };
}
