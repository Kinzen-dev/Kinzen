import type { Locale } from "@/content/schema";
import { practices, t } from "@/content";
import type { Dictionary } from "@/i18n/dictionaries";
import { getV3, type V3Copy } from "@/i18n/v3";
import { Art, type ArtName } from "../art/art";
import { NotesBoard, type Note } from "../v3/notes/notes-board";
import { SectionHeader } from "./section-header";
import { plain } from "@/lib/thai";
import { nobr } from "@/lib/thai-nodes";

/** Each practice is a sticky note: its paper (area pastel), its drawing and its resting tilt. */
const NOTE_LOOK: Record<string, { art: ArtName; pastel: string; tilt: number }> = {
  "ai-teams": { art: "note-notebook", pastel: "pastel-tools", tilt: -3 },
  "ai-evidence": { art: "note-measure", pastel: "pastel-games", tilt: 2.2 },
  "ai-guards": { art: "note-lighthouse", pastel: "pastel-ai", tilt: -1.4 },
};

/**
 * How King works with AI agents, as draggable sticky notes (v3). The interactive guard demo
 * that used to sit here now lives in the Yimwhan scene.
 */
export function Practice({ locale, dict, v3 = getV3(locale) }: { locale: Locale; dict: Dictionary; v3?: V3Copy }) {
  const notes: Note[] = practices.map((p) => {
    const look = NOTE_LOOK[p.id] ?? { art: "note-ship-small", pastel: "pastel-tools", tilt: 1 };
    return {
      id: p.id,
      pastel: look.pastel,
      tilt: look.tilt,
      body: (
        <>
          <Art name={look.art} className="note-art" />
          <h3 className="mt-5 text-xl tracking-[-0.03em]">{nobr(t(p.title, locale))}</h3>
          <p className="mt-2 text-pastel-ink/80">{nobr(t(p.text, locale))}</p>
        </>
      ),
    };
  });

  return (
    <section id="practice" aria-labelledby="practice-title" className="shell pt-24 md:pt-32">
      <SectionHeader id="practice" title={plain(dict.sections.practice)} intro={dict.sections.practiceIntro} />
      <NotesBoard
        notes={notes}
        labels={{ hint: nobr(v3.notes.hint), keys: plain(v3.notes.keys), reset: nobr(v3.notes.reset) }}
      />
    </section>
  );
}
