/** Ink creatures. Never red. Scaled by tier, sometimes elite; they guard camps and chase the child. */
import { Entity, HitInfo } from './entity';
import type { World } from './world';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../gfx/sprite';
import { buildBlotFrames, buildWispFrames, buildInkDropFrames, buildBruteFrames, buildMiteFrames } from '../gfx/gen/creatures';
import { Painter, PIG_A } from '../gfx/paint';
import { shadow } from '../gfx/gen/ground';
import { washPoly, noisyOutline } from '../gfx/wash';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { sfx } from '../audio/sfx';
import type { Telegraph } from './telegraph';

function makeShadow(w: World, rx: number): Sprite {
  const p = new Painter(rx * 3, rx * 1.4, SPRITE_PPU, -rx * 1.5, -rx * 0.7);
  p.glaze();
  shadow(p, 0, 0, rx, rx * 0.38, 0.3);
  const s = new Sprite(p);
  s.mesh.renderOrder = LAYER.shadow;
  w.r.scenePig.add(s.mesh);
  return s;
}

let auraFrame: Frame | null = null;
let iceFrame: Frame | null = null;
function getAura(): Frame {
  if (!auraFrame) {
    const p = new Painter(3, 1.6, SPRITE_PPU / 2, -1.5, -0.8);
    p.glaze();
    washPoly(p, noisyOutline(0, 0, 1.3, 0.55, 0.25, 77), { pig: PIG_A, density: 0.55, soft: 0.7, seed: 77 });
    auraFrame = frameFrom(p);
  }
  return auraFrame;
}
function getIce(): Frame {
  if (!iceFrame) {
    const p = new Painter(2.4, 2.4, SPRITE_PPU / 2, -1.2, -0.6);
    p.over();
    const o = noisyOutline(0, 0.5, 0.75, 0.75, 0.22, 88);
    p.ctx.fillStyle = 'rgba(51,84,148,0.55)';
    p.ctx.beginPath();
    o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
    p.ctx.fill();
    p.ctx.strokeStyle = 'rgba(40,66,120,0.9)';
    p.ctx.lineWidth = 0.06;
    p.ctx.stroke();
    iceFrame = frameFrom(p);
  }
  return iceFrame;
}

export const TIER_HP = [1, 1, 1.5, 2.3, 3.1];

/** Base for creatures: hit flash, knockback, freeze, camp leash, death by dissolving into a stain. */
export class Creature extends Entity {
  protected flash = 0;
  protected stun = 0;
  protected dying = 0;
  protected body!: Sprite;
  protected shadowS!: Sprite;
  protected aura: Sprite | null = null;
  protected ice: Sprite | null = null;
  protected kx = 0;
  protected ky = 0;
  protected knockback = 1;
  /** Rises out of an ink puddle when spawned. */
  emerge = 0;
  frozen = 0;
  /** Experience given on death. */
  xp = 5;
  elite = false;
  tier = 1;
  /** Camp it belongs to: it goes back there if the child runs away. */
  home: [number, number] | null = null;
  leash = 22;
  aggro = false;
  aggroRange = 9;
  scaleK = 1;
  onDie?: () => void;
  maxHp = 1;

  /** How much one blow costs the child: deeper places and elites hit harder. */
  get power(): number {
    return 1 + (this.tier >= 3 ? 1 : 0) + (this.elite ? 1 : 0);
  }

  constructor() {
    super();
    this.team = 'enemy';
    this.inky = true;
    this.hookable = false;
  }

  /** Apply tier and elite scaling (call before adding to the world). */
  setup(tier: number, elite: boolean): this {
    this.tier = tier;
    this.elite = elite;
    const k = TIER_HP[Math.min(TIER_HP.length - 1, tier)] * (elite ? 3 : 1);
    this.hp = Math.round(this.hp * k);
    this.maxHp = this.hp;
    this.xp = Math.round(this.xp * (1 + (tier - 1) * 0.4) * (elite ? 4 : 1));
    if (elite) {
      this.scaleK = 1.35;
      this.radius *= 1.3;
      this.knockback *= 0.5;
    }
    return this;
  }

