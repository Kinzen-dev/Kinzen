"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/content/schema";
import { LabBanner } from "../a-kit/banner";
import { startKeycaps } from "./engine";

/** Keycap field: raised gold-topped keys spell KINZEN; the cursor sends ripples through the field. */
export default function KeycapField({ locale }: { locale: Locale }) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!section.current || !host.current || !slot.current) return;
    return startKeycaps(section.current, host.current, slot.current);
  }, []);
  return <LabBanner locale={locale} sectionRef={section} slotRef={slot} stage={<div ref={host} />} scrim />;
}
