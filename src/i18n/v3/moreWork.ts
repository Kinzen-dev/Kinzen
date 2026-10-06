/**
 * v3 copy for the "moreWork" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {};
export type MoreWorkCopy = typeof en;
const th: MoreWorkCopy = {};
export const moreWork = { en, th };