  protected initCommon(w: World, shadowR: number): void {
    this.shadowS = makeShadow(w, shadowR * this.scaleK);
    if (this.elite) {
      this.aura = new Sprite(getAura());
      this.aura.mesh.renderOrder = LAYER.shadow + 1;
      this.aura.mesh.scale.set(this.scaleK * shadowR * 1.2, this.scaleK * shadowR * 1.2, 1);
      w.r.scenePig.add(this.aura.mesh);
    }
  }

  freeze(seconds: number): void {
    if (this.dying > 0) return;
    this.frozen = Math.max(this.frozen, seconds * (this.elite ? 0.6 : 1));
    if (!this.ice) {
      this.ice = new Sprite(getIce());
      this.ice.mesh.renderOrder = LAYER.actorsBase + 3990;
      this.world.r.sceneAcc.add(this.ice.mesh);
    }
  }

  onHit(h: HitInfo): boolean {
    if (this.dying > 0 || this.dead || this.emerge > 0) return false;
    const w = this.world;
    this.hp -= h.dmg;
    this.flash = 0.12;
    this.aggro = true;
    const dx = this.x - h.fromX, dy = this.y - h.fromY;
    const l = Math.hypot(dx, dy) || 1;
    const kb = (h.kind === 'enso' ? 12 : 8) * this.knockback * (this.frozen > 0 ? 0.2 : 1);
    this.kx = (dx / l) * kb;
    this.ky = (dy / l) * kb;
    sfx.hit();
    w.numbers?.pop(this.x, this.y + 1.1 * this.scaleK + this.z, String(Math.round(h.dmg)) + (h.crit ? '!' : ''), { size: h.crit ? 0.7 : h.dmg >= 30 ? 0.6 : 0.42, red: h.crit });
    w.vfx.splat(this.x, this.y + 0.4, Math.atan2(dy, dx), h.kind === 'enso' ? 14 : 7, h.kind === 'enso' ? 1.4 : 0.9);
    if (this.hp <= 0) {
      this.dying = 0.001;
      w.vfx.stain(this.x, this.y, 1.1 * this.scaleK, 8);
      w.strokes.splat(this.x, this.y, this.radius * 2);
      this.onDie?.();
      w.onKill?.(this);
    }
    return true;
  }

  protected walk(dx: number, dy: number): void {
    const w = this.world;
    const ox = this.x, oy = this.y;
    w.move(this, dx, dy);
    if (!this.airborne && w.hazardAt(this.x, this.y)) { this.x = ox; this.y = oy; }
  }

  /** Shared: returns false when the creature should not act this frame. */
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
      if (this.aura) this.aura.opacity = 1 - this.dying / 0.3;
      if (this.ice) this.ice.opacity = 0;
      if (this.dying > 0.3) this.destroy();
      return false;
    }
    if (this.frozen > 0) {
      this.frozen -= dt;
      if (this.ice) {
        this.ice.setPos(this.x, this.y);
        this.ice.mesh.scale.set(this.radius * 1.6, this.radius * 1.6, 1);
        this.ice.opacity = Math.min(1, this.frozen * 3);
      }
      this.placeOnly();
      return false;
    }
    const p = this.world.player;
    const dp = Math.hypot(p.x - this.x, p.y - this.y);
    if (!this.aggro && dp < this.aggroRange && p.state !== 'dead' && !this.world.lineBlocked(this.x, this.y + 0.3, p.x, p.y + 0.3)) this.aggro = true;
    // leash: if the child ran far from the camp, go home
    if (this.home) {
      const dh = Math.hypot(this.x - this.home[0], this.y - this.home[1]);
      if (this.aggro && (Math.hypot(p.x - this.home[0], p.y - this.home[1]) > this.leash || p.state === 'dead')) this.aggro = false;
      if (!this.aggro && dh > 1.5) {
        const k = Math.min(1, (3 * dt) / dh);
        this.walk((this.home[0] - this.x) * k, (this.home[1] - this.y) * k);
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * dt * 0.3);
      }
    }
    return true;
  }

  /** Towards the child, around walls in dungeons (length = remaining path length). */
  protected seek(): [number, number] {
    const p = this.world.player;
    return this.world.steer(this.x, this.y, p.x, p.y);
  }

  protected placeOnly(): void {
    if (!this.body) return;
    this.body.setPos(this.x, this.y + this.z);
    this.body.mesh.renderOrder = ySort(this.y);
    if (this.shadowS) this.shadowS.setPos(this.x, this.y);
    if (this.aura) this.aura.setPos(this.x, this.y);
  }

  protected place(frame: Frame, bob = 0): void {
    this.body.setTexture(frame.tex);
    this.body.setPos(this.x, this.y + this.z + bob);
    this.body.mesh.renderOrder = ySort(this.y);
    this.body.pale = this.flash > 0 ? 0.7 : 0;
    const sx = Math.sign(this.body.mesh.scale.x) || 1;
    this.body.mesh.scale.set(sx * this.scaleK, this.scaleK, 1);
    if (this.shadowS) this.shadowS.setPos(this.x, this.y);
    if (this.aura) this.aura.setPos(this.x, this.y);
    if (this.ice && this.frozen <= 0) this.ice.opacity = 0;
  }

  dispose(): void {
    super.dispose();
    this.shadowS?.dispose();
    this.aura?.dispose();
    this.ice?.dispose();
  }
}

