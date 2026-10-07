/**
 * Act III's creatures. Yetis slam the snow and throw snowballs that numb the legs; snow foxes circle,
 * bite, spit fox-fire and slip away into illusions of themselves; paper cranes soar out of reach and
 * dive in a straight line, then lie folded on the snow; erasers are holes in the drawing that swallow
 * every stroke they touch, and the ink and pigment of whoever they touch.
 */
import { Creature, InkDrop } from './enemies';
import type { World } from './world';
import { Entity, HitInfo } from './entity';
import { Sprite, Frame, frameFrom, ySort } from '../gfx/sprite';
import { Painter, INK, PIG_B, mixPig } from '../gfx/paint';
import { washPoly, noisyOutline } from '../gfx/wash';
import { buildYetiFrames, buildSnowfoxFrames, buildCraneFrames, buildEraserFrames } from '../gfx/gen/bestiary4';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { sfx } from '../audio/sfx';
import type { Telegraph } from './telegraph';

const art: Record<string, Frame[]> = {};
const frames = (key: string, make: () => Frame[]): Frame[] => (art[key] ??= make());

function face(c: Creature, dx: number): void {
  const b = (c as unknown as { body: Sprite }).body;
  if (!b || Math.abs(dx) < 0.01) return;
  const s = b.mesh.scale;
  s.x = Math.abs(s.x) * (dx < 0 ? -1 : 1);
}

let ballArt: Frame | null = null;

/** A snowball: slow, heavy; it numbs the legs. Fresh ink stops it. */
export class Snowball extends Entity {
  private life = 0;
  constructor(x: number, y: number, vx: number, vy: number, private power: number) {
    super();
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.radius = 0.32;
    this.airborne = true;
    this.label = 'inkdrop';
  }
  init(): void {
    if (!ballArt) {
      const p = new Painter(1, 1, SPRITE_PPU / 2, -0.5, -0.5);
      p.reserve(() => p.ctx.ellipse(0, 0, 0.3, 0.28, 0, 0, Math.PI * 2), 1);
      p.glaze();
      washPoly(p, noisyOutline(0, 0, 0.3, 0.28, 0.15, 4101), { pig: mixPig(INK, PIG_B, 0.3), density: 0.12, soft: 0.2, edge: 0.95, seed: 4101 });
      ballArt = frameFrom(p);
    }
    this.addSprite(new Sprite(ballArt));
  }
  update(dt: number): void {
    const w = this.world;
    this.life += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const s = this.sprites[0];
    const z = 0.6 + Math.sin(Math.min(1, this.life / 1.2) * Math.PI) * 1.2;
    s.setPos(this.x, this.y + z);
    s.mesh.renderOrder = ySort(this.y);
    if (this.life > 3) { this.burst(); return; }
    if (w.strokes.absorbs(this.x, this.y, this.radius)) { this.burst(); return; }
    if (w.nav && w.lineBlocked(this.x - this.vx * dt, this.y - this.vy * dt, this.x, this.y)) { this.burst(); return; }
    const p = w.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < p.radius + this.radius + 0.1) {
      if (p.hurt(this.power, this.x, this.y)) p.slowT = Math.max(p.slowT, 1.8);
      this.burst();
    }
  }
  private burst(): void {
    this.world.vfx.dust(this.x, this.y + 0.4, 8, PIG_B);
    this.destroy();
  }
}

