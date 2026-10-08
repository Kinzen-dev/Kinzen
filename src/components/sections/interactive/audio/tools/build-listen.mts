/*
 * Writes the listening bench: one self-contained HTML file (script and every audio file inlined,
 * so it opens from disk with a double click). Lab only, never shipped.
 *   pnpm exec tsx src/components/sections/interactive/audio/tools/build-listen.mts [out.html]
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const HERE = new URL(".", import.meta.url).pathname;
const ROOT = resolve(HERE, "../../../../../..");
const OUT = process.argv[2] ?? join(homedir(), "Projects/_qa-harness/kp-v4/v4-sound/listen/index.html");
mkdirSync(dirname(OUT), { recursive: true });

const req = createRequire(import.meta.url);
const esbuild: { build(o: object): Promise<{ outputFiles: { text: string }[] }> } = req(
  req.resolve("esbuild", { paths: [dirname(req.resolve("tsx"))] }),
);
const js = (
  await esbuild.build({ entryPoints: [join(HERE, "listen.ts")], bundle: true, format: "iife", write: false, target: "es2020" })
).outputFiles[0].text;

const files: Record<string, string> = {};
for (const f of readdirSync(join(ROOT, "public/audio")))
  if (/\.(webm|m4a)$/.test(f)) files[`/audio/${f}`] = readFileSync(join(ROOT, "public/audio", f)).toString("base64");

// The page's fetch serves /audio/* from the inlined files.
const shim = `(() => {
  const files = ${JSON.stringify(files)};
  const real = window.fetch.bind(window);
  window.fetch = (url, init) => {
    const key = String(url).replace(/^.*?(\\/audio\\/)/, "$1");
    const b64 = files[key];
    if (!b64) return real(url, init);
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return Promise.resolve(new Response(u8));
  };
})();`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sound Bench</title>
<style>
  :root { --bg: #f6f1e7; --ink: #1d1a16; --muted: #6b6257; --card: #fffaf0; --line: #e2d8c6; --gold: #b8872b; }
  @media (prefers-color-scheme: dark) { :root { --bg: #14120f; --ink: #f1e9da; --muted: #a39887; --card: #1d1a16; --line: #332d25; --gold: #d9a649; } }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 22px; margin: 0 0 4px; } p { color: var(--muted); margin: 4px 0 12px; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin: 14px 0; }
  h2 { font-size: 16px; margin: 0 0 8px; }
  button { font: inherit; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); cursor: pointer; margin: 4px 6px 4px 0; }
  button:hover { border-color: var(--gold); }
  label { display: flex; gap: 10px; align-items: center; margin: 6px 0; flex-wrap: wrap; }
  input[type=range] { flex: 1; min-width: 160px; accent-color: var(--gold); }
  #pad { border: 2px dashed var(--line); border-radius: 10px; padding: 28px 16px; text-align: center; color: var(--muted); outline: none; }
  #pad:focus { border-color: var(--gold); color: var(--ink); }
  code { font-size: 13px; }
</style></head>
<body><main>
  <h1>Sound bench</h1>
  <p>Every voice of the interactive section, running the shipped code on the real bus. Click anywhere first (browsers start audio only after a gesture).</p>
  <p><button id="mute">Sound: on</button> <code id="lat">context not started</code></p>
  <section><h2>Night desk: rain</h2>
    <button id="rain">Start rain</button>
    <label>Intensity <input id="intensity" type="range" min="0" max="1" step="0.01" value="0.7"><span id="intensity-v">0.70</span></label>
    <button id="thunder-near">Thunder (near)</button><button id="thunder-far">Thunder (far)</button>
    <p>Gusts come by themselves every 9 to 22 seconds.</p>
  </section>
  <section><h2>Night desk: lo-fi loop</h2>
    <button id="music">Start music</button>
    <label>Volume <input id="volume" type="range" min="0" max="1.5" step="0.01" value="1"><span id="volume-v">1.00</span></label>
  </section>
  <section><h2>Thock</h2>
    <div id="pad" tabindex="0">Click here, then type. Hold space for the gold ripple.</div>
    <label><input id="randomvel" type="checkbox" checked> Random velocity (0.45 to 0.95)</label>
    <label>Fixed velocity <input id="velocity" type="range" min="0" max="1" step="0.01" value="0.7"><span id="velocity-v">0.70</span></label>
  </section>
  <section><h2>One-shots</h2>
    <label>Speed / size / weight <input id="speed" type="range" min="0" max="1" step="0.01" value="0.6"><span id="speed-v">0.60</span></label>
    <button id="clink">Gold clink</button><button id="splash">Splash</button><button id="drop">Drop</button>
    <button id="ring">Phone ring</button><button id="ring-stop">Silence phone</button>
    <button id="lamp-on">Lamp on</button><button id="lamp-off">Lamp off</button>
    <p>Knocks (desk props) and the rest:</p>
    ${["mug", "pen", "ball", "desk", "floor", "wall", "phone", "lamp"].map((k) => `<button id="knock-${k}">Knock ${k}</button>`).join("")}
    <button id="thud">Gold thud</button><button id="purr">Purr</button><button id="chime">Chime</button>
  </section>
</main>
<script>${shim}</script>
<script>${js}</script>
</body></html>`;
writeFileSync(OUT, html);
console.log(OUT, `${(html.length / 1024).toFixed(0)} KB`);
