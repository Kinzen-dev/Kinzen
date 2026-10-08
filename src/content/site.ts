import "server-only";
import { siteContent, type SiteContent, type SiteContentInput } from "./schema";

/**
 * Every public claim below is cleared in the private claims ledger
 * (kittipong-resume/content/CLAIMS.md, resume v1.7). Do not add a number,
 * client name or outcome here without a ledger row; `provenance` points at it.
 */
const content: SiteContentInput = {
  meta: { updated: "2026-10", claimsLedger: "kittipong-resume/content/CLAIMS.md (v1.7)" },

  profile: {
    name: "Kittipong Khonthong",
    displayName: { en: "Kittipong Khonthong", th: "กฤติพงษ์ ก้อนทอง" },
    preferredName: "King",
    handle: "Kinzen",
    role: { en: "Senior Full-Stack Engineer", th: "วิศวกร full-stack ระดับ senior" },
    /** Resume v1.7 headline (King, 2026-10-08): the role line on /cv and in meta descriptions. */
    headline: {
      en: "Senior Full-Stack Engineer · TypeScript, Node.js, Next.js · event-driven systems on AWS",
      th: "วิศวกร full-stack ระดับ senior · TypeScript, Node.js, Next.js · ระบบ event-driven บน AWS",
    },
    heroLine: {
      en: "Production systems, built and run end to end: event-driven TypeScript services on AWS, Shopify platforms, and AI voice and LINE products with guardrails in code.",
      th: "ระบบที่ใช้งานจริง ผมสร้างและดูแลเองครบทั้งระบบ ตั้งแต่บริการ TypeScript แบบ event-driven บน AWS แพลตฟอร์ม Shopify ไปจนถึงผลิตภัณฑ์ AI รับสายและตอบแชท LINE ที่มีกฎกำกับเขียนไว้ในโค้ด",
    },
    oneLiner: {
      en: "Senior full-stack engineer with seven years of production experience across frontend, backend and DevOps. Builds and runs event-driven services on a real-time transactional platform with 6,000+ daily active users (Kafka, MongoDB, AWS EKS). Former Tech Lead for AnyMind Group's EC Platform, leading 5 to 8 engineers across 10+ Shopify brands. Founder of Vesperwerk, building voice and LINE AI products with human-gated agent workflows.",
      th: "วิศวกร full-stack ระดับ senior ทำระบบที่ใช้งานจริงมา 7 ปี ครอบคลุมทั้ง frontend, backend และ DevOps สร้างและดูแลบริการแบบ event-driven บนแพลตฟอร์มธุรกรรมแบบเรียลไทม์ที่มีผู้ใช้งานต่อวันมากกว่า 6,000 คน (Kafka, MongoDB, AWS EKS) เคยเป็น Tech Lead ดูแล EC Platform ของ AnyMind Group นำทีมวิศวกร 5 ถึง 8 คน ทำงานให้แบรนด์บน Shopify มากกว่า 10 แบรนด์ และเป็นผู้ก่อตั้ง Vesperwerk สร้างผลิตภัณฑ์ AI ด้านเสียงและ LINE ด้วยทีม AI agent ที่ต้องผ่านการอนุมัติจากคนในทุกด่านสำคัญ",
    },
    bioShort: {
      en: "I'm King, a senior full-stack engineer in Bangkok. I build and run production systems end to end: event-driven services on a real-time platform, four years as Tech Lead for AnyMind Group's EC Platform, and now Vesperwerk, where I build AI voice and LINE products with guardrails in code.",
      th: "ผมคิง วิศวกร full-stack ระดับ senior อยู่กรุงเทพฯ ผมสร้างและดูแลระบบที่ใช้งานจริงครบทั้งระบบ ทั้งบริการแบบ event-driven บนแพลตฟอร์มเรียลไทม์ งาน Tech Lead ดูแล EC Platform ของ AnyMind Group 4 ปี และตอนนี้ทำ Vesperwerk สร้างผลิตภัณฑ์ AI ด้านเสียงและ LINE ที่มีกฎกำกับเขียนไว้ในโค้ด",
    },
    bioLong: {
      en: [
        "I'm Kittipong Khonthong, King to most people: a senior full-stack engineer with seven years of production experience across frontend, backend and DevOps. I build systems end to end and keep running them after they ship.",
        "Since 2022 I have worked part-time, remotely, on a real-time transactional platform with wallet and ledger for a confidential client: event-driven NestJS services on Kafka and MongoDB, releases to AWS EKS, and a back-office rebuild in Next.js that I co-led. From 2022 to 2026 I was also Tech Lead for AnyMind Group's EC Platform, leading a team of 5 to 8 engineers that delivered Shopify storefronts, apps and headless builds for 10+ brands, including Mizuno Thailand. Before that I was a full-stack developer at ZyGen, shipping React, Next.js, Angular and NestJS applications on Docker and GKE.",
        "Since April 2026 I run Vesperwerk, a small software studio. Its first product is an AI phone and LINE receptionist for dental clinics, now in pilot with a clinic (go-live expected October 2026). Deterministic checks in code review each reply before it reaches a patient, under rules that block diagnoses, dosing advice and cure claims. I build with teams of AI coding agents in Helm, my own macOS workspace: the spec comes first, and releases wait for my approval.",
      ],
      th: [
        "ผมชื่อกฤติพงษ์ ก้อนทอง คนส่วนใหญ่เรียกผมว่าคิง เป็นวิศวกร full-stack ระดับ senior ทำระบบที่ใช้งานจริงมา 7 ปี ครอบคลุมทั้ง frontend, backend และ DevOps ผมสร้างระบบครบทั้งระบบ และดูแลต่อหลังจากปล่อยใช้งานแล้ว",
        "ตั้งแต่ปี 2022 ผมรับงานพาร์ตไทม์แบบทำงานทางไกล บนแพลตฟอร์มธุรกรรมแบบเรียลไทม์ที่มี wallet และ ledger ให้ลูกค้าที่ไม่เปิดเผยชื่อ ทั้งบริการ NestJS แบบ event-driven บน Kafka และ MongoDB การ release ขึ้น AWS EKS และการสร้างระบบหลังบ้านใหม่ด้วย Next.js ที่ผมร่วมนำ ช่วงปี 2022 ถึง 2026 ผมยังเป็น Tech Lead ดูแล EC Platform ของ AnyMind Group นำทีมวิศวกร 5 ถึง 8 คน ส่งมอบหน้าร้าน แอป และระบบ headless บน Shopify ให้แบรนด์มากกว่า 10 แบรนด์ รวมถึง Mizuno Thailand ก่อนหน้านั้นผมเป็นนักพัฒนา full-stack ที่ ZyGen ทำแอปด้วย React, Next.js, Angular และ NestJS บน Docker และ GKE",
        "ตั้งแต่เมษายน 2026 ผมทำ Vesperwerk สตูดิโอซอฟต์แวร์เล็ก ๆ ผลงานแรกคือผู้ช่วย AI รับสายและตอบแชท LINE ให้คลินิกทันตกรรม ตอนนี้อยู่ในช่วงนำร่องกับคลินิกหนึ่งแห่ง (คาดว่าจะเปิดใช้งานจริงตุลาคม 2026) มีชุดตรวจตามกฎที่กำหนดไว้ในโค้ด (deterministic) ตรวจทุกคำตอบก่อนส่งถึงคนไข้ โดยมีกฎบล็อกการวินิจฉัย การแนะนำขนาดยา และการอ้างว่ารักษาหาย ผมทำงานกับทีม AI agent ช่วยเขียนโค้ดใน Helm พื้นที่ทำงานบน macOS ที่ผมสร้างเอง โดยเขียน spec ก่อนเสมอ และทุก release ต้องรอผมอนุมัติ",
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

  // Resume v1.7 "AI-assisted engineering" rows (profile brief section 6). Each names a mechanism,
  // never a productivity claim; the 500/37 figure lives in the Vesperwerk bullet, not here.
  practices: [
    {
      id: "ai-spec",
      title: { en: "Spec first", th: "เขียน spec ก่อน" },
      text: {
        en: "Architecture, scope and acceptance criteria are set before agent teams build.",
        th: "กำหนดสถาปัตยกรรม ขอบเขต และเกณฑ์รับงานไว้ก่อน แล้วจึงให้ทีม agent ลงมือสร้าง",
      },
      provenance: { claimId: "ai-practice.spec-first (v1.7)", source: "CLAIMS", confidence: "APPROVED" },
    },
    {
      id: "ai-gates",
      title: { en: "Human gates", th: "มีคนอนุมัติทุกด่าน" },
      text: {
        en: "Trade-offs, production releases and outward actions need my explicit approval.",
        th: "การตัดสินใจที่ต้องชั่งได้เสีย การ release ขึ้น production และงานที่ส่งออกไปภายนอก ต้องได้รับการอนุมัติจากผมก่อนเสมอ",
      },
      provenance: { claimId: "ai-practice.human-gates (v1.7)", source: "CLAIMS", confidence: "APPROVED" },
    },
    {
      id: "ai-reversible",
      title: { en: "Automate the reversible", th: "ให้อัตโนมัติเฉพาะงานที่ย้อนกลับได้" },
      text: {
        en: "Daily routines, and an overnight loop with a ground-truth gate, reviewer agents and rollback.",
        th: "งานประจำวันรันอัตโนมัติ ส่วนรอบทำงานข้ามคืนมีด่านตรวจกับผลจริง (ground-truth gate) มี agent ผู้ตรวจ และย้อนกลับได้",
      },
      provenance: { claimId: "ai-practice.automate-reversible (v1.7)", source: "CLAIMS", confidence: "APPROVED" },
    },
    {
      id: "ai-evidence",
      title: { en: "Evidence before merge", th: "มีหลักฐานก่อน merge" },
      text: {
        en: "Tests on the exact commit, screenshot QA, and deterministic filters on LLM output.",
        th: "รันเทสต์บน commit ที่จะ merge จริง ตรวจ UI จากภาพหน้าจอ และกรองผลลัพธ์จาก LLM ด้วยกฎแบบ deterministic",
      },
      provenance: { claimId: "ai-evidence", source: "CLAIMS", confidence: "APPROVED" },
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
            en: "Built an AI phone and LINE receptionist for dental clinics, now in pilot with a clinic (go-live expected October 2026), with a staff back office on Fastify, Twilio and the LINE Messaging API.",
            th: "สร้างผู้ช่วย AI รับสายและตอบแชท LINE ให้คลินิกทันตกรรม ตอนนี้อยู่ในช่วงนำร่องกับคลินิกหนึ่งแห่ง (คาดว่าจะเปิดใช้งานจริงตุลาคม 2026) พร้อมระบบหลังบ้านสำหรับพนักงานคลินิก ด้วย Fastify, Twilio และ LINE Messaging API",
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
            en: "Operates on Fly.io with SQLite and Litestream backups, gated releases and one-step rollback; production has run on a dedicated phone number since July 2026.",
            th: "รันบน Fly.io ใช้ SQLite และสำรองข้อมูลด้วย Litestream ทุก release ต้องผ่านด่านตรวจและย้อนกลับได้ในขั้นตอนเดียว ระบบ production รันบนเบอร์โทรเฉพาะมาตั้งแต่กรกฎาคม 2026",
          },
          provenance: { claimId: "exp-founder.bullet-4", source: "CLAIMS", confidence: "VERIFIED" },
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
    // Supporting entry (King, 2026-10-08): the client stays unnamed. Only the approved descriptor and
    // approved v1.7 bullets appear here; no case study, no images, nothing that hints at the domain.
    {
      id: "exp-contract",
      org: { name: "Confidential client", confidential: true },
      title: { en: "Senior Full-Stack Developer", th: "นักพัฒนา full-stack ระดับ senior" },
      type: "part-time-contract",
      start: "2022-04",
      end: "present",
      location: { en: "Remote", th: "ทำงานทางไกล" },
      summary: {
        en: "Real-time transactional platform with wallet and ledger (confidential client, NDA), part-time contract.",
        th: "แพลตฟอร์มธุรกรรมแบบเรียลไทม์ที่มี wallet และ ledger (ลูกค้าที่ไม่เปิดเผยชื่อ ภายใต้ NDA) สัญญาจ้างแบบพาร์ตไทม์",
      },
      stack: ["TypeScript", "NestJS", "Kafka", "MongoDB", "Next.js", "AWS EKS", "Terragrunt", "GitHub Actions"],
      visibility: "public",
      highlights: [
        {
          text: {
            en: "Full-stack and DevOps engineer on a real-time platform with wallet and ledger: 6,000+ daily active users, 18 repositories, web team of up to 13 engineers.",
            th: "ทำงาน full-stack และ DevOps บนแพลตฟอร์มเรียลไทม์ที่มี wallet และ ledger: ผู้ใช้งานต่อวันมากกว่า 6,000 คน 18 repository และทีมเว็บสูงสุด 13 คน",
          },
          provenance: { claimId: "exp-contract.bullet-1 (v1.7)", source: "CLAIMS", confidence: "STATED" },
        },
        {
          text: {
            en: "Designed a Kafka-fed daily report cache and split reporting into its own autoscaled service, taking heavy queries off the transaction path.",
            th: "ออกแบบแคชรายงานรายวันที่รับข้อมูลจาก Kafka และแยกงานรายงานออกเป็นบริการของตัวเองที่ขยายขนาดอัตโนมัติ เพื่อย้าย query หนัก ๆ ออกจากเส้นทางของธุรกรรม",
          },
          provenance: { claimId: "exp-contract.bullet-3 (v1.7)", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "Ran production releases on GitHub Actions, Helm and Terragrunt to AWS EKS with SOPS secrets and a hotfix path; reviewed teammates' code and onboarded new engineers.",
            th: "ดูแลการ release ขึ้น production ผ่าน GitHub Actions, Helm และ Terragrunt ไปยัง AWS EKS โดยเก็บ secret ด้วย SOPS และมีเส้นทาง hotfix รวมถึงรีวิวโค้ดของเพื่อนร่วมทีมและช่วยวิศวกรใหม่เริ่มงาน",
          },
          provenance: { claimId: "exp-contract.bullet-5 (v1.7)", source: "CLAIMS", confidence: "VERIFIED" },
        },
        {
          text: {
            en: "Co-led the 2026 back-office rebuild in Next.js 16 as a static export on Cloudflare Pages with an auth proxy in Pages Functions.",
            th: "ร่วมนำการสร้างระบบหลังบ้านใหม่ในปี 2026 ด้วย Next.js 16 แบบ static export บน Cloudflare Pages พร้อม auth proxy ใน Pages Functions",
          },
          provenance: { claimId: "exp-contract.bullet-6 (v1.7)", source: "CLAIMS", confidence: "VERIFIED" },
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
        en: "Led a team of 5 to 8 engineers on the EC Platform: Shopify storefronts, apps and headless commerce for 10+ brands.",
        th: "นำทีมวิศวกร 5 ถึง 8 คนใน EC Platform ทำหน้าร้าน แอป และระบบ headless commerce บน Shopify ให้แบรนด์มากกว่า 10 แบรนด์",
      },
      stack: ["Shopify", "GraphQL", "Liquid", "Next.js", "TypeScript"],
      visibility: "public",
      highlights: [
        {
          text: {
            en: "Led a team of 5 to 8 engineers delivering Shopify storefronts, apps and headless builds for 10+ brands, including Mizuno Thailand.",
            th: "นำทีมวิศวกร 5 ถึง 8 คน ส่งมอบหน้าร้าน แอป และระบบ headless บน Shopify ให้แบรนด์มากกว่า 10 แบรนด์ รวมถึง Mizuno Thailand",
          },
          provenance: { claimId: "exp-anymind.bullet-1 (v1.7)", source: "CLAIMS", confidence: "STATED" },
        },
        {
          text: {
            en: "Built shared storefront and app components that new brand launches reused, and drove storefront performance work.",
            th: "สร้างคอมโพเนนต์หน้าร้านและแอปที่ใช้ร่วมกัน ให้แบรนด์ใหม่นำไปใช้ซ้ำตอนเปิดตัว และผลักดันงานปรับประสิทธิภาพของหน้าร้าน",
          },
          provenance: { claimId: "exp-anymind.bullet-2 (v1.7)", source: "CLAIMS", confidence: "STATED" },
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
            en: "Reviewed code, mentored a mostly junior and mid-level team, ran performance tests and coordinated releases across cross-functional teams.",
            th: "รีวิวโค้ด เป็นพี่เลี้ยงให้ทีมที่ส่วนใหญ่เป็นระดับ junior และ mid ทดสอบประสิทธิภาพ และประสานการออกเวอร์ชันกับทีมที่เกี่ยวข้อง",
          },
          provenance: { claimId: "exp-anymind.bullet-5 (v1.7)", source: "CLAIMS", confidence: "STATED" },
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
  ],

  projects: [
    {
      id: "proj-clinic",
      slug: "clinic-receptionist",
      // A descriptive name until the product is renamed (King, 2026-10-08).
      name: "Clinic AI receptionist",
      aliases: ["AI receptionist", "dental clinic", "คลินิกทันตกรรม"],
      tagline: {
        en: "An AI phone and LINE receptionist for dental clinics, with code that checks replies against set rules. In pilot; go-live expected October 2026.",
        th: "ผู้ช่วย AI รับสายและตอบแชท LINE ให้คลินิกทันตกรรม พร้อมโค้ดตรวจคำตอบตามกฎที่กำหนด อยู่ในช่วงนำร่อง คาดว่าจะเปิดใช้งานจริงตุลาคม 2026",
      },
      kind: "product",
      area: "ai",
      status: "pilot",
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
            en: "In pilot with a dental clinic, go-live expected October 2026. Production has run on a dedicated phone number since July 2026, with gated releases and one-step rollback.",
            th: "อยู่ในช่วงนำร่องกับคลินิกทันตกรรม คาดว่าจะเปิดใช้งานจริงตุลาคม 2026 ระบบ production รันบนเบอร์โทรเฉพาะมาตั้งแต่กรกฎาคม 2026 ทุก release ต้องผ่านด่านตรวจ และย้อนกลับได้ในขั้นตอนเดียว",
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
        en: "Shopify storefronts, apps and headless builds for 10+ brands, with a team of 5 to 8 engineers I led as Tech Lead for four years.",
        th: "พัฒนาหน้าร้าน แอป และระบบ headless บน Shopify ให้แบรนด์มากกว่า 10 แบรนด์ กับทีมวิศวกร 5 ถึง 8 คนที่ผมนำในฐานะ Tech Lead เป็นเวลา 4 ปี",
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
            en: "Led a team of 5 to 8 engineers delivering Shopify storefronts, apps and headless builds for 10+ brands, including Mizuno Thailand.",
            th: "นำทีมวิศวกร 5 ถึง 8 คน ส่งมอบหน้าร้าน แอป และระบบ headless บน Shopify ให้แบรนด์มากกว่า 10 แบรนด์ รวมถึง Mizuno Thailand",
          },
          provenance: { claimId: "exp-anymind.bullet-1 (v1.7)", source: "CLAIMS", confidence: "STATED" },
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
      // King's own account of the role (SPEC-audit owner facts, 2026-10-07; scope numbers from resume
      // v1.7, King 2026-10-08). No store, revenue or speed figures: none exist to publish.
      caseStudy: {
        context: {
          en: "AnyMind Group's EC Platform built Shopify stores for 10+ brands, Mizuno Thailand among them. Most of the work was hard custom flows rather than stock themes.",
          th: "EC Platform ของ AnyMind Group สร้างร้านค้าบน Shopify ให้แบรนด์มากกว่า 10 แบรนด์ รวมถึง Mizuno Thailand งานส่วนใหญ่เป็น flow เฉพาะที่ซับซ้อน ไม่ใช่ธีมสำเร็จรูป",
        },
        scope: {
          en: "Tech Lead from January 2022 to March 2026, leading a team of 5 to 8 engineers, mostly junior and mid-level, on these stores. I was lead and senior developer at once: when a task was hard or the team was overloaded, I took it on myself.",
          th: "ผมเป็น Tech Lead ตั้งแต่มกราคม 2022 ถึงมีนาคม 2026 นำทีมวิศวกร 5 ถึง 8 คน ส่วนใหญ่เป็นระดับ junior และ mid ดูแลงานของร้านเหล่านี้ และทำงานเป็นทั้ง lead และนักพัฒนาระดับ senior ไปพร้อมกัน งานไหนยากหรือทีมงานล้นมือ ผมรับมาทำเอง",
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
          en: "Stores for 10+ brands, including Mizuno Thailand, were delivered on this platform, on shared storefront and app components that new brand launches reused, with the integrations, the Dev Dashboard migration and the January 2026 Admin API upgrade listed above.",
          th: "ส่งมอบร้านค้าให้แบรนด์มากกว่า 10 แบรนด์ รวมถึง Mizuno Thailand บนแพลตฟอร์มนี้ โดยใช้คอมโพเนนต์หน้าร้านและแอปที่แบรนด์ใหม่นำไปใช้ซ้ำตอนเปิดตัว พร้อมงานเชื่อมต่อ การย้ายไป Dev Dashboard และการอัปเกรดไปใช้ Admin API เวอร์ชันมกราคม 2026 ตามรายการด้านบน",
        },
        limits: {
          en: "Client work: this page names one brand only, and gives no store traffic, revenue or speed figures.",
          th: "เป็นงานของลูกค้า หน้านี้จึงระบุชื่อแบรนด์ไว้เพียงแบรนด์เดียว และไม่มีตัวเลขยอดเข้าชม รายได้ หรือความเร็ว",
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
        "BullMQ",
        "Python",
        { en: "Hexagonal and event-driven design", th: "สถาปัตยกรรม hexagonal และ event-driven" },
      ],
    },
    {
      id: "frontend",
      label: { en: "Frontend and apps", th: "หน้าบ้านและแอป" },
      items: ["React", "Next.js", "Vite", "Tailwind CSS", "Three.js", "Phaser", "Tauri"],
    },
    {
      id: "data-cloud",
      label: { en: "Data and cloud", th: "ข้อมูลและคลาวด์" },
      items: [
        "MongoDB",
        "PostgreSQL",
        "Redis",
        "SQLite",
        "AWS (EKS, MSK, S3)",
        "Docker",
        "Kubernetes (EKS, GKE)",
        "Fly.io",
        "Cloudflare",
        "Azure",
      ],
    },
    {
      id: "testing",
      label: { en: "Testing and delivery", th: "การทดสอบและส่งมอบ" },
      // "Helm" here is the Kubernetes chart tool, named in full so it never reads as King's Helm app.
      items: [
        "Playwright",
        "Vitest",
        "Jest",
        "GitHub Actions",
        "GitLab CI/CD",
        "Helm (Kubernetes charts)",
        "Terragrunt",
        "SOPS",
      ],
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
