/**
 * Shu, the last stroke. Runs, slashes, and above all paints: every Trait is a run along a path
 * (a straight dash, or a path drawn with the finger / right mouse button), leaving vermilion ink.
 */
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
  drawSpeed: 30,
  catchUpSpeed: 46,
  dashMin: 1.8,
  dashMax: 5.6,
  inkMax: 22,
  inkRegen: 11,
  inkDelay: 0.22,
  strikeRange: 1.7,
  strikeHalf: 1.05,
  waypointGap: 0.35,
};

let framesCache: ChildFrames | null = null;

type Seg = ReturnType<World['strokes']['begin']>;

interface Run {
  pts: V[];
  idx: number;
  seg: Seg | null;
  /** More points may still arrive (the finger is still drawing). */
  open: boolean;
  speed: number;
  hit: Map<Entity, number>;
  dir: V;
}

export class Player extends Entity {
  state: State = 'normal';
  stateT = 0;
  facing: Facing = 'down';
  flip = 1;
  aim: V = [0, -1];
  moveDir: V = [0, 0];
  invuln = 0;
  ink = PLAYER.inkMax;
  private sinceInk = 10;
  private run: Run | null = null;
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
  /** Ink fraction for the HUD. */
  get inkFrac(): number {
    return this.ink / PLAYER.inkMax;
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
    } else if (inp.device === 'kbm') {
      const [mx, my] = w.mouseWorld();
      const dx = mx - this.x, dy = my - (this.y + 0.45);
      const l = Math.hypot(dx, dy);
      if (l > 0.05) this.aim = [dx / l, dy / l];
    }
  }

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

  /** Screen point (CSS px) to the ground point under it. */
  private ground(sx: number, sy: number): V {
    const [x, y] = this.world.r.screenToWorld(sx, sy);
    const b = this.world.bounds;
    // the drawn path is where Shu's feet go: aim slightly below the finger
    return [Math.max(b.x + 0.4, Math.min(b.x + b.w - 0.4, x)), Math.max(b.y + 0.4, Math.min(b.y + b.h - 0.4, y - 0.35))];
  }

  update(dt: number): void {
    const w = this.world;
    const inp = w.input;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.sinceInk += dt;
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

    // ink flows back while not painting (faster with a combo)
    if (this.sinceInk > PLAYER.inkDelay && this.ink < PLAYER.inkMax) {
      this.ink = Math.min(PLAYER.inkMax, this.ink + dt * PLAYER.inkRegen * (1 + Math.min(20, w.combo) * 0.04));
    }

    if (!this.locked && !this.busy) this.readBrush();
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
      this.updateRun(dt);
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

  /** Gestures and buttons that start or feed a brush run. */
  private readBrush(): void {
    const w = this.world;
    const inp = w.input;
    // drawing with the finger / right button
    if (inp.drawStart) {
      const p0 = this.ground(inp.drawStart[0], inp.drawStart[1]);
      this.startRun([p0], true, PLAYER.drawSpeed);
    }
    if (inp.drawPoints.length && this.run?.open) {
      for (const [sx, sy] of inp.drawPoints) this.addPoint(this.ground(sx, sy));
    }
    if (inp.drawEnd && this.run) this.run.open = false;
    // taps: a straight Trait to that point (through a foe if one is there)
    for (const [sx, sy] of inp.taps) this.dashTo(this.ground(sx, sy), true);
    // keyboard / pad / space: Trait towards the cursor or the stick
    if (inp.pressed('dodge')) {
      if (inp.device === 'pad') {
        let [dx, dy] = this.moveDir;
        if (Math.hypot(dx, dy) < 0.2) [dx, dy] = this.aim;
        const l = Math.hypot(dx, dy) || 1;
        this.dashTo([this.x + (dx / l) * PLAYER.dashMax, this.y + (dy / l) * PLAYER.dashMax], false);
      } else {
        const [mx, my] = w.mouseWorld();
        this.dashTo([mx, my - 0.35], false);
      }
    }
  }

  private dashTo(target: V, throughFoe: boolean): void {
    let [tx, ty] = target;
    if (throughFoe) {
      for (const e of this.world.entities) {
        if (e.team !== 'enemy' || e.dead) continue;
        if (Math.hypot(e.x - tx, e.y + 0.3 - ty) < e.radius + 0.7) {
          const dx = e.x - this.x, dy = e.y - this.y;
          const l = Math.hypot(dx, dy) || 1;
          tx = e.x + (dx / l) * 1.3;
          ty = e.y + (dy / l) * 1.3;
          break;
        }
      }
    }
    let dx = tx - this.x, dy = ty - this.y;
    let d = Math.hypot(dx, dy);
    if (d < 0.01) { [dx, dy] = this.aim; d = 1; }
    const dist = Math.max(PLAYER.dashMin, Math.min(PLAYER.dashMax, d));
    if (this.ink < 1) { sfx.empty(); return; }
    this.startRun([[this.x + (dx / d) * dist, this.y + (dy / d) * dist]], false, PLAYER.dashSpeed);
  }

  private startRun(pts: V[], open: boolean, speed: number): void {
    const w = this.world;
    if (this.ink < 0.6) { sfx.empty(); return; }
    if (this.run) this.endRun();
    this.state = 'dash';
    this.stateT = 0;
    this.sinceInk = 0;
    this.run = { pts, idx: 0, seg: w.strokes.begin(this.x, this.y + 0.05), open, speed, hit: new Map(), dir: [0, 0] };
    const dx = pts[0][0] - this.x, dy = pts[0][1] - this.y;
    sfx.trait(Math.min(6, Math.hypot(dx, dy)));
  }

  private addPoint(p: V): void {
    const r = this.run!;
    const last = r.pts[r.pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < PLAYER.waypointGap) return;
    r.pts.push(p);
  }

  private remaining(): number {
    const r = this.run!;
    let L = 0, px = this.x, py = this.y;
    for (let i = r.idx; i < r.pts.length; i++) {
      L += Math.hypot(r.pts[i][0] - px, r.pts[i][1] - py);
      px = r.pts[i][0];
      py = r.pts[i][1];
    }
    return L;
  }

  private updateRun(dt: number): void {
    const w = this.world;
    const r = this.run!;
    const speed = r.speed === PLAYER.dashSpeed ? r.speed : this.remaining() > 4 ? PLAYER.catchUpSpeed : r.speed;
    let budget = speed * dt;
    let movedTotal = 0;
    const ox = this.x, oy = this.y;
    while (budget > 1e-4 && r.idx < r.pts.length) {
      const [tx, ty] = r.pts[r.idx];
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-3) { this.passWaypoint(); continue; }
      const step = Math.min(budget, d, this.ink);
      const bx = this.x, by = this.y;
      w.move(this, (dx / d) * step, (dy / d) * step);
      const moved = Math.hypot(this.x - bx, this.y - by);
      movedTotal += moved;
      this.ink -= moved;
      budget -= step;
      r.dir = [dx / d, dy / d];
      if (moved < step * 0.3) { r.pts.length = r.idx; break; } // blocked by a wall
      if (Math.hypot(tx - this.x, ty - this.y) < 0.02) this.passWaypoint();
      if (this.ink <= 0.01) { r.pts.length = r.idx; r.open = false; break; }
    }
    if (r.seg) w.strokes.extend(r.seg, this.x, this.y + 0.05);
    const moving = movedTotal > 1e-3;
    this.vx = moving ? (this.x - ox) / dt : 0;
    this.vy = moving ? (this.y - oy) / dt : 0;
    if (moving) {
      this.sinceInk = 0;
      // nothing touches a stroke in motion
      this.invuln = Math.max(this.invuln, 0.08);
      this.faceTowards(r.dir[0], r.dir[1]);
      this.cut(ox, oy);
    }
    if (r.idx >= r.pts.length && !r.open) this.endRun();
  }

  private passWaypoint(): void {
    const w = this.world;
    const r = this.run!;
    r.idx++;
    // each waypoint closes a piece of stroke: a loop may have closed
    if (r.seg) {
      w.strokes.extend(r.seg, this.x, this.y + 0.05);
      w.strokes.finish(r.seg);
    }
    r.seg = r.idx < r.pts.length || r.open ? w.strokes.begin(this.x, this.y + 0.05) : null;
  }

  private cut(ox: number, oy: number): void {
    const w = this.world;
    const r = this.run!;
    for (const e of w.entities) {
      if (e === this || e.dead || e.team !== 'enemy') continue;
      const last = r.hit.get(e);
      if (last !== undefined && w.time - last < 0.4) continue;
      const ey = e.y + Math.min(0.4, e.z * 0.5);
      if (distToSeg(e.x, ey, ox, oy, this.x, this.y) < e.radius + 0.4) {
        r.hit.set(e, w.time);
        if (e.onHit({ dmg: 1, fromX: ox, fromY: oy, kind: 'cut' })) {
          w.hitstop = Math.max(w.hitstop, 0.025);
          w.kick(r.dir[0] * 0.12, r.dir[1] * 0.12);
          sfx.cut();
          this.onLanded?.(1, 'cut');
        }
      }
    }
  }

  private endRun(): void {
    const w = this.world;
    const r = this.run;
    if (!r) return;
    this.run = null;
    if (r.seg) {
      w.strokes.extend(r.seg, this.x, this.y + 0.05);
      w.strokes.finish(r.seg);
    }
    this.state = 'normal';
    this.stateT = 0;
    this.vx = r.dir[0] * PLAYER.speed * 0.5;
    this.vy = r.dir[1] * PLAYER.speed * 0.5;
    this.invuln = Math.max(this.invuln, 0.06);
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
    if (this.invuln > 0 || this.state === 'dead' || this.state === 'fall' || this.state === 'frozen') return false;
    const w = this.world;
    if (this.run) this.endRun();
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
    this.run = null;
    this.onDeath?.();
  }

  revive(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = PLAYER.maxHp;
    this.ink = PLAYER.inkMax;
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
    const dashing = this.state === 'dash' && speed > 1;
    if (this.state === 'strike') { pose = 'strike'; fps = 0; }
    else if (this.state === 'hurt') pose = 'hurt';
    else if (dashing) pose = 'cast';
    else if (speed > 0.6) { pose = 'walk'; fps = 11 * Math.min(1.3, speed / PLAYER.speed + 0.3); }
    const set = this.frames.pig[this.facing][pose];
    let idx: number;
    if (pose === 'strike') idx = this.stateT < 0.04 ? 0 : 1;
    else idx = Math.floor(this.animT * fps);
    idx = Number.isFinite(idx) ? ((idx % set.length) + set.length) % set.length : 0;
    this.pig.setTexture(set[idx].tex);
    this.red.setTexture(this.frames.red[this.facing][pose][idx].tex);
    const sx = this.facing === 'side' ? this.flip : 1;
    for (const s of [this.pig, this.red]) {
      s.mesh.scale.set(sx * (dashing ? 1.25 : 1), dashing ? 0.8 : 1, 1);
      s.setPos(this.x, this.y + this.z);
      s.mesh.renderOrder = ySort(this.y);
    }
    this.shadowS.setPos(this.x, this.y);
    const flick = this.invuln > 0.1 && !dashing && this.state !== 'dash' ? (Math.sin(this.world.time * 40) > 0 ? 0.55 : 0) : 0;
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
