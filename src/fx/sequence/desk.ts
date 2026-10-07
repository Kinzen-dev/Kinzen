import { loadMotion } from "@/motion/gsap";

/*
 * Scene 0 controller: draws the server-rendered ink desk (fx/ink/ink-art.tsx). One GSAP timeline,
 * never playing on its own: the stage seeks it to the scene clock every frame, so pausing,
 * resuming and the loop are all just the clock. A gold pen tip eases after the stroke being drawn.
 * Then the phone rings (anticipation: wiggle, squash), a gold line shoots from it into the chat
 * bubble, which pops with overshoot. Holding, the line boils like the site's doodles and a gold
 * pulse runs from the phone to the bubble now and then.
 */

/** The drawing takes this long on the scene clock (s); the hold follows. */
export const DRAW_S = 8;

/** Per-region pacing: how long the hand spends on the region (strokes start evenly inside it), and
 *  the hold after it (a breath before the next region; longest before the face). */
const PACE = {
  laptop: { total: 0.85, hold: 0.18 },
  body: { total: 1.3, hold: 0.38 },
  head: { total: 1.15, hold: 0.22 },
  props: { total: 0.4, hold: 0.08 },
  robot: { total: 0.5, hold: 0.05 },
  accent: { total: 0.2, hold: 0.15 },
} as const;
const ART_X = 24;
const ART_Y = 104;

export type Desk = {
  /** Seek to `t` seconds into the scene (drawing, then the hold with its idle pulse). */
  set(t: number): void;
  /** The finished drawing, still (reduced motion switched on mid-visit). */
  finish(): void;
  /** Ink points of the drawing as it is now, in the stage's layout px: x, y pairs. */
  points(stage: HTMLElement, max: number): Float32Array;
  dispose(): void;
  /** The CSS safety net had already revealed the finished drawing: the scene starts at the hold. */
  shown: boolean;
};

