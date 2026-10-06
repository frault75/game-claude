/**
 * Guardian of the Firefly Cave — the Mother of Blots: a great slow blot that spits globs,
 * broods blotlets, sinks into the ink and erupts under the child. She swallowed the indigo.
 */
import { Boss } from '../boss';
import type { World } from '../world';
import { HitInfo } from '../entity';
import { Sprite, Frame, ySort, LAYER } from '../../gfx/sprite';
import { buildBlotFrames } from '../../gfx/gen/creatures';
import { Painter, INK } from '../../gfx/paint';
import { shadow } from '../../gfx/gen/ground';
import { washBlob } from '../../gfx/wash';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { Blot, InkDrop } from '../enemies';

let frames: Frame[] | null = null;

type Attack = 'spit' | 'brood' | 'dive' | 'ring';

export class MotherOfBlots extends Boss {
  private body!: Sprite;
  private pool!: Sprite;
  private queue: Attack[] = [];
  private animT = 0;
  private diveTarget: [number, number] = [0, 0];
  private diveMark: ReturnType<World['tele']['add']> | null = null;
  private face = 1;
  frozen = 0;

  constructor(x: number, y: number, private room: { x: number; y: number; w: number; h: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 700;
    this.hp = 700;
    this.radius = 1.4;
    this.name = 'Mother of Blots';
    this.label = 'mother';
    this.vulnerable = true;
  }

  init(w: World): void {
    if (!frames) frames = buildBlotFrames(3301, 1);
    const sp = new Painter(7, 3, SPRITE_PPU / 2, -3.5, -1.5);
    sp.glaze();
    shadow(sp, 0, 0, 2.6, 0.9, 0.4);
    washBlob(sp, 0, 0, 2.4, 0.8, { pig: INK, density: 0.45, soft: 0.3, seed: 3302, rough: 0.4 });
    this.pool = new Sprite(sp);
    this.pool.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.pool.mesh);
    this.body = this.addSprite(new Sprite(frames[0]));
    this.setState('intro');
  }

