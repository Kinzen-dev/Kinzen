import type { Locale, Project } from "@/content/schema";
import { projects, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath } from "@/lib/site-url";

/**
 * Plain, serialisable rows for the client ledger. Built on the server so that
 * provenance, hidden fields and the case study never reach the client payload.
 */
export interface LedgerRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  area: Project["area"];
  areaLabel: string;
  stack: string[];
  year: string;
  /** YYYY-MM of the start, for sorting. */
  start: string;
  /** Recency key for "Year" sorting: ongoing work first, then by end, then by start. */
  recency: string;
  status: Project["status"];
  statusLabel: string;
  live: boolean;
  role: string;
  outcomes: string[];
  links: { label: string; href: string }[];
  href: string;
}

export interface LedgerLabels {
  newTab: string;
  caption: string;
  name: string;
  area: string;
  stack: string;
  year: string;
  status: string;
  sortBy: string;
  filterAll: string;
  open: string;
  close: string;
  openProject: string;
  outcomes: string;
  role: string;
  links: string;
  filterLabel: string;
  showing: string;
  details: string;
}

/** "May 2026 → present", "Jul → Aug 2026", "Jul 2026": months make the Year sort legible. */
export function yearLabel(p: Project, dict: Dictionary, locale: Locale = "en") {
  const fmt = (ym: string, withYear = true) => {
    const [y, m] = ym.split("-").map(Number);
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-gregory" : "en-GB", {
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    }).format(Date.UTC(y, m - 1, 1));
  };
  const { start, end } = p.period;
  if (!end) return fmt(start);
  if (end === "present") return `${fmt(start)} → ${dict.ledger.present}`;
  if (end === start) return fmt(start);
  if (end.slice(0, 4) === start.slice(0, 4)) return `${fmt(start, false)} → ${fmt(end)}`;
  return `${fmt(start)} → ${fmt(end)}`;
}

export const isLive = (status: Project["status"]) => status === "live" || status === "in-production";

export function workPath(locale: Locale, slug: string) {
  return localePath(locale, `/work/${slug}`);
}

export function ledgerRows(locale: Locale, dict: Dictionary): LedgerRow[] {
  return projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: t(p.tagline, locale),
    area: p.area,
    areaLabel: dict.areas[p.area],
    stack: p.stack,
    year: yearLabel(p, dict, locale),
    start: p.period.start,
    recency: `${p.period.end === "present" ? "9999-12" : (p.period.end ?? p.period.start)}|${p.period.start}`,
    status: p.status,
    statusLabel: dict.status[p.status],
    live: isLive(p.status),
    role: t(p.role, locale),
    outcomes: p.outcomes.map((o) => t(o.text, locale)),
    links: p.links.filter((l) => l.visibility === "public").map((l) => ({ label: l.label, href: l.href })),
    href: workPath(locale, p.slug),
  }));
}

export function ledgerLabels(dict: Dictionary): LedgerLabels {
  const l = dict.ledger;
  return {
    newTab: dict.a11y.newTab,
    caption: l.caption,
    name: l.name,
    area: l.area,
    stack: l.stack,
    year: l.year,
    status: l.status,
    sortBy: l.sortBy,
    filterAll: l.filterAll,
    open: l.open,
    close: l.close,
    openProject: l.openProject,
    outcomes: l.outcomes,
    role: l.role,
    links: l.links,
    filterLabel: dict.work.filterLabel,
    showing: dict.work.showing,
    details: dict.work.details,
  };
}
