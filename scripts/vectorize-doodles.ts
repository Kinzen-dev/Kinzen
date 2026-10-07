/**
 * Vectorize the hand-drawn doodle PNGs into one optimized single-path SVG each.
 *
 *   pnpm exec tsx scripts/vectorize-doodles.ts [sourceDir]
 *
 * Source: black-on-white 1024px PNGs named `doodle-<name>.png` (a `doodle-<name>-v2.png`
 * wins over the v1 file when both exist). They are gitignored and live in the main
 * checkout under `.assets-src/imagegen/doodles-v1/`. Needs `potrace` on PATH or at
 * /opt/homebrew/bin/potrace. Re-runnable: output is fully regenerated every time.
 *
 * Output (committed):
 *   src/components/doodles/art.generated.ts   typed path data, consumed by <Doodle>
 *   src/components/doodles/svg/<name>.svg      standalone files for review and reuse
 *
 * v3 scene art (larger illustrations: scenes-v3, portrait-v3) is NOT inlined: each becomes
 *   public/art/<name>.svg                     fetched lazily, drawn as a CSS mask (<Art>)
 *   src/components/art/manifest.generated.ts  names and aspect ratios only
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { inflateSync } from "node:zlib";

const DEFAULT_SRC = resolve(process.env.HOME ?? "~", "Projects/kinzen-portfolio/.assets-src/imagegen/doodles-v1");
const SRC = resolve(process.argv[2] ?? DEFAULT_SRC);
const OUT_DIR = resolve("src/components/doodles");
const SVG_DIR = join(OUT_DIR, "svg");

/** Output grid: source pixels are scaled by this factor, then rounded to integers. */
const GRID = Number(process.env.DOODLE_GRID ?? 0.4);
/** Breathing room around the ink so the boil displacement never clips. */
const PAD = 6;
/** potrace: drop specks under 24px, a little smoother corners, looser curve merging. */
const ALPHAMAX = process.env.DOODLE_ALPHAMAX ?? "1.1";
const OPTTOLERANCE = process.env.DOODLE_OPT ?? "0.6";
const POTRACE_ARGS = ["-s", "-t", "24", "-a", ALPHAMAX, "-O", OPTTOLERANCE, "-o", "-", "-"];

function potraceBin(): string {
  for (const p of ["/opt/homebrew/bin/potrace", "/usr/local/bin/potrace", "/usr/bin/potrace"]) {
    if (existsSync(p)) return p;
  }
  return "potrace";
}

/* ------------------------------ PNG -> PBM ------------------------------ */

/** Minimal PNG decoder for 8-bit, non-interlaced grey/RGB/RGBA (what the generator emits). */
function decodePng(buf: Buffer): { width: number; height: number; grey: Uint8Array } {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      colorType = data[9];
      if (depth !== 8 || data[12] !== 0 || ![0, 2, 4, 6].includes(colorType)) {
        throw new Error(`unsupported PNG (depth ${depth}, colour type ${colorType}, interlace ${data[12]})`);
      }
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType] as number;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? px[y * stride + x - channels] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? px[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = v & 0xff;
    }
  }
  const grey = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const lum = channels >= 3 ? (px[o] * 299 + px[o + 1] * 587 + px[o + 2] * 114) / 1000 : px[o];
    const alpha = channels === 4 ? px[o + 3] / 255 : channels === 2 ? px[o + 1] / 255 : 1;
    grey[i] = Math.round(lum * alpha + 255 * (1 - alpha));
  }
  return { width, height, grey };
}

function toPbm({ width, height, grey }: ReturnType<typeof decodePng>): Buffer {
  const rowBytes = Math.ceil(width / 8);
  const header = Buffer.from(`P4\n${width} ${height}\n`, "ascii");
  const bits = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grey[y * width + x] < 128) bits[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return Buffer.concat([header, bits]);
}

/* --------------------------- potrace SVG -> path --------------------------- */

type Pt = [number, number];
type Seg = { kind: "M" } | { kind: "L" } | { kind: "C"; c1: Pt; c2: Pt } | { kind: "Z" };
type Node = Seg & { to: Pt };