/** Yeti: lumbers in, raises both fists and slams the snow; throws snowballs from afar. */
export class Yeti extends Creature {
  private t = Math.random() * 6;
  private mode: 'walk' | 'raise' | 'slam' | 'throw' | 'rest' = 'walk';
  private modeT = 0;
  private cd = 2;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.8;
    this.hp = 120;
    this.xp = 20;
    this.knockback = 0.25;
    this.label = 'yeti';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('yeti', () => buildYetiFrames(4201))[0]));
    this.initCommon(w, 0.9);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.yeti;
    this.t += dt;
    this.modeT += dt;
    this.cd -= dt;
    const [sx, sy] = this.seek();
    const d = Math.hypot(sx, sy) || 1;
    let frame = f[0];
    switch (this.mode) {
      case 'walk':
        if (!this.aggro) break;
        frame = f[1 + (Math.floor(this.t * 2.5) % 2)];
        face(this, sx);
        if (d > 2.2) this.walk((sx / d) * 1.8 * dt, (sy / d) * 1.8 * dt);
        if (d < 3 && this.modeT > 0.6) {
          const R = 2.5 * this.scaleK;
          w.tele.add({ kind: 'circle', r: R }, this.x, this.y, 0, 0.8, {
            hold: 0.05,
            onFire: () => {
              if (this.dead) return;
              if (Math.hypot(p.x - this.x, p.y - this.y) < R + p.radius) p.hurt(this.power, this.x, this.y);
              w.shake(0.3, 0.3);
              sfx.impact(true);
              w.vfx.dust(this.x, this.y, 14, PIG_B);
              w.vfx.ripple(this.x, this.y, R);
            },
          });
          sfx.telegraph('low', 0.8);
          this.mode = 'raise';
          this.modeT = 0;
        } else if (d > 4 && d < 10 && this.cd <= 0) {
          this.mode = 'throw';
          this.modeT = 0;
          sfx.telegraph('mid', 0.6);
        }
        break;
      case 'raise':
        frame = f[3];
        if (this.modeT > 0.8) { this.mode = 'slam'; this.modeT = 0; }
        break;
      case 'slam':
        frame = f[4];
        if (this.modeT > 0.7) { this.mode = 'rest'; this.modeT = 0; }
        break;
      case 'throw':
        frame = f[5];
        face(this, p.x - this.x);
        if (this.modeT > 0.6 && this.modeT - dt <= 0.6) {
          const a = Math.atan2(p.y - this.y, p.x - this.x);
          w.add(new Snowball(this.x + Math.cos(a) * 0.8, this.y + Math.sin(a) * 0.8, Math.cos(a) * 5.5, Math.sin(a) * 5.5, this.power));
          sfx.cut();
        }
        if (this.modeT > 0.9) { this.mode = 'walk'; this.modeT = 0; this.cd = 3.5; }
        break;
      case 'rest':
        if (this.modeT > 1) { this.mode = 'walk'; this.modeT = 0; }
        break;
    }
    this.place(frame);
  }
}

/** Snow fox: circles, bites, spits fox-fire, and slips away into illusions of itself. */
export class SnowFox extends Creature {
  private t = Math.random() * 6;
  private mode: 'circle' | 'aim' | 'bite' | 'cast' | 'rest' = 'circle';
  private modeT = 0;
  private aimA = 0;
  private orbit = Math.random() < 0.5 ? 1 : -1;
  private trickCd = 4 + Math.random() * 2;
  private fireCd = 3;
  private tg: Telegraph | null = null;
  /** An illusion: one blow and it is snow. */
  illusion = false;
  private life = 7;
  constructor(x: number, y: number, illusion = false) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.4;
    this.hp = illusion ? 1 : 30;
    this.maxHp = this.hp;
    this.xp = illusion ? 0 : 10;
    this.knockback = 1;
    this.illusion = illusion;
    this.label = illusion ? 'illusion' : 'snowfox';
    if (illusion) this.aggro = true;
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('snowfox', () => buildSnowfoxFrames(4301))[0]));
    this.initCommon(w, 0.4);
  }
  onHit(h: HitInfo): boolean {
    if (this.illusion) {
      this.world.vfx.dust(this.x, this.y + 0.4, 10, PIG_B);
      sfx.ui();
      this.destroy();
      return true;
    }
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'rest'; this.modeT = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.snowfox;
    this.t += dt;
    this.modeT += dt;
    this.trickCd -= dt;
    this.fireCd -= dt;
    if (this.illusion) {
      this.life -= dt;
      if (this.life <= 0) { w.vfx.dust(this.x, this.y + 0.4, 8, PIG_B); this.destroy(); return; }
      this.body.opacity = 0.7 + Math.sin(this.t * 8) * 0.15;
    }
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let frame = f[Math.floor(this.t * 8) % 2];
    switch (this.mode) {
      case 'circle': {
        if (!this.aggro) { frame = f[0]; break; }
        const want = 3.2;
        const radial = (d - want) * 1.6;
        const tx = (-dy / d) * this.orbit, ty = (dx / d) * this.orbit;
        this.walk(((dx / d) * radial + tx * 4.2) * dt, ((dy / d) * radial + ty * 4.2) * dt);
        face(this, dx);
        if (this.modeT > 1.2 && d < 4.2) {
          this.aimA = Math.atan2(dy, dx);
          this.tg = w.tele.add({ kind: 'line', length: 4.6, width: 0.8 }, this.x, this.y, this.aimA, 0.4, { hold: 0.05 });
          sfx.telegraph('high', 0.4);
          this.mode = 'aim';
          this.modeT = 0;
        } else if (!this.illusion && this.trickCd <= 0) {
          this.mode = 'cast';
          this.modeT = 0;
        } else if (!this.illusion && this.fireCd <= 0 && d > 4) {
          this.fireCd = 4 + Math.random() * 2;
          const base = Math.atan2(dy, dx);
          for (let k = -1; k <= 1; k++) w.add(new InkDrop(this.x, this.y + 0.6, Math.cos(base + k * 0.3) * 4.4, Math.sin(base + k * 0.3) * 4.4, this));
          sfx.telegraph('high', 0.3);
        }
        break;
      }
      case 'aim':
        frame = f[2];
        if (this.modeT > 0.4) { this.tg = null; this.mode = 'bite'; this.modeT = 0; }
        break;
      case 'bite':
        frame = f[2];
        this.walk(Math.cos(this.aimA) * 14 * dt, Math.sin(this.aimA) * 14 * dt);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.15 && p.hurt(this.illusion ? 1 : this.power, this.x, this.y)) this.modeT = 1;
        if (this.modeT > 0.3) { this.mode = 'rest'; this.modeT = 0; this.orbit *= -1; }
        break;
      case 'cast':
        frame = f[3];
        if (this.modeT > 0.5) {
          // two illusions, and the real one slips aside
          for (let k = 0; k < 2; k++) {
            const a = Math.random() * Math.PI * 2;
            const il = new SnowFox(this.x + Math.cos(a) * 1.5, this.y + Math.sin(a) * 1.2, true);
            il.setup(this.tier, false);
            il.hp = 1;
            il.emerge = 0.3;
            w.add(il);
          }
          w.vfx.dust(this.x, this.y + 0.4, 12, PIG_B);
          const a = Math.random() * Math.PI * 2;
          this.walk(Math.cos(a) * 2.5, Math.sin(a) * 2.5);
          sfx.spawn();
          this.trickCd = 7 + Math.random() * 3;
          this.mode = 'rest';
          this.modeT = 0;
        }
        break;
      case 'rest':
        if (this.modeT > 0.5) { this.mode = 'circle'; this.modeT = 0; }
        break;
    }
    this.place(frame);
    if (this.illusion) this.body.opacity = 0.7 + Math.sin(this.t * 8) * 0.15;
  }
}

