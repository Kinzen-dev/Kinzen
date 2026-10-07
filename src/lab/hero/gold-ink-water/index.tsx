"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/content/schema";
import { LabBanner } from "../a-kit/banner";
import { startFluid } from "./engine";

/** Gold ink in water: KINZEN poured as gold dye; the cursor stirs it, calm water gathers it back. */
export default function GoldInkWater({ locale }: { locale: Locale }) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!section.current || !host.current || !slot.current) return;
    return startFluid(section.current, host.current, slot.current);
  }, []);
  return <LabBanner locale={locale} sectionRef={section} slotRef={slot} stage={<div ref={host} />} scrim />;
}
