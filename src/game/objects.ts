/** Room objects: props, posts, pots, boulders, braziers, lanterns, inkstones. */
import { Entity, HitInfo } from './entity';
import type { World } from './world';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../gfx/sprite';
import { Painter, INK, PIG_B, VERMILION, LIGHT, mixPig } from '../gfx/paint';
import { drawTree, drawBamboo, SPRITE_PPU, TreeSpecies } from '../gfx/gen/flora';
import { drawRock } from '../gfx/gen/stone';
import { drawPost, drawStoneLamp, drawKnot, drawLanternPaper, PropArt } from '../gfx/gen/props';
import { stroke } from '../gfx/brush';
import { washPoly, noisyOutline, washBlob } from '../gfx/wash';
import { Rng } from '../gfx/rng';
import { sfx } from '../audio/sfx';

/** A static painted thing with an optional circle collider. */
export class Prop extends Entity {
  protected pig: Sprite | null = null;
  protected red: Sprite | null = null;
  crown: { x: number; y: number; rx: number; ry: number } | null = null;
  constructor(protected art: PropArt | (() => PropArt), x: number, y: number, radius: number, solid = true) {
    super();
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.solid = solid;
    this.weight = Infinity;
    this.label = 'prop';
  }
  init(_w: World): void {
    const a = typeof this.art === 'function' ? this.art() : this.art;
    this.pig = this.addSprite(new Sprite(a.pig));
    if (a.red) this.red = this.addSprite(new Sprite(a.red), true);
    this.place();
  }
  place(): void {
    for (const s of this.sprites) {
      s.setPos(this.x, this.y + this.z);
      s.mesh.renderOrder = ySort(this.y);
    }
  }
  update(dt: number): void {
    if (this.crown && this.pig) {
      const p = this.world.player;
      const dx = (p.x - (this.x + this.crown.x)) / this.crown.rx, dy = (p.y + 0.6 - (this.y + this.crown.y)) / this.crown.ry;
      const behind = p.y > this.y && dx * dx + dy * dy < 1.15;
      this.pig.opacity += ((behind ? 0.4 : 1) - this.pig.opacity) * Math.min(1, dt * 6);
    }
  }
}

export function makeTree(x: number, y: number, seed: number, species: TreeSpecies, scale = 1): Prop {
  const t = drawTree(seed, species, scale);
  const p = new Prop({ pig: t.painter }, x, y, t.trunkRadius, true);
  p.crown = t.crown;
  p.label = 'tree';
  return p;
}

export function makeBamboo(x: number, y: number, seed: number): Prop {
  const p = new Prop(() => ({ pig: drawBamboo(seed) }), x, y, 0.45, true);
  p.crown = { x: 0, y: 3, rx: 1.5, ry: 2.5 };
  p.label = 'bamboo';
  return p;
}

export function makeRock(x: number, y: number, seed: number, size = 1): Prop {
  const p = new Prop(() => ({ pig: drawRock(seed, size) }), x, y, 0.75 * size, true);
  p.label = 'rock';
  return p;
}

export function makeLamp(x: number, y: number, seed: number, lit = true): Prop {
  const p = new Prop(() => drawStoneLamp(seed, lit), x, y, 0.4, true);
  p.label = 'lamp';
  return p;
}

/** A wooden post with a red knot: fixed anchor for the thread. */
export class Post extends Prop {
  constructor(x: number, y: number, seed: number, height = 1.4) {
    super(() => drawPost(seed, height, true), x, y, 0.22, true);
    this.hookable = true;
    this.knotY = height * 0.72;
    this.label = 'post';
  }
}

/** Generic anchor wrapper: makes any prop hookable at a given knot height (trees with knots etc). */
export class KnotTree extends Prop {
  constructor(x: number, y: number, seed: number, species: TreeSpecies, knotY = 1.2) {
    const t = drawTree(seed, species, 1);
    const red = new Painter(t.painter.w, t.painter.h, SPRITE_PPU, t.painter.originX, t.painter.originY);
    red.glaze();
    drawKnot(red, 0.05, knotY, 0.45, seed + 3);
    super({ pig: t.painter, red }, x, y, t.trunkRadius, true);
    this.crown = t.crown;
    this.hookable = true;
    this.knotY = knotY;
    this.label = 'tree';
  }
}

let potFrames: { pig: Frame; red: Frame } | null = null;
function potArt(): { pig: Frame; red: Frame } {
  if (potFrames) return potFrames;
  const W = 1.2, H = 1.4;
  const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.25);
  const o = noisyOutline(0, 0.36, 0.3, 0.34, 0.08, 41);
  for (const q of o) if (q[1] < 0.06) q[1] = 0.06;
  p.reserve(() => o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
  p.glaze();
  washPoly(p, o, { pig: mixPig(INK, PIG_B, 0.3), density: 0.28, soft: 0.05, edge: 0.8, seed: 41 });
  stroke(p, [[-0.17, 0.72], [0, 0.76], [0.17, 0.72]], { width: 0.07, load: 1, seed: 42 });
  stroke(p, [[-0.25, 0.25], [-0.2, 0.55]], { width: 0.04, load: 0.6, dry: 0.6, seed: 43 });
  const r = new Painter(W, H, SPRITE_PPU, -W / 2, -0.25);
  r.glaze();
  drawKnot(r, 0, 0.62, 0.3, 44);
  potFrames = { pig: frameFrom(p), red: frameFrom(r) };
  return potFrames;
}

