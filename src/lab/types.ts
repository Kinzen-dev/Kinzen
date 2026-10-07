import type { ComponentType } from "react";
import type { Locale } from "@/content/schema";

/**
 * One rough demo in the lab (preview branch only, never merged to main). `load` keeps every demo
 * in its own chunk: only the one on screen downloads.
 */
export type LabDemo = {
  /** URL hash id, kebab-case. */
  id: string;
  title: string;
  /** One line: what it is and why it fits Kinzen. */
  idea: string;
  /** One line: the core technique. */
  technique: string;
  load: () => Promise<{ default: ComponentType<LabProps> }>;
};

/**
 * Banner facts from site.ts (server-only), resolved by the lab page on the server and passed to
 * every demo: demos are client components and must not import @/content.
 */
export type LabBanner = {
  name: string;
  role: string;
  heroLine: string;
  email: string;
  linkedin: string;
  cvHref: string;
};

export type LabProps = { locale: Locale; banner: LabBanner };
