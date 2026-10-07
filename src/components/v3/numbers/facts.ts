import { experience, yearsInProduction } from "@/content";

/**
 * The strip's numbers, read from content so they can never drift from the claims: whole years in
 * production (computed), the Tech Lead years (the AnyMind role's dates) and the replay figures (the
 * Vesperwerk highlight's own sentence). Throws at build time if a source disappears.
 */
export type NumberFact = { key: "production" | "techLead" | "replayed" | "caught"; value: number };

function wholeYears(start: string, end: string): number {
  const [y0, m0] = start.split("-").map(Number);
  const [y1, m1] = end.split("-").map(Number);
  return Math.floor(((y1 - y0) * 12 + (m1 - m0)) / 12);
}

export function numberFacts(now: Date): NumberFact[] {
  const lead = experience.find((e) => e.id === "exp-anymind");
  if (!lead || lead.end === "present") throw new Error("numbers: the AnyMind Tech Lead role is missing");
  const replay = experience
    .flatMap((e) => e.highlights ?? [])
    .map((h) => h.text.en)
    .find((s) => /replay of \d+ real customer messages/.test(s));
  const replayed = Number(replay?.match(/replay of (\d+) real customer messages/)?.[1]);
  const caught = Number(replay?.match(/rescued (\d+) raw model violations/)?.[1]);
  if (!replayed || !caught) throw new Error("numbers: the replay claim is missing from content");
  return [
    { key: "production", value: yearsInProduction(now) },
    { key: "techLead", value: wholeYears(lead.start, lead.end) },
    { key: "replayed", value: replayed },
    { key: "caught", value: caught },
  ];
}
