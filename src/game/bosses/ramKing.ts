/** Guardian of the plain — the Ram King: charges, stomps rings of shock, calls the swarm. */
import { Boss } from '../boss';
import type { World } from '../world';
import { HitInfo } from '../entity';
import { Sprite, Frame, ySort, LAYER } from '../../gfx/sprite';
import { buildBruteFrames } from '../../gfx/gen/creatures';
import { Painter } from '../../gfx/paint';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { Mite } from '../enemies';
import type { Telegraph } from '../telegraph';

let frames: Frame[] | null = null;

type Attack = 'charge' | 'stomp' | 'swarm' | 'double';

export class RamKing extends Boss {
  private body!: Sprite;
  private shadowS!: Sprite;
  private dir: [number, number] = [1, 0];
  private face = 1;
  private tg: Telegraph | null = null;
  private queue: Attack[] = [];
  private chargeLeft = 0;
  private charges = 0;
  private animT = 0;
  private flashT = 0;
  frozen = 0;
  constructor(x: number, y: number, private arena: { x: number; y: number; r: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 900;
    this.hp = 900;
    this.radius = 1.3;
    this.solid = false;
    this.name = 'Ram King';
    this.label = 'ram king';
  }

  init(w: World): void {
    if (!frames) frames = buildBruteFrames(2501);
    const sp = new Painter(5, 2, SPRITE_PPU, -2.5, -1);
    sp.glaze();
    shadow(sp, 0, 0, 2, 0.7, 0.35);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames[0]));
    this.setState('intro');
  }

  /** Indigo freezes even guardians, briefly. */
  freeze(t: number): void {
    this.frozen = Math.max(this.frozen, t * 0.35);
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated) return false;
    // armoured horns: brush strikes from the front glance off unless it is dazed
    const toAtt = [h.fromX - this.x, h.fromY - this.y];
    const l = Math.hypot(toAtt[0], toAtt[1]) || 1;
    const front = (toAtt[0] * this.dir[0] + toAtt[1] * this.dir[1]) / l > 0.5;
    if (h.kind === 'brush' && front && this.state !== 'dazed' && this.frozen <= 0) {
      sfx.clink();
      this.world.numbers?.pop(this.x, this.y + 2.6, '0', { size: 0.4 });
      return false;
    }
    let dmg = h.dmg;
    if (this.state === 'dazed') dmg *= 1.6;
    if (h.kind === 'cut' && this.state === 'charge') dmg *= 2;
    this.vulnerable = true;
    const r = super.onHit({ ...h, dmg: Math.round(dmg) });
    this.world.numbers?.pop(this.x, this.y + 2.8, String(Math.round(dmg)), { size: dmg >= 40 ? 0.7 : 0.5 });
    return r;
  }

  enterPhase2(): void {
    this.queue = [];
    sfx.stagger();
  }

  private next(): Attack {
    if (!this.queue.length) this.queue = this.phase === 1 ? ['charge', 'stomp', 'charge', 'swarm'] : ['double', 'stomp', 'swarm', 'double', 'stomp'];
    return this.queue.shift()!;
  }

  private startCharge(warn: number): void {
    const w = this.world;
    const p = w.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.dir = [dx / d, dy / d];
    this.chargeLeft = Math.min(this.arena.r * 1.9, d + 5);
    this.tg = w.tele.add({ kind: 'line', length: this.chargeLeft, width: 3.0 }, this.x, this.y, Math.atan2(this.dir[1], this.dir[0]), warn, { hold: 0.2 });
    sfx.telegraph('low', warn);
    this.setState('prep');
  }

  private stomp(): void {
    const w = this.world;
    const rings = this.phase === 1 ? 2 : 3;
    sfx.telegraph('low', 0.9);
    for (let i = 0; i < rings; i++) {
      const r0 = 1.5 + i * 3.2, r1 = r0 + 1.6;
      w.tele.add({ kind: 'ring', r0, r1 }, this.x, this.y, 0, 0.9 + i * 0.35, {
        hold: 0.1,
        onFire: () => {
          const p = w.player;
          const d = Math.hypot(p.x - this.x, p.y - this.y);
          if (d > r0 - 0.3 && d < r1 + 0.3) p.hurt(1, this.x, this.y);
          sfx.impact(i === 0);
          w.shake(0.2, 0.2);
          w.vfx.ripple(this.x, this.y, (r0 + r1) * 0.5);
        },
      });
    }
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world;
    const p = w.player;
    const f = frames!;
    this.animT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    let frame = f[Math.abs(Math.floor(this.animT * 3)) % 2];
    if (this.frozen > 0) {
      this.frozen -= dt;
      this.place(f[0]);
      return;
    }
    switch (this.state) {
      case 'intro':
        if (this.stateT > 1.6) this.setState('idle');
        break;
      case 'idle': {
        const dx = p.x - this.x, dy = p.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        this.dir = [dx / d, dy / d];
        if (d > 4) w.move(this, (dx / d) * 1.6 * dt, (dy / d) * 1.6 * dt);
        this.keepInArena();
        if (this.stateT > (this.phase === 1 ? 1.4 : 0.9)) {
          const a = this.next();
          if (a === 'charge') { this.charges = 1; this.startCharge(0.9); }
          else if (a === 'double') { this.charges = 2; this.startCharge(0.75); }
          else if (a === 'stomp') { this.setState('stomp'); this.stomp(); }
          else this.setState('swarm');
        }
        break;
      }
      case 'prep':
        frame = f[2];
        this.x += Math.sin(this.stateT * 60) * 0.015;
        if (this.tg) this.tg.x = this.x;
        if (this.tg?.fired) { this.tg = null; this.setState('charge'); w.shake(0.12, 0.15); }
        break;
      case 'charge': {
        frame = f[3];
        const step = 21 * dt;
        const ox = this.x, oy = this.y;
        w.move(this, this.dir[0] * step, this.dir[1] * step);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        this.chargeLeft -= moved;
        if (Math.random() < 0.7) w.vfx.dust(this.x - this.dir[0], this.y, 2);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.2) p.hurt(2, this.x, this.y);
        const out = Math.hypot(this.x - this.arena.x, this.y - this.arena.y) > this.arena.r - 1.2;
        if (moved < step * 0.5 || out) {
          // slammed into the standing stones: dazed
          this.setState('dazed');
          sfx.impact(true);
          sfx.stagger();
          w.shake(0.35, 0.3);
          w.vfx.splat(this.x + this.dir[0], this.y + 1, Math.atan2(-this.dir[1], -this.dir[0]), 12, 1.3);
          this.keepInArena();
        } else if (this.chargeLeft <= 0) {
          this.charges--;
          if (this.charges > 0) this.startCharge(0.55);
          else this.setState('recover');
        }
        break;
      }
      case 'dazed':
        frame = f[4];
        if (this.stateT > 2.2) this.setState('idle');
        break;
      case 'recover':
        frame = f[0];
        if (this.stateT > 0.8) this.setState('idle');
        break;
      case 'stomp':
        frame = this.stateT < 0.6 ? f[2] : f[0];
        if (this.stateT > 1.8 + (this.phase - 1) * 0.4) this.setState('idle');
        break;
      case 'swarm':
        frame = f[2];
        if (this.stateT > 0.5 && this.stateT - dt <= 0.5) {
          const n = this.phase === 1 ? 5 : 8;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const m = new Mite(this.x + Math.cos(a) * 2, this.y + Math.sin(a) * 1.5).setup(3, false);
            m.aggro = true;
            m.emerge = 0.4;
            w.add(m);
          }
          sfx.spawn();
        }
        if (this.stateT > 1.6) this.setState('idle');
        break;
      case 'defeated':
        frame = f[4];
        break;
    }
    if (this.state === 'idle' || this.state === 'prep') this.face = this.dir[0] < 0 ? -1 : 1;
    this.place(frame);
  }

  private keepInArena(): void {
    const dx = this.x - this.arena.x, dy = this.y - this.arena.y;
    const d = Math.hypot(dx, dy);
    const max = this.arena.r - 1.4;
    if (d > max) {
      this.x = this.arena.x + (dx / d) * max;
      this.y = this.arena.y + (dy / d) * max;
    }
  }

  private place(frame: Frame): void {
    this.body.setTexture(frame.tex);
    this.body.setPos(this.x, this.y);
    this.body.mesh.scale.set(this.face * 2.1, 2.1, 1);
    this.body.mesh.renderOrder = ySort(this.y);
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    this.shadowS.setPos(this.x, this.y);
    if (this.state === 'defeated') {
      this.body.dissolve = Math.min(1, this.stateT / 1.5);
      this.shadowS.opacity = 1 - Math.min(1, this.stateT / 1.5);
    }
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
