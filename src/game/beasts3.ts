/**
 * Act II, deeper: tadpoles that swarm out of black water, kappa whose shell turns the brush aside
 * (strike from behind, catch them in a loop, or wait for them to bow), and tanuki who pose as stone
 * lanterns, pick your purse and run.
 */
import { Creature, InkDrop } from './enemies';
import type { World } from './world';
import { HitInfo } from './entity';
import { Sprite, Frame } from '../gfx/sprite';
import { buildTadpoleFrames, buildKappaFrames, buildTanukiFrames } from '../gfx/gen/bestiary3';
import { sfx } from '../audio/sfx';
import { save } from './progression';
import { Pickup } from './pickups';
import type { Telegraph } from './telegraph';

const art: Record<string, Frame[]> = {};
const frames = (key: string, make: () => Frame[]): Frame[] => (art[key] ??= make());

function face(c: Creature, dx: number): void {
  const b = (c as unknown as { body: Sprite }).body;
  if (!b || Math.abs(dx) < 0.01) return;
  const s = b.mesh.scale;
  s.x = Math.abs(s.x) * (dx < 0 ? -1 : 1);
}

/** Tadpole: wriggles in fast and nips, darts back, comes again. Weak alone, a nuisance in a swarm. */
export class Tadpole extends Creature {
  private t = Math.random() * 6;
  private back = 0;
  private bite = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.28;
    this.hp = 9;
    this.xp = 2;
    this.knockback = 1.2;
    this.aggroRange = 11;
    this.label = 'tadpole';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('tadpole', () => buildTadpoleFrames(3501))[0]));
    this.initCommon(w, 0.25);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.tadpole;
    this.t += dt;
    this.bite -= dt;
    this.back -= dt;
    const [sx, sy] = this.seek();
    const d = Math.hypot(sx, sy) || 1;
    if (this.aggro) {
      const wig = Math.sin(this.t * 7) * 0.9;
      const nx = sx / d, ny = sy / d;
      const k = this.back > 0 ? -3.5 : 4.6;
      this.walk((nx * k - ny * wig) * dt, (ny * k + nx * wig) * dt);
      face(this, nx * (this.back > 0 ? -1 : 1));
      if (this.back <= 0 && this.bite <= 0 && Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) {
        p.hurt(Math.max(1, this.power - 1), this.x, this.y);
        this.bite = 1.0;
        this.back = 0.5;
      }
    } else this.walk(Math.cos(this.t) * 0.4 * dt, Math.sin(this.t * 0.7) * 0.4 * dt);
    this.place(f[Math.floor(this.t * 8) % 2]);
  }
}

/** Kappa: walks shell-first; lunges; then bows to catch its breath and spills the water on its head. */
export class Kappa extends Creature {
  private t = Math.random() * 3;
  private mode: 'walk' | 'aim' | 'lunge' | 'bow' = 'walk';
  private modeT = 0;
  private aimA = 0;
  private faceX = 1;
  private tg: Telegraph | null = null;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.48;
    this.hp = 52;
    this.xp = 11;
    this.knockback = 0.5;
    this.label = 'kappa';
  }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('kappa', () => buildKappaFrames(3601))[0]));
    this.initCommon(w, 0.5);
  }
  onHit(h: HitInfo): boolean {
    if (this.mode === 'bow') return super.onHit({ ...h, dmg: Math.round(h.dmg * 2) });
    // loops close around it; from the front, the shell turns strokes aside
    if (h.kind !== 'enso' && h.kind !== 'whirl') {
      const p = this.world.player;
      const toA = Math.atan2(h.fromY - this.y, h.fromX - this.x);
      const facing = Math.atan2(p.y - this.y, p.x - this.x);
      let da = toA - facing;
      da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
      if (da < 1.1 && this.mode !== 'lunge') {
        sfx.clink();
        return super.onHit({ ...h, dmg: Math.max(1, Math.round(h.dmg * 0.3)) });
      }
      if (da > 2.2) return super.onHit({ ...h, dmg: Math.round(h.dmg * 1.5), crit: true });
    }
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'bow'; this.modeT = 0; }
      return;
    }
    const w = this.world, p = w.player, f = art.kappa;
    this.t += dt;
    this.modeT += dt;
    let frame = f[0];
    const [sx, sy] = this.seek();
    const d = Math.hypot(sx, sy) || 1;
    switch (this.mode) {
      case 'walk':
        if (!this.aggro) break;
        frame = f[1 + (Math.floor(this.t * 4) % 2)];
        this.faceX = sx;
        if (d > 2) this.walk((sx / d) * 2.5 * dt, (sy / d) * 2.5 * dt);
        if (d < 4.2 && this.modeT > 0.9) {
          this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
          this.tg = w.tele.add({ kind: 'line', length: 4.2, width: 1.0 }, this.x, this.y, this.aimA, 0.55, { hold: 0.05 });
          sfx.telegraph('mid', 0.55);
          this.mode = 'aim';
          this.modeT = 0;
        }
        break;
      case 'aim':
        frame = f[3];
        if (this.modeT > 0.55) { this.mode = 'lunge'; this.modeT = 0; this.tg = null; }
        break;
      case 'lunge': {
        frame = f[3];
        this.walk(Math.cos(this.aimA) * 13 * dt, Math.sin(this.aimA) * 13 * dt);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.2 && p.hurt(this.power, this.x, this.y)) this.modeT = 1;
        if (this.modeT > 0.32) {
          this.mode = 'bow';
          this.modeT = 0;
          w.vfx.ripple(this.x + Math.cos(this.aimA) * 0.6, this.y + Math.sin(this.aimA) * 0.6, 0.6);
          sfx.splash();
        }
        break;
      }
      case 'bow':
        frame = f[4];
        if (this.modeT > 1.3) { this.mode = 'walk'; this.modeT = 0; }
        break;
    }
    face(this, this.mode === 'walk' ? this.faceX : Math.cos(this.aimA));
    this.place(frame);
  }
}

