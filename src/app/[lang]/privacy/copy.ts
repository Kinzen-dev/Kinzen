/**
 * Privacy page copy. Only processing verified in this repository's code and in the providers'
 * own documentation (audit TECH-06): no retention period beyond what Vercel states, no legal
 * compliance claim. Change it whenever the site starts storing or sending something new.
 * EN is the source; TH mirrors its shape (type-checked). Thai renders through nobr().
 */
const DOCS = {
  analytics: "https://vercel.com/docs/analytics/privacy-policy",
  speed: "https://vercel.com/docs/speed-insights/privacy-policy",
  notice: "https://vercel.com/legal/privacy-policy",
};

const en = {
  title: "Privacy",
  description: "What kinzen.dev stores in your browser and what it sends, as the site works today.",
  intro: "What this site stores in your browser and what it sends, as it works today. It covers kinzen.dev only.",
  sections: [
    {
      id: "sends",
      heading: "What the site sends",
      items: [
        {
          title: "Hosting",
          body: "The site is hosted on Vercel. Opening a page sends your browser's request to Vercel, as with any web host.",
          points: [],
          source: { label: "Vercel Privacy Notice", href: DOCS.notice },
        },
        {
          title: "Vercel Web Analytics",
          body: "Counts page views, including moves between pages inside the site. Vercel identifies visitors by a hash created from the request, not by cookies, and discards that visitor session after 24 hours. Per Vercel's documentation, each data point may hold:",
          points: [
            "the time",
            "the page URL and route",
            "the referring site",
            "filtered query parameters",
            "an approximate location",
            "device type, operating system and browser",
          ],
          source: { label: "Vercel: Web Analytics privacy", href: DOCS.analytics },
        },
        {
          title: "Vercel Speed Insights",
          body: "Measures how fast each page loads (Web Vitals). Per Vercel's documentation, each measurement is sent with:",
          points: ["the route and URL", "network speed", "browser, device type and operating system", "the country"],
          source: { label: "Vercel: Speed Insights privacy", href: DOCS.speed },
        },
        {
          title: "Nothing else",
          body: "Both scripts load from this site's own domain and report to it. Automated browsers (tests) are not counted. The site sends no custom events and never calls Vercel's identify feature. Fonts are served from this site too. Pages make no requests to other domains; LinkedIn or GitHub open only when you follow a link there.",
          points: [],
          source: null,
        },
      ],
    },
    {
      id: "browser",
      heading: "What stays in your browser",
      items: [
        {
          title: "No cookies",
          body: "The site sets no cookies.",
          points: [],
          source: null,
        },
        {
          title: "localStorage",
          body: "Two values, each saved only when you choose: theme (light or dark) and kz-sound (sound on or off in the play section), so your next visit opens the same way. A third, kz-notrack, exists only on the site owner's own devices and leaves the owner's visits out of the counts above.",
          points: [],
          source: null,
        },
        {
          title: "sessionStorage",
          body: "Cleared when you close the tab. It remembers:",
          points: [
            "which entrance animations and drawings you have already seen",
            "the sort, filter, open row and scroll position on the work index",
            "whether you paused the moving tool list",
            "which view you picked in the tools, numbers and play sections",
            "how smoothly this device ran the opening animation, so it can pick a lighter version",
            "whether you turned on the performance overlay (only with ?perf=1 in the address)",
          ],
          source: null,
        },
        {
          title: "Clipboard",
          body: "Copy email only writes the address to your clipboard. The site never reads it. None of these values leave your browser.",
          points: [],
          source: null,
        },
      ],
    },
    {
      id: "email",
      heading: "Email",
      items: [
        {
          title: "No forms",
          body: "There is no contact form. Email goes straight to my inbox, and I read and answer it myself.",
          points: [],
          source: null,
        },
      ],
    },
  ],
  questions: "Questions about this page: {email}",
  sourceLabel: "Source",
};

export type PrivacyCopy = typeof en;

