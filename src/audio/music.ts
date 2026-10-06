/**
 * Generative music. Each area is a small set of rules (mode, register, density, instruments);
 * nothing loops exactly. The thread motif is heard only as its first four notes until the end.
 */
import { audio } from './engine';
import { pluck, flute, bowed, bell, drum, woodblock, drone, mtof } from './instruments';
import { Rng } from '../gfx/rng';

export interface MusicDef {
  root: number;
  scale: number[];
  bpm: number;
  drone?: { notes: number[]; vol: number };
  pluck?: { density: number; low: number; high: number; bright: number; decay: number; vel: number };
  arp?: { density: number; low: number; span: number };
  flute?: { every: [number, number]; low: number; high: number; vel: number };
  bowed?: { every: [number, number]; low: number; high: number; vel: number };
  bell?: { every: [number, number]; degree: number; vel: number };
  motif?: { every: [number, number]; inst: 'pluck' | 'flute' | 'bowed' | 'bell'; octave: number };
  /** Silence between phrases matters: probability a whole bar rests. */
  rest?: number;
  /** Eighth-note ostinato (degrees) that enters with intensity. */
  ostinato?: number[];
}

/** The thread motif in pentatonic degrees; the fifth note is withheld until the end. */
export const MOTIF = [3, 4, 5, 6];
export const MOTIF_RESOLVE = 5;

export const MUSIC: Record<string, MusicDef> = {
  orchard: {
    root: 62, scale: [0, 2, 4, 7, 9], bpm: 66,
    drone: { notes: [38, 45], vol: 0.05 },
    pluck: { density: 0.3, low: 0, high: 9, bright: 0.55, decay: 3.2, vel: 0.45 },
    flute: { every: [3, 6], low: 5, high: 11, vel: 0.35 },
    bell: { every: [10, 16], degree: -5, vel: 0.25 },
    motif: { every: [6, 10], inst: 'pluck', octave: 0 },
    rest: 0.12,
  },
  river: {
    root: 55, scale: [0, 2, 5, 7, 9], bpm: 60,
    drone: { notes: [31, 38, 43], vol: 0.06 },
    pluck: { density: 0.18, low: 5, high: 12, bright: 0.5, decay: 3.5, vel: 0.35 },
    arp: { density: 0.5, low: 0, span: 6 },
    flute: { every: [4, 8], low: 6, high: 12, vel: 0.28 },
    motif: { every: [7, 11], inst: 'flute', octave: 1 },
    rest: 0.08,
  },
  hills: {
    root: 57, scale: [0, 3, 5, 7, 10], bpm: 52,
    drone: { notes: [33, 40], vol: 0.055 },
    pluck: { density: 0.12, low: 0, high: 8, bright: 0.4, decay: 4, vel: 0.35 },
    bowed: { every: [3, 6], low: 2, high: 9, vel: 0.4 },
    bell: { every: [6, 10], degree: -5, vel: 0.3 },
    motif: { every: [7, 12], inst: 'bowed', octave: 0 },
    rest: 0.2,
  },
  studio: {
    root: 64, scale: [0, 3, 5, 8, 10], bpm: 44,
    drone: { notes: [40], vol: 0.03 },
    pluck: { density: 0.06, low: 3, high: 12, bright: 0.65, decay: 4.5, vel: 0.3 },
    bell: { every: [3, 6], degree: 5, vel: 0.22 },
    motif: { every: [8, 14], inst: 'bell', octave: 1 },
    rest: 0.4,
  },
  blank: {
    root: 62, scale: [0, 2, 4, 7, 9], bpm: 50,
    drone: { notes: [50], vol: 0.04 },
    motif: { every: [5, 9], inst: 'pluck', octave: 0 },
    rest: 0.6,
  },
  storm: {
    root: 57, scale: [0, 3, 5, 7, 10], bpm: 104,
    drone: { notes: [33, 40], vol: 0.05 },
    pluck: { density: 0.22, low: 3, high: 10, bright: 0.6, decay: 2.2, vel: 0.4 },
    flute: { every: [2, 4], low: 6, high: 12, vel: 0.32 },
    bell: { every: [8, 12], degree: -5, vel: 0.25 },
    motif: { every: [8, 12], inst: 'flute', octave: 1 },
    ostinato: [0, 2, 3, 2, 4, 3, 2, 1],
    rest: 0.05,
  },
  practice: {
    root: 62, scale: [0, 2, 4, 7, 9], bpm: 70,
    pluck: { density: 0.2, low: 0, high: 9, bright: 0.55, decay: 3, vel: 0.35 },
    rest: 0.3,
  },
};

