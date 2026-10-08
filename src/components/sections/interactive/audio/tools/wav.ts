/* Node-only helpers for the offline tools: write float WAVs and read any audio file via ffmpeg. */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

/** 32-bit float WAV, interleaving the given channels. */
export function writeWav(path: string, chs: Float32Array[], sr: number) {
  const n = chs[0].length;
  const c = chs.length;
  const data = Buffer.alloc(n * c * 4);
  for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) data.writeFloatLE(chs[k][i], (i * c + k) * 4);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20);
  h.writeUInt16LE(c, 22);
  h.writeUInt32LE(sr, 24);
  h.writeUInt32LE(sr * c * 4, 28);
  h.writeUInt16LE(c * 4, 32);
  h.writeUInt16LE(32, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}

/** Decode any file ffmpeg reads to float channels at `sr`, optionally with a filter chain. */
export function readAudio(path: string, sr: number, channels: number, filter?: string, from?: number, dur?: number) {
  const args = ["-v", "error"];
  if (from !== undefined) args.push("-ss", String(from));
  if (dur !== undefined) args.push("-t", String(dur));
  args.push("-i", path);
  if (filter) args.push("-af", filter);
  args.push("-ac", String(channels), "-ar", String(sr), "-f", "f32le", "-");
  const raw = execFileSync("ffmpeg", args, { maxBuffer: 1 << 30 });
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const n = all.length / channels;
  const out: Float32Array[] = [];
  for (let k = 0; k < channels; k++) {
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = all[i * channels + k];
    out.push(c);
  }
  return out;
}
