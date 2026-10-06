import type { Locale } from "@/content/schema";
import { projects, t } from "@/content";
import type { Project } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { SectionHeader } from "./section-header";

export function yearLabel(p: Project, dict: Dictionary) {
  const start = p.period.start.slice(0, 4);
  const end = p.period.end;
  if (!end) return start;
  if (end === "present") return `${start} → ${dict.ledger.present}`;
  const endYear = end.slice(0, 4);
  return endYear === start ? start : `${start} → ${endYear}`;
}

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

/** Static ledger of public systems. Interaction (sort, filter, open in place) layers on top. */
export function Work({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section id="work" aria-labelledby="work-title" className="shell pt-20 md:pt-28">
      <SectionHeader id="work" title={dict.sections.work} intro={dict.sections.workIntro} />

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{dict.ledger.caption}</caption>
        <thead className="readout">
          <tr className="border-b border-rule-strong">
            <th scope="col" className="py-3 pr-4 font-normal">
              {dict.ledger.name}
            </th>
            <th scope="col" className="hidden py-3 pr-4 font-normal md:table-cell">
              {dict.ledger.area}
            </th>
            <th scope="col" className="hidden py-3 pr-4 font-normal lg:table-cell">
              {dict.ledger.stack}
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              {dict.ledger.year}
            </th>
            <th scope="col" className="hidden py-3 font-normal sm:table-cell">
              {dict.ledger.status}
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-rule align-top">
              <th scope="row" className="py-5 pr-4 font-normal">
                <span className="block text-lg font-semibold tracking-[-0.025em]">{p.name}</span>
                <span className="mt-1 block max-w-[52ch] text-sm text-ink-2">{t(p.tagline, locale)}</span>
              </th>
              <td className="hidden py-5 pr-4 text-sm text-ink-2 md:table-cell">{dict.areas[p.area]}</td>
              <td className="readout hidden max-w-[28ch] py-5 pr-4 lg:table-cell">{p.stack.slice(0, 4).join(", ")}</td>
              <td className="readout py-5 pr-4 whitespace-nowrap">{yearLabel(p, dict)}</td>
              <td className="hidden py-5 text-sm sm:table-cell">
                <StatusMark status={p.status} dict={dict} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
