import type { RuleId } from "./rules";

/** The scripted call: a fictional assistant's draft, read by a synthetic voice. Timings in s (macOS say). */
export const SCRIPT = {
  en: {
    sentences: [
      "Hi, this is the assistant at Riverside Dental.",
      "Your cleaning is booked for Saturday at ten thirty.",
      "Whitening is guaranteed to work, and it won't hurt at all.",
      "It sounds like you have an infection, so take two painkillers tonight.",
      "And this price is only for today.",
    ],
    seconds: [2.78, 2.42, 3.17, 3.89, 1.81],
  },
  th: {
    sentences: [
      "สวัสดีค่ะ ผู้ช่วยจากคลินิกทันตกรรมริมน้ำค่ะ",
      "นัดขูดหินปูนของคุณคือวันเสาร์ สิบโมงครึ่งนะคะ",
      "ฟอกสีฟันรับประกันผลแน่นอน ไม่เจ็บเลยค่ะ",
      "อาการแบบนี้น่าจะติดเชื้อนะคะ",
      "ทานยาแก้ปวดสองเม็ดก่อนนอนได้เลย",
      "ราคานี้เฉพาะวันนี้เท่านั้นค่ะ",
    ],
    seconds: [4.39, 4.27, 3.86, 2.56, 2.99, 2.64],
  },
};

type Copy = {
  kicker: string;
  title: string;
  lede: string;
  langLabel: string;
  start: string;
  stop: string;
  asking: string;
  script: string;
  stopScript: string;
  privacy: string;
  tryLine: string;
  unsupported: string;
  errors: Record<"notAllowed" | "network" | "noSpeech" | "other" | "policy", string>;
  transcriptLabel: string;
  placeholder: string;
  listening: string;
  playing: string;
  rulesTitle: string;
  rules: Record<RuleId, { name: string; why: string }>;
  clean: string;
  flagged: (n: number) => string;
  note: string;
  scriptedNote: string;
};

