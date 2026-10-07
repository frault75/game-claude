/**
 * Act I, zone by zone. Paper moths of the orchard dive and burst into a dust that slows the child;
 * ink eels swim in the ink spilled on the ground and strike from it; inkpot crabs sidestep, pinch
 * twice and shut themselves in their shell; ink stags of the red hills plant their antlers and
 * thorny roots burst out in a line.
 */
import { Creature, InkDrop } from './enemies';
import type { World } from './world';
import { HitInfo } from './entity';
import { Sprite, Frame } from '../gfx/sprite';
import { buildMothFrames, buildEelFrames, buildCrabFrames, buildStagFrames } from '../gfx/gen/bestiary1b';
import { sfx } from '../audio/sfx';
import { PIG_A } from '../gfx/paint';
import type { Telegraph } from './telegraph';

const art: Record<string, Frame[]> = {};
const frames = (key: string, make: () => Frame[]): Frame[] => (art[key] ??= make());

function face(c: Creature, dx: number): void {
  const b = (c as unknown as { body: Sprite }).body;
  if (!b || Math.abs(dx) < 0.01) return;
  const s = b.mesh.scale;
  s.x = Math.abs(s.x) * (dx < 0 ? -1 : 1);
}

/** Paper moth: flutters around the child, dives, bursts into a dust that slows. */
export class Moth extends Creature {
  private t = Math.random() * 6;
  private mode: 'flutter' | 'aim' | 'dive' | 'rest' = 'flutter';
  private modeT = 0;
  private cd = 2 + Math.random() * 2;
  private to: [number, number] = [0, 0];
  private from: [number, number] = [0, 0];
  private orbit = Math.random() < 0.5 ? 1 : -1;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.32;
    this.hp = 14;
    this.xp = 4;
    this.knockback = 1.3;
    this.airborne = true;
    this.z = 0.9;
    this.aggroRange = 8;
    this.label = 'moth';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('moth', () => buildMothFrames(1701))[0]));
    this.initCommon(w, 0.25);
    this.onDie = () => this.dust(1.3, 1.4);
  }
  private dust(r: number, slow: number): void {
    const w = this.world, p = w.player;
    for (let k = 0; k < 8; k++) w.vfx.dust(this.x + (Math.random() - 0.5) * r, this.y + (Math.random() - 0.5) * r, 1, PIG_A);
    if (Math.hypot(p.x - this.x, p.y - this.y) < r + p.radius) p.slowT = Math.max(p.slowT, slow);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.moth;
    this.t += dt;
    this.modeT += dt;
    this.cd -= dt;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let frame = f[Math.floor(this.t * 10) % 2];
    switch (this.mode) {
      case 'flutter':
        if (this.aggro) {
          // circle the child, drifting in and out
          const want = 3.2 + Math.sin(this.t * 0.7) * 0.8;
          const radial = (d - want) * 1.2;
          const tx = -dy / d * this.orbit, ty = dx / d * this.orbit;
          this.walk(((dx / d) * radial + tx * 2.4 + Math.sin(this.t * 3) * 0.8) * dt, ((dy / d) * radial + ty * 2.4 + Math.cos(this.t * 2.6) * 0.8) * dt);
          face(this, dx);
          if (this.cd <= 0) {
            this.mode = 'aim';
            this.modeT = 0;
            this.from = [this.x, this.y];
            this.to = [p.x, p.y];
            w.tele.add({ kind: 'circle', r: 1.4 }, p.x, p.y, 0, 0.7, { hold: 0.05 });
            sfx.telegraph('high', 0.7);
          }
        } else this.walk(Math.cos(this.t) * 0.6 * dt, Math.sin(this.t * 1.3) * 0.6 * dt);
        break;
      case 'aim':
        if (this.modeT > 0.45) { this.mode = 'dive'; this.modeT = 0; }
        break;
      case 'dive': {
        frame = f[1];
        const u = Math.min(1, this.modeT / 0.25);
        this.walk(this.from[0] + (this.to[0] - this.from[0]) * u - this.x, this.from[1] + (this.to[1] - this.from[1]) * u - this.y);
        if (u >= 1) {
          frame = f[2];
          this.dust(1.4, 2.2);
          if (Math.hypot(p.x - this.x, p.y - this.y) < 1.4 + p.radius) p.hurt(Math.max(1, this.power - 1), this.x, this.y);
          this.mode = 'rest';
          this.modeT = 0;
          this.cd = 3 + Math.random() * 2;
        }
        break;
      }
      case 'rest':
        if (this.modeT > 0.6) { this.mode = 'flutter'; this.modeT = 0; }
        break;
    }
    this.z = 0.9 + Math.sin(this.t * 4) * 0.2;
    this.place(frame);
  }
}

