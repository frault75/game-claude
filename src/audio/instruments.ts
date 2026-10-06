/** Synthesised instruments: plucked zither, bell, bamboo flute, bowed fiddle, drum, woodblock. */
import { audio } from './engine';

export interface NoteOpts {
  vel?: number;
  pan?: number;
  dest?: AudioNode;
}

function out(o: NoteOpts, fallback: AudioNode): AudioNode {
  const ctx = audio.ctx!;
  const dest = o.dest ?? fallback;
  if (o.pan !== undefined && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    p.connect(dest);
    return p;
  }
  return dest;
}

export function mtof(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Zither pluck (guzheng / koto colour). */
export function pluck(freq: number, t: number, o: NoteOpts & { decay?: number; bright?: number; bend?: number } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = audio.ksBuffer(freq, o.decay ?? 3, o.bright ?? 0.5);
  if (o.bend) {
    // press-bend after the pluck, as zither players do
    src.playbackRate.setValueAtTime(1, t + 0.08);
    src.playbackRate.linearRampToValueAtTime(Math.pow(2, o.bend / 12), t + 0.35);
  }
  const g = ctx.createGain();
  g.gain.value = (o.vel ?? 0.6) * 0.9;
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 420;
  body.Q.value = 1.2;
  body.gain.value = 5;
  src.connect(body);
  body.connect(g);
  g.connect(out(o, audio.music));
  src.start(t);
}

/** Temple bell: inharmonic partials, long decay. */
export function bell(freq: number, t: number, o: NoteOpts & { decay?: number } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const partials: [number, number, number][] = [
    [0.5, 0.35, 1.4], [1, 1, 1], [1.19, 0.3, 0.7], [2.0, 0.45, 0.6], [2.76, 0.35, 0.45], [5.4, 0.15, 0.25], [8.93, 0.06, 0.15],
  ];
  const dec = o.decay ?? 4;
  const dest = out(o, audio.music);
  const v = o.vel ?? 0.5;
  for (const [ratio, amp, dk] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio * (1 + (Math.random() - 0.5) * 0.002);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v * amp * 0.25, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec * dk);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dec * dk + 0.05);
  }
}

/** Bamboo flute: breathy sine with vibrato that blooms. */
export function flute(freq: number, t: number, dur: number, o: NoteOpts & { scoop?: boolean } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const v = o.vel ?? 0.4;
  const dest = out(o, audio.music);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  const f0 = o.scoop ? freq * 0.94 : freq;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.12);
  osc2.frequency.setValueAtTime(f0 * 2, t);
  osc2.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.12);
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.2;
  const vibG = ctx.createGain();
  vibG.gain.setValueAtTime(0, t);
  vibG.gain.linearRampToValueAtTime(freq * 0.012, t + Math.min(dur, 0.6));
  vib.connect(vibG);
  vibG.connect(osc.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * 0.22, t + 0.09);
  g.gain.setValueAtTime(v * 0.22, t + Math.max(0.1, dur - 0.15));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
  const g2 = ctx.createGain();
  g2.gain.value = 0.12;
  osc.connect(g);
  osc2.connect(g2);
  g2.connect(g);
  // breath
  const n = ctx.createBufferSource();
  n.buffer = audio.noise();
  n.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq * 2;
  bp.Q.value = 2.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(v * 0.08, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(v * 0.025, t + 0.25);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
  n.connect(bp);
  bp.connect(ng);
  ng.connect(dest);
  g.connect(dest);
  const end = t + dur + 0.4;
  for (const s of [osc, osc2, vib]) { s.start(t); s.stop(end); }
  n.start(t, Math.random());
  n.stop(end);
}