let blotFrames: Frame[] | null = null;

/** Blot: crawls, gathers itself (pale line on the ground), lunges. */
export class Blot extends Creature {
  private mode: 'idle' | 'approach' | 'gather' | 'lunge' | 'rest' = 'idle';
  private modeT = 0;
  private dir: [number, number] = [1, 0];
  private tg: Telegraph | null = null;
  private animT = Math.random() * 3;
  private wanderT = 0;
  constructor(x: number, y: number, small = false) {
    super();
    this.x = x; this.y = y;
    this.radius = small ? 0.3 : 0.42;
    this.hp = small ? 10 : 20;
    this.xp = small ? 2 : 5;
    if (small) { this.scaleK = 0.7; this.aggro = true; }
    this.knotY = 0.45;
    this.label = small ? 'blotlet' : 'blot';
  }
  init(w: World): void {
    if (!blotFrames) blotFrames = buildBlotFrames(1201);
    this.body = this.addSprite(new Sprite(blotFrames[0]));
    this.initCommon(w, 0.5);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'rest'; }
      return;
    }
    const w = this.world;
    const p = w.player;
    const frames = blotFrames!;
    this.animT += dt;
    this.modeT += dt;
    const [dx, dy] = this.seek();
    const d = Math.hypot(dx, dy) || 1;
    let frame = frames[Math.abs(Math.floor(this.animT * 5)) % 3];
    const speed = (this.elite ? 4 : 3.2) * (this.label === 'blotlet' ? 1.2 : 1);
    switch (this.mode) {
      case 'idle':
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          const a = Math.random() * Math.PI * 2;
          this.dir = [Math.cos(a), Math.sin(a)];
          this.wanderT = 1.5 + Math.random() * 2;
        }
        if (!this.home || Math.hypot(this.x - this.home[0], this.y - this.home[1]) < 4) this.walk(this.dir[0] * 0.5 * dt, this.dir[1] * 0.5 * dt);
        if (this.aggro) { this.mode = 'approach'; this.modeT = 0; }
        break;
      case 'approach':
        if (!this.aggro) { this.mode = 'idle'; break; }
        this.walk((dx / d) * speed * dt, (dy / d) * speed * dt);
        if (d < 3.2 && this.modeT > 0.25) {
          this.mode = 'gather';
          this.modeT = 0;
          this.dir = [dx / d, dy / d];
          this.tg = w.tele.add({ kind: 'line', length: 4.2, width: 0.9 * this.scaleK }, this.x, this.y, Math.atan2(dy, dx), 0.5, { hold: 0.2 });
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
        this.walk(this.dir[0] * 16 * dt, this.dir[1] * 16 * dt);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) p.hurt(this.power, this.x, this.y);
        if (this.modeT > 0.25) { this.mode = 'rest'; this.modeT = 0; w.vfx.dust(this.x, this.y, 3); }
        break;
      }
      case 'rest':
        if (this.modeT > 0.5) { this.mode = this.aggro ? 'approach' : 'idle'; this.modeT = 0; }
        break;
    }
    this.place(frame);
  }
}

