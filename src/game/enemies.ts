/** Common ink creatures. Few, readable, never red. */
import { Entity, HitInfo } from './entity';
import type { World } from './world';
import { Sprite, Frame, ySort, LAYER } from '../gfx/sprite';
import { buildBlotFrames, buildWispFrames, buildInkDropFrames, buildBruteFrames, buildMiteFrames } from '../gfx/gen/creatures';
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
  protected knockback = 1;
  onDie?: () => void;
  /** Rises out of an ink puddle when spawned. */
  emerge = 0;

  constructor() {
    super();
    this.team = 'enemy';
    this.inky = true;
    this.hookable = false;
  }

  onHit(h: HitInfo): boolean {
    if (this.dying > 0 || this.dead || this.emerge > 0) return false;
    const w = this.world;
    this.hp -= h.dmg;
    this.flash = 0.12;
    const dx = this.x - h.fromX, dy = this.y - h.fromY;
    const l = Math.hypot(dx, dy) || 1;
    const kb = (h.kind === 'enso' ? 12 : 8) * this.knockback;
    this.kx = (dx / l) * kb;
    this.ky = (dy / l) * kb;
    sfx.hit();
    w.vfx.splat(this.x, this.y + 0.4, Math.atan2(dy, dx), h.kind === 'enso' ? 14 : 7, h.kind === 'enso' ? 1.4 : 0.9);
    if (this.hp <= 0) {
      this.dying = 0.001;
      w.vfx.stain(this.x, this.y, 1.1, 8);
      w.strokes.splat(this.x, this.y, this.radius * 2);
      this.onDie?.();
    }
    return true;
  }

  protected walk(dx: number, dy: number): void {
    const w = this.world;
    const ox = this.x, oy = this.y;
    w.move(this, dx, dy);
    if (!this.airborne && w.hazardAt(this.x, this.y)) { this.x = ox; this.y = oy; }
  }

  protected baseUpdate(dt: number): boolean {
    if (this.emerge > 0) {
      this.emerge = Math.max(0, this.emerge - dt);
      for (const s of this.sprites) s.dissolve = this.emerge / 0.6;
      if (this.shadowS) this.shadowS.opacity = 1 - this.emerge / 0.6;
      if (this.emerge > 0) { this.placeOnly(); return false; }
    }
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
      for (const s of this.sprites) s.dissolve = Math.min(1, this.dying / 0.3);
      if (this.shadowS) this.shadowS.opacity = 1 - this.dying / 0.3;
      if (this.dying > 0.3) this.destroy();
      return false;
    }
    return true;
  }

  protected placeOnly(): void {
    if (!this.body) return;
    this.body.setPos(this.x, this.y + this.z);
    this.body.mesh.renderOrder = ySort(this.y);
    if (this.shadowS) this.shadowS.setPos(this.x, this.y);
  }

  onHit2(h: HitInfo): boolean {
    return this.onHit(h);
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
    let frame = frames[Math.abs(Math.floor(this.animT * 5)) % 3];
    if (this.stun > 0) {
      frame = frames[Math.abs(Math.floor(this.animT * 12)) % 3];
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
        if (d < 14 && p.state !== 'dead') { this.mode = 'approach'; this.modeT = 0; }
        break;
      case 'approach':
        if (d > 18 || p.state === 'dead') { this.mode = 'idle'; break; }
        this.walk((dx / d) * 3.2 * dt, (dy / d) * 3.2 * dt);
        if (d < 3.2 && this.modeT > 0.25) {
          this.mode = 'gather';
          this.modeT = 0;
          this.dir = [dx / d, dy / d];
          const ang = Math.atan2(dy, dx);
          this.tg = w.tele.add({ kind: 'line', length: 4.2, width: 0.9 }, this.x, this.y, ang, 0.5, { hold: 0.2 });
          sfx.telegraph('mid', 0.5);
        }
        break;
      case 'gather':
        frame = frames[3];
        if (this.tg) { this.tg.x = this.x; this.tg.y = this.y; }
        if (this.modeT > 0.5) { this.mode = 'lunge'; this.modeT = 0; this.tg = null; }
        break;
      case 'lunge': {
        frame = frames[4];
        const sp = 16;
        this.walk(this.dir[0] * sp * dt, this.dir[1] * sp * dt);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) p.hurt(1, this.x, this.y);
        if (this.modeT > 0.25) { this.mode = 'rest'; this.modeT = 0; w.vfx.dust(this.x, this.y, 3); }
        break;
      }
      case 'rest':
        if (this.modeT > 0.5) { this.mode = 'approach'; this.modeT = 0; }
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
    if (w.strokes.absorbs(this.x, this.y, this.radius)) {
      w.vfx.splat(this.x, this.y + 0.3, Math.atan2(this.vy, this.vx) + Math.PI, 4, 0.5, 'red');
      this.destroy();
      return;
    }
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
    if (d < 16 && p.state !== 'dead') {
      const want = 5;
      const k = d > want ? 1 : -0.7;
      const tx = this.x + (dx / d) * k * 2.4 * dt + Math.cos(this.animT) * 0.4 * dt;
      const ty = this.y + (dy / d) * k * 2.4 * dt + Math.sin(this.animT * 1.3) * 0.4 * dt;
      this.walk(tx - this.x, ty - this.y);
      this.shootT -= dt;
      if (this.shootT <= 0.5 && !this.tg && this.shootT > 0) {
        this.tg = w.tele.add({ kind: 'circle', r: 0.45 }, this.x, this.y + 0.7, 0, 0.5, { hold: 0 });
        sfx.telegraph('high', 0.45);
      }
      if (this.tg) { this.tg.x = this.x; this.tg.y = this.y + 0.7; }
      if (this.shootT <= 0) {
        this.tg = null;
        const sp = 6.2;
        w.add(new InkDrop(this.x, this.y, (dx / d) * sp, (dy / d) * sp, this));
        this.shootT = 1.5 + Math.random() * 0.6;
      }
    } else {
      this.walk((this.hover[0] - this.x) * 0.5 * dt, (this.hover[1] - this.y) * 0.5 * dt);
    }
    this.place(wispFrames![Math.abs(Math.floor(this.animT * 6)) % 4]);
  }
}

