import type { Rgb } from "../targets/types";

/**
 * Reads the design tokens the field must match: --ground (the canvas must be invisible against
 * the page) and --gold for both schemes (emission uses the dark-scheme gold, the light theme
 * inks with the light-scheme gold). Colours resolve through a 1x1 canvas, so oklch() and
 * light-dark() tokens come back as sRGB bytes.
 */
export type Palette = {
  mode: "dark" | "light";
  ground: Rgb;
  /** Emission gold (dark-scheme --gold). */
  glow: Rgb;
  /** Ink gold for the light ground (light-scheme --gold). */
  ink: Rgb;
};

let ctx: CanvasRenderingContext2D | null = null;
function toRgb(css: string): Rgb {
  if (!ctx) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    ctx = c.getContext("2d", { willReadFrequently: true });
  }
  if (!ctx) return [0, 0, 0];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

function token(host: HTMLElement, name: string, scheme?: "light" | "dark"): Rgb {
  const el = document.createElement("span");
  el.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color:var(${name});${scheme ? `color-scheme:${scheme};` : ""}`;
  host.appendChild(el);
  const v = getComputedStyle(el).color;
  el.remove();
  return toRgb(v);
}

const lum = (c: Rgb) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

export function readPalette(host: HTMLElement): Palette {
  const ground = token(host, "--ground");
  return {
    mode: lum(ground) < 0.5 ? "dark" : "light",
    ground,
    glow: token(host, "--gold", "dark"),
    ink: token(host, "--gold", "light"),
  };
}
