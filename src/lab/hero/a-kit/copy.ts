import type { Locale } from "@/content/schema";
import { thaiGlue } from "@/lib/thai";

/**
 * Banner strings for the lab-hero-a demos, copied verbatim from src/content/site.ts (profile and
 * links). site.ts is `server-only` and every lab demo is a client chunk, so the lab cannot import
 * it; nothing here is new copy. The production hero keeps reading site.ts.
 */
const profile = {
  displayName: { en: "Kittipong Khonthong", th: "กฤติพงษ์ ก้อนทอง" },
  role: { en: "Senior Full-Stack Engineer", th: "วิศวกร full-stack ระดับ senior" },
  heroLine: {
    en: "Production software, end to end: TypeScript backends, Shopify platforms, and AI voice and LINE products with guardrails written in code.",
    th: "ซอฟต์แวร์ที่ใช้งานจริงครบทั้งระบบ: ระบบหลังบ้านด้วย TypeScript แพลตฟอร์ม Shopify และผลิตภัณฑ์ AI รับสายและตอบแชท LINE ที่มีกฎกำกับเขียนไว้ในโค้ด",
  },
};

export const links = {
  email: { label: "ktpz.dev@gmail.com", href: "mailto:ktpz.dev@gmail.com" },
  linkedin: { label: "LinkedIn", href: "https://www.linkedin.com/in/kittipong-khonthong-161021213" },
};

/** Same rule as `t()` in src/content: Thai gets the line-break glue. */
const pick = (v: { en: string; th: string }, locale: Locale) => (locale === "th" ? thaiGlue(v.th) : v.en);

export function bannerCopy(locale: Locale) {
  return {
    name: pick(profile.displayName, locale),
    role: pick(profile.role, locale),
    heroLine: pick(profile.heroLine, locale),
  };
}

/** The Thai first name the particle demo morphs into (from profile.displayName.th). */
export const THAI_FIRST_NAME = profile.displayName.th.split(" ")[0];
