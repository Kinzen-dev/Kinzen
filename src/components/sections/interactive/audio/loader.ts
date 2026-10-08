/*
 * Fetching and decoding the recorded and pre-rendered assets in public/audio. Each asset ships
 * twice: Opus in WebM (small; Chrome, Firefox, Edge, recent Safari) and AAC in MP4 (every Safari).
 * The first decode failure flips the whole section to AAC. Nothing is fetched before a scene asks
 * (after the visitor's first gesture), and each scene fetches only its own files.
 *
 * Loops never rely on the codec's own padding: a looped file holds the loop body plus a short
 * tail that continues past the loop point, and the loop is rebuilt here by crossfading that tail
 * into the head. The seam is then the recording's (or the score's) own continuation, whatever
 * priming delay or end padding the decoder adds.
 */
import type { AssetLoop } from "./assets";

/** Where public/audio is served from (the offline harness points this elsewhere). */
export const audioBase = { url: "/audio/" };

type Format = "webm" | "m4a";
let format: Format | null = null;

function pickFormat(): Format {
  if (format) return format;
  try {
    const a = document.createElement("audio");
    format = a.canPlayType('audio/webm; codecs="opus"') ? "webm" : "m4a";
  } catch {
    format = "m4a";
  }
  return format;
}

const bytes = new Map<string, Promise<ArrayBuffer>>();

/** The encoded file (kept, small); every caller gets its own copy because decoding detaches it. */
function fetchBytes(url: string) {
  let p = bytes.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`audio ${r.status} ${url}`);
      return r.arrayBuffer();
    });
    p.catch(() => bytes.delete(url));
    bytes.set(url, p);
  }
  return p.then((b) => b.slice(0));
}

function decode(ctx: BaseAudioContext, data: ArrayBuffer) {
  // The promise form is everywhere current; the callback form covers old Safari.
  return new Promise<AudioBuffer>((resolve, reject) => {
    const p = ctx.decodeAudioData(data, resolve, reject);
    if (p && typeof p.then === "function") p.then(resolve, reject);
  });
}

/** Fetch and decode `name` (no extension) in the browser's format, falling back to AAC. */
export async function loadAudio(ctx: BaseAudioContext, name: string): Promise<AudioBuffer> {
  const first = pickFormat();
  try {
    return await decode(ctx, await fetchBytes(`${audioBase.url}${name}.${first}`));
  } catch (err) {
    if (first === "m4a") throw err;
    format = "m4a";
    return decode(ctx, await fetchBytes(`${audioBase.url}${name}.m4a`));
  }
}

/**
 * Rebuild a seamless loop from body + tail. `correlated` tails (a score rendered twice, so head
 * and tail hold the same notes) crossfade linearly; independent ones (a field recording) with
 * equal power, so the level holds through the seam either way.
 */
export function buildLoop(ctx: BaseAudioContext, src: AudioBuffer, loop: AssetLoop): AudioBuffer {
  const sr = src.sampleRate;
  const n = Math.min(Math.round(loop.body * sr), src.length);
  const x = Math.min(Math.round(loop.tail * sr), src.length - n);
  const out = ctx.createBuffer(src.numberOfChannels, n, sr);
  for (let c = 0; c < src.numberOfChannels; c++) {
    const s = src.getChannelData(c);
    const d = out.getChannelData(c);
    d.set(s.subarray(0, n));
    for (let i = 0; i < x; i++) {
      const t = (i + 0.5) / x;
      const fin = loop.correlated ? t : Math.sin((t * Math.PI) / 2);
      const fout = loop.correlated ? 1 - t : Math.cos((t * Math.PI) / 2);
      d[i] = s[i] * fin + s[n + i] * fout;
    }
  }
  return out;
}

/** A mono AudioBuffer from samples rendered in dsp.ts. */
export function toBuffer(ctx: BaseAudioContext, data: Float32Array): AudioBuffer {
  const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
  b.getChannelData(0).set(data);
  return b;
}

/** Cut one segment of a sprite (seconds) into its own buffer. */
export function cut(ctx: BaseAudioContext, src: AudioBuffer, start: number, dur: number): AudioBuffer {
  const sr = src.sampleRate;
  const i0 = Math.min(src.length - 1, Math.round(start * sr));
  const n = Math.max(1, Math.min(src.length - i0, Math.round(dur * sr)));
  const out = ctx.createBuffer(src.numberOfChannels, n, sr);
  for (let c = 0; c < src.numberOfChannels; c++) out.getChannelData(c).set(src.getChannelData(c).subarray(i0, i0 + n));
  return out;
}

/** Test hook: forget the chosen format and cached bytes. */
export function resetLoader() {
  format = null;
  bytes.clear();
}
