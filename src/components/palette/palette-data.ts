import { experience, links, projects, skillItems, skills, t } from "@/content";
import type { Locale } from "@/content/schema";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { localePath } from "@/lib/site-url";

export type PaletteAction = "print-cv" | "copy-email" | "toggle-theme" | "switch-language";

export type PaletteCommand = {
  id: string;
  group: "sections" | "projects" | "actions";
  label: string;
  hint?: string;
  /** Extra words the fuzzy matcher looks at (both languages, so "cv" works on /th). */
  keywords: string;
  href?: string;
  action?: PaletteAction;
};

export type PaletteData = {
  locale: Locale;
  otherLocale: Locale;
  email: string | null;
  cvPath: string;
  commands: PaletteCommand[];
  labels: Dictionary["palette"] & { trigger: string };
};

const SECTIONS = ["work", "experience", "practice", "about", "contact"] as const;

/** Plain, serializable palette data built on the server from the content module. */
export function paletteData(locale: Locale, dict: Dictionary): PaletteData {
  const en = getDictionary("en");
  const th = getDictionary("th");
  const home = localePath(locale, "/");
  const anchor = (id: string) => (home === "/" ? `/#${id}` : `${home}#${id}`);
  const email = links.find((l) => l.kind === "email")?.href.replace(/^mailto:/, "") ?? null;
  const both = (pick: (d: Dictionary) => string) => `${pick(en)} ${pick(th)}`;

  // Searching a stack name ("NestJS", "Kafka") must land somewhere real: index the
  // experience eras and the tools under their sections.
  const extra: Partial<Record<(typeof SECTIONS)[number], string>> = {
    experience: experience
      .map((e) => `${e.org.name} ${e.title.en} ${e.stack.join(" ")} ${e.highlights.map((h) => h.text.en).join(" ")}`)
      .join(" "),
  };
  const sections: PaletteCommand[] = SECTIONS.map((id) => ({
    id: `section-${id}`,
    group: "sections",
    label: dict.nav[id],
    keywords: `${both((d) => d.nav[id])} ${id} ${extra[id] ?? ""}`,
    href: anchor(id),
  }));
  sections.push({
    id: "section-skills",
    group: "sections",
    label: dict.sections.skills,
    keywords: `${both((d) => d.sections.skills)} skills stack tools ${skills
      .flatMap((g) => [...skillItems(g, "en"), ...skillItems(g, "th")])
      .join(" ")}`,
    href: anchor("skills"),
  });

  const work: PaletteCommand[] = projects.map((p) => ({
    id: `project-${p.slug}`,
    group: "projects",
    label: p.name,
    hint: dict.palette.projectHint,
    keywords: `${p.slug} ${p.aliases.join(" ")} ${p.stack.join(" ")} ${t(p.tagline, locale)} ${p.tagline.en} ${both((d) => d.palette.groups.projects)}`,
    href: localePath(locale, `/work/${p.slug}`),
  }));

  const actions: PaletteCommand[] = [
    {
      id: "open-cv",
      group: "actions",
      label: dict.palette.openCv,
      keywords: `${both((d) => d.palette.openCv)} resume`,
      href: localePath(locale, "/cv"),
    },
    {
      id: "print-cv",
      group: "actions",
      label: dict.palette.printCv,
      keywords: `${both((d) => d.palette.printCv)} pdf resume`,
      action: "print-cv",
    },
    ...(email
      ? [
          {
            id: "copy-email",
            group: "actions" as const,
            label: dict.palette.copyEmail,
            hint: email,
            keywords: `${both((d) => d.palette.copyEmail)} mail contact`,
            action: "copy-email" as const,
          },
        ]
      : []),
    {
      id: "toggle-theme",
      group: "actions",
      label: dict.a11y.themeToggle,
      keywords: `${both((d) => d.a11y.themeToggle)} ${both((d) => d.palette.themeLight)} ${both((d) => d.palette.themeDark)} theme dark light`,
      action: "toggle-theme",
    },
    {
      id: "switch-language",
      group: "actions",
      label: dict.palette.switchLanguage,
      keywords: `${both((d) => d.palette.switchLanguage)} language English ไทย Thai ${both((d) => d.a11y.languageSwitch)}`,
      action: "switch-language",
    },
  ];

  return {
    locale,
    otherLocale: locale === "en" ? "th" : "en",
    email,
    cvPath: localePath(locale, "/cv"),
    commands: [...sections, ...work, ...actions],
    labels: { ...dict.palette, trigger: dict.a11y.openPalette },
  };
}
