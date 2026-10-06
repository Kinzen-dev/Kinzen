/**
 * v3 copy for the "notes" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {};
export type NotesCopy = typeof en;
const th: NotesCopy = {};
export const notes = { en, th };