/** Ink eel: swims under the spilled ink of the ground, strikes out of it, lies exposed, dives again. */
export class Eel extends Creature {
  private t = Math.random() * 6;
  private mode: 'under' | 'rise' | 'strike' | 'exposed' | 'dive' = 'under';
  private modeT = 0;
  private aimA = 0;
  private tg: Telegraph | null = null;
  private drift: [number, number] = [0, 0];
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.4;
    this.hp = 34;
    this.xp = 8;
    this.knockback = 0.7;
    this.aggroRange = 9;
    this.label = 'eel';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('eel', () => buildEelFrames(1801))[0]));
    this.initCommon(w, 0.35);
  }
  onHit(h: HitInfo): boolean {
    if (this.mode === 'under' || (this.mode === 'dive' && this.modeT > 0.15)) return false;
    return super.onHit(this.mode === 'exposed' ? { ...h, dmg: Math.round(h.dmg * 1.4) } : h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'exposed'; this.modeT = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.eel;
    this.t += dt;
    this.modeT += dt;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let frame = f[Math.floor(this.t * 4) % 2];
    let alpha = 1;
    switch (this.mode) {
      case 'under':
        alpha = 0;
        if (Math.random() < dt * 5) w.vfx.ripple(this.x + (Math.random() - 0.5) * 0.6, this.y + (Math.random() - 0.5) * 0.3, 0.45);
        if (this.aggro) {
          if (d > 3.2) this.walk((dx / d) * 2.6 * dt + this.drift[0] * dt, (dy / d) * 2.6 * dt + this.drift[1] * dt);
          else if (this.modeT > 0.8) {
            this.aimA = Math.atan2(dy, dx);
            this.tg = w.tele.add({ kind: 'line', length: 4.2, width: 0.8 }, this.x, this.y, this.aimA, 0.5, { hold: 0.05 });
            sfx.telegraph('mid', 0.5);
            sfx.splash();
            this.mode = 'rise';
            this.modeT = 0;
          }
        }
        break;
      case 'rise':
        alpha = Math.min(1, this.modeT * 2.5);
        face(this, Math.cos(this.aimA));
        if (this.modeT > 0.5) { this.tg = null; this.mode = 'strike'; this.modeT = 0; }
        break;
      case 'strike':
        frame = f[2];
        this.walk(Math.cos(this.aimA) * 13 * dt, Math.sin(this.aimA) * 13 * dt);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.2 && p.hurt(this.power, this.x, this.y)) this.modeT = 1;
        if (this.modeT > 0.28) { this.mode = 'exposed'; this.modeT = 0; w.vfx.ripple(this.x, this.y, 0.9); }
        break;
      case 'exposed':
        face(this, dx);
        if (this.modeT > 1.6) { this.mode = 'dive'; this.modeT = 0; sfx.splash(); }
        break;
      case 'dive':
        alpha = Math.max(0, 1 - this.modeT * 3);
        if (this.modeT > 0.35) {
          const a = Math.random() * Math.PI * 2;
          this.drift = [Math.cos(a) * 1.5, Math.sin(a) * 1.5];
          this.mode = 'under';
          this.modeT = 0;
        }
        break;
    }
    this.place(frame);
    this.body.opacity = alpha;
    if (this.shadowS) this.shadowS.opacity = alpha;
  }
}

