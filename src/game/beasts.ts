/**
 * Regional creatures. The orchard has crows and the scarecrow that calls them; the plain, boars that
 * charge and smoke foxes that slip behind you; the cave, bats and grubs that burrow; the temple,
 * clay soldiers with shields and wandering lanterns that burst into flame.
 */
import { Creature } from './enemies';
import type { World } from './world';
import { HitInfo } from './entity';
import { Sprite, Frame } from '../gfx/sprite';
import {
  buildCrowFrames, buildScarecrowFrames, buildBoarFrames, buildFoxFrames, buildBatFrames, buildGrubFrames, buildSoldierFrames, buildLanternFrames,
} from '../gfx/gen/bestiary';
import { sfx } from '../audio/sfx';
import type { Telegraph } from './telegraph';

const art: Record<string, Frame[]> = {};
let lanternLight: Frame | null = null;
function frames(key: string, make: () => Frame[]): Frame[] {
  return (art[key] ??= make());
}

/** Face the way it moves (sprites are drawn facing +x). */
function face(c: Creature & { body: Sprite }, dx: number): void {
  if (Math.abs(dx) < 0.01) return;
  const s = c.body.mesh.scale;
  s.x = Math.abs(s.x) * (dx < 0 ? -1 : 1);
}

type Body = Creature & { body: Sprite };

/** Ink crow: circles high, then dives along a painted line. */
export class Crow extends Creature {
  private t = Math.random() * 6;
  private mode: 'circle' | 'aim' | 'dive' | 'climb' = 'circle';
  private modeT = 0;
  private cd = 1 + Math.random() * 2;
  private dir: [number, number] = [1, 0];
  private tg: Telegraph | null = null;
  private orbit = Math.random() * Math.PI * 2;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.3;
    this.hp = 14;
    this.xp = 4;
    this.airborne = true;
    this.z = 1.6;
    this.aggroRange = 10;
    this.label = 'crow';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('crow', () => buildCrowFrames(2101))[0]));
    this.initCommon(w, 0.3);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'climb'; }
      return;
    }
    const w = this.world;
    const p = w.player;
    const f = art.crow;
    this.t += dt;
    this.modeT += dt;
    let frame = f[Math.floor(this.t * 9) % 3];
    const c = this.aggro ? [p.x, p.y] : this.home ?? [this.x, this.y];
    switch (this.mode) {
      case 'circle': {
        const a = this.orbit + this.t * (this.aggro ? 1.1 : 0.6);
        const R = this.aggro ? 4 : 2.2;
        const tx = c[0] + Math.cos(a) * R, ty = c[1] + Math.sin(a) * R * 0.7;
        const dx = tx - this.x, dy = ty - this.y;
        this.walk(dx * Math.min(1, dt * 2.5), dy * Math.min(1, dt * 2.5));
        face(this as unknown as Body, dx);
        this.z += (1.6 - this.z) * Math.min(1, dt * 3);
        this.cd -= dt;
        if (this.aggro && this.cd <= 0 && p.state !== 'dead') {
          const ddx = p.x - this.x, ddy = p.y - this.y, d = Math.hypot(ddx, ddy) || 1;
          this.dir = [ddx / d, ddy / d];
          this.tg = w.tele.add({ kind: 'line', length: Math.min(9, d + 2.5), width: 0.7 }, this.x, this.y, Math.atan2(ddy, ddx), 0.55, { hold: 0.1 });
          sfx.telegraph('high', 0.5);
          this.mode = 'aim';
          this.modeT = 0;
        }
        break;
      }
      case 'aim':
        frame = f[0];
        if (this.modeT > 0.55) { this.mode = 'dive'; this.modeT = 0; this.tg = null; }
        break;
      case 'dive': {
        frame = f[3];
        face(this as unknown as Body, this.dir[0]);
        this.walk(this.dir[0] * 15 * dt, this.dir[1] * 15 * dt);
        this.z += (0.35 - this.z) * Math.min(1, dt * 10);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.15) p.hurt(this.power, this.x, this.y);
        if (this.modeT > 0.6) { this.mode = 'climb'; this.modeT = 0; }
        break;
      }
      case 'climb':
        this.z += (1.6 - this.z) * Math.min(1, dt * 2.5);
        if (this.modeT > 0.7) { this.mode = 'circle'; this.cd = 2.2 + Math.random() * 1.8; }
        break;
    }
    this.place(frame);
  }
}

