import type { CSSProperties } from "react";
import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import type { V3Copy } from "@/i18n/v3";
import { getProject, tPlain } from "@/content";
import { localePath } from "@/lib/site-url";
import { nobr } from "@/lib/thai-nodes";
import { StickyStage } from "@/motion/sticky-stage";
import { Art } from "@/components/art/art";
import { HelmWindow } from "./helm-window";
import { HelmArm } from "./helm-arm";
import "./helm.css";

/**
 * Helm sticky scrollytelling scene (ticket v3-05). A light scene: copy on the left, a Helm
 * window mockup on a tools-lavender panel on the right; five scroll beats drive both from
 * StickyStage's `data-step` / `--p` (CSS only, no scene script). Phone: copy stacked over a
 * compact 2x2 window, one beat at a time. Reduced motion: normal flow, every beat listed, the
 * window in its final state.
 */
export function HelmScene({ locale, v3 }: { locale: Locale; dict: Dictionary; v3: V3Copy }) {
  const copy = v3.helm;
  const project = getProject("helm");
  const steps = copy.beats.length;

  return (
    <section aria-labelledby="helm-title" className="helm-scene pastel-tools">
      <StickyStage steps={steps} vh={75} label={copy.stageLabel} stageClassName="helm-stage">
        <HelmArm />
        <div className="shell helm-layout">
          <div className="helm-copy">
            <div className="helm-heading">
              <div>
                <p className="helm-kicker">
                  <i aria-hidden="true" />
                  {nobr(copy.kicker)}
                </p>
                <h3 id="helm-title" className="helm-title sweep">
                  {project?.name ?? "Helm"}
                </h3>
              </div>
              <span className="helm-art">
                <Art name="scene-helm-crew" className="w-full" />
              </span>
            </div>
            {project ? <p className="helm-lede">{nobr(tPlain(project.tagline, locale))}</p> : null}

            <ol className="helm-beats">
              {copy.beats.map((beat, i) => (
                <li key={beat.title} className="helm-beat" data-beat={i}>
                  <span className="helm-beat-n">
                    <span className="sr-only">{copy.step} </span>
                    {String(i + 1).padStart(2, "0")}
                    <span aria-hidden="true"> / {String(steps).padStart(2, "0")}</span>
                  </span>
                  <span className="helm-beat-title">{nobr(beat.title)}</span>
                  <span className="helm-beat-body">{nobr(beat.body)}</span>
                </li>
              ))}
            </ol>
            <div className="helm-progress" aria-hidden="true">
              {copy.beats.map((beat, i) => (
                <i key={beat.title} style={{ "--i": i } as CSSProperties} />
              ))}
            </div>

            <div className="helm-meta">
              {project ? (
                <p className="helm-stack">
                  <span className="sr-only">{copy.builtWith}: </span>
                  {project.stack.map((s) => (
                    <span key={s} className="helm-chip">
                      {s}
                    </span>
                  ))}
                </p>
              ) : null}
              <a href={localePath(locale, "/work/helm")} className="helm-cta">
                {nobr(copy.cta)}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <figure className="helm-panel">
            <div className="helm-window-wrap">
              <HelmWindow ui={copy.ui} />
            </div>
            <figcaption className="helm-caption">
              <span className="sr-only">{nobr(copy.summary)} </span>
              {nobr(copy.illustration)}
            </figcaption>
          </figure>
        </div>
      </StickyStage>
      {/* Phones hide .helm-meta inside the pinned stage (no room); the case link follows the stage. */}
      <p className="helm-cta-after shell">
        <a href={localePath(locale, "/work/helm")} className="helm-cta">
          {nobr(copy.cta)}
          <span aria-hidden="true">→</span>
        </a>
      </p>
    </section>
  );
}
