/**
 * Generative, adaptive music.
 *
 * Each area has a theme (mode, tempo, chord progressions, instruments). The music is written as it plays:
 * sections of eight bars with their own progression, a motif developed over the phrase (stated, answered,
 * resolved), and layers that fade in and out with the fight:
 *   calm      pad + a sparse lead that leaves room to breathe
 *   tension   a plucked arpeggio joins, the lead tightens
 *   combat    bass, drums (a groove that changes with each section, fills every four bars), faster tempo
 *   danger    when the child is about to fall: the band is muffled and a heartbeat comes up
 * Changing area crossfades between themes; a fight that ends resolves on the tonic.
 */
import { audio } from './engine';
import { pluck, flute, bowed, bell, drum, woodblock, pad, bass, shaker, mtof } from './instruments';
import { Rng } from '../gfx/rng';

type Inst = 'flute' | 'pluck' | 'bowed' | 'bell';

export interface Theme {
  root: number;
  scale: number[];
  bpm: number;
  /** Chord roots as scale indices; each progression is played over a section. */
  progressions: number[][];
  calmLead: Inst[];
  fightLead: Inst[];
  pad: number;
  padBright: number;
  drums: number;
  /** Lead register, in scale steps above the root. */
  register: number;
  /** Chance per bar of a bell or a drip. */
  bell: number;
  /** How often a calm phrase is left silent. */
  rest: number;
}

/** The thread motif in scale degrees; the fifth note is withheld until the end. */
export const MOTIF = [3, 4, 5, 6];
export const MOTIF_RESOLVE = 5;

const PENTA = [0, 2, 4, 7, 9];
const MINOR_PENTA = [0, 3, 5, 7, 10];
const SUS = [0, 2, 5, 7, 9];
const HIRA = [0, 2, 3, 7, 8];

