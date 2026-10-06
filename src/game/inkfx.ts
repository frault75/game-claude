/** What each ink does when a stroke is laid and when a loop closes. */
import type { World } from './world';
import type { Seg, Enso } from './stroke';
import { pointInPoly, distToSeg } from './physics';
import { Entity } from './entity';
import { Ribbon } from '../gfx/ribbon';
import { INKS } from './inks';
import { LAYER } from '../gfx/sprite';
import { sfx } from '../audio/sfx';

interface Pending { t: number; fn: () => void }
interface Flash { r: Ribbon; t: number; life: number }

export class InkFx {
  private pending: Pending[] = [];
  private flashes: Flash[] = [];
  /** Damage of a blow (level, gear, critical strikes). */
  roll = (base: number): { dmg: number; crit: boolean } => ({ dmg: Math.round(base), crit: false });
  /** Extra multiplier for loops. */
  ensoMul = () => 1;
  /** Vermilion loops only (Scarlet Ensō). */
  redMul = () => 1;
  /** Freezing lasts longer (Deep Frost). */
  frostMul = () => 1;
  /** Gold lightning leaps to this many more foes (Chain Lightning). */
  chain = () => 0;
  onLanded?: (hits: number) => void;

  constructor(private w: World) {
    w.strokes.onSegment = (s) => this.segment(s);
  }

  private later(t: number, fn: () => void): void {
    this.pending.push({ t, fn });
  }

  private foesNearSeg(s: Seg, r: number): Entity[] {
    return this.w.entities.filter((e) => e.team === 'enemy' && !e.dead && distToSeg(e.x, e.y + 0.2, s.ax, s.ay, s.bx, s.by) < r + e.radius);
  }

  private foesIn(poly: [number, number][]): Entity[] {
    return this.w.entities.filter((e) => e.team === 'enemy' && !e.dead && (pointInPoly(e.x, e.y + 0.15, poly) || pointInPoly(e.x, e.y + 0.5, poly)));
  }

