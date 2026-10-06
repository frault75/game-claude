/** Common ink creatures. Few, readable, never red. */
import { Entity, HitInfo } from './entity';
import type { World } from './world';
import { Sprite, Frame, ySort, LAYER } from '../gfx/sprite';
import { buildBlotFrames, buildWispFrames, buildInkDropFrames } from '../gfx/gen/creatures';
import { Painter } from '../gfx/paint';
import { shadow } from '../gfx/gen/ground';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { sfx } from '../audio/sfx';
import type { Telegraph } from './telegraph';

let shadowFrame: Sprite | null = null;
void shadowFrame;
function makeShadow(w: World, rx: number): Sprite {
  const p = new Painter(rx * 3, rx * 1.4, SPRITE_PPU, -rx * 1.5, -rx * 0.7);
  p.glaze();
  shadow(p, 0, 0, rx, rx * 0.38, 0.3);
  const s = new Sprite(p);
  s.mesh.renderOrder = LAYER.shadow;
  w.r.scenePig.add(s.mesh);
  return s;
}

/** Base for creatures: hit flash, knockback, death by dissolving into a stain. */
export class Creature extends Entity {
  protected flash = 0;
  protected stun = 0;
  protected dying = 0;
  protected body!: Sprite;
  protected shadowS!: Sprite;
  protected kx = 0;
  protected ky = 0;
  onDie?: () => void;

  constructor() {
    super();
    this.team = 'enemy';
    this.inky = true;
    this.hookable = false;
  }

  onHit(h: HitInfo): boolean {
    if (this.dying > 0 || this.dead) return false;
    const w = this.world;
    this.hp -= h.dmg;
    this.flash = 0.12;
    const dx = this.x - h.fromX, dy = this.y - h.fromY;
    const l = Math.hypot(dx, dy) || 1;
    this.kx = (dx / l) * 8;
    this.ky = (dy / l) * 8;
    sfx.hit();
    w.vfx.splat(this.x, this.y + 0.4, Math.atan2(dy, dx), 7, 0.9);
    if (this.hp <= 0) {
      this.dying = 0.001;
      w.vfx.stain(this.x, this.y, 1.1, 8);
      this.onDie?.();
    }
    return true;
  }

  /** Move without crossing a taut thread (ink cannot pass it). */
  protected walk(dx: number, dy: number): void {
    const w = this.world;
    if (w.crossesThread(this.x, this.y, this.x + dx * 3, this.y + dy * 3)) {
      // pushed back by the thread
      const s = w.tautSegment()!;
      const sx = s[2] - s[0], sy = s[3] - s[1];
      const sl = Math.hypot(sx, sy) || 1;
      const nx = -sy / sl, ny = sx / sl;
      const side = Math.sign((this.x - s[0]) * nx + (this.y - s[1]) * ny) || 1;
      w.move(this, nx * side * 0.05, ny * side * 0.05);
      return;
    }
    const ox = this.x, oy = this.y;
    w.move(this, dx, dy);
    if (!this.airborne && w.hazardAt(this.x, this.y)) { this.x = ox; this.y = oy; }
  }

  protected baseUpdate(dt: number): boolean {
    this.flash = Math.max(0, this.flash - dt);
    this.stun = Math.max(0, this.stun - dt);
    if (this.kx || this.ky) {
      this.walk(this.kx * dt, this.ky * dt);
      this.kx *= Math.max(0, 1 - dt * 10);
      this.ky *= Math.max(0, 1 - dt * 10);
      if (Math.hypot(this.kx, this.ky) < 0.1) { this.kx = 0; this.ky = 0; }
    }
    if (this.dying > 0) {
      this.dying += dt;
      for (const s of this.sprites) s.dissolve = Math.min(1, this.dying / 0.5);
      if (this.shadowS) this.shadowS.opacity = 1 - this.dying / 0.5;
      if (this.dying > 0.5) this.destroy();
      return false;
    }
    return true;
  }

