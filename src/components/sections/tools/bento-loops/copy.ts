import type { Locale } from "@/content/schema";
import type { GroupId } from "../types";

/**
 * Copy for the bento view: one line per tile and the fictional data its loop plays. Mockups only:
 * invented clinic, patients and order, labelled as fictional in the section hint.
 */
export const COPY = {
  en: {
    paused: "Paused",
    blurb: {
      ai: "A caller is heard, answered and checked before the reply goes out.",
      backend: "An API boots, takes a booking and streams the event to its consumers.",
      testing: "Every push runs unit and end-to-end tests before it can ship.",
      "data-cloud": "Rows land, an index answers, the cache hits, the service scales out.",
      frontend: "A booking screen assembles from components and books a slot.",
      integrations: "A storefront order hands off to a LINE message the customer can act on.",
    } satisfies Record<GroupId, string>,
    ai: {
      chat: "Clinic assistant",
      hello: "Hello, this is the clinic assistant. How can I help?",
      ask: "Can I book a cleaning on Friday?",
      reply: "Friday 10:30 is open. Shall I hold it for you?",
      checked: "Checked",
      evals: "Evals",
      checks: [
        "No diagnosis",
        "No dosage advice",
        "No price promise",
        "Polite, clinic tone",
        "Hands off to staff when unsure",
      ],
      pipe: ["Write the rule", "Hear", "Answer", "Check"],
    },
    testing: {
      queued: "Queued",
      running: "Running",
      passed: "All checks passed",
      steps: ["Unit", "End-to-end", "Preview deploy"],
      tests: "tests passed",
    },
    data: {
      cols: ["id", "patient", "slot"],
      rows: [
        ["1041", "Ploy S.", "Thu 14:00"],
        ["1042", "Napat K.", "Fri 10:30"],
        ["1043", "Mint R.", "Fri 11:00"],
        ["1044", "Arm T.", "Sat 09:30"],
      ],
      index: "index scan · slot",
      cache: "cache hit",
      pods: "replicas",
    },
    frontend: { title: "Pick a time", sub: "Cleaning · 45 min", book: "Book", booked: "Booked" },
    integrations: {
      order: "Order",
      item: "Linen set × 2",
      paid: "Paid",
      msg: "Order #1001 is on its way.",
      track: "Track order",
    },
  },
  th: {
    paused: "หยุดอยู่",
    blurb: {
      ai: "ฟังเสียงผู้โทร ตอบกลับ แล้วตรวจคำตอบก่อนส่งออกไป",
      backend: "API เริ่มทำงาน รับการจอง แล้วส่ง event ต่อให้ระบบที่รอฟังอยู่",
      testing: "ทุกครั้งที่ push จะรัน unit test และ e2e test ให้ผ่านก่อนส่งงานขึ้น",
      "data-cloud": "ข้อมูลเข้าตาราง index ช่วยค้น cache ตอบไว และระบบขยายรับโหลด",
      frontend: "หน้าจองคิวประกอบขึ้นจาก component แล้วกดจองช่วงเวลา",
      integrations: "ออร์เดอร์จากหน้าร้านส่งต่อเป็นข้อความ LINE ที่ลูกค้ากดดูต่อได้",
    } satisfies Record<GroupId, string>,
    ai: {
      chat: "ผู้ช่วยคลินิก",
      hello: "สวัสดีค่ะ ผู้ช่วยของคลินิกยินดีให้บริการ มีอะไรให้ช่วยคะ",
      ask: "ขอจองขูดหินปูนวันศุกร์ได้ไหมคะ",
      reply: "วันศุกร์ 10:30 ว่างค่ะ ให้จองไว้เลยไหมคะ",
      checked: "ตรวจแล้ว",
      evals: "Evals",
      checks: [
        "ไม่วินิจฉัยโรค",
        "ไม่แนะนำขนาดยา",
        "ไม่รับปากเรื่องราคา",
        "สุภาพแบบคลินิก",
        "ส่งต่อพนักงานเมื่อไม่แน่ใจ",
      ],
      pipe: ["เขียนกฎ", "ฟัง", "ตอบ", "ตรวจ"],
    },
    testing: {
      queued: "รอคิว",
      running: "กำลังรัน",
      passed: "ผ่านทุกข้อ",
      steps: ["Unit test", "E2E test", "Deploy ตัวอย่าง"],
      tests: "รายการผ่าน",
    },
    data: {
      cols: ["id", "คนไข้", "เวลา"],
      rows: [
        ["1041", "พลอย ส.", "พฤ. 14:00"],
        ["1042", "ณภัทร ก.", "ศ. 10:30"],
        ["1043", "มิ้นท์ ร.", "ศ. 11:00"],
        ["1044", "อาร์ม ท.", "ส. 09:30"],
      ],
      index: "index scan · เวลา",
      cache: "cache hit",
      pods: "replicas",
    },
    frontend: { title: "เลือกเวลา", sub: "ขูดหินปูน · 45 นาที", book: "จองเลย", booked: "จองแล้ว" },
    integrations: {
      order: "ออร์เดอร์",
      item: "ชุดผ้าปูเตียง × 2",
      paid: "ชำระแล้ว",
      msg: "ออร์เดอร์ #1001 กำลังจัดส่งแล้วนะคะ",
      track: "ติดตามพัสดุ",
    },
  },
} as const satisfies Record<Locale, unknown>;
export type BentoCopy = (typeof COPY)[Locale];
