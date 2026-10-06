/** The running room: entities, static collision, hazards, camera, effects. */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { Entity } from './entity';
import { Collider, pushOut, pointInPoly, distToPoly, V } from './physics';
import { Telegraphs } from './telegraph';
import { Vfx } from './vfx';
import type { Player } from './player';
import { Strokes } from './stroke';
import type { Numbers } from './numbers';
import { Sprite } from '../gfx/sprite';

export interface Hazard {
  kind: 'water' | 'void';
  poly: V[];
}

export interface Bounds { x: number; y: number; w: number; h: number }

const CELL = 4;
const ck = (ix: number, iy: number) => ix * 100003 + iy;

export class World {
  entities: Entity[] = [];
  colliders: Collider[] = [];
  /** Spatial grid of static colliders owned by world chunks. */
  private grid = new Map<number, Collider[]>();
  private owned = new Map<string, { c: Collider; cells: number[] }[]>();
  /** Only entities within this distance of the child are updated (open world). */
  activeRadius = 40;
  hazards: Hazard[] = [];
  bounds: Bounds = { x: 0, y: 0, w: 30, h: 20 };
  player!: Player;
  readonly strokes: Strokes;
  readonly tele: Telegraphs;
  readonly vfx: Vfx;
  camX = 0;
  camY = 0;
  private shakeT = 0;
  private shakeAmp = 0;
  hitstop = 0;
  time = 0;
  /** Direction the idle thread points to (towards the painter). */
  goalDir: V = [-1, 0];
  /** Static sprites owned by the room (ground etc). */
  roomSprites: Sprite[] = [];
  /** Wind applied to light things and the child (Orchard gusts). */
  wind: V = [0, 0];
  /** Checkpoint position. */
  checkpoint: V = [0, 0];
  /** Free-form room state for debug display. */
  areaName = '';
  roomName = '';
  bossState = 'none';
  /** Called every frame after entities update (room scripts). */
  scripts: ((dt: number) => void)[] = [];
  /** Called when the room is cleared (free chunks, etc.). */
  cleanups: (() => void)[] = [];

  constructor(readonly r: Renderer, readonly input: Input) {
    this.tele = new Telegraphs(r);
    this.vfx = new Vfx(r);
    this.strokes = new Strokes(this);
  }

  /** Slow motion (ensō). Recovers on its own. */
  timeScale = 1;
  private slowT = 0;
  slow(scale: number, seconds: number): void {
    this.timeScale = Math.min(this.timeScale, scale);
    this.slowT = Math.max(this.slowT, seconds);
  }
  private zoomPunch = 0;
  punch(amount: number): void {
    this.zoomPunch = Math.max(this.zoomPunch, amount);
  }
  private kickX = 0;
  private kickY = 0;
  kick(dx: number, dy: number): void {
    this.kickX += dx;
    this.kickY += dy;
  }
  flash = 0;
  numbers: Numbers | null = null;
  /** A creature was defeated (experience, drops, camp bookkeeping). */
  onKill?: (e: Entity) => void;
  /** Current combo (hits chained with no more than ~2.4 s between). */
  combo = 0;
  comboT = 0;
  bestCombo = 0;
  addCombo(n: number): void {
    this.combo += n;
    this.comboT = 2.4;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
  }

  add<T extends Entity>(e: T): T {
    e.world = this;
    this.entities.push(e);
    e.init(this);
    return e;
  }

  shake(amp: number, t = 0.25): void {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeT = Math.max(this.shakeT, t);
  }

  addCollider(c: Collider, owner: string): void {
    let minX: number, minY: number, maxX: number, maxY: number;
    if (c.kind === 'circle') { minX = c.x - c.r; maxX = c.x + c.r; minY = c.y - c.r; maxY = c.y + c.r; }
    else { minX = Math.min(c.ax, c.bx) - c.r; maxX = Math.max(c.ax, c.bx) + c.r; minY = Math.min(c.ay, c.by) - c.r; maxY = Math.max(c.ay, c.by) + c.r; }
    const cells: number[] = [];
    for (let ix = Math.floor(minX / CELL); ix <= Math.floor(maxX / CELL); ix++) {
      for (let iy = Math.floor(minY / CELL); iy <= Math.floor(maxY / CELL); iy++) {
        const k = ck(ix, iy);
        let list = this.grid.get(k);
        if (!list) { list = []; this.grid.set(k, list); }
        list.push(c);
        cells.push(k);
      }
    }
    let o = this.owned.get(owner);
    if (!o) { o = []; this.owned.set(owner, o); }
    o.push({ c, cells });
  }

  removeColliders(owner: string): void {
    const o = this.owned.get(owner);
    if (!o) return;
    for (const { c, cells } of o) {
      for (const k of cells) {
        const list = this.grid.get(k);
        if (!list) continue;
        const i = list.indexOf(c);
        if (i >= 0) list.splice(i, 1);
        if (!list.length) this.grid.delete(k);
      }
    }
    this.owned.delete(owner);
  }

  /** Static colliders near a point (grid + room colliders). */
  collidersNear(x: number, y: number, r: number): Collider[] {
    const out: Collider[] = this.colliders.length ? this.colliders.slice() : [];
    const seen = new Set<Collider>();
    for (let ix = Math.floor((x - r) / CELL); ix <= Math.floor((x + r) / CELL); ix++) {
      for (let iy = Math.floor((y - r) / CELL); iy <= Math.floor((y + r) / CELL); iy++) {
        const list = this.grid.get(ck(ix, iy));
        if (!list) continue;
        for (const c of list) if (!seen.has(c)) { seen.add(c); out.push(c); }
      }
    }
    return out;
  }

