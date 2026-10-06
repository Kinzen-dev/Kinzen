/**
 * v3 copy for the "hero" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {};
export type HeroCopy = typeof en;
const th: HeroCopy = {};
export const hero = { en, th };
