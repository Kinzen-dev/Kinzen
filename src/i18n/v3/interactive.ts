/**
 * v4 copy for the "play" section (four small interactive scenes). EN is the source; TH mirrors its
 * shape (type-checked). Thai: natural, no em or en dashes; visible strings render through nobr().
 * Each scene's own in-stage strings live with the scene (its chunk), not here.
 */
const en = {
  title: "Play",
  intro: "Four small scenes to touch: my desk at night, the wordmark in gold, a keyboard and a bowl of water.",
  /** The switcher between the scenes. */
  scenes: {
    "night-desk": "Night desk",
    "gold-toss": "Gold toss",
    thock: "Thock",
    "one-drop": "One drop",
  },
  /** One line under the switcher: what the active scene is and how to play it. */
  hints: {
    "night-desk":
      "My desk after hours, in ink. Drag to look around, tap the gold dots, knock things over. The agents, task and caller are fictional.",
    "gold-toss":
      "Grab a letter and fling it, or press K, I, N, Z or E. It splashes into the ink, then finds its way home.",
    thock: "Press the keys, on screen or on your own keyboard. Drag across for a wave, hold space, type ship.",
    "one-drop": "Tap the water to let a gold drop fall; hold for a heavier one. The earlier drops are simulated.",
  },
  switcher: "Scenes to play",
  showing: "Now showing",
  /** The section's sound toggle (a pressed button: pressed = sound on). */
  sound: "Sound",
  soundOn: "Sound is on. It starts with your first tap or key press.",
  soundOff: "Sound is off.",
  /** Alt text of the server-rendered still of the first scene. */
  still:
    "A hand-drawn 3D desk at night: a wide monitor, a gold desk phone, a notepad, a lamp, two plants and a window over the Bangkok skyline.",
  /** Shown in the stage when the device has no WebGL. */
  noGl: "This scene needs WebGL, which this browser does not offer.",
};
export type InteractiveCopy = typeof en;
const th: InteractiveCopy = {
  title: "ลองเล่น",
  intro: "สี่ฉากเล็ก ๆ ให้ลองแตะเล่น โต๊ะทำงานของผมตอนดึก ตัวอักษรสีทอง คีย์บอร์ด และชามน้ำ",
  scenes: {
    "night-desk": "โต๊ะตอนดึก",
    "gold-toss": "โยนทอง",
    thock: "คีย์บอร์ด",
    "one-drop": "หยดทอง",
  },
  hints: {
    "night-desk":
      "โต๊ะทำงานของผมตอนดึก วาดด้วยหมึก ลากเพื่อหมุนดู แตะจุดสีทอง หรือเขี่ยของบนโต๊ะให้กลิ้ง เอเจนต์ งาน และผู้โทรเป็นตัวอย่างสมมติ",
    "gold-toss": "คว้าตัวอักษรแล้วเหวี่ยงออกไป หรือกด K, I, N, Z, E มันจะตกลงน้ำหมึก แล้วหาทางกลับมาที่เดิมเอง",
    thock: "กดปุ่มบนจอหรือบนคีย์บอร์ดของคุณ ลากผ่านให้เป็นคลื่น กด space ค้างไว้ แล้วลองพิมพ์ ship",
    "one-drop": "แตะผิวน้ำเพื่อปล่อยหยดทอง กดค้างไว้ให้หยดหนักขึ้น หยดเก่าในชามเป็นการจำลอง",
  },
  switcher: "ฉากให้ลองเล่น",
  showing: "ตอนนี้แสดง",
  sound: "เสียง",
  soundOn: "เปิดเสียงอยู่ เสียงจะเริ่มเมื่อแตะหรือกดปุ่มครั้งแรก",
  soundOff: "ปิดเสียงอยู่",
  still:
    "โต๊ะทำงานสามมิติลายเส้นหมึกตอนกลางคืน มีจอกว้าง โทรศัพท์ตั้งโต๊ะสีทอง สมุดจด โคมไฟ ต้นไม้สองกระถาง และหน้าต่างมองเห็นตึกในกรุงเทพฯ",
  noGl: "ฉากนี้ต้องใช้ WebGL ซึ่งเบราว์เซอร์นี้ยังไม่รองรับ",
};
export const interactive = { en, th };
