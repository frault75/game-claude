/** Sound effects. Every wind-up has a rising sound; every impact a dry brush crack. */
import { audio } from './engine';
import { pluck, bell, woodblock, mtof } from './instruments';

function now(): number {
  return audio.ctx ? audio.ctx.currentTime : 0;
}

function noiseBurst(t: number, dur: number, o: { type?: BiquadFilterType; f0: number; f1?: number; q?: number; vol: number; dest?: AudioNode; attack?: number }): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const n = ctx.createBufferSource();
  n.buffer = audio.noise();
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.Q.value = o.q ?? 1.2;
  f.frequency.setValueAtTime(o.f0, t);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol, t + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f); f.connect(g); g.connect(o.dest ?? audio.sfx);
  n.start(t, Math.random() * 1.5);
  n.stop(t + dur + 0.02);
}

function tone(t: number, dur: number, f0: number, f1: number, vol: number, type: OscillatorType = 'sine', dest?: AudioNode): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest ?? audio.sfx);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  strike(combo = 0): void {
    const t = now();
    noiseBurst(t, 0.16, { f0: 3800 - combo * 600, f1: 700, q: 1.6, vol: 0.35 });
    noiseBurst(t + 0.02, 0.08, { type: 'lowpass', f0: 500, vol: 0.12 });
  },
  dodge(): void {
    const t = now();
    noiseBurst(t, 0.26, { f0: 900, f1: 2600, q: 0.8, vol: 0.22, attack: 0.04 });
  },
  cast(): void {
    const t = now();
    noiseBurst(t, 0.12, { f0: 2000, f1: 5000, q: 2, vol: 0.12 });
    tone(t, 0.12, 700, 1400, 0.05, 'triangle');
  },
  /** Taut string: pitch follows the length, like a zither string. */
  attach(length: number): void {
    const t = now();
    const f = Math.max(150, Math.min(900, 1100 / Math.max(1, length) + 120));
    pluck(f, t, { vel: 0.75, decay: 2.2, bright: 0.65, dest: audio.sfx, bend: 0.4 });
    woodblock(1800, t, { vel: 0.2, dest: audio.sfx });
  },
  tie(length: number): void {
    const t = now();
    const f = Math.max(150, Math.min(900, 1100 / Math.max(1, length) + 120));
    pluck(f, t, { vel: 0.7, decay: 3, bright: 0.6, dest: audio.sfx });
    pluck(f * 1.5, t + 0.07, { vel: 0.5, decay: 2.5, bright: 0.6, dest: audio.sfx });
  },
  miss(): void {
    const t = now();
    noiseBurst(t, 0.18, { f0: 2500, f1: 900, q: 1, vol: 0.08 });
  },
  release(): void {
    const t = now();
    tone(t, 0.12, 500, 260, 0.06, 'triangle');
  },
  reelTick(length: number): void {
    const t = now();
    woodblock(900 + 1600 / Math.max(1, length), t, { vel: 0.12, dest: audio.sfx });
  },
  snap(): void {
    const t = now();
    noiseBurst(t, 0.1, { f0: 4000, f1: 1500, q: 3, vol: 0.25 });
    tone(t, 0.25, 900, 200, 0.12, 'sawtooth');
  },
  hit(): void {
    const t = now();
    noiseBurst(t, 0.18, { type: 'lowpass', f0: 1800, f1: 300, vol: 0.4 });
    tone(t, 0.14, 220, 70, 0.3);
  },
  clink(): void {
    const t = now();
    bell(1400, t, { vel: 0.3, decay: 1.2, dest: audio.sfx });
    noiseBurst(t, 0.05, { f0: 5000, q: 4, vol: 0.15 });
  },
  hurt(): void {
    const t = now();
    // paper tearing: noise gated by rapid crackle
    const ctx = audio.ctx;
    if (!ctx) return;
    for (let i = 0; i < 7; i++) {
      noiseBurst(t + i * 0.025 + Math.random() * 0.01, 0.05, { f0: 1800 + Math.random() * 1500, q: 2, vol: 0.22 });
    }
    tone(t, 0.3, 300, 90, 0.2);
  },
  fall(): void {
    const t = now();
    noiseBurst(t, 0.6, { type: 'lowpass', f0: 1200, f1: 200, vol: 0.3, attack: 0.05 });
    tone(t, 0.5, 400, 80, 0.12);
  },
  telegraph(kind: 'low' | 'mid' | 'high' = 'mid', dur = 0.8): void {
    const t = now();
    const base = kind === 'low' ? 110 : kind === 'mid' ? 220 : 440;
    tone(t, dur, base, base * 2, 0.06, 'triangle');
    noiseBurst(t, dur, { f0: base * 4, f1: base * 10, q: 6, vol: 0.05, attack: dur * 0.8 });
  },
  impact(heavy = false): void {
    const t = now();
    noiseBurst(t, heavy ? 0.4 : 0.2, { type: 'lowpass', f0: heavy ? 900 : 2200, f1: 120, vol: heavy ? 0.55 : 0.3 });
    tone(t, heavy ? 0.5 : 0.2, heavy ? 120 : 200, 40, heavy ? 0.5 : 0.25);
  },
  splash(): void {
    const t = now();
    noiseBurst(t, 0.5, { f0: 1200, f1: 400, q: 0.7, vol: 0.3 });
    for (let i = 0; i < 4; i++) tone(t + i * 0.05, 0.08, 600 + Math.random() * 800, 1500, 0.05);
  },
  inkstone(): void {
    const t = now();
    tone(t, 0.12, 1200, 700, 0.12);
    tone(t + 0.12, 0.2, 900, 500, 0.08);
    bell(mtof(74), t + 0.2, { vel: 0.35, decay: 3, dest: audio.sfx });
  },
  stagger(): void {
    const t = now();
    bell(mtof(50), t, { vel: 0.7, decay: 5, dest: audio.sfx });
  },
  bossHit(): void {
    sfx.hit();
    const t = now();
    woodblock(300, t, { vel: 0.4, dest: audio.sfx });
  },
  fire(): void {
    const t = now();
    for (let i = 0; i < 10; i++) noiseBurst(t + i * 0.04 + Math.random() * 0.03, 0.04, { f0: 2500 + Math.random() * 3000, q: 3, vol: 0.08 });
    noiseBurst(t, 0.5, { type: 'lowpass', f0: 600, vol: 0.12, attack: 0.1 });
  },
  ui(): void {
    woodblock(1100, now(), { vel: 0.25, dest: audio.sfx });
  },
  uiConfirm(): void {
    const t = now();
    pluck(mtof(74), t, { vel: 0.5, decay: 2, dest: audio.sfx });
    pluck(mtof(81), t + 0.06, { vel: 0.35, decay: 2, dest: audio.sfx });
  },
};

