import Link from "next/link";
import { links } from "@/content";
import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath, prefetchFor } from "@/lib/site-url";
import { nobr } from "@/lib/thai-nodes";
import "./case-cta.css";

/**
 * The end of every case, before Next project (audit C06): one compact way to talk about similar
 * work. Email opens the visitor's mail app (nothing is sent for them); the CV keeps the locale.
 */
export function CaseCta({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const email = links.find((l) => l.kind === "email");
  const cv = localePath(locale, "/cv");
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
        <li>
          <Link href={cv} prefetch={prefetchFor(cv)} className="pj-linkbtn">
            {nobr(dict.hero.ctaCv)}
          </Link>
        </li>
      </ul>
    </section>
  );
}
