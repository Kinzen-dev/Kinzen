// Interaction frame times: scroll the whole home page at a steady speed, play each Play scene with
// synthetic pointer and key input, and switch every Tools and Numbers view. Frame times come from a
// native-rAF recorder (main-thread frame cadence), alongside main-thread ms/s, page rAF, canvases
// drawing and long tasks for the same window. A scene's mount (click to first canvas) is timed apart.
//   node scripts/perf/interaction.mjs [url] [--engine chromium|webkit] [--class phone|desktop] [--cpu 4]
import { pathToFileURL } from "node:url";
import { between, cpuMetrics, cpuRate, load, reading, sleep, startFrames, step, stopFrames } from "./probe.mjs";

/** Frames, CPU and probe deltas around `fn`. */
async function measured(page, cdp, fn) {
  const a = await reading(page);
  const ca = await cpuMetrics(cdp);
  await startFrames(page);
  const extra = await fn();
  const frames = await stopFrames(page);
  const z = await reading(page);
  const cz = await cpuMetrics(cdp);
  return { ...extra, frames, cpu: cpuRate(ca, cz, (z.t - a.t) / 1000), ...between(a, z) };
}

const center = (page, selector) =>
  page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center", behavior: "instant" }), selector);

/** Top to bottom at `speed` px/s (faster on very long pages, capped at `capMs`), driven by wall time. */
export async function scrollPage(page, cdp, { speed = 1500, capMs = 45_000 } = {}) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await sleep(1500);
  return measured(page, cdp, () =>
    page.evaluate(
      ({ speed, capMs }) =>
        new Promise((resolve) => {
          const L = window.__kzLab;
          const t0 = performance.now();
          const max0 = document.documentElement.scrollHeight - innerHeight;
          const v = Math.max(speed, max0 / ((capMs - 5000) / 1000));
          let last = t0;
          let y = 0;
          let best = 0;
          let progressAt = t0;
          const tick = () => {
            const now = performance.now();
            const max = document.documentElement.scrollHeight - innerHeight;
            y = Math.min(max, y + (v * (now - last)) / 1000);
            last = now;
            window.scrollTo({ top: y, behavior: "instant" });
            if (scrollY > best + 1) {
              best = scrollY;
              progressAt = now;
            }
            if (scrollY >= max - 2 || now - t0 > capMs || now - progressAt > 3000) {
              resolve({ ms: Math.round(now - t0), pxPerSec: Math.round(v), reached: Math.round(scrollY), height: max });
              return;
            }
            L.nativeRaf(tick);
          };
          L.nativeRaf(tick);
        }),
      { speed, capMs },
    ),
  );
}

/** Points inside the middle of a box that do not land on a link, button or tab. */
function safePoints(page, selector, n) {
  return page.evaluate(
    ({ selector, n }) => {
      const el = document.querySelector(selector);
      if (!el) return [];
      const r = el.getBoundingClientRect();
      const out = [];
      for (let k = 0; k < n * 6 && out.length < n; k++) {
        const x = r.left + r.width * (0.2 + Math.random() * 0.6);
        const y = r.top + r.height * (0.25 + Math.random() * 0.5);
        if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) continue;
        const hit = document.elementFromPoint(x, y);
        if (!hit || !el.contains(hit) || hit.closest("a, button, [role=tab], input, select, textarea, label")) continue;
        out.push({ x: Math.round(x), y: Math.round(y) });
      }
      return out;
    },
    { selector, n },
  );
}

/** Drags, presses and keys for `ms` inside the active scene, staying off its controls. */
async function playInput(page, ms) {
  const keys = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL"];
  const startUrl = page.url();
  const end = Date.now() + ms;
  let actions = 0;
  while (Date.now() < end) {
    const pts = await safePoints(page, "#play .iv-pane", 3);
    if (pts.length < 2) {
      await sleep(200);
      continue;
    }
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    await page.mouse.move(pts[1].x, pts[1].y, { steps: 12 });
    await page.mouse.up();
    if (pts[2]) await page.mouse.click(pts[2].x, pts[2].y);
    await page.keyboard.press(keys[actions % keys.length]);
    actions++;
    if (page.url() !== startUrl) throw new Error(`input navigated to ${page.url()}`);
  }
  return actions;
}

