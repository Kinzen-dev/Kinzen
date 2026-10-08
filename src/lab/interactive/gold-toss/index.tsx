"use client";

import { useEffect, useRef, useState } from "react";
import type { LabProps } from "../../types";
import { nobr } from "@/lib/thai-nodes";
import { ToyShell, type ShellCopy } from "./shell";
import { createSound, type Sound } from "./sound";
import { startGoldToss } from "./engine";

const COPY: Record<"en" | "th", ShellCopy & { hint: string }> = {
  en: {
    kicker: "Play · gold",
    title: "Throw one",
    lede: "Grab a letter and fling it. It splashes into the ink, then finds its way home.",
    soundOn: "Sound on",
    soundOff: "Sound off",
    stage: "KINZEN in brushed gold on a stone ledge over dark water. Drag a letter to throw it, or press K, I, N, Z or E.",
    hint: "throw one",
  },
  th: {
    kicker: "ลองเล่น · ทอง",
    title: "โยนสักตัว",
    lede: "คว้าตัวอักษรแล้วเหวี่ยงออกไป มันจะตกลงน้ำหมึก แล้วหาทางกลับมาที่เดิมเอง",
    soundOn: "เสียง: เปิด",
    soundOff: "เสียง: ปิด",
    stage: "ตัวอักษร KINZEN สีทองบนหินเหนือผิวน้ำ ลากตัวอักษรเพื่อโยน หรือกด K, I, N, Z หรือ E",
    hint: "โยนสักตัว",
  },
};

/** Gold toss: fling the heavy gold letters; they splash into ink water and come back home. */
export default function GoldToss({ locale }: LabProps) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const stage = useRef<HTMLDivElement>(null);
  const sound = useRef<Sound | null>(null);
  const [on, setOn] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (!stage.current) return;
    const s = createSound();
    sound.current = s;
    const toss = startGoldToss(stage.current, s, () => setPlayed(true));
    return () => {
      toss.stop();
      s.close();
      sound.current = null;
    };
  }, []);

  return (
    <ToyShell
      id="gold-toss"
      copy={c}
      sound={on}
      onSound={() => {
        const next = !on;
        sound.current?.setOn(next);
        setOn(next);
      }}
      stageRef={stage}
      hint={<span data-gone={played || undefined}>{nobr(c.hint)}</span>}
    />
  );
}
