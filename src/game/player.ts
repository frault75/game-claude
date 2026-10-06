/** The child: walks, strikes with the brush, dodges, casts the thread. */
import { Entity, HitInfo } from './entity';
import type { World } from './world';
import { Sprite, LAYER, ySort } from '../gfx/sprite';
import { Painter } from '../gfx/paint';
import { buildChildFrames, ChildFrames, Facing, ChildPose } from '../gfx/gen/child';
import { shadow } from '../gfx/gen/ground';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { sfx } from '../audio/sfx';
import { angleDiff, V } from './physics';

type State = 'normal' | 'strike' | 'dodge' | 'hurt' | 'fall' | 'dead' | 'frozen';

export const PLAYER = {
  speed: 4.6,
  accel: 32,
  maxHp: 5,
  dodgeTime: 0.18,
  dodgeSpeed: 14,
  dodgeIframes: 0.24,
  dodgeCooldown: 0.45,
  strikeRange: 1.45,
  strikeHalf: 1.0,
};

let framesCache: ChildFrames | null = null;

export class Player extends Entity {
  state: State = 'normal';
  stateT = 0;
  facing: Facing = 'down';
  flip = 1;
  aim: V = [0, -1];
  moveDir: V = [0, 0];
  invuln = 0;
  dodgeCd = 0;
  private dodgeDir: V = [1, 0];
  private combo = 0;
  private comboQueued = false;
  private strikeHit = false;
  private animT = 0;
  lastSafe: V = [0, 0];
  private safeT = 0;
  /** Reeling: the thread pulls the child; input is ignored and hazards are crossed. */
  reeling = false;
  /** External push (wind, waves). */
  push: V = [0, 0];
  private pig!: Sprite;
  private red!: Sprite;
  private shadowS!: Sprite;
  frames!: ChildFrames;
  /** Disable all input (cutscenes). */
  locked = false;
  onDeath?: () => void;

  constructor() {
    super();
    this.radius = 0.28;
    this.weight = 1;
    this.team = 'player';
    this.hp = PLAYER.maxHp;
    this.knotY = 0.45;
    this.label = 'child';
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

  /** Re-add sprites after a room change cleared scenes. */
  reattach(): void {
    const r = this.world.r;
    r.scenePig.add(this.pig.mesh, this.shadowS.mesh);
    r.sceneRed.add(this.red.mesh);
  }

  wrist(): V {
    return [this.x + 0.16 * (this.facing === 'side' ? this.flip : 1), this.y + 0.42 + this.z];
  }

  knot(): [number, number] {
    return this.wrist();
  }

  get busy(): boolean {
    return this.state === 'dodge' || this.state === 'hurt' || this.state === 'fall' || this.state === 'dead' || this.state === 'frozen';
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
    } else {
      const [mx, my] = w.mouseWorld();
      const dx = mx - this.x, dy = my - (this.y + 0.45);
      const l = Math.hypot(dx, dy);
      if (l > 0.05) this.aim = [dx / l, dy / l];
    }
  }

