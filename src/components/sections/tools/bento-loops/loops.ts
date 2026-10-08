import type { gsap as GsapType } from "gsap";
import type { GroupId } from "../types";

type Gsap = typeof GsapType;
export type Timeline = ReturnType<Gsap["timeline"]>;
/** Lights the named tools' chips in the tile (brand colour); every other chip goes back to the tone. */
type Light = (keys: string[]) => void;
/**
 * One pass of a tile's loop. A pass starts from the finished frame (the markup), clears it, builds
 * it again beat by beat, and ends on the finished frame with a soft hold, so the next pass (a fresh
 * timeline) starts exactly where this one stopped: no rewind, no jump.
 */
type Builder = (gsap: Gsap, root: HTMLElement, light: Light) => Timeline;

const one = (root: HTMLElement, x: string) => root.querySelector<HTMLElement>(`[data-x="${x}"]`)!;
const all = (root: HTMLElement, x: string) => Array.from(root.querySelectorAll<HTMLElement>(`[data-x="${x}"]`));

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
/** User-perceived characters, so Thai vowels and tone marks type in with their consonant. */
const graphemes = (s: string) => (segmenter ? Array.from(segmenter.segment(s), (g) => g.segment) : Array.from(s));

/** Types `el`'s `data-text` in, letter by letter, at `cps` characters per second. */
function typeIn(tl: Timeline, el: HTMLElement, at: string | number, cps = 26) {
  const g = graphemes(el.dataset.text ?? "");
  const o = { n: 0 };
  tl.to(
    o,
    {
      n: g.length,
      duration: g.length / cps,
      ease: "none",
      onUpdate: () => {
        el.textContent = g.slice(0, Math.round(o.n)).join("");
      },
    },
    at,
  );
}

/** Counts `el` up from `from` to `to`. */
function countUp(tl: Timeline, el: HTMLElement, from: number, to: number, duration: number, at: string | number) {
  const o = { n: from };
  tl.to(
    o,
    { n: to, duration, ease: "power2.out", onUpdate: () => void (el.textContent = String(Math.round(o.n))) },
    at,
  );
}