export const THEMES: Record<string, Theme> = {
  orchard: {
    root: 62, scale: PENTA, bpm: 72,
    progressions: [[0, 3, 4, 0], [0, 2, 3, 4], [4, 3, 0, 0], [0, 4, 2, 3], [3, 4, 0, 2]],
    calmLead: ['flute', 'pluck', 'pluck'], fightLead: ['flute', 'bowed'],
    pad: 0.8, padBright: 0.5, drums: 0.85, register: 5, bell: 0.08, rest: 0.3,
  },
  river: {
    root: 55, scale: SUS, bpm: 66,
    progressions: [[0, 2, 3, 0], [0, 4, 3, 2], [3, 2, 0, 4], [0, 3, 0, 4]],
    calmLead: ['pluck', 'flute', 'pluck'], fightLead: ['bowed', 'flute'],
    pad: 0.75, padBright: 0.45, drums: 0.85, register: 5, bell: 0.06, rest: 0.35,
  },
  storm: {
    root: 57, scale: MINOR_PENTA, bpm: 80,
    progressions: [[0, 3, 2, 4], [0, 0, 3, 4], [4, 3, 2, 0], [0, 2, 3, 2], [3, 4, 0, 0]],
    calmLead: ['bowed', 'flute', 'pluck'], fightLead: ['bowed', 'flute', 'pluck'],
    pad: 0.85, padBright: 0.4, drums: 1, register: 5, bell: 0.05, rest: 0.25,
  },
  cave: {
    root: 50, scale: MINOR_PENTA, bpm: 60,
    progressions: [[0, 4, 3, 0], [0, 2, 0, 4], [3, 2, 0, 0], [0, 3, 4, 3]],
    calmLead: ['bowed', 'pluck', 'bell'], fightLead: ['bowed', 'pluck'],
    pad: 1, padBright: 0.25, drums: 0.9, register: 5, bell: 0.22, rest: 0.4,
  },
  temple: {
    root: 57, scale: HIRA, bpm: 62,
    progressions: [[0, 3, 4, 0], [0, 1, 3, 2], [3, 4, 0, 1], [0, 4, 3, 1]],
    calmLead: ['bell', 'flute', 'pluck'], fightLead: ['flute', 'bowed'],
    pad: 0.9, padBright: 0.35, drums: 0.95, register: 5, bell: 0.18, rest: 0.35,
  },
  hills: {
    root: 57, scale: MINOR_PENTA, bpm: 56,
    progressions: [[0, 3, 4, 0], [0, 2, 3, 4]],
    calmLead: ['bowed', 'pluck'], fightLead: ['bowed'],
    pad: 0.8, padBright: 0.4, drums: 0.8, register: 5, bell: 0.1, rest: 0.35,
  },
  studio: {
    root: 64, scale: [0, 3, 5, 8, 10], bpm: 50,
    progressions: [[0, 3, 4, 0]],
    calmLead: ['bell', 'pluck'], fightLead: ['pluck'],
    pad: 0.6, padBright: 0.5, drums: 0.6, register: 5, bell: 0.15, rest: 0.5,
  },
  blank: {
    root: 62, scale: PENTA, bpm: 50,
    progressions: [[0, 3, 0, 4]],
    calmLead: ['pluck'], fightLead: ['pluck'],
    pad: 0.5, padBright: 0.4, drums: 0.5, register: 5, bell: 0.05, rest: 0.6,
  },
  // Act I's zones: the firefly marshes, the plum plain, the crow heath
  marsh: {
    root: 53, scale: MINOR_PENTA, bpm: 58,
    progressions: [[0, 3, 0, 4], [0, 2, 3, 0], [3, 4, 0, 0]],
    calmLead: ['bell', 'pluck', 'bowed'], fightLead: ['bowed', 'pluck'],
    pad: 1, padBright: 0.3, drums: 0.8, register: 5, bell: 0.24, rest: 0.42,
  },
  plain: {
    root: 64, scale: PENTA, bpm: 82,
    progressions: [[0, 3, 4, 0], [0, 4, 2, 3], [3, 4, 0, 2], [0, 2, 4, 3]],
    calmLead: ['pluck', 'flute', 'pluck'], fightLead: ['flute', 'pluck'],
    pad: 0.7, padBright: 0.6, drums: 0.95, register: 5, bell: 0.06, rest: 0.25,
  },
  heath: {
    root: 52, scale: HIRA, bpm: 70,
    progressions: [[0, 1, 3, 0], [0, 4, 3, 1], [3, 1, 0, 4]],
    calmLead: ['bowed', 'flute'], fightLead: ['bowed', 'pluck'],
    pad: 0.9, padBright: 0.35, drums: 0.9, register: 5, bell: 0.1, rest: 0.35,
  },
  // Act II: the rice terraces, the misty pass, the reed village, the bamboo, the lotus lake, the pagoda
  terraces: {
    root: 60, scale: [0, 2, 5, 7, 9], bpm: 76,
    progressions: [[0, 3, 4, 0], [0, 4, 2, 3], [3, 4, 0, 2], [0, 2, 3, 4], [4, 3, 2, 0]],
    calmLead: ['flute', 'flute', 'pluck'], fightLead: ['flute', 'bowed'],
    pad: 0.75, padBright: 0.6, drums: 0.8, register: 5, bell: 0.12, rest: 0.28,
  },
  pass: {
    root: 52, scale: SUS, bpm: 58,
    progressions: [[0, 3, 0, 4], [0, 2, 3, 0], [4, 3, 0, 0]],
    calmLead: ['bowed', 'flute'], fightLead: ['bowed', 'pluck'],
    pad: 0.95, padBright: 0.3, drums: 0.65, register: 5, bell: 0.08, rest: 0.45,
  },
  reeds: {
    root: 62, scale: [0, 2, 4, 7, 9], bpm: 70,
    progressions: [[0, 3, 4, 0], [0, 2, 3, 4], [3, 0, 4, 0]],
    calmLead: ['pluck', 'flute', 'pluck'], fightLead: ['flute'],
    pad: 0.7, padBright: 0.55, drums: 0.7, register: 5, bell: 0.1, rest: 0.32,
  },
  bamboo: {
    root: 55, scale: MINOR_PENTA, bpm: 88,
    progressions: [[0, 3, 2, 4], [0, 0, 3, 4], [3, 4, 0, 2]],
    calmLead: ['pluck', 'pluck', 'flute'], fightLead: ['pluck', 'bowed'],
    pad: 0.6, padBright: 0.45, drums: 1, register: 5, bell: 0.04, rest: 0.2,
  },
  lake: {
    root: 58, scale: HIRA, bpm: 54,
    progressions: [[0, 3, 4, 0], [0, 1, 3, 2], [3, 4, 0, 1]],
    calmLead: ['bell', 'flute', 'pluck'], fightLead: ['flute', 'bowed'],
    pad: 1, padBright: 0.45, drums: 0.7, register: 5, bell: 0.26, rest: 0.4,
  },
  pagoda: {
    root: 50, scale: HIRA, bpm: 60,
    progressions: [[0, 4, 3, 0], [0, 1, 0, 4], [3, 1, 0, 0]],
    calmLead: ['bell', 'bowed'], fightLead: ['bowed', 'pluck'],
    pad: 1, padBright: 0.3, drums: 0.9, register: 5, bell: 0.3, rest: 0.38,
  },
  cistern: {
    root: 48, scale: HIRA, bpm: 58,
    progressions: [[0, 3, 4, 0], [0, 1, 0, 4], [3, 4, 1, 0], [0, 4, 3, 1]],
    calmLead: ['bell', 'pluck', 'bowed'], fightLead: ['bowed', 'pluck'],
    pad: 1, padBright: 0.22, drums: 0.95, register: 5, bell: 0.3, rest: 0.42,
  },
  // Act III: the white peaks
  peaks: {
    root: 57, scale: SUS, bpm: 60,
    progressions: [[0, 3, 0, 4], [0, 2, 3, 0], [3, 4, 0, 2]],
    calmLead: ['flute', 'bell', 'flute'], fightLead: ['bowed', 'flute'],
    pad: 0.9, padBright: 0.55, drums: 0.75, register: 6, bell: 0.16, rest: 0.45,
  },
  monastery: {
    root: 50, scale: HIRA, bpm: 52,
    progressions: [[0, 3, 4, 0], [0, 1, 3, 0], [4, 3, 1, 0]],
    calmLead: ['bell', 'bowed', 'bell'], fightLead: ['bowed'],
    pad: 1, padBright: 0.4, drums: 0.55, register: 5, bell: 0.4, rest: 0.5,
  },
  frost: {
    root: 54, scale: MINOR_PENTA, bpm: 74,
    progressions: [[0, 3, 2, 4], [0, 4, 3, 0], [3, 2, 0, 4]],
    calmLead: ['pluck', 'bell', 'flute'], fightLead: ['pluck', 'bowed'],
    pad: 0.85, padBright: 0.4, drums: 0.9, register: 6, bell: 0.2, rest: 0.3,
  },
  glacier: {
    root: 59, scale: SUS, bpm: 56,
    progressions: [[0, 2, 0, 3], [0, 4, 2, 0], [3, 0, 4, 0]],
    calmLead: ['bell', 'bell', 'flute'], fightLead: ['bowed', 'bell'],
    pad: 1, padBright: 0.7, drums: 0.7, register: 6, bell: 0.35, rest: 0.45,
  },
  erased: {
    root: 48, scale: [0, 1, 5, 7, 8], bpm: 46,
    progressions: [[0, 1, 0, 4], [0, 3, 1, 0]],
    calmLead: ['bowed', 'bell'], fightLead: ['bowed', 'pluck'],
    pad: 0.7, padBright: 0.15, drums: 0.8, register: 5, bell: 0.12, rest: 0.6,
  },
  summit: {
    root: 62, scale: PENTA, bpm: 48,
    progressions: [[0, 3, 4, 0], [0, 2, 3, 4]],
    calmLead: ['flute', 'bell'], fightLead: ['flute', 'bowed'],
    pad: 1, padBright: 0.6, drums: 0.5, register: 6, bell: 0.3, rest: 0.5,
  },
  practice: {
    root: 62, scale: PENTA, bpm: 70,
    progressions: [[0, 3, 4, 0]],
    calmLead: ['pluck'], fightLead: ['pluck', 'flute'],
    pad: 0.6, padBright: 0.5, drums: 0.8, register: 5, bell: 0.05, rest: 0.3,
  },
};
/** Older name, kept for callers that still read it. */
export const MUSIC = THEMES;

