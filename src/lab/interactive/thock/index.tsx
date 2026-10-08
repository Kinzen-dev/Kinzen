"use client";

import { useEffect, useRef, useState } from "react";
import type { LabProps } from "../../types";
import { nobr } from "@/lib/thai-nodes";
import { ToyShell, type ShellCopy } from "../gold-toss/shell";
import { createSound, type Sound } from "../gold-toss/sound";
import { startThock } from "./engine";

const COPY: Record<"en" | "th", ShellCopy & { hint: string; ship: string }> = {
  en: {
    kicker: "Play · keys",
    title: "Thock",
    lede: "Press anything, on screen or on your own keyboard. Drag to roll a wave, hold space, type ship.",
    soundOn: "Sound on",
    soundOff: "Sound off",
    stage: "A field of keycaps. Your keyboard presses the matching caps; hold space for a gold ripple; type ship.",
    hint: "hold space · type ship",
    ship: "SHIP, in gold.",
  },
  th: {
    kicker: "ลองเล่น · คีย์บอร์ด",
    title: "Thock",
    lede: "กดปุ่มไหนก็ได้ บนจอหรือบนคีย์บอร์ดของคุณ ลากผ่านให้เป็นคลื่น กด space ค้างไว้ แล้วลองพิมพ์ ship",
    soundOn: "เสียง: เปิด",
    soundOff: "เสียง: ปิด",
    stage: "ลานปุ่มคีย์บอร์ด กดคีย์บอร์ดของคุณแล้วปุ่มที่ตรงกันจะยุบลง กด space ค้างไว้จะมีคลื่นสีทอง ลองพิมพ์ ship",
    hint: "กด space ค้าง · พิมพ์ ship",
    ship: "SHIP เป็นสีทองแล้ว",
  },
};

/** Thock: a playable keycap field with springs, synthesized thocks, a gold ripple and a secret word. */
export default function Thock({ locale }: LabProps) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const stage = useRef<HTMLDivElement>(null);
  const sound = useRef<Sound | null>(null);
  const [on, setOn] = useState(false);
  const [ship, setShip] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (!stage.current) return;
    const s = createSound();
    sound.current = s;
    const toy = startThock(stage.current, s, setShip, () => setPlayed(true));
    return () => {
      toy.stop();
      s.close();
      sound.current = null;
    };
  }, []);

  return (
    <ToyShell
      id="thock"
      copy={c}
      sound={on}
      onSound={() => {
        const next = !on;
        sound.current?.setOn(next);
        setOn(next);
      }}
      stageRef={stage}
      hint={<span data-gone={(played && !ship) || undefined}>{nobr(c.hint)}</span>}
    >
      <p className="sr-only" aria-live="polite">
        {ship ? c.ship : ""}
      </p>
    </ToyShell>
  );
}
