"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../types";
import { ToyStage, hintText } from "../toy";
import { createThockSound } from "./sound";
import { startThock } from "./engine";

const COPY = {
  en: {
    stage: "A field of keycaps. Your keyboard presses the matching caps; hold space for a gold ripple; type ship.",
    hint: "hold space · type ship",
    ship: "SHIP, in gold.",
  },
  th: {
    stage: "ลานปุ่มคีย์บอร์ด กดคีย์บอร์ดของคุณแล้วปุ่มที่ตรงกันจะยุบลง กด space ค้างไว้จะมีคลื่นสีทอง ลองพิมพ์ ship",
    hint: "กด space ค้าง · พิมพ์ ship",
    ship: "SHIP เป็นสีทองแล้ว",
  },
};

/** Thock: a playable keycap field with springs, thocks, a gold ripple and a secret word (lab-ix-b, ported). */
export default function Thock({ locale, onReady, onPlay, onFail }: SceneProps) {
  const c = COPY[locale === "th" ? "th" : "en"];
  const stage = useRef<HTMLDivElement>(null);
  const [ship, setShip] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const sound = createThockSound();
    const toy = startThock(el, sound, setShip, () => {
      setPlayed(true);
      onPlay?.();
    });
    let raf = 0;
    if (toy.failed || !el.querySelector("canvas")) onFail?.(toy.failed ?? "none");
    else raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => onReady?.())));
    return () => {
      cancelAnimationFrame(raf);
      toy.stop();
      sound.stop();
    };
    // Mounted once per visit of the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToyStage label={c.stage} stageRef={stage} hint={hintText(c.hint, played && !ship)}>
      <p className="sr-only" aria-live="polite">
        {ship ? c.ship : ""}
      </p>
    </ToyStage>
  );
}
