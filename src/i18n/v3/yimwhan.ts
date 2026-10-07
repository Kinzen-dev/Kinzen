/**
 * v3 copy for the "yimwhan" section. EN is the source; TH mirrors its shape (type-checked).
 * Thai: natural, no em or en dashes; visible strings render through nobr() at the call site.
 *
 * Everything under `mock` is FICTIONAL sample data for the coded illustration: an invented
 * clinic, invented patients, masked numbers. Never real clinic or patient data.
 */
const en = {
  eyebrow: "AI receptionist for dental clinics",
  caseStudy: "Read the case study",
  stageLabel: "How one patient message moves through Yimwhan AI, in five steps",
  illustration: "Illustration with sample data",
  step: "Step",
  beats: [
    {
      title: "A patient writes in",
      text: "A message lands on the clinic's LINE. Phone calls reach the same assistant.",
    },
    {
      title: "Every word becomes text",
      text: "Chats arrive as text and calls are turned into text as the patient speaks, so staff read one conversation.",
    },
    {
      title: "The model writes a draft",
      text: "The model drafts a reply. Nothing has reached the patient yet.",
    },
    {
      title: "The guard blocks the unsafe line",
      text: "Code reads every draft before it goes out. This one makes a diagnosis, so that sentence is blocked.",
      stat: "In a replay of 500 real customer messages, the code filters caught 37 raw model violations.",
    },
    {
      title: "A safe reply goes out, and is logged",
      text: "The patient gets a safe answer and an offer to book. Staff see the whole conversation in the back office.",
    },
  ],
  finaleEyebrow: "Try it yourself",
  mock: {
    window: "Back office",
    clinic: "Sample Dental",
    nav: ["Home", "Cases", "Recall", "Update info", "Reports"],
    aiOn: "AI running",
    live: "Live",
    cases: "Cases",
    queue: "Case queue",
    call: "On a call",
    callTime: "01:12",
    caption: "Can I move my cleaning to Saturday?",
    rows: [
      {
        time: "22:41",
        channel: "LINE",
        name: "Patient A",
        summary: "Swollen wisdom tooth, wants a visit",
        status: "New",
      },
      { time: "21:58", channel: "LINE", name: "Patient B", summary: "Asked about opening hours", status: "Done" },
      { time: "21:30", channel: "Call", name: "Patient C", summary: "Moved a cleaning to Saturday", status: "Done" },
      {
        time: "20:12",
        channel: "LINE",
        name: "Patient D",
        summary: "Asked to book an aligner consult",
        status: "Done",
      },
      { time: "19:47", channel: "Call", name: "Patient E", summary: "Confirmed a check-up for Friday", status: "Done" },
    ],
    conversation: "Conversation",
    transcript: "Live transcript",
    patient: "Patient A",
    patientTime: "22:41",
    message: "My wisdom tooth is swollen and it hurts to chew. Is it infected? Can I come in tomorrow?",
    draft: "Model draft",
    notSent: "not sent",
    draftBefore: "",
    draftFlagged: "This sounds like an infection around the wisdom tooth.",
    draftAfter: " Tomorrow at 10:00 is free.",
    guard: "Guard",
    checks: [
      { rule: "no_diagnose", label: "Makes a diagnosis", pass: false },
      { rule: "dosing-gate", label: "Names a medicine or dose", pass: true },
      { rule: "efficacy_claim", label: "Promises a result", pass: true },
    ],
    blocked: "Blocked",
    reply:
      "Sorry it hurts. Only the dentist can say what is causing the swelling, after an exam. Tomorrow at 10:00 is free. Shall I book it?",
    sent: "Sent to patient",
    status: ["New message", "Transcribing", "Drafting", "Checking", "Logged"],
    assistant: "Clinic assistant",
    today: "Today",
    greeting: "Hello, this is the Sample Dental assistant. How can I help?",
    typing: "typing",
    read: "Read",
    input: "Aa",
  },
};

export type YimwhanCopy = typeof en;

