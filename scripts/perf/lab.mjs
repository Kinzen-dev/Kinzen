// Perf lab: idle cost per home section and per page, culprits, and interaction frame times, across
// engines (Chromium on the real GPU, WebKit), classes (phone 390x844 DPR 3 touch, desktop 1440x900)
// and CPU throttles (Chromium). Writes report.json and report.md; prints the markdown.
//
//   pnpm perf:lab [url]                      default https://www.kinzen.dev/
//   pnpm perf:lab <urlA> <urlB>              A/B: each configuration runs on A and B back to back
//                                            (order alternates per configuration), so both sides
//                                            see the same host load; rows are labelled A and B
//     --engines chromium,webkit  --classes phone,desktop  --cpu 1,4 (Chromium; WebKit runs at 1x)
//     --only idle,pages,interaction[,long] (long = 50 s idle per hero and Play, light mode then input; opt-in)  --sections hero,contact  --window 5000  --play 4000  --views 3000
//     --writes 2000 (attribute-write sampling per section; 0 = off; default on at 1x only)
//     --out <dir> (default test-results/perf/<timestamp>)
//
// Every step has a deadline and every phase runs in a fresh context, so one hung scene or detached
// node costs that row, never the run.
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus as hostCpus, loadavg } from "node:os";
import { join, resolve } from "node:path";
import { idleLong, idlePages, idleSections } from "./idle-cost.mjs";
import { interactions } from "./interaction.mjs";
import { CLASSES, launch, openPage, step } from "./probe.mjs";

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const list = (name, dflt) => flag(name, dflt).split(",").filter(Boolean);
const given = argv.filter((a, i) => /^https?:\/\//.test(a) && !argv[i - 1]?.startsWith("--")).slice(0, 2);
const targets = (given.length ? given : ["https://www.kinzen.dev/"]).map((url, i, all) => ({
  url,
  side: all.length > 1 ? "AB"[i] : "",
}));
const engines = list("engines", "chromium,webkit");
const classes = list("classes", "phone,desktop").filter((c) => c in CLASSES);
const cpus = list("cpu", "1,4").map(Number);
const only = list("only", "idle,pages,interaction");
const sections = flag("sections", "") ? list("sections", "") : undefined;
const windowMs = Number(flag("window", 5000));
const playMs = Number(flag("play", 4000));
const viewMs = Number(flag("views", 3000));
const writesFlag = flag("writes", null);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = resolve(flag("out", join("test-results", "perf", stamp)));
mkdirSync(out, { recursive: true });

process.on("unhandledRejection", (e) => console.error("[perf-lab] unhandled:", e?.message ?? e));

const configs = [];
for (const engine of engines)
  for (const cls of classes) for (const cpu of engine === "chromium" ? cpus : [1]) configs.push({ engine, cls, cpu });

/** One phase in its own context; the context is closed whatever happens. */
async function phase(browser, cfg, name, budgetMs, fn) {
  const t0 = Date.now();
  let ctx;
  try {
    const opened = await step(`${name}: open`, 30_000, () => openPage(browser, cfg.engine, cfg.cls, cfg.cpu));
    ctx = opened.ctx;
    const rows = await step(name, budgetMs, () => fn(opened.page, opened.cdp));
    return { rows, ms: Date.now() - t0 };
  } catch (e) {
    return { rows: [], error: String(e.message ?? e), ms: Date.now() - t0 };
  } finally {
    if (ctx) await step(`${name}: close`, 15_000, () => ctx.close()).catch(() => {});
  }
}

// Host load matters: CPU throttling multiplies whatever else the machine is doing.
const load = () => loadavg().map((x) => +x.toFixed(1));
const report = {
  urls: targets.map((t) => (t.side ? `${t.side} ${t.url}` : t.url)),
  startedAt: new Date().toISOString(),
  host: { cores: hostCpus().length },
  configs: [],
};
const save = () => writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));