  private faceTowards(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy) * 0.9) {
      this.facing = 'side';
      this.flip = dx < 0 ? -1 : 1;
    } else this.facing = dy > 0 ? 'up' : 'down';
  }

  update(dt: number): void {
    const w = this.world;
    const inp = w.input;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
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
      if (this.stateT > 0.7) this.finishFall();
      this.sync(dt);
      return;
    }

    if (!this.locked && !this.busy && inp.pressed('dodge') && this.dodgeCd <= 0) this.startDodge();
    if (!this.locked && (this.state === 'normal' || this.state === 'strike') && inp.pressed('attack')) {
      if (this.state === 'normal') this.startStrike(0);
      else if (this.combo === 0 && this.stateT > 0.05) this.comboQueued = true;
    }

    let tvx = 0, tvy = 0;
    if (this.state === 'normal' && !this.reeling) {
      tvx = mx * PLAYER.speed;
      tvy = my * PLAYER.speed;
      if (Math.hypot(mx, my) > 0.1) this.faceTowards(mx, my);
    }
    if (this.state === 'strike') this.updateStrike(dt);
    if (this.state === 'dodge') {
      tvx = this.dodgeDir[0] * PLAYER.dodgeSpeed;
      tvy = this.dodgeDir[1] * PLAYER.dodgeSpeed;
      this.vx = tvx; this.vy = tvy;
      if (this.stateT > PLAYER.dodgeTime) {
        this.state = 'normal';
        this.stateT = 0;
        this.vx *= 0.3; this.vy *= 0.3;
      }
    }
    if (this.state === 'hurt' && this.stateT > 0.28) { this.state = 'normal'; this.stateT = 0; }

    if (!this.reeling && this.state !== 'dodge') {
      const k = Math.min(1, PLAYER.accel * dt / PLAYER.speed);
      this.vx += (tvx - this.vx) * k;
      this.vy += (tvy - this.vy) * k;
    }
    // wind and other pushes
    const px = this.push[0] + w.wind[0], py = this.push[1] + w.wind[1];
    this.push[0] *= Math.max(0, 1 - dt * 6);
    this.push[1] *= Math.max(0, 1 - dt * 6);

    w.move(this, (this.vx + (this.reeling ? 0 : px)) * dt, (this.vy + (this.reeling ? 0 : py)) * dt);

    // hazards
    const airborne = this.reeling || this.airborne;
    if (!airborne) {
      const hz = w.hazardAt(this.x, this.y);
      if (hz) this.startFall(hz.kind);
      else {
        this.safeT += dt;
        if (this.safeT > 0.2 && !w.nearHazard(this.x, this.y, 0.7)) {
          this.lastSafe = [this.x, this.y];
          this.safeT = 0;
        }
      }
    }
    this.sync(dt);
  }

  private startStrike(combo: number): void {
    this.state = 'strike';
    this.stateT = 0;
    this.combo = combo;
    this.comboQueued = false;
    this.strikeHit = false;
    const [ax, ay] = this.aim;
    this.faceTowards(ax, ay);
    this.vx = ax * 3.2;
    this.vy = ay * 3.2;
  }

  private updateStrike(dt: number): void {
    void dt;
    const w = this.world;
    const t = this.stateT;
    const windup = 0.05, active = 0.1;
    this.vx *= 0.85; this.vy *= 0.85;
    if (t >= windup && !this.strikeHit) {
      this.strikeHit = true;
      const [ax, ay] = this.aim;
      const cx = this.x, cy = this.y + 0.4;
      const ang = Math.atan2(ay, ax);
      w.vfx.strikeArc(cx + ax * 0.25, cy + ay * 0.25, ang, this.combo);
      sfx.strike(this.combo);
      let landed = false;
      for (const e of w.entities) {
        if (e === this || e.dead || e.team === 'player') continue;
        const ex = e.x, ey = e.y + Math.min(0.5, e.knotY) + e.z * 0.3;
        const dx = ex - cx, dy = ey - cy;
        const d = Math.hypot(dx, dy) - e.radius * 0.8;
        if (d > PLAYER.strikeRange) continue;
        if (Math.abs(angleDiff(Math.atan2(dy, dx), ang)) > PLAYER.strikeHalf && d > 0.35) continue;
        if (e.onHit({ dmg: 1, fromX: this.x, fromY: this.y, kind: 'brush' })) landed = true;
      }
      if (landed) {
        w.hitstop = Math.max(w.hitstop, 0.07);
        w.shake(0.08, 0.12);
      }
    }
    const end = this.combo === 0 ? windup + active + 0.16 : windup + active + 0.26;
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

  private startDodge(): void {
    let [dx, dy] = this.moveDir;
    if (Math.hypot(dx, dy) < 0.2) [dx, dy] = this.aim;
    const l = Math.hypot(dx, dy) || 1;
    this.dodgeDir = [dx / l, dy / l];
    this.state = 'dodge';
    this.stateT = 0;
    this.dodgeCd = PLAYER.dodgeCooldown + PLAYER.dodgeTime;
    this.invuln = Math.max(this.invuln, PLAYER.dodgeIframes);
    this.faceTowards(dx, dy);
    this.world.vfx.streak(this.x, this.y, Math.atan2(dy, dx));
    sfx.dodge();
  }

  get dodging(): boolean {
    return this.state === 'dodge';
  }

  /** Damage from an attack. Returns true if it landed. */
  hurt(dmg: number, fromX: number, fromY: number): boolean {
    if (this.invuln > 0 || this.state === 'dead' || this.state === 'fall' || this.state === 'frozen') return false;
    const w = this.world;
    this.hp -= dmg;
    this.invuln = 1.0;
    const dx = this.x - fromX, dy = this.y - fromY;
    const l = Math.hypot(dx, dy) || 1;
    this.vx = (dx / l) * 7;
    this.vy = (dy / l) * 7;
    this.state = 'hurt';
    this.stateT = 0;
    sfx.hurt();
    w.vfx.splat(this.x, this.y + 0.5, Math.atan2(dy, dx), 10, 1);
    w.hitstop = Math.max(w.hitstop, 0.09);
    w.shake(0.18, 0.25);
    if (this.hp <= 0) this.die();
    return true;
  }

  onHit(h: HitInfo): boolean {
    return this.hurt(h.dmg, h.fromX, h.fromY);
  }

  private startFall(kind: 'water' | 'void'): void {
    this.state = 'fall';
    this.stateT = 0;
    this.world.thread.release(false);
    if (kind === 'water') {
      sfx.splash();
      this.world.vfx.ripple(this.x, this.y, 1.2);
    } else sfx.fall();
  }

  private finishFall(): void {
    this.hp -= 1;
    this.invuln = 1.2;
    if (this.hp <= 0) {
      this.die();
      return;
    }
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
    this.world.thread.release(false);
    this.onDeath?.();
  }

  /** Back to life at a position (after death or checkpoint). */
  revive(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = PLAYER.maxHp;
    this.state = 'normal';
    this.stateT = 0;
    this.invuln = 1.5;
    this.lastSafe = [x, y];
    this.reeling = false;
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
    else if (this.reeling) pose = 'cast';
    else if (this.world.thread.castingRecently()) pose = 'cast';
    else if (speed > 0.6 && this.state !== 'dodge') { pose = 'walk'; fps = 9 * Math.min(1.3, speed / PLAYER.speed + 0.3); }
    const set = this.frames.pig[this.facing][pose];
    let idx: number;
    if (pose === 'strike') idx = this.stateT < 0.05 ? 0 : 1;
    else idx = Math.floor(this.animT * fps) % set.length;
    idx = Math.min(idx, set.length - 1);
    this.pig.setTexture(set[idx].tex);
    this.red.setTexture(this.frames.red[this.facing][pose][idx].tex);
    const sx = this.facing === 'side' ? this.flip : 1;
    let sy = 1;
    if (this.state === 'dodge') sy = 0.85;
    for (const s of [this.pig, this.red]) {
      s.mesh.scale.set(sx * (this.state === 'dodge' ? 1.12 : 1), sy, 1);
      s.setPos(this.x, this.y + this.z);
      s.mesh.renderOrder = ySort(this.y);
    }
    this.shadowS.setPos(this.x, this.y);
    // invulnerability flicker: the figure pales
    const flick = this.invuln > 0 && this.state !== 'dodge' ? (Math.sin(this.world.time * 40) > 0 ? 0.55 : 0) : 0;
    this.pig.pale = flick;
    if (this.state === 'fall') {
      const k = Math.min(1, this.stateT / 0.7);
      this.pig.dissolve = k;
      this.red.dissolve = k;
      this.shadowS.opacity = 1 - k;
    } else if (this.state === 'dead') {
      const k = Math.min(1, this.stateT / 1.2);
      this.pig.dissolve = k;
      this.red.dissolve = k;
      this.shadowS.opacity = 1 - k;
    } else {
      this.pig.dissolve = 0;
      this.red.dissolve = 0;
      this.shadowS.opacity = this.reeling ? 0.5 : 1;
    }
  }

  dispose(): void {
    this.pig.dispose();
    this.red.dispose();
    this.shadowS.dispose();
  }
}