export function degreeToMidi(def: MusicDef, d: number): number {
  const n = def.scale.length;
  const oct = Math.floor(d / n);
  const idx = ((d % n) + n) % n;
  return def.root + oct * 12 + def.scale[idx];
}

export class Music {
  private def: MusicDef | null = null;
  private timer: number | null = null;
  private nextBeat = 0;
  private beat = 0;
  private rng = new Rng(4242);
  private stopDrone: ((f?: number) => void) | null = null;
  private walk = 4;
  private fluteIn = 4;
  private bowedIn = 3;
  private bellIn = 8;
  private motifIn = 5;
  private restBar = false;
  /** 0 = calm, 1 = full battle. */
  boss = 0;
  private bossLevel = 0;
  name = '';

  play(name: string): void {
    if (this.name === name) return;
    this.name = name;
    const def = MUSIC[name];
    if (!audio.ctx) { this.def = def ?? null; return; }
    this.fadeOutDrone();
    this.def = def ?? null;
    if (!def) return;
    if (def.drone) this.stopDrone = drone(def.drone.notes.map(mtof), { vol: def.drone.vol, fade: 5 });
    this.nextBeat = audio.ctx.currentTime + 0.3;
    this.beat = 0;
    this.fluteIn = this.rng.int(2, 4);
    this.motifIn = this.rng.int(3, 6);
    if (this.timer === null) this.timer = window.setInterval(() => this.tick(), 50);
  }

  /** Call once audio has started if play() happened before. */
  resume(): void {
    if (this.def && !this.stopDrone && audio.ctx) {
      const n = this.name;
      this.name = '';
      this.play(n);
    }
  }

  stop(): void {
    this.fadeOutDrone();
    this.def = null;
    this.name = '';
  }

  private fadeOutDrone(): void {
    if (this.stopDrone) {
      this.stopDrone(4);
      this.stopDrone = null;
    }
  }

  /** The motif's four notes, now (used for memories and thread moments). */
  motif(resolve = false, inst: 'pluck' | 'bell' | 'flute' = 'pluck', octave = 0): void {
    const ctx = audio.ctx;
    const def = this.def ?? MUSIC.orchard;
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.05;
    const notes = resolve ? [...MOTIF, MOTIF_RESOLVE] : MOTIF;
    notes.forEach((d, i) => {
      const f = mtof(degreeToMidi(def, d + octave * def.scale.length));
      const t = t0 + i * 0.42 + (resolve && i === 4 ? 0.5 : 0);
      if (inst === 'bell') bell(f, t, { vel: 0.35, decay: 5 });
      else if (inst === 'flute') flute(f, t, 0.5, { vel: 0.35 });
      else pluck(f, t, { vel: 0.55, decay: resolve && i === 4 ? 6 : 3.5, bright: 0.5 });
    });
  }

  private tick(): void {
    const ctx = audio.ctx;
    const def = this.def;
    if (!ctx || !def) return;
    this.bossLevel += (this.boss - this.bossLevel) * 0.05;
    const spb = 60 / def.bpm;
    while (this.nextBeat < ctx.currentTime + 0.25) {
      this.playBeat(def, this.nextBeat, spb);
      this.nextBeat += spb;
      this.beat++;
    }
  }

