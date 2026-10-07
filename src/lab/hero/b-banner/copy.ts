import type { Locale } from "@/content/schema";
import { thaiGlue } from "@/lib/thai";

/**
 * Client-safe mirror of the banner facts. `src/content/site.ts` is server-only and lab demos are
 * client components (the viewer lazy-loads them), so the strings are copied here verbatim from
 * site.ts (profile.displayName, role, heroLine; links email and LinkedIn). Lab only: if this ever
 * ships, the page passes them down from the server instead.
 */
const PROFILE = {
  displayName: { en: "Kittipong Khonthong", th: "กฤติพงษ์ ก้อนทอง" },
  role: { en: "Senior Full-Stack Engineer", th: "วิศวกร full-stack ระดับ senior" },
  heroLine: {
    en: "Production software, end to end: TypeScript backends, Shopify platforms, and AI voice and LINE products with guardrails written in code.",
    th: "ซอฟต์แวร์ที่ใช้งานจริงครบทั้งระบบ: ระบบหลังบ้านด้วย TypeScript แพลตฟอร์ม Shopify และผลิตภัณฑ์ AI รับสายและตอบแชท LINE ที่มีกฎกำกับเขียนไว้ในโค้ด",
  },
};

export const EMAIL = { label: "ktpz.dev@gmail.com", href: "mailto:ktpz.dev@gmail.com" };
export const LINKEDIN = { label: "LinkedIn", href: "https://www.linkedin.com/in/kittipong-khonthong-161021213" };

const pick = (v: { en: string; th: string }, locale: Locale) => (locale === "th" ? thaiGlue(v.th) : v.en);

export function bannerCopy(locale: Locale) {
  return {
    name: pick(PROFILE.displayName, locale),
    role: pick(PROFILE.role, locale),
    heroLine: pick(PROFILE.heroLine, locale),
    /** Without line-break glue: for aria values and text typed out character by character. */
    heroLinePlain: locale === "th" ? PROFILE.heroLine.th : PROFILE.heroLine.en,
  };
}