function parsePotrace(svg: string): { nodes: Node[] } {
  const tf = svg.match(/translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)/);
  if (!tf) throw new Error("potrace transform not found");
  const [tx, ty, sx, sy] = tf.slice(1).map(Number);
  const map = ([x, y]: Pt): Pt => [tx + x * sx, ty + y * sy];

  const nodes: Node[] = [];
  for (const m of svg.matchAll(/<path d="([^"]+)"/g)) {
    const tokens = m[1].match(/[MmLlCcZz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
    let i = 0;
    let cmd = "";
    let cur: Pt = [0, 0];
    let start: Pt = [0, 0];
    const num = () => Number(tokens[i++]);
    while (i < tokens.length) {
      if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
      const rel = cmd === cmd.toLowerCase();
      const pt = (): Pt => {
        const x = num();
        const y = num();
        return rel ? [cur[0] + x, cur[1] + y] : [x, y];
      };
      switch (cmd.toUpperCase()) {
        case "M": {
          cur = pt();
          start = cur;
          nodes.push({ kind: "M", to: map(cur) });
          cmd = rel ? "l" : "L"; // implicit lineto after moveto
          break;
        }
        case "L": {
          cur = pt();
          nodes.push({ kind: "L", to: map(cur) });
          break;
        }
        case "C": {
          const base = cur;
          const rp = (): Pt => {
            const x = num();
            const y = num();
            return rel ? [base[0] + x, base[1] + y] : [x, y];
          };
          const c1 = rp();
          const c2 = rp();
          cur = rp();
          nodes.push({ kind: "C", c1: map(c1), c2: map(c2), to: map(cur) });
          break;
        }
        case "Z": {
          cur = start;
          nodes.push({ kind: "Z", to: map(cur) });
          break;
        }
        default:
          throw new Error(`unexpected path command ${cmd}`);
      }
    }
  }
  return { nodes };
}

const fmt = (n: number) => String(n);

/** Join numbers SVG-tight: a minus sign is its own separator. */
function joinNums(nums: number[]): string {
  return nums.reduce((s, n, k) => s + (k === 0 || n < 0 ? "" : " ") + fmt(n), "");
}

/** Grid units a control point may stray from the chord before the curve is kept. */
const FLAT = Number(process.env.DOODLE_FLAT ?? 0.75);

/** Distance from p to the segment a-b. */
function offChord(a: Pt, b: Pt, p: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function emitPath(nodes: Node[]): { d: string; w: number; h: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const n of nodes) {
    const pts = n.kind === "C" ? [n.c1, n.c2, n.to] : [n.to];
    for (const [x, y] of pts) {
      xs.push(x);
      ys.push(y);
    }
  }
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const q = ([x, y]: Pt): Pt => [Math.round((x - minX) * GRID) + PAD, Math.round((y - minY) * GRID) + PAD];
  const w = Math.round((Math.max(...xs) - minX) * GRID) + PAD * 2;
  const h = Math.round((Math.max(...ys) - minY) * GRID) + PAD * 2;

  let d = "";
  let last = "";
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  const put = (cmd: string, nums: number[]) => {
    const body = joinNums(nums);
    if (cmd === last && cmd !== "z") d += (nums[0] < 0 ? "" : " ") + body;
    else d += cmd + body;
    last = cmd;
  };
  for (const n of nodes) {
    if (n.kind === "Z") {
      d += "z";
      last = "z";
      cur = start;
      continue;
    }
    const to = q(n.to);
    const rel = (p: Pt): number[] => [p[0] - cur[0], p[1] - cur[1]];
    if (n.kind === "M") {
      // First move is absolute; later ones relative to the closed subpath's start.
      if (d === "") put("M", to);
      else put("m", rel(to));
      start = to;
      last = ""; // the next segment always restates its command
    } else if (n.kind === "L") {
      const r = rel(to);
      if (r[0] === 0 && r[1] === 0) continue;
      put("l", r);
    } else {
      const c1 = q(n.c1);
      const c2 = q(n.c2);
      // A curve whose handles hug the chord draws as a line at this grid: say so in fewer bytes.
      if (offChord(cur, to, c1) <= FLAT && offChord(cur, to, c2) <= FLAT) {
        const r = rel(to);
        if (r[0] === 0 && r[1] === 0) continue;
        put("l", r);
      } else put("c", [...rel(c1), ...rel(c2), ...rel(to)]);
    }
    cur = to;
  }
  return { d, w, h };
}

/* --------------------------------- main --------------------------------- */