let wispFrames: Frame[] | null = null;
let dropFrames: Frame[] | null = null;

/** Ink drop spat by wisps: slow; fresh strokes absorb it. */
export class InkDrop extends Entity {
  life = 0;
  reflected = false;
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
    this.reflected = true;
  }
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
    for (const c of w.collidersNear(this.x, this.y, 1)) {
      if (c.kind === 'circle' && Math.hypot(c.x - this.x, c.y - this.y) < c.r + this.radius) { this.pop(); return; }
    }
    if (w.nav && w.lineBlocked(this.x - this.vx * dt, this.y - this.vy * dt, this.x, this.y)) { this.pop(); return; }
    const p = w.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < p.radius + this.radius + 0.1) {
      if (p.hurt((this.owner as { power?: number }).power ?? 1, this.x, this.y)) { this.pop(); return; }
    }
  }
  pop(): void {
    this.world.vfx.splat(this.x, this.y + 0.3, Math.atan2(this.vy, this.vx) + Math.PI, 5, 0.6);
    this.destroy();
  }
}

/** Wisp: floats, keeps its distance, spits slow drops. */
export class Wisp extends Creature {
  private animT = Math.random() * 3;
  private shootT = 2;
  private tg: Telegraph | null = null;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.35;
    this.hp = 12;
    this.xp = 6;
    this.airborne = true;
    this.aggroRange = 11;
    this.label = 'wisp';
  }
  init(w: World): void {
    if (!wispFrames) wispFrames = buildWispFrames(1401);
    this.body = this.addSprite(new Sprite(wispFrames[0]));
    this.initCommon(w, 0.3);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; }
      return;
    }
    const w = this.world;
    const p = w.player;
    this.animT += dt;
    this.z = 0.5 + Math.sin(this.animT * 2) * 0.15;
    const [dx, dy] = this.seek();
    const d = Math.hypot(dx, dy) || 1;
    if (this.aggro) {
      const want = 5;
      const k = d > want ? 1 : -0.7;
      this.walk((dx / d) * k * 2.4 * dt + Math.cos(this.animT) * 0.4 * dt, (dy / d) * k * 2.4 * dt + Math.sin(this.animT * 1.3) * 0.4 * dt);
      this.shootT -= dt;
      // no shooting through rock
      if (this.shootT < 0.6 && w.lineBlocked(this.x, this.y + 0.5, p.x, p.y + 0.5)) {
        this.shootT = 0.6;
        if (this.tg) { w.tele.cancel(this.tg); this.tg = null; }
      }
      if (this.shootT <= 0.5 && !this.tg && this.shootT > 0) {
        this.tg = w.tele.add({ kind: 'circle', r: 0.45 }, this.x, this.y + 0.7, 0, 0.5, { hold: 0 });
        sfx.telegraph('high', 0.45);
      }
      if (this.tg) { this.tg.x = this.x; this.tg.y = this.y + 0.7; }
      if (this.shootT <= 0) {
        this.tg = null;
        const sp = this.elite ? 7.5 : 6.2;
        w.add(new InkDrop(this.x, this.y, (dx / d) * sp, (dy / d) * sp, this));
        if (this.elite) {
          for (const a of [-0.35, 0.35]) {
            const c = Math.cos(a), s = Math.sin(a);
            w.add(new InkDrop(this.x, this.y, ((dx * c - dy * s) / d) * sp, ((dx * s + dy * c) / d) * sp, this));
          }
        }
        this.shootT = 1.5 + Math.random() * 0.6;
      }
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
    this.hp = 70;
    this.xp = 20;
    this.knockback = 0.25;
    this.label = 'brute';
  }
  init(w: World): void {
    if (!bruteFrames) bruteFrames = buildBruteFrames(1501);
    this.body = this.addSprite(new Sprite(bruteFrames[0]));
    this.initCommon(w, 0.9);
  }
  onHit(h: HitInfo): boolean {
    if (this.dying > 0 || this.dead || this.emerge > 0) return false;
    const w = this.world;
    const toAtt = [h.fromX - this.x, h.fromY - this.y];
    const l = Math.hypot(toAtt[0], toAtt[1]) || 1;
    const front = (toAtt[0] * this.dir[0] + toAtt[1] * this.dir[1]) / l > 0.35;
    if (h.kind === 'brush' && front && this.mode !== 'stunned' && this.frozen <= 0) {
      sfx.clink();
      w.vfx.dust(this.x + this.dir[0] * 0.6, this.y + 0.6, 3);
      const p = w.player;
      p.push[0] += (-toAtt[0] / l) * -6;
      p.push[1] += (-toAtt[1] / l) * -6;
      this.flash = 0.06;
      w.numbers?.pop(this.x, this.y + 1.3, '0', { size: 0.36 });
      return false;
    }
    if (h.kind === 'cut' && this.mode === 'charge') h = { ...h, dmg: h.dmg * 2 };
    if (this.mode === 'stunned' && h.kind === 'brush') h = { ...h, dmg: h.dmg * 2 };
    return super.onHit(h);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) {
      if (this.tg && this.frozen > 0) { this.world.tele.cancel(this.tg); this.tg = null; this.mode = 'recover'; this.modeT = 0; }
      return;
    }
    const w = this.world;
    const p = w.player;
    const f = bruteFrames!;
    this.animT += dt;
    this.modeT += dt;
    this.cd -= dt;
    const [dx, dy] = this.seek();
    const d = Math.hypot(dx, dy) || 1;
    let frame = f[Math.abs(Math.floor(this.animT * 3)) % 2];
    switch (this.mode) {
      case 'approach':
        if (!this.aggro) break;
        this.dir = [dx / d, dy / d];
        this.walk((dx / d) * 2.2 * dt, (dy / d) * 2.2 * dt);
        if (d < 10 && this.cd <= 0 && p.state !== 'dead') {
          this.mode = 'prep';
          this.modeT = 0;
          this.chargeLeft = Math.min(12, d + 4);
          this.tg = w.tele.add({ kind: 'line', length: this.chargeLeft, width: 1.9 * this.scaleK }, this.x, this.y, Math.atan2(this.dir[1], this.dir[0]), 0.75, { hold: 0.2 });
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
        const step = (this.elite ? 22 : 19) * dt;
        const ox = this.x, oy = this.y;
        w.move(this, this.dir[0] * step, this.dir[1] * step);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        this.chargeLeft -= moved;
        if (Math.random() < 0.6) w.vfx.dust(this.x - this.dir[0] * 0.6, this.y, 1);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.1) p.hurt(this.power, this.x, this.y);
        if (moved < step * 0.5) {
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
    this.body.mesh.scale.x = this.face * this.scaleK;
  }
}

