import Link from "next/link";
import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import type { V3Copy } from "@/i18n/v3";
import { Art, type ArtName } from "@/components/art/art";
import { ledgerRows, type LedgerRow } from "@/components/work/rows";
import { nobr } from "@/lib/thai-nodes";
import { CardDeck } from "./card-deck";
import "./more-work.css";

/** Scene illustration per project (v3 ink art). */
const ART: Record<string, ArtName> = {
  "proj-yimwhan": "scene-yimwhan-desk",
  "proj-anymind-ec": "scene-storefront",
  "proj-helm": "scene-helm-crew",
  "proj-ronglen": "scene-game-night",
  "proj-visual-qa": "scene-qa-lab",
  "proj-cadence": "scene-voice-to-text",
};

/**
 * Big rounded project cards on the area pastel: scene art, area, status, year, name, tagline.
 * The whole card is one link (the name's link stretches over it). Desktop lays them out as a
 * staggered 7/5, 5/7 bento; `scatter` adds the scroll-scrubbed collage entrance; phones get a
 * scroll-snap carousel with dots.
 */
export function WorkCards({
  locale,
  dict,
  v3,
  ids,
  heading = "h3",
  scatter = false,
  reveal = false,
  label,
}: {
  locale: Locale;
  dict: Dictionary;
  v3: V3Copy;
  /** Project ids, in display order. */
  ids: string[];
  heading?: "h3" | "h4";
  scatter?: boolean;
  /** Staggered blur-to-sharp entrance instead of the scatter. */
  reveal?: boolean;
  /** Accessible name of the card list. */
  label: string;
}) {
  const all = ledgerRows(locale, dict);
  const rows = ids.map((id) => all.find((r) => r.id === id)).filter((r): r is LedgerRow => !!r);
  const copy = v3.moreWork;
  const Heading = heading;

  const cards = rows.map((row) => (
    <article key={row.id} className={`mw-card pastel-${row.area}`}>
      <div className="mw-art" aria-hidden="true">
        {ART[row.id] ? <Art name={ART[row.id]} className="mw-art-ink" /> : null}
      </div>
      <div className="mw-body">
        <p className="mw-meta">
          <span className="mw-chip">{nobr(row.areaLabel)}</span>
          <span className="mw-status">
            <span aria-hidden="true" className="mw-dot" data-live={row.live || undefined} />
            {nobr(row.statusLabel)}
          </span>
          <span className="mw-year tabular">{nobr(row.year)}</span>
        </p>
        <Heading className="mw-name">
          <Link href={row.href} className="mw-link">
            {nobr(row.name)}
          </Link>
        </Heading>
        <p className="mw-tagline">{nobr(row.tagline)}</p>
        <p className="mw-go" aria-hidden="true">
          {nobr(copy.openProject)}
          <span className="mw-arrow">→</span>
        </p>
      </div>
    </article>
  ));

  return (
    <CardDeck
      cards={cards}
      names={rows.map((r) => r.name)}
      scatter={scatter}
      reveal={reveal}
      label={label}
      dotsLabel={copy.dots}
      dotLabel={copy.dot}
    />
  );
}
