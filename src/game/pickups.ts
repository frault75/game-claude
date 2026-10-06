/** Things enemies drop: black ink drops (life) and vermilion orbs (ink). Drawn to the child. */
import { Entity } from './entity';
import type { World } from './world';
import { Sprite, Frame, frameFrom, ySort } from '../gfx/sprite';
import { Painter, INK, VERMILION } from '../gfx/paint';
import { washPoly, noisyOutline } from '../gfx/wash';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { sfx } from '../audio/sfx';
import { save } from './progression';

let frames: { life: Frame; ink: Frame; pigment: Frame; coin: Frame } | null = null;
function getFrames() {
  if (frames) return frames;
  const a = new Painter(0.8, 0.9, SPRITE_PPU, -0.4, -0.2);
  a.glaze();
  const drop: [number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    const r = 0.17 * (1 - 0.5 * Math.max(0, Math.sin(t)) ** 3);
    drop.push([Math.cos(t) * r, 0.2 + Math.sin(t) * r * 1.2 + (Math.sin(t) > 0 ? Math.sin(t) ** 4 * 0.16 : 0)]);
  }
  washPoly(a, drop, { pig: INK, density: 0.9, soft: 0.05, edge: 0.6, seed: 3 });
  const b = new Painter(0.8, 0.8, SPRITE_PPU, -0.4, -0.2);
  b.glaze();
  washPoly(b, noisyOutline(0, 0.2, 0.15, 0.15, 0.2, 5), { pig: VERMILION, density: 1, soft: 0.05, edge: 0.4, seed: 5 });
  const c = new Painter(0.9, 0.9, SPRITE_PPU, -0.45, -0.25);
  c.over();
  const o1 = noisyOutline(-0.06, 0.2, 0.13, 0.13, 0.2, 7), o2 = noisyOutline(0.08, 0.24, 0.11, 0.11, 0.2, 8);
  c.ctx.fillStyle = 'rgba(51,84,148,1)';
  c.ctx.beginPath(); o1.forEach((q, i) => (i === 0 ? c.ctx.moveTo(q[0], q[1]) : c.ctx.lineTo(q[0], q[1]))); c.ctx.fill();
  c.ctx.fillStyle = 'rgba(219,168,51,1)';
  c.ctx.beginPath(); o2.forEach((q, i) => (i === 0 ? c.ctx.moveTo(q[0], q[1]) : c.ctx.lineTo(q[0], q[1]))); c.ctx.fill();
  // a copper cash coin with its square hole
  const k = new Painter(0.8, 0.8, SPRITE_PPU, -0.4, -0.2);
  k.over();
  k.ctx.fillStyle = 'rgba(176,122,52,1)';
  k.ctx.beginPath(); k.ctx.arc(0, 0.2, 0.14, 0, Math.PI * 2); k.ctx.fill();
  k.ctx.strokeStyle = 'rgba(110,70,30,1)'; k.ctx.lineWidth = 0.025; k.ctx.stroke();
  k.ctx.clearRect(-0.04, 0.16, 0.08, 0.08);
  frames = { life: frameFrom(a), ink: frameFrom(b), pigment: frameFrom(c), coin: frameFrom(k) };
  return frames;
}

export type PickupKind = 'life' | 'ink' | 'pigment' | 'coin';

export class Pickup extends Entity {
  private t = 0;
  private vz = 3;
  constructor(x: number, y: number, readonly kind: PickupKind, private amount: number) {
    super();
    this.x = x + (Math.random() - 0.5) * 0.6;
    this.y = y + (Math.random() - 0.5) * 0.4;
    this.z = 0.3;
    this.radius = 0.2;
    this.label = 'pickup';
  }
  init(): void {
    const f = getFrames();
    if (this.kind === 'pigment' || this.kind === 'coin') {
      const s = new Sprite(this.kind === 'coin' ? f.coin : f.pigment);
      this.sprites.push(s);
      this.world.r.sceneAcc.add(s.mesh);
    } else this.addSprite(new Sprite(this.kind === 'life' ? f.life : f.ink), this.kind === 'ink');
  }
  update(dt: number): void {
    const w: World = this.world;
    const p = w.player;
    this.t += dt;
    this.vz -= 12 * dt;
    this.z = Math.max(0, this.z + this.vz * dt);
    if (this.z === 0 && this.vz < 0) this.vz = this.vz < -1.5 ? -this.vz * 0.35 : 0;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    if (this.t > 0.35 && d < 3.2 && p.state !== 'dead') {
      const k = Math.min(1, dt * (10 - d * 2));
      this.x += (p.x - this.x) * k;
      this.y += (p.y - this.y) * k;
    }
    if (this.t > 0.35 && d < 0.6) {
      if (this.kind === 'life') p.heal(this.amount);
      else if (this.kind === 'pigment') p.pigment = Math.min(p.pigmentMax, p.pigment + this.amount);
      else if (this.kind === 'coin') { save.coins += this.amount; w.numbers?.pop(p.x, p.y + 1.5, `+${this.amount}`, { size: 0.35 }); }
      else p.ink = Math.min(p.inkMax, p.ink + this.amount);
      if (this.kind === 'coin') sfx.clink(); else sfx.charge(this.kind === 'life' ? 1 : 3);
      this.destroy();
      return;
    }
    if (this.t > 30) this.destroy();
    const s = this.sprites[0];
    s.setPos(this.x, this.y + this.z + Math.sin(this.t * 4) * 0.05);
    s.mesh.renderOrder = ySort(this.y);
  }
}