  private flashLine(ax: number, ay: number, bx: number, by: number, rgb: [number, number, number], width: number, life: number): void {
    const r = new Ribbon(6, this.w.r.sceneAcc, { color: rgb, density: 1, dry: 0.2, taper: 0.1, order: LAYER.canopy + 30 });
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const j = i === 0 || i === 5 ? 0 : (Math.random() - 0.5) * 0.35;
      pts.push([ax + (bx - ax) * t - (by - ay) * j * 0.3, ay + (by - ay) * t + (bx - ax) * j * 0.3]);
    }
    r.set(pts, width);
    this.flashes.push({ r, t: 0, life });
  }

  private segment(s: Seg): void {
    const w = this.w;
    if (s.ink === 'indigo') {
      // the tide surges along the fresh stroke: freeze and bruise
      this.later(0.2, () => {
        let hits = 0;
        for (const e of this.foesNearSeg(s, 0.7)) {
          if (e.onHit({ ...this.roll(6), fromX: (s.ax + s.bx) / 2, fromY: (s.ay + s.by) / 2, kind: 'ink' })) hits++;
          (e as unknown as { freeze?: (t: number) => void }).freeze?.(2.2 * this.frostMul());
        }
        if (hits) { sfx.clink(); this.onLanded?.(hits); }
        w.vfx.ripple((s.ax + s.bx) / 2, (s.ay + s.by) / 2, 0.5);
        for (const f of w.onFreeze) f((s.ax + s.bx) / 2, (s.ay + s.by) / 2, 0.7);
      });
    } else if (s.ink === 'gold') {
      this.later(0.35, () => {
        let hits = 0;
        const struck = this.foesNearSeg(s, 0.8);
        for (const e of struck) if (e.onHit({ ...this.roll(18), fromX: s.ax, fromY: s.ay, kind: 'ink' })) hits++;
        // the bolt leaps on to the nearest others
        let from = struck[0];
        for (let k = 0; from && k < this.chain(); k++) {
          const next = w.entities.filter((e) => e.team === 'enemy' && !e.dead && !struck.includes(e) && Math.hypot(e.x - from!.x, e.y - from!.y) < 5)
            .sort((a, b) => Math.hypot(a.x - from!.x, a.y - from!.y) - Math.hypot(b.x - from!.x, b.y - from!.y))[0];
          if (!next) break;
          this.flashLine(from.x, from.y + 0.4, next.x, next.y + 0.4, [1, 0.93, 0.6], 0.07, 0.18);
          if (next.onHit({ ...this.roll(12), fromX: from.x, fromY: from.y, kind: 'ink' })) hits++;
          struck.push(next);
          from = next;
        }
        this.flashLine(s.ax, s.ay + 0.2, s.bx, s.by + 0.2, [1, 0.93, 0.6], 0.09, 0.18);
        for (const f of w.onBolt) f((s.ax + s.bx) / 2, (s.ay + s.by) / 2, 0.8);
        w.vfx.glowAt((s.ax + s.bx) / 2, (s.ay + s.by) / 2, 2.2, 0.12);
        if (hits) { w.hitstop = Math.max(w.hitstop, 0.03); this.onLanded?.(hits); }
        if (Math.random() < 0.35) sfx.cut();
      });
    }
  }

  /** A loop of one ink closed. Returns hits (for juice). */
  enso(e: Enso): number {
    const w = this.w;
    const em = this.ensoMul();
    let hits = 0;
    if (e.ink === 'vermilion') {
      for (const f of this.foesIn(e.poly)) if (f.onHit({ ...this.roll(40 * em * this.redMul()), fromX: e.cx, fromY: e.cy, kind: 'enso' })) hits++;
    } else if (e.ink === 'indigo') {
      for (const f of this.foesIn(e.poly)) {
        if (f.onHit({ ...this.roll(20 * em), fromX: e.cx, fromY: e.cy, kind: 'ink' })) hits++;
        (f as unknown as { freeze?: (t: number) => void }).freeze?.(3.8 * this.frostMul());
      }
      for (let i = 0; i < 4; i++) w.vfx.ripple(e.cx, e.cy, 0.8 + i * 0.6);
      for (const f of w.onFreeze) f(e.cx, e.cy, 1.5);
    } else if (e.ink === 'gold') {
      // a small storm inside the loop
      for (let k = 0; k < 4; k++) {
        this.later(0.15 + k * 0.38, () => {
          const foes = this.foesIn(e.poly);
          const target = foes.length ? foes[Math.floor(Math.random() * foes.length)] : null;
          const x = target ? target.x : e.cx + (Math.random() - 0.5) * 2, y = target ? target.y : e.cy + (Math.random() - 0.5) * 2;
          this.flashLine(x + 0.6, y + 9, x, y + 0.3, [1, 0.9, 0.5], 0.12, 0.2);
          w.flash = Math.max(w.flash, 0.25);
          sfx.thunder();
          for (const f of w.onBolt) f(x, y, 1.6);
          for (const f of foes) if (Math.hypot(f.x - x, f.y - y) < 1.6 && f.onHit({ ...this.roll(25 * em), fromX: x, fromY: y + 1, kind: 'ink' })) this.onLanded?.(1);
        });
      }
    }
    // projectiles inside are wiped out
    for (const en of w.entities) if (en.label === 'inkdrop' && pointInPoly(en.x, en.y, e.poly)) en.destroy();
    void INKS;
    return hits;
  }

  update(dt: number): void {
    for (const p of this.pending) p.t -= dt;
    const due = this.pending.filter((p) => p.t <= 0);
    this.pending = this.pending.filter((p) => p.t > 0);
    for (const p of due) p.fn();
    for (const f of this.flashes) {
      f.t += dt;
      f.r.mat.uniforms.density.value = Math.max(0, 1 - f.t / f.life);
    }
    for (const f of this.flashes) if (f.t >= f.life) f.r.dispose();
    this.flashes = this.flashes.filter((f) => f.t < f.life);
  }

  clear(): void {
    this.pending = [];
    for (const f of this.flashes) f.r.dispose();
    this.flashes = [];
  }
}