const th: YimwhanCopy = {
  eyebrow: "ผู้ช่วย AI สำหรับคลินิกทันตกรรม",
  caseStudy: "อ่านเบื้องหลังโปรเจกต์",
  stageLabel: "ข้อความจากคนไข้หนึ่งข้อความผ่าน Yimwhan AI อย่างไร ใน 5 ขั้น",
  illustration: "ภาพประกอบ ใช้ข้อมูลตัวอย่าง",
  step: "ขั้นที่",
  beats: [
    {
      title: "คนไข้ทักเข้ามา",
      text: "ข้อความเข้ามาที่ LINE ของคลินิก ส่วนสายโทรเข้าก็มาถึงผู้ช่วยตัวเดียวกัน",
    },
    {
      title: "ทุกคำกลายเป็นข้อความ",
      text: "แชทเข้ามาเป็นข้อความอยู่แล้ว ส่วนสายโทรถอดเป็นข้อความระหว่างที่คนไข้พูด พนักงานจึงอ่านเป็นบทสนทนาเดียว",
    },
    {
      title: "โมเดลร่างคำตอบ",
      text: "โมเดลเขียนร่างคำตอบขึ้นมา แต่ยังไม่มีอะไรส่งถึงคนไข้",
    },
    {
      title: "ชุดตรวจบล็อกประโยคที่ไม่ปลอดภัย",
      text: "โค้ดอ่านทุกร่างก่อนส่งออก ร่างนี้วินิจฉัยโรค ประโยคนั้นเลยถูกบล็อก",
      stat: "ตอนนำข้อความจริงจากลูกค้า 500 ข้อความมารันซ้ำ ตัวกรองในโค้ดดักคำตอบดิบจากโมเดลที่ผิดกฎได้ 37 ครั้ง",
    },
    {
      title: "ส่งคำตอบที่ปลอดภัย แล้วบันทึกไว้",
      text: "คนไข้ได้คำตอบที่ปลอดภัย พร้อมข้อเสนอให้จองคิว พนักงานเห็นบทสนทนาทั้งหมดในระบบหลังบ้าน",
    },
  ],
  finaleEyebrow: "ลองเล่นเอง",
  mock: {
    window: "ระบบหลังบ้าน",
    clinic: "คลินิกตัวอย่าง",
    nav: ["หน้าหลัก", "เคส", "Recall", "อัปเดตข้อมูล", "รายงาน"],
    aiOn: "AI ทำงานปกติ",
    live: "สนทนาสด",
    cases: "เคส",
    queue: "คิวเคส",
    call: "กำลังคุยสาย",
    callTime: "01:12",
    caption: "ขอเลื่อนนัดขูดหินปูนเป็นวันเสาร์ได้ไหมครับ",
    rows: [
      { time: "22:41", channel: "LINE", name: "คุณเอ", summary: "ฟันคุดบวม อยากเข้ามาตรวจ", status: "ใหม่" },
      { time: "21:58", channel: "LINE", name: "คุณบี", summary: "ถามเวลาเปิดทำการ", status: "เสร็จ" },
      { time: "21:30", channel: "โทร", name: "คุณซี", summary: "เลื่อนนัดขูดหินปูนเป็นวันเสาร์", status: "เสร็จ" },
      { time: "20:12", channel: "LINE", name: "คุณดี", summary: "ขอนัดปรึกษาจัดฟันใส", status: "เสร็จ" },
      { time: "19:47", channel: "โทร", name: "คุณอี", summary: "ยืนยันนัดตรวจฟันวันศุกร์", status: "เสร็จ" },
    ],
    conversation: "บทสนทนา",
    transcript: "ถอดข้อความสด",
    patient: "คุณเอ",
    patientTime: "22:41",
    message: "ฟันคุดบวม เคี้ยวแล้วเจ็บมากค่ะ แบบนี้ติดเชื้อหรือเปล่าคะ พรุ่งนี้เข้าไปได้ไหมคะ",
    draft: "ร่างจากโมเดล",
    notSent: "ยังไม่ส่ง",
    draftBefore: "",
    draftFlagged: "อาการแบบนี้น่าจะเป็นเหงือกรอบฟันคุดอักเสบค่ะ",
    draftAfter: " พรุ่งนี้ 10:00 มีคิวว่างนะคะ",
    guard: "ชุดตรวจ",
    checks: [
      { rule: "no_diagnose", label: "วินิจฉัยโรค", pass: false },
      { rule: "dosing-gate", label: "ระบุชื่อยาหรือขนาดยา", pass: true },
      { rule: "efficacy_claim", label: "รับประกันผลการรักษา", pass: true },
    ],
    blocked: "ถูกบล็อก",
    reply:
      "เจ็บแบบนี้ไม่สบายตัวเลยนะคะ สาเหตุที่บวมต้องให้คุณหมอตรวจก่อนถึงจะบอกได้ค่ะ พรุ่งนี้ 10:00 มีคิวว่าง ให้จองไว้เลยไหมคะ",
    sent: "ส่งถึงคนไข้แล้ว",
    status: ["ข้อความใหม่", "กำลังถอดข้อความ", "กำลังร่าง", "กำลังตรวจ", "บันทึกแล้ว"],
    assistant: "ผู้ช่วยคลินิก",
    today: "วันนี้",
    greeting: "สวัสดีค่ะ ผู้ช่วยของคลินิกตัวอย่างยินดีให้บริการค่ะ มีอะไรให้ช่วยไหมคะ",
    typing: "กำลังพิมพ์",
    read: "อ่านแล้ว",
    input: "Aa",
  },
};

export const yimwhan = { en, th };