  protected place(frame: Frame, bob = 0): void {
    this.body.setTexture(frame.tex);
    this.body.setPos(this.x, this.y + this.z + bob);
    this.body.mesh.renderOrder = ySort(this.y);
    this.body.pale = this.flash > 0 ? 0.7 : 0;
    if (this.shadowS) this.shadowS.setPos(this.x, this.y);
  }

  dispose(): void {
    super.dispose();
    this.shadowS?.dispose();
  }
}

let blotFrames: Frame[] | null = null;

/** Blot: crawls, gathers itself (pale line on the ground), lunges. Light: the thread pulls it in. */
export class Blot extends Creature {
  private mode: 'idle' | 'approach' | 'gather' | 'lunge' | 'rest' = 'idle';
  private modeT = 0;
  private dir: [number, number] = [1, 0];
  private tg: Telegraph | null = null;
  private animT = Math.random() * 3;
  private wanderT = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.42;
    this.hp = 2;
    this.weight = 0.6;
    this.knotY = 0.45;
    this.label = 'blot';
  }
  init(w: World): void {
    if (!blotFrames) blotFrames = buildBlotFrames(1201);
    this.body = this.addSprite(new Sprite(blotFrames[0]));
    this.shadowS = makeShadow(w, 0.5);
  }
  onPulled(): void {
    this.stun = 1.4;
    if (this.tg) { this.world.tele.cancel(this.tg); this.tg = null; }
    this.mode = 'rest';
    this.modeT = 0;
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world;
    const p = w.player;
    const frames = blotFrames!;
    this.animT += dt;
    this.modeT += dt;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    let frame = frames[Math.floor(this.animT * 5) % 3];
    if (this.stun > 0) {
      frame = frames[Math.floor(this.animT * 12) % 3];
      this.place(frame);
      return;
    }
    switch (this.mode) {
      case 'idle':
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          const a = Math.random() * Math.PI * 2;
          this.dir = [Math.cos(a), Math.sin(a)];
          this.wanderT = 1.5 + Math.random() * 2;
        }
        this.walk(this.dir[0] * 0.5 * dt, this.dir[1] * 0.5 * dt);
        if (d < 6.5 && p.state !== 'dead') { this.mode = 'approach'; this.modeT = 0; }
        break;
      case 'approach':
        if (d > 9 || p.state === 'dead') { this.mode = 'idle'; break; }
        this.walk((dx / d) * 1.7 * dt, (dy / d) * 1.7 * dt);
        if (d < 2.6 && this.modeT > 0.4) {
          this.mode = 'gather';
          this.modeT = 0;
          this.dir = [dx / d, dy / d];
          const ang = Math.atan2(dy, dx);
          this.tg = w.tele.add({ kind: 'line', length: 3.4, width: 0.9 }, this.x, this.y, ang, 0.75, { hold: 0.25 });
          sfx.telegraph('mid', 0.7);
        }
        break;
      case 'gather':
        frame = frames[3];
        if (this.tg) { this.tg.x = this.x; this.tg.y = this.y; }
        if (this.modeT > 0.75) { this.mode = 'lunge'; this.modeT = 0; this.tg = null; }
        break;
      case 'lunge': {
        frame = frames[4];
        const sp = 11;
        this.walk(this.dir[0] * sp * dt, this.dir[1] * sp * dt);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) p.hurt(1, this.x, this.y);
        if (this.modeT > 0.28) { this.mode = 'rest'; this.modeT = 0; w.vfx.dust(this.x, this.y, 3); }
        break;
      }
      case 'rest':
        if (this.modeT > 0.9) { this.mode = 'approach'; this.modeT = 0; }
        break;
    }
    this.place(frame);
  }
}

let wispFrames: Frame[] | null = null;
let dropFrames: Frame[] | null = null;

