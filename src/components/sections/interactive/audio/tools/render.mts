/*
 * Offline renders and measurements of every voice (nobody on the build can listen):
 *   pnpm exec tsx src/components/sections/interactive/audio/tools/render.mts [outDir] [scene...]
 * Bundles harness.ts, serves it with public/audio, renders each scene in headless Chromium on an
 * OfflineAudioContext through the production code, writes WAVs and report.json to outDir
 * (default ~/Projects/_qa-harness/kp-v4/v4-sound/<timestamp>/), and prints the measurements.
 * Also decodes every asset in WebKit (Safari's engine) to prove the AAC fallback.
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { chromium, webkit } from "@playwright/test";
import { bandShare, centroid, db, lufs, onset, peak, powerSpectrum, seam } from "./measure";
import { writeWav } from "./wav";

const HERE = new URL(".", import.meta.url).pathname;
const ROOT = resolve(HERE, "../../../../../..");
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const OUT = process.argv[2] && !process.argv[2].includes("=") && process.argv[2].includes("/")
  ? process.argv[2]
  : join(homedir(), "Projects/_qa-harness/kp-v4/v4-sound", stamp);
const only = process.argv.slice(2).filter((a) => !a.includes("/"));
mkdirSync(OUT, { recursive: true });

// esbuild comes with tsx.
const req = createRequire(import.meta.url);
const esbuild: { build(o: object): Promise<{ outputFiles: { text: string }[] }> } = req(
  req.resolve("esbuild", { paths: [dirname(req.resolve("tsx"))] }),
);
const bundle = await esbuild.build({
  entryPoints: [join(HERE, "harness.ts")],
  bundle: true,
  format: "iife",
  write: false,
  target: "es2020",
});
const js = bundle.outputFiles[0].text;
const html = `<!doctype html><meta charset="utf-8"><title>kz audio harness</title><script>${js}</script>`;

const server = createServer((rq, rs) => {
  const url = decodeURIComponent((rq.url ?? "/").split("?")[0]);
  if (url === "/") {
    rs.writeHead(200, { "content-type": "text/html" });
    return rs.end(html);
  }
  const file = join(ROOT, "public", url);
  if (!file.startsWith(join(ROOT, "public")) || !existsSync(file)) {
    rs.writeHead(404);
    return rs.end();
  }
  const types: Record<string, string> = { ".webm": "audio/webm", ".m4a": "audio/mp4" };
  rs.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(rs);
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as { port: number }).port;
const origin = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.goto(origin + "/");
const names: string[] = await page.evaluate(() => (window as unknown as { kz: { scenes: string[] } }).kz.scenes);

const fromB64 = (b: string) => {
  const buf = Buffer.from(b, "base64");
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
};
const mono = (chs: Float32Array[]) => chs[0].map((v, i) => (v + chs[1][i]) / 2);
const win = (x: Float32Array, sr: number, a: number, b: number) => x.subarray(Math.round(a * sr), Math.round(b * sr));
const r2 = (x: number) => Math.round(x * 100) / 100;

const report: Record<string, unknown> = {};
for (const name of names) {
  if (only.length && !only.includes(name)) continue;
  const res = await page.evaluate(
    ([n, base]) => (window as unknown as { kz: { render: (n: string, b: string) => Promise<unknown> } }).kz.render(n, base),
    [name, `${origin}/audio/`],
  );
  const { sr, ms, channels } = res as { sr: number; ms: number; channels: string[] };
  const chs = channels.map(fromB64);
  writeWav(join(OUT, `${name}.wav`), chs, sr);
  const m = mono(chs);
  const row: Record<string, unknown> = {
    seconds: r2(chs[0].length / sr),
    renderMs: Math.round(ms),
    peakDbfs: r2(db(peak(chs))),
    lufs: r2(lufs(chs, sr)),
  };
  if (name.startsWith("thock-single") || name === "thock-space") {
    const first = onset(m, Math.pow(10, -60 / 20));
    const hit = win(m, sr, 0.5, name === "thock-space" ? 0.75 : 0.6);
    Object.assign(row, {
      pressToFirstSampleMs: r2(((first - 0.5 * sr) / sr) * 1000),
      pressToPeakMs: r2(((hit.reduce((b, v, i) => (Math.abs(v) > Math.abs(hit[b]) ? i : b), 0)) / sr) * 1000),
      centroidHz: Math.round(centroid(hit, sr, 2048)),
      share100to400: r2(bandShare(hit, sr, 100, 400, 2048)),
      shareAbove2k: r2(bandShare(hit, sr, 2000, 24000, 2048)),
      shareAbove5k: Number(bandShare(hit, sr, 5000, 24000, 2048).toFixed(4)),
      decayTo40dBms: (() => {
        const p = peak([hit]);
        let last = 0;
        for (let i = 0; i < hit.length; i++) if (Math.abs(hit[i]) > p / 100) last = i;
        return r2((last / sr) * 1000);
      })(),
    });
  }
  if (name === "thock-release") {
    const up = win(m, sr, 0.5, 0.65);
    Object.assign(row, { releasePeakDbfs: r2(db(peak([up]))), releaseCentroidHz: Math.round(centroid(up, sr, 2048)) });
  }
  if (name === "thock-repeat-a") {
    // Twenty presses of the same key: how different is each from the one before?
    const peaks: number[] = [];
    const cents: number[] = [];
    const specs: Float64Array[] = [];
    for (let i = 0; i < 20; i++) {
      const w = win(m, sr, 0.2 + i * 0.22, 0.2 + i * 0.22 + 0.07);
      peaks.push(db(peak([w])));
      cents.push(centroid(w, sr, 1024));
      specs.push(powerSpectrum(w, 1024));
    }
    const sd = (a: number[]) => {
      const mu = a.reduce((x, y) => x + y, 0) / a.length;
      return Math.sqrt(a.reduce((x, y) => x + (y - mu) ** 2, 0) / a.length);
    };
    const dist: number[] = [];
    for (let i = 1; i < 20; i++) {
      let d = 0;
      let n = 0;
      for (let k = 2; k < 120; k++) {
        d += (10 * Math.log10(specs[i][k] + 1e-20) - 10 * Math.log10(specs[i - 1][k] + 1e-20)) ** 2;
        n++;
      }
      dist.push(Math.sqrt(d / n));
    }
    Object.assign(row, {
      peakSpreadDb: r2(sd(peaks)),
      centroidSpreadHz: r2(sd(cents)),
      minSpectralDistanceDb: r2(Math.min(...dist)),
      meanSpectralDistanceDb: r2(dist.reduce((a, b) => a + b, 0) / dist.length),
    });
  }
  if (name === "thock-typing") Object.assign(row, { centroidHz: Math.round(centroid(m, sr)) });
  if (name.startsWith("rain") || name === "music" || name === "night-desk") {
    const steady = chs.map((c) => c.subarray(Math.round(3 * sr)));
    Object.assign(row, { lufsAfterFadeIn: r2(lufs(steady, sr)), centroidHz: Math.round(centroid(win(m, sr, 3, m.length / sr), sr)) });
  }
  if (name === "music") {
    // The loop wraps at 0 + body: level and sample continuity there vs everywhere else.
    const body = 26.666667;
    const around = win(m, sr, body - 4, body + 4);
    Object.assign(row, { wrapAt: body, wrapWindowSeam: seam(around, sr) });
    // Seam check without the downbeat bias: compare the 2 s straddling the wrap to the same
    // 2 s of the score one loop later (sample-exact repetition = no seam).
    const a = win(m, sr, body - 1, body + 1);
    const b = win(m, sr, 2 * body - 1, 2 * body + 1);
    let d = 0;
    let ref = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      d += (a[i] - b[i]) ** 2;
      ref += a[i] ** 2;
    }
    Object.assign(row, { wrapVsNextLoopResidualDb: d === 0 ? "sample-identical" : r2(10 * Math.log10(d / ref)) });
  }
  if (name === "night-desk") {
    const music = win(m, sr, 3, 21);
    const withKeys = win(m, sr, 22, 30);
    Object.assign(row, { peakBeforeKeysDbfs: r2(db(peak([music]))), peakWithKeysDbfs: r2(db(peak([withKeys]))) });
  }
  if (name.startsWith("sfx-clinks")) {
    Object.assign(
      row,
      Object.fromEntries(
        [0.15, 0.4, 0.7, 1].map((v, i) => {
          const w = win(m, sr, 0.3 + i * 0.9, 0.3 + i * 0.9 + 0.5);
          return [`speed${v}`, { peakDbfs: r2(db(peak([w]))), centroidHz: Math.round(centroid(w, sr, 2048)) }];
        }),
      ),
    );
  }
  if (name === "sfx-splash" || name === "sfx-drop")
    Object.assign(row, {
      small: { peakDbfs: r2(db(peak([win(m, sr, 0.3, 1.9)]))), centroidHz: Math.round(centroid(win(m, sr, 0.3, 1.9), sr)) },
      big: { peakDbfs: r2(db(peak([win(m, sr, 2, 3.9)]))), centroidHz: Math.round(centroid(win(m, sr, 2, 3.9), sr)) },
    });
  if (name === "sfx-knocks")
    Object.assign(
      row,
      Object.fromEntries(
        ["mug", "pen", "ball", "desk", "floor", "wall", "phone", "lamp", "thud"].map((k, i) => {
          const a = i < 8 ? 0.2 + i * 0.6 : 5;
          const w = win(m, sr, a, a + 0.55);
          return [k, { peakDbfs: r2(db(peak([w]))), centroidHz: Math.round(centroid(w, sr, 2048)) }];
        }),
      ),
    );
  report[name] = row;
  console.log(name, JSON.stringify(row));
}
await browser.close();

// Safari's engine: which format decodes, and do both decode at all?
const wk = await webkit.launch();
const wpage = await wk.newPage();
await wpage.goto(origin + "/");
const safari = await wpage.evaluate(async (base) => {
  const ctx = new OfflineAudioContext(1, 1, 48000);
  const out: Record<string, string> = {
    canPlayWebmOpus: document.createElement("audio").canPlayType('audio/webm; codecs="opus"') || "no",
  };
  for (const n of ["rain-wash", "rain-glass", "thunder", "cozy-loop", "sfx"])
    for (const ext of ["webm", "m4a"]) {
      try {
        const b = await (await fetch(`${base}${n}.${ext}`)).arrayBuffer();
        const d = await ctx.decodeAudioData(b);
        out[`${n}.${ext}`] = `ok ${d.duration.toFixed(3)} s`;
      } catch (e) {
        out[`${n}.${ext}`] = `fail ${(e as Error).name}`;
      }
    }
  return out;
}, `${origin}/audio/`);
await wk.close();
report.webkitDecode = safari;
console.log("webkit", JSON.stringify(safari));
server.close();
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log("out:", OUT);