/** Scarecrow: plants itself, spins its arms in a ring, calls the crows. */
export class Scarecrow extends Creature {
  private t = 0;
  private spinCd = 2.5;
  private callCd = 4;
  private spinning = 0;
  private crows: Creature[] = [];
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.55;
    this.hp = 85;
    this.xp = 14;
    this.knockback = 0;
    this.solid = true;
    this.aggroRange = 11;
    this.label = 'scarecrow';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('scarecrow', () => buildScarecrowFrames(2201))[0]));
    this.initCommon(w, 0.6);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world;
    const p = w.player;
    const f = art.scarecrow;
    this.t += dt;
    let frame = f[Math.floor(this.t * 1.5) % 2];
    this.crows = this.crows.filter((c) => !c.dead);
    if (this.aggro) {
      this.spinCd -= dt;
      this.callCd -= dt;
      if (this.spinCd <= 0 && Math.hypot(p.x - this.x, p.y - this.y) < 4) {
        this.spinCd = this.elite ? 3 : 4.2;
        sfx.telegraph('mid', 0.7);
        w.tele.add({ kind: 'ring', r0: 0.6, r1: 2.3 }, this.x, this.y, 0, 0.7, {
          hold: 0.1,
          onFire: () => {
            if (this.dead || this.dying > 0) return;
            this.spinning = 0.5;
            const d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d > 0.4 && d < 2.6) p.hurt(this.power, this.x, this.y);
            sfx.cut();
          },
        });
      }
      if (this.callCd <= 0 && this.crows.length < (this.elite ? 5 : 3)) {
        this.callCd = 6;
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          const c = new Crow(this.x + Math.cos(a) * 3, this.y + Math.sin(a) * 2).setup(this.tier, false);
          c.aggro = true;
          c.home = this.home ?? [this.x, this.y];
          c.emerge = 0.4;
          w.add(c);
          this.crows.push(c);
        }
        sfx.spawn();
      }
    }
    if (this.spinning > 0) { this.spinning -= dt; frame = f[2]; }
    this.place(frame);
  }
}

