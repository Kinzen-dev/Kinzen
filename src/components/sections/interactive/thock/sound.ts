import { createSfx, createThock, getAudioBus } from "../sound";

/** What the keycap field plays, on the section's shared audio bus. */
export type ThockSound = {
  press: (code: string, velocity?: number) => void;
  release: (code: string) => void;
  spaceRipple: () => void;
  /** "ship" typed: a small reward. */
  chime: () => void;
  stop: () => void;
};

export function createThockSound(): ThockSound {
  const bus = getAudioBus();
  const keys = createThock(bus);
  const sfx = createSfx(bus);
  return {
    press: (code, velocity) => keys.press(code, velocity),
    release: (code) => keys.release(code),
    spaceRipple: () => keys.spaceRipple(),
    chime: () => sfx.chime(),
    stop: () => {
      keys.stop();
      sfx.stop();
    },
  };
}
