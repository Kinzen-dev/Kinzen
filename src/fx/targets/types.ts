export type Rgb = readonly [number, number, number];

/** A rectangle in canvas CSS pixels (origin top-left of the canvas). */
export type Box = { x: number; y: number; w: number; h: number };

/**
 * Particle targets in world units. `pos` is xyz + role per particle
 * (role 1 = glyph, 0 = dust halo); `col` is sRGB8 RGBA per particle.
 */
export type Targets = {
  pos: Float32Array;
  col: Uint8Array;
  /** Particles assigned to glyphs. */
  glyphs: number;
  /** Glyph ink area in CSS px squared (for density-normalised brightness). */
  glyphArea: number;
};

export type TargetJob = {
  N: number;
  /** Canvas size in CSS px. */
  cw: number;
  ch: number;
  /** Ink box of the wordmark in canvas CSS px. */
  ink: Box;
  /** World units per CSS px at the z = 0 plane. */
  k: number;
  /** Emission gold (sRGB 0..255). */
  gold: Rgb;
  dustShare: number;
  edgeShare: number;
};

export type ScatterJob = {
  N: number;
  /** The area the opening dust is spread over, in world units (x right, y up). */
  box: { x0: number; y0: number; x1: number; y1: number };
};

export type Burst = { pos: Float32Array; vel: Float32Array };