/** Ink drop spat by wisps: slow, bounces off a taut thread. */
export class InkDrop extends Entity {
  life = 0;
  constructor(x: number, y: number, vx: number, vy: number, readonly owner: Entity) {
    super();
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.radius = 0.18;
    this.bouncy = true;
    this.airborne = true;
    this.z = 0.6;
    this.label = 'inkdrop';
  }
  init(): void {
    if (!dropFrames) dropFrames = buildInkDropFrames(1301);
    this.addSprite(new Sprite(dropFrames[0]));
  }
  onTouched(): void {
    // reflected: now it can hit its owner
    this.reflected = true;
  }
  reflected = false;
  update(dt: number): void {
    const w = this.world;
    this.life += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const s = this.sprites[0];
    s.setPos(this.x, this.y + this.z);
    s.mesh.rotation.z = Math.atan2(this.vy, this.vx) + Math.PI;
    s.mesh.renderOrder = ySort(this.y);
    if (this.life > 5) { this.destroy(); return; }
    for (const c of w.colliders) {
      if (c.kind === 'circle' && Math.hypot(c.x - this.x, c.y - this.y) < c.r + this.radius) { this.pop(); return; }
    }
    const p = w.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < p.radius + this.radius + 0.1) {
      if (p.hurt(1, this.x, this.y)) { this.pop(); return; }
    }
    if (this.reflected) {
      for (const e of w.entities) {
        if (e.team !== 'enemy' || e.dead) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) < e.radius + this.radius + 0.2) {
          e.onHit({ dmg: 1, fromX: this.x, fromY: this.y, kind: 'reflect' });
          this.pop();
          return;
        }
      }
    }
  }
  pop(): void {
    this.world.vfx.splat(this.x, this.y + 0.3, Math.atan2(this.vy, this.vx) + Math.PI, 5, 0.6);
    this.destroy();
  }
}

/** Wisp: floats, spits slow drops. Cannot cross a taut thread. */
export class Wisp extends Creature {
  private animT = Math.random() * 3;
  private shootT = 2;
  private tg: Telegraph | null = null;
  private hover: [number, number];
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.hover = [x, y];
    this.radius = 0.35;
    this.hp = 1;
    this.weight = 0.3;
    this.hookable = false;
    this.airborne = true;
    this.label = 'wisp';
  }
  init(w: World): void {
    if (!wispFrames) wispFrames = buildWispFrames(1401);
    this.body = this.addSprite(new Sprite(wispFrames[0]));
    this.shadowS = makeShadow(w, 0.3);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world;
    const p = w.player;
    this.animT += dt;
    this.z = 0.5 + Math.sin(this.animT * 2) * 0.15;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    // drift towards a point near the player but keep distance
    if (d < 9 && p.state !== 'dead') {
      const want = 4.5;
      const k = d > want ? 1 : -0.6;
      const tx = this.x + (dx / d) * k * 1.2 * dt + Math.cos(this.animT) * 0.4 * dt;
      const ty = this.y + (dy / d) * k * 1.2 * dt + Math.sin(this.animT * 1.3) * 0.4 * dt;
      this.walk(tx - this.x, ty - this.y);
      this.shootT -= dt;
      if (this.shootT <= 0.8 && !this.tg && this.shootT > 0) {
        this.tg = w.tele.add({ kind: 'circle', r: 0.45 }, this.x, this.y + 0.7, 0, 0.8, { hold: 0 });
        sfx.telegraph('high', 0.6);
      }
      if (this.tg) { this.tg.x = this.x; this.tg.y = this.y + 0.7; }
      if (this.shootT <= 0) {
        this.tg = null;
        const sp = 3.6;
        w.add(new InkDrop(this.x, this.y, (dx / d) * sp, (dy / d) * sp, this));
        this.shootT = 2.6 + Math.random();
      }
    } else {
      this.walk((this.hover[0] - this.x) * 0.5 * dt, (this.hover[1] - this.y) * 0.5 * dt);
    }
    this.place(wispFrames![Math.floor(this.animT * 6) % 4]);
  }
}
