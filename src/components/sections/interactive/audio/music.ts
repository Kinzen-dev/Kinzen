/*
 * Cozy lo-fi under the night desk: warm electric-piano chords, soft swung drums, a round bass and
 * vinyl crackle. The piece is composed and synthesized offline (tools/music-score.ts, rendered by
 * tools/build-assets.mts into public/audio/cozy-loop.*), eight bars at 72 BPM rendered twice so
 * the reverb and the last notes' tails wrap into the first bar: the loop has no seam to hear.
 * start() before the first gesture waits for it; the loop fades in over 2.5 s and out over 0.6 s.
 * setVolume(v) is linear gain on the stem (1 = its mastered level, about -22 LUFS).
 */
import { MUSIC } from "./assets";
import { isOffline, isUnlocked, type AudioBus } from "./audio-bus";
import { clock } from "./clock";
import { buildLoop, loadAudio } from "./loader";

export type CozyMusic = {
  start(): void;
  stop(): void;
  setVolume(v: number): void;
};

const FADE_IN = 2.5;
const FADE_OUT = 0.6;

export function createCozyMusic(bus: AudioBus): CozyMusic {
  const { ctx } = bus;
  let volume = 1;
  let want = false;
  let gen = 0;
  let voice: { src: AudioBufferSourceNode; fade: GainNode; vol: GainNode } | null = null;
  let unsub: (() => void) | null = null;

  const play = async (my: number) => {
    let buf: AudioBuffer;
    try {
      buf = buildLoop(ctx, await loadAudio(ctx, MUSIC.name), MUSIC.loop);
    } catch {
      return;
    }
    if (my !== gen || !want) return;
    const vol = new GainNode(ctx, { gain: volume });
    const fade = new GainNode(ctx, { gain: 0 });
    const src = new AudioBufferSourceNode(ctx, { buffer: buf, loop: true });
    src.connect(fade).connect(vol).connect(bus.master);
    const t = ctx.currentTime;
    fade.gain.setValueAtTime(0, t);
    fade.gain.linearRampToValueAtTime(1, t + FADE_IN);
    src.start(t);
    voice = { src, fade, vol };
  };

  const release = () => {
    const v = voice;
    voice = null;
    if (!v) return;
    const t = ctx.currentTime;
    v.fade.gain.cancelScheduledValues(t);
    v.fade.gain.setValueAtTime(v.fade.gain.value, t);
    v.fade.gain.linearRampToValueAtTime(0, t + FADE_OUT);
    const free = () => {
      try {
        v.src.stop();
      } catch {
        // Never started.
      }
      v.src.disconnect();
      v.vol.disconnect();
      v.src.buffer = null;
    };
    if (isOffline(bus)) v.src.stop(t + FADE_OUT);
    else clock.set(free, FADE_OUT * 1000 + 80);
  };

  const begin = () => {
    if (!want || voice) return;
    void play(++gen);
  };

  return {
    start() {
      if (want) return;
      want = true;
      if (isUnlocked(bus)) begin();
      else if (!unsub)
        unsub = bus.onChange(() => {
          if (!isUnlocked(bus)) return;
          unsub?.();
          unsub = null;
          begin();
        });
    },
    stop() {
      want = false;
      gen++;
      unsub?.();
      unsub = null;
      release();
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1.5, Number.isFinite(v) ? v : 0));
      if (voice) voice.vol.gain.setTargetAtTime(volume, ctx.currentTime, 0.3);
    },
  };
}