/** A clay pot: light, the thread brings it to you. */
export class Pot extends Entity {
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.3;
    this.weight = 0.4;
    this.hookable = true;
    this.solid = true;
    this.knotY = 0.55;
    this.label = 'pot';
  }
  init(): void {
    const a = potArt();
    this.addSprite(new Sprite(a.pig));
    this.addSprite(new Sprite(a.red), true);
  }
  update(dt: number): void {
    // light things drift in the wind
    const w = this.world;
    if (w.wind[0] || w.wind[1]) w.move(this, w.wind[0] * dt * 0.8, w.wind[1] * dt * 0.8);
    for (const s of this.sprites) { s.setPos(this.x, this.y); s.mesh.renderOrder = ySort(this.y); }
  }
}

/** A boulder: heavier than the child. Only a thread tied to something heavier moves it. */
export class Boulder extends Entity {
  constructor(x: number, y: number, private seed: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.8;
    this.weight = 4;
    this.hookable = true;
    this.solid = true;
    this.knotY = 0.9;
    this.label = 'boulder';
  }
  init(): void {
    this.addSprite(new Sprite(drawRock(this.seed, 1.1, 0.3)));
    const r = new Painter(2.6, 2.4, SPRITE_PPU, -1.3, -0.4);
    r.glaze();
    drawKnot(r, 0.1, 0.9, 0.4, this.seed + 1);
    this.addSprite(new Sprite(r), true);
  }
  update(): void {
    for (const s of this.sprites) { s.setPos(this.x, this.y); s.mesh.renderOrder = ySort(this.y); }
  }
}

let brazierArt: { pig: Frame; red: Frame } | null = null;
function getBrazierArt(): { pig: Frame; red: Frame } {
  if (brazierArt) return brazierArt;
  const W = 1.8, H = 1.8;
  const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
  const bowl = [[-0.5, 0.75], [0.5, 0.75], [0.36, 0.42], [-0.36, 0.42]] as [number, number][];
  p.reserve(() => { bowl.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))); p.ctx.rect(-0.14, 0, 0.28, 0.45); }, 1);
  p.glaze();
  washPoly(p, bowl, { pig: INK, density: 0.45, soft: 0.05, edge: 0.7, seed: 61 });
  washPoly(p, [[-0.14, 0], [0.14, 0], [0.12, 0.45], [-0.12, 0.45]], { pig: INK, density: 0.3, soft: 0.05, seed: 62 });
  stroke(p, [[-0.52, 0.76], [0, 0.8], [0.52, 0.76]], { width: 0.07, load: 1, seed: 63 });
  stroke(p, [[-0.25, 0.02], [0.25, 0.02]], { width: 0.08, load: 0.9, seed: 64 });
  const r = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
  r.glaze();
  drawKnot(r, 0, 0.58, 0.32, 65);
  brazierArt = { pig: frameFrom(p), red: frameFrom(r) };
  return brazierArt;
}

/** A fire bowl: fixed anchor; fire runs to and from it along a tied thread. */
export class Brazier extends Entity {
  private flameT = 0;
  onIgnite?: () => void;
  constructor(x: number, y: number, lit: boolean) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.weight = Infinity;
    this.hookable = true;
    this.solid = true;
    this.flammable = true;
    this.burning = lit;
    this.knotY = 0.62;
    this.label = 'brazier';
  }
  init(): void {
    const a = getBrazierArt();
    for (const s of [this.addSprite(new Sprite(a.pig)), this.addSprite(new Sprite(a.red), true)]) {
      s.setPos(this.x, this.y);
      s.mesh.renderOrder = ySort(this.y);
    }
  }
  ignite(): void {
    if (!this.burning) {
      this.burning = true;
      this.onIgnite?.();
    }
  }
  extinguish(): void {
    if (this.burning) {
      this.burning = false;
      this.world.vfx.dust(this.x, this.y + 0.8, 6);
    }
  }
  update(dt: number): void {
    if (!this.burning) return;
    this.flameT -= dt;
    if (this.flameT <= 0) {
      this.world.vfx.flame(this.x, this.y + 0.72, 1.1);
      this.flameT = 0.06;
    }
    this.world.vfx.glowAt(this.x, this.y + 0.6, 1.6, 0.05);
  }
}