/** Ink boar: short warning, charge, a second charge re-aimed; stunned by walls. */
export class Boar extends Creature {
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
    this.radius = 0.55;
    this.hp = 48;
    this.xp = 9;
    this.knockback = 0.6;
    this.label = 'boar';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('boar', () => buildBoarFrames(2301))[0]));
    this.initCommon(w, 0.65);
  }
  private aim(warn: number): void {
    const w = this.world, p = w.player;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    this.dir = [dx / d, dy / d];
    this.left = Math.min(11, d + 3);
    this.tg = w.tele.add({ kind: 'line', length: this.left, width: 1.3 * this.scaleK }, this.x, this.y, Math.atan2(dy, dx), warn, { hold: 0.1 });
    sfx.telegraph('low', warn);
    this.mode = 'prep';
    this.modeT = 0;
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'rest'; this.modeT = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.boar;
    this.t += dt;
    this.modeT += dt;
    let frame = f[0];
    const [sx, sy] = this.seek();
    const d = Math.hypot(sx, sy) || 1;
    switch (this.mode) {
      case 'roam':
        if (!this.aggro) break;
        frame = f[1 + (Math.floor(this.t * 8) % 2)];
        this.walk((sx / d) * 2.6 * dt, (sy / d) * 2.6 * dt);
        face(this as unknown as Body, sx);
        if (d < 9 && !w.lineBlocked(this.x, this.y, p.x, p.y) && this.modeT > 0.6) { this.charges = this.elite ? 3 : 2; this.aim(0.5); }
        break;
      case 'prep':
        frame = f[0];
        this.x += Math.sin(this.modeT * 60) * 0.01;
        face(this as unknown as Body, this.dir[0]);
        if (this.tg?.fired || this.modeT > 0.6) { this.tg = null; this.mode = 'charge'; this.modeT = 0; }
        break;
      case 'charge': {
        frame = f[1 + (Math.floor(this.t * 14) % 2)];
        const step = 15 * dt;
        const ox = this.x, oy = this.y;
        this.walk(this.dir[0] * step, this.dir[1] * step);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        this.left -= moved;
        if (Math.random() < 0.5) w.vfx.dust(this.x - this.dir[0] * 0.5, this.y, 1);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) p.hurt(this.power, this.x, this.y);
        if (moved < step * 0.4) { this.mode = 'stun'; this.modeT = 0; sfx.impact(true); w.shake(0.12, 0.15); }
        else if (this.left <= 0) {
          this.charges--;
          if (this.charges > 0) this.aim(0.35);
          else { this.mode = 'rest'; this.modeT = 0; }
        }
        break;
      }
      case 'stun':
        frame = f[3];
        if (this.modeT > 1.6) { this.mode = 'roam'; this.modeT = 0; }
        break;
      case 'rest':
        if (this.modeT > 0.9) { this.mode = 'roam'; this.modeT = 0; }
        break;
    }
    this.place(frame);
  }
  onHit(h: HitInfo): boolean {
    // a stunned boar takes more
    return super.onHit(this.mode === 'stun' ? { ...h, dmg: Math.round(h.dmg * 1.5) } : h);
  }
}

/** Smoke fox: circles, vanishes in a puff, reappears behind the child and bites. */
export class SmokeFox extends Creature {
  private t = Math.random() * 3;
  private mode: 'circle' | 'vanish' | 'bite' | 'flee' = 'circle';
  private modeT = 0;
  private cd = 2 + Math.random();
  private orbit = Math.random() * Math.PI * 2;
  private tg: Telegraph | null = null;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.35;
    this.hp = 26;
    this.xp = 7;
    this.label = 'fox';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('fox', () => buildFoxFrames(2401))[0]));
    this.initCommon(w, 0.4);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'flee'; this.modeT = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.fox;
    this.t += dt;
    this.modeT += dt;
    let frame = f[0];
    this.body.opacity = 1;
    switch (this.mode) {
      case 'circle': {
        if (!this.aggro) break;
        const a = this.orbit + this.t * 1.3;
        const tx = p.x + Math.cos(a) * 3.6, ty = p.y + Math.sin(a) * 2.6;
        const [sx, sy] = w.lineBlocked(this.x, this.y, p.x, p.y) ? this.seek() : [tx - this.x, ty - this.y];
        const d = Math.hypot(sx, sy) || 1;
        this.walk((sx / d) * Math.min(d, 5.5 * dt), (sy / d) * Math.min(d, 5.5 * dt));
        face(this as unknown as Body, sx);
        frame = f[1 + (Math.floor(this.t * 10) % 2)];
        this.cd -= dt;
        if (this.cd <= 0 && p.state !== 'dead' && !w.lineBlocked(this.x, this.y, p.x, p.y)) {
          this.mode = 'vanish';
          this.modeT = 0;
          w.vfx.dust(this.x, this.y, 6);
          sfx.dodge();
        }
        break;
      }
      case 'vanish':
        this.body.opacity = Math.max(0, 1 - this.modeT * 4);
        if (this.modeT > 0.35) {
          // reappear behind the child
          const [ax, ay] = p.aim;
          const nx = p.x - ax * 1.3, ny = p.y - ay * 1.3;
          if (!w.lineBlocked(p.x, p.y, nx, ny)) { this.x = nx; this.y = ny; }
          w.vfx.dust(this.x, this.y, 6);
          this.mode = 'bite';
          this.modeT = 0;
          this.tg = w.tele.add({ kind: 'circle', r: 0.9 }, this.x, this.y, 0, 0.35, { hold: 0.05 });
        }
        break;
      case 'bite':
        frame = f[3];
        face(this as unknown as Body, p.x - this.x);
        if (this.modeT > 0.35) {
          this.tg = null;
          if (Math.hypot(p.x - this.x, p.y - this.y) < 1.1) p.hurt(this.power, this.x, this.y);
          this.mode = 'flee';
          this.modeT = 0;
        }
        break;
      case 'flee': {
        const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
        this.walk((dx / d) * 6 * dt, (dy / d) * 6 * dt);
        face(this as unknown as Body, dx);
        frame = f[1 + (Math.floor(this.t * 12) % 2)];
        if (this.modeT > 0.8) { this.mode = 'circle'; this.cd = 2.6 + Math.random() * 1.5; }
        break;
      }
    }
    this.place(frame);
  }
}