let bruteFrames: Frame[] | null = null;

/** Brute (ram): armoured in front, charges in a line after a long telegraph. Cut it while it charges. */
export class Brute extends Creature {
  private mode: 'approach' | 'prep' | 'charge' | 'stunned' | 'recover' = 'approach';
  private modeT = 0;
  private dir: [number, number] = [1, 0];
  private face = 1;
  private cd = 1.5;
  private chargeLeft = 0;
  private tg: Telegraph | null = null;
  private animT = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.75;
    this.hp = 7;
    this.knockback = 0.25;
    this.label = 'brute';
  }
  init(w: World): void {
    if (!bruteFrames) bruteFrames = buildBruteFrames(1501);
    this.body = this.addSprite(new Sprite(bruteFrames[0]));
    this.shadowS = makeShadow(w, 0.9);
  }
  onHit(h: HitInfo): boolean {
    if (this.dying > 0 || this.dead || this.emerge > 0) return false;
    const w = this.world;
    const toAtt = [h.fromX - this.x, h.fromY - this.y];
    const l = Math.hypot(toAtt[0], toAtt[1]) || 1;
    const front = (toAtt[0] * this.dir[0] + toAtt[1] * this.dir[1]) / l > 0.35;
    if (h.kind === 'brush' && front && this.mode !== 'stunned') {
      sfx.clink();
      w.vfx.dust(this.x + this.dir[0] * 0.6, this.y + 0.6, 3);
      const p = w.player;
      p.push[0] -= (toAtt[0] / l) * -6;
      p.push[1] -= (toAtt[1] / l) * -6;
      this.flash = 0.06;
      return false;
    }
    if (h.kind === 'cut' && this.mode === 'charge') h = { ...h, dmg: 2 };
    if (h.kind === 'enso') h = { ...h, dmg: 4 };
    if (this.mode === 'stunned' && h.kind === 'brush') h = { ...h, dmg: 2 };
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world;
    const p = w.player;
    const f = bruteFrames!;
    this.animT += dt;
    this.modeT += dt;
    this.cd -= dt;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    let frame = f[Math.abs(Math.floor(this.animT * 3)) % 2];
    switch (this.mode) {
      case 'approach':
        this.dir = [dx / d, dy / d];
        this.walk((dx / d) * 2.2 * dt, (dy / d) * 2.2 * dt);
        if (d < 10 && this.cd <= 0 && p.state !== 'dead') {
          this.mode = 'prep';
          this.modeT = 0;
          const b = w.bounds;
          let L = 2;
          while (L < 12) {
            const ex = this.x + this.dir[0] * L, ey = this.y + this.dir[1] * L;
            if (ex < b.x + 0.8 || ex > b.x + b.w - 0.8 || ey < b.y + 0.8 || ey > b.y + b.h - 0.8) break;
            L += 0.25;
          }
          this.chargeLeft = L;
          this.tg = w.tele.add({ kind: 'line', length: L, width: 1.9 }, this.x, this.y, Math.atan2(this.dir[1], this.dir[0]), 0.75, { hold: 0.2 });
          sfx.telegraph('low', 0.75);
        }
        break;
      case 'prep':
        frame = f[2];
        this.x += Math.sin(this.modeT * 50) * 0.01;
        if (this.tg) this.tg.x = this.x;
        if (this.modeT > 0.75) { this.mode = 'charge'; this.modeT = 0; this.tg = null; w.shake(0.08, 0.15); }
        break;
      case 'charge': {
        frame = f[3];
        const step = 19 * dt;
        const ox = this.x, oy = this.y;
        w.move(this, this.dir[0] * step, this.dir[1] * step);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        this.chargeLeft -= moved;
        if (Math.random() < 0.6) w.vfx.dust(this.x - this.dir[0] * 0.6, this.y, 1);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) p.hurt(1, this.x, this.y);
        if (moved < step * 0.5) {
          // slammed into the edge: dazed
          this.mode = 'stunned';
          this.modeT = 0;
          sfx.impact(true);
          w.shake(0.25, 0.25);
          w.vfx.splat(this.x + this.dir[0] * 0.7, this.y + 0.5, Math.atan2(-this.dir[1], -this.dir[0]), 8, 1);
        } else if (this.chargeLeft <= 0) {
          this.mode = 'recover';
          this.modeT = 0;
        }
        break;
      }
      case 'stunned':
        frame = f[4];
        if (this.modeT > 1.3) { this.mode = 'approach'; this.modeT = 0; this.cd = 1.2; }
        break;
      case 'recover':
        frame = f[0];
        if (this.modeT > 0.5) { this.mode = 'approach'; this.modeT = 0; this.cd = 1.6; }
        break;
    }
    if (this.mode === 'approach') this.face = this.dir[0] < 0 ? -1 : 1;
    this.place(frame);
    this.body.mesh.scale.x = this.face;
  }
}

