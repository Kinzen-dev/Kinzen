"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/content/schema";
import { LabBanner } from "../a-kit/banner";
import { startParticles } from "./engine";

/** Particles alive: the gold dust wordmark answers the cursor, bursts on a click, and turns into the Thai name. */
export default function ParticlesAlive({ locale }: { locale: Locale }) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!section.current || !host.current || !slot.current) return;
    return startParticles(section.current, host.current, slot.current);
  }, []);
  return <LabBanner locale={locale} sectionRef={section} slotRef={slot} stage={<div ref={host} />} />;
}
