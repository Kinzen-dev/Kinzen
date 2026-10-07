import Link from "next/link";
import type { Locale } from "@/content/schema";
import { projects, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import type { V3Copy } from "@/i18n/v3";
import { localePath } from "@/lib/site-url";
import { nobr } from "@/lib/thai-nodes";
import { Art } from "@/components/art/art";
import { AgentDemo } from "@/components/agent-demo/agent-demo";
import { YimwhanStage } from "./yimwhan-stage";
import "./yimwhan.css";

/**
 * Yimwhan AI showcase (ticket v3-04): a navy scene card inside the page gutter. Intro with the
 * desk illustration, a five-beat sticky story (patient message to logged safe reply, coded
 * mockups with fictional data), then the interactive guard demo as the finale.
 */
export function YimwhanScene({ locale, v3 }: { locale: Locale; dict: Dictionary; v3: V3Copy }) {
  const copy = v3.yimwhan;
  const project = projects.find((p) => p.id === "proj-yimwhan");
  if (!project) return null;
  // The gold sweep passes over the last word of the name ("AI").
  const cut = project.name.lastIndexOf(" ");
  const head = project.name.slice(0, cut);
  const tail = project.name.slice(cut + 1);

  return (
    <div className="shell">
      <article id="yimwhan" aria-labelledby="yimwhan-title" data-scene="dark" className="yw scene-card pastel-ai">
        <header className="yw-intro">
          <div data-reveal-group className="yw-intro-text">
            <p className="yw-eyebrow">
              <span className="yw-eyebrow-dot" aria-hidden="true" />
              {nobr(copy.eyebrow)}
            </p>
            <h3 id="yimwhan-title" className="yw-title">
              {head} <span className="sweep">{tail}</span>
            </h3>
            <p className="yw-lede">{nobr(t(project.tagline, locale))}</p>
            <p>
              <Link href={localePath(locale, `/work/${project.slug}`)} className="yw-more">
                {nobr(copy.caseStudy)}
                <span aria-hidden="true" className="yw-more-arrow">
                  {"→"}
                </span>
              </Link>
            </p>
          </div>
          <div className="yw-intro-art" aria-hidden="true">
            <span className="yw-blob" />
            <Art name="scene-yimwhan-desk" className="yw-art" />
          </div>
        </header>

        <YimwhanStage copy={copy} />

        <section aria-labelledby="agent-demo-heading" className="yw-finale">
          <p className="yw-eyebrow">
            <span className="yw-eyebrow-dot" aria-hidden="true" />
            {nobr(copy.finaleEyebrow)}
          </p>
          <AgentDemo copy={copy.demo} />
        </section>
      </article>
    </div>
  );
}
