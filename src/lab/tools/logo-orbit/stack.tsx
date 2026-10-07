import type { CSSProperties } from "react";
import type { Locale } from "@/content/schema";
import { LOGO_SPRITE, logos, type LogoSlug } from "@/components/tools/logos.generated";
import { toolMark } from "@/components/tools/tool-marks";
import "./mark.css";

/**
 * The six skill groups, mirrored from `skills` in src/content/site.ts (server-only, so demos cannot
 * import it). Keep in step with site.ts: same ids, labels and items. Shared by logo-orbit and
 * stack-pipeline (lab-tools-b).
 */
type L = { en: string; th: string };
type Item = string | L;

export type GroupId = "backend" | "frontend" | "data-cloud" | "testing" | "integrations" | "ai";

const GROUPS: { id: GroupId; label: L; items: Item[] }[] = [
  {
    id: "backend",
    label: { en: "Backend", th: "ระบบหลังบ้าน" },
    items: [
      "TypeScript",
      "Node.js",
      "NestJS",
      "Fastify",
      "GraphQL",
      "Kafka",
      "Python",
      { en: "Hexagonal and event-driven design", th: "สถาปัตยกรรม hexagonal และ event-driven" },
    ],
  },
  {
    id: "frontend",
    label: { en: "Frontend and apps", th: "หน้าบ้านและแอป" },
    items: ["React", "Next.js", "Vite", "Tailwind CSS", "Tauri"],
  },
  {
    id: "data-cloud",
    label: { en: "Data and cloud", th: "ข้อมูลและคลาวด์" },
    items: ["MongoDB", "PostgreSQL", "Redis", "SQLite", "Docker", "Kubernetes (GKE)", "Fly.io", "Cloudflare", "Azure"],
  },
  {
    id: "testing",
    label: { en: "Testing and delivery", th: "การทดสอบและส่งมอบ" },
    items: ["Playwright", "Vitest", "Jest", "GitHub Actions", "GitLab CI/CD"],
  },
  {
    id: "integrations",
    label: { en: "Integrations", th: "การเชื่อมต่อระบบ" },
    items: [
      { en: "Shopify Admin and Storefront APIs", th: "Shopify Admin API และ Storefront API" },
      "Liquid",
      "LINE Messaging API",
      "LIFF",
      "Twilio Media Streams",
    ],
  },
  {
    id: "ai",
    label: { en: "AI engineering", th: "วิศวกรรม AI" },
    items: ["Claude Code", "Codex", "Gemini on Vertex AI", "Anthropic API", "Real-time speech-to-text", "LLM evals"],
  },
];

/** Short display names for text-only tools when they sit on a ring or in a cluster. */
const SHORT: Record<string, string> = { "Twilio Media Streams": "Twilio" };

export type Tool = {
  /** English name: picks the mark. */
  key: string;
  label: string;
  /** A brand mark, a practice (no brand), or undefined for a deliberate text-only chip. */
  mark: LogoSlug | "practice" | undefined;
  short: string;
};

export type Group = { id: GroupId; label: string; tools: Tool[] };

export function groups(locale: Locale): Group[] {
  return GROUPS.map((g) => ({
    id: g.id,
    label: g.label[locale],
    tools: g.items.map((item) => {
      const key = typeof item === "string" ? item : item.en;
      const label = typeof item === "string" ? item : item[locale];
      return { key, label, mark: toolMark(key), short: SHORT[key] ?? label };
    }),
  }));
}

/**
 * What a group puts on screen as tokens: one per brand mark (Liquid and LIFF share Shopify's and
 * LINE's marks, so they fold into them), text-only tools as word chips, practices left to the
 * written list.
 */
export function tokens(group: Group): Tool[] {
  const seen = new Set<string>();
  return group.tools.filter((t) => {
    if (t.mark === "practice") return false;
    const id = t.mark ?? `text:${t.key}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * A brand mark in the theme tone (ink on light, cream on dark). Its brand colour is carried in
 * `--brand` and shows when an ancestor marks it lit (see the demos' CSS). Decorative.
 */
export function Mark({ slug, className }: { slug: LogoSlug; className?: string }) {
  const logo = logos[slug];
  const mono = logo.color === "currentColor";
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={`lt-mark ${className ?? ""}`}
      style={{ "--brand": mono ? "var(--ink)" : logo.color } as CSSProperties}
      data-badge={"badge" in logo ? logo.badge : undefined}
      data-mono={mono ? "" : undefined}
    >
      <use href={`${LOGO_SPRITE}#${slug}`} />
    </svg>
  );
}
