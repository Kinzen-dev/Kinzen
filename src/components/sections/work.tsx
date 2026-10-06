import type { ReactNode } from "react";
import type { Locale, Project } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { Ledger } from "../work/ledger";
import { ledgerLabels, ledgerRows } from "../work/rows";
import { ProjectPlate, getPlateSpec } from "../plates";
import { SectionHeader } from "./section-header";
import { plain } from "@/lib/thai";

export { yearLabel } from "../work/rows";

export function StatusMark({ status, dict }: { status: Project["status"]; dict: Dictionary }) {
  const live = status === "live" || status === "in-production";
  return (
    // Plain inline (not inline-flex): an empty first flex item would set the baseline at its
    // bottom edge and drop the label a few pixels below its neighbours.
    <span className="whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`mr-2 inline-block size-1.5 rounded-full align-middle ${live ? "bg-gold" : "border border-ink-3"}`}
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
  sectionId = "work",
}: {
  locale: Locale;
  dict: Dictionary;
  renderIcon?: (projectId: string) => ReactNode;
  /** Anchor id of the section (the /work index and the home page use different ones). */
  sectionId?: string;
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
    <section id={sectionId} aria-labelledby={`${sectionId}-title`} className="shell pt-16 md:pt-20">
      <SectionHeader id={sectionId} title={plain(dict.sections.work)} intro={dict.sections.workIntro} />
      <Ledger rows={rows} labels={ledgerLabels(dict)} areas={areas} plates={plates} icons={icons} />
    </section>
  );
}
