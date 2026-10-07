"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { loadMotion } from "@/motion/gsap";

/** Where each card starts in the collage, by its grid column (left / right) and row. */
const SCATTER = [
  { x: 72, y: 150, rotation: -7 },
  { x: -64, y: 210, rotation: 6 },
  { x: 56, y: 230, rotation: 5 },
  { x: -80, y: 160, rotation: -6 },
];

/**
 * Layout and motion for the project cards (client: the scatter and the carousel dots).
 *
 * - From 64rem: a 12-column bento, rows alternate 7/5 and 5/7. With `scatter`, each card starts
 *   rotated and pulled toward the middle, then settles into its slot as the slot scrolls in
 *   (ScrollTrigger scrub on transform only; the slot is the trigger, so measuring never sees the
 *   moving card). Reduced motion or no JS: the even grid, nothing moves.
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

  // Collage entrance (desktop, motion allowed).
  useEffect(() => {
    const ul = list.current;
    if (!scatter || !ul) return;
    let revert: (() => void) | null = null;
    let cancelled = false;
    void loadMotion().then(({ gsap }) => {
      if (cancelled) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 64rem) and (prefers-reduced-motion: no-preference)", () => {
        const slots = [...ul.children] as HTMLElement[];
        slots.forEach((slot, i) => {
          const card = slot.firstElementChild as HTMLElement | null;
          if (!card) return;
          const from = SCATTER[i % SCATTER.length];
          gsap.fromTo(
            card,
            { x: from.x, y: from.y, rotation: from.rotation, scale: 0.92 },
            {
              x: 0,
              y: 0,
              rotation: 0,
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: slot, start: "top bottom", end: "center 70%", scrub: 0.6 },
            },
          );
        });
      });
      revert = () => mm.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
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
      const index = ul.scrollLeft >= max - 2 ? cards.length - 1 : Math.round(ul.scrollLeft / step);
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
    target.closest<HTMLElement>(".mw-slot")?.scrollIntoView({ block: "nearest", inline: "nearest" });
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
