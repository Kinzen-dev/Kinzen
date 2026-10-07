import type { WebGLRenderer } from "three";
import type { PointerState } from "./kit/pointer";

/** The five scenes, in the order they play. */
export type SceneId = "desk" | "particles" | "gold3d" | "fluid" | "keycaps";
export type GpuSceneId = Exclude<SceneId, "desk">;

export type Rect = { x: number; y: number; w: number; h: number };
export type Rgb = [number, number, number];

/** Stage geometry, in layout CSS px relative to the stage box (the hero's scale-down divided out). */
export type Geom = {
  cssW: number;
  cssH: number;
  /** Canvas pixels and the CSS-to-canvas factor (device pixel ratio times the quality scale). */
  pxW: number;
  pxH: number;
  k: number;
  /** The ink box of the KINZEN wordmark: every GPU scene draws the name exactly here. */
  slot: Rect;
  phone: boolean;
};

/**
 * What a scene is doing this frame. "in" and "out" overlap during a transition (p runs 0..1 over
 * it); the incoming scene draws first, the outgoing one over it.
 */
export type Role =
  { mode: "solo" } | { mode: "in"; p: number; from: SceneId } | { mode: "out"; p: number; to: SceneId };

export type FrameCtx = {
  /** Seconds since this scene's entry began (its transition in included). */
  t: number;
  dt: number;
  role: Role;
  ptr: PointerState;
  geom: Geom;
};

/** The one WebGL2 context of the stage, shared by every GPU scene. */
export type Gpu = {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  /** RGBA32F render targets (else RGBA16F). */
  float32: boolean;
  /** Created on the first three.js scene, wrapping the same context. */
  three: WebGLRenderer | null;
  colors: { gold: Rgb; ground: Rgb; ink: Rgb };
};

export interface GpuScene {
  readonly id: GpuSceneId;
  layout(g: Geom): void;
  /** Called when the scene's entry starts. */
  enter(from: SceneId): void;
  /** Precompute an entry from the desk (its ink points, stage px pairs), ahead of the hand-over. */
  prime?(seed: Float32Array): void;
  frame(c: FrameCtx): void;
  tap?(x: number, y: number): void;
  dispose(): void;
}

export type SceneFactory = (gpu: Gpu, geom: Geom) => Promise<GpuScene>;
