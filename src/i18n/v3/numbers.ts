/**
 * v3 copy for the "numbers" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {};
export type NumbersCopy = typeof en;
const th: NumbersCopy = {};
export const numbers = { en, th };
