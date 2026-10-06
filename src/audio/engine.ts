/**
 * Web Audio graph. Everything is synthesised; the only "samples" are buffers computed here.
 *   sources -> (music | sfx | ambience) -> dry + reverb send -> compressor -> master -> out
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  sfx!: GainNode;
  ambience!: GainNode;
  reverbIn!: GainNode;
  private noiseBuf!: AudioBuffer;
  private ksCache = new Map<string, AudioBuffer>();
  volume = { master: 0.8, music: 0.7, sfx: 0.85 };

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture. */
  start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx({ latencyHint: 'interactive' });
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume.master;
    comp.connect(this.master);
    this.master.connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(3.8, 2.6);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 1;
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.55;
    this.reverbIn.connect(reverb);
    reverb.connect(reverbOut);
    reverbOut.connect(comp);

    const bus = (vol: number, send: number) => {
      const g = ctx.createGain();
      g.gain.value = vol;
      g.connect(comp);
      const s = ctx.createGain();
      s.gain.value = send;
      g.connect(s);
      s.connect(this.reverbIn);
      return g;
    };
    this.music = bus(this.volume.music, 0.7);
    this.sfx = bus(this.volume.sfx, 0.25);
    this.ambience = bus(0.6, 0.3);

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  setVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volume.master, t, 0.05);
    this.music.gain.setTargetAtTime(this.volume.music, t, 0.05);
    this.sfx.gain.setTargetAtTime(this.volume.sfx, t, 0.05);
  }

  /** Decaying noise with damped highs: a hall made of paper and wood. */
  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.pow(1 - i / len, decay) * Math.exp(-t * 1.2);
        const n = Math.random() * 2 - 1;
        // damping: the tail grows darker
        const k = 0.15 + 0.8 * Math.exp(-t * 2.2);
        lp += (n - lp) * k;
        d[i] = lp * env * (t < 0.012 ? t / 0.012 : 1);
      }
      // a few early reflections
      for (let e = 0; e < 6; e++) {
        const at = Math.floor(ctx.sampleRate * (0.015 + Math.random() * 0.06));
        d[at] += (Math.random() * 0.5 + 0.3) * (Math.random() < 0.5 ? -1 : 1);
      }
    }
    return buf;
  }

  noise(): AudioBuffer {
    return this.noiseBuf;
  }

  /** Karplus-Strong plucked string, computed offline and cached. */
  ksBuffer(freq: number, decay = 3, bright = 0.5): AudioBuffer {
    const ctx = this.ctx!;
    const key = `${Math.round(freq * 4)}:${decay.toFixed(1)}:${bright.toFixed(2)}`;
    const hit = this.ksCache.get(key);
    if (hit) return hit;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * decay);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq));
    const line = new Float32Array(N);
    // excitation: noise shaped by brightness, plucked off-centre
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const n = Math.random() * 2 - 1;
      lp += (n - lp) * (0.25 + bright * 0.7);
      line[i] = lp;
    }
    // damping chosen so the note fades over ~decay seconds
    const loss = Math.pow(0.001, 1 / (decay * freq));
    let idx = 0;
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx];
      const nxt = line[(idx + 1) % N];
      const avg = (cur * (0.5 + bright * 0.2) + nxt * (0.5 - bright * 0.2));
      line[idx] = avg * loss;
      out[i] = cur * 0.7 + prev * 0.3;
      prev = cur;
      idx = (idx + 1) % N;
    }
    // body: tiny fade-in to avoid click
    for (let i = 0; i < 32 && i < len; i++) out[i] *= i / 32;
    if (this.ksCache.size > 300) this.ksCache.clear();
    this.ksCache.set(key, buf);
    return buf;
  }
}

export const audio = new AudioEngine();