export const COPY: Record<"en" | "th", Copy> = {
  en: {
    kicker: "Play · voice",
    title: "Say something a clinic must not",
    lede: "Speak like a clinic assistant. The transcript is checked live against rules an assistant must never break.",
    langLabel: "Speech language",
    start: "Start the mic",
    stop: "Stop",
    asking: "Waiting for permission…",
    script: "Play a scripted call",
    stopScript: "Stop the call",
    privacy:
      "Before you press it: the mic button asks your browser for microphone access. Your browser's own speech service turns speech into text and may process the audio on its servers (Google for Chrome, Apple for Safari). This page sends nothing to Kinzen and stores nothing.",
    tryLine: "Try: “It's guaranteed painless, take two painkillers tonight.”",
    unsupported:
      "This browser has no built-in speech recognition (Firefox, for example). Play the scripted call instead: a synthetic voice reading a fictional assistant's draft.",
    errors: {
      notAllowed: "Microphone access was blocked. Allow it in the site settings, or play the scripted call.",
      network: "The browser's speech service could not be reached. Play the scripted call instead.",
      noSpeech: "Nothing heard yet. Try again a little closer to the mic.",
      other: "Speech recognition stopped. Try again, or play the scripted call.",
      policy: "The microphone is switched off for this page by the site's security headers, so the mic cannot start here. Play the scripted call instead.",
    },
    transcriptLabel: "Live transcript",
    placeholder: "Your words appear here.",
    listening: "Listening",
    playing: "Scripted call",
    rulesTitle: "Rule check",
    rules: {
      promise: { name: "Promises a result", why: "No guarantees about outcomes or pain." },
      diagnosis: { name: "Diagnoses", why: "Only a dentist diagnoses." },
      medication: { name: "Medication advice", why: "No drugs or doses from the assistant." },
      pressure: { name: "Sales pressure", why: "No “today only” or “best in town”." },
    },
    clean: "Nothing flagged. This reply could go out.",
    flagged: (n) => `${n} flagged. This reply would be stopped before it reaches the patient.`,
    note: "The real assistant runs its checks in code on every reply. This toy is a short word list.",
    scriptedNote: "Synthetic voice, fictional clinic.",
  },
  th: {
    kicker: "ลองเล่น · เสียง",
    title: "ลองพูดสิ่งที่คลินิกห้ามพูด",
    lede: "พูดเหมือนเป็นผู้ช่วยคลินิก ข้อความที่ถอดได้จะถูกตรวจทันทีกับกฎที่ผู้ช่วยห้ามละเมิด",
    langLabel: "ภาษาที่พูด",
    start: "เปิดไมค์",
    stop: "หยุด",
    asking: "รอสิทธิ์ใช้ไมค์…",
    script: "เล่นบทสนทนาตัวอย่าง",
    stopScript: "หยุดบทสนทนา",
    privacy:
      "ก่อนกด: ปุ่มไมค์จะขอสิทธิ์ใช้ไมโครโฟนจากเบราว์เซอร์ การแปลงเสียงเป็นข้อความทำโดยบริการของเบราว์เซอร์เอง ซึ่งอาจส่งเสียงไปประมวลผลที่เซิร์ฟเวอร์ (Chrome ส่งไป Google, Safari ส่งไป Apple) หน้านี้ไม่ส่งอะไรมาที่ Kinzen และไม่เก็บอะไรไว้",
    tryLine: "ลองพูด: “รับประกันไม่เจ็บเลย ทานยาแก้ปวดสองเม็ดนะคะ”",
    unsupported:
      "เบราว์เซอร์นี้ไม่มีระบบถอดเสียงในตัว (เช่น Firefox) ลองเล่นบทสนทนาตัวอย่างแทนได้ครับ เป็นเสียงสังเคราะห์อ่านร่างคำตอบของผู้ช่วยสมมติ",
    errors: {
      notAllowed: "ไมค์ถูกบล็อกอยู่ เปิดสิทธิ์ในการตั้งค่าเว็บไซต์ หรือเล่นบทสนทนาตัวอย่างแทนได้ครับ",
      network: "ติดต่อบริการถอดเสียงของเบราว์เซอร์ไม่ได้ ลองเล่นบทสนทนาตัวอย่างแทนได้ครับ",
      noSpeech: "ยังไม่ได้ยินเสียง ลองพูดใกล้ไมค์อีกนิดครับ",
      other: "การถอดเสียงหยุดไป ลองใหม่ หรือเล่นบทสนทนาตัวอย่างแทนได้ครับ",
      policy: "หน้านี้ปิดการใช้ไมโครโฟนไว้ในการตั้งค่าความปลอดภัยของเว็บไซต์ จึงเปิดไมค์ที่นี่ไม่ได้ ลองเล่นบทสนทนาตัวอย่างแทนได้ครับ",
    },
    transcriptLabel: "ข้อความที่ถอดได้",
    placeholder: "คำพูดของคุณจะขึ้นตรงนี้",
    listening: "กำลังฟัง",
    playing: "บทสนทนาตัวอย่าง",
    rulesTitle: "ตรวจตามกฎ",
    rules: {
      promise: { name: "สัญญาผลลัพธ์", why: "ห้ามรับประกันผลหรือบอกว่าไม่เจ็บ" },
      diagnosis: { name: "วินิจฉัยโรค", why: "วินิจฉัยได้เฉพาะทันตแพทย์" },
      medication: { name: "แนะนำยา", why: "ผู้ช่วยห้ามสั่งยาหรือบอกขนาดยา" },
      pressure: { name: "เร่งขาย", why: "ห้ามเร่งแบบ “เฉพาะวันนี้” หรือ “ดีที่สุด”" },
    },
    clean: "ไม่พบคำต้องห้าม คำตอบนี้ส่งได้",
    flagged: (n) => `พบ ${n} จุด คำตอบนี้จะถูกหยุดก่อนถึงคนไข้`,
    note: "ผู้ช่วยตัวจริงตรวจคำตอบด้วยโค้ดทุกครั้งก่อนส่ง ตัวนี้เป็นแค่รายการคำสั้น ๆ ไว้ลองเล่น",
    scriptedNote: "เสียงสังเคราะห์ คลินิกสมมติ",
  },
};
