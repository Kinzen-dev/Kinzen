import type { Locale } from "@/content/schema";
import { getV3, type V3Copy } from "@/i18n/v3";
import { SectionHeader } from "../section-header";
import { PlayShowcase } from "./showcase";

/**
 * Play (v4): four small interactive scenes from the lab (night desk, gold toss, thock, one drop)
 * behind one switcher, one live WebGL scene at a time. The server renders the first scene's
 * composed still (a picture of the real render, at the desk's and the phone's framing) and every
 * label as real text; each scene is its own lazy chunk that loads as the section nears.
 */
export function Play({ locale, v3 = getV3(locale) }: { locale: Locale; v3?: V3Copy }) {
  const c = v3.interactive;
  const poster = (
    <picture>
      <source media="(max-width: 39.99rem)" srcSet="/play/night-desk-phone.webp" type="image/webp" />
      <img src="/play/night-desk-desk.webp" alt={c.still} loading="lazy" decoding="async" />
    </picture>
  );
  return (
    <section id="play" aria-labelledby="play-title" className="pt-24 md:pt-32">
      <div className="shell">
        <SectionHeader id="play" title={c.title} intro={c.intro} />
        <PlayShowcase
          locale={locale}
          copy={{
            scenes: c.scenes,
            hints: c.hints,
            switcher: c.switcher,
            showing: c.showing,
            sound: c.sound,
            soundOn: c.soundOn,
            soundOff: c.soundOff,
            noGl: c.noGl,
          }}
          poster={poster}
        />
      </div>
    </section>
  );
}
