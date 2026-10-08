/*
 * Builds public/audio from licensed source recordings and the synthesized score, and writes the
 * cut points the players need into ../assets.ts and the attributions into public/audio/CREDITS.md.
 * Offline tool (needs ffmpeg with libopus and AudioToolbox AAC); never runs in the build.
 *
 *   pnpm exec tsx src/components/sections/interactive/audio/tools/build-assets.mts [sourcesDir]
 *
 * sourcesDir holds the downloads and their manifest.json (URL, licence, author per file); the
 * default is the QA harness folder the sources were collected into.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { renderCozyLoop } from "./music-score";
import { db, lufs, peak, seam } from "./measure";
import { readAudio, writeWav } from "./wav";

const SR = 48000;
const HERE = new URL(".", import.meta.url).pathname;
const ROOT = resolve(HERE, "../../../../../..");
const OUT = join(ROOT, "public/audio");
const SOURCES = process.argv[2] ?? join(homedir(), "Projects/_qa-harness/kp-v4/v4-sound/sources");
const WORK = join(process.env.TMPDIR ?? "/tmp", `kz-audio-build-${Date.now()}`);
mkdirSync(OUT, { recursive: true });
mkdirSync(WORK, { recursive: true });

type Source = {
  id: string;
  category: string;
  localPath: string;
  sourcePageUrl: string;
  title: string;
  author: string;
  licence: string;
  licenceUrl: string;
  licenceQuote: string;
};
const manifest: Source[] = JSON.parse(readFileSync(join(SOURCES, "manifest.json"), "utf8"));
const src = (id: string) => {
  const s = manifest.find((m) => m.id === id);
  if (!s) throw new Error(`no source ${id}`);
  return s;
};
const used = new Map<string, string>();

type Chs = Float32Array[];
const gainDb = (chs: Chs, g: number) => chs.map((c) => c.map((v) => v * Math.pow(10, g / 20)));
/** Loudness-match to `target` LUFS, but never let a peak above `ceiling` dBFS. */
const toLufs = (chs: Chs, target: number, ceiling = -3) =>
  gainDb(chs, Math.min(target - lufs(chs, SR), ceiling - db(peak(chs))));
/** One-shots shorter than a loudness block are matched by peak. */
const toPeak = (chs: Chs, target: number) => gainDb(chs, target - db(peak(chs)));
const slice = (chs: Chs, a: number, b: number) => chs.map((c) => c.slice(Math.round(a * SR), Math.round(b * SR)));
const fade = (chs: Chs, fin: number, fout: number) =>
  chs.map((c) => {
    const d = c.slice();
    const ni = Math.round(fin * SR);
    const no = Math.round(fout * SR);
    for (let i = 0; i < ni && i < d.length; i++) d[i] *= Math.sin(((i / ni) * Math.PI) / 2) ** 2;
    for (let i = 0; i < no && i < d.length; i++) d[d.length - 1 - i] *= Math.sin(((i / no) * Math.PI) / 2) ** 2;
    return d;
  });
const concat = (parts: Chs[], gap: number) => {
  const g = Math.round(gap * SR);
  const n = parts.reduce((a, p) => a + p[0].length + g, g);
  const out = parts[0].map(() => new Float32Array(n));
  const at: { start: number; dur: number }[] = [];
  let pos = g;
  for (const p of parts) {
    p.forEach((c, k) => out[k].set(c, pos));
    at.push({ start: +(pos / SR).toFixed(4), dur: +(p[0].length / SR).toFixed(4) });
    pos += p[0].length + g;
  }
  return { chs: out, at };
};

/** Short-term level (dB) in 50 ms blocks, mono sum. */
function blocks(chs: Chs, ms = 50) {
  const n = Math.round((ms / 1000) * SR);
  const out: number[] = [];
  for (let s = 0; s + n <= chs[0].length; s += n) {
    let sum = 0;
    for (const c of chs) for (let i = s; i < s + n; i++) sum += c[i] * c[i];
    out.push(10 * Math.log10(sum / (n * chs.length) + 1e-20));
  }
  return out;
}

