import type { gsap as GsapType } from "gsap";
import type { Flip as FlipType } from "gsap/Flip";
import { judge, type Verdict } from "../trick-my-ai/rules";

type Gsap = typeof GsapType;

export type SmashEls = {
  stage: HTMLElement;
  layer: HTMLElement;
  bar: HTMLElement;
  chat: HTMLElement;
};

export type SmashHooks = {
  onResult: (text: string, verdict: Verdict) => void;
};

const MAX_BUBBLES = 5;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const graphemes = (s: string) =>
  [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((g) => g.segment);

/** Add one clinic bubble to the chat (no motion). Returns it. */
export function addBubble(chat: HTMLElement, text: string, side: "in" | "out"): HTMLElement {
  const b = document.createElement("p");
  b.className = `hs-bubble hs-${side}`;
  b.textContent = text;
  chat.appendChild(b);
  while (chat.children.length > MAX_BUBBLES) chat.firstElementChild?.remove();
  return b;
}

/**
 * The falling-phrase engine. Every phrase is judged by the lab rule engine before it falls; on the
 * guard bar a rejected phrase breaks into one shard per grapheme (Physics2D), a safe one passes and
 * turns into a LINE bubble (Flip keeps the chat stack moving smoothly). All tweens live in one
 * gsap context, so `destroy` stops everything at once.
 */
export function createSmash(els: SmashEls, gsap: Gsap, Flip: typeof FlipType, hooks: SmashHooks) {
  const { stage, layer, bar, chat } = els;
  const ctx = gsap.context(() => {}, stage);

  const rel = (r: DOMRect) => {
    const s = stage.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  };

  function shatter(block: HTMLElement, verdict: Verdict) {
    const spans = [...block.querySelectorAll<HTMLElement>("span")];
    const b = rel(block.getBoundingClientRect());
    for (const span of spans) {
      const r = rel(span.getBoundingClientRect());
      if (!span.textContent?.trim()) continue;
      const shard = document.createElement("span");
      shard.className = "hs-shard";
      shard.textContent = span.textContent;
      shard.style.left = `${r.x}px`;
      shard.style.top = `${r.y}px`;
      layer.appendChild(shard);
      const fromCentre = (r.x + r.w / 2 - (b.x + b.w / 2)) / Math.max(1, b.w / 2);
      gsap
        .timeline({ onComplete: () => shard.remove() })
        .to(shard, {
          duration: rand(1.1, 1.6),
          physics2D: { velocity: rand(240, 560), angle: -90 + fromCentre * 55 + rand(-25, 25), gravity: 1400 },
          rotation: rand(-540, 540),
          ease: "none",
        })
        .to(shard, { opacity: 0, duration: 0.5, ease: "power1.in" }, "-=0.55");
    }
    // Sparks off the bar at the point of impact.
    const cx = b.x + b.w / 2;
    for (let i = 0; i < 14; i++) {
      const spark = document.createElement("i");
      spark.className = "hs-spark";
      spark.style.left = `${cx + rand(-b.w / 2, b.w / 2)}px`;
      spark.style.top = `${b.y + b.h}px`;
      layer.appendChild(spark);
      gsap.to(spark, {
        duration: rand(0.5, 0.9),
        physics2D: { velocity: rand(160, 420), angle: rand(-170, -10), gravity: 900 },
        opacity: 0,
        scale: 0.2,
        ease: "none",
        onComplete: () => spark.remove(),
      });
    }
    // The rule that caught it rises from the impact.
    const tag = document.createElement("span");
    tag.className = "hs-tag";
    tag.textContent = `✕ ${verdict.fired.join(" · ")}`;
    layer.appendChild(tag);
    const tw = tag.offsetWidth;
    tag.style.left = `${Math.min(Math.max(8, cx - tw / 2), stage.clientWidth - tw - 8)}px`;
    tag.style.top = `${b.y + b.h - 34}px`;
    gsap
      .timeline({ onComplete: () => tag.remove() })
      .from(tag, { y: 14, scale: 0.7, opacity: 0, duration: 0.35, ease: "back.out(2)" })
      .to(tag, { y: -42, opacity: 0, duration: 1.1, ease: "power1.in" }, "+=0.7");
    // The bar takes the hit.
    const flash = document.createElement("i");
    flash.className = "hs-impact";
    flash.style.left = `${cx}px`;
    bar.appendChild(flash);
    gsap.fromTo(
      flash,
      { scale: 0.2, opacity: 1 },
      { scale: 1.6, opacity: 0, duration: 0.7, ease: "power2.out", onComplete: () => flash.remove() },
    );
    gsap.fromTo(bar, { y: 5 }, { y: 0, duration: 0.6, ease: "elastic.out(1.2, 0.35)" });
    block.remove();
  }

  function land(block: HTMLElement, text: string) {
    bar.classList.remove("hs-pass");
    void bar.offsetWidth;
    bar.classList.add("hs-pass");
    const state = Flip.getState(chat.children);
    const bubble = addBubble(chat, text, "out");
    bubble.style.opacity = "0";
    Flip.from(state, { duration: 0.5, ease: "power3.out", absolute: false });
    const to = rel(bubble.getBoundingClientRect());
    const from = rel(block.getBoundingClientRect());
    gsap
      .timeline({
        onComplete: () => {
          block.remove();
        },
      })
      .to(block, {
        x: `+=${to.x - from.x}`,
        y: `+=${to.y - from.y}`,
        width: to.w,
        height: to.h,
        duration: 0.55,
        ease: "power3.inOut",
      })
      .to(block, { borderRadius: "1.125rem 0.375rem 1.125rem 1.125rem", backgroundColor: "#06c755", color: "#0b1a10", duration: 0.55 }, 0)
      .to(bubble, { opacity: 1, duration: 0.2 }, 0.42)
      .to(block, { opacity: 0, duration: 0.2 }, 0.45);
  }

  function drop(raw: string) {
    const text = raw.trim().slice(0, 60);
    if (!text) return;
    const verdict = judge(text);
    ctx.add(() => {
      const block = document.createElement("div");
      block.className = `hs-block${verdict.pass ? "" : " hs-bad"}`;
      // One span per grapheme, so the block can break into letters (Thai marks stay on their base).
      for (const g of graphemes(text)) {
        const s = document.createElement("span");
        s.textContent = g;
        block.appendChild(s);
      }
      layer.appendChild(block);
      const w = block.offsetWidth;
      const h = block.offsetHeight;
      const W = stage.clientWidth;
      const chatBox = rel(chat.getBoundingClientRect());
      const [lo, hi] = verdict.pass ? [chatBox.x, chatBox.x + chatBox.w - w] : [12, W - w - 12];
      const x = rand(Math.max(8, lo), Math.max(Math.max(8, lo), Math.min(W - w - 8, hi)));
      const barY = bar.offsetTop;
      gsap.set(block, { x, y: -h - 8, rotation: rand(-6, 6) });
      const fall = Math.sqrt((2 * (barY + h)) / 2400);
      const tl = gsap.timeline();
      tl.to(block, { y: barY - h, rotation: rand(-3, 3), duration: fall, ease: "power2.in" });
      if (verdict.pass) {
        tl.to(block, { y: barY + bar.offsetHeight + 6, rotation: 0, duration: 0.22, ease: "none" });
        tl.call(() => ctx.add(() => land(block, text)));
      } else {
        tl.call(() => ctx.add(() => shatter(block, verdict)));
      }
      tl.call(() => hooks.onResult(text, verdict));
    });
  }

  return {
    drop,
    destroy: () => ctx.revert(),
  };
}
