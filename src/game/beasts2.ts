/**
 * Act II's creatures. Ink frogs leap onto a painted circle and lash with their tongue; mist goats
 * charge in zig-zags down the pass; mist wraiths fade away and come back to spit slow orbs;
 * jade mantises raise their scythes before a sweeping slash.
 */
import { Creature, InkDrop } from './enemies';
import type { World } from './world';
import { HitInfo } from './entity';
import { Sprite, Frame } from '../gfx/sprite';
import { buildFrogFrames, buildGoatFrames, buildWraithFrames, buildMantisFrames } from '../gfx/gen/bestiary2';
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

/** Ink frog: crouches, leaps onto a painted circle, lashes its tongue up close. */
export class Frog extends Creature {
  private t = Math.random() * 3;
  private mode: 'sit' | 'crouch' | 'leap' | 'tongue' | 'rest' = 'sit';
  private modeT = 0;
  private from: [number, number] = [0, 0];
  private to: [number, number] = [0, 0];
  private tg: Telegraph | null = null;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.hp = 30;
    this.xp = 7;
    this.knockback = 0.7;
    this.label = 'frog';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('frog', () => buildFrogFrames(3101))[0]));
    this.initCommon(w, 0.5);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'rest'; this.modeT = 0; this.z = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.frog;
    this.t += dt;
    this.modeT += dt;
    let frame = f[0];
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    switch (this.mode) {
      case 'sit':
        if (!this.aggro) break;
        face(this, dx);
        if (this.modeT > 0.7) {
          if (d < 2.6) {
            this.mode = 'tongue';
            this.tg = w.tele.add({ kind: 'line', length: 3.2, width: 0.6 }, this.x, this.y + 0.3, Math.atan2(dy, dx), 0.4, { hold: 0.1 });
            sfx.telegraph('high', 0.4);
          } else if (d < 9) {
            // leap onto where the child will be
            const lead = Math.min(4.5, d);
            this.from = [this.x, this.y];
            this.to = [this.x + (dx / d) * lead, this.y + (dy / d) * lead];
            this.mode = 'crouch';
            this.tg = w.tele.add({ kind: 'circle', r: 1.3 * this.scaleK }, this.to[0], this.to[1], 0, 0.55, { hold: 0.05 });
            sfx.telegraph('mid', 0.55);
          } else this.walk((dx / d) * 1.6 * dt, (dy / d) * 1.6 * dt);
          this.modeT = 0;
        }
        break;
      case 'crouch':
        frame = f[1];
        if (this.modeT > 0.55) { this.mode = 'leap'; this.modeT = 0; this.tg = null; }
        break;
      case 'leap': {
        frame = f[2];
        const u = Math.min(1, this.modeT / 0.5);
        const nx = this.from[0] + (this.to[0] - this.from[0]) * u, ny = this.from[1] + (this.to[1] - this.from[1]) * u;
        this.walk(nx - this.x, ny - this.y);
        this.z = Math.sin(u * Math.PI) * 1.6;
        face(this, this.to[0] - this.from[0]);
        if (u >= 1) {
          this.z = 0;
          w.vfx.ripple(this.x, this.y, 1.1);
          sfx.splash();
          if (Math.hypot(p.x - this.x, p.y - this.y) < 1.3 * this.scaleK + p.radius) p.hurt(this.power, this.x, this.y);
          this.mode = 'rest';
          this.modeT = 0;
        }
        break;
      }
      case 'tongue':
        frame = this.modeT > 0.4 ? f[3] : f[1];
        if (this.modeT > 0.4 && this.modeT - dt <= 0.4) {
          const a = Math.atan2(dy, dx);
          const ax = Math.cos(a), ay = Math.sin(a);
          const along = (p.x - this.x) * ax + (p.y - this.y) * ay, across = Math.abs(-(p.x - this.x) * ay + (p.y - this.y) * ax);
          if (along > 0 && along < 3.3 && across < 0.6) p.hurt(this.power, this.x, this.y);
          sfx.cut();
        }
        if (this.modeT > 0.75) { this.mode = 'rest'; this.modeT = 0; this.tg = null; }
        break;
      case 'rest':
        if (this.modeT > 0.8) { this.mode = 'sit'; this.modeT = 0; }
        break;
    }
    this.place(frame, this.mode === 'sit' ? Math.abs(Math.sin(this.t * 2)) * 0.03 : 0);
  }
}