/** Paper crane: soars out of reach, dives in a straight line, lies folded on the snow, takes off. */
export class PaperCrane extends Creature {
  private t = Math.random() * 6;
  private mode: 'soar' | 'aim' | 'dive' | 'landed' | 'rise' = 'soar';
  private modeT = 0;
  private aimA = 0;
  private orbit = Math.random() < 0.5 ? 1 : -1;
  private cd = 2 + Math.random() * 2;
  private tg: Telegraph | null = null;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.4;
    this.hp = 28;
    this.xp = 9;
    this.knockback = 1;
    this.airborne = true;
    this.z = 2.6;
    this.aggroRange = 11;
    this.label = 'crane';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('crane', () => buildCraneFrames(4401))[0]));
    this.initCommon(w, 0.35);
  }
  onHit(h: HitInfo): boolean {
    // out of reach in the sky (but a loop drawn under it still catches it)
    if (this.z > 1.6 && h.kind !== 'enso' && h.kind !== 'ink') return false;
    return super.onHit(this.mode === 'landed' ? { ...h, dmg: Math.round(h.dmg * 1.3) } : h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'landed'; this.modeT = 0; this.z = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.crane;
    this.t += dt;
    this.modeT += dt;
    this.cd -= dt;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let frame = f[Math.floor(this.t * 5) % 2];
    switch (this.mode) {
      case 'soar': {
        this.z += (2.6 - this.z) * Math.min(1, dt * 3);
        if (!this.aggro) { this.walk(Math.cos(this.t * 0.5) * 1.2 * dt, Math.sin(this.t * 0.5) * 1.2 * dt); break; }
        const radial = (d - 5) * 1.2;
        const tx = (-dy / d) * this.orbit, ty = (dx / d) * this.orbit;
        this.walk(((dx / d) * radial + tx * 3.4) * dt, ((dy / d) * radial + ty * 3.4) * dt);
        face(this, tx);
        if (this.cd <= 0 && d < 8) {
          this.aimA = Math.atan2(dy, dx);
          this.tg = w.tele.add({ kind: 'line', length: 9, width: 1.0 }, this.x, this.y, this.aimA, 0.6, { hold: 0.05 });
          sfx.telegraph('high', 0.6);
          this.mode = 'aim';
          this.modeT = 0;
        }
        break;
      }
      case 'aim':
        frame = f[2];
        face(this, Math.cos(this.aimA));
        if (this.modeT > 0.6) { this.tg = null; this.mode = 'dive'; this.modeT = 0; sfx.dodge(); }
        break;
      case 'dive':
        frame = f[2];
        this.walk(Math.cos(this.aimA) * 16 * dt, Math.sin(this.aimA) * 16 * dt);
        this.z = Math.max(0.2, 2.6 - this.modeT * 9);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.2 && p.hurt(this.power, this.x, this.y)) this.modeT = 1;
        if (this.modeT > 0.55) { this.mode = 'landed'; this.modeT = 0; this.z = 0; w.vfx.dust(this.x, this.y, 8, PIG_B); }
        break;
      case 'landed':
        frame = f[3];
        this.z = 0;
        if (this.modeT > 1.4) { this.mode = 'rise'; this.modeT = 0; }
        break;
      case 'rise':
        this.z = Math.min(2.6, this.modeT * 4);
        if (this.modeT > 0.65) { this.mode = 'soar'; this.modeT = 0; this.cd = 2.5 + Math.random() * 2; this.orbit *= -1; }
        break;
    }
    this.place(frame);
  }
}