/** The steadiest window: lowest spread of 50 ms levels, and no single block jumping out. */
function steadiest(chs: Chs, from: number, to: number, len: number) {
  const lv = blocks(chs);
  const per = 20;
  const w = Math.round(len * per);
  let best = { at: from, score: Infinity };
  for (let s = Math.round(from * per); s + w <= Math.min(lv.length, Math.round(to * per)); s += 5) {
    const seg = lv.slice(s, s + w);
    const mean = seg.reduce((a, b) => a + b, 0) / w;
    const sd = Math.sqrt(seg.reduce((a, b) => a + (b - mean) ** 2, 0) / w);
    const worst = Math.max(...seg.map((v) => v - mean));
    const score = sd + 0.5 * worst;
    if (score < best.score) best = { at: s / per, score };
  }
  return best;
}

/** Onsets: blocks of 5 ms rising `rise` dB over the previous 30 ms floor, at least `gap` apart. */
function onsets(c: Float32Array, rise = 18, gap = 0.4) {
  const n = Math.round(0.005 * SR);
  const lv: number[] = [];
  for (let s = 0; s + n <= c.length; s += n) {
    let m = 0;
    for (let i = s; i < s + n; i++) m = Math.max(m, Math.abs(c[i]));
    lv.push(db(m));
  }
  const out: number[] = [];
  for (let i = 6; i < lv.length; i++) {
    const floor = Math.max(...lv.slice(i - 6, i));
    if (lv[i] - floor > rise && (!out.length || i * 0.005 - out[out.length - 1] > gap)) out.push(i * 0.005);
  }
  return out;
}

function encode(name: string, chs: Chs, opusKbps: number, aacKbps: number) {
  const wav = join(WORK, `${name}.wav`);
  writeWav(wav, chs, SR);
  const webm = join(OUT, `${name}.webm`);
  const m4a = join(OUT, `${name}.m4a`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-c:a", "libopus", "-b:a", `${opusKbps}k`, "-vbr", "on", "-application", "audio", webm]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-c:a", "aac_at", "-b:a", `${aacKbps}k`, "-movflags", "+faststart", m4a]);
  const size = (p: string) => statSync(p).size;
  const dec = readAudio(webm, SR, chs.length);
  return {
    name,
    seconds: +(chs[0].length / SR).toFixed(3),
    channels: chs.length,
    lufs: +lufs(chs, SR).toFixed(2),
    peakDb: +db(peak(chs)).toFixed(2),
    decodedOpusLufs: +lufs(dec, SR).toFixed(2),
    decodedOpusPeakDb: +db(peak(dec)).toFixed(2),
    webmKB: +(size(webm) / 1024).toFixed(1),
    m4aKB: +(size(m4a) / 1024).toFixed(1),
  };
}

const report: Record<string, unknown>[] = [];

/** Rebuild the loop as the player does (loader.buildLoop) and measure its seam. */
function loopSeam(chs: Chs, loop: { body: number; tail: number; correlated: boolean }) {
  const n = Math.round(loop.body * SR);
  const x = Math.round(loop.tail * SR);
  const mono = new Float32Array(n);
  for (const c of chs)
    for (let i = 0; i < n; i++) {
      let v = c[i];
      if (i < x) {
        const t = (i + 0.5) / x;
        const fin = loop.correlated ? t : Math.sin((t * Math.PI) / 2);
        const fout = loop.correlated ? 1 - t : Math.cos((t * Math.PI) / 2);
        v = c[i] * fin + c[n + i] * fout;
      }
      mono[i] += v / chs.length;
    }
  const s = seam(mono, SR);
  return { jumpRatio: +s.jumpRatio.toFixed(3), levelStepDb: +s.levelStepDb.toFixed(2), medianLevelStepDb: +s.medianLevelStepDb.toFixed(2) };
}
const loops: Record<string, { body: number; tail: number; correlated: boolean }> = {};

// --- Rain wash: steady rain recorded at a window (the steadiest, least peaky candidate). -------
{
  const s = src("rain-4-2");
  used.set(s.id, "rain-wash (the rain bed)");
  const full = readAudio(join(SOURCES, s.localPath.split("sources/").pop()!), SR, 2, "highpass=f=110:poles=2,lowshelf=f=260:g=-2");
  const body = 24;
  const tail = 0.8;
  const w = steadiest(full, 0, 26, body + tail);
  const seg = toLufs(slice(full, w.at, w.at + body + tail), -22);
  loops.wash = { body, tail, correlated: false };
  report.push({ ...encode("rain-wash", seg, 56, 80), from: w.at, steadiness: +w.score.toFixed(2), source: s.id, seam: loopSeam(seg, loops.wash) });
}

