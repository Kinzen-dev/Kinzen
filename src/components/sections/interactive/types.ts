import type { Locale } from "@/content/schema";

/** The scenes, in the order the switcher shows them and auto-advance visits them (then loops). */
export const SCENE_IDS = ["night-desk", "gold-toss", "thock", "one-drop"] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/**
 * What every scene gets. A scene owns one WebGL context, its loop, its listeners and its sound
 * nodes, and frees all of them on unmount (the section never holds two live contexts).
 */
export type SceneProps = {
  locale: Locale;
  /** The scene has drawn its first composed frame (the section drops the server still then). */
  onReady?: () => void;
  /** The visitor played (also from the keyboard with nothing focused): auto-advance stops. */
  onPlay?: () => void;
  /**
   * Nothing runs: no WebGL ("none": the section shows a note) or only a software renderer
   * ("software": the section shows the scene's picture and mounts no more scenes).
   */
  onFail?: (why: "none" | "software") => void;
};
