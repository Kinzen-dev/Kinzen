import { availability, links } from "@/content";
import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { nobr } from "@/lib/thai-nodes";
import "./case-cta.css";

/**
 * The end of every case, before Next project (audit C06): two doors, like the home contact.
 * Roles go to email (opens the visitor's mail app, nothing is sent for them); projects go to the
 * studio site in the page's language, in a new tab.
 */
export function CaseCta({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const email = links.find((l) => l.kind === "email");
  const studioUrl = availability?.studioUrl
    ? (locale === "th" && availability.studioUrl.th) || availability.studioUrl.en
    : null;
  return (
    <section aria-labelledby="case-cta-title" className="pj-section case-cta" data-case-cta>
      <h2 id="case-cta-title" className="pj-h2">
        {nobr(dict.project.cta.heading)}
      </h2>
      <ul className="pj-links">
        {email ? (
          <li>
            <a href={email.href} className="pj-linkbtn case-cta-primary">
              {nobr(dict.project.cta.email)}
            </a>
          </li>
        ) : null}
        {studioUrl ? (
          <li>
            <a href={studioUrl} className="pj-linkbtn" rel="noopener" target="_blank">
              {nobr(dict.project.cta.studio)}
              <span aria-hidden="true" className="pj-ext">
                ↗
              </span>
              <span className="sr-only"> {nobr(dict.a11y.newTab)}</span>
            </a>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
