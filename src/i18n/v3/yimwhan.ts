/**
 * v3 copy for the "yimwhan" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {};
export type YimwhanCopy = typeof en;
const th: YimwhanCopy = {};
export const yimwhan = { en, th };