  clearGrid(): void {
    this.grid.clear();
    this.owned.clear();
  }

  /** Move a circle with collision against walls and solid entities. */
  move(e: Entity, dx: number, dy: number): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (e.radius * 0.8)));
    for (let s = 0; s < steps; s++) {
      e.x += dx / steps;
      e.y += dy / steps;
      this.resolve(e);
    }
  }

  resolve(e: Entity): void {
    const near = this.collidersNear(e.x, e.y, e.radius + 1);
    for (let it = 0; it < 2; it++) {
      for (const c of near) {
        const p = pushOut(e.x, e.y, e.radius, c);
        if (p) { e.x = p[0]; e.y = p[1]; }
      }
      for (const o of this.entities) {
        if (o === e || !o.solid || o.dead) continue;
        const p = pushOut(e.x, e.y, e.radius, { kind: 'circle', x: o.x, y: o.y, r: o.radius });
        if (p) { e.x = p[0]; e.y = p[1]; }
      }
    }
    const b = this.bounds;
    e.x = Math.max(b.x + e.radius, Math.min(b.x + b.w - e.radius, e.x));
    e.y = Math.max(b.y + e.radius, Math.min(b.y + b.h - e.radius, e.y));
  }

  hazardAt(x: number, y: number): Hazard | null {
    for (const h of this.hazards) if (pointInPoly(x, y, h.poly)) return h;
    return null;
  }

  nearHazard(x: number, y: number, margin: number): boolean {
    for (const h of this.hazards) if (distToPoly(x, y, h.poly) < margin || pointInPoly(x, y, h.poly)) return true;
    return false;
  }

  /** Does a straight line cross a blocking wall? */
  lineBlocked(ax: number, ay: number, bx: number, by: number): boolean {
    void ax; void ay; void bx; void by;
    return false;
  }

  update(rawDt: number): void {
    // juice timers run in real time
    this.flash = Math.max(0, this.flash - rawDt * 6);
    this.zoomPunch *= Math.max(0, 1 - rawDt * 7);
    this.r.zoom = 1 + this.zoomPunch;
    this.kickX *= Math.max(0, 1 - rawDt * 14);
    this.kickY *= Math.max(0, 1 - rawDt * 14);
    if (this.slowT > 0) {
      this.slowT -= rawDt;
      if (this.slowT <= 0) this.timeScale = 1;
    } else this.timeScale += (1 - this.timeScale) * Math.min(1, rawDt * 8);
    if (this.hitstop > 0) {
      this.hitstop -= rawDt;
      this.vfx.update(rawDt * 0.2);
      this.updateCamera(rawDt);
      return;
    }
    const dt = rawDt * this.timeScale;
    this.time += dt;
    if (this.combo > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    const p = this.player;
    const ar2 = this.activeRadius * this.activeRadius;
    for (const e of this.entities) {
      if (e.dead) continue;
      if (e !== p && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > ar2) continue;
      e.update(dt);
    }
    for (const s of this.scripts) s(dt);
    this.strokes.update(dt);
    this.tele.update(dt);
    this.vfx.update(dt);
    const dead = this.entities.filter((e) => e.dead);
    if (dead.length) {
      for (const e of dead) e.dispose();
      this.entities = this.entities.filter((e) => !e.dead);
    }
    this.updateCamera(rawDt);
  }

  updateCamera(dt: number): void {
    const p = this.player;
    const [ax, ay] = p.aim;
    // while a finger is drawing, the page holds still under it
    if (this.input.drawing) {
      this.clampCamera();
      if (this.shakeT > 0) this.shakeT -= dt;
      return;
    }
    const tx = p.x + ax * 1.4 + p.vx * 0.04, ty = p.y + 0.5 + ay * 1.0 + p.vy * 0.04;
    const k = Math.min(1, dt * 7);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    this.clampCamera();
    if (this.shakeT > 0) {
      this.shakeT -= dt;
    } else this.shakeAmp = 0;
  }

  clampCamera(): void {
    const vh = this.r.viewH / this.r.zoom, vw = vh * (this.r.pxW / this.r.pxH);
    const b = this.bounds;
    if (b.w <= vw) this.camX = b.x + b.w / 2;
    else this.camX = Math.max(b.x + vw / 2, Math.min(b.x + b.w - vw / 2, this.camX));
    if (b.h <= vh) this.camY = b.y + b.h / 2;
    else this.camY = Math.max(b.y + vh / 2, Math.min(b.y + b.h - vh / 2, this.camY));
  }

  cameraWithShake(): V {
    const x = this.camX + this.kickX, y = this.camY + this.kickY;
    if (this.shakeAmp <= 0) return [x, y];
    const a = this.shakeAmp * Math.min(1, this.shakeT * 4);
    return [x + (Math.random() - 0.5) * a, y + (Math.random() - 0.5) * a];
  }

  /** Remove everything (room change). The player and thread are kept by the caller. */
  clearRoom(keep: Entity[]): void {
    for (const e of this.entities) if (!keep.includes(e)) e.dispose();
    this.entities = this.entities.filter((e) => keep.includes(e));
    for (const s of this.roomSprites) s.dispose();
    this.roomSprites = [];
    for (const c of this.cleanups) c();
    this.cleanups = [];
    this.clearGrid();
    this.colliders = [];
    this.hazards = [];
    this.scripts = [];
    this.tele.clear();
    this.vfx.clear();
    this.wind = [0, 0];
  }

  mouseWorld(): V {
    return this.r.screenToWorld(this.input.mouseX, this.input.mouseY);
  }
}