/** Tanuki: a stone lantern until you come close. Throws leaves, picks your purse, runs away laughing. */
export class Tanuki extends Creature {
  private t = Math.random() * 3;
  private mode: 'statue' | 'reveal' | 'chase' | 'throw' | 'flee' = 'statue';
  private modeT = 0;
  private stolen = 0;
  private fleeA = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.42;
    this.hp = 34;
    this.xp = 9;
    this.knockback = 0.9;
    this.aggroRange = 0;
    this.label = 'tanuki';
  }
  get disguised(): boolean { return this.mode === 'statue'; }
  init(w: World): void {
    this.body = this.addSprite(new Sprite(frames('tanuki', () => buildTanukiFrames(3701))[0]));
    this.initCommon(w, 0.45);
    if (this.shadowS) this.shadowS.opacity = 0.6;
    this.onDie = () => {
      const n = this.stolen + 4 + this.tier * 2;
      for (let k = 0; k < 3; k++) w.add(new Pickup(this.x + (k - 1) * 0.4, this.y, 'coin', Math.max(1, Math.round(n / 3))));
    };
  }
  private reveal(): void {
    if (this.mode !== 'statue') return;
    this.mode = 'reveal';
    this.modeT = 0;
    this.aggro = true;
    this.world.vfx.dust(this.x, this.y + 0.5, 10);
    this.world.vfx.ripple(this.x, this.y, 0.9);
    sfx.spawn();
  }
  onHit(h: HitInfo): boolean {
    if (this.mode === 'statue') { this.reveal(); return super.onHit({ ...h, dmg: Math.round(h.dmg * 0.5) }); }
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = art.tanuki;
    this.t += dt;
    this.modeT += dt;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let frame = f[1];
    switch (this.mode) {
      case 'statue':
        frame = f[0];
        if (d < 2.3 && p.state !== 'dead') this.reveal();
        break;
      case 'reveal':
        frame = f[1];
        face(this, dx);
        if (this.modeT > 0.5) { this.mode = 'chase'; this.modeT = 0; }
        break;
      case 'chase':
        frame = f[2 + (Math.floor(this.t * 8) % 2)];
        face(this, dx);
        this.walk((dx / d) * 4.4 * dt, (dy / d) * 4.4 * dt);
        if (d < this.radius + p.radius + 0.15) {
          // the purse
          const take = Math.min(save.coins, 4 + this.tier * 2);
          if (take > 0) {
            save.coins -= take;
            this.stolen += take;
            w.numbers?.pop(p.x, p.y + 1.6, `-${take}`, { size: 0.45, red: true });
            sfx.clink();
          } else p.hurt(this.power, this.x, this.y);
          this.mode = 'flee';
          this.modeT = 0;
          this.fleeA = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.8;
        } else if (d > 3 && d < 7 && this.modeT > 1.2 && Math.random() < dt * 1.2) {
          this.mode = 'throw';
          this.modeT = 0;
          sfx.telegraph('high', 0.35);
        }
        break;
      case 'throw':
        frame = f[4];
        if (this.modeT > 0.35 && this.modeT - dt <= 0.35) {
          const base = Math.atan2(dy, dx);
          for (let k = -1; k <= 1; k++) w.add(new InkDrop(this.x, this.y + 0.5, Math.cos(base + k * 0.25) * 5, Math.sin(base + k * 0.25) * 5, this));
        }
        if (this.modeT > 0.7) { this.mode = 'chase'; this.modeT = 0; }
        break;
      case 'flee':
        frame = f[2 + (Math.floor(this.t * 10) % 2)];
        this.walk(Math.cos(this.fleeA) * 6 * dt, Math.sin(this.fleeA) * 6 * dt);
        face(this, Math.cos(this.fleeA));
        if (Math.random() < dt * 2) this.fleeA += (Math.random() - 0.5) * 1.2;
        if (Math.random() < dt * 6) w.vfx.dust(this.x, this.y, 1);
        // a puff of smoke and it is gone, with your coins
        if (this.modeT > 6) {
          w.vfx.dust(this.x, this.y + 0.5, 12);
          sfx.spawn();
          this.destroy();
          return;
        }
        break;
    }
    this.place(frame, this.mode === 'statue' ? 0 : this.mode === 'reveal' ? Math.abs(Math.sin(this.modeT * 12)) * 0.12 : 0);
  }
}