const th: PrivacyCopy = {
  title: "ความเป็นส่วนตัว",
  description: "kinzen.dev เก็บอะไรไว้ในเบราว์เซอร์ของคุณ และส่งข้อมูลอะไรออกไปบ้าง ตามที่เว็บไซต์ทำงานอยู่ตอนนี้",
  intro:
    "หน้านี้บอกว่าเว็บไซต์เก็บอะไรไว้ในเบราว์เซอร์ของคุณ และส่งข้อมูลอะไรออกไปบ้าง ตามที่ทำงานอยู่ตอนนี้ ครอบคลุมเฉพาะ kinzen.dev",
  sections: [
    {
      id: "sends",
      heading: "ข้อมูลที่ส่งออกไป",
      items: [
        {
          title: "การโฮสต์เว็บไซต์",
          body: "เว็บไซต์นี้ใช้บริการโฮสต์ของ Vercel ทุกครั้งที่เปิดหน้า คำขอจากเบราว์เซอร์ของคุณจะไปถึง Vercel เหมือนกับผู้ให้บริการโฮสต์ทั่วไป",
          points: [],
          source: { label: "Privacy Notice ของ Vercel", href: DOCS.notice },
        },
        {
          title: "Vercel Web Analytics",
          body: "นับการเปิดหน้า รวมถึงการเปลี่ยนหน้าภายในเว็บไซต์ Vercel แยกผู้เข้าชมด้วยค่า hash ที่สร้างจากคำขอ ไม่ใช้คุกกี้ และลบข้อมูลรอบการเข้าชมนั้นทิ้งหลัง 24 ชั่วโมง ตามเอกสารของ Vercel ข้อมูลแต่ละรายการอาจมี",
          points: [
            "เวลา",
            "URL และ route ของหน้า",
            "เว็บไซต์ที่ลิงก์มา",
            "query parameter ที่กรองแล้ว",
            "ตำแหน่งโดยประมาณ",
            "ประเภทอุปกรณ์ ระบบปฏิบัติการ และเบราว์เซอร์",
          ],
          source: { label: "เอกสาร Web Analytics ของ Vercel", href: DOCS.analytics },
        },
        {
          title: "Vercel Speed Insights",
          body: "วัดว่าแต่ละหน้าโหลดเร็วแค่ไหน (Web Vitals) ตามเอกสารของ Vercel ผลการวัดแต่ละครั้งส่งไปพร้อม",
          points: ["route และ URL", "ความเร็วเครือข่าย", "เบราว์เซอร์ ประเภทอุปกรณ์ และระบบปฏิบัติการ", "ประเทศ"],
          source: { label: "เอกสาร Speed Insights ของ Vercel", href: DOCS.speed },
        },
        {
          title: "นอกจากนี้ไม่มีอะไรอีก",
          body: "สคริปต์ทั้งสองโหลดจากโดเมนของเว็บไซต์นี้เอง และส่งข้อมูลกลับมาที่โดเมนเดียวกัน ไม่นับเบราว์เซอร์อัตโนมัติที่ใช้ทดสอบ เว็บไซต์ไม่ส่ง custom event หรือเหตุการณ์ที่กำหนดเอง และไม่ใช้ฟีเจอร์ identify หรือการระบุตัวผู้ใช้ของ Vercel ฟอนต์ก็โหลดจากเว็บไซต์นี้ หน้าเว็บไม่ส่งคำขอไปโดเมนอื่น LinkedIn หรือ GitHub จะเปิดก็ต่อเมื่อคุณกดลิงก์ไปเอง",
          points: [],
          source: null,
        },
      ],
    },
    {
      id: "browser",
      heading: "ข้อมูลที่อยู่ในเบราว์เซอร์ของคุณ",
      items: [
        {
          title: "ไม่มีคุกกี้",
          body: "เว็บไซต์นี้ไม่ตั้งคุกกี้เลย",
          points: [],
          source: null,
        },
        {
          title: "localStorage",
          body: "เก็บสองค่า และเก็บเฉพาะตอนที่คุณเลือกเอง คือ theme (โหมดสว่างหรือมืด) กับ kz-sound (เปิดหรือปิดเสียงในส่วน play) เพื่อให้ครั้งหน้าเปิดมาเป็นแบบเดิม ส่วนค่าที่สาม kz-notrack มีเฉพาะในเครื่องของเจ้าของเว็บไซต์ ใช้ไม่ให้นับการเข้าชมของเขาเองในสถิติด้านบน",
          points: [],
          source: null,
        },
        {
          title: "sessionStorage",
          body: "ลบเองเมื่อปิดแท็บ ใช้จำว่า",
          points: [
            "ภาพเคลื่อนไหวตอนเปิดหน้าและแผนภาพไหนที่คุณดูไปแล้ว",
            "การเรียง ตัวกรอง แถวที่เปิดอยู่ และตำแหน่งที่เลื่อนไว้ในหน้ารวมผลงาน",
            "คุณหยุดรายการเครื่องมือที่เลื่อนอยู่ไว้หรือเปล่า",
            "แบบที่คุณเลือกดูในส่วนเครื่องมือ ตัวเลข และ play",
            "ภาพเคลื่อนไหวตอนเปิดหน้าเล่นบนเครื่องนี้ลื่นแค่ไหน เพื่อเลือกแบบที่เบากว่าให้",
            "คุณเปิดแผงวัดประสิทธิภาพไว้หรือเปล่า (เปิดได้เฉพาะเมื่อมี ?perf=1 ในลิงก์)",
          ],
          source: null,
        },
        {
          title: "คลิปบอร์ด",
          body: "ปุ่มคัดลอกอีเมลแค่ใส่ที่อยู่อีเมลลงคลิปบอร์ด เว็บไซต์ไม่อ่านคลิปบอร์ดของคุณ ค่าทั้งหมดนี้อยู่ในเบราว์เซอร์ของคุณเท่านั้น",
          points: [],
          source: null,
        },
      ],
    },
    {
      id: "email",
      heading: "อีเมล",
      items: [
        {
          title: "ไม่มีฟอร์ม",
          body: "เว็บไซต์นี้ไม่มีฟอร์มติดต่อ อีเมลที่ส่งมาเข้ากล่องจดหมายของผมโดยตรง ผมอ่านและตอบเองทุกฉบับ",
          points: [],
          source: null,
        },
      ],
    },
  ],
  questions: "มีคำถามเรื่องหน้านี้ ส่งอีเมลมาที่ {email} ได้เลย",
  sourceLabel: "ที่มา",
};

export const privacyCopy = { en, th };