/** Ink bat: erratic, flutters around the child and nips in quick lunges. */
export class Bat extends Creature {
  private t = Math.random() * 10;
  private lungeT = 1 + Math.random() * 2;
  private lunge = 0;
  private dir: [number, number] = [1, 0];
  private ph = Math.random() * 6;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.25;
    this.hp = 9;
    this.xp = 2;
    this.airborne = true;
    this.z = 1.1;
    this.aggroRange = 8;
    this.label = 'bat';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('bat', () => buildBatFrames(2501))[0]));
    this.initCommon(w, 0.22);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.bat;
    this.t += dt;
    const frame = f[Math.floor(this.t * 16) % 2];
    if (!this.aggro) {
      const c = this.home ?? [this.x, this.y];
      this.walk((c[0] + Math.cos(this.t + this.ph) * 1.5 - this.x) * dt * 2, (c[1] + Math.sin(this.t * 1.3 + this.ph) * 1.2 - this.y) * dt * 2);
    } else if (this.lunge > 0) {
      this.lunge -= dt;
      this.walk(this.dir[0] * 10 * dt, this.dir[1] * 10 * dt);
      if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) { p.hurt(this.power, this.x, this.y); this.lunge = 0; }
    } else {
      const blocked = w.lineBlocked(this.x, this.y, p.x, p.y);
      let tx = p.x + Math.cos(this.t * 2.3 + this.ph) * 2.4, ty = p.y + Math.sin(this.t * 3.1 + this.ph) * 1.8;
      if (blocked) { const [sx, sy] = this.seek(); tx = this.x + sx; ty = this.y + sy; }
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
      this.walk((dx / d) * Math.min(d, 5 * dt), (dy / d) * Math.min(d, 5 * dt));
      this.lungeT -= dt;
      if (this.lungeT <= 0 && !blocked) {
        const ddx = p.x - this.x, ddy = p.y - this.y, dd = Math.hypot(ddx, ddy) || 1;
        this.dir = [ddx / dd, ddy / dd];
        this.lunge = 0.35;
        this.lungeT = 1.6 + Math.random() * 1.4;
      }
    }
    this.z = 1.1 + Math.sin(this.t * 6) * 0.15;
    this.place(frame);
  }
}