  private playBeat(def: MusicDef, t: number, spb: number): void {
    const r = this.rng;
    const bar = Math.floor(this.beat / 4);
    const inBar = this.beat % 4;
    if (inBar === 0) {
      this.restBar = r.chance(def.rest ?? 0) && this.boss < 0.5;
      this.fluteIn--; this.bowedIn--; this.bellIn--; this.motifIn--;
    }
    const swing = (r.next() - 0.5) * 0.04;
    // battle pulse: taiko enters with intensity, then doubles
    const I = this.bossLevel;
    if (I > 0.2) {
      const v = Math.min(1, I * 1.2);
      if (inBar === 0) drum(mtof(def.root - 24), t, { vel: 0.7 * v });
      if (inBar === 2) drum(mtof(def.root - 24), t, { vel: 0.5 * v });
      if (I > 0.5 && (inBar === 1 || inBar === 3)) drum(mtof(def.root - 19), t + spb * 0.5, { vel: 0.35 * v });
      if (I > 0.75 && inBar === 3) { drum(mtof(def.root - 17), t + spb * 0.25, { vel: 0.3 }); drum(mtof(def.root - 17), t + spb * 0.75, { vel: 0.35 }); }
      woodblock(mtof(def.root + 24), t + spb * 0.5, { vel: 0.14 * v });
    }
    if (def.ostinato && I > 0.4) {
      for (let k = 0; k < 2; k++) {
        const deg = def.ostinato[(this.beat * 2 + k) % def.ostinato.length];
        pluck(mtof(degreeToMidi(def, deg)), t + k * spb * 0.5, { vel: 0.22 + I * 0.15, decay: 1.4, bright: 0.65, pan: k ? 0.3 : -0.3 });
      }
    }
    if (this.restBar) return;
    if (def.pluck && r.chance(def.pluck.density * (1 + this.bossLevel * 0.6))) {
      this.walk += r.pick([-2, -1, -1, 0, 1, 1, 2]);
      this.walk = Math.max(def.pluck.low, Math.min(def.pluck.high, this.walk));
      const m = degreeToMidi(def, this.walk);
      pluck(mtof(m), t + swing, { vel: def.pluck.vel * r.range(0.7, 1), decay: def.pluck.decay, bright: def.pluck.bright, bend: r.chance(0.12) ? 1 : 0, pan: r.range(-0.4, 0.4) });
      if (r.chance(0.18)) pluck(mtof(degreeToMidi(def, this.walk - 3)), t + swing + 0.02, { vel: def.pluck.vel * 0.5, decay: def.pluck.decay, bright: 0.4 });
    }
    if (def.arp && inBar % 2 === 0 && r.chance(def.arp.density)) {
      const base = def.arp.low + r.int(0, 2);
      for (let i = 0; i < 4; i++) {
        pluck(mtof(degreeToMidi(def, base + i * 2 - (i === 3 ? 1 : 0))), t + i * spb * 0.5, { vel: 0.25, decay: 3, bright: 0.45, pan: -0.3 + i * 0.2 });
      }
    }
    if (inBar === 0 && def.flute && this.fluteIn <= 0 && (I > 0.6 || !def.ostinato)) {
      this.fluteIn = r.int(def.flute.every[0], def.flute.every[1]);
      let d = r.int(def.flute.low, def.flute.high);
      let tt = t;
      const n = r.int(2, 4);
      for (let i = 0; i < n; i++) {
        const dur = spb * r.pick([1, 2, 2, 3]);
        flute(mtof(degreeToMidi(def, d)), tt, dur * 0.95, { vel: def.flute.vel, scoop: r.chance(0.4), pan: 0.2 });
        tt += dur;
        d += r.pick([-2, -1, 1, 2]);
        d = Math.max(def.flute.low, Math.min(def.flute.high, d));
      }
    }
    if (inBar === 0 && def.bowed && this.bowedIn <= 0) {
      this.bowedIn = r.int(def.bowed.every[0], def.bowed.every[1]);
      let d = r.int(def.bowed.low, def.bowed.high);
      let tt = t;
      let prev = 0;
      for (let i = 0; i < r.int(2, 3); i++) {
        const dur = spb * r.pick([2, 3, 4]);
        const f = mtof(degreeToMidi(def, d));
        bowed(f, tt, dur, { vel: def.bowed.vel, from: prev && r.chance(0.6) ? prev : undefined, pan: -0.2 });
        prev = f;
        tt += dur;
        d += r.pick([-2, -1, 1]);
        d = Math.max(def.bowed.low, Math.min(def.bowed.high, d));
      }
    }
    if (inBar === 0 && def.bell && this.bellIn <= 0) {
      this.bellIn = r.int(def.bell.every[0], def.bell.every[1]);
      bell(mtof(degreeToMidi(def, def.bell.degree)), t, { vel: def.bell.vel, decay: 6, pan: r.range(-0.5, 0.5) });
    }
    if (inBar === 0 && def.motif && this.motifIn <= 0 && bar > 2) {
      this.motifIn = r.int(def.motif.every[0], def.motif.every[1]);
      MOTIF.forEach((d, i) => {
        const f = mtof(degreeToMidi(def, d + def.motif!.octave * def.scale.length));
        const tt = t + i * spb;
        const inst = def.motif!.inst;
        if (inst === 'pluck') pluck(f, tt, { vel: 0.45, decay: 3.5, bright: 0.5 });
        else if (inst === 'flute') flute(f, tt, spb * 0.9, { vel: 0.3 });
        else if (inst === 'bowed') bowed(f, tt, spb * 0.95, { vel: 0.35 });
        else bell(f, tt, { vel: 0.22, decay: 4 });
      });
      // the phrase is left hanging: a rest where the fifth note would be
      this.restBar = false;
    }
  }
}

export const music = new Music();