function sources(): Map<string, string> {
  const files = readdirSync(SRC).filter((f) => /^doodle-[a-z0-9-]+\.png$/.test(f));
  const picked = new Map<string, string>();
  for (const f of files) {
    const v2 = f.match(/^doodle-(.+)-v2\.png$/);
    const name = v2 ? v2[1] : f.replace(/^doodle-|\.png$/g, "");
    if (v2 || !files.includes(`doodle-${name}-v2.png`)) picked.set(name, f);
  }
  return new Map([...picked].sort(([a], [b]) => a.localeCompare(b)));
}

function main() {
  if (!existsSync(SRC)) {
    console.error(`vectorize-doodles: source folder not found: ${SRC}`);
    process.exit(1);
  }
  const bin = potraceBin();
  rmSync(SVG_DIR, { recursive: true, force: true });
  mkdirSync(SVG_DIR, { recursive: true });

  const entries: { name: string; w: number; h: number; d: string; file: string }[] = [];
  for (const [name, file] of sources()) {
    const pbm = toPbm(decodePng(readFileSync(join(SRC, file))));
    const svg = execFileSync(bin, POTRACE_ARGS, { input: pbm, maxBuffer: 32 * 1024 * 1024 }).toString("utf8");
    const { d, w, h } = emitPath(parsePotrace(svg).nodes);
    entries.push({ name, w, h, d, file });
    writeFileSync(
      join(SVG_DIR, `${name}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><path fill="currentColor" d="${d}"/></svg>\n`,
    );
  }

  const body = entries
    .map((e) => `  ${JSON.stringify(e.name)}: { w: ${e.w}, h: ${e.h}, d: ${JSON.stringify(e.d)} },`)
    .join("\n");
  writeFileSync(
    join(OUT_DIR, "art.generated.ts"),
    `// Generated by scripts/vectorize-doodles.ts. Do not edit by hand; re-run the script.\n` +
      `// Sources: ${entries.map((e) => e.file).join(", ")}\n\n` +
      `export type DoodleArt = { w: number; h: number; d: string };\n\n` +
      `export const doodleArt = {\n${body}\n} as const satisfies Record<string, DoodleArt>;\n\n` +
      `export type DoodleName = keyof typeof doodleArt;\n`,
  );

  let total = 0;
  for (const e of entries) {
    const bytes = Buffer.byteLength(e.d);
    total += bytes;
    console.log(`${e.name.padEnd(16)} ${String(bytes).padStart(6)} B  ${e.w}x${e.h}  (${e.file})`);
  }
  console.log(`total path data ${(total / 1024).toFixed(1)} KB across ${entries.length} doodles`);
}

/* ------------------------------ v3 scene art ------------------------------ */

const ART_DIRS = ["scenes-v3", "portrait-v3"].map((d) =>
  resolve(process.env.HOME ?? "~", "Projects/kinzen-portfolio/.assets-src/imagegen", d),
);
const ART_OUT = resolve("public/art");
const ART_MANIFEST = resolve("src/components/art/manifest.generated.ts");

function art() {
  const bin = potraceBin();
  mkdirSync(ART_OUT, { recursive: true });
  mkdirSync(resolve("src/components/art"), { recursive: true });
  const entries: { name: string; w: number; h: number; bytes: number }[] = [];
  for (const dir of ART_DIRS) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) {
      if (!/^(scene|note|era|portrait)-[a-z0-9-]+\.png$/.test(f)) continue;
      const name = f.replace(/\.png$/, "");
      const pbm = toPbm(decodePng(readFileSync(join(dir, f))));
      const svg = execFileSync(bin, POTRACE_ARGS, { input: pbm, maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
      const { d, w, h } = emitPath(parsePotrace(svg).nodes);
      const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><path id="p" fill="currentColor" d="${d}"/></svg>\n`;
      writeFileSync(join(ART_OUT, `${name}.svg`), out);
      entries.push({ name, w, h, bytes: Buffer.byteLength(out) });
    }
  }
  const body = entries.map((e) => `  ${JSON.stringify(e.name)}: { w: ${e.w}, h: ${e.h} },`).join("\n");
  writeFileSync(
    ART_MANIFEST,
    `// Generated by scripts/vectorize-doodles.ts. Do not edit by hand; re-run the script.\n\n` +
      `export const artManifest = {\n${body}\n} as const satisfies Record<string, { w: number; h: number }>;\n\n` +
      `export type ArtName = keyof typeof artManifest;\n`,
  );
  for (const e of entries) console.log(`art ${e.name.padEnd(24)} ${String(e.bytes).padStart(7)} B  ${e.w}x${e.h}`);
}

main();
art();
