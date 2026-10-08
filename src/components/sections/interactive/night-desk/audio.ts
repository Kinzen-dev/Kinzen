import { createCozyMusic, createRain, createSfx, getAudioBus, type AudioBus } from "../sound";

/*
 * The desk's sound, on the section's shared audio bus (one AudioContext for the whole section,
 * unlocked by the visitor's first gesture, muted by the section toggle): rain on the glass that
 * follows the window, quiet background music, the lamp's switch, the phone's bell, knocks, and
 * the greeting clip through a phone-line band. Everything this scene starts, it stops on dispose.
 */

export type KnockKind = "mug" | "pen" | "ball" | "desk" | "floor" | "wall" | "phone" | "lamp";

/** How heavy each thing sounds when it hits (the bus's drop voice takes a weight 0..1). */
const WEIGHT: Record<KnockKind, number> = {
  mug: 0.45,
  pen: 0.1,
  ball: 0.25,
  desk: 0.6,
  floor: 0.9,
  wall: 0.7,
  phone: 0.5,
  lamp: 0.4,
};

export class Sound {
  private bus: AudioBus;
  private sfx: ReturnType<typeof createSfx>;
  private rain: ReturnType<typeof createRain>;
  private music: ReturnType<typeof createCozyMusic>;
  private clip: AudioBufferSourceNode | null = null;
  private ringing: (() => void) | null = null;

  constructor() {
    this.bus = getAudioBus();
    this.sfx = createSfx(this.bus);
    this.rain = createRain(this.bus);
    this.music = createCozyMusic(this.bus);
    this.music.setVolume(0.55);
    this.music.start();
  }

  /** Rain follows the window (call every half second or so); the music sits lower by day. */
  ambience(rain: number, day: number) {
    this.rain.setIntensity(rain);
    this.music.setVolume(0.55 - day * 0.2);
  }

  click(on: boolean) {
    this.sfx.lamp(on);
  }

  /** Two rings of the desk bell. Returns its length in seconds. */
  ring(): number {
    this.ringing?.();
    this.ringing = this.sfx.phoneRing();
    return 2.6;
  }

  knock(kind: KnockKind, speed: number) {
    const v = Math.min(1, speed / 2);
    if (v < 0.05) return;
    if (kind === "phone" || kind === "lamp") this.sfx.metalClink(v * 0.6);
    else this.sfx.drop(WEIGHT[kind] * (0.5 + v * 0.5));
  }

  purr() {
    this.sfx.drop(0.2);
  }

  thunder() {
    this.rain.thunder();
  }

  /** Play a decoded clip through a phone-line band (300 Hz to 3.4 kHz). */
  playClip(buf: AudioBuffer) {
    const { ctx, master } = this.bus;
    this.stopClip();
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 300;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3400;
    const g = ctx.createGain();
    g.gain.value = 0.9;
    s.connect(hp).connect(lp).connect(g).connect(master);
    s.start();
    this.clip = s;
  }

  stopClip() {
    try {
      this.clip?.stop();
    } catch {
      /* already stopped */
    }
    this.clip?.disconnect();
    this.clip = null;
  }

  dispose() {
    this.stopClip();
    this.ringing?.();
    this.ringing = null;
    this.sfx.stop();
    this.rain.stop();
    this.music.stop();
  }
}

/** Decode a clip without a live AudioContext (no gesture needed) and take its loudness envelope. */
export async function loadClip(url: string, points = 160): Promise<{ buffer: AudioBuffer; env: number[] }> {
  const data = await fetch(url).then((r) => r.arrayBuffer());
  const off = new OfflineAudioContext(1, 1, 44100);
  const buffer = await off.decodeAudioData(data);
  const ch = buffer.getChannelData(0);
  const env: number[] = [];
  const per = Math.floor(ch.length / points);
  let peak = 0;
  for (let i = 0; i < points; i++) {
    let sum = 0;
    for (let k = 0; k < per; k++) {
      const v = ch[i * per + k];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / per);
    env.push(rms);
    peak = Math.max(peak, rms);
  }
  return { buffer, env: env.map((v) => Math.pow(v / (peak || 1), 0.7)) };
}
