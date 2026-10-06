/** Shu, the last stroke: runs, slashes, and dashes in strokes of vermilion ink. */
import { Entity, HitInfo } from './entity';
import type { World } from './world';
import { Sprite, LAYER, ySort } from '../gfx/sprite';
import { Painter } from '../gfx/paint';
import { buildChildFrames, ChildFrames, Facing, ChildPose } from '../gfx/gen/child';
import { shadow } from '../gfx/gen/ground';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { sfx } from '../audio/sfx';
import { angleDiff, distToSeg, V } from './physics';

type State = 'normal' | 'strike' | 'dash' | 'hurt' | 'fall' | 'dead' | 'frozen';

export const PLAYER = {
  speed: 8.4,
  accel: 110,
  maxHp: 5,
  dashSpeed: 50,
  dashMin: 1.8,
  dashMax: 5.6,
  dashIframesExtra: 0.08,
  charges: 4,
  rechargeTime: 0.32,
  rechargeDelay: 0.1,
  strikeRange: 1.7,
  strikeHalf: 1.05,
};

let framesCache: ChildFrames | null = null;

interface DashState {
  dir: V;
  dist: number;
  done: number;
  seg: ReturnType<World['strokes']['begin']>;
  hit: Set<Entity>;
}

export class Player extends Entity {
  state: State = 'normal';
  stateT = 0;
  facing: Facing = 'down';
  flip = 1;
  aim: V = [0, -1];
  moveDir: V = [0, 0];
  invuln = 0;
  charges = PLAYER.charges;
  private chargeT = 0;
  private sinceDash = 10;
  private dash: DashState | null = null;
  private queued: V | null = null;
  private combo = 0;
  private comboQueued = false;
  private strikeHit = false;
  private animT = 0;
  lastSafe: V = [0, 0];
  private safeT = 0;
  push: V = [0, 0];
  private pig!: Sprite;
  private red!: Sprite;
  private shadowS!: Sprite;
  frames!: ChildFrames;
  locked = false;
  onDeath?: () => void;
  /** Read by the HUD and music: recent hits. */
  onLanded?: (n: number, kind: string) => void;
  /** Kept for compatibility with older room code. */
  reeling = false;

  constructor() {
    super();
    this.radius = 0.28;
    this.team = 'player';
    this.hp = PLAYER.maxHp;
    this.knotY = 0.45;
    this.label = 'shu';
  }