/** Grub: tunnels under the floor (a moving ripple), erupts under the child, then burrows again. */
export class Grub extends Creature {
  private t = 0;
  private mode: 'under' | 'mark' | 'out' = 'under';
  private modeT = 0;
  private tg: Telegraph | null = null;
  private rip = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.4;
    this.hp = 34;
    this.xp = 8;
    this.knockback = 0.3;
    this.label = 'grub';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('grub', () => buildGrubFrames(2601))[0]));
    this.initCommon(w, 0.45);
  }
  onHit(h: HitInfo): boolean {
    if (this.mode === 'under') return false;
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'out'; this.modeT = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.grub;
    this.t += dt;
    this.modeT += dt;
    let frame = f[0];
    if (this.shadowS) this.shadowS.opacity = this.mode === 'under' ? 0 : 1;
    switch (this.mode) {
      case 'under': {
        if (!this.aggro) break;
        const [sx, sy] = this.seek();
        const d = Math.hypot(sx, sy) || 1;
        this.walk((sx / d) * 3.2 * dt, (sy / d) * 3.2 * dt);
        this.rip -= dt;
        if (this.rip <= 0) { w.vfx.ripple(this.x, this.y, 0.5); this.rip = 0.25; }
        if (d < 2.4 && this.modeT > 0.8 && p.state !== 'dead') {
          this.mode = 'mark';
          this.modeT = 0;
          this.tg = w.tele.add({ kind: 'circle', r: 1.1 }, p.x, p.y, 0, 0.7, { hold: 0.05 });
          sfx.telegraph('low', 0.7);
        }
        break;
      }
      case 'mark':
        if (this.modeT > 0.7) {
          const tg = this.tg;
          this.tg = null;
          if (tg) { this.x = tg.x; this.y = tg.y; }
          if (Math.hypot(p.x - this.x, p.y - this.y) < 1.2) p.hurt(this.power, this.x, this.y);
          w.vfx.splat(this.x, this.y + 0.4, Math.random() * 6, 8, 1);
          w.shake(0.12, 0.15);
          sfx.impact(false);
          this.mode = 'out';
          this.modeT = 0;
        }
        break;
      case 'out':
        frame = this.modeT < 0.15 ? f[1] : f[2];
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.25 && Math.floor(this.modeT * 2) !== Math.floor((this.modeT - dt) * 2)) {
          frame = f[3];
          p.hurt(this.power, this.x, this.y);
        }
        if (this.modeT > 2.4) { this.mode = 'under'; this.modeT = 0; w.vfx.dust(this.x, this.y, 4); }
        break;
    }
    this.body.opacity = this.mode === 'under' || this.mode === 'mark' ? 0.25 : 1;
    this.place(frame);
  }
}

/** Clay soldier: a shield in front (only frost or a blow from behind gets through), a slow sweeping blade. */
export class ClaySoldier extends Creature {
  private t = 0;
  private mode: 'walk' | 'wind' | 'sweep' = 'walk';
  private modeT = 0;
  private dir: [number, number] = [1, 0];
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.hp = 90;
    this.xp = 16;
    this.knockback = 0.35;
    this.label = 'soldier';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('soldier', () => buildSoldierFrames(2701))[0]));
    this.initCommon(w, 0.5);
  }
  onHit(h: HitInfo): boolean {
    const tx = h.fromX - this.x, ty = h.fromY - this.y, l = Math.hypot(tx, ty) || 1;
    const front = (tx * this.dir[0] + ty * this.dir[1]) / l > 0.4;
    if ((h.kind === 'brush' || h.kind === 'cut') && front && this.frozen <= 0 && this.mode !== 'sweep') {
      sfx.clink();
      this.world.numbers?.pop(this.x, this.y + 2, '0', { size: 0.4 });
      return false;
    }
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.soldier;
    this.t += dt;
    this.modeT += dt;
    let frame = f[0];
    switch (this.mode) {
      case 'walk': {
        if (!this.aggro) break;
        const [sx, sy] = this.seek();
        const d = Math.hypot(sx, sy) || 1;
        this.dir = [sx / d, sy / d];
        face(this as unknown as Body, sx);
        if (d > 1.9) { this.walk((sx / d) * 1.7 * dt, (sy / d) * 1.7 * dt); frame = f[Math.floor(this.t * 4) % 2]; }
        else if (this.modeT > 0.8) {
          this.mode = 'wind';
          this.modeT = 0;
          sfx.telegraph('mid', 0.6);
          w.tele.add({ kind: 'cone', radius: 2.6, half: 1.0 }, this.x, this.y, Math.atan2(this.dir[1], this.dir[0]), 0.6, {
            hold: 0.1,
            onFire: () => {
              if (this.dead || this.dying > 0 || this.frozen > 0) return;
              const dx = p.x - this.x, dy = p.y - this.y, dd = Math.hypot(dx, dy);
              let da = Math.atan2(dy, dx) - Math.atan2(this.dir[1], this.dir[0]);
              da = Math.atan2(Math.sin(da), Math.cos(da));
              if (dd < 2.8 && Math.abs(da) < 1.05) p.hurt(this.power, this.x, this.y);
              sfx.cut();
            },
          });
        }
        break;
      }
      case 'wind':
        frame = f[2];
        if (this.modeT > 0.6) { this.mode = 'sweep'; this.modeT = 0; }
        break;
      case 'sweep':
        frame = f[3];
        if (this.modeT > 0.7) { this.mode = 'walk'; this.modeT = 0; }
        break;
    }
    this.place(frame);
  }
}