  freeze(t: number): void {
    this.frozen = Math.max(this.frozen, t * 0.3);
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated) return false;
    if (this.state === 'under' || this.state === 'sink') {
      this.world.numbers?.pop(this.x, this.y + 1.2, '0', { size: 0.4 });
      return false;
    }
    const r = super.onHit(h);
    if (r) this.world.numbers?.pop(this.x, this.y + 3, String(Math.round(h.dmg)), { size: h.dmg >= 40 ? 0.7 : 0.5 });
    return r;
  }

  enterPhase2(): void {
    this.queue = [];
    sfx.stagger();
    this.world.shake(0.3, 0.4);
  }

  private next(): Attack {
    if (!this.queue.length) this.queue = this.phase === 1 ? ['spit', 'brood', 'spit', 'dive'] : ['ring', 'dive', 'spit', 'brood', 'dive', 'ring'];
    return this.queue.shift()!;
  }

  private spit(): void {
    const w = this.world;
    const p = w.player;
    const n = this.phase === 1 ? 3 : 5;
    sfx.telegraph('mid', 0.9);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : 1 + Math.random() * 2.2;
      const tx = p.x + Math.cos(a) * d + p.vx * 0.3, ty = p.y + Math.sin(a) * d * 0.8 + p.vy * 0.3;
      w.tele.add({ kind: 'circle', r: 1.05 }, tx, ty, 0, 0.95 + i * 0.12, {
        hold: 0.05,
        onFire: () => {
          if (Math.hypot(p.x - tx, p.y - ty) < 1.15) p.hurt(1, tx, ty);
          w.vfx.splat(tx, ty + 0.2, Math.random() * 6, 7, 1);
          w.vfx.stain(tx, ty, 1, 6);
          sfx.impact(false);
        },
      });
    }
  }

  private brood(): void {
    const w = this.world;
    const n = this.phase === 1 ? 3 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random();
      const b = new Blot(this.x + Math.cos(a) * 2, this.y + Math.sin(a) * 1.4, true).setup(2, false);
      b.aggro = true;
      b.emerge = 0.5;
      w.add(b);
    }
    sfx.spawn();
  }

  private ring(): void {
    const w = this.world;
    const n = 14;
    const off = Math.random() * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + off;
      w.add(new InkDrop(this.x + Math.cos(a) * 1.2, this.y + 0.4 + Math.sin(a) * 0.9, Math.cos(a) * 5.2, Math.sin(a) * 5.2, this));
    }
    sfx.spawn();
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world;
    const p = w.player;
    const f = frames!;
    this.animT += dt;
    let frame = f[Math.abs(Math.floor(this.animT * 4)) % 3];
    let sink = 0;
    if (this.frozen > 0 && this.state !== 'under') {
      this.frozen -= dt;
      this.place(f[0], 0);
      return;
    }
    switch (this.state) {
      case 'intro':
        sink = Math.max(0, 1 - this.stateT / 1.5);
        if (this.stateT > 1.6) this.setState('idle');
        break;
      case 'idle': {
        const dx = p.x - this.x, dy = p.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        this.face = dx < 0 ? -1 : 1;
        if (d > 2.5) w.move(this, (dx / d) * (this.phase === 1 ? 1.1 : 1.6) * dt, (dy / d) * (this.phase === 1 ? 1.1 : 1.6) * dt);
        this.keepIn();
        if (d < this.radius + p.radius + 0.1) p.hurt(1, this.x, this.y);
        if (this.stateT > (this.phase === 1 ? 1.5 : 1.0)) {
          const a = this.next();
          if (a === 'spit') { this.setState('spit'); this.spit(); }
          else if (a === 'brood') this.setState('brood');
          else if (a === 'ring') { this.setState('ring'); }
          else { this.setState('sink'); sfx.splash(); }
        }
        break;
      }
      case 'spit':
        frame = this.stateT < 0.4 ? f[3] : f[4];
        if (this.stateT > 1.3) this.setState('idle');
        break;
      case 'brood':
        frame = f[3];
        if (this.stateT > 0.5 && this.stateT - dt <= 0.5) this.brood();
        if (this.stateT > 1.2) this.setState('idle');
        break;
      case 'ring':
        frame = this.stateT < 0.5 ? f[3] : f[4];
        if (this.stateT > 0.5 && this.stateT - dt <= 0.5) this.ring();
        if (this.phase === 2 && this.stateT > 1.1 && this.stateT - dt <= 1.1) this.ring();
        if (this.stateT > 1.6) this.setState('idle');
        break;
      case 'sink':
        sink = Math.min(1, this.stateT / 0.6);
        frame = f[3];
        if (this.stateT > 0.6) {
          this.setState('under');
          this.diveTarget = [p.x, p.y];
          this.diveMark = w.tele.add({ kind: 'circle', r: 2.3 }, p.x, p.y, 0, this.phase === 1 ? 2.2 : 1.7, { hold: 0.1 });
          sfx.telegraph('low', 2);
        }
        break;
      case 'under': {
        sink = 1;
        // the mark follows the child, then settles
        const mk = this.diveMark;
        if (mk && !mk.fired) {
          const follow = mk.t < mk.dur - 0.6;
          if (follow) {
            this.diveTarget[0] += (p.x - this.diveTarget[0]) * Math.min(1, dt * 3);
            this.diveTarget[1] += (p.y - this.diveTarget[1]) * Math.min(1, dt * 3);
          }
          mk.x = this.diveTarget[0];
          mk.y = this.diveTarget[1];
        }
        if (mk?.fired) {
          this.x = this.diveTarget[0];
          this.y = this.diveTarget[1];
          this.keepIn();
          if (Math.hypot(p.x - this.x, p.y - this.y) < 2.4) p.hurt(2, this.x, this.y);
          w.shake(0.35, 0.35);
          sfx.impact(true);
          for (let i = 0; i < 10; i++) w.vfx.splat(this.x, this.y + 0.5, (i / 10) * Math.PI * 2, 9, 1.3);
          w.vfx.ripple(this.x, this.y, 2.5);
          this.diveMark = null;
          this.setState('rise');
        }
        break;
      }
      case 'rise':
        sink = Math.max(0, 1 - this.stateT / 0.35);
        frame = f[4];
        if (this.stateT > 1.1) this.setState('idle');
        break;
      case 'defeated':
        frame = f[3];
        break;
    }
    this.vulnerable = this.state !== 'under' && this.state !== 'sink' && !this.defeated;
    this.place(frame, sink);
  }

  private keepIn(): void {
    const m = 1.8;
    this.x = Math.max(this.room.x + m, Math.min(this.room.x + this.room.w - m, this.x));
    this.y = Math.max(this.room.y + m, Math.min(this.room.y + this.room.h - m, this.y));
  }

  private place(frame: Frame, sink: number): void {
    const s = 3.7 + Math.sin(this.animT * 2.2) * 0.1;
    this.body.setTexture(frame.tex);
    this.body.setPos(this.x, this.y - sink * 1.2);
    this.body.mesh.scale.set(this.face * s, s * (1 - sink * 0.75), 1);
    this.body.mesh.renderOrder = ySort(this.y);
    this.body.pale = this.flash > 0 ? 0.6 : this.frozen > 0 ? 0.35 : 0;
    this.body.opacity = 1 - sink * 0.85;
    this.pool.setPos(this.x, this.y);
    this.pool.opacity = this.state === 'under' ? 0.25 : 1;
    if (this.state === 'defeated') {
      const k = Math.min(1, this.stateT / 1.8);
      this.body.dissolve = k;
      this.pool.opacity = 1 - k;
    }
  }

  dispose(): void {
    super.dispose();
    this.pool.dispose();
  }
}
