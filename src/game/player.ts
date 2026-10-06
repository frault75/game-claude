/**
 * Shu, the last stroke. Walks where you point, attacks what you tap, and paints with the current ink:
 * vermilion strokes are run along (cutting); other inks are painted at a distance.
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
import { INKS, INK_ORDER, InkId } from './inks';
import { save, stats } from './progression';

type State = 'normal' | 'strike' | 'dash' | 'hurt' | 'fall' | 'dead' | 'frozen';

export const PLAYER = {
  speed: 8.0,
  accel: 110,
  dashSpeed: 50,
  drawSpeed: 30,
  catchUpSpeed: 46,
  dashMin: 1.8,
  dashMax: 5.6,
  inkRegen: 8,
  inkDelay: 0.22,
  strikeRange: 1.7,
  strikeHalf: 1.05,
  waypointGap: 0.35,
  strikeDmg: 10,
  cutDmg: 10,
};

let framesCache: ChildFrames | null = null;

type Seg = ReturnType<World['strokes']['begin']>;

interface Run {
  pts: V[];
  idx: number;
  seg: Seg | null;
  open: boolean;
  speed: number;
  hit: Map<Entity, number>;
  dir: V;
}

/** A stroke painted at a distance (inks that do not run). */
interface Paint {
  ink: InkId;
  seg: Seg;
  last: V;
}

export class Player extends Entity {
  state: State = 'normal';
  stateT = 0;
  facing: Facing = 'down';
  flip = 1;
  aim: V = [0, -1];
  moveDir: V = [0, 0];
  invuln = 0;
  ink = 22;
  /** Pigment for coloured inks: refilled by orbs, shrines and the dyer only. */
  pigment = 6;
  private sinceInk = 10;
  private run: Run | null = null;
  private paint: Paint | null = null;
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
  /** Where the child is walking to, or whom it is attacking. */
  moveTarget: V | null = null;
  attackTarget: Entity | null = null;
  /** Someone or something to talk to / read once close enough. */
  talkTarget: Entity | null = null;
  private attackT = 0;
  onDeath?: () => void;
  onLanded?: (n: number, kind: string) => void;
  onInkChange?: (ink: InkId) => void;
  onNoPigment?: () => void;
  reeling = false;

  constructor() {
    super();
    this.radius = 0.28;
    this.team = 'player';
    this.hp = stats.maxHp(save.level);
    this.ink = stats.inkMax(save.level);
    this.knotY = 0.45;
    this.label = 'shu';
  }

  get maxHp(): number {
    return stats.maxHp(save.level);
  }
  get inkMax(): number {
    return stats.inkMax(save.level);
  }
  get dmgMul(): number {
    return stats.dmg(save.level);
  }
  get inkFrac(): number {
    return this.ink / this.inkMax;
  }
  get pigmentMax(): number {
    return stats.pigmentMax(save.level);
  }
  get pigmentFrac(): number {
    return this.pigment / this.pigmentMax;
  }
  get currentInk(): InkId {
    return save.ink;
  }

