import type { Locale } from "@/content/schema";

/**
 * The six tool groups, mirrored from `skills` in src/content/site.ts (server-only, so lab demos
 * cannot import it). Same ids, labels and tool names; keep in sync if site.ts changes.
 * `key` is the English name (it picks the mark in tool-marks.ts); `th` only where site.ts has one.
 */
export type Tool = { key: string; th?: string };
export type GroupId = "ai" | "backend" | "testing" | "data-cloud" | "frontend" | "integrations";
export type Group = { id: GroupId; label: Record<Locale, string>; tools: Tool[] };

const t = (...keys: string[]): Tool[] => keys.map((key) => ({ key }));

export const GROUPS: Group[] = [
  {
    id: "backend",
    label: { en: "Backend", th: "ระบบหลังบ้าน" },
    tools: [
      ...t("TypeScript", "Node.js", "NestJS", "Fastify", "GraphQL", "Kafka", "Python"),
      { key: "Hexagonal and event-driven design", th: "สถาปัตยกรรม hexagonal และ event-driven" },
    ],
  },
  {
    id: "frontend",
    label: { en: "Frontend and apps", th: "หน้าบ้านและแอป" },
    tools: t("React", "Next.js", "Vite", "Tailwind CSS", "Tauri"),
  },
  {
    id: "data-cloud",
    label: { en: "Data and cloud", th: "ข้อมูลและคลาวด์" },
    tools: t(
      "MongoDB",
      "PostgreSQL",
      "Redis",
      "SQLite",
      "Docker",
      "Kubernetes (GKE)",
      "Fly.io",
      "Cloudflare",
      "Azure",
    ),
  },
  {
    id: "testing",
    label: { en: "Testing and delivery", th: "การทดสอบและส่งมอบ" },
    tools: t("Playwright", "Vitest", "Jest", "GitHub Actions", "GitLab CI/CD"),
  },
  {
    id: "integrations",
    label: { en: "Integrations", th: "การเชื่อมต่อระบบ" },
    tools: [
      { key: "Shopify Admin and Storefront APIs", th: "Shopify Admin API และ Storefront API" },
      ...t("Liquid", "LINE Messaging API", "LIFF", "Twilio Media Streams"),
    ],
  },
  {
    id: "ai",
    label: { en: "AI engineering", th: "วิศวกรรม AI" },
    tools: t("Claude Code", "Codex", "Gemini on Vertex AI", "Anthropic API", "Real-time speech-to-text", "LLM evals"),
  },
];

export const toolLabel = (tool: Tool, locale: Locale) => (locale === "th" && tool.th) || tool.key;

/** Section heading and intro, as on the home page (dictionaries.ts `sections.skills`, i18n/v3/tools.ts). */
export const SECTION: Record<Locale, { title: string; intro: string }> = {
  en: { title: "Tools I reach for", intro: "The stack behind the systems above, grouped by the job it does." },
  th: { title: "เครื่องมือที่ใช้ประจำ", intro: "เครื่องมือเบื้องหลังระบบข้างบน จัดกลุ่มตามงานที่ใช้" },
};