/** Mist goat: charges in a line, turns, charges again; stunned a moment when it hits rock. */
export class MistGoat extends Creature {
  private t = Math.random() * 3;
  private mode: 'roam' | 'prep' | 'charge' | 'stun' | 'rest' = 'roam';
  private modeT = 0;
  private dir: [number, number] = [1, 0];
  private left = 0;
  private charges = 0;
  private tg: Telegraph | null = null;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.5;
    this.hp = 40;
    this.xp = 8;
    this.knockback = 0.6;
    this.label = 'goat';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('goat', () => buildGoatFrames(3201))[0]));
    this.initCommon(w, 0.6);
  }
  private aim(warn: number): void {
    const w = this.world, p = w.player;
    // a little to the side: the goat comes in zig-zags
    const side = this.charges % 2 ? 1 : -1;
    const tx = p.x + side * 1.5, ty = p.y;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    this.dir = [dx / d, dy / d];
    this.left = Math.min(10, d + 3);
    this.tg = w.tele.add({ kind: 'line', length: this.left, width: 1.1 * this.scaleK }, this.x, this.y, Math.atan2(dy, dx), warn, { hold: 0.1 });
    sfx.telegraph('low', warn);
    this.mode = 'prep';
    this.modeT = 0;
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'rest'; this.modeT = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.goat;
    this.t += dt;
    this.modeT += dt;
    let frame = f[0];
    const [sx, sy] = this.seek();
    const d = Math.hypot(sx, sy) || 1;
    switch (this.mode) {
      case 'roam':
        if (!this.aggro) break;
        frame = f[1 + (Math.floor(this.t * 8) % 2)];
        this.walk((sx / d) * 2.8 * dt, (sy / d) * 2.8 * dt);
        face(this, sx);
        if (d < 10 && this.modeT > 0.5 && !w.lineBlocked(this.x, this.y, p.x, p.y)) { this.charges = this.elite ? 4 : 3; this.aim(0.42); }
        break;
      case 'prep':
        face(this, this.dir[0]);
        if (this.modeT > 0.45) { this.tg = null; this.mode = 'charge'; this.modeT = 0; }
        break;
      case 'charge': {
        frame = f[1 + (Math.floor(this.t * 14) % 2)];
        const step = 13 * dt;
        const ox = this.x, oy = this.y;
        this.walk(this.dir[0] * step, this.dir[1] * step);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        this.left -= moved;
        if (Math.random() < 0.4) w.vfx.dust(this.x - this.dir[0] * 0.4, this.y, 1);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) p.hurt(this.power, this.x, this.y);
        if (moved < step * 0.4) { this.mode = 'stun'; this.modeT = 0; sfx.impact(true); }
        else if (this.left <= 0) {
          this.charges--;
          if (this.charges > 0) this.aim(0.28);
          else { this.mode = 'rest'; this.modeT = 0; }
        }
        break;
      }
      case 'stun':
        frame = f[3];
        if (this.modeT > 0.9) { this.mode = 'roam'; this.modeT = 0; }
        break;
      case 'rest':
        if (this.modeT > 1) { this.mode = 'roam'; this.modeT = 0; }
        break;
    }
    this.place(frame);
  }
  onHit(h: HitInfo): boolean {
    return super.onHit(this.mode === 'stun' ? { ...h, dmg: Math.round(h.dmg * 1.5) } : h);
  }
}

/** Mist wraith: fades out (untouchable), drifts, comes back and spits three slow orbs. */
export class MistWraith extends Creature {
  private t = Math.random() * 3;
  private mode: 'float' | 'fade' | 'gone' | 'show' | 'cast' = 'float';
  private modeT = 0;
  private cd = 2 + Math.random() * 2;
  private target: [number, number] = [0, 0];
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.4;
    this.hp = 26;
    this.xp = 8;
    this.airborne = true;
    this.z = 0.4;
    this.knockback = 0.8;
    this.aggroRange = 10;
    this.label = 'wraith';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('wraith', () => buildWraithFrames(3301))[0]));
    this.initCommon(w, 0.4);
  }
  onHit(h: HitInfo): boolean {
    // nothing to strike while it is mist
    if (this.mode === 'gone' || (this.mode === 'fade' && this.modeT > 0.3)) return false;
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.wraith;
    this.t += dt;
    this.modeT += dt;
    this.cd -= dt;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let alpha = 0.85;
    switch (this.mode) {
      case 'float':
        if (this.aggro) {
          const want = d > 6 ? 1 : d < 4 ? -1 : 0;
          this.walk((dx / d) * want * 1.4 * dt + Math.sin(this.t) * 0.3 * dt, (dy / d) * want * 1.4 * dt);
          if (this.cd <= 0) { this.mode = 'fade'; this.modeT = 0; }
        }
        break;
      case 'fade':
        alpha = Math.max(0.1, 0.85 - this.modeT * 1.6);
        if (this.modeT > 0.5) {
          const a = Math.random() * Math.PI * 2;
          this.target = [p.x + Math.cos(a) * 5, p.y + Math.sin(a) * 4];
          this.mode = 'gone';
          this.modeT = 0;
        }
        break;
      case 'gone': {
        alpha = 0.08;
        const tx = this.target[0] - this.x, ty = this.target[1] - this.y, td = Math.hypot(tx, ty) || 1;
        this.walk((tx / td) * Math.min(td, 6 * dt), (ty / td) * Math.min(td, 6 * dt));
        if (this.modeT > 1.3) { this.mode = 'show'; this.modeT = 0; }
        break;
      }
      case 'show':
        alpha = Math.min(0.85, 0.1 + this.modeT * 2);
        if (this.modeT > 0.4) { this.mode = 'cast'; this.modeT = 0; sfx.telegraph('high', 0.45); }
        break;
      case 'cast':
        if (this.modeT > 0.45 && this.modeT - dt <= 0.45) {
          const base = Math.atan2(dy, dx);
          for (let k = -1; k <= 1; k++) {
            const a = base + k * 0.32;
            w.add(new InkDrop(this.x, this.y + 0.4, Math.cos(a) * 3.6, Math.sin(a) * 3.6, this));
          }
        }
        if (this.modeT > 0.8) { this.mode = 'float'; this.modeT = 0; this.cd = 3 + Math.random() * 2; }
        break;
    }
    this.z = 0.4 + Math.sin(this.t * 1.7) * 0.15;
    this.place(f[Math.floor(this.t * 3) % 2]);
    this.body.opacity = alpha;
  }
}

