import { createSfx, getAudioBus } from "../sound";

/** What the gold letters play, on the section's shared audio bus. */
export type GoldSound = {
  /** Metal on metal or stone; `size` is the letter's relative size (bigger rings lower). */
  clink: (speed: number, size?: number) => void;
  /** A heavy letter landing on the ledge. */
  thud: (speed: number) => void;
  splash: (speed: number) => void;
  stop: () => void;
};

export function createGoldSound(): GoldSound {
  const sfx = createSfx(getAudioBus());
  return {
    clink: (speed) => sfx.metalClink(Math.min(1, speed)),
    thud: (speed) => sfx.drop(Math.min(1, speed)),
    splash: (speed) => sfx.splash(Math.min(1, speed)),
    stop: () => sfx.stop(),
  };
}
