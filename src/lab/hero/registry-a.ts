import type { LabDemo } from "../types";

/** Demos owned by builder lab-hero-a. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "particles-alive",
    title: "Particles alive",
    idea: "The gold dust wordmark answers the cursor with springy inertia, bursts on a click and pours into the Thai name กฤติพงษ์ and back.",
    technique:
      "WebGL2 GPGPU: 65k particles in float textures (MRT step), spring + curl noise + pointer forces, left-to-right sorted morph targets.",
    load: () => import("./particles-alive"),
  },
  {
    id: "gold-3d",
    title: "3D gold",
    idea: "KINZEN as brushed-gold metal letters that lean toward the cursor under a slow light sweep; scrolling flies the camera through the name.",
    technique:
      "three.js: letters extruded from contours traced off the shipped wordmark mask, anisotropic physical metal, PMREM studio env, scroll-linked dolly.",
    load: () => import("./gold-3d"),
  },
  {
    id: "gold-ink-water",
    title: "Gold ink in water",
    idea: "KINZEN poured as gold dye into navy water: the cursor stirs it into wisps, and calm water gathers the ink back into the name.",
    technique:
      "WebGL2 Stable Fluids (own compact rewrite after PavelDoGreat, MIT): vorticity, Jacobi pressure, plus an unprojected gather flow and refill toward the letter mask.",
    load: () => import("./gold-ink-water"),
  },
  {
    id: "keycap-field",
    title: "Keycap wave field",
    idea: "A field of navy keycaps where the raised, gold-lit keys spell KINZEN; the cursor presses keys and the ripple rolls outward and settles.",
    technique:
      "three.js InstancedMesh (one per key) with soft shadows; a damped 2D wave equation per key; keys picked by projecting each one onto the wordmark mask.",
    load: () => import("./keycap-field"),
  },
];
