import * as THREE from "three";
import type { Geom, Gpu } from "../types";

/**
 * The stage's three.js renderer, wrapping the context the raw scenes already use (one canvas,
 * one context for all five scenes). Created on the first three.js scene. The stage clears the
 * canvas once per frame, so the renderer never clears on its own.
 */
export function ensureRenderer(gpu: Gpu, geom: Geom): THREE.WebGLRenderer {
  if (gpu.three) return gpu.three;
  const r = new THREE.WebGLRenderer({ canvas: gpu.canvas, context: gpu.gl, antialias: true, alpha: true });
  r.autoClear = false;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  r.setPixelRatio(geom.k);
  r.setSize(geom.cssW, geom.cssH, false);
  gpu.three = r;
  return r;
}

/** A colour from a linear-ready sRGB triple read off the CSS tokens. */
export function srgb([r, g, b]: [number, number, number]): THREE.Color {
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}

/** Cheap 3D value noise for the dissolve and melt patches. */
export const VNOISE_GLSL = `
float kzHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float kzNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kzHash(i), kzHash(i + vec3(1,0,0)), f.x), mix(kzHash(i + vec3(0,1,0)), kzHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(kzHash(i + vec3(0,0,1)), kzHash(i + vec3(1,0,1)), f.x), mix(kzHash(i + vec3(0,1,1)), kzHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;
