// What keeps the page busy while idle: running animations (CSS, transitions, WAAPI) grouped by name
// and target, flagged when on screen or animating non-composited properties, plus attribute writes
// per second (inline style, class, data-*) from script.
//   node scripts/perf/culprits.mjs [url] [section-id] [--engine chromium|webkit] [--class phone|desktop]
import { pathToFileURL } from "node:url";
import { attributeWrites, reading } from "./probe.mjs";

/** Running animations grouped, then (when `writesMs` > 0) attribute writes over that window. */
export async function culprits(page, writesMs = 0) {
  const { anims } = await reading(page);
  const groups = new Map();
  for (const a of anims) {
    const key = `${a.name} @ ${a.target}`;
    const g = groups.get(key) ?? {
      what: key,
      count: 0,
      on: 0,
      props: a.props.join(" "),
      nonComposited: a.nonComposited,
    };
    g.count++;
    if (a.onScreen) g.on++;
    groups.set(key, g);
  }
  return {
    animations: [...groups.values()].sort((x, y) => y.count - x.count),
    writes: writesMs > 0 ? await attributeWrites(page, writesMs) : [],
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { launch, load, openPage, sleep } = await import("./probe.mjs");
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : dflt;
  };
  const pos = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));
  const url = pos.find((a) => a.startsWith("http")) ?? "https://www.kinzen.dev/";
  const where = pos.find((a) => !a.startsWith("http")) ?? "contact";
  const engine = arg("engine", "chromium");
  const browser = await launch(engine);
  try {
    const { page } = await openPage(browser, engine, arg("class", "phone"), Number(arg("cpu", 1)));
    await load(page, url, 3000);
    await page.evaluate(
      (w) => document.getElementById(w)?.scrollIntoView({ block: "start", behavior: "instant" }),
      where,
    );
    await sleep(2500);
    console.log(`at #${where}`);
    console.log(JSON.stringify(await culprits(page, 3000), null, 2));
  } finally {
    await browser.close();
  }
}
