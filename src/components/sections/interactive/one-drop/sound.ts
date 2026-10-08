import { createSfx, getAudioBus } from "../sound";

/** The bowl's water sounds, on the section's shared audio bus: a drop's plink, heavier = lower. */
export type Plinker = { plink: (weight: number, small: boolean) => void };

export function createPlinker(): Plinker {
  const sfx = createSfx(getAudioBus());
  return { plink: (w, small) => sfx.drop(small ? 0.05 : 0.2 + 0.8 * w) };
}
