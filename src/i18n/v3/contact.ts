/**
 * v3 copy for the "contact" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {};
export type ContactCopy = typeof en;
const th: ContactCopy = {};
export const contact = { en, th };