// --- Rain on glass: big drops on a windshield from inside (mono), the steadiest 16 s. --------
{
  const s = src("glass-1");
  used.set(s.id, "rain-glass (close drops on the pane)");
  const full = readAudio(join(SOURCES, s.localPath.split("sources/").pop()!), SR, 1, "highpass=f=160:poles=2,lowshelf=f=400:g=-2");
  const body = 16;
  const tail = 0.8;
  const w = steadiest(full, 22, 72 - tail, body + tail);
  const seg = toLufs(slice(full, w.at, w.at + body + tail), -24);
  loops.glass = { body, tail, correlated: false };
  report.push({ ...encode("rain-glass", seg, 48, 64), from: w.at, steadiness: +w.score.toFixed(2), source: s.id, seam: loopSeam(seg, loops.glass) });
}

// --- Thunder: three distant rumbles, trimmed to their body, darkened, loudness-matched. ------
const thunderAt: { start: number; dur: number }[] = [];
{
  const parts: Chs[] = [];
  for (const id of ["thunder-6", "thunder-4", "thunder-5"]) {
    const s = src(id);
    used.set(s.id, "thunder (distant rumbles)");
    const full = readAudio(join(SOURCES, s.localPath.split("sources/").pop()!), SR, 1, "highpass=f=28,lowpass=f=2400:poles=2");
    const lv = blocks(full);
    const top = Math.max(...lv);
    const first = lv.findIndex((v) => v > top - 30);
    const start = Math.max(0, first / 20 - 0.15);
    let end = start + 13;
    for (let i = lv.length - 1; i > first; i--)
      if (lv[i] > top - 42) {
        end = Math.min(start + 13, i / 20 + 0.5);
        break;
      }
    parts.push(toLufs(fade(slice(full, start, end), 0.08, Math.min(3, (end - start) * 0.35)), -21));
  }
  const sprite = concat(parts, 0.25);
  thunderAt.push(...sprite.at);
  report.push({ ...encode("thunder", sprite.chs, 32, 48), segments: sprite.at });
}

// --- Music: the synthesized lo-fi loop. --------------------------------------------------------
{
  const t0 = Date.now();
  const m = renderCozyLoop(SR, 0.75);
  const n = Math.round(m.body * SR);
  const bodyOnly = m.channels.map((c) => c.subarray(0, n));
  const g = -22 - lufs(bodyOnly, SR);
  const chs = gainDb(m.channels, g);
  writeWav(join(WORK, "cozy-loop-master.wav"), chs, SR);
  loops.music = { body: +m.body.toFixed(6), tail: m.tail, correlated: true };
  // The tail is the next pass's first beat: it should equal the head (only the hiss differs).
  const x = Math.round(m.tail * SR);
  let diff = 0;
  let ref = 0;
  for (const c of chs)
    for (let i = 0; i < x; i++) {
      diff += (c[n + i] - c[i]) ** 2;
      ref += c[i] ** 2;
    }
  report.push({
    ...encode("cozy-loop", chs, 72, 112),
    renderMs: Date.now() - t0,
    headVsTailResidualDb: +(10 * Math.log10(diff / ref)).toFixed(1),
    seam: loopSeam(chs, loops.music),
  });
}