let miteFrames: Frame[] | null = null;

/** Swarm mite: tiny, fast, comes in groups. Perfect to circle. */
export class Mite extends Creature {
  private t = Math.random() * 10;
  private orbit: number;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.22;
    this.hp = 10;
    this.xp = 2;
    this.airborne = true;
    this.z = 0.7;
    this.orbit = Math.random() * Math.PI * 2;
    this.label = 'mite';
  }
  init(w: World): void {
    if (!miteFrames) miteFrames = buildMiteFrames(1601);
    this.body = this.addSprite(new Sprite(miteFrames[0]));
    this.initCommon(w, 0.2);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world;
    const p = w.player;
    this.t += dt;
    if (!this.aggro) {
      const c = this.home ?? [this.x, this.y];
      const a = this.orbit + this.t * 1.1;
      const tx = c[0] + Math.cos(a) * 1.5, ty = c[1] + Math.sin(a) * 1.0;
      this.walk((tx - this.x) * Math.min(1, dt * 2), (ty - this.y) * Math.min(1, dt * 2));
    } else {
      const dart = Math.sin(this.t * 0.9 + this.orbit) > 0.75;
      const r = dart ? 0.2 : 2.6;
      const a = this.orbit + this.t * 1.4;
      let tx = p.x + Math.cos(a) * r, ty = p.y + Math.sin(a) * r * 0.8;
      if (w.lineBlocked(this.x, this.y, p.x, p.y)) {
        const [sx, sy] = this.seek();
        tx = this.x + sx;
        ty = this.y + sy;
      }
      const sp = dart ? 9 : 4.6;
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.walk((dx / d) * Math.min(d, sp * dt), (dy / d) * Math.min(d, sp * dt));
      if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.05) p.hurt(this.power, this.x, this.y);
    }
    this.z = 0.7 + Math.sin(this.t * 7) * 0.1;
    this.place(miteFrames![Math.abs(Math.floor(this.t * 14)) % 2]);
  }
}

