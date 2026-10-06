/**
 * Capability tiers (research 07, section 3.4).
 *  off   ?fx=off, Save-Data, no WebGL2, no float colour buffer, software renderer,
 *        or the governor's start-up probe fails. The server-rendered wordmark stays.
 *        prefers-reduced-motion is off too: the static wordmark is the designed reduced state
 *        (HeroFx never loads the field then; this is the second line of that rule).
 *  still ?fx=still only (debugging): seed at the final wordmark, settle, stop the loop.
 *  lite  coarse pointer or a small device: fewer particles, 60 fps cap, one bloom level, DPR up
 *        to 2 like full (the hero box is small, so a phone's DPR 2 fits the pixel budget and the
 *        wordmark stays as sharp as the text under it).
 *  full  fine pointer and a hardware renderer.
 */
export type Tier = "off" | "still" | "lite" | "full";

export type Env = {
  fx: string | null;
  saveData: boolean;
  reducedMotion: boolean;
  coarse: boolean;
  memory: number | null;
  cores: number | null;
};

export type TierConfig = {
  side: number;
  maxDpr: number;
  pxBudget: number;
  fps: number;
  bloomLevels: 1 | 2;
  aberration: number;
  pointer: boolean;
  maxShift: number;
};

export const TIER_CONFIG: Record<Exclude<Tier, "off">, TierConfig> = {
  full: {
    side: 512,
    maxDpr: 2,
    pxBudget: 2_600_000,
    fps: 120,
    bloomLevels: 2,
    aberration: 0,
    pointer: true,
    maxShift: 2,
  },
  lite: {
    side: 384,
    maxDpr: 2,
    pxBudget: 1_400_000,
    fps: 60,
    bloomLevels: 1,
    aberration: 0,
    pointer: false,
    maxShift: 2,
  },
  still: {
    side: 512,
    maxDpr: 2,
    pxBudget: 2_600_000,
    fps: 60,
    bloomLevels: 2,
    aberration: 0,
    pointer: false,
    maxShift: 0,
  },
};

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i;

export function isSoftwareRenderer(renderer: string): boolean {
  return SOFTWARE.test(renderer);
}

export function readEnv(): Env {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return {
    fx: new URLSearchParams(location.search).get("fx"),
    saveData: !!nav.connection?.saveData,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    coarse: matchMedia("(pointer: coarse)").matches,
    memory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    cores: typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
  };
}

/** Decisions that need no GPU. Returns a tier to force, or null to keep going. */
export function preTier(env: Env): Tier | null {
  if (env.fx === "off" || env.saveData) return "off";
  return null;
}

/** The renderer string, unmasked where the browser allows it. */
export function rendererOf(gl: WebGL2RenderingContext): string {
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return String(r ?? "");
}

export function hasFloatTargets(gl: WebGL2RenderingContext): boolean {
  return !!gl.getExtension("EXT_color_buffer_float") || !!gl.getExtension("EXT_color_buffer_half_float");
}

export function pickTier(
  env: Env,
  gl: WebGL2RenderingContext | null,
): { tier: Tier; reason: string; renderer: string } {
  const forced = preTier(env);
  if (forced) return { tier: forced, reason: env.fx === "off" ? "fx=off" : "save-data", renderer: "" };
  if (!gl) return { tier: "off", reason: "no webgl2", renderer: "" };
  const renderer = rendererOf(gl);
  if (!hasFloatTargets(gl)) return { tier: "off", reason: "no float colour buffer", renderer };
  if (isSoftwareRenderer(renderer)) return { tier: "off", reason: "software renderer", renderer };
  if (env.fx === "still" || env.fx === "lite" || env.fx === "full") return { tier: env.fx, reason: "forced", renderer };
  if (env.reducedMotion) return { tier: "off", reason: "reduced motion", renderer };
  const small = (env.memory !== null && env.memory <= 4) || (env.cores !== null && env.cores <= 4);
  if (env.coarse || small) return { tier: "lite", reason: env.coarse ? "coarse pointer" : "small device", renderer };
  return { tier: "full", reason: "capable", renderer };
}
