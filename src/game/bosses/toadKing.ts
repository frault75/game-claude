/**
 * Guardian of the Great Basin — the Toad King: leaps and crushes, lashes his tongue across the hall
 * and reels in whoever it catches, swells up to spit a fan of ink (strike the swollen belly hard
 * enough and it bursts), croaks tadpoles out of the black pools. Wounded, he dives into a pool to
 * drink and heal, and comes up out of another: gold struck into his pool shocks him out, indigo
 * locks him in the ice — and a frozen pool is one he cannot use.
 */
import { Boss } from '../boss';
import type { World } from '../world';
import { Entity, HitInfo } from '../entity';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../../gfx/sprite';
import { buildToadKingFrames, Layered } from '../../gfx/gen/bestiary3';
import { Painter, INK, PIG_B, mixPig } from '../../gfx/paint';
import { washPoly, noisyOutline } from '../../gfx/wash';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { InkDrop } from '../enemies';
import { Tadpole } from '../beasts3';
import type { Telegraph } from '../telegraph';

let frames: Layered | null = null;
let poolArt: { water: Frame; ice: Frame } | null = null;

/** One of the black pools of the Toad King's hall. */
export class ToadPool extends Entity {
  frozen = 0;
  private water!: Sprite;
  private ice!: Sprite;
  private t = Math.random() * 5;
  constructor(x: number, y: number, readonly r: number) {
    super();
    this.x = x; this.y = y;
    this.label = 'toadpool';
  }
  init(w: World): void {
    if (!poolArt) {
      const p = new Painter(5, 3.4, SPRITE_PPU / 2, -2.5, -1.7);
      p.glaze();
      washPoly(p, noisyOutline(0, 0, 2.1, 1.25, 0.1, 5101), { pig: mixPig(INK, PIG_B, 0.2), density: 0.82, soft: 0.15, edge: 0.9, seed: 5101 });
      washPoly(p, noisyOutline(-0.5, 0.25, 0.9, 0.3, 0.2, 5102), { pig: INK, density: 0.3, soft: 0.6, seed: 5102 });
      const c = new Painter(5, 3.4, SPRITE_PPU / 4, -2.5, -1.7);
      c.over();
      c.ctx.fillStyle = 'rgba(170,205,230,0.85)';
      c.ctx.beginPath();
      c.ctx.ellipse(0, 0, 2.0, 1.15, 0, 0, Math.PI * 2);
      c.ctx.fill();
      c.ctx.strokeStyle = 'rgba(240,250,255,0.9)';
      c.ctx.lineWidth = 0.08;
      for (let k = 0; k < 5; k++) { c.ctx.beginPath(); c.ctx.moveTo(-1.4 + k * 0.6, -0.6 + (k % 2) * 0.3); c.ctx.lineTo(-1.0 + k * 0.6, 0.5 - (k % 2) * 0.2); c.ctx.stroke(); }
      poolArt = { water: frameFrom(p), ice: frameFrom(c) };
    }
    const k = this.r / 2.1;
    this.water = new Sprite(poolArt.water);
    this.water.mesh.renderOrder = LAYER.groundDetail + 20;
    this.water.mesh.scale.set(k, k, 1);
    w.r.scenePig.add(this.water.mesh);
    this.ice = new Sprite(poolArt.ice);
    this.ice.mesh.renderOrder = LAYER.groundDetail + 21;
    this.ice.mesh.scale.set(k, k, 1);
    this.ice.opacity = 0;
    w.r.sceneAcc.add(this.ice.mesh);
    this.sprites.push(this.water, this.ice);
    this.water.setPos(this.x, this.y);
    this.ice.setPos(this.x, this.y);
  }
  contains(x: number, y: number, pad = 0): boolean {
    return ((x - this.x) / (this.r + pad)) ** 2 + ((y - this.y) / (this.r * 0.6 + pad)) ** 2 < 1;
  }
  freezeFor(t: number): void {
    const was = this.frozen;
    this.frozen = Math.max(this.frozen, t);
    if (was <= 0) { sfx.clink(); this.world.vfx.ripple(this.x, this.y, this.r); }
  }
  update(dt: number): void {
    this.t += dt;
    this.frozen = Math.max(0, this.frozen - dt);
    this.ice.opacity = Math.min(1, this.frozen * 2);
    if (this.frozen <= 0 && Math.random() < dt * 0.8) this.world.vfx.ripple(this.x + (Math.random() - 0.5) * this.r, this.y + (Math.random() - 0.5) * this.r * 0.5, 0.5);
  }
  /** The Toad King is gone: the pools drain away. */
  drain(): void {
    let t = 0;
    const w = this.world;
    const fn = (dt: number) => {
      t += dt;
      this.water.opacity = Math.max(0, 1 - t / 2.5);
      this.ice.opacity = 0;
      if (t > 2.5) { this.destroy(); const i = w.scripts.indexOf(fn); if (i >= 0) w.scripts.splice(i, 1); }
    };
    w.scripts.push(fn);
  }
}

