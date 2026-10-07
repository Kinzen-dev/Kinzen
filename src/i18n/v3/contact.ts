/**
 * v3 copy for the "contact" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {
  /**
   * The contact heading (same words as dictionaries `contact.heading`) cut into the units that
   * enter one after another. `key` is the one unit the gold light sweeps over. Thai is cut into
   * whole words, never letters; `joiner` is what sits between units (Thai has no spaces).
   */
  heading: { units: ["Have", "a", "system", "that", "has", "to", "work?"], key: 6, joiner: " " },
};
export type ContactCopy = typeof en;
const th: ContactCopy = {
  heading: { units: ["มีระบบ", "ที่ต้อง", "ทำงานได้จริง", "ไหม"], key: 2, joiner: "" },
};
export const contact = { en, th };