/** Bowed two-string fiddle: sawtooth through vowel-like formants, slides between notes. */
export function bowed(freq: number, t: number, dur: number, o: NoteOpts & { from?: number } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const v = o.vel ?? 0.4;
  const dest = out(o, audio.music);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  if (o.from) {
    osc.frequency.setValueAtTime(o.from, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.18);
  } else osc.frequency.setValueAtTime(freq, t);
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.8;
  const vibG = ctx.createGain();
  vibG.gain.setValueAtTime(0, t);
  vibG.gain.linearRampToValueAtTime(freq * 0.018, t + Math.min(dur * 0.7, 0.8));
  vib.connect(vibG);
  vibG.connect(osc.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  const f1 = ctx.createBiquadFilter();
  f1.type = 'peaking'; f1.frequency.value = 800; f1.Q.value = 2; f1.gain.value = 9;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'peaking'; f2.frequency.value = 1700; f2.Q.value = 3; f2.gain.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * 0.1, t + 0.18);
  g.gain.setValueAtTime(v * 0.1, t + Math.max(0.2, dur - 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
  osc.connect(lp); lp.connect(f1); f1.connect(f2); f2.connect(g); g.connect(dest);
  const end = t + dur + 0.5;
  osc.start(t); osc.stop(end);
  vib.start(t); vib.stop(end);
}

/** Low drum: pitched thump plus skin noise. */
export function drum(freq: number, t: number, o: NoteOpts & { decay?: number } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const v = o.vel ?? 0.7;
  const dest = out(o, audio.music);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 2.2, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  const g = ctx.createGain();
  const dec = o.decay ?? 0.7;
  g.gain.setValueAtTime(v * 0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dec + 0.05);
  const n = ctx.createBufferSource();
  n.buffer = audio.noise();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(v * 0.35, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  n.connect(lp); lp.connect(ng); ng.connect(dest);
  n.start(t, Math.random()); n.stop(t + 0.15);
}

export function woodblock(freq: number, t: number, o: NoteOpts = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const v = o.vel ?? 0.5;
  const dest = out(o, audio.music);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(v * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.1);
  const n = ctx.createBufferSource();
  n.buffer = audio.noise();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = freq * 2.5; bp.Q.value = 8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(v * 0.6, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  n.connect(bp); bp.connect(ng); ng.connect(dest);
  n.start(t, Math.random()); n.stop(t + 0.05);
}

/** Held drone; returns a stop function. */
export function drone(freqs: number[], o: NoteOpts & { vol?: number; fade?: number } = {}): (fade?: number) => void {
  const ctx = audio.ctx;
  if (!ctx) return () => {};
  const t = ctx.currentTime;
  const dest = out(o, audio.music);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.08, t + (o.fade ?? 4));
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  lp.Q.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 260;
  lfo.connect(lfoG);
  lfoG.connect(lp.frequency);
  lfo.start(t);
  const oscs: OscillatorNode[] = [lfo];
  for (const f of freqs) {
    for (const det of [-4, 4]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.detune.value = det;
      osc.connect(lp);
      osc.start(t);
      oscs.push(osc);
    }
  }
  lp.connect(g);
  g.connect(dest);
  return (fade = 3) => {
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + fade);
    for (const osc of oscs) osc.stop(now + fade + 0.1);
  };
}

/** Soft pad: a chord of detuned triangles through a slow filter, swelling in and out. */
export function pad(freqs: number[], t: number, dur: number, o: NoteOpts & { bright?: number } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const v = o.vel ?? 0.3;
  const dest = out(o, audio.music);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  const bright = o.bright ?? 0.5;
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.linearRampToValueAtTime(500 + bright * 1400, t + Math.min(dur * 0.5, 2));
  lp.frequency.linearRampToValueAtTime(400, t + dur + 1.5);
  lp.Q.value = 0.6;
  const g = ctx.createGain();
  const att = Math.min(1.6, dur * 0.4);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * 0.07, t + att);
  g.gain.setValueAtTime(v * 0.07, t + Math.max(att, dur - 0.2));
  g.gain.linearRampToValueAtTime(0, t + dur + 1.6);
  lp.connect(g);
  g.connect(dest);
  const end = t + dur + 1.7;
  for (const f of freqs) {
    for (const det of [-7, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.detune.value = det + (Math.random() - 0.5) * 3;
      osc.connect(lp);
      osc.start(t);
      osc.stop(end);
    }
  }
}

/** Round plucked bass: a sine body and a short bright attack. */
export function bass(freq: number, t: number, o: NoteOpts & { dur?: number } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const v = o.vel ?? 0.5;
  const dest = out(o, audio.music);
  const dur = o.dur ?? 0.5;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(freq, t);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1400, t);
  lp.frequency.exponentialRampToValueAtTime(240, t + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * 0.5, t + 0.012);
  g.gain.exponentialRampToValueAtTime(v * 0.2, t + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  osc.connect(g);
  osc2.connect(g2);
  g2.connect(lp);
  lp.connect(g);
  g.connect(dest);
  const end = t + dur + 0.3;
  osc.start(t); osc.stop(end);
  osc2.start(t); osc2.stop(end);
}

/** A soft shaker / brushed skin for quick rhythms. */
export function shaker(t: number, o: NoteOpts & { bright?: number } = {}): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const v = o.vel ?? 0.3;
  const dest = out(o, audio.music);
  const n = ctx.createBufferSource();
  n.buffer = audio.noise();
  const hp = ctx.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.value = 3000 + (o.bright ?? 0.5) * 4000;
  hp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v * 0.25, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  n.connect(hp); hp.connect(g); g.connect(dest);
  n.start(t, Math.random()); n.stop(t + 0.09);
}