  init(w: World): void {
    if (!framesCache) framesCache = buildChildFrames();
    this.frames = framesCache;
    this.pig = new Sprite(this.frames.pig.down.idle[0]);
    this.red = new Sprite(this.frames.red.down.idle[0]);
    const sp = new Painter(1.2, 0.6, SPRITE_PPU, -0.6, -0.3);
    sp.glaze();
    shadow(sp, 0, 0, 0.42, 0.16, 0.35);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.pig.mesh, this.shadowS.mesh);
    w.r.sceneRed.add(this.red.mesh);
    this.lastSafe = [this.x, this.y];
  }

  get busy(): boolean {
    return this.state === 'hurt' || this.state === 'fall' || this.state === 'dead' || this.state === 'frozen';
  }
  get dodging(): boolean {
    return this.state === 'dash';
  }

  private updateAim(): void {
    const w = this.world;
    const inp = w.input;
    if (inp.device === 'pad') {
      const [ax, ay] = inp.padAim;
      if (Math.hypot(ax, ay) > 0.3) {
        const l = Math.hypot(ax, ay);
        this.aim = [ax / l, ay / l];
      } else if (Math.hypot(this.moveDir[0], this.moveDir[1]) > 0.2) {
        const l = Math.hypot(this.moveDir[0], this.moveDir[1]);
        this.aim = [this.moveDir[0] / l, this.moveDir[1] / l];
      }
    } else if (inp.device === 'touch') {
      if (Math.hypot(this.moveDir[0], this.moveDir[1]) > 0.2) {
        const l = Math.hypot(this.moveDir[0], this.moveDir[1]);
        this.aim = [this.moveDir[0] / l, this.moveDir[1] / l];
      }
    } else {
      const [mx, my] = w.mouseWorld();
      const dx = mx - this.x, dy = my - (this.y + 0.45);
      const l = Math.hypot(dx, dy);
      if (l > 0.05) this.aim = [dx / l, dy / l];
    }
  }

  /** On touch screens the brush turns towards the nearest foe. */
  private autoAim(): void {
    let best: Entity | null = null;
    let bd = 3.2;
    for (const e of this.world.entities) {
      if (e.team !== 'enemy' || e.dead) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) {
      const dx = best.x - this.x, dy = best.y - this.y;
      const l = Math.hypot(dx, dy) || 1;
      this.aim = [dx / l, dy / l];
    }
  }

  private faceTowards(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy) * 0.9) {
      this.facing = 'side';
      this.flip = dx < 0 ? -1 : 1;
    } else this.facing = dy > 0 ? 'up' : 'down';
  }

  /** Where a dash requested now would aim. */
  private dashTarget(): V {
    const w = this.world;
    const inp = w.input;
    if (inp.device === 'pad') {
      let [dx, dy] = this.moveDir;
      if (Math.hypot(dx, dy) < 0.2) [dx, dy] = this.aim;
      const l = Math.hypot(dx, dy) || 1;
      return [this.x + (dx / l) * PLAYER.dashMax, this.y + (dy / l) * PLAYER.dashMax];
    }
    const [mx, my] = w.mouseWorld();
    return [mx, my - 0.35];
  }

  update(dt: number): void {
    const w = this.world;
    const inp = w.input;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.sinceDash += dt;
    const [mx, my] = this.locked ? [0, 0] : inp.move();
    this.moveDir = [mx, my];
    this.updateAim();

    if (this.state === 'dead' || this.state === 'frozen') {
      this.vx = 0; this.vy = 0;
      this.sync(dt);
      return;
    }
    if (this.state === 'fall') {
      this.vx *= 0.9; this.vy *= 0.9;
      if (this.stateT > 0.6) this.finishFall();
      this.sync(dt);
      return;
    }

    // ink recharges while not dashing (faster with a combo)
    if (this.state !== 'dash' && this.charges < PLAYER.charges && this.sinceDash > PLAYER.rechargeDelay) {
      this.chargeT += dt * (1 + Math.min(20, w.combo) * 0.05);
      if (this.chargeT >= PLAYER.rechargeTime) {
        this.chargeT = 0;
        this.charges++;
        sfx.charge(this.charges);
      }
    }

    if (!this.locked && !this.busy && inp.pressed('dodge')) {
      const target = this.dashTarget();
      if (this.state === 'dash') this.queued = target;
      else if (this.charges > 0) this.startDash(target);
      else sfx.empty();
    }
    if (!this.locked && (this.state === 'normal' || this.state === 'strike') && inp.pressed('attack')) {
      if (this.state === 'normal') this.startStrike(0);
      else if (this.combo === 0 && this.stateT > 0.04) this.comboQueued = true;
    }

    let tvx = 0, tvy = 0;
    if (this.state === 'normal') {
      tvx = mx * PLAYER.speed;
      tvy = my * PLAYER.speed;
      if (Math.hypot(mx, my) > 0.1) this.faceTowards(mx, my);
    }
    if (this.state === 'strike') this.updateStrike();
    if (this.state === 'dash') {
      this.updateDash(dt);
    } else {
      if (this.state === 'hurt' && this.stateT > 0.18) { this.state = 'normal'; this.stateT = 0; }
      const k = Math.min(1, (PLAYER.accel * dt) / PLAYER.speed);
      this.vx += (tvx - this.vx) * k;
      this.vy += (tvy - this.vy) * k;
      const px = this.push[0] + w.wind[0], py = this.push[1] + w.wind[1];
      this.push[0] *= Math.max(0, 1 - dt * 6);
      this.push[1] *= Math.max(0, 1 - dt * 6);
      w.move(this, (this.vx + px) * dt, (this.vy + py) * dt);
    }

    // the void: fresh ink is a bridge
    if (this.state !== 'dash') {
      const hz = w.hazardAt(this.x, this.y);
      if (hz && !w.strokes.bridgeAt(this.x, this.y)) this.startFall(hz.kind);
      else if (!hz) {
        this.safeT += dt;
        if (this.safeT > 0.2 && !w.nearHazard(this.x, this.y, 0.7)) {
          this.lastSafe = [this.x, this.y];
          this.safeT = 0;
        }
      }
    }
    this.sync(dt);
  }

  private startDash(target: V): void {
    const w = this.world;
    let dx = target[0] - this.x, dy = target[1] - this.y;
    let d = Math.hypot(dx, dy);
    if (d < 0.01) { [dx, dy] = this.aim; d = 1; }
    const dir: V = [dx / d, dy / d];
    const dist = Math.max(PLAYER.dashMin, Math.min(PLAYER.dashMax, d));
    this.charges--;
    this.chargeT = 0;
    this.sinceDash = 0;
    this.state = 'dash';
    this.stateT = 0;
    this.queued = null;
    this.dash = { dir, dist, done: 0, seg: w.strokes.begin(this.x, this.y + 0.05), hit: new Set() };
    this.invuln = Math.max(this.invuln, dist / PLAYER.dashSpeed + PLAYER.dashIframesExtra);
    this.faceTowards(dir[0], dir[1]);
    sfx.trait(dist);
  }

  private updateDash(dt: number): void {
    const w = this.world;
    const ds = this.dash!;
    const step = Math.min(PLAYER.dashSpeed * dt, ds.dist - ds.done);
    const ox = this.x, oy = this.y;
    w.move(this, ds.dir[0] * step, ds.dir[1] * step);
    const moved = Math.hypot(this.x - ox, this.y - oy);
    ds.done += step;
    this.vx = ds.dir[0] * PLAYER.dashSpeed;
    this.vy = ds.dir[1] * PLAYER.dashSpeed;
    w.strokes.extend(ds.seg, this.x, this.y + 0.05);
    // the stroke cuts what it passes through
    for (const e of w.entities) {
      if (e === this || e.dead || e.team !== 'enemy' || ds.hit.has(e)) continue;
      const ey = e.y + Math.min(0.4, e.z * 0.5);
      if (distToSeg(e.x, ey, ox, oy, this.x, this.y) < e.radius + 0.38) {
        ds.hit.add(e);
        if (e.onHit({ dmg: 1, fromX: ox, fromY: oy, kind: 'cut' })) {
          w.hitstop = Math.max(w.hitstop, 0.025);
          w.kick(ds.dir[0] * 0.12, ds.dir[1] * 0.12);
          sfx.cut();
          this.onLanded?.(1, 'cut');
        }
      }
    }
    if (ds.done >= ds.dist - 1e-4 || moved < step * 0.3) this.endDash();
  }

  private endDash(): void {
    const w = this.world;
    const ds = this.dash!;
    this.dash = null;
    this.state = 'normal';
    this.stateT = 0;
    this.vx = ds.dir[0] * PLAYER.speed * 0.6;
    this.vy = ds.dir[1] * PLAYER.speed * 0.6;
    w.strokes.finish(ds.seg);
    if (this.queued && this.charges > 0) {
      const q = this.queued;
      this.queued = null;
      this.startDash(q);
    }
  }

  private startStrike(combo: number): void {
    this.state = 'strike';
    this.stateT = 0;
    this.combo = combo;
    this.comboQueued = false;
    this.strikeHit = false;
    if (this.world.input.device !== 'kbm') this.autoAim();
    const [ax, ay] = this.aim;
    this.faceTowards(ax, ay);
    this.vx = ax * 5;
    this.vy = ay * 5;
  }

  private updateStrike(): void {
    const w = this.world;
    const t = this.stateT;
    const windup = 0.03, active = 0.07;
    this.vx *= 0.82; this.vy *= 0.82;
    if (t >= windup && !this.strikeHit) {
      this.strikeHit = true;
      const [ax, ay] = this.aim;
      const cx = this.x, cy = this.y + 0.4;
      const ang = Math.atan2(ay, ax);
      w.vfx.strikeArc(cx + ax * 0.25, cy + ay * 0.25, ang, this.combo);
      sfx.strike(this.combo);
      let landed = 0;
      for (const e of w.entities) {
        if (e === this || e.dead || e.team === 'player') continue;
        const ex = e.x, ey = e.y + Math.min(0.5, e.knotY) + e.z * 0.3;
        const dx = ex - cx, dy = ey - cy;
        const d = Math.hypot(dx, dy) - e.radius * 0.8;
        if (d > PLAYER.strikeRange) continue;
        if (Math.abs(angleDiff(Math.atan2(dy, dx), ang)) > PLAYER.strikeHalf && d > 0.35) continue;
        if (e.onHit({ dmg: 1, fromX: this.x, fromY: this.y, kind: 'brush' })) landed++;
      }
      if (landed) {
        w.hitstop = Math.max(w.hitstop, 0.04);
        w.kick(ax * 0.15, ay * 0.15);
        w.shake(0.06, 0.1);
        this.onLanded?.(landed, 'brush');
      }
    }
    const end = this.combo === 0 ? windup + active + 0.09 : windup + active + 0.15;
    if (t >= windup + active && this.comboQueued && this.combo === 0) {
      this.startStrike(1);
      return;
    }
    if (t >= end) {
      this.state = 'normal';
      this.stateT = 0;
      this.combo = 0;
    }
  }

  hurt(dmg: number, fromX: number, fromY: number): boolean {
    if (this.invuln > 0 || this.state === 'dead' || this.state === 'fall' || this.state === 'frozen' || this.state === 'dash') return false;
    const w = this.world;
    this.hp -= dmg;
    this.invuln = 1.0;
    const dx = this.x - fromX, dy = this.y - fromY;
    const l = Math.hypot(dx, dy) || 1;
    this.vx = (dx / l) * 8;
    this.vy = (dy / l) * 8;
    this.state = 'hurt';
    this.stateT = 0;
    sfx.hurt();
    w.vfx.splat(this.x, this.y + 0.5, Math.atan2(dy, dx), 10, 1, 'red');
    w.hitstop = Math.max(w.hitstop, 0.1);
    w.shake(0.22, 0.25);
    w.combo = 0;
    if (this.hp <= 0) this.die();
    return true;
  }

  onHit(h: HitInfo): boolean {
    return this.hurt(h.dmg, h.fromX, h.fromY);
  }

  private startFall(kind: 'water' | 'void'): void {
    this.state = 'fall';
    this.stateT = 0;
    if (kind === 'water') {
      sfx.splash();
      this.world.vfx.ripple(this.x, this.y, 1.2);
    } else sfx.fall();
  }

  private finishFall(): void {
    this.hp -= 1;
    this.invuln = 1.2;
    if (this.hp <= 0) { this.die(); return; }
    sfx.hurt();
    this.x = this.lastSafe[0];
    this.y = this.lastSafe[1];
    this.vx = 0; this.vy = 0;
    this.state = 'normal';
    this.stateT = 0;
  }

  private die(): void {
    this.state = 'dead';
    this.stateT = 0;
    this.dash = null;
    this.onDeath?.();
  }

  revive(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = PLAYER.maxHp;
    this.charges = PLAYER.charges;
    this.state = 'normal';
    this.stateT = 0;
    this.invuln = 1.5;
    this.lastSafe = [x, y];
    this.pig.dissolve = 0;
    this.red.dissolve = 0;
  }

  freeze(on: boolean): void {
    this.state = on ? 'frozen' : 'normal';
    this.stateT = 0;
  }

  private sync(dt: number): void {
    this.animT += dt;
    let pose: ChildPose = 'idle';
    let fps = 4;
    const speed = Math.hypot(this.vx, this.vy);
    if (this.state === 'strike') { pose = 'strike'; fps = 0; }
    else if (this.state === 'hurt') pose = 'hurt';
    else if (this.state === 'dash') pose = 'cast';
    else if (speed > 0.6) { pose = 'walk'; fps = 11 * Math.min(1.3, speed / PLAYER.speed + 0.3); }
    const set = this.frames.pig[this.facing][pose];
    let idx: number;
    if (pose === 'strike') idx = this.stateT < 0.04 ? 0 : 1;
    else idx = Math.floor(this.animT * fps);
    idx = Number.isFinite(idx) ? ((idx % set.length) + set.length) % set.length : 0;
    this.pig.setTexture(set[idx].tex);
    this.red.setTexture(this.frames.red[this.facing][pose][idx].tex);
    const sx = this.facing === 'side' ? this.flip : 1;
    const dashing = this.state === 'dash';
    for (const s of [this.pig, this.red]) {
      s.mesh.scale.set(sx * (dashing ? 1.25 : 1), dashing ? 0.8 : 1, 1);
      s.setPos(this.x, this.y + this.z);
      s.mesh.renderOrder = ySort(this.y);
    }
    this.shadowS.setPos(this.x, this.y);
    const flick = this.invuln > 0 && !dashing ? (Math.sin(this.world.time * 40) > 0 ? 0.55 : 0) : 0;
    this.pig.pale = flick;
    if (this.state === 'fall' || this.state === 'dead') {
      const k = Math.min(1, this.stateT / (this.state === 'fall' ? 0.6 : 1.1));
      this.pig.dissolve = k;
      this.red.dissolve = k;
      this.shadowS.opacity = 1 - k;
    } else {
      this.pig.dissolve = 0;
      this.red.dissolve = 0;
      this.shadowS.opacity = dashing ? 0.4 : 1;
    }
  }

  dispose(): void {
    this.pig.dispose();
    this.red.dispose();
    this.shadowS.dispose();
  }
}
