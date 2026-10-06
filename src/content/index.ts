import { site } from "./site";
import type { Locale, Localized, LocalizedList, Project } from "./schema";

export type { Locale, Localized, LocalizedList } from "./schema";
export { locales, defaultLocale } from "./schema";

/** Resolve a localized field, falling back to English when a translation is missing. */
export function t(value: Localized, locale: Locale): string {
  return (locale === "th" && value.th) || value.en;
}

export function tList(value: LocalizedList, locale: Locale): string[] {
  return (locale === "th" && value.th) || value.en;
}

const isPublic = <T extends { visibility: "public" | "hidden" }>(item: T) => item.visibility === "public";

export const profile = site.profile;
export const practices = site.practices;
export const skills = site.skills;
export const education = site.education;
export const languages = site.languages;

export const experience = site.experience.filter(isPublic);
export const projects = site.projects.filter(isPublic);
export const featuredProjects = projects.filter((p) => p.featured);
export const links = site.links.filter(isPublic);
export const personal = site.personal.visibility === "public" ? site.personal.lines : [];
export const availability = site.profile.availability.visibility === "public" ? site.profile.availability : null;

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/** Whole years since the first production role. Computed so the copy never goes stale. */
export function yearsInProduction(now: Date = new Date()): number {
  const [y, m] = site.profile.careerStart.split("-").map(Number);
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return Math.floor(months / 12);
}

export const lastUpdated = site.meta.updated;