type Attack = 'leap' | 'tongue' | 'spit' | 'croak' | 'dive';

export class ToadKing extends Boss {
  private body!: Sprite;
  private redS!: Sprite;
  private shadowS!: Sprite;
  private face = 1;
  private queue: Attack[] = [];
  private tg: Telegraph | null = null;
  private from: [number, number] = [0, 0];
  private to: [number, number] = [0, 0];
  private aimA = 0;
  private swallowed = 0;
  private reelT = 0;
  private dmgMul = 1;
  private pool: ToadPool | null = null;
  private exitPool: ToadPool | null = null;
  private volley = 0;
  frozen = 0;
  /** First dive: the room shows a hint. */
  onDive?: () => void;
  onAllFrozen?: () => void;
  private dived = false;

  constructor(x: number, y: number, private room: { x: number; y: number; w: number; h: number }, private pools: ToadPool[]) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 1900;
    this.hp = 1900;
    this.radius = 1.5;
    this.solid = false;
    this.name = 'Toad King';
    this.label = 'toad';
    this.vulnerable = true;
  }

  init(w: World): void {
    if (!frames) frames = buildToadKingFrames(5001);
    const sp = new Painter(6, 2.4, SPRITE_PPU / 2, -3, -1.2);
    sp.glaze();
    shadow(sp, 0, 0, 2.3, 0.8, 0.4);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames.pig[0]));
    this.redS = this.addSprite(new Sprite(frames.red[0]), true);
    // gold in his pool, indigo on it
    w.onBolt.push((x, y, r) => {
      if (this.defeated) return;
      for (const pl of this.pools) {
        if (!pl.contains(x, y, r * 0.6)) continue;
        if (this.state === 'under' && this.pool === pl) this.surface(pl, 'shock');
        else if (pl.frozen <= 0) { this.world.vfx.ripple(pl.x, pl.y, pl.r); sfx.thunder(); }
      }
    });
    w.onFreeze.push((x, y, r) => {
      if (this.defeated) return;
      for (const pl of this.pools) {
        if (!pl.contains(x, y, r * 0.6)) continue;
        if (this.state === 'under' && this.pool === pl) { pl.freezeFor(12); this.surface(pl, 'ice'); }
        else pl.freezeFor(12);
      }
    });
    this.setState('intro');
  }

  freeze(t: number): void {
    if (this.defeated || this.state === 'under') return;
    this.frozen = Math.max(this.frozen, t * 0.4);
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated) return false;
    // in the air or under the water, nothing reaches him
    if (this.state === 'leapAir' || this.state === 'diveAir' || this.state === 'under' || this.state === 'emerge') return false;
    let dmg = h.dmg * this.dmgMul;
    if (this.state === 'inflate') { dmg *= 1.5; this.swallowed += dmg; }
    this.vulnerable = true;
    const r = super.onHit({ ...h, dmg: Math.round(dmg) });
    if (r) this.world.numbers?.pop(this.x, this.y + 3.6, String(Math.round(dmg)), { size: dmg >= 40 ? 0.7 : 0.5, red: this.dmgMul > 1 });
    // the swollen belly bursts
    if (r && this.state === 'inflate' && this.swallowed > 140 && !this.defeated) {
      this.world.tele.clear();
      this.tg = null;
      this.world.vfx.splat(this.x + this.face, this.y + 1.2, 0, 18, 1.6);
      this.world.shake(0.3, 0.3);
      sfx.stagger();
      this.daze(2.6, 1.4);
    }
    return r;
  }

  enterPhase2(): void {
    this.queue = [];
    sfx.stagger();
  }

  private next(): Attack {
    if (!this.queue.length) this.queue = this.phase === 1 ? ['leap', 'tongue', 'spit', 'leap', 'croak'] : ['dive', 'tongue', 'spit', 'dive', 'leap', 'croak'];
    return this.queue.shift()!;
  }

  private daze(t: number, mul: number): void {
    this.setState('dazed');
    this.dazeT = t;
    this.dmgMul = mul;
  }
  private dazeT = 0;

  private keepIn(): void {
    const m = 2.2;
    this.x = Math.max(this.room.x + m, Math.min(this.room.x + this.room.w - m, this.x));
    this.y = Math.max(this.room.y + m, Math.min(this.room.y + this.room.h - m, this.y));
  }

  private land(r: number, dmg: number): void {
    const w = this.world, p = w.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < r + p.radius) p.hurt(dmg, this.x, this.y);
    w.shake(0.35, 0.3);
    sfx.impact(true);
    sfx.splash();
    w.vfx.ripple(this.x, this.y, r);
    w.vfx.splat(this.x, this.y + 0.3, Math.random() * 6, 14, 1.2);
    const r0 = r + 0.2, r1 = r0 + 1.6;
    w.tele.add({ kind: 'ring', r0, r1 }, this.x, this.y, 0, 0.35, {
      hold: 0.08,
      onFire: () => {
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d > r0 - 0.3 && d < r1 + 0.3) p.hurt(1, this.x, this.y);
        w.vfx.ripple(this.x, this.y, (r0 + r1) / 2);
      },
    });
  }

  private openPools(except?: ToadPool | null): ToadPool[] {
    return this.pools.filter((pl) => pl.frozen <= 0 && pl !== except && !pl.dead);
  }

  /** Out of the water: shocked by gold, locked by ice, or on his own. */
  private surface(pl: ToadPool, how: 'shock' | 'ice' | 'self'): void {
    const w = this.world;
    this.x = pl.x;
    this.y = pl.y;
    this.z = 0;
    this.pool = null;
    w.tele.clear();
    this.tg = null;
    for (const s of this.sprites) s.opacity = 1;
    this.shadowS.opacity = 1;
    if (how === 'self') { this.land(2.8, 2); this.setState('recover'); return; }
    w.vfx.splat(this.x, this.y + 1, 0, 16, 1.5);
    w.shake(0.4, 0.35);
    sfx.stagger();
    this.vulnerable = true;
    if (how === 'shock') {
      w.vfx.glowAt(this.x, this.y + 1, 4, 0.4);
      super.onHit({ dmg: 150, fromX: this.x, fromY: this.y - 1, kind: 'cut' });
      this.world.numbers?.pop(this.x, this.y + 3.8, '150', { size: 0.8, red: true });
      if (!this.defeated) this.daze(3, 1.6);
    } else {
      this.frozen = 0;
      if (!this.defeated) this.daze(4, 2);
    }
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world, p = w.player;
    let fi = 0;
    if (this.frozen > 0 && !this.defeated) {
      this.frozen -= dt;
      this.place(0);
      return;
    }
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    switch (this.state) {
      case 'intro':
        fi = this.stateT < 1.2 ? 4 : 0;
        if (this.stateT > 0.6 && this.stateT - dt <= 0.6) { sfx.telegraph('low', 0.6); w.shake(0.25, 0.4); }
        if (this.stateT > 1.8) this.setState('idle');
        break;
      case 'idle': {
        this.dmgMul = 1;
        this.face = dx < 0 ? -1 : 1;
        // small hops towards the child
        const hop = (this.stateT * 1.6) % 1;
        fi = hop < 0.3 ? 1 : 0;
        if (d > 5 && hop > 0.3) { w.move(this, (dx / d) * 1.8 * dt, (dy / d) * 1.8 * dt); this.z = Math.sin(((hop - 0.3) / 0.7) * Math.PI) * 0.35; } else this.z = 0;
        this.keepIn();
        if (this.stateT > (this.phase === 1 ? 1.3 : 0.9)) {
          this.z = 0;
          const a = this.next();
          if (a === 'leap') this.startLeap(p.x, p.y, 0.75);
          else if (a === 'tongue') {
            this.aimA = Math.atan2(dy, dx);
            this.tg = w.tele.add({ kind: 'line', length: 10, width: 1.2 }, this.x, this.y + 0.4, this.aimA, 0.7, { hold: 0.05 });
            sfx.telegraph('high', 0.7);
            this.setState('tonguePrep');
          } else if (a === 'spit') { this.swallowed = 0; this.volley = this.phase === 1 ? 1 : 2; this.setState('inflate'); sfx.telegraph('mid', 1.2); }
          else if (a === 'croak') this.setState('croak');
          else {
            const open = this.openPools();
            if (!open.length) { this.onAllFrozen?.(); this.startLeap(p.x, p.y, 0.6); break; }
            // the pool farthest from the child
            open.sort((a2, b2) => Math.hypot(b2.x - p.x, b2.y - p.y) - Math.hypot(a2.x - p.x, a2.y - p.y));
            this.pool = open[0];
            this.from = [this.x, this.y];
            this.to = [this.pool.x, this.pool.y];
            this.setState('divePrep');
          }
        }
        break;
      }
      case 'leapPrep':
        fi = 1;
        if (this.tg?.fired || this.stateT > 1.2) { this.tg = null; this.setState('leapAir'); sfx.dodge(); }
        break;
      case 'leapAir': {
        fi = 2;
        const u = Math.min(1, this.stateT / 0.6);
        this.x = this.from[0] + (this.to[0] - this.from[0]) * u;
        this.y = this.from[1] + (this.to[1] - this.from[1]) * u;
        this.z = Math.sin(u * Math.PI) * 4;
        if (u >= 1) { this.z = 0; this.land(2.6, 2); this.setState('recover'); }
        break;
      }
      case 'tonguePrep':
        fi = 0;
        if (this.stateT > 0.7) {
          this.tg = null;
          fi = 3;
          const ax = Math.cos(this.aimA), ay = Math.sin(this.aimA);
          const along = (p.x - this.x) * ax + (p.y - this.y) * ay, across = Math.abs(-(p.x - this.x) * ay + (p.y - this.y) * ax);
          for (let k = 1; k < 10; k += 0.8) w.vfx.splat(this.x + ax * k, this.y + 0.5 + ay * k, this.aimA, 2, 0.5);
          sfx.cut();
          if (along > 0 && along < 10.3 && across < 0.8 && p.hurt(2, this.x, this.y)) { this.reelT = 0.35; this.setState('reel'); }
          else this.setState('tongue');
        }
        break;
      case 'tongue':
        fi = 3;
        if (this.stateT > 0.45) this.setState('recover');
        break;
      case 'reel': {
        fi = 3;
        // the tongue pulls the child in
        const k = Math.min(1, dt / Math.max(0.01, this.reelT - this.stateT + dt));
        if (d > 2.6) w.move(p, -dx * k * 0.8, -dy * k * 0.8);
        if (this.stateT > this.reelT) this.setState('recover');
        break;
      }
      case 'inflate':
        fi = 4;
        this.face = dx < 0 ? -1 : 1;
        if (this.stateT > 1.3) {
          const base = Math.atan2(dy, dx);
          for (let k = -3; k <= 3; k++) {
            const a = base + k * 0.2 + (this.volley === 1 && this.phase === 2 ? 0.1 : 0);
            w.add(new InkDrop(this.x + Math.cos(base) * 1.6, this.y + 1.0, Math.cos(a) * 5.2, Math.sin(a) * 5.2, this));
          }
          sfx.splash();
          this.volley--;
          if (this.volley > 0) this.stateT = 0.85;
          else this.setState('recover');
        }
        break;
      case 'croak':
        fi = Math.floor(this.stateT * 6) % 2 ? 4 : 0;
        if (this.stateT > 0.5 && this.stateT - dt <= 0.5) {
          const n = this.phase === 1 ? 3 : 5;
          const open = this.openPools();
          for (let i = 0; i < n; i++) {
            const pl = open.length ? open[i % open.length] : null;
            const a = Math.random() * Math.PI * 2;
            const x = pl ? pl.x + Math.cos(a) * pl.r * 0.5 : this.x + Math.cos(a) * 2.5;
            const y = pl ? pl.y + Math.sin(a) * pl.r * 0.3 : this.y + Math.sin(a) * 2;
            const t = new Tadpole(x, y).setup(4, false);
            t.aggro = true;
            t.emerge = 0.5;
            w.add(t);
          }
          sfx.spawn();
          w.shake(0.15, 0.3);
        }
        if (this.stateT > 1.4) this.setState('idle');
        break;
      case 'divePrep':
        fi = 1;
        this.face = this.to[0] < this.x ? -1 : 1;
        if (this.stateT > 0.5) {
          if (this.pool && this.pool.frozen > 0) { this.pool = null; this.setState('idle'); break; }
          this.setState('diveAir');
        }
        break;
      case 'diveAir': {
        fi = 2;
        const u = Math.min(1, this.stateT / 0.6);
        this.x = this.from[0] + (this.to[0] - this.from[0]) * u;
        this.y = this.from[1] + (this.to[1] - this.from[1]) * u;
        this.z = Math.sin(u * Math.PI) * 3.5 - u * u * 1.2;
        if (u >= 1) {
          const pl = this.pool!;
          if (pl.frozen > 0) { this.z = 0; this.land(2.6, 2); this.setState('recover'); break; }
          this.z = 0;
          w.vfx.splat(pl.x, pl.y + 0.3, 0, 14, 1.3);
          w.vfx.ripple(pl.x, pl.y, pl.r);
          sfx.splash();
          this.setState('under');
          this.vulnerable = false;
          if (!this.dived) { this.dived = true; this.onDive?.(); }
        }
        break;
      }
      case 'under': {
        // drinking: heals while hidden; bubbles give him away
        const pl = this.pool!;
        for (const s of this.sprites) s.opacity = 0;
        this.shadowS.opacity = 0;
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.012 * dt);
        if (Math.random() < dt * 9) w.vfx.ripple(pl.x + (Math.random() - 0.5) * pl.r, pl.y + (Math.random() - 0.5) * pl.r * 0.4, 0.4 + Math.random() * 0.4);
        if (this.stateT > 2.8) {
          const open = this.openPools(pl);
          const out = open.length ? open[Math.floor(Math.random() * open.length)] : pl.frozen <= 0 ? pl : null;
          if (!out) { this.surface(pl, 'ice'); break; }
          this.exitPool = out;
          this.tg = w.tele.add({ kind: 'circle', r: 2.8 }, out.x, out.y, 0, 0.8, { hold: 0.05 });
          sfx.telegraph('low', 0.8);
          this.setState('emerge');
        }
        break;
      }
      case 'emerge':
        if (this.stateT > 0.8 && this.exitPool) {
          const out = this.exitPool;
          this.exitPool = null;
          this.surface(out, 'self');
        }
        break;
      case 'recover':
        fi = 0;
        this.vulnerable = true;
        if (this.stateT > (this.phase === 1 ? 0.8 : 0.55)) this.setState('idle');
        break;
      case 'dazed':
        fi = 5;
        this.vulnerable = true;
        if (Math.random() < dt * 4) w.vfx.glowAt(this.x, this.y + 3.2, 0.6, 0.2);
        if (this.stateT > this.dazeT) { this.dmgMul = 1; this.setState('idle'); }
        break;
      case 'defeated':
        fi = 5;
        break;
    }
    this.place(fi);
  }

  private startLeap(tx: number, ty: number, warn: number): void {
    const w = this.world;
    this.from = [this.x, this.y];
    const m = 2.4;
    this.to = [Math.max(this.room.x + m, Math.min(this.room.x + this.room.w - m, tx)), Math.max(this.room.y + m, Math.min(this.room.y + this.room.h - m, ty))];
    this.face = this.to[0] < this.x ? -1 : 1;
    this.tg = w.tele.add({ kind: 'circle', r: 2.6 }, this.to[0], this.to[1], 0, warn, { hold: 0.05 });
    sfx.telegraph('low', warn);
    this.setState('leapPrep');
  }

  private place(fi: number): void {
    const f = frames!;
    this.body.setTexture(f.pig[fi].tex);
    this.redS.setTexture(f.red[fi].tex);
    for (const s of [this.body, this.redS]) {
      s.setPos(this.x, this.y + this.z);
      s.mesh.scale.set(this.face, 1, 1);
      s.mesh.renderOrder = ySort(this.y);
    }
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    this.shadowS.setPos(this.x, this.y);
    this.shadowS.mesh.scale.set(1 - Math.min(0.5, this.z * 0.1), 1 - Math.min(0.5, this.z * 0.1), 1);
    if (this.state === 'defeated') {
      const k = Math.min(1, this.stateT / 2);
      this.body.dissolve = k;
      this.redS.dissolve = k;
      this.shadowS.opacity = 1 - k;
    }
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