let lanternFrames: { pig: Frame; red: Frame } | null = null;
/** A drifting paper lantern: bounces off a taut thread, burns what it touches. */
export class Lantern extends Entity {
  life = 0;
  maxLife = 12;
  onHitTarget?: (e: Entity) => void;
  /** Entities it can burn. */
  constructor(x: number, y: number, vx: number, vy: number, readonly owner: Entity | null = null) {
    super();
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.radius = 0.28;
    this.bouncy = true;
    this.burning = true;
    this.airborne = true;
    this.z = 0.8;
    this.label = 'lantern';
  }
  init(): void {
    if (!lanternFrames) {
      const a = drawLanternPaper(71, true);
      lanternFrames = { pig: frameFrom(a.pig), red: frameFrom(a.red!) };
    }
    this.addSprite(new Sprite(lanternFrames.pig));
    this.addSprite(new Sprite(lanternFrames.red), true);
  }
  update(dt: number): void {
    const w = this.world;
    this.life += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z = 0.8 + Math.sin(this.life * 2.4) * 0.12;
    const b = w.bounds;
    if (this.life > this.maxLife || this.x < b.x - 2 || this.x > b.x + b.w + 2 || this.y < b.y - 2 || this.y > b.y + b.h + 2) this.destroy();
    // touch
    const p = w.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) {
      if (p.hurt(1, this.x, this.y)) this.burst();
    }
    for (const e of w.entities) {
      if (e === this || e === this.owner || e.dead || e === p) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) < this.radius + e.radius) {
        if (e.flammable && !e.burning) { e.ignite(); sfx.fire(); this.burst(); break; }
        if (this.onHitTarget && e.team === 'enemy') { this.onHitTarget(e); this.burst(); break; }
      }
    }
    for (const s of this.sprites) { s.setPos(this.x, this.y + this.z); s.mesh.renderOrder = ySort(this.y); }
    w.vfx.glowAt(this.x, this.y + this.z + 0.4, 1.0, 0.04);
  }
  burst(): void {
    const w = this.world;
    for (let i = 0; i < 6; i++) w.vfx.flame(this.x, this.y + this.z, 0.8);
    this.destroy();
  }
}

let inkstoneArt: Frame | null = null;
/** Inkstone: heals and sets the checkpoint. */
export class Inkstone extends Entity {
  private active = false;
  private cool = 0;
  onUse?: () => void;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.55;
    this.solid = true;
    this.label = 'inkstone';
  }
  init(): void {
    if (!inkstoneArt) {
      const W = 2, H = 1.4;
      const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.5);
      const o = noisyOutline(0, 0.12, 0.62, 0.32, 0.12, 81);
      p.reserve(() => o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
      p.glaze();
      washPoly(p, o, { pig: INK, density: 0.3, soft: 0.05, edge: 0.9, seed: 81 });
      washPoly(p, noisyOutline(0.05, 0.16, 0.36, 0.15, 0.1, 82), { pig: INK, density: 0.95, soft: 0.05, edge: 0.5, seed: 82 });
      stroke(p, [[-0.62, 0.1], [-0.3, 0.42], [0.3, 0.44], [0.62, 0.12]], { width: 0.06, load: 0.9, dry: 0.4, seed: 83 });
      washBlob(p, 0.1, 0.2, 0.08, 0.03, { pig: LIGHT, density: 0, seed: 84 });
      inkstoneArt = frameFrom(p);
    }
    const s = this.addSprite(new Sprite(inkstoneArt));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = ySort(this.y);
  }
  update(dt: number): void {
    const w = this.world;
    const p = w.player;
    this.cool -= dt;
    const near = Math.hypot(p.x - this.x, p.y - this.y) < 1.3;
    if (near && this.cool <= 0 && p.state !== 'dead') {
      if (!this.active || p.hp < 5) {
        this.active = true;
        p.hp = 5;
        w.checkpoint = [this.x, this.y - 1.0];
        sfx.inkstone();
        w.vfx.ripple(this.x, this.y + 0.15, 0.7);
        this.onUse?.();
      }
      this.cool = 1.5;
    }
    if (this.active && Math.random() < dt * 0.6) w.vfx.ripple(this.x + 0.05, this.y + 0.16, 0.35);
  }
}

/** A flat red knot on the ground (stake): fixed anchor that does not block movement. */
export class Stake extends Entity {
  constructor(x: number, y: number, private seed: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.2;
    this.weight = Infinity;
    this.hookable = true;
    this.knotY = 0.25;
    this.label = 'stake';
  }
  init(): void {
    const p = new Painter(1, 1, SPRITE_PPU, -0.5, -0.3);
    p.glaze();
    washBlob(p, 0, 0.05, 0.16, 0.08, { pig: INK, density: 0.5, soft: 0.1, seed: this.seed });
    stroke(p, [[0, 0.02], [0, 0.32]], { width: 0.09, load: 1, seed: this.seed + 1 });
    const r = new Painter(1, 1, SPRITE_PPU, -0.5, -0.3);
    r.glaze();
    drawKnot(r, 0, 0.28, 0.3, this.seed + 2);
    for (const s of [this.addSprite(new Sprite(p)), this.addSprite(new Sprite(r), true)]) {
      s.setPos(this.x, this.y);
      s.mesh.renderOrder = ySort(this.y);
    }
  }
}

export { VERMILION, LAYER, Rng };
export type { HitInfo };
