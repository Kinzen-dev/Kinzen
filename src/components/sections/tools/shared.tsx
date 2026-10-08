import { Fragment } from "react";
import type { LogoSlug } from "@/components/tools/logos.generated";
import { toolMark } from "@/components/tools/tool-marks";
import { nobr } from "@/lib/thai-nodes";
import type { Tool, ToolGroup } from "./types";

/** Short display names for text-only tools when they sit on a ring or in a dock. */
const SHORT: Record<string, string> = { "Twilio Media Streams": "Twilio" };

/** A tool with its mark resolved: a brand mark, a practice (no brand), or undefined for a text-only chip. */
export type Token = Tool & { mark: LogoSlug | "practice" | undefined; short: string };

const token = (tool: Tool): Token => ({ ...tool, mark: toolMark(tool.key), short: SHORT[tool.key] ?? tool.label });

/**
 * What a group puts on screen as tokens: one per brand mark (Liquid and LIFF share Shopify's and
 * LINE's marks, so they fold into them), text-only tools as word chips, practices left to the
 * written list.
 */
export function tokens(group: ToolGroup): Token[] {
  const seen = new Set<string>();
  return group.tools.map(token).filter((t) => {
    if (t.mark === "practice") return false;
    const id = t.mark ?? `text:${t.key}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Text that only breaks at spaces: a hyphenated word ("event-driven", "speech-to-text") never
 * breaks at its hyphens (same rule as the case pages' tool labels). Used for names and lines.
 */
export function toolName(label: string) {
  return label
    .split(/(\S*-\S*)/)
    .filter(Boolean)
    .map((part, j) =>
      part.includes("-") ? (
        <span key={j} className="whitespace-nowrap">
          {part}
        </span>
      ) : (
        <Fragment key={j}>{nobr(part)}</Fragment>
      ),
    );
}
