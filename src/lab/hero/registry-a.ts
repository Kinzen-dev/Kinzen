import type { LabDemo } from "../types";

/** Demos owned by builder lab-hero-a. Each entry's component lives in ./<id>/. */
export const demos: LabDemo[] = [
  {
    id: "particles-alive",
    title: "Particles alive",
    idea: "The gold dust wordmark answers the cursor with springy inertia, bursts on a click and pours into the Thai name กฤติพงษ์ and back.",
    technique: "WebGL2 GPGPU: 65k particles in float textures (MRT step), spring + curl noise + pointer forces, left-to-right sorted morph targets.",
    load: () => import("./particles-alive"),
  },
];