const pop = { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.7)" };
const rise = { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" };
const HOLD = 2.4;

const ai: Builder = (gsap, root, light) => {
  const tl = gsap.timeline();
  const [voice, ask, askText, reply, replyText, dots, ok, codeRow, codeLine, caret, evalN] = [
    "voice",
    "ask",
    "askText",
    "reply",
    "replyText",
    "dots",
    "ok",
    "codeRow",
    "codeLine",
    "caret",
    "evalN",
  ].map((x) => one(root, x));
  const bars = all(root, "bar");
  const checks = all(root, "check");
  const ticks = all(root, "tick");
  const pipes = all(root, "pipe");
  /** The pipeline strip: steps before `i` done, `i` live (i = pipes.length: all done). */
  const step = (i: number, at?: string) =>
    tl.call(() => pipes.forEach((p, j) => (p.className = j < i ? "is-done" : j === i ? "is-on" : "")), undefined, at);

  // Clear the finished frame.
  tl.to([voice, ask, reply, ok, codeRow, ...ticks], { autoAlpha: 0, duration: 0.45, ease: "power2.in" });
  tl.call(() => {
    for (const el of [askText, replyText, codeLine]) el.textContent = "";
    evalN.textContent = "0";
  });
  tl.set(codeRow, { autoAlpha: 1 });
  tl.set(caret, { opacity: 1 });
  step(-1);

  // 1. An agent writes the guard rule.
  step(0, "+=0.2");
  tl.call(light, [["Claude Code", "Codex"]]);
  typeIn(tl, codeLine, ">", 24);
  tl.to(caret, { opacity: 0, duration: 0.2 }, "+=0.3");

  // 2. A call comes in and is transcribed.
  step(1, "+=0.1");
  tl.call(light, [["Real-time speech-to-text"]]);
  tl.fromTo(voice, { autoAlpha: 0, y: 10, scale: 0.97 }, pop);
  tl.fromTo(
    bars,
    { scaleY: 0.3 },
    { scaleY: 1, duration: 0.2, ease: "sine.inOut", stagger: { each: 0.035, repeat: 3, yoyo: true } },
    "<0.15",
  );
  tl.fromTo(ask, { autoAlpha: 0, y: 8 }, rise, "-=0.5");
  typeIn(tl, askText, ">", 30);

  // 3. The model answers.
  step(2, "+=0.2");
  tl.call(light, [["Anthropic API", "Gemini on Vertex AI"]]);
  tl.fromTo(dots, { autoAlpha: 0, y: 6, scale: 1 }, { autoAlpha: 1, y: 0, duration: 0.25 });
  tl.fromTo(
    Array.from(dots.children),
    { y: 0 },
    { y: -3, duration: 0.28, stagger: 0.12, repeat: 3, yoyo: true, ease: "sine.inOut" },
    "<",
  );
  tl.to(dots, { autoAlpha: 0, scale: 0.9, duration: 0.18, ease: "power2.in" });
  tl.fromTo(reply, { autoAlpha: 0, y: 8 }, rise, ">");
  typeIn(tl, replyText, "<0.1", 30);

  // 4. The evals check the reply before it goes out.
  step(3, "+=0.15");
  tl.call(light, [["LLM evals"]]);
  const t0 = tl.duration();
  countUp(tl, evalN, 0, 12, 1.5, t0);
  checks.forEach((_, i) => {
    // The label stays at full contrast; the tick landing is the "checked" signal.
    tl.fromTo(
      ticks[i],
      { autoAlpha: 0, scale: 0.4 },
      { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.6)" },
      t0 + i * 0.3,
    );
  });
  tl.fromTo(ok, { autoAlpha: 0, x: -4 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: "power3.out" }, ">0.1");
  step(pipes.length);
  tl.call(light, [[]], "+=0.6");
  tl.to({}, { duration: HOLD });
  return tl;
};

const backend: Builder = (gsap, root, light) => {
  const tl = gsap.timeline();
  const [cmd, l2, l3, l4, l5, producer, lane] = ["cmd", "l2", "l3", "l4", "l5", "producer", "lane"].map((x) =>
    one(root, x),
  );
  const evts = all(root, "evt");
  const sinks = all(root, "sink");

  tl.to([cmd, l2, l3, l4, l5, ...evts], { autoAlpha: 0, duration: 0.45, ease: "power2.in" });
  tl.call(() => void (cmd.textContent = ""));
  tl.set(cmd, { autoAlpha: 1 });
  tl.set(evts, { left: 0, x: 0 });

  tl.call(light, [["TypeScript", "Node.js"]], "+=0.2");
  typeIn(tl, cmd, ">", 18);
  tl.call(light, [["NestJS", "Fastify"]], "+=0.25");
  tl.fromTo(l2, { autoAlpha: 0, y: 6 }, rise);
  tl.call(light, [["GraphQL"]], "+=0.5");
  tl.fromTo(l3, { autoAlpha: 0, y: 6 }, rise);

  tl.call(light, [["Kafka", "BullMQ", "Hexagonal and event-driven design"]], "+=0.45");
  const t0 = tl.duration();
  evts.forEach((evt, i) => {
    const at = t0 + i * 0.5;
    const sink = sinks[i % 2];
    tl.fromTo(producer, { scale: 1 }, { scale: 1.06, duration: 0.14, yoyo: true, repeat: 1, ease: "sine.out" }, at);
    tl.set(evt, { autoAlpha: 1 }, at);
    tl.fromTo(evt, { x: 0 }, { x: () => lane.clientWidth - evt.offsetWidth, duration: 1.05, ease: "power1.inOut" }, at);
    tl.to(evt, { autoAlpha: 0, duration: 0.12 }, at + 0.95);
    tl.call(
      () => {
        sink.classList.add("is-hit");
        if (i % 2) light(["Kafka", "Hexagonal and event-driven design", "Python"]);
      },
      undefined,
      at + 1,
    );
    tl.call(() => sink.classList.remove("is-hit"), undefined, at + 1.4);
    if (i < 2) tl.fromTo(i ? l5 : l4, { autoAlpha: 0, y: 6 }, rise, at + 1);
  });
  tl.call(light, [[]], "+=0.5");
  tl.to({}, { duration: HOLD });
  return tl;
};

const testing: Builder = (gsap, root, light) => {
  const tl = gsap.timeline();
  const [ci, bar, count] = ["ci", "bar", "count"].map((x) => one(root, x));
  const steps = all(root, "step");
  const state = (el: HTMLElement, s: string) => tl.call(() => void (el.dataset.state = s));

  tl.to(bar, { scaleX: 0, duration: 0.45, ease: "power2.in" });
  tl.to(count, { autoAlpha: 0, duration: 0.3 }, "<");
  tl.call(() => {
    ci.dataset.state = "queued";
    for (const s of steps) s.dataset.state = "wait";
    count.textContent = "0";
  });
  tl.set(count, { autoAlpha: 1 });

  tl.call(light, [["GitHub Actions", "GitLab CI/CD"]], "+=0.5");
  state(ci, "running");
  tl.to({}, { duration: 0.4 });
  const run = (i: number, tools: string[], to: number, tests: number, from: number, dur: number) => {
    tl.call(light, [tools]);
    state(steps[i], "run");
    tl.to(bar, { scaleX: to, duration: dur, ease: "power1.inOut" });
    countUp(tl, count, from, tests, dur, "<");
    state(steps[i], "done");
  };
  run(0, ["Vitest", "Jest"], 0.48, 112, 0, 1.3);
  run(1, ["Playwright"], 0.9, 148, 112, 1.5);
  run(2, ["GitHub Actions", "Helm (Kubernetes charts)", "Terragrunt", "SOPS"], 1, 148, 148, 0.7);
  state(ci, "passed");
  tl.call(light, [[]]);
  tl.fromTo(ci.querySelector(".bl-status"), { scale: 1 }, { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1 });
  tl.to({}, { duration: HOLD });
  return tl;
};

const data: Builder = (gsap, root, light) => {
  const tl = gsap.timeline();
  const [idx, scan, cache, edge] = ["idx", "scan", "cache", "edge"].map((x) => one(root, x));
  const rows = all(root, "row");
  const pods = all(root, "pod");

  tl.to([...rows, idx, scan, cache, edge], { autoAlpha: 0, duration: 0.45, ease: "power2.in" });
  tl.to(pods, { scale: 0, duration: 0.35, ease: "power2.in" }, "<");
  tl.call(() => rows[1].classList.remove("is-hit"));

  tl.call(light, [["PostgreSQL"]], "+=0.2");
  tl.fromTo(rows, { autoAlpha: 0, y: -12 }, { ...rise, stagger: 0.32 });
  tl.call(light, [["PostgreSQL", "MongoDB"]], "-=0.4");
  tl.fromTo(idx, { autoAlpha: 0, scale: 0.9 }, pop, "+=0.2");
  tl.fromTo(scan, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.6, ease: "power2.inOut" }, "<");
  tl.call(() => rows[1].classList.add("is-hit"));

  tl.call(light, [["Redis"]], "+=0.35");
  tl.fromTo(cache, { autoAlpha: 0, scale: 0.85, y: 0 }, pop);
  tl.call(light, [["Docker", "Kubernetes (EKS, GKE)", "AWS (EKS, MSK, S3)"]], "+=0.35");
  tl.fromTo(pods, { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(2.4)", stagger: 0.16 });
  tl.call(light, [["Cloudflare", "Fly.io"]], "+=0.3");
  tl.fromTo(edge, { autoAlpha: 0, scale: 0.85, y: 0 }, pop);
  tl.call(light, [[]], "+=0.6");
  tl.to({}, { duration: HOLD });
  return tl;
};

const frontend: Builder = (gsap, root, light) => {
  const tl = gsap.timeline();
  const [url, vite, skel, btn, cursor] = ["url", "vite", "skel", "btn", "cursor"].map((x) => one(root, x));
  const parts = all(root, "part");
  const slots = all(root, "slot");
  const app = root.querySelector<HTMLElement>(".bl-app")!;
  const body = root.querySelector<HTMLElement>(".bl-app-body")!;
  /** Cursor offset that puts its tip on the centre of `el` (measured when the move starts). */
  const at = (el: HTMLElement) => {
    const b = body.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - b.left + r.width * 0.55, y: r.top - b.top + r.height * 0.55 };
  };

  tl.to([...parts, url, vite], { autoAlpha: 0, duration: 0.45, ease: "power2.in" });
  tl.call(() => {
    app.classList.add("is-raw");
    for (const s of slots) s.classList.remove("is-picked");
    btn.dataset.state = "idle";
  });
  tl.to(skel, { autoAlpha: 1, duration: 0.3 });

  tl.call(light, [["Vite"]], "+=0.2");
  tl.fromTo(vite, { autoAlpha: 0, scale: 0.85, y: 0 }, pop);
  tl.call(light, [["Next.js"]], "+=0.3");
  tl.fromTo(url, { autoAlpha: 0, y: 4 }, rise);
  tl.call(light, [["React"]], "+=0.35");
  tl.fromTo(parts, { autoAlpha: 0, y: 10 }, { ...rise, stagger: 0.16 });
  tl.to(skel, { autoAlpha: 0, duration: 0.4 }, "<0.2");
  tl.call(light, [["Tailwind CSS"]], "+=0.35");
  tl.call(() => app.classList.remove("is-raw"));

  tl.set(cursor, { autoAlpha: 0, x: () => body.clientWidth * 0.82, y: () => body.clientHeight * 0.95 }, "+=0.5");
  tl.to(cursor, { autoAlpha: 1, duration: 0.2 });
  tl.call(light, [["React", "Next.js"]]);
  tl.to(cursor, { x: () => at(slots[0]).x, y: () => at(slots[0]).y, duration: 0.7, ease: "power2.inOut" }, "<");
  tl.to(cursor, { scale: 0.85, duration: 0.1, yoyo: true, repeat: 1 });
  tl.call(() => slots[0].classList.add("is-picked"));
  tl.to(cursor, { x: () => at(btn).x, y: () => at(btn).y, duration: 0.6, ease: "power2.inOut" }, "+=0.25");
  tl.to(cursor, { scale: 0.85, duration: 0.1, yoyo: true, repeat: 1 });
  tl.to(btn, { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1 }, "<");
  tl.call(() => void (btn.dataset.state = "done"));
  tl.to(cursor, { autoAlpha: 0, duration: 0.3 }, "+=0.5");
  tl.call(light, [[]]);
  tl.to({}, { duration: HOLD });
  return tl;
};

const integrations: Builder = (gsap, root, light) => {
  const tl = gsap.timeline();
  const [order, liq, num, paid, dot, bubble, liff] = ["order", "liq", "num", "paid", "dot", "bubble", "liff"].map((x) =>
    one(root, x),
  );
  const wire = dot.parentElement!;

  tl.to([order, bubble, liff, dot], { autoAlpha: 0, duration: 0.45, ease: "power2.in" });
  tl.set([num, paid], { autoAlpha: 0 });
  tl.set(liq, { autoAlpha: 1, y: 0 });

  tl.call(light, [["Shopify Admin and Storefront APIs"]], "+=0.2");
  tl.fromTo(order, { autoAlpha: 0, y: 10 }, rise);
  tl.call(light, [["Liquid"]], "+=0.35");
  tl.to(liq, { autoAlpha: 0, y: -6, duration: 0.3, ease: "power2.in" }, "+=0.7");
  tl.fromTo(num, { autoAlpha: 0, y: 6 }, { ...rise, duration: 0.35 });
  tl.call(light, [["Shopify Admin and Storefront APIs"]], "+=0.25");
  tl.fromTo(paid, { autoAlpha: 0, scale: 0.85, y: 0 }, pop);

  tl.call(light, [["LINE Messaging API"]], "+=0.3");
  tl.fromTo(
    dot,
    { autoAlpha: 1, x: 0 },
    { x: () => wire.clientWidth - dot.offsetWidth, duration: 0.9, ease: "power2.inOut" },
  );
  tl.to(dot, { autoAlpha: 0, duration: 0.15 });
  tl.fromTo(bubble, { autoAlpha: 0, y: 8, scale: 0.96 }, pop, "<");
  tl.call(light, [["LIFF"]], "+=0.45");
  tl.fromTo(liff, { autoAlpha: 0, y: 6 }, rise);
  tl.to(liff, { scale: 0.95, duration: 0.12, yoyo: true, repeat: 1 }, "+=0.35");
  tl.call(light, [[]], "+=0.5");
  tl.to({}, { duration: HOLD });
  return tl;
};

export const BUILDERS: Record<GroupId, Builder> = {
  ai,
  backend,
  testing,
  "data-cloud": data,
  frontend,
  integrations,
};
