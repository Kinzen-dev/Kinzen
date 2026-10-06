import { doodleArt, type DoodleName } from "./art.generated";
import { DoodleFrame } from "./doodle-frame";

export type { DoodleName } from "./art.generated";

/**
 * A hand-drawn ink doodle. Decorative only: always aria-hidden, never the sole carrier of meaning.
 * Inherits `currentColor`, so `text-ink` gives light ink on the dark theme and dark ink on paper.
 *
 * Size it with a height (`h-14`) and the width follows the art's aspect ratio, so it sits flush
 * with the text edge; or with both (`size-16`) to centre it in a square.
 *
 * Server component on purpose: the path data ships in HTML, never in a client bundle. A client
 * component that wants a doodle (e.g. the ledger) should receive it pre-rendered as a ReactNode prop.
 */
export function Doodle({ name, className }: { name: DoodleName; className?: string }) {
  const art = doodleArt[name];
  return (
    <DoodleFrame w={art.w} h={art.h} className={className}>
      <path fill="currentColor" d={art.d} />
    </DoodleFrame>
  );
}

const PROJECT_DOODLES: Record<string, DoodleName> = {
  yimwhan: "phone-chat",
  "yimwhan-ai": "phone-chat",
  helm: "helm",
  ronglen: "party-voice",
  "visual-qa": "magnifier-bug",
  "visual-qa-harness": "magnifier-bug",
  cadence: "mic",
};

/** Doodle for a project, by id (`proj-helm`), short id (`helm`) or slug (`visual-qa-harness`). */
export function projectDoodle(projectId: string): DoodleName | undefined {
  return PROJECT_DOODLES[projectId.replace(/^proj-/, "")];
}