export function degreeToMidi(th: { root: number; scale: number[] }, d: number): number {
  const n = th.scale.length;
  const oct = Math.floor(d / n);
  const idx = ((d % n) + n) % n;
  return th.root + oct * 12 + th.scale[idx];
}

const smooth = (a: number, b: number, x: number) => {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

interface Motif {
  /** Onsets over two bars of eighths: duration in eighths (0 = nothing starts here). */
  rhythm: number[];
  /** Chord-relative scale steps, one per onset. */
  pitches: number[];
}

type SectionKind = 'A' | 'B' | 'break';

interface Section {
  kind: SectionKind;
  prog: number[];
  motif: Motif;
  answer: Motif;
  lead: Inst;
  arp: number[];
  groove: Groove;
  bars: number;
  silent: boolean[];
}

interface Groove {
  kick: number[];
  tom: number[];
  rim: number[];
  shake: number[];
  bassSync: boolean;
}

const CALM_CELLS = [[4, 0, 0, 0], [2, 0, 2, 0], [3, 0, 0, 1], [2, 0, 1, 1], [0, 0, 2, 0], [0, 0, 0, 0], [1, 1, 2, 0], [2, 0, 0, 0]];
const BUSY_CELLS = [[1, 1, 1, 1], [2, 0, 1, 1], [1, 1, 2, 0], [1, 0, 1, 1], [3, 0, 0, 1], [1, 1, 1, 1], [2, 0, 2, 0]];

/** One theme, playing: its own layers, sections and clock. */
class Band {
  readonly out: GainNode;
  private filter: BiquadFilterNode;
  private layers: Record<'pad' | 'lead' | 'arp' | 'bass' | 'drums' | 'danger', GainNode>;
  private r: Rng;
  private next = 0;
  private beat = 0;
  private bar = 0;
  private sec!: Section;
  private secBar = 0;
  private prevProg = -1;
  private intensity = 0;
  private dangerL = 0;
  private fought = false;
  private resolveAt = -1;
  stopped = false;

  constructor(readonly th: Theme, seed: number, fadeIn: number) {
    const ctx = audio.ctx!;
    this.r = new Rng(seed);
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeIn);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 16000;
    this.filter.Q.value = 0.5;
    this.out.connect(this.filter);
    this.filter.connect(audio.music);
    const mk = (v: number) => {
      const g = ctx.createGain();
      g.gain.value = v;
      g.connect(this.out);
      return g;
    };
    this.layers = { pad: mk(th.pad), lead: mk(1), arp: mk(0), bass: mk(0), drums: mk(0), danger: mk(0) };
    this.next = ctx.currentTime + 0.15;
    this.newSection('A');
  }

  stop(fade: number): void {
    const ctx = audio.ctx!;
    const t = ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + fade);
    this.stopped = true;
    window.setTimeout(() => { this.filter.disconnect(); }, (fade + 3) * 1000);
  }

  private genMotif(busy: boolean): Motif {
    const r = this.r;
    const cells = busy ? BUSY_CELLS : CALM_CELLS;
    const rhythm: number[] = [];
    for (let k = 0; k < 4; k++) rhythm.push(...cells[r.int(0, cells.length - 1)]);
    // never an empty motif
    if (!rhythm.some((v) => v > 0)) rhythm[0] = 4;
    const pitches: number[] = [];
    let p = r.pick([0, 2, 4]);
    for (const v of rhythm) {
      if (v <= 0) continue;
      pitches.push(p);
      p += r.pick([-2, -1, -1, 1, 1, 2, 0]);
      // drift back towards the chord
      if (Math.abs(p) > 5) p -= Math.sign(p) * 2;
    }
    pitches[pitches.length - 1] = r.pick([0, 2, 4]);
    return { rhythm, pitches };
  }

  private genGroove(): Groove {
    const r = this.r;
    const kick = new Array(16).fill(0), tom = new Array(16).fill(0), rim = new Array(16).fill(0), shake = new Array(16).fill(0);
    kick[0] = 1;
    kick[8] = r.chance(0.8) ? 0.8 : 0;
    if (r.chance(0.5)) kick[r.pick([6, 10, 14])] = 0.6;
    if (r.chance(0.4)) kick[3] = 0.5;
    tom[r.pick([4, 12])] = 0.7;
    if (r.chance(0.6)) tom[r.pick([7, 11, 15])] = 0.5;
    for (let i = 2; i < 16; i += 4) rim[i] = r.chance(0.7) ? 0.5 : 0;
    for (let i = 0; i < 16; i++) shake[i] = i % 2 === 1 ? 0.5 : r.chance(0.3) ? 0.25 : 0;
    return { kick, tom, rim, shake, bassSync: r.chance(0.5) };
  }

  private newSection(kind?: SectionKind): void {
    const r = this.r;
    const th = this.th;
    const I = this.intensity;
    if (!kind) {
      const prev = this.sec?.kind;
      const roll = r.next();
      if (I > 0.5) kind = prev === 'A' ? (roll < 0.65 ? 'B' : 'A') : 'A';
      else if (prev === 'A') kind = roll < 0.5 ? 'B' : roll < 0.8 ? 'A' : 'break';
      else if (prev === 'B') kind = roll < 0.6 ? 'A' : roll < 0.8 ? 'break' : 'B';
      else kind = 'A';
    }
    let pi = r.int(0, th.progressions.length - 1);
    if (pi === this.prevProg && th.progressions.length > 1) pi = (pi + 1) % th.progressions.length;
    this.prevProg = pi;
    const busy = I > 0.45;
    const leads = busy ? th.fightLead : th.calmLead;
    const arp = r.pick([[0, 1, 2, 3], [0, 2, 1, 3], [0, 1, 2, 1], [2, 1, 0, 1], [0, 2, 3, 2]]);
    const bars = 8;
    const silent = [0, 1, 2, 3].map((k) => !busy && kind !== 'B' && k > 0 && r.chance(th.rest));
    this.sec = {
      kind, prog: th.progressions[pi], motif: this.genMotif(busy), answer: this.genMotif(busy),
      lead: leads[r.int(0, leads.length - 1)], arp, groove: this.genGroove(), bars, silent,
    };
    this.secBar = 0;
  }

  private chordRoot(): number {
    const s = this.sec;
    const perChord = this.intensity > 0.6 ? 1 : 2;
    return s.prog[Math.floor(this.secBar / perChord) % s.prog.length] + (s.kind === 'B' ? 0 : 0);
  }

  private midi(d: number): number {
    return degreeToMidi(this.th, d);
  }

  /** Steer the layers towards the current intensity and danger. */
  setLevels(intensity: number, danger: number, dt: number): void {
    const up = intensity > this.intensity;
    this.intensity += (intensity - this.intensity) * Math.min(1, dt * (up ? 0.9 : 0.25));
    this.dangerL += (danger - this.dangerL) * Math.min(1, dt * 1.5);
    const I = this.intensity, D = this.dangerL;
    if (I > 0.55) this.fought = true;
    if (this.fought && I < 0.22) { this.fought = false; this.resolveAt = 0; }
    const ctx = audio.ctx!;
    const t = ctx.currentTime;
    const th = this.th;
    const L = this.layers;
    L.pad.gain.setTargetAtTime(th.pad * (1 - 0.35 * I), t, 0.8);
    L.arp.gain.setTargetAtTime(smooth(0.12, 0.45, I) * 0.9, t, 0.8);
    L.bass.gain.setTargetAtTime(smooth(0.35, 0.7, I), t, 0.8);
    L.drums.gain.setTargetAtTime(smooth(0.3, 0.75, I) * th.drums, t, 0.6);
    L.lead.gain.setTargetAtTime(1 - 0.25 * D, t, 0.8);
    L.danger.gain.setTargetAtTime(D, t, 0.5);
    this.filter.frequency.setTargetAtTime(16000 - 15000 * Math.pow(D, 0.6), t, 0.4);
  }

  tick(): void {
    const ctx = audio.ctx!;
    if (this.stopped) return;
    while (this.next < ctx.currentTime + 0.3) {
      const spb = 60 / (this.th.bpm * (1 + 0.14 * this.intensity));
      this.playBeat(this.next, spb);
      this.next += spb;
      this.beat++;
      if (this.beat % 4 === 0) {
        this.bar++;
        this.secBar++;
        if (this.secBar >= this.sec.bars) this.newSection();
      }
    }
  }

  private playBeat(t: number, spb: number): void {
    const r = this.r;
    const th = this.th;
    const s = this.sec;
    const I = this.intensity;
    const inBar = this.beat % 4;
    const e = spb / 2;
    const root = this.chordRoot();
    const L = this.layers;
    const perChord = I > 0.6 ? 1 : 2;
    // a fight that ends: resolve on the tonic
    if (this.resolveAt === 0 && inBar === 0) {
      this.resolveAt = -1;
      const f = [0, 2, 4, 5].map((d) => mtof(this.midi(d + 5)));
      f.forEach((fr, i) => pluck(fr, t + i * 0.09, { vel: 0.4, decay: 4, bright: 0.5, dest: L.lead }));
      bell(mtof(this.midi(10)), t + 0.4, { vel: 0.25, decay: 6, dest: L.lead });
      this.newSection('break');
    }
    // pad: a chord at each change
    if (inBar === 0 && this.secBar % perChord === 0) {
      // keep the pad out of the mud: nothing below E2
      const up = (m: number) => (m < 40 ? m + 12 : m);
      const freqs = [0, 2, 4].map((k) => mtof(up(this.midi(root + k - 5))));
      pad(freqs, t, spb * 4 * perChord, { vel: 0.8, bright: th.padBright + I * 0.3, dest: L.pad });
      pad([mtof(up(this.midi(root - 10)))], t, spb * 4 * perChord, { vel: 0.45, bright: 0.2, dest: L.pad });
    }
    // lead: the motif, its answer, the motif again, resolved
    if (s.kind !== 'break') {
      const slot = Math.floor((this.secBar % 8) / 2);
      if (!s.silent[slot]) {
        const m = slot === 2 ? s.answer : s.motif;
        const half = (this.secBar % 2) * 8;
        const onsetIdx = (i: number) => m.rhythm.slice(0, i).filter((v) => v > 0).length;
        for (let k = 0; k < 2; k++) {
          const i = half + inBar * 2 + k;
          const dur = m.rhythm[i];
          if (!dur) continue;
          let pitch = m.pitches[onsetIdx(i)] ?? 0;
          const last = onsetIdx(i) === m.pitches.length - 1;
          if (slot === 3 && last) pitch = 0;
          if (slot === 1 && last) pitch += r.pick([1, -1, 2]);
          const d = root + pitch + th.register + (s.kind === 'B' ? 2 : 0) + (I > 0.7 ? th.scale.length : 0);
          const f = mtof(this.midi(d));
          const tt = t + k * e + (r.next() - 0.5) * 0.02;
          const len = dur * e * (slot === 3 && last ? 2 : 1);
          this.playLead(s.lead, f, tt, len);
        }
      }
    }
    // bells and drips
    if (inBar === 2 && r.chance(th.bell * (s.kind === 'break' ? 2 : 1))) {
      bell(mtof(this.midi(root + 10 + r.pick([0, 2, 4]))), t + r.range(0, e), { vel: 0.14, decay: 5, pan: r.range(-0.6, 0.6), dest: L.lead });
    }
    // tension: a plucked arpeggio on the chord
    if (I > 0.08) {
      for (let k = 0; k < 2; k++) {
        const step = s.arp[(inBar * 2 + k) % s.arp.length];
        const d = root + [0, 2, 4, 5][step];
        pluck(mtof(this.midi(d)), t + k * e, { vel: 0.18 + I * 0.1, decay: 1.6, bright: 0.55, pan: k ? 0.35 : -0.35, dest: L.arp });
      }
    }
    // combat: bass and drums
    if (I > 0.3) {
      const low = (m: number) => (m < 36 ? m + 12 : m);
      const bf = mtof(low(this.midi(root - 10)));
      if (inBar === 0) bass(bf, t, { vel: 0.55, dur: spb * 1.5, dest: L.bass });
      if (inBar === 2) bass(mtof(low(this.midi(root - 10 + (r.chance(0.5) ? 2 : 0)))), t + (s.groove.bassSync ? e : 0), { vel: 0.45, dur: spb, dest: L.bass });
      if (I > 0.65 && inBar === 3) bass(mtof(low(this.midi(root - 9))), t + e, { vel: 0.35, dur: e, dest: L.bass });
      const g = s.groove;
      const fill = I > 0.6 && this.bar % 4 === 3 && inBar >= 2;
      for (let k = 0; k < 4; k++) {
        const i = inBar * 4 + k;
        const tt = t + (k * spb) / 4;
        if (fill) {
          if (k % (I > 0.85 ? 1 : 2) === 0) drum(mtof(th.root - 17 + (inBar - 2) * 3 + k), tt, { vel: 0.35 + k * 0.08, decay: 0.3, dest: L.drums });
          continue;
        }
        if (g.kick[i]) drum(mtof(Math.max(36, th.root - 26)), tt, { vel: 0.7 * g.kick[i], decay: 0.55, dest: L.drums });
        if (g.tom[i] && I > 0.45) drum(mtof(Math.max(43, th.root - 17)), tt, { vel: 0.5 * g.tom[i], decay: 0.35, dest: L.drums });
        if (g.rim[i]) woodblock(mtof(th.root + 26), tt, { vel: 0.18 * g.rim[i], dest: L.drums });
        if (g.shake[i] && I > 0.55) shaker(tt, { vel: g.shake[i] * (0.5 + I * 0.5), dest: L.drums });
      }
    }
    // danger: a heartbeat under everything
    if (this.dangerL > 0.05 && inBar % 2 === 0) {
      const hb = mtof(Math.max(33, th.root - 31));
      drum(hb, t, { vel: 0.5, decay: 0.3, dest: L.danger });
      drum(hb, t + Math.min(0.22, e * 0.6), { vel: 0.32, decay: 0.25, dest: L.danger });
    }
  }

  private playLead(inst: Inst, f: number, t: number, len: number): void {
    const dest = this.layers.lead;
    const I = this.intensity;
    if (inst === 'flute') flute(f, t, Math.max(0.15, len * 0.95), { vel: 0.3 + I * 0.08, scoop: this.r.chance(0.3), pan: 0.15, dest });
    else if (inst === 'bowed') bowed(f, t, Math.max(0.2, len), { vel: 0.33 + I * 0.08, pan: -0.15, dest });
    else if (inst === 'bell') bell(f, t, { vel: 0.22, decay: 4, pan: 0.1, dest });
    else pluck(f, t, { vel: 0.42 + I * 0.1, decay: 2.8, bright: 0.5 + I * 0.15, bend: this.r.chance(0.1) ? 1 : 0, pan: 0.1, dest });
  }

  /** The thread's four notes over the band. */
  motif(resolve: boolean, inst: 'pluck' | 'bell' | 'flute', octave: number): void {
    const ctx = audio.ctx!;
    const t0 = ctx.currentTime + 0.05;
    const notes = resolve ? [...MOTIF, MOTIF_RESOLVE] : MOTIF;
    notes.forEach((d, i) => {
      const f = mtof(this.midi(d + octave * this.th.scale.length));
      const t = t0 + i * 0.42 + (resolve && i === 4 ? 0.5 : 0);
      if (inst === 'bell') bell(f, t, { vel: 0.35, decay: 5, dest: this.layers.lead });
      else if (inst === 'flute') flute(f, t, 0.5, { vel: 0.35, dest: this.layers.lead });
      else pluck(f, t, { vel: 0.55, decay: resolve && i === 4 ? 6 : 3.5, bright: 0.5, dest: this.layers.lead });
    });
  }
}