// --- SFX sprite: coin strikes, splashes, drips. -------------------------------------------------
const sfxAt: Record<"clinks" | "splashes" | "drops", { start: number; dur: number }[]> = { clinks: [], splashes: [], drops: [] };
{
  const parts: Chs[] = [];
  const kinds: ("clinks" | "splashes" | "drops")[] = [];
  const add = (kind: "clinks" | "splashes" | "drops", chs: Chs, peakDb: number) => {
    parts.push(toPeak(chs, peakDb));
    kinds.push(kind);
  };
  // Coins dropped into a cup: the first strike only, cut before the first bounce.
  for (const id of ["metal-1", "metal-2", "metal-3"]) {
    const s = src(id);
    used.set(s.id, "sfx clinks (gold strikes)");
    const c = readAudio(join(SOURCES, s.localPath.split("sources/").pop()!), SR, 1, "highpass=f=300");
    const on = onsets(c[0], 18, 0.06);
    const a = Math.max(0, (on[0] ?? 0) - 0.003);
    const b = Math.min(c[0].length / SR, on[1] !== undefined ? on[1] - 0.004 : a + 0.4, a + 0.4);
    add("clinks", fade(slice(c, a, b), 0.002, Math.min(0.08, (b - a) * 0.5)), -8);
  }
  // Coins on a floor: the first strike of four of them, with a short natural ring.
  {
    const s = src("metal-4");
    used.set(s.id, "sfx clinks (gold strikes)");
    const c = readAudio(join(SOURCES, s.localPath.split("sources/").pop()!), SR, 1, "highpass=f=300");
    const on = onsets(c[0], 20, 1);
    for (const k of [0, 2, 5, 8]) {
      if (on[k] === undefined) continue;
      const a = on[k] - 0.003;
      const next = onsets(slice(c, on[k] + 0.02, on[k] + 0.5)[0], 12, 0.05)[0];
      const b = on[k] + Math.min(0.32, next !== undefined ? next + 0.016 : 0.32);
      add("clinks", fade(slice(c, a, b), 0.002, Math.min(0.1, (b - a) * 0.5)), -8);
    }
  }
  for (const id of ["splash-1", "splash-2"]) {
    const s = src(id);
    used.set(s.id, "sfx splashes");
    const c = readAudio(join(SOURCES, s.localPath.split("sources/").pop()!), SR, 1, "highpass=f=70");
    const on = onsets(c[0], 15, 1)[0] ?? 0;
    const a = Math.max(0, on - 0.01);
    add("splashes", fade(slice(c, a, Math.min(c[0].length / SR, a + 1.4)), 0.004, 0.5), -6);
  }
  {
    const s = src("drop-1");
    used.set(s.id, "sfx drops (drips)");
    const c = readAudio(join(SOURCES, s.localPath.split("sources/").pop()!), SR, 1, "highpass=f=120");
    const on = onsets(c[0], 20, 0.6);
    for (const k of [1, 4, 7]) {
      if (on[k] === undefined) continue;
      const a = on[k] - 0.004;
      const b = Math.min(on[k + 1] !== undefined ? on[k + 1] - 0.05 : a + 0.6, a + 0.6);
      add("drops", fade(slice(c, a, b), 0.002, Math.min(0.2, (b - a) * 0.5)), -8);
    }
  }
  const sprite = concat(parts, 0.15);
  sprite.at.forEach((seg, i) => sfxAt[kinds[i]].push(seg));
  report.push({ ...encode("sfx", sprite.chs, 48, 64), segments: sfxAt });
}

// --- assets.ts and CREDITS.md -------------------------------------------------------------------
const fmt = (o: unknown) => JSON.stringify(o).replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ");
writeFileSync(
  join(HERE, "../assets.ts"),
  `/*
 * Generated by tools/build-assets.mts (do not edit by hand): the files in public/audio, their loop
 * bodies and crossfade tails (seconds), and the cut points of the sprites.
 */

export type AssetLoop = { body: number; tail: number; correlated: boolean };
export type Segment = { start: number; dur: number };

export const RAIN_WASH = { name: "rain-wash", loop: ${fmt(loops.wash)} as AssetLoop };
export const RAIN_GLASS = { name: "rain-glass", loop: ${fmt(loops.glass)} as AssetLoop };
export const THUNDER = { name: "thunder", segments: ${fmt(thunderAt)} as Segment[] };
export const MUSIC = { name: "cozy-loop", loop: ${fmt(loops.music)} as AssetLoop };
export const SFX = {
  name: "sfx",
  clinks: ${fmt(sfxAt.clinks)} as Segment[],
  splashes: ${fmt(sfxAt.splashes)} as Segment[],
  drops: ${fmt(sfxAt.drops)} as Segment[],
};
`,
);

const credits = [...used.entries()].map(([id, use]) => {
  const s = src(id);
  return `- **${s.title}** by ${s.author}. Used in: ${use}.\n  Source: ${s.sourcePageUrl}\n  Licence: ${s.licence}${s.licenceUrl ? ` (${s.licenceUrl})` : ""}. On the page: ${s.licenceQuote}`;
});
writeFileSync(
  join(OUT, "CREDITS.md"),
  `# Audio credits (kinzen.dev)

Every recording here is a CC0 or public-domain field recording, licensed for commercial use with no
attribution required; the credits are kept anyway. Each file was edited (trimmed, filtered,
loudness-matched, encoded) by tools/build-assets.mts.

Synthesized in code (no recordings): the lo-fi music loop (cozy-loop, composed and rendered by
tools/music-score.ts), the keyboard switch sounds, the bowl ring, the phone bell, the lamp switch
and the wind in the gusts (src/components/sections/interactive/audio/dsp.ts).

## Recordings

${credits.join("\n")}
`,
);

writeFileSync(join(WORK, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log("work dir:", WORK);
