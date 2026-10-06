/** The active skills of the Tree of Strokes: what happens when one is used. */
import type { Game } from './game';
import { Entity } from './entity';
import type { World } from './world';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../gfx/sprite';
import { Painter, VERMILION } from '../gfx/paint';
import { washPoly, roughen } from '../gfx/wash';
import { Ribbon } from '../gfx/ribbon';
import { sfx } from '../audio/sfx';
import { SkillId, eff } from './skills';
import { PLAYER } from './player';

let sealFrame: Frame | null = null;

/** A red seal falling from the sky; it bursts where it lands. */
class SealDrop extends Entity {
  private t = 0;
  private s!: Sprite;
  constructor(x: number, y: number, private delay: number, private hit: (x: number, y: number) => void) {
    super();
    this.x = x; this.y = y;
    this.z = 7;
    this.label = 'sealdrop';
  }
  init(w: World): void {
    if (!sealFrame) {
      const p = new Painter(1.2, 1.2, 64, -0.6, -0.1);
      p.glaze();
      washPoly(p, roughen([[-0.35, 0], [0.35, 0], [0.35, 0.7], [-0.35, 0.7]], 0.02, 41, 0.08), { pig: VERMILION, density: 0.95, soft: 0.05, edge: 0.4, seed: 41 });
      p.lift();
      p.ctx.fillStyle = 'rgba(0,0,0,0.9)';
      p.ctx.fillRect(-0.12, 0.2, 0.24, 0.06);
      p.ctx.fillRect(-0.03, 0.12, 0.06, 0.45);
      sealFrame = frameFrom(p);
    }
    this.s = this.addSprite(new Sprite(sealFrame), true);
    this.s.opacity = 0;
    void w;
  }
  update(dt: number): void {
    this.t += dt;
    if (this.t < this.delay) return;
    this.z = Math.max(0, this.z - dt * 22);
    this.s.opacity = 1;
    this.s.setPos(this.x, this.y + this.z);
    this.s.mesh.renderOrder = ySort(this.y);
    if (this.z <= 0) {
      this.hit(this.x, this.y);
      this.destroy();
    }
  }
}

function foes(g: Game): Entity[] {
  return g.world.entities.filter((e) => e.team === 'enemy' && !e.dead);
}

function flash(g: Game, ax: number, ay: number, bx: number, by: number, rgb: [number, number, number], width: number, life: number): void {
  const r = new Ribbon(6, g.r.sceneAcc, { color: rgb, density: 1, dry: 0.2, taper: 0.1, order: LAYER.canopy + 30 });
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const j = i === 0 || i === 5 ? 0 : (Math.random() - 0.5) * 0.35;
    pts.push([ax + (bx - ax) * t - (by - ay) * j * 0.3, ay + (by - ay) * t + (bx - ax) * j * 0.3]);
  }
  r.set(pts, width);
  let t = 0;
  g.world.scripts.push(function fade(dt: number) {
    t += dt;
    r.mat.uniforms.density.value = Math.max(0, 1 - t / life);
    if (t >= life) {
      r.dispose();
      const i = g.world.scripts.indexOf(fade);
      if (i >= 0) g.world.scripts.splice(i, 1);
    }
  });
}

