import { z } from "zod";

/**
 * Single typed source for every word the site prints.
 *
 * Rules enforced here (and by tests):
 * - Every claim carries provenance back to the private claims ledger. Provenance is
 *   never rendered; it exists so any sentence on the site can be traced.
 * - `visibility: "hidden"` entries stay in the data but never ship to the page.
 * - Thai is optional per field; rendering falls back to English.
 */

export const locales = ["en", "th"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const nonEmpty = z.string().trim().min(1);

export const localized = z.object({ en: nonEmpty, th: nonEmpty.optional() });
export type Localized = z.infer<typeof localized>;

const localizedList = z.object({
  en: z.array(nonEmpty).min(1),
  th: z.array(nonEmpty).min(1).optional(),
});
export type LocalizedList = z.infer<typeof localizedList>;

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "expected YYYY-MM");

export const visibility = z.enum(["public", "hidden"]);
export type Visibility = z.infer<typeof visibility>;

export const provenance = z.object({
  claimId: nonEmpty,
  source: nonEmpty,
  confidence: z.enum(["VERIFIED", "STATED", "APPROVED"]),
});

const claim = z.object({ text: localized, provenance });
export type Claim = z.infer<typeof claim>;

export const link = z.object({
  kind: z.enum(["email", "linkedin", "github", "website", "live", "repo"]),
  label: nonEmpty,
  href: z.string().regex(/^(https:\/\/|mailto:)/, "links must be https or mailto"),
  visibility,
});
export type Link = z.infer<typeof link>;

export const profile = z.object({
  name: nonEmpty,
  /** Full name as written in each language (Thai script on /th). */
  displayName: localized,
  preferredName: nonEmpty,
  handle: nonEmpty,
  role: localized,
  /** Full headline (role, stack, focus): the /cv role line and the meta descriptions. */
  headline: localized,
  heroLine: localized,
  oneLiner: localized,
  bioShort: localized,
  bioLong: localizedList,
  location: z.object({
    city: localized,
    country: localized,
    timezone: nonEmpty,
    remote: z.boolean(),
  }),
  careerStart: yearMonth,
  availability: z.object({
    visibility,
    employment: localized.optional(),
    studio: localized.optional(),
    /** The studio's site for project enquiries, per locale (role enquiries stay direct email). */
    studioUrl: z
      .object({
        en: z.string().regex(/^https:\/\//),
        th: z
          .string()
          .regex(/^https:\/\//)
          .optional(),
      })
      .optional(),
  }),
});
export type Profile = z.infer<typeof profile>;

export const experience = z.object({
  id: nonEmpty,
  org: z.object({ name: nonEmpty, confidential: z.boolean().optional() }),
  title: localized,
  type: z.enum(["founder", "full-time", "part-time-contract"]),
  start: yearMonth,
  end: z.union([yearMonth, z.literal("present")]),
  location: localized,
  summary: localized,
  highlights: z.array(claim),
  stack: z.array(nonEmpty),
  visibility,
});
export type Experience = z.infer<typeof experience>;

/** Context, my part in it, how the work ran, how it was checked, what came of it and the limits. */
export const caseStudy = z.object({
  context: localized,
  scope: localized.optional(),
  approach: localizedList,
  validation: localized.optional(),
  result: localized,
  limits: localized,
});
export type CaseStudy = z.infer<typeof caseStudy>;

export const project = z.object({
  id: nonEmpty,
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: nonEmpty,
  /** Other names people search for (e.g. the Thai name). Never rendered as copy. */
  aliases: z.array(nonEmpty).default([]),
  tagline: localized,
  kind: z.enum(["product", "internal-tool", "side-project", "platform"]),
  area: z.enum(["ai", "commerce", "tools", "games"]),
  status: z.enum(["live", "internal", "pilot", "delivered", "archived"]),
  period: z.object({ start: yearMonth, end: z.union([yearMonth, z.literal("present")]).optional() }),
  role: localized,
  stack: z.array(nonEmpty).min(1),
  outcomes: z.array(claim).min(1),
  links: z.array(link),
  experienceId: z.string().optional(),
  confidentiality: z.enum(["C0-public-artifact", "C1-description-only", "C2-bounded", "C3-private"]),
  featured: z.boolean(),
  /** Long-form write-up; ships only when `caseStudyVisibility` is public. */
  caseStudy: caseStudy.optional(),
  caseStudyVisibility: visibility.default("hidden"),
  visibility,
});
export type Project = z.infer<typeof project>;

export const practice = z.object({ id: nonEmpty, title: localized, text: localized, provenance });
export type Practice = z.infer<typeof practice>;

export const skillGroup = z.object({
  id: nonEmpty,
  label: localized,
  items: z.array(z.union([nonEmpty, localized])).min(1),
});
export type SkillGroup = z.infer<typeof skillGroup>;

export const education = z.object({
  school: localized,
  degree: localized,
  start: z.string().regex(/^\d{4}$/),
  end: z.string().regex(/^\d{4}$/),
});
export type Education = z.infer<typeof education>;

export const language = z.object({ name: localized, level: localized });
export type Language = z.infer<typeof language>;

export const siteContent = z
  .object({
    meta: z.object({ updated: yearMonth, claimsLedger: nonEmpty }),
    profile,
    practices: z.array(practice).min(1),
    experience: z.array(experience).min(1),
    projects: z.array(project).min(1),
    skills: z.array(skillGroup).min(1),
    education: z.array(education),
    languages: z.array(language),
    links: z.array(link).min(1),
    personal: z.object({ visibility, lines: z.array(localized) }),
  })
  .superRefine((content, ctx) => {
    const ids = new Set<string>();
    for (const item of [...content.experience, ...content.projects]) {
      if (ids.has(item.id)) ctx.addIssue({ code: "custom", message: `duplicate id ${item.id}` });
      ids.add(item.id);
    }
    const slugs = new Set<string>();
    for (const p of content.projects) {
      if (slugs.has(p.slug)) ctx.addIssue({ code: "custom", message: `duplicate slug ${p.slug}` });
      slugs.add(p.slug);
      if (p.experienceId && !content.experience.some((e) => e.id === p.experienceId)) {
        ctx.addIssue({ code: "custom", message: `${p.id} points at unknown experience ${p.experienceId}` });
      }
      if (p.confidentiality === "C3-private" && p.visibility === "public") {
        ctx.addIssue({ code: "custom", message: `${p.id} is C3-private but public` });
      }
    }
  });
export type SiteContent = z.infer<typeof siteContent>;
export type SiteContentInput = z.input<typeof siteContent>;
