"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * The architecture plate's card. Phones first see the WHOLE drawing fitted to the card (an
 * overview, no empty half, nothing cut off); "View full size" switches to the drawing at its
 * reading size, panned sideways inside the card. From 48rem the drawing is read as is and the
 * toggle is hidden.
 */
export function PlateFrame({
  full: fullLabel,
  fit: fitLabel,
  children,
}: {
  full: string;
  fit: string;
  children: ReactNode;
}) {
  const [full, setFull] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // The plate keeps its hairlines one device pixel wide from --plate-px (viewBox units per CSS px).
  // Its own measure runs on resize only, so re-measure when the drawing changes scale here.
  useLayoutEffect(() => {
    const scroller = ref.current?.querySelector<HTMLElement>(".plate-scroll");
    const svg = scroller?.querySelector("svg");
    const units = svg?.viewBox.baseVal.width;
    if (!scroller || !svg || !units || !svg.clientWidth) return;
    scroller.style.setProperty("--plate-px", String(units / svg.clientWidth));
    scroller.scrollLeft = 0;
  }, [full]);

  return (
    <div ref={ref} className="pj-plate" data-full={full || undefined}>
      <p className="pj-plate-bar">
        <button type="button" className="pj-plate-zoom" onClick={() => setFull((f) => !f)}>
          {full ? fitLabel : fullLabel}
          <span aria-hidden="true">{full ? "−" : "+"}</span>
        </button>
      </p>
      {children}
    </div>
  );
}