/** Eraser: a hole in the drawing. It swallows every stroke it touches, and the ink of whoever it touches. */
export class Eraser extends Creature {
  private t = Math.random() * 6;
  private mode: 'drift' | 'gather' | 'gulp' | 'rest' = 'drift';
  private modeT = 0;
  private bite = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.6;
    this.hp = 54;
    this.xp = 13;
    this.knockback = 0.4;
    this.label = 'eraser';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('eraser', () => buildEraserFrames(4501))[0]));
    this.initCommon(w, 0.6);
  }
  onHit(h: HitInfo): boolean {
    // it eats lines: a stroke thrown at it is swallowed
    if (h.kind === 'cut') return super.onHit({ ...h, dmg: Math.max(1, Math.round(h.dmg * 0.3)) });
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.eraser;
    this.t += dt;
    this.modeT += dt;
    this.bite -= dt;
    const [sx, sy] = this.seek();
    const d = Math.hypot(sx, sy) || 1;
    let frame = f[Math.floor(this.t * 2) % 2];
    // the strokes it touches are gone
    if (w.strokes.eraseNear(this.x, this.y + 0.3, this.radius + 0.5)) w.vfx.dust(this.x, this.y + 0.5, 3, PIG_B);
    switch (this.mode) {
      case 'drift':
        if (!this.aggro) break;
        this.walk((sx / d) * 1.7 * dt, (sy / d) * 1.7 * dt);
        if (d < 2.6 && this.modeT > 1.5) {
          const R = 1.9 * this.scaleK;
          w.tele.add({ kind: 'circle', r: R }, this.x, this.y, 0, 0.7, {
            hold: 0.05,
            onFire: () => {
              if (this.dead) return;
              w.strokes.eraseNear(this.x, this.y, R + 1.2);
              if (Math.hypot(p.x - this.x, p.y - this.y) < R + p.radius) this.drain();
              w.vfx.ripple(this.x, this.y, R);
              sfx.inkstone();
            },
          });
          sfx.telegraph('low', 0.7);
          this.mode = 'gather';
          this.modeT = 0;
        }
        break;
      case 'gather':
        frame = f[2];
        if (this.modeT > 0.7) { this.mode = 'gulp'; this.modeT = 0; }
        break;
      case 'gulp':
        frame = f[2];
        if (this.modeT > 0.4) { this.mode = 'rest'; this.modeT = 0; }
        break;
      case 'rest':
        if (this.modeT > 0.8) { this.mode = 'drift'; this.modeT = 0; }
        break;
    }
    if (this.bite <= 0 && Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius) { this.drain(); this.bite = 1; }
    this.place(frame, Math.sin(this.t * 1.5) * 0.06);
  }
  private drain(): void {
    const p = this.world.player;
    if (p.hurt(this.power, this.x, this.y)) {
      p.ink = Math.max(0, p.ink - 6);
      p.pigment = Math.max(0, p.pigment - 3);
      this.world.numbers?.pop(p.x, p.y + 1.6, '−', { size: 0.5 });
    }
  }
}