for (const [n, cfg] of configs.entries()) {
  // A/B: alternate which side goes first, so neither always meets the warmer (or busier) machine.
  for (const { url, side } of n % 2 ? [...targets].reverse() : targets) {
    const label = `${side ? side + " " : ""}${cfg.engine} ${cfg.cls} cpu ${cfg.cpu}x`;
    console.error(`[perf-lab] ${label}`);
    const writes = Number(writesFlag ?? (cfg.cpu === 1 ? 2000 : 0));
    const entry = { label, side, url, ...cfg, loadBefore: load() };
    let browser;
    try {
      browser = await step("launch", 60_000, () => launch(cfg.engine));
      if (only.includes("idle")) {
        entry.idle = await phase(browser, cfg, "idle sections", 15 * 60_000, (page, cdp) =>
          idleSections(page, cdp, { url, windowMs, culpritMs: writes, only: sections }),
        );
        console.error(`[perf-lab]   idle sections ${entry.idle.rows.length} rows ${entry.idle.error ?? ""}`);
      }
      if (only.includes("pages")) {
        entry.pages = await phase(browser, cfg, "idle pages", 15 * 60_000, (page, cdp) =>
          idlePages(page, cdp, { url, windowMs }),
        );
        console.error(`[perf-lab]   idle pages ${entry.pages.rows.length} rows ${entry.pages.error ?? ""}`);
      }
      if (only.includes("long")) {
        entry.long = await phase(browser, cfg, "long idle", 10 * 60_000, (page, cdp) =>
          idleLong(page, cdp, { url, windowMs }),
        );
        console.error(`[perf-lab]   long idle ${entry.long.rows.length} rows ${entry.long.error ?? ""}`);
      }
      if (only.includes("interaction")) {
        entry.interaction = await phase(browser, cfg, "interaction", 15 * 60_000, (page, cdp) =>
          interactions(page, cdp, { url, playMs, viewMs }),
        );
        console.error(
          `[perf-lab]   interaction ${entry.interaction.rows.length} rows ${entry.interaction.error ?? ""}`,
        );
      }
    } catch (e) {
      entry.error = String(e.message ?? e);
    } finally {
      if (browser) await step("browser close", 20_000, () => browser.close()).catch(() => {});
    }
    entry.loadAfter = load();
    report.configs.push(entry);
    save();
  }
}
report.finishedAt = new Date().toISOString();
save();