/** Inkpot crab: sidesteps, pinches twice, shuts itself in its shell when hurt, spits ink. */
export class Crab extends Creature {
  private t = Math.random() * 6;
  private mode: 'side' | 'pinch' | 'shell' | 'spit' | 'rest' = 'side';
  private modeT = 0;
  private sideDir = Math.random() < 0.5 ? 1 : -1;
  private sideT = 0;
  private pinches = 0;
  private aimA = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.hp = 42;
    this.xp = 9;
    this.knockback = 0.5;
    this.label = 'crab';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('crab', () => buildCrabFrames(1901))[0]));
    this.initCommon(w, 0.5);
  }
  onHit(h: HitInfo): boolean {
    if (this.mode === 'shell') { sfx.clink(); return super.onHit({ ...h, dmg: Math.max(1, Math.round(h.dmg * 0.2)) }); }
    const before = this.hp;
    const r = super.onHit(h);
    // a hard blow: into the shell
    if (r && this.hp > 0 && (before - this.hp > this.maxHp * 0.22 || (before > this.maxHp * 0.5 && this.hp <= this.maxHp * 0.5))) { this.mode = 'shell'; this.modeT = 0; }
    return r;
  }
  private pinch(): void {
    const w = this.world, p = w.player;
    this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
    const a = this.aimA;
    w.tele.add({ kind: 'cone', radius: 1.9 * this.scaleK, half: 0.8 }, this.x, this.y + 0.2, a, 0.35, {
      hold: 0.04,
      onFire: () => {
        if (this.dead) return;
        let da = Math.atan2(p.y - this.y, p.x - this.x) - a;
        da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
        if (Math.hypot(p.x - this.x, p.y - this.y) < 2.0 * this.scaleK && da < 0.85) p.hurt(this.power, this.x, this.y);
        sfx.cut();
      },
    });
    sfx.telegraph('mid', 0.35);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.crab;
    this.t += dt;
    this.modeT += dt;
    this.sideT -= dt;
    const [sx, sy] = this.seek();
    const d = Math.hypot(sx, sy) || 1;
    let frame = f[Math.floor(this.t * 6) % 2];
    switch (this.mode) {
      case 'side': {
        if (!this.aggro) { frame = f[0]; break; }
        if (this.sideT <= 0) { this.sideDir *= -1; this.sideT = 1 + Math.random(); }
        // sideways, closing in
        const nx = sx / d, ny = sy / d;
        const close = d > 1.8 ? 1.4 : -0.6;
        this.walk((-ny * this.sideDir * 3.2 + nx * close) * dt, (nx * this.sideDir * 3.2 + ny * close) * dt);
        if (d < 2.2 && this.modeT > 0.8) { this.pinches = 2; this.pinch(); this.mode = 'pinch'; this.modeT = 0; }
        else if (d > 5 && this.modeT > 2.5 && Math.random() < dt) { this.mode = 'spit'; this.modeT = 0; sfx.telegraph('high', 0.4); }
        break;
      }
      case 'pinch':
        frame = f[2];
        if (this.modeT > 0.45) {
          this.pinches--;
          if (this.pinches > 0) { this.pinch(); this.modeT = 0; }
          else { this.mode = 'rest'; this.modeT = 0; }
        }
        break;
      case 'shell':
        frame = f[3];
        if (this.modeT > 1.4) { this.mode = 'spit'; this.modeT = 0; sfx.telegraph('high', 0.4); }
        break;
      case 'spit':
        frame = f[2];
        if (this.modeT > 0.4 && this.modeT - dt <= 0.4) {
          const a = Math.atan2(p.y - this.y, p.x - this.x);
          for (const k of [-0.18, 0.18]) w.add(new InkDrop(this.x, this.y + 0.5, Math.cos(a + k) * 4.6, Math.sin(a + k) * 4.6, this));
        }
        if (this.modeT > 0.7) { this.mode = 'side'; this.modeT = 0; }
        break;
      case 'rest':
        frame = f[0];
        if (this.modeT > 0.7) { this.mode = 'side'; this.modeT = 0; }
        break;
    }
    this.place(frame);
  }
}

