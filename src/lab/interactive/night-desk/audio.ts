/*
 * Designed sound, all synthesised except the greeting: rain on the glass at night, the lamp's
 * switch, the phone's bell, ceramic and paper knocks, a purr. Off until the visitor turns it on
 * (the AudioContext is only created inside that click). Every hit is quiet and short; nothing
 * loops but the rain.
 */

export type KnockKind = "mug" | "pen" | "ball" | "desk" | "floor" | "wall" | "phone" | "lamp";

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private rainGain: GainNode | null = null;
  private roomGain: GainNode | null = null;
  private clip: AudioBufferSourceNode | null = null;
  on = false;

  /** Call from a user gesture. */
  async enable(on: boolean) {
    this.on = on;
    if (on && !this.ctx) this.boot();
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (on && ctx.state !== "running") await ctx.resume().catch(() => undefined);
    this.master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.15);
    if (!on) this.stopClip();
  }

  private boot() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    master.connect(comp).connect(ctx.destination);
    this.master = master;
    // Two seconds of noise, reused by every noisy sound.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // The rain bed: a low patter and a high hiss.
    const rain = ctx.createGain();
    rain.gain.value = 0;
    rain.connect(master);
    this.rainGain = rain;
    const low = this.loop(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    low.connect(lp).connect(rain);
    const hi = this.loop(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 5200;
    bp.Q.value = 0.6;
    const hg = ctx.createGain();
    hg.gain.value = 0.35;
    hi.connect(bp).connect(hg).connect(rain);
    // A city hum for the daytime.
    const room = ctx.createGain();
    room.gain.value = 0;
    room.connect(master);
    this.roomGain = room;
    const hum = this.loop(ctx);
    const hl = ctx.createBiquadFilter();
    hl.type = "lowpass";
    hl.frequency.value = 220;
    hum.connect(hl).connect(room);
  }

  private loop(ctx: AudioContext) {
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random();
    s.start(0, Math.random() * 2);
    return s;
  }

  /** Rain and room levels follow the window (call every second or so). */
  ambience(rain: number, day: number) {
    const ctx = this.ctx;
    if (!ctx || !this.rainGain || !this.roomGain) return;
    this.rainGain.gain.setTargetAtTime(rain * 0.075, ctx.currentTime, 0.8);
    this.roomGain.gain.setTargetAtTime(day * 0.05, ctx.currentTime, 0.8);
  }

  private live(): AudioContext | null {
    return this.on && this.ctx && this.master && this.ctx.state === "running" ? this.ctx : null;
  }

  private tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = "sine") {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master!);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  private burst(at: number, dur: number, gain: number, type: BiquadFilterType, freq: number, q = 1) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f).connect(g).connect(this.master!);
    s.start(at, Math.random() * 1.5, dur + 0.05);
  }

  click(on: boolean) {
    const ctx = this.live();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.burst(t, 0.03, 0.5, "highpass", 3000);
    this.tone(on ? 1900 : 1500, t, 0.05, 0.08, "triangle");
    this.burst(t + 0.05, 0.04, 0.25, "bandpass", 1200, 3);
  }

  /** Two rings of an old desk bell (hammer at ~20 Hz on two detuned bells). Returns its length. */
  ring(): number {
    const ctx = this.live();
    if (!ctx) return 2.6;
    const t0 = ctx.currentTime + 0.02;
    for (const start of [0, 1.5]) {
      const at = t0 + start;
      for (let k = 0; k < 22; k++) {
        const hit = at + k * 0.05;
        this.tone(1180, hit, 0.18, 0.05, "sine");
        this.tone(1630, hit, 0.14, 0.03, "sine");
        this.tone(2410, hit, 0.08, 0.015, "sine");
      }
    }
    return 2.6;
  }

  knock(kind: KnockKind, speed: number) {
    const ctx = this.live();
    if (!ctx) return;
    const t = ctx.currentTime;
    const v = Math.min(1, speed / 2);
    switch (kind) {
      case "mug":
        this.tone(1320 + Math.random() * 80, t, 0.25, 0.09 * v, "sine");
        this.tone(3150, t, 0.12, 0.04 * v);
        this.burst(t, 0.06, 0.2 * v, "lowpass", 600);
        break;
      case "pen":
        this.tone(2600 + Math.random() * 400, t, 0.05, 0.06 * v, "triangle");
        this.burst(t, 0.03, 0.2 * v, "highpass", 2500);
        break;
      case "ball":
        this.burst(t, 0.09, 0.35 * v, "bandpass", 2400, 0.8);
        this.burst(t + 0.03, 0.07, 0.2 * v, "bandpass", 4200, 1);
        break;
      case "phone":
        // The bell inside the phone answers a knock.
        this.tone(1180, t, 0.5, 0.04 * v);
        this.tone(1630, t, 0.35, 0.02 * v);
        this.burst(t, 0.05, 0.3 * v, "lowpass", 900);
        break;
      case "lamp":
        this.tone(740, t, 0.3, 0.05 * v, "triangle");
        this.burst(t, 0.05, 0.3 * v, "lowpass", 900);
        break;
      case "floor":
        this.burst(t, 0.16, 0.7 * v, "lowpass", 260);
        break;
      default:
        this.burst(t, 0.1, 0.45 * v, "lowpass", 420);
    }
  }

  purr() {
    const ctx = this.live();
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let k = 0; k < 24; k++) this.burst(t + k * 0.042, 0.04, 0.22, "lowpass", 180 + (k % 2) * 40);
    this.tone(620, t + 0.05, 0.18, 0.03, "triangle");
  }

  thunder() {
    const ctx = this.live();
    if (!ctx) return;
    const t = ctx.currentTime + 0.6;
    this.burst(t, 2.4, 0.5, "lowpass", 140);
    this.burst(t + 0.15, 1.6, 0.25, "lowpass", 320);
  }

  /** Play a decoded clip through a phone-line band (300 Hz to 3.4 kHz). */
  playClip(buf: AudioBuffer) {
    const ctx = this.live();
    if (!ctx) return;
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
    s.connect(hp).connect(lp).connect(g).connect(this.master!);
    s.start();
    this.clip = s;
  }

  stopClip() {
    try {
      this.clip?.stop();
    } catch {
      /* already stopped */
    }
    this.clip = null;
  }

  dispose() {
    this.stopClip();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
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
