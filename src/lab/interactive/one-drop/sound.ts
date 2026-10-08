/**
 * Opt-in water sounds, synthesized (no assets): a drop is a sine "plink" whose pitch falls as the
 * cavity it opens closes, a breath of filtered noise for the splash, and for a heavy drop a low
 * bloop; everything goes through a short synthetic room so it sounds like it is in a bowl.
 */
export type Plinker = { plink: (weight: number, small: boolean) => void; close: () => void };

export function createPlinker(): Plinker | null {
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();
  const out = ac.createGain();
  out.gain.value = 0.55;
  out.connect(ac.destination);

  // A small room: decaying stereo noise as the impulse response.
  const len = Math.floor(ac.sampleRate * 1.4);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const room = ac.createConvolver();
  room.buffer = ir;
  const wet = ac.createGain();
  wet.gain.value = 0.32;
  room.connect(wet).connect(out);

  const noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.08), ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const voice = (dest: AudioNode[]) => {
    const g = ac.createGain();
    dest.forEach((d) => g.connect(d));
    return g;
  };

  const plink = (w: number, small: boolean) => {
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime + 0.005;
    const level = small ? 0.12 : 0.22 + 0.12 * w;
    const f0 = (small ? 1900 : 1250 - 520 * w) * (0.94 + Math.random() * 0.12);

    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0 * 0.62, t);
    // The cavity closes: the pitch rises quickly (the classic drop chirp), then holds.
    osc.frequency.exponentialRampToValueAtTime(f0, t + 0.035);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.06, t + 0.2);
    const g = voice([out, room]);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (small ? 0.12 : 0.22 + 0.25 * w));
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.6);

    const n = ac.createBufferSource();
    n.buffer = noise;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = small ? 4200 : 2600;
    bp.Q.value = 0.9;
    const ng = voice([out, room]);
    ng.gain.setValueAtTime(level * 0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(bp).connect(ng);
    n.start(t);

    if (!small && w > 0.35) {
      const lo = ac.createOscillator();
      lo.type = "sine";
      lo.frequency.setValueAtTime(180 + 60 * (1 - w), t);
      lo.frequency.exponentialRampToValueAtTime(120, t + 0.5);
      const lg = voice([out, room]);
      lg.gain.setValueAtTime(0.0001, t);
      lg.gain.exponentialRampToValueAtTime(0.18 * w, t + 0.02);
      lg.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      lo.connect(lg);
      lo.start(t);
      lo.stop(t + 0.8);
    }
  };

  return {
    plink,
    close: () => {
      void ac.close();
    },
  };
}
