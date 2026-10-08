import Link from "next/link";
import type { Locale } from "@/content/schema";
import { projects, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import type { V3Copy } from "@/i18n/v3";
import { localePath } from "@/lib/site-url";
import { nobr } from "@/lib/thai-nodes";
import { Art } from "@/components/art/art";
import { AgentDemo } from "@/components/agent-demo/agent-demo";
import { ClinicStage } from "./clinic-stage";
import "./clinic.css";

/**
 * Clinic receptionist showcase (ticket v3-04): a navy scene card inside the page gutter. Intro with the
 * desk illustration, a five-beat sticky story (patient message to logged safe reply, coded
 * mockups with fictional data), then the interactive guard demo as the finale.
 */
export function ClinicScene({ locale, v3 }: { locale: Locale; dict: Dictionary; v3: V3Copy }) {
  const copy = v3.clinic;
  const project = projects.find((p) => p.id === "proj-clinic");
  if (!project) return null;
  // The gold sweep passes over the last word of the name ("AI").
  const cut = project.name.lastIndexOf(" ");
  const head = project.name.slice(0, cut);
  const tail = project.name.slice(cut + 1);

  return (
    <div className="shell">
      <article id="clinic" aria-labelledby="clinic-title" data-scene="dark" className="cr scene-card pastel-ai">
        <header className="cr-intro">
          <div data-reveal-group className="cr-intro-text">
            <p className="cr-eyebrow">
              <span className="cr-eyebrow-dot" aria-hidden="true" />
              {nobr(copy.eyebrow)}
            </p>
            <h3 id="clinic-title" className="cr-title">
              {head} <span className="sweep">{tail}</span>
            </h3>
            <p className="cr-lede">{nobr(t(project.tagline, locale))}</p>
            <p>
              <Link href={localePath(locale, `/work/${project.slug}`)} className="cr-more">
                {nobr(copy.caseStudy)}
                <span aria-hidden="true" className="cr-more-arrow">
                  {"→"}
                </span>
              </Link>
            </p>
          </div>
          <div className="cr-intro-art" aria-hidden="true">
            <span className="cr-blob" />
            <Art name="scene-clinic-desk" className="cr-art" />
          </div>
        </header>

        <ClinicStage copy={copy} />

        <section aria-labelledby="agent-demo-heading" className="cr-finale">
          <p className="cr-eyebrow">
            <span className="cr-eyebrow-dot" aria-hidden="true" />
            {nobr(copy.finaleEyebrow)}
          </p>
          <AgentDemo copy={copy.demo} />
        </section>
      </article>
    </div>
  );
}