/** Ink stag: keeps its distance, rears, plants its antlers — thorny roots burst out in a line. */
export class Stag extends Creature {
  private t = Math.random() * 6;
  private mode: 'roam' | 'rear' | 'plant' | 'buck' | 'rest' = 'roam';
  private modeT = 0;
  private cd = 1.5;
  private aimA = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.55;
    this.hp = 62;
    this.xp = 13;
    this.knockback = 0.45;
    this.aggroRange = 10;
    this.label = 'stag';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('stag', () => buildStagFrames(2001))[0]));
    this.initCommon(w, 0.7);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.stag;
    this.t += dt;
    this.modeT += dt;
    this.cd -= dt;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let frame = f[0];
    switch (this.mode) {
      case 'roam':
        if (!this.aggro) break;
        face(this, dx);
        frame = f[Math.floor(this.t * 3) % 2];
        {
          const want = d < 4 ? -1 : d > 7 ? 1 : 0;
          this.walk((dx / d) * want * 2.8 * dt, (dy / d) * want * 2.8 * dt);
        }
        if (d < 2.2 && this.modeT > 0.6) {
          this.aimA = Math.atan2(dy, dx);
          w.tele.add({ kind: 'cone', radius: 2.4 * this.scaleK, half: 0.9 }, this.x, this.y + 0.3, this.aimA, 0.45, {
            hold: 0.05,
            onFire: () => {
              if (this.dead) return;
              let da = Math.atan2(p.y - this.y, p.x - this.x) - this.aimA;
              da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
              if (Math.hypot(p.x - this.x, p.y - this.y) < 2.5 * this.scaleK && da < 0.95) p.hurt(this.power, this.x, this.y);
              sfx.impact(false);
            },
          });
          sfx.telegraph('mid', 0.45);
          this.mode = 'buck';
          this.modeT = 0;
        } else if (this.cd <= 0 && d < 10) {
          this.aimA = Math.atan2(dy, dx);
          this.mode = 'rear';
          this.modeT = 0;
          sfx.telegraph('low', 0.6);
        }
        break;
      case 'rear':
        frame = f[2];
        if (this.modeT > 0.6) {
          // roots burst out along a line towards the child, one after another
          const a = this.aimA;
          for (let k = 0; k < 6; k++) {
            const rx = this.x + Math.cos(a) * (1.4 + k * 1.3), ry = this.y + Math.sin(a) * (1.4 + k * 1.3);
            w.tele.add({ kind: 'circle', r: 0.95 }, rx, ry, 0, 0.45 + k * 0.12, {
              hold: 0.05,
              onFire: () => {
                if (Math.hypot(p.x - rx, p.y - ry) < 0.95 + p.radius) p.hurt(this.power, rx, ry);
                w.vfx.splat(rx, ry + 0.3, Math.PI / 2, 4, 0.6);
                if (k % 2 === 0) sfx.cut();
              },
            });
          }
          this.mode = 'plant';
          this.modeT = 0;
        }
        break;
      case 'plant':
        frame = f[3];
        if (this.modeT > 1.1) { this.mode = 'rest'; this.modeT = 0; this.cd = 3.5 + Math.random() * 1.5; }
        break;
      case 'buck':
        frame = f[2];
        if (this.modeT > 0.6) { this.mode = 'rest'; this.modeT = 0; }
        break;
      case 'rest':
        frame = f[0];
        if (this.modeT > 0.9) { this.mode = 'roam'; this.modeT = 0; }
        break;
    }
    this.place(frame);
  }
}
