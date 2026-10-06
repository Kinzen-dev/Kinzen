/**
 * v3 copy for the "helm" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {};
export type HelmCopy = typeof en;
const th: HelmCopy = {};
export const helm = { en, th };
