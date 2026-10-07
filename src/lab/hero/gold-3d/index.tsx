"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/content/schema";
import { LabBanner } from "../a-kit/banner";
import { startGold3d } from "./engine";
import "./gold-3d.css";

/** 3D gold: brushed-gold KINZEN letters that lean toward the cursor; scrolling flies the camera through them. */
export default function Gold3d({ locale }: { locale: Locale }) {
  const track = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!track.current || !section.current || !host.current || !slot.current) return;
    return startGold3d(section.current, host.current, slot.current, track.current);
  }, []);
  return (
    <div ref={track} className="g3d-track">
      <LabBanner
        locale={locale}
        sectionRef={section}
        slotRef={slot}
        className="g3d"
        stage={<div ref={host} className="g3d-host" />}
      />
    </div>
  );
}
