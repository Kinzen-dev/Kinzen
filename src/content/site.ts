import "server-only";
import { siteContent, type SiteContent, type SiteContentInput } from "./schema";

/**
 * Every public claim below is cleared in the private claims ledger
 * (kittipong-resume/content/CLAIMS.md, resume v1.5). Do not add a number,
 * client name or outcome here without a ledger row; `provenance` points at it.
 */
const content: SiteContentInput = {
  meta: { updated: "2026-10", claimsLedger: "kittipong-resume/content/CLAIMS.md (v1.5)" },

  profile: {
    name: "Kittipong Khonthong",
    displayName: { en: "Kittipong Khonthong", th: "กฤติพงษ์ ก้อนทอง" },
    preferredName: "King",
    handle: "Kinzen",
    role: { en: "Senior Full-Stack Engineer", th: "วิศวกร full-stack ระดับ senior" },
    heroLine: {
      en: "I build production software end to end: TypeScript backends, Shopify platforms, and AI voice and LINE products with guardrails written in code.",
      th: "ผมสร้างซอฟต์แวร์ที่ใช้งานจริงครบทั้งระบบ: ระบบหลังบ้านด้วย TypeScript แพลตฟอร์ม Shopify และผลิตภัณฑ์ AI รับสายและตอบแชท LINE ที่มีกฎกำกับเขียนไว้ในโค้ด",
    },
    oneLiner: {
      en: "Senior full-stack engineer and founder of Vesperwerk. Seven years shipping production TypeScript systems, from Shopify commerce platforms to AI voice and LINE products.",
      th: "วิศวกร full-stack ระดับ senior และผู้ก่อตั้ง Vesperwerk ทำระบบ TypeScript ที่ใช้งานจริงมา 7 ปี ตั้งแต่แพลตฟอร์มอีคอมเมิร์ซบน Shopify ไปจนถึงผลิตภัณฑ์ AI ด้านเสียงและ LINE",
    },
    bioShort: {
      en: "I'm King, a senior full-stack engineer in Bangkok. I spent four years as Tech Lead for AnyMind Group's EC Platform, building Shopify storefronts, apps and headless builds. Today I run Vesperwerk, a small software studio, where I build AI voice and LINE products with deterministic guardrails.",
      th: "ผมคิง วิศวกร full-stack ระดับ senior อยู่กรุงเทพฯ เคยเป็น Tech Lead ดูแล EC Platform ของ AnyMind Group อยู่ 4 ปี ทำหน้าร้าน แอป และระบบ headless บน Shopify ตอนนี้ผมทำ Vesperwerk สตูดิโอซอฟต์แวร์เล็ก ๆ สร้างผลิตภัณฑ์ AI ด้านเสียงและ LINE ที่มีชุดตรวจแบบ deterministic กำกับทุกคำตอบ",
    },
    bioLong: {
      en: [
        "I'm Kittipong Khonthong, King to most people: a senior full-stack engineer with seven years in production across e-commerce, backend platforms and AI products.",
        "From 2022 to 2026 I was Tech Lead for AnyMind Group's EC Platform: Shopify storefronts, apps and headless builds for brands such as Mizuno Thailand, built on the Admin GraphQL and Storefront APIs, Liquid, metafields and app proxies. Before that I was a full-stack developer at ZyGen, shipping React, Next.js, Angular and NestJS applications on Docker and GKE.",
        "Since April 2026 I run Vesperwerk, a small software studio. Its first product, Yimwhan AI, is a phone and LINE receptionist for dental clinics, with a deterministic safety guard that blocks diagnoses, dosing advice and cure claims in every patient-facing reply. I also built Helm, a macOS workspace where Claude Code, Codex, Kimi and Cursor agents work side by side.",
      ],
      th: [
        "ผมชื่อกฤติพงษ์ ก้อนทอง คนส่วนใหญ่เรียกผมว่าคิง เป็นวิศวกร full-stack ระดับ senior ทำระบบที่ใช้งานจริงมา 7 ปี ทั้งอีคอมเมิร์ซ แพลตฟอร์มหลังบ้าน และผลิตภัณฑ์ AI",
        "ปี 2022 ถึง 2026 ผมเป็น Tech Lead ดูแล EC Platform ของ AnyMind Group ทำหน้าร้าน แอป และระบบ headless บน Shopify ให้แบรนด์อย่าง Mizuno Thailand ด้วย Admin GraphQL API, Storefront API, Liquid, metafields และ app proxy ก่อนหน้านั้นผมเป็นนักพัฒนา full-stack ที่ ZyGen ทำแอปด้วย React, Next.js, Angular และ NestJS บน Docker และ GKE",
        "ตั้งแต่เมษายน 2026 ผมทำ Vesperwerk สตูดิโอซอฟต์แวร์เล็ก ๆ ผลงานแรกคือ Yimwhan AI ผู้ช่วยรับสายและตอบแชท LINE ให้คลินิกทันตกรรม มีชุดตรวจแบบ deterministic ที่กันการวินิจฉัย การแนะนำขนาดยา และการอ้างว่ารักษาหาย ในทุกคำตอบที่ถึงคนไข้ ผมยังสร้าง Helm แอป macOS ที่ให้ agent อย่าง Claude Code, Codex, Kimi และ Cursor ทำงานเคียงข้างกัน",
      ],
    },
    location: {
      city: { en: "Bangkok", th: "กรุงเทพฯ" },
      country: { en: "Thailand", th: "ประเทศไทย" },
      timezone: "Asia/Bangkok",
      remote: true,
    },
    careerStart: "2019-10",
    availability: {
      visibility: "hidden",
      employment: {
        en: "Open to senior and lead engineering roles on product teams. Remote first; Bangkok on-site for the right team.",
      },
      studio: {
        en: "Selected builds through Vesperwerk: AI voice and LINE assistants with guardrails in code; Shopify storefronts, apps and API migrations; TypeScript backends and integrations.",
      },
    },
  },

  practices: [
    {
      id: "ai-teams",
      title: { en: "Agent teams", th: "ทีม agent" },
      text: {
        en: "AI coding agents run as a team: Claude Code and Codex with written roles, handoffs and one accountable lead.",
        th: "agent เขียนโค้ดทำงานกันเป็นทีม: Claude Code และ Codex มีหน้าที่เขียนไว้ชัด ส่งงานต่อกันเป็นขั้นตอน และมีหัวหน้าทีมหนึ่งเดียวที่รับผิดชอบ",
      },
      provenance: { claimId: "ai-teams", source: "CLAIMS", confidence: "APPROVED" },
    },
    {
      id: "ai-evidence",
      title: { en: "Evidence before merge", th: "มีหลักฐานก่อน merge" },
      text: {
        en: "Nothing merges without the full test suite on the exact commit, an independent review and UI screenshot QA.",
        th: "ไม่มีโค้ดไหน merge ได้ จนกว่าจะผ่านเทสต์ครบชุดบน commit นั้นจริง ผ่านการตรวจจากผู้ตรวจอิสระ และผ่านการตรวจ UI จากภาพหน้าจอ",
      },
      provenance: { claimId: "ai-evidence", source: "CLAIMS", confidence: "APPROVED" },
    },
    {
      id: "ai-guards",
      title: { en: "Code over prompts", th: "กฎอยู่ในโค้ด ไม่ใช่ใน prompt" },
      text: {
        en: "Validators and state machines enforce output rules. Prompts stay thin; the rules that matter live in code and tests.",
        th: "validator และ state machine เป็นตัวบังคับกฎของคำตอบ prompt สั้นเท่าที่จำเป็น ส่วนกฎที่สำคัญอยู่ในโค้ดและเทสต์",
      },
      provenance: { claimId: "ai-guards", source: "CLAIMS", confidence: "APPROVED" },
    },
  ],

  experience: [
    {
      id: "exp-founder",
      org: { name: "Vesperwerk Co., Ltd." },
      title: { en: "Founder and Software Engineer", th: "ผู้ก่อตั้งและวิศวกรซอฟต์แวร์" },
      type: "founder",
      start: "2026-04",
      end: "present",
      location: { en: "Bangkok", th: "กรุงเทพฯ" },
      summary: {
        en: "A small software studio building AI voice and LINE products with the rules written in code.",
        th: "สตูดิโอซอฟต์แวร์เล็ก ๆ ที่สร้างผลิตภัณฑ์ AI ด้านเสียงและ LINE โดยเขียนกฎไว้ในโค้ด",
      },
      stack: ["TypeScript", "Fastify", "Twilio", "LINE Messaging API", "Tauri", "Rust", "Fly.io"],
      visibility: "public",
      highlights: [
        {
          text: {
            en: "Built Yimwhan AI, a phone and LINE receptionist for dental clinics, with a staff back office using Fastify, Twilio and the LINE Messaging API.",
            th: "สร้าง Yimwhan AI ผู้ช่วยรับสายและตอบแชท LINE ให้คลินิกทันตกรรม พร้อมระบบหลังบ้านสำหรับพนักงานคลินิก ด้วย Fastify, Twilio และ LINE Messaging API",
          },
          provenance: { claimId: "exp-founder.bullet-1", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "Built deterministic guards for patient-facing replies; a replay of 500 real customer messages passed all checks after code filters rescued 37 raw model violations.",
            th: "สร้างชุดตรวจแบบ deterministic สำหรับคำตอบที่ถึงคนไข้ เมื่อนำข้อความจริงจากลูกค้า 500 ข้อความมารันซ้ำ ผ่านการตรวจครบทุกข้อ โดยตัวกรองในโค้ดดักคำตอบดิบจากโมเดลที่ผิดกฎไว้ได้ 37 ครั้ง",
          },
          provenance: { claimId: "exp-founder.bullet-2", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "Traced stalled Thai calls to carrier silence suppression and restored audio processing with server-side silence-frame injection; Twilio support confirmed the cause.",
            th: "ไล่หาสาเหตุที่สายภาษาไทยค้าง จนเจอว่าผู้ให้บริการเครือข่ายตัดช่วงเงียบทิ้ง แล้วทำให้การประมวลผลเสียงกลับมาทำงานด้วยการเติมเฟรมเงียบจากฝั่งเซิร์ฟเวอร์ ทีมซัพพอร์ตของ Twilio ยืนยันสาเหตุนี้",
          },
          provenance: { claimId: "exp-founder.bullet-3", source: "CLAIMS", confidence: "STATED" },
        },
        {
          text: {
            en: "Built Helm in Tauri 2, Rust and TypeScript: a macOS agent workspace used daily as the primary development environment.",
            th: "สร้าง Helm ด้วย Tauri 2, Rust และ TypeScript: พื้นที่ทำงานของ agent บน macOS ที่ผมใช้เป็นเครื่องมือพัฒนาหลักทุกวัน",
          },
          provenance: { claimId: "exp-founder.bullet-5", source: "CLAIMS", confidence: "VERIFIED" },
        },
      ],
    },
    {
      id: "exp-anymind",
      org: { name: "AnyMind Group" },
      title: { en: "Tech Lead, EC Platform", th: "Tech Lead, EC Platform" },
      type: "full-time",
      start: "2022-01",
      end: "2026-03",
      location: { en: "Remote", th: "ทำงานทางไกล" },
      summary: {
        en: "Led engineering for the EC Platform: Shopify storefronts, apps and headless commerce for brands.",
        th: "นำงานวิศวกรรมของ EC Platform: หน้าร้าน แอป และระบบ headless commerce บน Shopify ให้แบรนด์ต่าง ๆ",
      },
      stack: ["Shopify", "GraphQL", "Liquid", "Next.js", "TypeScript"],
      visibility: "public",
      highlights: [
        {
          text: {
            en: "Led EC Platform engineering: Shopify storefronts, apps and headless builds, including Mizuno Thailand.",
            th: "คุมงานวิศวกรรม EC Platform ทั้งหน้าร้าน แอป และระบบ headless บน Shopify รวมถึงงานของ Mizuno Thailand",
          },
          provenance: { claimId: "exp-anymind", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "Delivered Shopify integrations using the Admin GraphQL and Storefront APIs, Liquid, metafields and app proxies, alongside Next.js services.",
            th: "ทำงานเชื่อมต่อ Shopify ด้วย Admin GraphQL API, Storefront API, Liquid, metafields และ app proxy ควบคู่กับเซอร์วิสที่เขียนด้วย Next.js",
          },
          provenance: { claimId: "exp-anymind.bullet-2", source: "CLAIMS", confidence: "STATED" },
        },
        {
          text: {
            en: "Migrated legacy apps to the Shopify Dev Dashboard and upgraded to the January 2026 Admin API.",
            th: "ย้ายแอปเก่าไปที่ Shopify Dev Dashboard และอัปเกรดไปใช้ Admin API เวอร์ชันมกราคม 2026",
          },
          provenance: { claimId: "exp-anymind.bullet-3", source: "CLAIMS", confidence: "STATED" },
        },
        {
          text: {
            en: "Reviewed code, ran performance tests and coordinated releases across cross-functional teams.",
            th: "รีวิวโค้ด ทดสอบ performance และประสานการ release กับทีมหลายฝ่าย",
          },
          provenance: { claimId: "exp-anymind", source: "CLAIMS", confidence: "STATED" },
        },
      ],
    },
    {
      id: "exp-zygen",
      org: { name: "ZyGen Co., Ltd." },
      title: { en: "Full Stack Developer", th: "นักพัฒนา full-stack" },
      type: "full-time",
      start: "2019-10",
      end: "2022-01",
      location: { en: "Bangkok", th: "กรุงเทพฯ" },
      summary: {
        en: "Full-stack delivery across web apps, data platforms and the infrastructure under them.",
        th: "ทำงาน full-stack ครบทั้งเว็บแอป แพลตฟอร์มข้อมูล และโครงสร้างพื้นฐานที่อยู่เบื้องหลัง",
      },
      stack: ["React", "Next.js", "Angular", "NestJS", "GraphQL", "MongoDB", "Docker", "GKE"],
      visibility: "public",
      highlights: [
        {
          text: {
            en: "Delivered React, Next.js, Angular and NestJS applications with GraphQL, MongoDB, SQL Server and Redis, including a LINE LIFF app.",
            th: "ทำแอปด้วย React, Next.js, Angular และ NestJS ร่วมกับ GraphQL, MongoDB, SQL Server และ Redis รวมถึงแอป LINE LIFF",
          },
          provenance: { claimId: "exp-zygen", source: "CLAIMS", confidence: "STATED" },
        },
        {
          text: {
            en: "Ran delivery infrastructure on Docker, GKE, GitLab CI/CD, Argo Workflows and Azure App Service.",
            th: "ดูแลระบบ deploy บน Docker, GKE, GitLab CI/CD, Argo Workflows และ Azure App Service",
          },
          provenance: { claimId: "exp-zygen", source: "CLAIMS", confidence: "STATED" },
        },
        {
          text: {
            en: "Technical lead for the Unique Influencer web platform (React, NestJS queues and cron jobs, MariaDB); earlier, Python NLP classifiers and SAP ABAP.",
            th: "เป็น technical lead ของเว็บแพลตฟอร์ม Unique Influencer (React, NestJS queue และ cron job, MariaDB) ก่อนหน้านั้นทำโมเดลจำแนกข้อความ (NLP) ด้วย Python และงาน SAP ABAP",
          },
          provenance: { claimId: "exp-zygen", source: "CLAIMS", confidence: "STATED" },
        },
      ],
    },
    {
      id: "exp-contract",
      org: { name: "Confidential client", confidential: true },
      title: { en: "Senior Full-Stack Developer" },
      type: "part-time-contract",
      start: "2022-04",
      end: "present",
      location: { en: "Remote" },
      summary: { en: "Part-time contract (kept private)." },
      stack: ["TypeScript"],
      visibility: "hidden",
      highlights: [],
    },
  ],

  projects: [
    {
      id: "proj-yimwhan",
      slug: "yimwhan-ai",
      name: "Yimwhan AI",
      tagline: {
        en: "A phone and LINE receptionist for dental clinics, with clinical-safety guards in code.",
        th: "ผู้ช่วยรับสายและตอบแชท LINE ให้คลินิกทันตกรรม พร้อมชุดตรวจความปลอดภัยทางคลินิกที่เขียนเป็นโค้ด",
      },
      kind: "product",
      area: "ai",
      status: "in-production",
      period: { start: "2026-05", end: "present" },
      role: { en: "Solo build", th: "ทำคนเดียวทั้งระบบ" },
      stack: [
        "TypeScript",
        "Fastify",
        "Twilio",
        "LINE Messaging API",
        "Gemini on Vertex AI",
        "Claude",
        "SQLite",
        "Litestream",
        "Fly.io",
      ],
      experienceId: "exp-founder",
      confidentiality: "C2-bounded",
      featured: true,
      visibility: "public",
      links: [],
      outcomes: [
        {
          text: {
            en: "A deterministic safety guard blocks diagnoses, dosing advice and cure claims in every patient-facing reply, across voice, LINE and outbound recall.",
            th: "ชุดตรวจแบบ deterministic กันการวินิจฉัย การแนะนำขนาดยา และการอ้างว่ารักษาหาย ในทุกคำตอบที่ถึงคนไข้ ทั้งทางเสียง LINE และการโทรติดตามคนไข้",
          },
          provenance: { claimId: "exp-founder (clinical-safety-invariant)", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "A replay of 500 real customer messages passed all checks after code filters rescued 37 raw model violations.",
            th: "นำข้อความจริงจากลูกค้า 500 ข้อความมารันซ้ำ ผ่านการตรวจครบทุกข้อ โดยตัวกรองในโค้ดดักคำตอบดิบจากโมเดลที่ผิดกฎไว้ได้ 37 ครั้ง",
          },
          provenance: { claimId: "exp-founder.bullet-2", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "Production has run on a dedicated phone number since July 2026, with gated releases and one-step rollback.",
            th: "ระบบ production รันบนเบอร์โทรเฉพาะมาตั้งแต่กรกฎาคม 2026 ทุก release ต้องผ่านด่านตรวจ และย้อนกลับได้ในขั้นตอนเดียว",
          },
          provenance: { claimId: "exp-founder.bullet-4", source: "CLAIMS", confidence: "VERIFIED" },
        },
      ],
      caseStudy: {
        problem: {
          en: "An AI receptionist for a dental clinic has to answer fast in Thai, by phone and on LINE, and must never give clinical advice.",
          th: "AI รับสายของคลินิกทันตกรรมต้องตอบเป็นภาษาไทยได้เร็ว ทั้งทางโทรศัพท์และ LINE และห้ามให้คำแนะนำด้านการรักษาเด็ดขาด",
        },
        approach: {
          en: [
            "Kept prompts thin and moved the rules into code: validators and one shared clinical-safety check run on every patient-facing reply.",
            "Hardened the check against Unicode format-character tricks that slip past naive string matching.",
            "Replayed real conversations through the production pipeline before release, and shipped through gated releases with one-step rollback.",
          ],
          th: [
            "เขียน prompt ให้สั้น แล้วย้ายกฎไปไว้ในโค้ด: validator และชุดตรวจความปลอดภัยทางคลินิกชุดเดียวที่ใช้ร่วมกัน ทำงานกับทุกคำตอบที่ถึงคนไข้",
            "ปิดช่องที่ใช้อักขระจัดรูปแบบของ Unicode ซึ่งมองไม่เห็น หลบการตรวจ (การเทียบข้อความแบบตรง ๆ จับไม่ได้)",
            "นำบทสนทนาจริงมารันซ้ำผ่าน pipeline เดียวกับ production ก่อน release และปล่อยงานผ่านด่านตรวจ ย้อนกลับได้ในขั้นตอนเดียว",
          ],
        },
        result: {
          en: "On a replay of 500 real customer messages, the code filters rescued all 37 raw model violations and every message passed.",
          th: "นำข้อความจริงจากลูกค้า 500 ข้อความมารันซ้ำ ตัวกรองในโค้ดดักคำตอบดิบจากโมเดลที่ผิดกฎได้ครบทั้ง 37 ครั้ง และทุกข้อความผ่าน",
        },
        limits: {
          en: "A bounded replay, not a promise about every future conversation.",
          th: "เป็นการรันซ้ำในขอบเขตจำกัด ไม่ใช่คำรับประกันสำหรับทุกบทสนทนาในอนาคต",
        },
      },
    },
    {
      id: "proj-helm",
      slug: "helm",
      name: "Helm",
      tagline: {
        en: "A macOS workspace where Claude Code, Codex, Kimi and Cursor agents work side by side.",
        th: "พื้นที่ทำงานบน macOS ที่ให้ agent อย่าง Claude Code, Codex, Kimi และ Cursor ทำงานเคียงข้างกัน",
      },
      kind: "internal-tool",
      area: "tools",
      status: "internal",
      period: { start: "2026-07", end: "present" },
      role: { en: "Solo build", th: "ทำคนเดียวทั้งระบบ" },
      stack: ["Tauri 2", "Rust", "TypeScript"],
      experienceId: "exp-founder",
      confidentiality: "C1-description-only",
      featured: true,
      visibility: "public",
      links: [],
      outcomes: [
        {
          text: {
            en: "In daily use as my primary development environment.",
            th: "ผมใช้เป็นเครื่องมือพัฒนาหลักทุกวัน",
          },
          provenance: { claimId: "exp-founder.bullet-5", source: "CLAIMS", confidence: "VERIFIED" },
        },
      ],
    },
    {
      id: "proj-ronglen",
      slug: "ronglen",
      name: "Ronglen",
      tagline: {
        en: "Thai-first spoken party games for 2 to 8 players, on one device or in online voice rooms.",
        th: "โรงเล่น: เกมปาร์ตี้ภาษาไทยที่เล่นด้วยการพูด สำหรับ 2 ถึง 8 คน เล่นบนเครื่องเดียวหรือในห้องเสียงออนไลน์ก็ได้",
      },
      kind: "side-project",
      area: "games",
      status: "live",
      period: { start: "2026-08", end: "2026-08" },
      role: { en: "Solo build", th: "ทำคนเดียวทั้งระบบ" },
      stack: ["React 19", "Vite", "LiveKit", "Vercel Functions"],
      confidentiality: "C0-public-artifact",
      featured: true,
      visibility: "public",
      links: [{ kind: "live", label: "ronglen.vercel.app", href: "https://ronglen.vercel.app", visibility: "public" }],
      outcomes: [
        {
          text: {
            en: "Online rooms run on LiveKit (WebRTC audio), with Vercel Functions creating game-bound rooms and issuing scoped participant tokens.",
            th: "ห้องออนไลน์ใช้ LiveKit (เสียงผ่าน WebRTC) โดยมี Vercel Functions สร้างห้องที่ผูกกับแต่ละเกม และออก token สิทธิ์จำกัดให้ผู้เล่นแต่ละคน",
          },
          provenance: { claimId: "proj-ronglen.bullet-1", source: "CLAIMS", confidence: "VERIFIED" },
        },
      ],
    },
    {
      id: "proj-visual-qa",
      slug: "visual-qa-harness",
      name: "Visual QA harness",
      tagline: {
        en: "Playwright-based UI verification with geometry checks, interaction crawling and independent AI review.",
        th: "ระบบตรวจ UI ด้วย Playwright: เช็คตำแหน่งและขนาดขององค์ประกอบ ไล่ใช้งานหน้าจออัตโนมัติ และให้ AI อีกตัวตรวจซ้ำอิสระ",
      },
      kind: "internal-tool",
      area: "tools",
      status: "internal",
      period: { start: "2026-07" },
      role: { en: "Solo build", th: "ทำคนเดียวทั้งระบบ" },
      stack: ["Node.js", "Playwright", "Claude Code"],
      confidentiality: "C1-description-only",
      featured: false,
      visibility: "public",
      links: [],
      outcomes: [
        {
          text: {
            en: "Caught 35 of 38 seeded bugs on its benchmark app; the blind reviewers found two bugs (a search race and a pagination off-by-one) that no deterministic layer could.",
            th: "จับบั๊กที่ฝังไว้ได้ 35 จาก 38 ตัวบนแอป benchmark และ AI ผู้ตรวจที่ไม่รู้บริบทมาก่อนเจอบั๊ก 2 ตัว (race condition ตอนค้นหา และ off-by-one ใน pagination) ที่ไม่มีชั้นตรวจแบบ deterministic ชั้นไหนจับได้",
          },
          provenance: { claimId: "proj-visual-qa", source: "CLAIMS", confidence: "STATED" },
        },
      ],
    },
    {
      id: "proj-cadence",
      slug: "cadence",
      name: "Cadence",
      tagline: {
        en: "macOS voice dictation: a native menu-bar shell over a compiled real-time speech engine.",
        th: "แอปพิมพ์ด้วยเสียงบน macOS: แอป native บนแถบเมนูที่ครอบเอนจินแปลงเสียงพูดเป็นข้อความแบบเรียลไทม์ซึ่งคอมไพล์เป็นไบนารี",
      },
      kind: "internal-tool",
      area: "tools",
      status: "internal",
      period: { start: "2026-07", end: "2026-08" },
      role: { en: "Solo build", th: "ทำคนเดียวทั้งระบบ" },
      stack: ["Swift", "TypeScript", "Bun", "Soniox"],
      experienceId: "exp-founder",
      confidentiality: "C1-description-only",
      featured: false,
      visibility: "public",
      links: [],
      outcomes: [
        {
          text: {
            en: "Supervised engine with crash backoff, prompt-free permission checks and verified signed builds.",
            th: "เอนจินมีตัวคุมที่รีสตาร์ตแบบเว้นระยะเมื่อล่ม เช็คสิทธิ์ได้โดยไม่เด้งถามผู้ใช้ และ build ที่ sign แล้วผ่านการตรวจยืนยัน",
          },
          provenance: { claimId: "proj-cadence", source: "CLAIMS", confidence: "VERIFIED" },
        },
      ],
    },
  ],

  skills: [
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
      items: [
        "MongoDB",
        "PostgreSQL",
        "Redis",
        "SQLite",
        "Docker",
        "Kubernetes (GKE)",
        "Fly.io",
        "Cloudflare",
        "Azure",
      ],
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
  ],

  education: [
    {
      school: {
        en: "King Mongkut's Institute of Technology Ladkrabang",
        th: "สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง",
      },
      degree: { en: "B.Eng., Computer Engineering", th: "วิศวกรรมศาสตรบัณฑิต สาขาวิศวกรรมคอมพิวเตอร์" },
      start: "2015",
      end: "2019",
    },
  ],

  languages: [
    { name: { en: "Thai", th: "ไทย" }, level: { en: "Native", th: "ภาษาแม่" } },
    {
      name: { en: "English", th: "อังกฤษ" },
      level: { en: "Professional working proficiency", th: "ใช้ทำงานได้ระดับมืออาชีพ" },
    },
  ],

  links: [
    { kind: "email", label: "ktpz.dev@gmail.com", href: "mailto:ktpz.dev@gmail.com", visibility: "public" },
    {
      kind: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/kittipong-khonthong-161021213",
      visibility: "public",
    },
    { kind: "github", label: "GitHub", href: "https://github.com/Kinzen-dev", visibility: "hidden" },
  ],

  personal: {
    visibility: "public",
    lines: [
      {
        en: "Manchester United, cars built for both looks and pace, and a long queue of games.",
        th: "แมนเชสเตอร์ ยูไนเต็ด รถที่ทั้งสวยและแรง และเกมที่รอคิวเล่นอีกยาว",
      },
    ],
  },
};

export const site: SiteContent = siteContent.parse(content);
