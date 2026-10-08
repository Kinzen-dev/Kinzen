import type { LogoSlug } from "./logos.generated";

/**
 * The mark before a tool's name, keyed by the tool's English name: an official brand mark, or
 * "practice" (a neutral dot) for a way of working that has no brand. A name missing here is a
 * deliberate text-only chip: see TEXT_ONLY.
 */
const MARKS: Record<string, LogoSlug | "practice"> = {
  TypeScript: "typescript",
  "Node.js": "nodedotjs",
  NestJS: "nestjs",
  Fastify: "fastify",
  GraphQL: "graphql",
  Kafka: "apachekafka",
  Python: "python",
  React: "react",
  "React 19": "react",
  "Next.js": "nextdotjs",
  Vite: "vite",
  "Tailwind CSS": "tailwindcss",
  Angular: "angular",
  MongoDB: "mongodb",
  PostgreSQL: "postgresql",
  Redis: "redis",
  SQLite: "sqlite",
  Docker: "docker",
  "Kubernetes (EKS, GKE)": "kubernetes",
  GKE: "googlecloud",
  "Fly.io": "flydotio",
  Cloudflare: "cloudflare",
  "Vercel Functions": "vercel",
  Vitest: "vitest",
  Jest: "jest",
  "GitHub Actions": "githubactions",
  "GitLab CI/CD": "gitlab",
  Shopify: "shopify",
  "Shopify Admin and Storefront APIs": "shopify",
  "Shopify Admin GraphQL API": "shopify",
  "Storefront API": "shopify",
  Liquid: "shopify",
  Metafields: "shopify",
  "App proxies": "shopify",
  "LINE Messaging API": "line",
  LIFF: "line",
  LiveKit: "livekit",
  "Claude Code": "claude",
  Claude: "claude",
  "Anthropic API": "anthropic",
  "Gemini on Vertex AI": "googlegemini",
  Rust: "rust",
  Bun: "bun",
  Swift: "swift",
  "Hexagonal and event-driven design": "practice",
  "Real-time speech-to-text": "practice",
  "LLM evals": "practice",
};

/**
 * Text-only on purpose: no mark in Simple Icons (Azure, AWS, Soniox, Litestream, BullMQ,
 * Terragrunt, SOPS, Phaser), a mark we leave out (Twilio, Codex/OpenAI, Playwright; Three.js and
 * the Helm chart tool until the sprite is regenerated, so the chart tool's wheel never sits beside
 * King's own Helm app), or a licence that forbids it (Tauri: CC BY-NC-ND).
 */
export const TEXT_ONLY = new Set([
  "Azure",
  "AWS (EKS, MSK, S3)",
  "BullMQ",
  "Terragrunt",
  "SOPS",
  "Phaser",
  "Three.js",
  "Helm (Kubernetes charts)",
  "Twilio",
  "Twilio Media Streams",
  "Codex",
  "Playwright",
  "Soniox",
  "Litestream",
  "Tauri",
  "Tauri 2",
]);

export function toolMark(name: string): LogoSlug | "practice" | undefined {
  return Object.hasOwn(MARKS, name) ? MARKS[name] : undefined;
}
