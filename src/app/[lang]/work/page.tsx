import type { Metadata } from "next";
import { projects } from "@/content";
import type { Locale, Project } from "@/content/schema";
import { getDictionary } from "@/i18n/dictionaries";
import { getV3 } from "@/i18n/v3";
import { alternates } from "@/lib/site-url";
import { nobr } from "@/lib/thai-nodes";
import { Work } from "@/components/sections/work";
import { Doodle, projectDoodle } from "@/components/doodles/doodle";
import { WorkCards } from "@/components/v3/more-work/work-cards";
import { DrawPath } from "@/motion/draw-path";

/** Card order on /work: area pastels alternate like a checkerboard (no two tools cards touch). */
const CARDS = ["proj-yimwhan", "proj-helm", "proj-visual-qa", "proj-anymind-ec", "proj-ronglen", "proj-cadence"];

export async function generateMetadata({ params }: PageProps<"/[lang]/work">): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const page = getV3(locale).moreWork.page;
  return { title: page.title, description: page.description, alternates: alternates("/work", locale) };
}

/** The /work index (D5): every public system as a card, then the full sortable ledger. */
export default async function WorkIndex({ params }: PageProps<"/[lang]/work">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const v3 = getV3(locale);
  const page = v3.moreWork.page;
  const ids = [...CARDS, ...projects.map((p) => p.id).filter((id) => !CARDS.includes(id))].filter((id) =>
    projects.some((p) => p.id === id),
  );
  const areas = (Object.keys(dict.areas) as Project["area"][])
    .map((area) => ({ area, count: projects.filter((p) => p.area === area).length }))
    .filter((a) => a.count > 0);

  return (
    <>
      <div className="shell pt-8 md:pt-14">
        <header className="wi-head">
          <div className="wi-title-col">
            <h1 className="wi-title">
              <span className="wi-title-word">
                {nobr(page.heading)}
                <DrawPath
                  d="M4 15C52 7 104 5 160 9s120 10 176 4 52-4 60-3"
                  viewBox="0 0 400 22"
                  className="wi-underline"
                  strokeWidth={5}
                  ms={1100}
                  delay={200}
                />
              </span>
            </h1>
            <ul className="wi-areas" aria-label={dict.work.filterLabel}>
              {areas.map(({ area, count }) => (
                <li key={area} className={`wi-area pastel-${area}`}>
                  {nobr(dict.areas[area])} <span className="tabular wi-area-count">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="wi-intro">{nobr(page.intro)}</p>
        </header>

        <section id="systems" aria-labelledby="systems-title">
          <h2 id="systems-title" className="sr-only">
            {nobr(page.cards)}
          </h2>
          <WorkCards locale={locale} dict={dict} v3={v3} ids={ids} label={page.cards} reveal />
        </section>
      </div>

      <Work
        locale={locale}
        dict={dict}
        sectionId="index"
        title={page.index}
        className="shell pt-20 md:pt-28"
        renderIcon={(id) => {
          const name = projectDoodle(id);
          return name ? <Doodle name={name} className="size-full" /> : null;
        }}
      />
    </>
  );
}
