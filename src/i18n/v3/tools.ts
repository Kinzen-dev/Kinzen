/**
 * v3 copy for the "tools" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 */
const en = {};
export type ToolsCopy = typeof en;
const th: ToolsCopy = {};
export const tools = { en, th };
