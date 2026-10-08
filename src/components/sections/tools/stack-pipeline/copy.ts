import type { Locale } from "@/content/schema";
import type { GroupId } from "../types";

/**
 * Copy for the pipeline view: each station line says what that group does for one request,
 * nothing more (no metrics).
 */
type Copy = {
  start: string;
  end: string;
  guard: string;
  checked: string;
  pause: string;
  resume: string;
  stationsLabel: string;
  lines: Record<GroupId, string>;
};

export const COPY: Record<Locale, Copy> = {
  en: {
    start: "Request",
    end: "Shipped",
    guard: "Guard",
    checked: "Checked",
    pause: "Pause motion",
    resume: "Resume motion",
    stationsLabel: "The stack, in the order a request meets it",
    lines: {
      integrations: "A customer writes on LINE, calls in, or shops on Shopify.",
      frontend: "The screens customers and teams use: web apps and desktop tools.",
      backend: "Typed APIs and event-driven services route the request.",
      "data-cloud": "State is stored and served from containers and the cloud.",
      ai: "A model drafts the reply; a guard in code checks it before it goes out.",
      testing: "Tests and CI check each change before it ships back to users.",
    },
  },
  th: {
    start: "คำขอ",
    end: "ส่งมอบ",
    guard: "ตัวกัน",
    checked: "ตรวจแล้ว",
    pause: "หยุดภาพเคลื่อนไหว",
    resume: "เล่นภาพเคลื่อนไหวต่อ",
    stationsLabel: "เครื่องมือทั้งหมด เรียงตามลำดับที่คำขอผ่าน",
    lines: {
      integrations: "ลูกค้าทักผ่าน LINE โทรเข้ามา หรือซื้อของบน Shopify",
      frontend: "หน้าจอที่ลูกค้าและทีมใช้: เว็บแอปและแอปเดสก์ท็อป",
      backend: "API ที่เขียนด้วย TypeScript และเซอร์วิสแบบ event-driven ส่งต่อคำขอ",
      "data-cloud": "ข้อมูลถูกเก็บและดึงใช้จากคอนเทนเนอร์และคลาวด์",
      ai: "โมเดลร่างคำตอบ แล้วตัวกันที่เขียนเป็นโค้ดตรวจก่อนส่งออกไป",
      testing: "ชุดทดสอบและ CI ตรวจงานแก้ไขก่อนส่งถึงผู้ใช้",
    },
  },
};
