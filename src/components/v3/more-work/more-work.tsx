import Link from "next/link";
import { projects } from "@/content";
import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import type { V3Copy } from "@/i18n/v3";
import { localePath } from "@/lib/site-url";
import { nobr } from "@/lib/thai-nodes";
import { WorkCards } from "./work-cards";

/** Home cards, in collage order: the two tools cards sit on a diagonal, never side by side. */
export const HOME_CARDS = ["proj-anymind-ec", "proj-visual-qa", "proj-cadence", "proj-ronglen"];

/**
 * More work (ticket v3-06): the systems without a scene of their own, as big pastel cards that
 * scatter into place on scroll (phones: a carousel), plus the way into the full /work index.
 */
export function MoreWork({ locale, dict, v3 }: { locale: Locale; dict: Dictionary; v3: V3Copy }) {
  const copy = v3.moreWork;
  return (
    <div className="shell pt-20 md:pt-28" aria-labelledby="more-work-title" role="group">
      <div className="mw-head" data-reveal>
        <div>
          <h3 id="more-work-title" className="mw-title">
            {nobr(copy.title)}
          </h3>
          <p className="mw-intro">{nobr(copy.intro)}</p>
        </div>
        <div className="mw-all-wrap">
          <Link href={localePath(locale, "/work")} className="mw-all">
            {nobr(copy.allSystems)}
            <span aria-hidden="true" className="mw-arrow">
              →
            </span>
          </Link>
          <p className="readout">{nobr(copy.allSystemsHint.replace("{count}", String(projects.length)))}</p>
        </div>
      </div>
      <WorkCards locale={locale} dict={dict} v3={v3} ids={HOME_CARDS} heading="h4" scatter label={copy.title} />
    </div>
  );
}
