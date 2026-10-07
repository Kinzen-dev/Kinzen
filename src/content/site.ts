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
      en: "Production software, end to end: TypeScript backends, Shopify platforms, and AI voice and LINE products with guardrails written in code.",
      th: "ซอฟต์แวร์ที่ใช้งานจริงครบทั้งระบบ: ระบบหลังบ้านด้วย TypeScript แพลตฟอร์ม Shopify และผลิตภัณฑ์ AI รับสายและตอบแชท LINE ที่มีกฎกำกับเขียนไว้ในโค้ด",
    },
    oneLiner: {
      en: "Senior full-stack engineer and founder of Vesperwerk. Seven years shipping production TypeScript systems, from Shopify commerce platforms to AI voice and LINE products.",
      th: "วิศวกร full-stack ระดับ senior และผู้ก่อตั้ง Vesperwerk ทำระบบ TypeScript ที่ใช้งานจริงมา 7 ปี ตั้งแต่แพลตฟอร์มอีคอมเมิร์ซบน Shopify ไปจนถึงผลิตภัณฑ์ AI ด้านเสียงและ LINE",
    },
    bioShort: {
      en: "I'm King, a senior full-stack engineer in Bangkok. I spent four years as Tech Lead for AnyMind Group's EC Platform, building Shopify storefronts, apps and headless builds. Today I run Vesperwerk, a small software studio, where I build AI voice and LINE products with deterministic guardrails.",
      th: "ผมคิง วิศวกร full-stack ระดับ senior อยู่กรุงเทพฯ เคยเป็น Tech Lead ดูแล EC Platform ของ AnyMind Group อยู่ 4 ปี ทำหน้าร้าน แอป และระบบ headless บน Shopify ตอนนี้ผมทำ Vesperwerk สตูดิโอซอฟต์แวร์เล็ก ๆ สร้างผลิตภัณฑ์ AI ด้านเสียงและ LINE ที่มีชุดตรวจตามกฎในโค้ด (deterministic)",
    },
    bioLong: {
      en: [
        "I'm Kittipong Khonthong, King to most people: a senior full-stack engineer with seven years in production across e-commerce, backend platforms and AI products.",
        "From 2022 to 2026 I was Tech Lead for AnyMind Group's EC Platform: Shopify storefronts, apps and headless builds for brands such as Mizuno Thailand, built on the Admin GraphQL and Storefront APIs, Liquid, metafields and app proxies. Before that I was a full-stack developer at ZyGen, shipping React, Next.js, Angular and NestJS applications on Docker and GKE.",
        "Since April 2026 I run Vesperwerk, a small software studio. Its first product, Yimwhan AI, is a phone and LINE receptionist for dental clinics, with deterministic checks in code that review each reply before it reaches a patient, under rules that block diagnoses, dosing advice and cure claims. I also built Helm, a macOS workspace where Claude Code, Codex, Kimi and Cursor agents work side by side.",
      ],
      th: [
        "ผมชื่อกฤติพงษ์ ก้อนทอง คนส่วนใหญ่เรียกผมว่าคิง เป็นวิศวกร full-stack ระดับ senior ทำระบบที่ใช้งานจริงมา 7 ปี ทั้งอีคอมเมิร์ซ แพลตฟอร์มหลังบ้าน และผลิตภัณฑ์ AI",
        "ปี 2022 ถึง 2026 ผมเป็น Tech Lead ดูแล EC Platform ของ AnyMind Group ทำหน้าร้าน แอป และระบบ headless บน Shopify ให้แบรนด์อย่าง Mizuno Thailand ด้วย Admin GraphQL API, Storefront API, Liquid, metafields และ app proxy ก่อนหน้านั้นผมเป็นนักพัฒนา full-stack ที่ ZyGen ทำแอปด้วย React, Next.js, Angular และ NestJS บน Docker และ GKE",
        "ตั้งแต่เมษายน 2026 ผมทำ Vesperwerk สตูดิโอซอฟต์แวร์เล็ก ๆ ผลงานแรกคือ Yimwhan AI ผู้ช่วยรับสายและตอบแชท LINE ให้คลินิกทันตกรรม มีชุดตรวจตามกฎที่กำหนดไว้ในโค้ด (deterministic) ก่อนส่งคำตอบถึงคนไข้ โดยมีกฎบล็อกการวินิจฉัย การแนะนำขนาดยา และการอ้างว่ารักษาหาย ผมยังสร้าง Helm แอป macOS ที่ให้ agent อย่าง Claude Code, Codex, Kimi และ Cursor ทำงานเคียงข้างกัน",
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
      visibility: "public",
      employment: {
        en: "Senior and lead engineering roles on product teams. Remote first; Bangkok on-site for the right team.",
        th: "ตำแหน่ง senior หรือ lead ในทีมที่ทำผลิตภัณฑ์ ทำงานทางไกลเป็นหลัก หรือเข้าออฟฟิศในกรุงเทพฯ ถ้าทีมเหมาะกัน",
      },
      studio: {
        en: "Project work through Vesperwerk: AI voice and LINE assistants with guardrails in code, Shopify storefronts, apps and API migrations, and TypeScript backends and integrations.",
        th: "งานโปรเจกต์ผ่าน Vesperwerk: ผู้ช่วย AI ทางเสียงและ LINE ที่มีกฎเขียนเป็นโค้ด หน้าร้าน แอป และการย้าย API บน Shopify รวมถึงระบบหลังบ้านและการเชื่อมต่อด้วย TypeScript",
      },
      studioUrl: { en: "https://vesperwerk.com/en", th: "https://vesperwerk.com/th" },
    },
  },

  practices: [
    {
      id: "ai-teams",
      title: { en: "Agent teams", th: "ทีม agent" },
      text: {
        en: "Claude Code and Codex work together in written roles, hand work on in steps, and have one clearly named owner.",
        th: "Claude Code และ Codex ทำงานร่วมกันตามบทบาทที่กำหนดไว้ ส่งต่องานเป็นขั้นตอน และกำหนดผู้รับผิดชอบหลักไว้อย่างชัดเจน",
      },
      provenance: { claimId: "ai-teams", source: "CLAIMS", confidence: "APPROVED" },
    },
    {
      id: "ai-evidence",
      title: { en: "Evidence before merge", th: "มีหลักฐานก่อน merge" },
      text: {
        en: "Before anything merges, I run the full test suite on the exact commit, get an independent review and check the UI from screenshots.",
        th: "ก่อน merge ผมกำหนดให้รันเทสต์ครบชุดบน commit ที่จะนำเข้า ตรวจโค้ดโดยผู้ตรวจอิสระ และตรวจ UI จากภาพหน้าจอ",
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
            en: "Built deterministic code checks for patient-facing replies. In a July 2026 test, 500 real customer messages ran through the LINE reply pipeline: the code checks caught 37 rule violations in raw model drafts, mostly overstated claims, and every final reply passed those checks in this test set.",
            th: "สร้างชุดตรวจในโค้ดแบบ deterministic (ตรวจตามกฎที่กำหนดไว้) สำหรับคำตอบที่ถึงคนไข้ ทดสอบเมื่อกรกฎาคม 2026 โดยส่งข้อความจริงจากลูกค้า 500 ข้อความเข้าเส้นทางตอบกลับของ LINE ชุดตรวจในโค้ดจับร่างคำตอบจากโมเดลที่ผิดกฎได้ 37 ครั้ง ส่วนใหญ่เป็นคำอวดอ้างเกินจริง และในการทดสอบนี้ คำตอบสุดท้ายทุกข้อความผ่านการตรวจทั้งหมด",
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
            en: "Took requirements from the PM, estimated the work, delegated it across the team, and delivered stores for brands including Mizuno Thailand.",
            th: "รับโจทย์จาก PM ประเมินงาน กระจายงานให้ทีม และส่งมอบร้านค้าให้แบรนด์ต่าง ๆ รวมถึง Mizuno Thailand",
          },
          provenance: { claimId: "exp-anymind", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "Delivered Shopify integrations using the Admin GraphQL and Storefront APIs, Liquid, metafields and app proxies, alongside Next.js services.",
            th: "เชื่อมต่อ Shopify ด้วย Admin GraphQL API, Storefront API, Liquid, metafields และ app proxy ร่วมกับบริการที่พัฒนาด้วย Next.js",
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
            th: "รีวิวโค้ด ทดสอบประสิทธิภาพ และประสานการออกเวอร์ชันกับทีมที่เกี่ยวข้อง",
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
      aliases: ["ยิ้มหวาน"],
      tagline: {
        en: "A phone and LINE receptionist for dental clinics, with code that checks replies against set rules.",
        th: "ผู้ช่วยรับสายและตอบแชท LINE ให้คลินิกทันตกรรม พร้อมโค้ดตรวจคำตอบตามกฎที่กำหนด",
      },
      kind: "product",
      area: "ai",
      status: "in-production",
      period: { start: "2026-05", end: "present" },
      role: { en: "Solo build", th: "พัฒนาทั้งระบบด้วยตนเอง" },
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
            en: "Deterministic checks in code review each draft before it reaches a patient, across voice, LINE and outbound recall, with rules that block diagnoses, dosing advice and cure claims.",
            th: "ชุดตรวจตามกฎที่กำหนดไว้ในโค้ด (deterministic) ตรวจร่างคำตอบก่อนส่งถึงคนไข้ ทั้งทางเสียง LINE และการโทรติดตาม โดยมีกฎบล็อกการวินิจฉัย การแนะนำขนาดยา และการอ้างว่ารักษาหาย",
          },
          provenance: { claimId: "exp-founder (clinical-safety-invariant)", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "In a July 2026 test, 500 real customer messages ran through the LINE reply pipeline: the code checks caught 37 rule violations in raw model drafts, mostly overstated claims, and every final reply passed those checks in this test set.",
            th: "ทดสอบเมื่อกรกฎาคม 2026 โดยส่งข้อความจริงจากลูกค้า 500 ข้อความเข้าเส้นทางตอบกลับของ LINE ชุดตรวจในโค้ดจับร่างคำตอบจากโมเดลที่ผิดกฎได้ 37 ครั้ง ส่วนใหญ่เป็นคำอวดอ้างเกินจริง และในการทดสอบนี้ คำตอบสุดท้ายทุกข้อความผ่านการตรวจทั้งหมด",
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
        context: {
          en: "An AI receptionist for a dental clinic has to answer fast in Thai, by phone and on LINE, and must never give clinical advice.",
          th: "AI รับสายของคลินิกทันตกรรมต้องตอบเป็นภาษาไทยได้เร็ว ทั้งทางโทรศัพท์และ LINE และห้ามให้คำแนะนำด้านการรักษาเด็ดขาด",
        },
        approach: {
          en: [
            "Kept prompts thin and moved the rules into code: validators and one shared rule check run on each patient-facing draft before it is sent.",
            "Hardened the check against Unicode format-character tricks that slip past naive string matching.",
            "Replayed real conversations through the production pipeline before release, and shipped through gated releases with one-step rollback.",
          ],
          th: [
            "เขียน prompt ให้สั้น แล้วย้ายกฎไปไว้ในโค้ด: validator และชุดตรวจคำตอบตามกฎชุดเดียวที่ใช้ร่วมกัน ตรวจร่างคำตอบก่อนส่งถึงคนไข้",
            "ปิดช่องที่ใช้อักขระจัดรูปแบบของ Unicode ซึ่งมองไม่เห็น หลบการตรวจ (การเทียบข้อความแบบตรง ๆ จับไม่ได้)",
            "นำบทสนทนาจริงมารันซ้ำผ่าน pipeline เดียวกับ production ก่อน release และปล่อยงานผ่านด่านตรวจ ย้อนกลับได้ในขั้นตอนเดียว",
          ],
        },
        result: {
          en: "In a July 2026 test, 500 real customer messages ran through the LINE reply pipeline: the code checks caught 37 rule violations in raw model drafts, mostly overstated claims, and every final reply passed those checks in this test set.",
          th: "ทดสอบเมื่อกรกฎาคม 2026 โดยส่งข้อความจริงจากลูกค้า 500 ข้อความเข้าเส้นทางตอบกลับของ LINE ชุดตรวจในโค้ดจับร่างคำตอบจากโมเดลที่ผิดกฎได้ 37 ครั้ง ส่วนใหญ่เป็นคำอวดอ้างเกินจริง และในการทดสอบนี้ คำตอบสุดท้ายทุกข้อความผ่านการตรวจทั้งหมด",
        },
        limits: {
          en: "A bounded replay, not a promise about every future conversation.",
          th: "เป็นการรันซ้ำในขอบเขตจำกัด ไม่ใช่คำรับประกันสำหรับทุกบทสนทนาในอนาคต",
        },
      },
    },
    {
      id: "proj-anymind-ec",
      slug: "anymind-ec-platform",
      name: "AnyMind EC Platform",
      aliases: ["AnyMind", "Mizuno", "Shopify"],
      tagline: {
        en: "Shopify storefronts, apps and headless builds for brands, led as Tech Lead for four years.",
        th: "พัฒนาหน้าร้าน แอป และระบบ headless บน Shopify ให้แบรนด์ต่าง ๆ โดยผมดูแลงานในฐานะ Tech Lead เป็นเวลา 4 ปี",
      },
      kind: "platform",
      area: "commerce",
      status: "delivered",
      period: { start: "2022-01", end: "2026-03" },
      role: { en: "Tech Lead", th: "Tech Lead" },
      stack: [
        "Shopify Admin GraphQL API",
        "Storefront API",
        "Liquid",
        "Metafields",
        "App proxies",
        "Next.js",
        "TypeScript",
      ],
      experienceId: "exp-anymind",
      confidentiality: "C2-bounded",
      featured: true,
      visibility: "public",
      links: [],
      outcomes: [
        {
          text: {
            en: "Led EC Platform engineering: Shopify storefronts, apps and headless builds, including Mizuno Thailand.",
            th: "นำทีมวิศวกรรม EC Platform ทำหน้าร้าน แอป และระบบ headless บน Shopify รวมถึง Mizuno Thailand",
          },
          provenance: { claimId: "exp-anymind", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "Delivered Shopify integrations using the Admin GraphQL and Storefront APIs, Liquid, metafields and app proxies, alongside Next.js services.",
            th: "ส่งมอบงานเชื่อมต่อ Shopify ด้วย Admin GraphQL API, Storefront API, Liquid, metafields และ app proxy ร่วมกับบริการที่พัฒนาด้วย Next.js",
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
      ],
      // King's own account of the role (SPEC-audit owner facts, 2026-10-07). No team size, store,
      // revenue or speed figures: King declined to publish them.
      caseStudy: {
        context: {
          en: "AnyMind Group's EC Platform built Shopify stores for many brands, Mizuno Thailand and MamyPoko among them. Most of the work was hard custom flows rather than stock themes.",
          th: "EC Platform ของ AnyMind Group สร้างร้านค้าบน Shopify ให้หลายแบรนด์ รวมถึง Mizuno Thailand และ MamyPoko งานส่วนใหญ่เป็น flow เฉพาะที่ซับซ้อน ไม่ใช่ธีมสำเร็จรูป",
        },
        scope: {
          en: "Tech Lead from January 2022 to March 2026, leading delivery on these stores. I was lead and senior developer at once: when a task was hard or the team was overloaded, I took it on myself.",
          th: "ผมเป็น Tech Lead ตั้งแต่มกราคม 2022 ถึงมีนาคม 2026 ดูแลการส่งมอบงานของร้านเหล่านี้ และทำงานเป็นทั้ง lead และนักพัฒนาระดับ senior ไปพร้อมกัน งานไหนยากหรือทีมงานล้นมือ ผมรับมาทำเอง",
        },
        approach: {
          en: [
            "Requirements came from the PM. I estimated the work, then split it and delegated it across the team.",
            "I ran knowledge-sharing sessions for the team.",
            "Everything ran in English, with colleagues in India, Indonesia, Singapore, Japan, Thailand and the West.",
            "I did this without AI coding tools: the estimates, the code and the reviews came from my own knowledge.",
          ],
          th: [
            "รับโจทย์จาก PM แล้วผมประเมินงาน แบ่งงาน และกระจายให้คนในทีม",
            "ผมจัดช่วงแบ่งปันความรู้ภายในทีม",
            "สื่อสารเป็นภาษาอังกฤษทั้งหมด กับเพื่อนร่วมงานในอินเดีย อินโดนีเซีย สิงคโปร์ ญี่ปุ่น ไทย และฝั่งตะวันตก",
            "ช่วงนั้นผมทำงานโดยไม่ได้ใช้เครื่องมือ AI ช่วยเขียนโค้ด การประเมินงาน โค้ด และการรีวิว มาจากความรู้ของผมเองทั้งหมด",
          ],
        },
        validation: {
          en: "I reviewed the team's code before delivery, ran performance tests and coordinated releases with the teams involved.",
          th: "ผมรีวิวโค้ดของทีมก่อนส่งมอบงาน ทดสอบประสิทธิภาพ และประสานการออกเวอร์ชันกับทีมที่เกี่ยวข้อง",
        },
        result: {
          en: "Stores for brands including Mizuno Thailand were delivered on this platform, with the integrations, the Dev Dashboard migration and the January 2026 Admin API upgrade listed above. Across my career I have worked on 20+ Shopify stores.",
          th: "ส่งมอบร้านค้าให้แบรนด์ต่าง ๆ รวมถึง Mizuno Thailand บนแพลตฟอร์มนี้ พร้อมงานเชื่อมต่อ การย้ายไป Dev Dashboard และการอัปเกรดไปใช้ Admin API เวอร์ชันมกราคม 2026 ตามรายการด้านบน ตลอดการทำงานที่ผ่านมา ผมทำร้านค้าบน Shopify มาแล้วไม่ต่ำกว่า 20 ร้าน",
        },
        limits: {
          en: "Client work: this page names two brands only, and gives no store traffic, revenue or team figures.",
          th: "เป็นงานของลูกค้า หน้านี้จึงระบุชื่อแบรนด์ไว้เพียงสองแบรนด์ และไม่มีตัวเลขยอดเข้าชม รายได้ หรือขนาดทีม",
        },
      },
      caseStudyVisibility: "public",
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
      role: { en: "Solo build", th: "พัฒนาทั้งระบบด้วยตนเอง" },
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
      aliases: ["โรงเล่น"],
      tagline: {
        en: "Thai-first spoken party games for 2 to 8 players, on one device or in online voice rooms.",
        th: "โรงเล่น: เกมปาร์ตี้ภาษาไทยที่เล่นด้วยการพูด สำหรับ 2 ถึง 8 คน เล่นบนเครื่องเดียวหรือในห้องเสียงออนไลน์ก็ได้",
      },
      kind: "side-project",
      area: "games",
      status: "live",
      period: { start: "2026-08", end: "2026-08" },
      role: { en: "Solo build", th: "พัฒนาทั้งระบบด้วยตนเอง" },
      stack: ["React 19", "Vite", "LiveKit", "Vercel Functions"],
      confidentiality: "C0-public-artifact",
      featured: true,
      visibility: "public",
      links: [{ kind: "live", label: "ronglen.vercel.app", href: "https://ronglen.vercel.app", visibility: "public" }],
      outcomes: [
        {
          text: {
            en: "Online rooms run on LiveKit (WebRTC audio), with Vercel Functions creating game-bound rooms and issuing scoped participant tokens.",
            th: "ห้องออนไลน์ใช้ LiveKit ส่งเสียงผ่าน WebRTC ส่วน Vercel Functions ใช้สร้างห้องสำหรับแต่ละเกมและออกโทเคนที่จำกัดสิทธิ์ให้ผู้เล่นแต่ละคน",
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
        th: "ระบบตรวจ UI ด้วย Playwright ตรวจตำแหน่งและขนาดขององค์ประกอบ ทดสอบการใช้งานหน้าจออัตโนมัติ และให้ AI อีกตัวตรวจซ้ำอย่างเป็นอิสระ",
      },
      kind: "internal-tool",
      area: "tools",
      status: "internal",
      period: { start: "2026-07" },
      role: { en: "Solo build", th: "พัฒนาทั้งระบบด้วยตนเอง" },
      stack: ["Node.js", "Playwright", "Claude Code"],
      confidentiality: "C1-description-only",
      featured: false,
      visibility: "public",
      links: [],
      outcomes: [
        {
          text: {
            en: "Caught 35 of 38 seeded bugs on its benchmark app in July 2026. Two of those 35, a search race and a pagination off-by-one, were found only by the blind AI reviewers; the deterministic checks in this benchmark missed them.",
            th: "ตรวจพบบั๊กที่จงใจใส่ไว้ในแอปทดสอบได้ 35 จาก 38 จุดเมื่อกรกฎาคม 2026 ในจำนวนนี้มี 2 จุดที่ AI ผู้ตรวจซึ่งไม่เห็นงานมาก่อนเป็นคนเจอ ได้แก่ race condition ระหว่างค้นหา และ off-by-one ในการแบ่งหน้า ซึ่งชุดตรวจแบบ deterministic ตรวจไม่พบในการทดสอบนี้",
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
        th: "แอปพิมพ์ด้วยเสียงสำหรับ macOS ทำงานจากแถบเมนู โดยเชื่อมต่อกับเอนจินถอดเสียงแบบเรียลไทม์ที่คอมไพล์เป็นไบนารี",
      },
      kind: "internal-tool",
      area: "tools",
      status: "internal",
      period: { start: "2026-07", end: "2026-08" },
      role: { en: "Solo build", th: "พัฒนาทั้งระบบด้วยตนเอง" },
      stack: ["Swift", "TypeScript", "Bun", "Soniox"],
      experienceId: "exp-founder",
      confidentiality: "C1-description-only",
      featured: false,
      visibility: "public",
      links: [],
      outcomes: [
        {
          text: {
            en: "Built an engine supervisor that restarts the engine with backoff after a crash, permission checks that read the current status without opening a prompt, and a code-signature check on its own builds.",
            th: "มีตัวควบคุมคอยเริ่มเอนจินใหม่เมื่อหยุดทำงาน โดยเว้นระยะก่อนลองใหม่ ตรวจสถานะสิทธิ์ได้โดยไม่เปิดกล่องขออนุญาต และตรวจลายเซ็นโค้ดของบิลด์ตัวเอง",
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
