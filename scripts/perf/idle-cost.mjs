// Idle cost: with the visitor doing nothing, what the page spends per second while each home section
// (or each page, top and bottom) is on screen. Main-thread task/script/style/layout ms per second
// (Chromium CDP), page rAF frames and callbacks per second, canvases drawing, running animations
// split on/off screen, live WebGL contexts and their drawing buffers, long tasks.
//   node scripts/perf/idle-cost.mjs [url] [--engine chromium|webkit] [--class phone|desktop] [--cpu 4]
import { pathToFileURL } from "node:url";
import { between, cpuMetrics, cpuRate, load, reading, sleep, step } from "./probe.mjs";
import { culprits } from "./culprits.mjs";

/** Home sections in page order, each tagged so later steps can find it again without a handle. */
async function tagSections(page) {
  return page.evaluate(() => {
    const seen = new Set();
    const out = [];
    for (const el of document.querySelectorAll("main > section, main section[id], main [data-numbers]")) {
      if (seen.has(el)) continue;
      seen.add(el);
      const label = el.id || (el.hasAttribute("data-numbers") ? "numbers" : String(el.className).split(" ")[0]);
      if (out.some((s) => s.label === label)) continue;
      el.setAttribute("data-perf-section", String(out.length));
      out.push({ i: out.length, label });
    }
    const footer = document.querySelector("body > footer");
    if (footer) {
      footer.setAttribute("data-perf-section", String(out.length));
      out.push({ i: out.length, label: "footer" });
    }
    return out;
  });
}

/** One idle window at the current scroll position. */
async function idleWindow(page, cdp, windowMs) {
  const a = await reading(page);
  const ca = await cpuMetrics(cdp);
  await sleep(windowMs);
  const z = await reading(page);
  const cz = await cpuMetrics(cdp);
  return { cpu: cpuRate(ca, cz, (z.t - a.t) / 1000), ...between(a, z) };
}

/**
 * Idle cost per home section. Each section is scrolled to its start, given `settleMs` to finish its
 * entrance, then watched for `windowMs`. With `culpritMs` > 0, attribute writes are sampled after.
 */
export async function idleSections(page, cdp, { url, settleMs = 2500, windowMs = 5000, culpritMs = 0, only } = {}) {
  await step("load home", 75_000, () => load(page, url));
  const sections = (await step("tag sections", 10_000, () => tagSections(page))).filter(
    (s) => !only || only.includes(s.label),
  );
  const rows = [];
  for (const s of sections) {
    try {
      const row = await step(`idle #${s.label}`, settleMs + windowMs + culpritMs + 30_000, async () => {
        await page.evaluate(
          (i) =>
            document
              .querySelector(`[data-perf-section="${i}"]`)
              ?.scrollIntoView({ block: "start", behavior: "instant" }),
          s.i,
        );
        await sleep(settleMs);
        const w = await idleWindow(page, cdp, windowMs);
        const c = await culprits(page, culpritMs);
        return { section: s.label, ...w, culprits: c };
      });
      rows.push(row);
    } catch (e) {
      rows.push({ section: s.label, error: String(e.message ?? e) });
    }
  }
  return rows;
}

/**
 * Long idle (SPEC-perf decision 2): with a section on screen, a window right after settling, a
 * window after `idleMs` with no input (light mode expected), then one pointer move and a short
 * window (full mode expected at once). The governor's mode is read in each window when published.
 */
export async function idleLong(page, cdp, { url, sections = ["top", "play"], idleMs = 50_000, windowMs = 5000 } = {}) {
  await step("load home", 75_000, () => load(page, url));
  const tagged = await tagSections(page);
  const rows = [];
  for (const label of sections) {
    const s = tagged.find((x) => x.label === label);
    if (!s) continue;
    try {
      const row = await step(`long idle #${label}`, idleMs + 4 * windowMs + 60_000, async () => {
        await page.evaluate(
          (i) =>
            document
              .querySelector(`[data-perf-section="${i}"]`)
              ?.scrollIntoView({ block: "start", behavior: "instant" }),
          s.i,
        );
        await sleep(2500);
        const fresh = await idleWindow(page, cdp, windowMs);
        await sleep(Math.max(0, idleMs - windowMs - 2500));
        const idle = await idleWindow(page, cdp, windowMs);
        const vp = page.viewportSize() ?? { width: 390, height: 844 };
        await page.mouse.move(vp.width / 2, vp.height / 2);
        await page.mouse.move(vp.width / 2 + 20, vp.height / 2 + 10, { steps: 4 });
        const input = await idleWindow(page, cdp, 1000);
        return { section: label, fresh, idle, input };
      });
      rows.push(row);
    } catch (e) {
      rows.push({ section: label, error: String(e.message ?? e) });
    }
  }
  return rows;
}

/** Idle cost per page, at the top and at the bottom. Case pages are found from the work index. */
export async function idlePages(page, cdp, { url, settleMs = 2500, windowMs = 5000 } = {}) {
  const base = new URL(url);
  const paths = ["/", "/work", "/cv"];
  try {
    await step("find a case page", 75_000, () => load(page, new URL("/work", base).href, 1000));
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('main a[href*="/work/"]')].map((a) => new URL(a.href).pathname),
    );
    const casePath = hrefs.find((p) => /\/work\/[^/]+\/?$/.test(p));
    if (casePath) paths.push(casePath);
  } catch {
    // No case page: the other pages still run.
  }
  const rows = [];
  for (const path of paths) {
    for (const where of ["top", "bottom"]) {
      try {
        const row = await step(`idle ${path} ${where}`, 120_000, async () => {
          if (where === "top") await load(page, new URL(path, base).href);
          else {
            await page.evaluate(() =>
              window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
            );
            await sleep(settleMs);
          }
          return { page: path, where, ...(await idleWindow(page, cdp, windowMs)) };
        });
        rows.push(row);
      } catch (e) {
        rows.push({ page: path, where, error: String(e.message ?? e) });
      }
    }
  }
  return rows;
}

// Stand-alone run: one class, printed as JSON.
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
    console.log(JSON.stringify(await idleSections(page, cdp, { url, culpritMs: 2000 }), null, 2));
  } finally {
    await browser.close();
  }
}