/** Jade mantis: closes in fast, raises its scythes, sweeps a cone, springs back. */
export class JadeMantis extends Creature {
  private t = Math.random() * 3;
  private mode: 'stalk' | 'raise' | 'slash' | 'back' | 'lunge' = 'stalk';
  private modeT = 0;
  private aimA = 0;
  private tg: Telegraph | null = null;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.hp = 38;
    this.xp = 10;
    this.knockback = 0.8;
    this.label = 'mantis';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('mantis', () => buildMantisFrames(3401))[0]));
    this.initCommon(w, 0.5);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'back'; this.modeT = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.mantis;
    this.t += dt;
    this.modeT += dt;
    let frame = f[0];
    const [sx, sy] = this.seek();
    const d = Math.hypot(sx, sy) || 1;
    switch (this.mode) {
      case 'stalk':
        if (!this.aggro) break;
        frame = f[3];
        face(this, sx);
        if (d > 2.4) this.walk((sx / d) * 4.2 * dt, (sy / d) * 4.2 * dt);
        if (d < 2.6 && this.modeT > 0.4) {
          this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
          this.tg = w.tele.add({ kind: 'cone', radius: 2.7 * this.scaleK, half: 0.95 }, this.x, this.y + 0.3, this.aimA, 0.45, { hold: 0.08 });
          sfx.telegraph('mid', 0.45);
          this.mode = 'raise';
          this.modeT = 0;
        } else if (d > 4 && d < 6.5 && this.modeT > 1.6 && Math.random() < dt * 1.5) {
          this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
          this.tg = w.tele.add({ kind: 'line', length: 5, width: 0.9 }, this.x, this.y, this.aimA, 0.4, { hold: 0.05 });
          sfx.telegraph('high', 0.4);
          this.mode = 'lunge';
          this.modeT = 0;
        }
        break;
      case 'raise':
        frame = f[1];
        if (this.modeT > 0.45) {
          this.tg = null;
          const da = Math.atan2(p.y - this.y, p.x - this.x) - this.aimA;
          const off = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
          if (Math.hypot(p.x - this.x, p.y - this.y) < 2.8 * this.scaleK && off < 1) p.hurt(this.power, this.x, this.y);
          for (let k = -2; k <= 2; k++) w.vfx.strikeArc(this.x, this.y + 0.4, this.aimA + k * 0.3, k & 1);
          sfx.cut();
          this.mode = 'slash';
          this.modeT = 0;
        }
        break;
      case 'slash':
        frame = f[2];
        if (this.modeT > 0.25) { this.mode = 'back'; this.modeT = 0; }
        break;
      case 'back':
        frame = f[3];
        this.walk(-Math.cos(this.aimA) * 5 * dt, -Math.sin(this.aimA) * 5 * dt);
        if (this.modeT > 0.4) { this.mode = 'stalk'; this.modeT = 0; }
        break;
      case 'lunge':
        frame = this.modeT > 0.4 ? f[2] : f[1];
        if (this.modeT > 0.4) {
          this.tg = null;
          const step = 16 * dt;
          this.walk(Math.cos(this.aimA) * step, Math.sin(this.aimA) * step);
          if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.25) p.hurt(this.power, this.x, this.y);
          if (this.modeT > 0.72) { this.mode = 'back'; this.modeT = 0.2; }
        }
        break;
    }
    this.place(frame);
  }
}
