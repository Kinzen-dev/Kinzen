/**
 * v3 copy for the "notes" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {
  /** Shown to mouse and trackpad visitors only (touch keeps the notes still so the page scrolls). */
  hint: "Drag the notes around the board.",
  /** Read with each note (aria-describedby): the keyboard path for the same play. */
  keys: "Arrow keys move this note.",
  reset: "Put the notes back",
};
export type NotesCopy = typeof en;
const th: NotesCopy = {
  hint: "ลากโน้ตไปวางตรงไหนบนบอร์ดก็ได้",
  keys: "กดปุ่มลูกศรเพื่อขยับโน้ตนี้",
  reset: "จัดโน้ตกลับที่เดิม",
};
export const notes = { en, th };