  heal(n: number): void {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  selectInk(id: InkId): void {
    if (!save.inks.includes(id) || save.ink === id) return;
    save.ink = id;
    sfx.charge(INK_ORDER.indexOf(id) + 1);
    this.onInkChange?.(id);
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
      const [mx, my] = this.moveDir;
      const l = Math.hypot(mx, my);
      if (l > 0.2) this.aim = [mx / l, my / l];
    } else if (inp.device === 'kbm') {
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

  /** Screen point (CSS px) to the ground point under it. */
  private ground(sx: number, sy: number): V {
    const [x, y] = this.world.r.screenToWorld(sx, sy);
    const b = this.world.bounds;
    return [Math.max(b.x + 0.4, Math.min(b.x + b.w - 0.4, x)), Math.max(b.y + 0.4, Math.min(b.y + b.h - 0.4, y - 0.35))];
  }

  /** A foe under a ground point, if any. */
  private foeAt(x: number, y: number): Entity | null {
    let best: Entity | null = null;
    let bd = Infinity;
    for (const e of this.world.entities) {
      if (e.team !== 'enemy' || e.dead) continue;
      const d = Math.hypot(e.x - x, e.y + 0.3 - y);
      if (d < e.radius + 0.75 && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /** Something to talk to or read under a ground point. */
  private talkableAt(x: number, y: number): Entity | null {
    let best: Entity | null = null;
    let bd = Infinity;
    for (const e of this.world.entities) {
      if (!e.interactive || e.dead) continue;
      const d = Math.hypot(e.x - x, e.y + 0.5 - y);
      if (d < e.radius + 0.9 && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /** The nearest thing to talk to within reach (keyboard / pad). */
  nearestTalkable(range = 2.2): Entity | null {
    let best: Entity | null = null;
    let bd = range;
    for (const e of this.world.entities) {
      if (!e.interactive || e.dead) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y) - e.radius;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
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

    if (this.sinceInk > PLAYER.inkDelay && this.ink < this.inkMax) {
      this.ink = Math.min(this.inkMax, this.ink + dt * PLAYER.inkRegen * (1 + Math.min(20, w.combo) * 0.04));
    }

    if (!this.locked) {
      // ink choice
      if (inp.inkSelect !== null) this.selectInk(INK_ORDER[inp.inkSelect]);
      if (inp.inkCycle) {
        const owned = INK_ORDER.filter((i) => save.inks.includes(i));
        const k = owned.indexOf(save.ink);
        this.selectInk(owned[(k + inp.inkCycle + owned.length) % owned.length]);
      }
      if (!this.busy) {
        this.readOrders();
        this.readBrush();
        if (inp.pressed('interact')) {
          const e = this.nearestTalkable();
          if (e) { this.talkTarget = null; e.interact(); }
        }
      }
    }
    if (!this.locked && (this.state === 'normal' || this.state === 'strike') && inp.pressed('attack')) {
      if (this.state === 'normal') this.startStrike(0);
      else if (this.combo === 0 && this.stateT > 0.04) this.comboQueued = true;
    }

    let tvx = 0, tvy = 0;
    if (this.state === 'normal') {
      [tvx, tvy] = this.steer(dt);
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

  /** Taps, clicks and holds: where to go, whom to attack. */
  private readOrders(): void {
    const inp = this.world.input;
    for (const [sx, sy] of inp.orderTaps) {
      const g = this.ground(sx, sy);
      const foe = this.foeAt(g[0], g[1] + 0.35);
      const talk = foe ? null : this.talkableAt(g[0], g[1] + 0.35);
      this.talkTarget = talk;
      if (foe) {
        this.attackTarget = foe;
        this.attackT = 0;
        this.moveTarget = null;
      } else if (talk) {
        this.attackTarget = null;
        this.moveTarget = null;
      } else {
        this.attackTarget = null;
        this.moveTarget = g;
        this.world.vfx.ripple(g[0], g[1], 0.35);
      }
    }
    if (inp.holdPoint && !this.attackTarget) {
      const hp = this.ground(inp.holdPoint[0], inp.holdPoint[1]);
      // a finger resting on someone still means "talk to them"
      const tk = this.talkTarget;
      if (!tk || Math.hypot(hp[0] - tk.x, hp[1] + 0.35 - (tk.y + 0.5)) > tk.radius + 1.2) {
        this.moveTarget = hp;
        this.talkTarget = null;
      }
    }
  }

  /** Desired velocity from keys, the move order or the attack order. */
  private steer(dt: number): V {
    const [mx, my] = this.moveDir;
    if (Math.hypot(mx, my) > 0.1) {
      this.moveTarget = null;
      this.attackTarget = null;
      this.talkTarget = null;
      this.faceTowards(mx, my);
      return [mx * PLAYER.speed, my * PLAYER.speed];
    }
    const tk = this.talkTarget;
    if (tk) {
      if (tk.dead || !tk.interactive) { this.talkTarget = null; return [0, 0]; }
      const dx = tk.x - this.x, dy = tk.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.faceTowards(dx, dy);
      if (d > tk.radius + 1.3) return [(dx / d) * PLAYER.speed, (dy / d) * PLAYER.speed];
      this.talkTarget = null;
      tk.interact();
      return [0, 0];
    }
    const t = this.attackTarget;
    if (t) {
      if (t.dead || (t as unknown as { dying?: number }).dying! > 0) { this.attackTarget = null; return [0, 0]; }
      const dx = t.x - this.x, dy = t.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.attackT += dt;
      if (d > PLAYER.strikeRange + t.radius * 0.6 - 0.25) {
        this.faceTowards(dx, dy);
        return [(dx / d) * PLAYER.speed, (dy / d) * PLAYER.speed];
      }
      this.aim = [dx / d, dy / d];
      this.startStrike(0);
      this.comboQueued = true;
      return [0, 0];
    }
    const m = this.moveTarget;
    if (m) {
      const dx = m[0] - this.x, dy = m[1] - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.25) { this.moveTarget = null; return [0, 0]; }
      this.faceTowards(dx, dy);
      const sp = PLAYER.speed * Math.min(1, d / 0.6);
      return [(dx / d) * sp, (dy / d) * sp];
    }
    return [0, 0];
  }

  /** Drawing gestures, right clicks and the stroke key. */
  private readBrush(): void {
    const w = this.world;
    const inp = w.input;
    const ink = INKS[save.ink];
    if (inp.drawStart) {
      const p0 = this.ground(inp.drawStart[0], inp.drawStart[1]);
      this.attackTarget = null;
      this.moveTarget = null;
      if (ink.runs) this.startRun([p0], true, PLAYER.drawSpeed);
      else this.startPaint(p0);
    }
    if (inp.drawPoints.length) {
      for (const [sx, sy] of inp.drawPoints) {
        const g = this.ground(sx, sy);
        if (this.run?.open) this.addPoint(g);
        else if (this.paint) this.extendPaint(g);
      }
    }
    if (inp.drawEnd) {
      if (this.run) this.run.open = false;
      if (this.paint) this.endPaint();
    }
    const straight: V[] = [];
    for (const [sx, sy] of inp.strokeTaps) straight.push(this.ground(sx, sy));
    if (inp.pressed('dodge')) {
      if (inp.device === 'pad') {
        let [dx, dy] = this.moveDir;
        if (Math.hypot(dx, dy) < 0.2) [dx, dy] = this.aim;
        const l = Math.hypot(dx, dy) || 1;
        straight.push([this.x + (dx / l) * PLAYER.dashMax, this.y + (dy / l) * PLAYER.dashMax]);
      } else {
        const [mx, my] = w.mouseWorld();
        straight.push([mx, my - 0.35]);
      }
    }
    for (const target of straight) this.straightStroke(target);
  }

  /** A straight stroke from Shu towards a point: a dash for vermilion, a painted line otherwise. */
  private straightStroke(target: V): void {
    let [tx, ty] = target;
    const ink = INKS[save.ink];
    let dx = tx - this.x, dy = ty - this.y;
    let d = Math.hypot(dx, dy);
    if (d < 0.01) { [dx, dy] = this.aim; d = 1; }
    const dist = Math.max(PLAYER.dashMin, Math.min(PLAYER.dashMax, d));
    tx = this.x + (dx / d) * dist;
    ty = this.y + (dy / d) * dist;
    if (ink.runs ? this.ink < 1 : this.pigment < 0.6) { sfx.empty(); if (!ink.runs) this.onNoPigment?.(); return; }
    this.attackTarget = null;
    this.moveTarget = null;
    if (ink.runs) {
      // through a foe if one was aimed at
      const foe = this.foeAt(target[0], target[1] + 0.35);
      if (foe) {
        const fx = foe.x - this.x, fy = foe.y - this.y;
        const l = Math.hypot(fx, fy) || 1;
        tx = foe.x + (fx / l) * 1.3;
        ty = foe.y + (fy / l) * 1.3;
      }
      this.startRun([[tx, ty]], false, PLAYER.dashSpeed);
    } else {
      this.startPaint([this.x + (dx / d) * 0.6, this.y + (dy / d) * 0.6]);
      if (!this.paint) return;
      const steps = Math.ceil(dist / 0.5);
      for (let i = 1; i <= steps && this.paint; i++) this.extendPaint([this.x + (dx / d) * Math.min(dist, 0.6 + i * 0.5), this.y + (dy / d) * Math.min(dist, 0.6 + i * 0.5)]);
      this.endPaint();
    }
  }

  // ---------- painting at a distance (indigo, gold, jade) ----------

  private startPaint(p0: V): void {
    const w = this.world;
    if (this.pigment < 0.6) { sfx.empty(); this.onNoPigment?.(); return; }
    if (this.paint) this.endPaint();
    this.paint = { ink: save.ink, seg: w.strokes.begin(p0[0], p0[1], save.ink), last: p0 };
    this.sinceInk = 0;
    const [dx, dy] = [p0[0] - this.x, p0[1] - this.y];
    this.faceTowards(dx, dy);
    sfx.trait(2);
  }

  private extendPaint(p: V): void {
    const w = this.world;
    const pt = this.paint;
    // the stroke may have ended (out of ink) or never started
    if (!pt) return;
    const seg = pt.seg;
    const d = Math.hypot(p[0] - pt.last[0], p[1] - pt.last[1]);
    if (d < 0.05) return;
    const cost = d * INKS[pt.ink].cost;
    if (this.pigment < cost) { this.endPaint(); sfx.empty(); return; }
    this.pigment -= cost;
    this.sinceInk = 0;
    pt.last = p;
    w.strokes.extend(seg, p[0], p[1]);
    if (Math.hypot(seg.bx - seg.ax, seg.by - seg.ay) >= 0.5) {
      w.strokes.finish(seg);
      pt.seg = w.strokes.begin(p[0], p[1], pt.ink);
    }
  }

  private endPaint(): void {
    const pt = this.paint;
    if (!pt) return;
    this.paint = null;
    this.world.strokes.finish(pt.seg);
  }

  // ---------- running along a stroke (vermilion) ----------

  private startRun(pts: V[], open: boolean, speed: number): void {
    const w = this.world;
    if (this.ink < 0.6) { sfx.empty(); return; }
    if (this.run) this.endRun();
    this.state = 'dash';
    this.stateT = 0;
    this.sinceInk = 0;
    this.run = { pts, idx: 0, seg: w.strokes.begin(this.x, this.y + 0.05, 'vermilion'), open, speed, hit: new Map(), dir: [0, 0] };
    const dx = pts[0][0] - this.x, dy = pts[0][1] - this.y;
    sfx.trait(Math.min(6, Math.hypot(dx, dy)));
  }

  private addPoint(p: V): void {
    const r = this.run;
    if (!r) return;
    // the run may have been cut short by a wall: start again from where Shu stands
    const last: V = r.pts.length ? r.pts[r.pts.length - 1] : [this.x, this.y];
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
      if (moved < step * 0.3) { r.pts.length = r.idx; break; }
      if (Math.hypot(tx - this.x, ty - this.y) < 0.02) this.passWaypoint();
      if (this.ink <= 0.01) { r.pts.length = r.idx; r.open = false; break; }
    }
    if (r.seg) w.strokes.extend(r.seg, this.x, this.y + 0.05);
    const moving = movedTotal > 1e-3;
    this.vx = moving ? (this.x - ox) / dt : 0;
    this.vy = moving ? (this.y - oy) / dt : 0;
    if (moving) {
      this.sinceInk = 0;
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
    if (r.seg) {
      w.strokes.extend(r.seg, this.x, this.y + 0.05);
      w.strokes.finish(r.seg);
    }
    r.seg = r.idx < r.pts.length || r.open ? w.strokes.begin(this.x, this.y + 0.05, 'vermilion') : null;
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
        if (e.onHit({ dmg: Math.round(PLAYER.cutDmg * this.dmgMul), fromX: ox, fromY: oy, kind: 'cut' })) {
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

  // ---------- brush strike ----------

  private startStrike(combo: number): void {
    this.state = 'strike';
    this.stateT = 0;
    this.combo = combo;
    this.comboQueued = false;
    this.strikeHit = false;
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
        const dmg = Math.round(PLAYER.strikeDmg * this.dmgMul * (this.combo === 1 ? 1.4 : 1));
        if (e.onHit({ dmg, fromX: this.x, fromY: this.y, kind: 'brush' })) landed++;
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
      if (this.attackTarget && !this.attackTarget.dead) {
        const dx = this.attackTarget.x - this.x, dy = this.attackTarget.y - this.y;
        const l = Math.hypot(dx, dy) || 1;
        this.aim = [dx / l, dy / l];
      }
      this.startStrike(1);
      return;
    }
    if (t >= end) {
      this.state = 'normal';
      this.stateT = 0;
      this.combo = 0;
    }
  }

  // ---------- damage, death ----------

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
    w.numbers?.pop(this.x, this.y + 1.4, '-' + dmg, { red: true, size: 0.5 });
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
    this.paint = null;
    this.attackTarget = null;
    this.moveTarget = null;
    this.talkTarget = null;
    this.onDeath?.();
  }

  revive(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = this.maxHp;
    this.ink = this.inkMax;
    this.pigment = Math.max(this.pigment, this.pigmentMax * 0.5);
    this.state = 'normal';
    this.stateT = 0;
    this.invuln = 1.5;
    this.lastSafe = [x, y];
    this.attackTarget = null;
    this.moveTarget = null;
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
    else if (dashing || this.paint) pose = 'cast';
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
