"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";

/** Where each card starts in the collage, by its grid column (left / right) and row. */
const SCATTER = [
  { x: 72, y: 150, rotation: -7 },
  { x: -64, y: 210, rotation: 6 },
  { x: 56, y: 230, rotation: 5 },
  { x: -80, y: 160, rotation: -6 },
];

const MOTION_DESKTOP = "(min-width: 64rem) and (prefers-reduced-motion: no-preference)";

/**
 * Layout and motion for the project cards (client: the scatter and the carousel dots).
 *
 * - From 64rem: a 12-column bento, rows alternate 7/5 and 5/7. With `scatter`, each card that is
 *   still below the fold starts rotated and pulled toward the middle, and the moment its slot
 *   enters the viewport it settles into place in one short, time-based move (CSS transition on
 *   transform; the untransformed slot is what is observed). Not a scrub: wherever the visitor
 *   stops scrolling, the cards come to rest as the even grid. Keyboard focus settles a card at
 *   once. Cards already on screen (Back, a hash link) are never armed. Reduced motion or no JS:
 *   the even grid, nothing moves.
 * - 48 to 64rem: two equal columns.
 * - Phones: a scroll-snap carousel with the next card peeking, dots underneath, arrow keys move
 *   between cards.
 */
export function CardDeck({
  cards,
  names,
  scatter,
  reveal = false,
  label,
  dotsLabel,
  dotLabel,
}: {
  cards: ReactNode[];
  names: string[];
  scatter: boolean;
  reveal?: boolean;
  label: string;
  dotsLabel: string;
  dotLabel: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  // Collage entrance (desktop, motion allowed): arm the cards below the fold, settle on entry.
  useEffect(() => {
    const ul = list.current;
    if (!scatter || !ul || !window.matchMedia(MOTION_DESKTOP).matches) return;
    const slots = [...ul.children] as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const slot = entry.target as HTMLElement;
        if (slot.dataset.scatter === "armed") slot.dataset.scatter = "settle";
        io.unobserve(slot);
      }
    });
    slots.forEach((slot, i) => {
      const r = slot.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) return; // on screen already: stays put
      const from = SCATTER[i % SCATTER.length];
      slot.style.setProperty("--sx", `${from.x}px`);
      slot.style.setProperty("--sy", `${from.y}px`);
      slot.style.setProperty("--sr", `${from.rotation}deg`);
      slot.style.setProperty("--sd", `${(i % 2) * 90}ms`);
      slot.dataset.scatter = "armed";
      io.observe(slot);
    });
    return () => io.disconnect();
  }, [scatter]);

  // Carousel position -> active dot. Only does work while the list actually scrolls sideways.
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = ul.scrollWidth - ul.clientWidth;
      if (max <= 0) return;
      const first = ul.children[0] as HTMLElement | undefined;
      const second = ul.children[1] as HTMLElement | undefined;
      if (!first || !second) return;
      const step = second.offsetLeft - first.offsetLeft;
      const index = Math.round(ul.scrollLeft / step);
      setActive(Math.max(0, Math.min(cards.length - 1, index)));
    };
    const onScroll = () => {
      frame ||= window.requestAnimationFrame(read);
    };
    ul.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ul.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [cards.length]);

  const show = (index: number) => {
    const ul = list.current;
    const slot = ul?.children[index] as HTMLElement | undefined;
    if (!ul || !slot) return;
    const first = ul.children[0] as HTMLElement;
    const smooth = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    ul.scrollTo({ left: slot.offsetLeft - first.offsetLeft, behavior: smooth ? "smooth" : "auto" });
    setActive(index);
  };

  // Arrow keys move between card links (handy in the carousel, harmless in the grid).
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>(".mw-link")];
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (at < 0) return;
    const next = links[at + (event.key === "ArrowRight" ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  // Keyboard focus lands on the card's name link, low in the card: bring the WHOLE card into view,
  // clear of the floating nav pill (scroll-margin on the slot), and in view inside the carousel.
  const onFocus = (event: FocusEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    if (!target.matches(":focus-visible")) return;
    const slot = target.closest<HTMLElement>(".mw-slot");
    if (!slot) return;
    // A card reached by keyboard is at rest at once (no settle under a focus ring).
    if (slot.dataset.scatter) slot.dataset.scatter = "done";
    slot.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <div className="mw-deck" data-scatter={scatter || undefined}>
      <ul
        ref={list}
        className="mw-grid"
        aria-label={label}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        data-reveal-group={reveal || undefined}
      >
        {cards.map((card, i) => (
          <li key={i} className="mw-slot" data-wide={i % 4 === 0 || i % 4 === 3 || undefined}>
            {card}
          </li>
        ))}
      </ul>
      <div className="mw-dots" role="group" aria-label={dotsLabel}>
        {names.map((name, i) => (
          <button
            key={name}
            type="button"
            className="mw-dot-btn"
            aria-label={dotLabel.replace("{name}", name)}
            aria-current={i === active || undefined}
            onClick={() => show(i)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
