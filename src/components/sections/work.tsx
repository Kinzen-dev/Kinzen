import type { ReactNode } from "react";
import type { Locale, Project } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { Ledger } from "../work/ledger";
import { ledgerLabels, ledgerRows } from "../work/rows";
import { ProjectPlate, getPlateSpec } from "../plates";
import { SectionHeader } from "./section-header";

export { yearLabel } from "../work/rows";

export function StatusMark({ status, dict }: { status: Project["status"]; dict: Dictionary }) {
  const live = status === "live" || status === "in-production";
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={live ? "size-1.5 rounded-full bg-gold" : "size-1.5 rounded-full border border-ink-3"}
      />
      {dict.status[status]}
    </span>
  );
}

/**
 * Works ledger: a real table of public systems with sort, stable filters and rows
 * that open in place. `renderIcon` (optional) adds a per-project icon, e.g. a doodle.
 */
export function Work({
  locale,
  dict,
  renderIcon,
}: {
  locale: Locale;
  dict: Dictionary;
  renderIcon?: (projectId: string) => ReactNode;
}) {
  const rows = ledgerRows(locale, dict);

  const areas = (Object.keys(dict.areas) as Project["area"][])
    .map((id) => ({ id, label: dict.areas[id], count: rows.filter((r) => r.area === id).length }))
    .filter((a) => a.count > 0);

  const plates: Record<string, ReactNode> = {};
  const icons: Record<string, ReactNode> = {};
  for (const row of rows) {
    if (getPlateSpec(row.id)) {
      plates[row.id] = (
        <ProjectPlate
          projectId={row.id}
          projectName={row.name}
          locale={locale}
          dict={dict}
          idPrefix={`ledger-plate-${row.slug}`}
        />
      );
    }
    const icon = renderIcon?.(row.id);
    if (icon) icons[row.id] = icon;
  }

  return (
    <section id="work" aria-labelledby="work-title" className="shell pt-20 md:pt-28">
      <SectionHeader id="work" title={dict.sections.work} intro={dict.sections.workIntro} />
      <Ledger rows={rows} labels={ledgerLabels(dict)} areas={areas} plates={plates} icons={icons} />
    </section>
  );
}