/** Each Play scene: mount time (tab click to a canvas or still on stage), then `playMs` of input. */
export async function playScenes(page, cdp, { playMs = 4000, only } = {}) {
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll("#play [role=tab][data-scene-id]")].map((t) => t.getAttribute("data-scene-id")),
  );
  const rows = [];
  for (const id of ids.filter((x) => !only || only.includes(x))) {
    try {
      const row = await step(`play ${id}`, playMs + 75_000, async () => {
        await center(page, "#play .iv");
        await page.mouse.move(2, 2);
        await sleep(800);
        const a = await reading(page);
        const t0 = Date.now();
        await page.evaluate((id) => document.querySelector(`#play [role=tab][data-scene-id="${id}"]`)?.click(), id);
        await page.waitForFunction(
          (id) => {
            const pane = document.querySelector("#play .iv-pane");
            return pane?.getAttribute("data-scene-id") === id && !!pane.querySelector("canvas, .iv-picture img");
          },
          id,
          { timeout: 45_000, polling: 50 },
        );
        const mountMs = Date.now() - t0;
        const mount = between(a, await reading(page));
        await sleep(600);
        const m = await measured(page, cdp, async () => ({ actions: await playInput(page, playMs) }));
        return { step: `play ${id}`, mountMs, mountLongTasks: mount.longTasks, mountLongMs: mount.longMs, ...m };
      });
      rows.push(row);
    } catch (e) {
      rows.push({ step: `play ${id}`, error: String(e.message ?? e) });
    }
  }
  return rows;
}

/** Each view of a tabbed section: click it and watch `viewMs` (the switch plus the view running). */
export async function switchViews(page, cdp, { root, name, viewMs = 3000 }) {
  const views = await page.evaluate(
    (root) => [...document.querySelectorAll(`${root} [role=tab][data-view]`)].map((t) => t.getAttribute("data-view")),
    root,
  );
  const rows = [];
  for (const view of views) {
    try {
      const row = await step(`${name} ${view}`, viewMs + 30_000, async () => {
        await center(page, `${root} [role=tabpanel]`);
        await sleep(500);
        return {
          step: `${name} ${view}`,
          ...(await measured(page, cdp, async () => {
            await page.evaluate(
              ({ root, view }) => document.querySelector(`${root} [role=tab][data-view="${view}"]`)?.click(),
              { root, view },
            );
            await sleep(viewMs);
            return {};
          })),
        };
      });
      rows.push(row);
    } catch (e) {
      rows.push({ step: `${name} ${view}`, error: String(e.message ?? e) });
    }
  }
  return rows;
}

/** The whole interaction pass on a fresh load of the home page. */
export async function interactions(page, cdp, { url, playMs = 4000, viewMs = 3000 } = {}) {
  const rows = [];
  await step("load home", 75_000, () => load(page, url));
  try {
    rows.push({ step: "scroll home", ...(await step("scroll home", 90_000, () => scrollPage(page, cdp))) });
  } catch (e) {
    rows.push({ step: "scroll home", error: String(e.message ?? e) });
  }
  rows.push(...(await playScenes(page, cdp, { playMs })));
  rows.push(...(await switchViews(page, cdp, { root: "#skills", name: "tools", viewMs })));
  rows.push(...(await switchViews(page, cdp, { root: "[data-numbers]", name: "numbers", viewMs })));
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { launch, openPage } = await import("./probe.mjs");
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : dflt;
  };
  const url = process.argv[2]?.startsWith("http") ? process.argv[2] : "https://www.kinzen.dev/";
  const engine = arg("engine", "chromium");
  const browser = await launch(engine);
  try {
    const { page, cdp } = await openPage(browser, engine, arg("class", "phone"), Number(arg("cpu", 4)));
    console.log(JSON.stringify(await interactions(page, cdp, { url }), null, 2));
  } finally {
    await browser.close();
  }
}
