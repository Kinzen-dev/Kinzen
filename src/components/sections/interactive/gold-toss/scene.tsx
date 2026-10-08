"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../types";
import { ToyStage, hintText } from "../toy";
import { createGoldSound } from "./sound";
import { startGoldToss } from "./engine";

const COPY = {
  en: {
    stage:
      "KINZEN in brushed gold on a stone ledge over dark water. Drag a letter to throw it, or press K, I, N, Z or E.",
    hint: "throw one",
  },
  th: {
    stage: "ตัวอักษร KINZEN สีทองบนหินเหนือผิวน้ำ ลากตัวอักษรเพื่อโยน หรือกด K, I, N, Z หรือ E",
    hint: "โยนสักตัว",
  },
};

/** Gold toss: fling the heavy gold letters; they splash into ink water and come back home (lab-ix-b, ported). */
export default function GoldToss({ locale, onReady, onPlay, onFail }: SceneProps) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const stage = useRef<HTMLDivElement>(null);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const sound = createGoldSound();
    const toss = startGoldToss(el, sound, () => {
      setPlayed(true);
      onPlay?.();
    });
    let raf = 0;
    if (toss.failed || !el.querySelector("canvas")) onFail?.(toss.failed ?? "none");
    else raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => onReady?.())));
    return () => {
      cancelAnimationFrame(raf);
      toss.stop();
      sound.stop();
    };
    // Mounted once per visit of the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ToyStage label={c.stage} stageRef={stage} hint={hintText(c.hint, played)} />;
}