/** Wandering lantern: drifts to the child, flares, bursts. Lights the dark around it. */
export class Lantern extends Creature {
  private t = Math.random() * 4;
  private lit = -1;
  private glow!: Sprite;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.32;
    this.hp = 20;
    this.xp = 6;
    this.airborne = true;
    this.z = 0.9;
    this.aggroRange = 9;
    this.label = 'lantern';
  }
  init(w: World): void {
    const fr = frames('lantern', () => {
      const a = buildLanternFrames(2801);
      lanternLight = a.light;
      return a.pig;
    });
    this.body = this.addSprite(new Sprite(fr[0]));
    this.glow = this.addSprite(new Sprite(lanternLight!), true);
    this.initCommon(w, 0.3);
  }
  private burst(): void {
    const w = this.world, p = w.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < 2.1) p.hurt(this.power, this.x, this.y);
    for (let i = 0; i < 8; i++) w.vfx.flame(this.x + (Math.random() - 0.5) * 1.5, this.y + Math.random() * 0.6, 1.2);
    w.vfx.glowAt(this.x, this.y + 0.5, 4, 0.4);
    w.shake(0.15, 0.2);
    sfx.fire();
    this.hp = 0;
    this.dying = 0.001;
    w.onKill?.(this);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) { this.glow.opacity = this.dying > 0 ? 0 : 0.6; return; }
    const w = this.world, p = w.player, f = art.lantern;
    this.t += dt;
    let frame = f[Math.floor(this.t * 2) % 2];
    if (this.lit >= 0) {
      this.lit += dt;
      frame = f[2];
      this.glow.opacity = 0.6 + Math.sin(this.lit * 30) * 0.4;
      if (this.lit > 0.9) { this.burst(); return; }
    } else if (this.aggro) {
      const [sx, sy] = this.seek();
      const d = Math.hypot(sx, sy) || 1;
      this.walk((sx / d) * 2.3 * dt + Math.cos(this.t * 2) * 0.3 * dt, (sy / d) * 2.3 * dt + Math.sin(this.t * 1.7) * 0.3 * dt);
      this.glow.opacity = 0.8;
      if (d < 2 && !w.lineBlocked(this.x, this.y, p.x, p.y)) {
        this.lit = 0;
        w.tele.add({ kind: 'circle', r: 2 }, this.x, this.y, 0, 0.9, { hold: 0.05 });
        sfx.telegraph('high', 0.9);
      }
    } else this.glow.opacity = 0.6;
    this.z = 0.9 + Math.sin(this.t * 2.2) * 0.12;
    this.glow.setPos(this.x, this.y + this.z);
    this.place(frame);
  }
}
