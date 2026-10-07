import type { ReactNode } from "react";
import "./primitives.css";

/**
 * Infinite marquee (CSS loop). The list is rendered twice; the second copy is aria-hidden so a
 * screen reader hears it once. Pauses on hover and focus-within, and for good inside a paused
 * MarqueeGroup (marquee-group.tsx); static under reduced motion.
 */
export function Marquee({
  items,
  reverse = false,
  seconds = 40,
  label,
  className,
}: {
  items: ReactNode[];
  reverse?: boolean;
  seconds?: number;
  label?: string;
  className?: string;
}) {
  const row = (hidden: boolean) => (
    <ul className="marquee-row" aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
  return (
    <div
      className={["marquee", className].filter(Boolean).join(" ")}
      data-reverse={reverse || undefined}
      style={{ ["--marquee-s" as string]: `${seconds}s` }}
      role="group"
      aria-label={label}
    >
      <div className="marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
