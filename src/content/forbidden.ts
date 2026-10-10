/**
 * Strings that must never appear in content or in the built site.
 * Checked by the content unit test and by `pnpm check:output` against the build.
 */
export const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /1,?942/, reason: "wrong message count; the cleared figure is 500 / 37" },
  { pattern: /38 of 38|38\/38/, reason: "the cleared QA benchmark figure is 35 of 38" },
  { pattern: /Senior Frontend/i, reason: "not a held title" },
  { pattern: /—/, reason: "no em dashes anywhere" },
  {
    // Bounded on both sides so a run of digits inside a commit hash or an id never counts as a number.
    pattern: /\+66|(?<![0-9A-Za-z])0\d{2}[- ]?\d{3}[- ]?\d{4}(?![0-9A-Za-z])/,
    reason: "no phone numbers on the public site",
  },
  {
    pattern: /no-outcome-promise|no-diagnosis|no-drug-or-dose/,
    reason: "not real clinic receptionist rule ids (recon 2026-10-07); real: efficacy_claim, no_diagnose, dosing-gate",
  },
];