/** Continuous ambience layers (rain, wind, water). */
export class Ambience {
  private nodes: { gain: GainNode; stop: () => void }[] = [];

  rain(vol = 0.25): void {
    const ctx = audio.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = audio.noise();
    n.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 600;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.35, t + 3);
    n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(audio.ambience);
    n.start(t);
    // drops on leaves
    let alive = true;
    const drip = () => {
      if (!alive || !audio.ctx) return;
      const tt = audio.ctx.currentTime;
      const o = audio.ctx.createOscillator();
      o.type = 'sine';
      const f = 1500 + Math.random() * 2500;
      o.frequency.setValueAtTime(f, tt);
      o.frequency.exponentialRampToValueAtTime(f * 0.6, tt + 0.03);
      const dg = audio.ctx.createGain();
      dg.gain.setValueAtTime(vol * 0.06 * Math.random(), tt);
      dg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04);
      o.connect(dg); dg.connect(g);
      o.start(tt); o.stop(tt + 0.05);
      setTimeout(drip, 40 + Math.random() * 160);
    };
    drip();
    this.nodes.push({ gain: g, stop: () => { alive = false; n.stop(); } });
  }

  wind(vol = 0.2, center = 500): void {
    const ctx = audio.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = audio.noise();
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = center; bp.Q.value = 1.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lg = ctx.createGain();
    lg.gain.value = center * 0.6;
    lfo.connect(lg); lg.connect(bp.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.5, t + 4);
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.13;
    const lg2 = ctx.createGain();
    lg2.gain.value = vol * 0.25;
    lfo2.connect(lg2); lg2.connect(g.gain);
    n.connect(bp); bp.connect(g); g.connect(audio.ambience);
    n.start(t); lfo.start(t); lfo2.start(t);
    this.nodes.push({ gain: g, stop: () => { n.stop(); lfo.stop(); lfo2.stop(); } });
  }

  water(vol = 0.2): void {
    const ctx = audio.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = audio.noise();
    n.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.4, t + 3);
    n.connect(lp); lp.connect(g); g.connect(audio.ambience);
    n.start(t);
    let alive = true;
    const bubble = () => {
      if (!alive || !audio.ctx) return;
      const tt = audio.ctx.currentTime;
      const o = audio.ctx.createOscillator();
      const f = 300 + Math.random() * 500;
      o.frequency.setValueAtTime(f, tt);
      o.frequency.exponentialRampToValueAtTime(f * 1.8, tt + 0.06);
      const bg = audio.ctx.createGain();
      bg.gain.setValueAtTime(vol * 0.08, tt);
      bg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.08);
      o.connect(bg); bg.connect(g);
      o.start(tt); o.stop(tt + 0.1);
      setTimeout(bubble, 120 + Math.random() * 500);
    };
    bubble();
    this.nodes.push({ gain: g, stop: () => { alive = false; n.stop(); } });
  }

  stopAll(fade = 2): void {
    const ctx = audio.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const nd of this.nodes) {
      nd.gain.gain.cancelScheduledValues(t);
      nd.gain.gain.setValueAtTime(nd.gain.gain.value, t);
      nd.gain.gain.linearRampToValueAtTime(0, t + fade);
      const s = nd.stop;
      setTimeout(s, fade * 1000 + 100);
    }
    this.nodes = [];
  }
}