let miteFrames: Frame[] | null = null;

/** Swarm mite: tiny, fast, comes in groups. One hit. Perfect to circle. */
export class Mite extends Creature {
  private t = Math.random() * 10;
  private orbit: number;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.22;
    this.hp = 1;
    this.airborne = true;
    this.z = 0.7;
    this.orbit = Math.random() * Math.PI * 2;
    this.label = 'mite';
  }
  init(w: World): void {
    if (!miteFrames) miteFrames = buildMiteFrames(1601);
    this.body = this.addSprite(new Sprite(miteFrames[0]));
    this.shadowS = makeShadow(w, 0.2);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world;
    const p = w.player;
    this.t += dt;
    // circle the child, then dart in
    const dart = Math.sin(this.t * 0.9 + this.orbit) > 0.75;
    const r = dart ? 0.2 : 2.6;
    const a = this.orbit + this.t * 1.4;
    const tx = p.x + Math.cos(a) * r, ty = p.y + Math.sin(a) * r * 0.8;
    const sp = dart ? 9 : 4.6;
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.walk((dx / d) * Math.min(d, sp * dt), (dy / d) * Math.min(d, sp * dt));
    this.z = 0.7 + Math.sin(this.t * 7) * 0.1;
    if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.05) p.hurt(1, this.x, this.y);
    this.place(miteFrames![Math.abs(Math.floor(this.t * 14)) % 2]);
  }
}