/** Use a skill now. Returns false if nothing could happen. */
export function useSkill(g: Game, id: SkillId): boolean {
  const w = g.world;
  const p = g.player;
  if (p.state === 'dead' || p.busy) return false;
  const frost = 1 + eff('frost') / 100;
  switch (id) {
    case 'whirl': {
      let hits = 0;
      for (const e of foes(g)) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > 2.6 + e.radius) continue;
        if (e.onHit({ ...p.roll(PLAYER.strikeDmg * 2.2 * (1 + eff('edge') / 100)), fromX: p.x, fromY: p.y, kind: 'whirl' })) hits++;
      }
      for (let k = 0; k < 6; k++) w.vfx.strikeArc(p.x, p.y + 0.4, (k / 6) * Math.PI * 2, k % 2);
      sfx.strike(1);
      sfx.cut();
      w.shake(0.15, 0.15);
      if (hits) { w.hitstop = Math.max(w.hitstop, 0.05); w.addCombo(hits); }
      return true;
    }
    case 'seals': {
      const targets = foes(g).filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < 8).slice(0, 6);
      for (let k = 0; k < 6; k++) {
        const tg = targets[k];
        const a = Math.random() * Math.PI * 2, d = 1.5 + Math.random() * 3;
        const x = tg ? tg.x : p.x + Math.cos(a) * d, y = tg ? tg.y : p.y + Math.sin(a) * d * 0.8;
        w.add(new SealDrop(x, y, k * 0.12, (sx, sy) => {
          let hit = 0;
          for (const e of foes(g)) {
            if (Math.hypot(e.x - sx, e.y - sy) < 1.5 + e.radius && e.onHit({ ...p.roll(PLAYER.strikeDmg * 1.7), fromX: sx, fromY: sy - 1, kind: 'enso' })) hit++;
          }
          for (let i = 0; i < 4; i++) w.vfx.splat(sx, sy + 0.3, (i / 4) * Math.PI * 2, 6, 1, 'red');
          w.vfx.ripple(sx, sy, 1.2);
          w.shake(0.12, 0.12);
          sfx.impact(false);
          if (hit) w.addCombo(hit);
        }));
      }
      sfx.charge(3);
      return true;
    }
    case 'wave': {
      const [ax, ay] = p.aim;
      const base = Math.atan2(ay, ax);
      let hits = 0;
      for (const e of foes(g)) {
        const dx = e.x - p.x, dy = e.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 5.5 + e.radius) continue;
        let da = Math.atan2(dy, dx) - base;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > 0.7 && d > 1.2) continue;
        if (e.onHit({ ...p.roll(10), fromX: p.x, fromY: p.y, kind: 'ink' })) hits++;
        (e as unknown as { freeze?: (t: number) => void }).freeze?.(2.6 * frost);
      }
      for (let k = -2; k <= 2; k++) {
        const a = base + k * 0.28;
        flash(g, p.x + Math.cos(a) * 0.6, p.y + 0.3 + Math.sin(a) * 0.6, p.x + Math.cos(a) * 5.2, p.y + 0.3 + Math.sin(a) * 5.2, [0.2, 0.33, 0.58], 0.14, 0.6);
      }
      w.vfx.ripple(p.x + ax * 2, p.y + ay * 2, 1.5);
      for (let k = 1; k <= 5; k++) for (const f of w.onFreeze) f(p.x + Math.cos(base) * k, p.y + Math.sin(base) * k, 1 + k * 0.3);
      sfx.clink();
      sfx.trait(3);
      if (hits) w.addCombo(hits);
      return true;
    }
    case 'storm': {
      for (let k = 0; k < 6; k++) {
        g.after(0.1 + k * 0.28, () => {
          const near = foes(g).filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < 9);
          const tg = near.length ? near[Math.floor(Math.random() * near.length)] : null;
          const x = tg ? tg.x : p.x + (Math.random() - 0.5) * 6, y = tg ? tg.y : p.y + (Math.random() - 0.5) * 5;
          flash(g, x + 0.6, y + 9, x, y + 0.3, [1, 0.9, 0.5], 0.12, 0.22);
          w.flash = Math.max(w.flash, 0.22);
          sfx.thunder();
          for (const f of w.onBolt) f(x, y, 1.7);
          for (const e of foes(g)) if (Math.hypot(e.x - x, e.y - y) < 1.7 && e.onHit({ ...p.roll(24), fromX: x, fromY: y + 1, kind: 'ink' })) w.addCombo(1);
        });
      }
      return true;
    }
    case 'mend': {
      p.heal(2);
      p.ink = Math.min(p.inkMax, p.ink + p.inkMax * 0.5);
      w.numbers?.pop(p.x, p.y + 1.6, '+2', { size: 0.5 });
      for (let i = 0; i < 3; i++) w.vfx.ripple(p.x, p.y, 0.6 + i * 0.5);
      sfx.inkstone();
      return true;
    }
    case 'mist': {
      p.mist(2);
      sfx.dodge();
      for (let i = 0; i < 5; i++) w.vfx.dust(p.x, p.y, 3);
      return true;
    }
  }
  return false;
}