// ---- markdown ----
const na = (v) => (v === null || v === undefined ? "n/a" : String(v));
const table = (head, rows) =>
  [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join(
    "\n",
  );
const cpuCells = (c) => (c ? [c.task, c.script, c.style, c.layout] : ["n/a", "n/a", "n/a", "n/a"]);
const longCell = (r) => (r.longTasks === null || r.longTasks === undefined ? "n/a" : `${r.longTasks} (${r.longMs} ms)`);
const anim = (r) => `${r.animsOn}/${r.animsOff} (${r.animsNonComposited})`;
const errRow = (name, r, width) => [name, `ERROR: ${r.error}`, ...Array(width - 2).fill("")];

const md = [`# Perf lab report`, "", `${report.urls.join(", ")}; ${report.startedAt} to ${report.finishedAt}.`, ""];
md.push(
  `Host load average is recorded per run (1-minute value in the summary, ${report.host.cores} cores). CPU throttling multiplies ` +
    "whatever else the host is doing: read absolute numbers as relative, and compare A and B from the same report.",
  "",
);
md.push(
  "Columns: main-thread ms per second (task = all main-thread work; script, style recalc, layout are parts of it; Chromium only), " +
    "page rAF frames/s (frames in which page code ran a rAF callback) and rAF callbacks/s, canvases drawing (WebGL draws or 2D paints in the window), " +
    "running animations on/off screen (non-composited, incl. custom properties), live WebGL contexts, long tasks (Chromium only). " +
    "Frame times: native-rAF intervals on the main thread, ms.",
  "",
);

// Summary across configs.
const median = (xs) => {
  const s = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const summary = report.configs.map((c) => {
  const idle = c.idle?.rows.filter((r) => !r.error) ?? [];
  const ix = c.interaction?.rows.filter((r) => !r.error) ?? [];
  const scroll = ix.find((r) => r.step === "scroll home");
  const play = ix.filter((r) => r.step.startsWith("play"));
  return [
    c.label,
    `${c.loadBefore[0]} / ${c.loadAfter[0]}`,
    na(median(idle.map((r) => r.cpu?.task))),
    na(idle.length ? Math.max(...idle.map((r) => r.cpu?.task ?? -1)) : null).replace("-1", "n/a"),
    na(median(idle.map((r) => r.rafFrames))),
    na(idle.length ? Math.max(...idle.map((r) => r.anims)) : null),
    na(idle.length ? Math.max(...idle.map((r) => r.glLive)) : null),
    na(scroll?.frames?.p95),
    na(play.length ? Math.max(...play.map((r) => r.frames?.p95 ?? 0)) : null),
    na(play.length ? Math.max(...play.map((r) => r.mountMs ?? 0)) : null),
  ];
});
md.push(
  "## Summary",
  "",
  table(
    [
      "config",
      "load 1m (before / after)",
      "idle task ms/s (median)",
      "idle task ms/s (worst)",
      "idle rAF fr/s (median)",
      "running anims (max)",
      "live GL (max)",
      "scroll p95 ms",
      "play p95 ms (worst)",
      "scene mount ms (worst)",
    ],
    summary,
  ),
  "",
);

for (const c of report.configs) {
  md.push(
    `## ${c.label}`,
    "",
    ...(c.url ? [`URL ${c.url}`, ""] : []),
    `Host load average (1/5/15 min, ${report.host.cores} cores): ${c.loadBefore.join(" ")} before, ${c.loadAfter.join(" ")} after.`,
    "",
  );
  if (c.error) md.push(`ERROR: ${c.error}`, "");
  if (c.idle) {
    md.push(
      `### Idle per home section (${windowMs / 1000} s windows)${c.idle.error ? ` (phase error: ${c.idle.error})` : ""}`,
      "",
    );
    md.push(
      table(
        [
          "section",
          "task",
          "script",
          "style",
          "layout",
          "rAF fr/s",
          "rAF cb/s",
          "drawing",
          "anims on/off (non-comp)",
          "GL live",
          "long tasks",
        ],
        c.idle.rows.map((r) =>
          r.error
            ? errRow(r.section, r, 11)
            : [
                r.section,
                ...cpuCells(r.cpu),
                r.rafFrames,
                r.rafCalls,
                r.canvasFps || "0",
                anim(r),
                `${r.glLive} ${r.glBuffers}`,
                longCell(r),
              ],
        ),
      ),
      "",
    );
    // Culprits across sections: which animations run where, and which attributes script keeps writing.
    const seen = new Map();
    for (const r of c.idle.rows) {
      for (const a of r.culprits?.animations ?? []) {
        const g = seen.get(a.what) ?? { ...a, sections: 0, onIn: [] };
        g.sections++;
        if (a.on) g.onIn.push(r.section);
        seen.set(a.what, g);
      }
    }
    if (seen.size) {
      md.push("Running animations (sections where running / on screen in):", "");
      md.push(
        table(
          ["animation @ target", "count", "running in sections", "on screen in", "properties", "non-composited"],
          [...seen.values()]
            .sort((a, b) => b.sections - a.sections)
            .map((g) => [
              g.what,
              g.count,
              g.sections,
              g.onIn.join(" ") || "-",
              g.props,
              g.nonComposited ? "yes" : "no",
            ]),
        ),
        "",
      );
    }
    const writes = c.idle.rows.flatMap((r) => (r.culprits?.writes ?? []).map((w) => [r.section, w.what, w.perSec]));
    if (writes.length) {
      md.push("Attribute writes per second while idle (top per section):", "");
      md.push(
        table(
          ["section", "attribute @ element", "writes/s"],
          writes.filter((w) => w[2] >= 1),
        ),
        "",
      );
    }
  }
  if (c.pages) {
    md.push(`### Idle per page${c.pages.error ? ` (phase error: ${c.pages.error})` : ""}`, "");
    md.push(
      table(
        [
          "page",
          "at",
          "task",
          "script",
          "style",
          "layout",
          "rAF fr/s",
          "rAF cb/s",
          "drawing",
          "anims on/off (non-comp)",
          "GL live",
          "long tasks",
        ],
        c.pages.rows.map((r) =>
          r.error
            ? errRow(`${r.page} ${r.where}`, r, 12)
            : [
                r.page,
                r.where,
                ...cpuCells(r.cpu),
                r.rafFrames,
                r.rafCalls,
                r.canvasFps || "0",
                anim(r),
                `${r.glLive} ${r.glBuffers}`,
                longCell(r),
              ],
        ),
      ),
      "",
    );
  }
  if (c.long) {
    md.push(
      `### Long idle (light mode after 45 s, full on input)${c.long.error ? ` (phase error: ${c.long.error})` : ""}`,
      "",
    );
    md.push(
      table(
        [
          "section",
          "window",
          "governor",
          "governed loops running",
          "task",
          "rAF fr/s",
          "drawing",
          "anims on/off (non-comp)",
        ],
        c.long.rows.flatMap((r) =>
          r.error
            ? [errRow(r.section, r, 8)]
            : ["fresh", "idle", "input"].map((w) => [
                r.section,
                w,
                na(r[w].governor),
                r[w].governedRunning || "-",
                na(r[w].cpu?.task),
                r[w].rafFrames,
                r[w].canvasFps || "0",
                anim(r[w]),
              ]),
        ),
      ),
      "",
    );
  }
  if (c.interaction) {
    md.push(`### Interaction${c.interaction.error ? ` (phase error: ${c.interaction.error})` : ""}`, "");
    md.push(
      table(
        [
          "step",
          "mount ms",
          "frames",
          "fps",
          "p50",
          "p95",
          "p99",
          "max",
          ">25 ms %",
          ">50 ms",
          "task ms/s",
          "script ms/s",
          "rAF cb/s",
          "drawing",
          "GL live",
          "long tasks",
        ],
        c.interaction.rows.map((r) => {
          if (r.error) return errRow(r.step, r, 16);
          const f = r.frames ?? {};
          const mount =
            r.mountMs === undefined
              ? ""
              : `${r.mountMs}${r.mountLongTasks ? ` (${r.mountLongTasks} long, ${r.mountLongMs} ms)` : ""}`;
          return [
            r.step,
            mount,
            na(f.frames),
            na(f.fps),
            na(f.p50),
            na(f.p95),
            na(f.p99),
            na(f.max),
            na(f.over25),
            na(f.over50),
            na(r.cpu?.task),
            na(r.cpu?.script),
            r.rafCalls,
            r.canvasFps || "0",
            `${r.glLive} ${r.glBuffers}`,
            longCell(r),
          ];
        }),
      ),
      "",
    );
  }
}

writeFileSync(join(out, "report.md"), md.join("\n"));
console.log(md.join("\n"));
console.error(`[perf-lab] wrote ${join(out, "report.json")} and report.md`);
