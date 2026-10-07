import type { Locale } from "@/content/schema";
import type { GroupId } from "../logo-orbit/stack";

/**
 * Copy for stack-pipeline. Title and lede reuse the live section's strings; each station line says
 * what that group does for one request, nothing more (no metrics).
 */
type Copy = {
  kicker: string;
  title: string;
  lede: string;
  hintHover: string;
  hintTouch: string;
  hintScroll: string;
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
    kicker: "Stack",
    title: "Tools I reach for",
    lede: "The stack behind the systems above, grouped by the job it does.",
    hintHover: "One request, end to end. Hover a station to see its tools.",
    hintTouch: "One request, end to end. Tap a station to see its tools.",
    hintScroll: "One request, end to end. Scroll to send it through.",
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
    kicker: "เครื่องมือ",
    title: "เครื่องมือที่ใช้ประจำ",
    lede: "เครื่องมือเบื้องหลังระบบข้างบน จัดกลุ่มตามงานที่ใช้",
    hintHover: "คำขอหนึ่งครั้ง ตั้งแต่ต้นจนจบ ชี้ที่แต่ละจุดเพื่อดูเครื่องมือ",
    hintTouch: "คำขอหนึ่งครั้ง ตั้งแต่ต้นจนจบ แตะที่แต่ละจุดเพื่อดูเครื่องมือ",
    hintScroll: "คำขอหนึ่งครั้ง ตั้งแต่ต้นจนจบ เลื่อนลงเพื่อส่งคำขอผ่านทั้งระบบ",
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