export class Music {
  private band: Band | null = null;
  private fading: Band[] = [];
  private timer: number | null = null;
  private last = 0;
  private seed = 4242;
  name = '';
  /** Fight intensity, 0 = calm, 1 = full battle (callers set it every frame). */
  boss = 0;
  /** 0..1: how close the child is to falling. */
  danger = 0;

  play(name: string): void {
    if (this.name === name) return;
    this.name = name;
    if (!audio.ctx) return;
    const th = THEMES[name] ?? THEMES.orchard;
    if (this.band) {
      this.band.stop(3);
      this.fading.push(this.band);
    }
    this.band = new Band(th, this.seed++, this.fading.length ? 3 : 4);
    if (this.timer === null) {
      this.last = performance.now();
      this.timer = window.setInterval(() => this.tick(), 50);
    }
  }

  /** Call once audio has started if play() happened before. */
  resume(): void {
    if (!this.band && this.name && audio.ctx) {
      const n = this.name;
      this.name = '';
      this.play(n);
    }
  }

  stop(): void {
    this.band?.stop(3);
    this.band = null;
    this.name = '';
  }

  motif(resolve = false, inst: 'pluck' | 'bell' | 'flute' = 'pluck', octave = 0): void {
    this.band?.motif(resolve, inst, octave);
  }

  private tick(): void {
    if (!audio.ctx) return;
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (this.band) {
      this.band.setLevels(Math.max(0, Math.min(1, this.boss)), Math.max(0, Math.min(1, this.danger)), dt);
      this.band.tick();
    }
    this.fading = this.fading.filter((b) => audio.ctx!.currentTime < 0 || !b.stopped || (b.out.gain.value > 0.001));
  }
}

export const music = new Music();