export async function createDesk(svg: SVGSVGElement): Promise<Desk> {
  const [{ gsap }, { DrawSVGPlugin }] = await Promise.all([loadMotion(), import("gsap/DrawSVGPlugin")]);
  gsap.registerPlugin(DrawSVGPlugin);
  const shown = parseFloat(getComputedStyle(svg).opacity) > 0.5;
  const q = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const strokes = q<SVGPathElement>("[data-stroke]");
  const pen = svg.querySelector<SVGGElement>(".ink-pen")!;
  const flood = svg.querySelector<SVGRectElement>(".ink-flood")!;
  const phone = svg.querySelector<SVGGElement>(".ink-phone")!;
  const bubble = svg.querySelector<SVGGElement>(".ink-bubble")!;
  const line = svg.querySelector<SVGPathElement>(".ink-line")!;
  const pulse = svg.querySelector<SVGPathElement>(".ink-pulse")!;
  const blink = svg.querySelector<SVGCircleElement>(".ink-antenna")!;
  const turb = svg.querySelector<SVGFETurbulenceElement>("feTurbulence");

  // The pen eases after its target (a hand travelling between strokes, never a jump).
  const target = { x: ART_X + 160, y: ART_Y + 10 };
  const at = { x: target.x, y: target.y };
  const follow = () => {
    at.x += (target.x - at.x) * 0.32;
    at.y += (target.y - at.y) * 0.32;
    pen.setAttribute("transform", `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`);
  };
  const lengths = new Map<SVGPathElement, number>();
  const aim = (p: SVGPathElement, progress: number) => {
    let len = lengths.get(p);
    if (len === undefined) {
      len = p.getTotalLength();
      lengths.set(p, len);
    }
    const pt = p.getPointAtLength(len * progress);
    target.x = pt.x + ART_X;
    target.y = pt.y + ART_Y;
  };

  let tl!: gsap.core.Timeline;
  let idle!: gsap.core.Timeline;
  const ctx = gsap.context(() => {
    gsap.set(strokes, { drawSVG: "0%" });
    gsap.set(".ink-prop", { drawSVG: "0%" });
    gsap.set(line, { drawSVG: "0%" });
    gsap.set(pulse, { drawSVG: "0% 0%", opacity: 0 });
    gsap.set(bubble, { scale: 0, svgOrigin: "566 131" });
    gsap.set(".ink-check", { scale: 0, svgOrigin: "660 70" });
    gsap.set(".ink-ring", { opacity: 0 });
    gsap.set(flood, { opacity: 0 });
    gsap.set(pen, { opacity: 0 });
    gsap.set(blink, { scale: 0, transformOrigin: "50% 50%", transformBox: "fill-box" });

    tl = gsap.timeline({ paused: true });
    tl.to({}, { duration: 0.35 });
    tl.to(pen, { opacity: 1, duration: 0.25 });

    // 1. The outer contour in one long stroke.
    for (const s of strokes.filter((x) => x.dataset.group === "outline")) {
      tl.to(s, {
        drawSVG: "100%",
        duration: 1.3,
        ease: "power1.inOut",
        onUpdate() {
          aim(s, this.progress());
        },
      });
    }
    tl.to({}, { duration: 0.2 });

    // 2. Each region in turn, strokes overlapping like a quick hand, a hold between regions.
    for (const g of Object.keys(PACE) as (keyof typeof PACE)[]) {
      const list = strokes.filter((s) => s.dataset.group === g);
      const pace = PACE[g];
      let t = tl.duration();
      const step = pace.total / Math.max(1, list.length);
      for (const s of list) {
        const len = Number(s.dataset.len) || 20;
        const dur = Math.min(0.55, 0.08 + Math.sqrt(len) * 0.02);
        // Long strokes steer the pen; short ticks are drawn without dragging it about.
        tl.to(
          s,
          {
            drawSVG: "100%",
            duration: dur,
            ease: "power2.inOut",
            onUpdate:
              len > 40
                ? function (this: gsap.core.Tween) {
                    aim(s, this.progress());
                  }
                : undefined,
          },
          t,
        );
        t += step;
      }
      if (g === "accent") {
        // The little sparkles land with a pop.
        tl.fromTo(
          list,
          { scale: 0.4, transformOrigin: "50% 50%", transformBox: "fill-box" },
          { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.06 },
          t - 0.3,
        );
      }
      tl.to({}, { duration: pace.hold }, ">");
    }

    // 3. Solid ink settles in (anything a stroke did not uncover), the desk runs on to the right.
    tl.to(flood, { opacity: 1, duration: 0.6, ease: "power1.out" }, ">-0.1");
    tl.to(".ink-desk", { drawSVG: "100%", duration: 0.5, ease: "power2.out" }, "<");
    tl.to(blink, { scale: 1, duration: 0.45, ease: "back.out(3)" }, "<0.2");

    // 4. The phone is sketched, then a hold.
    tl.to(".ink-phone .ink-prop", {
      drawSVG: "100%",
      duration: 0.5,
      stagger: 0.15,
      ease: "power2.inOut",
      onUpdate() {
        target.x = 625;
        target.y = 330;
      },
    });
    tl.to(pen, { opacity: 0, duration: 0.3 }, ">0.1");
    tl.to({}, { duration: 0.25 });

    // 5. It rings (anticipation): a wiggle, the rings, a squash down...
    tl.to(".ink-ring", { opacity: 1, duration: 0.1 });
    tl.to(".ink-ring", { drawSVG: "100%", duration: 0.35, stagger: 0.08, ease: "power2.out" }, "<");
    tl.to(phone, {
      keyframes: { rotation: [0, -6, 5, -4, 3, 0], ease: "none" },
      duration: 0.6,
      transformOrigin: "50% 100%",
      ease: "power1.inOut",
    });
    tl.to(".ink-ring", { opacity: 0, duration: 0.3 }, ">-0.1");
    tl.to(phone, { scaleY: 0.9, scaleX: 1.05, duration: 0.2, ease: "power2.in", transformOrigin: "50% 100%" });
    // ...and the release: the phone stretches as the gold line shoots out of it.
    tl.to(phone, { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1.1, 0.4)" });
    tl.to(line, { drawSVG: "100%", duration: 0.75, ease: "power3.out" }, "<");
    // 6. The bubble pops with overshoot, its lines are jotted, the tick lands.
    tl.to(bubble, { scale: 1, duration: 0.6, ease: "back.out(2.2)" }, "<0.55");
    tl.to(".ink-bubble .ink-prop", { drawSVG: "100%", duration: 0.35, stagger: 0.12, ease: "power2.out" }, "<0.15");
    tl.to(".ink-check", { scale: 1, duration: 0.45, ease: "back.out(3.4)" }, ">-0.05");

    // Hold: a gold pulse runs up the line every few seconds; the antenna blinks.
    idle = gsap.timeline({ paused: true });
    idle.to({}, { duration: 0.6 });
    idle.set(pulse, { opacity: 1, drawSVG: "0% 0%" });
    idle.to(pulse, { drawSVG: "84% 100%", duration: 1.1, ease: "power1.inOut" });
    idle.to(pulse, { opacity: 0, duration: 0.25 }, ">-0.15");
    idle.fromTo(
      ".ink-check",
      { scale: 1 },
      { scale: 1.18, duration: 0.18, yoyo: true, repeat: 1, ease: "power1.out" },
      "<",
    );
    idle.to(blink, { opacity: 0.25, duration: 0.3, yoyo: true, repeat: 1 }, 0.8);
    idle.to({}, { duration: 2.3 });
  }, svg);

  const speed = tl.duration() / DRAW_S;
  let drawing = true;
  let boil = -1;
  svg.dataset.state = "drawing";
  // Already on screen finished: stay finished (same task as the setup above, so nothing flashes).
  if (shown) {
    tl.time(tl.duration());
    drawing = false;
  }

  const set = (t: number) => {
    if (t < DRAW_S) {
      if (!drawing) {
        // A new round: everything back to its unfinished start.
        idle.time(0);
        drawing = true;
        svg.dataset.state = "drawing";
      }
      tl.time(t * speed);
      follow();
    } else {
      if (drawing) {
        tl.time(tl.duration());
        drawing = false;
      }
      idle.time((t - DRAW_S) % idle.duration());
    }
    // Line boil (as the site's doodles): three seeds stepped at 8 fps once the ink has settled.
    const b = t > DRAW_S - 1 ? Math.floor(t * 8) % 3 : 0;
    if (turb && b !== boil) {
      boil = b;
      turb.setAttribute("seed", String(4 + b));
    }
  };

  const finish = () => {
    tl.time(tl.duration());
    idle.time(0);
    drawing = false;
    svg.dataset.state = "done";
  };

  const points = (stage: HTMLElement, max: number) => {
    const r = stage.getBoundingClientRect();
    const k = stage.offsetWidth ? r.width / stage.offsetWidth : 1;
    const res = 0.5;
    const w = Math.max(1, Math.round(stage.offsetWidth * res));
    const h = Math.max(1, Math.round(stage.offsetHeight * res));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return new Float32Array(0);
    // Each element's own screen matrix, mapped into the stage's layout px at canvas resolution.
    const onto = (el: SVGGraphicsElement) => {
      const m = el.getScreenCTM();
      if (!m) return false;
      const s = res / k;
      g.setTransform(m.a * s, m.b * s, m.c * s, m.d * s, (m.e - r.left) * s, (m.f - r.top) * s);
      return true;
    };
    g.fillStyle = "#fff";
    g.strokeStyle = "#fff";
    g.lineCap = "round";
    g.lineJoin = "round";
    const art = svg.querySelector<SVGPathElement>(".ink-art");
    if (art && onto(art)) g.fill(new Path2D(art.getAttribute("d") ?? ""));
    for (const el of svg.querySelectorAll<SVGPathElement>(".ink-prop:not(.ink-ring), .ink-line")) {
      if (!onto(el)) continue;
      g.lineWidth = 3.2;
      g.stroke(new Path2D(el.getAttribute("d") ?? ""));
    }
    const check = svg.querySelector<SVGCircleElement>(".ink-check circle");
    if (check && onto(check)) {
      g.beginPath();
      g.arc(660, 70, 15, 0, Math.PI * 2);
      g.fill();
    }
    const a = g.getImageData(0, 0, w, h).data;
    const hits: number[] = [];
    for (let i = 0; i < w * h; i++) if (a[i * 4 + 3] > 96) hits.push(i);
    const n = Math.min(max, hits.length);
    const out = new Float32Array(n * 2);
    for (let j = 0; j < n; j++) {
      const i = hits[(Math.random() * hits.length) | 0];
      out[j * 2] = ((i % w) + Math.random()) / res;
      out[j * 2 + 1] = (Math.floor(i / w) + Math.random()) / res;
    }
    return out;
  };

  return {
    shown,
    set,
    finish,
    points,
    dispose: () => {
      ctx.revert();
      svg.removeAttribute("data-state");
    },
  };
}
