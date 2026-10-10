# Performance on every device

kinzen.dev must feel smooth and stay cool on every device a visitor might use: an older Android phone,
an iPhone on a 120 Hz screen, a tablet, a small laptop, a 4K desktop. This file is the contract for any
change that adds or touches motion, canvas, WebGL, audio, scroll effects or anything that runs while the
visitor is reading. It was set after the 2026-10-10 perf round (PR #12), when the home page kept the
main thread busy 600-1000 ms of every second on a phone and phones got warm.

## The rules

1. **Nothing works off screen.** A section that is not visible does no work: no CSS loop, no rAF, no
   GSAP timeline, no canvas draw, no audio graph tick. A hidden tab does nothing either.
2. **Nothing redraws a picture that did not change.** A settled scene stops drawing until input or a
   timeline event wakes it.
3. **Idle is cheap.** After 45 s without input, decorative CSS loops finish their pass and rest, and
   heavy scenes drop to half rate. Any input restores full mode at once. The look at rest is unchanged.
4. **Heavy scenes are paced.** Canvas and WebGL scenes run at a steady 60 fps on phones and tablets
   (and on small machines, 4 cores or fewer), up to 120 on desktops. Scrolling, taps and DOM UI stay at
   the display rate. A slow ambient drift rests at 60, never lower.
5. **Compositor-only motion.** Loops animate `transform`, `translate`, `rotate`, `scale` and `opacity`
   only. Never `background-position`, gradients, `box-shadow`, sizes or layout properties in a loop.
   One-off transitions may use other properties when the cost is measured and small.
6. **Bounded pixels.** Canvas device pixel ratio is capped per device class; adaptive resolution
   protects the frame rate before anything else is cut.
7. **Bounded bytes.** `pnpm check:js-budget` holds per route group. Heavy engines (three.js, cannon-es,
   audio) load on demand, never in the first paint.
8. **Reduced motion is a complete experience.** With `prefers-reduced-motion: reduce`, every scene shows
   its finished still frame and nothing loops.

## How to comply (use the existing machinery, never a parallel one)

| You are adding | Use | Not |
|---|---|---|
| An infinite CSS loop | `animation-play-state: var(--loop-play, running)` on it; the motion governor (`src/motion/governor.ts`, mounted once by `<MotionGovernor />`) pauses it off screen, on a hidden tab, and lets it finish its pass when idle | A loop without the variable (`src/motion/loops-guard.test.ts` fails the build) |
| A canvas, WebGL or rAF scene | `frameLoop({ name, host, heavy: true, ... })` from `src/motion/frame-governor.ts`; return `false` when settled, `DRIFT` for a slow ambient drift; opt into `adaptive` for resolution | A raw `requestAnimationFrame` loop (one-shot rAFs for layout reads are fine) |
| A looping GSAP timeline | Build it paused and advance it from a `frameLoop` (see `src/components/sections/tools/bento-loops/index.tsx`), or pause it with the in-view and idle signals | A timeline left on GSAP's global ticker for the whole visit |
| An in-view or idle check in React | `useInView`, `observeInView`, `useIdle`, `isIdle`, `onIdleChange` from `src/motion/governor.ts` | A new IntersectionObserver per component or a second idle timer |
| ScrollTrigger | `loadMotion()` from `src/motion/gsap.ts` (registered without its keep-alive rAF) | Registering ScrollTrigger yourself |

## Verify before merge

Any change that touches motion, canvas, WebGL, audio or a home section:

1. `pnpm check` (lint, typecheck, unit incl. the loop guard, build, output guard, JS budget).
2. The perf specs: `e2e/perf-css.spec.ts`, `e2e/perf-gpu.spec.ts`, `e2e/perf-hud.spec.ts`, plus the
   touched area's specs. Add a perf assertion for a new scene (pacing, off-screen, settled, light mode).
3. **A/B against production** on the same machine at the same moment:
   `pnpm perf:lab https://www.kinzen.dev/ http://localhost:<port>/ --only idle,interaction`.
   Device matrix: Chromium phone 390x844 DPR 3 touch at 1x and 4x CPU, WebKit phone, desktop 1440x900.
   Budgets (phone, 4x CPU, visitor idle): a section with nothing animated on screen under 50 ms/s of
   main-thread work and about 1 page frame per second; heavy scenes at their pace (60 on a phone);
   scroll and scene p95 frame time no worse than production. Record host load; read numbers as relative.
4. **Look at it**: filmstrips at 1440 and 390, light and dark, before and after. Same look at rest.
5. **Field** when the change is heavy: open `https://www.kinzen.dev/?perf=1` on a real phone (HUD:
   fps, frame time, governor mode, loops) and check that it stays cool after a few minutes.

GitHub CI runners have 2 cores: timing tests must be CI-aware, and desktop pacing tests stub
`navigator.hardwareConcurrency` (a 2-core machine rightly gets the small-machine pace).