/** Mother blot: big and slow; bursts into three blotlets when killed. */
export class Splitter extends Blot {
  constructor(x: number, y: number) {
    super(x, y);
    this.radius = 0.7;
    this.hp = 50;
    this.xp = 10;
    this.scaleK = 1.55;
    this.knockback = 0.4;
    this.label = 'splitter';
  }
  setup(tier: number, elite: boolean): this {
    super.setup(tier, elite);
    this.scaleK *= 1.55;
    return this;
  }
  update(dt: number): void {
    // slower: half the frames move it
    super.update(dt * 0.7);
  }
  onHit(h: HitInfo): boolean {
    const r = super.onHit(h);
    if (r && this.hp <= 0) {
      const w = this.world;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.random();
        const b = new Blot(this.x + Math.cos(a) * 0.8, this.y + Math.sin(a) * 0.6, true).setup(this.tier, false);
        b.home = this.home;
        w.add(b);
        b.emerge = 0.25;
      }
    }
    return r;
  }
}

let totemFrames: Frame[] | null = null;

/** The ink well's two frames (shared with the bestiary). */
export function getTotemFrames(): Frame[] {
  if (!totemFrames) {
    totemFrames = [];
    for (let i = 0; i < 2; i++) {
      const p = new Painter(2.6, 2.6, SPRITE_PPU, -1.3, -0.6);
      const o = noisyOutline(0, 0.3, 0.95, 0.45, 0.15, 1700 + i);
      p.reserve(() => o.forEach((q, k) => (k === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
      p.glaze();
      washPoly(p, o, { pig: { ink: 1 }, density: 0.45, soft: 0.05, edge: 0.9, seed: 1700 + i });
      washPoly(p, noisyOutline(0, 0.32, 0.65, 0.28, 0.2, 1710 + i), { pig: { ink: 1 }, density: 0.95, soft: 0.05, edge: 0.5, seed: 1710 + i, blooms: 1 });
      // bubbles of ink rising
      for (let k = 0; k < 4; k++) {
        const x = (k - 1.5) * 0.3 + (i ? 0.1 : 0), y = 0.6 + ((k * 0.37 + i * 0.5) % 1) * 1.1;
        p.circle(x, y, 0.06 + (k % 2) * 0.04, { ink: 1 }, 0.8);
      }
      totemFrames.push(frameFrom(p));
    }
  }
  return totemFrames;
}

/** Ink well: never moves; gives birth to blots while the child is near. The heart of a camp. */
export class Totem extends Creature {
  private spawnT = 2;
  private spawned: Creature[] = [];
  private t = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.75;
    this.hp = 100;
    this.xp = 15;
    this.knockback = 0;
    this.solid = true;
    this.aggroRange = 13;
    this.label = 'totem';
  }
  init(w: World): void {
    getTotemFrames();
    this.body = this.addSprite(new Sprite(totemFrames![0]));
    this.initCommon(w, 1.0);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world;
    this.t += dt;
    this.spawned = this.spawned.filter((e) => !e.dead);
    if (this.aggro) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.spawned.length < (this.elite ? 5 : 3)) {
        this.spawnT = this.elite ? 2.6 : 3.6;
        const a = Math.random() * Math.PI * 2;
        const x = this.x + Math.cos(a) * 1.4, y = this.y + Math.sin(a) * 1.0;
        w.tele.add({ kind: 'circle', r: 0.55 }, x, y, 0, 0.6, {
          onFire: () => {
            if (this.dead || this.dying > 0) return;
            const b = new Blot(x, y).setup(this.tier, false);
            b.home = this.home ?? [this.x, this.y];
            b.aggro = true;
            b.emerge = 0.5;
            w.add(b);
            this.spawned.push(b);
            sfx.spawn();
          },
        });
      }
    }
    this.place(totemFrames![Math.abs(Math.floor(this.t * 2)) % 2]);
  }
}
