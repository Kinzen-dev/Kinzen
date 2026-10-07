"use client";

import { useEffect, useRef } from "react";
import type { LabProps } from "../../types";
import { LabBanner } from "../a-kit/banner";
import { startKeycaps } from "./engine";

/** Keycap field: raised gold-topped keys spell KINZEN; the cursor sends ripples through the field. */
export default function KeycapField({ locale, banner }: LabProps) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!section.current || !host.current || !slot.current) return;
    return startKeycaps(section.current, host.current, slot.current);
  }, []);
  return (
    <LabBanner locale={locale} banner={banner} sectionRef={section} slotRef={slot} stage={<div ref={host} />} scrim />
  );
}
