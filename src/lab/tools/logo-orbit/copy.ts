import type { Locale } from "@/content/schema";
import type { GroupId } from "./stack";

/**
 * Copy for logo-orbit. Title and lede reuse the live section's strings (dictionaries.ts
 * sections.skills, v3 tools.intro); the one-liners describe what each group is for, nothing more.
 */
type Copy = {
  kicker: string;
  title: string;
  lede: string;
  hintHover: string;
  hintTouch: string;
  groupsLabel: string;
  tools: (n: number) => string;
  overview: (n: number) => string;
  pause: string;
  resume: string;
  lines: Record<GroupId, string>;
};

export const COPY: Record<Locale, Copy> = {
  en: {
    kicker: "Stack",
    title: "Tools I reach for",
    lede: "The stack behind the systems above, grouped by the job it does.",
    hintHover: "Hover a ring or a group to bring it forward.",
    hintTouch: "Tap a ring or a group to bring it forward.",
    groupsLabel: "Tool groups",
    tools: (n) => `${n} tools`,
    overview: (n) => `${n} tools in six groups, each on its own orbit.`,
    pause: "Pause motion",
    resume: "Resume motion",
    lines: {
      ai: "Models wired into real products, with guardrails and evals written in code.",
      integrations: "Where the systems meet the outside world: Shopify, LINE and phone calls.",
      backend: "TypeScript services, APIs and event-driven pipelines.",
      frontend: "What people actually touch: web apps and desktop tools.",
      testing: "Tests and CI pipelines that check changes before they ship.",
      "data-cloud": "Databases, containers and the clouds they run on.",
    },
  },
  th: {
    kicker: "เครื่องมือ",
    title: "เครื่องมือที่ใช้ประจำ",
    lede: "เครื่องมือเบื้องหลังระบบข้างบน จัดกลุ่มตามงานที่ใช้",
    hintHover: "ชี้ที่วงโคจรหรือชื่อกลุ่ม เพื่อดึงกลุ่มนั้นขึ้นมาข้างหน้า",
    hintTouch: "แตะที่วงโคจรหรือชื่อกลุ่ม เพื่อดึงกลุ่มนั้นขึ้นมาข้างหน้า",
    groupsLabel: "กลุ่มเครื่องมือ",
    tools: (n) => `${n} เครื่องมือ`,
    overview: (n) => `${n} เครื่องมือ แบ่งเป็นหกกลุ่ม กลุ่มละหนึ่งวงโคจร`,
    pause: "หยุดภาพเคลื่อนไหว",
    resume: "เล่นภาพเคลื่อนไหวต่อ",
    lines: {
      ai: "ต่อโมเดล AI เข้ากับงานจริง พร้อมตัวกันและการวัดผลที่เขียนเป็นโค้ด",
      integrations: "จุดที่ระบบคุยกับโลกภายนอก: Shopify, LINE และสายโทรศัพท์",
      backend: "เซอร์วิส TypeScript, API และระบบแบบ event-driven",
      frontend: "ส่วนที่คนใช้งานจริง: เว็บแอปและแอปเดสก์ท็อป",
      testing: "ชุดทดสอบและ CI ที่ตรวจงานก่อนขึ้นระบบจริง",
      "data-cloud": "ฐานข้อมูล คอนเทนเนอร์ และคลาวด์ที่ระบบรันอยู่",
    },
  },
};
