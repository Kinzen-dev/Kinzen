import type { Locale } from "@/content/schema";

/**
 * Plain data the tools views render, resolved from `skills` in site.ts on the server (views are
 * client chunks and never import @/content). `key` is the tool's English name (it picks the mark);
 * `label` is what the reader sees in the page's language.
 */
export type GroupId = "backend" | "frontend" | "data-cloud" | "testing" | "integrations" | "ai";
export type Tool = { key: string; label: string };
export type ToolGroup = { id: GroupId; label: string; tools: Tool[] };

export type ViewProps = { locale: Locale; groups: ToolGroup[] };

/** The four views, in the order the switcher shows them and auto-advance visits them. */
export const VIEW_IDS = ["bento", "spotlight", "orbit", "pipeline"] as const;
export type ViewId = (typeof VIEW_IDS)[number];

/** A group by id (the views order groups their own way). */
export const groupById = (groups: ToolGroup[], id: GroupId) => groups.find((g) => g.id === id)!;
