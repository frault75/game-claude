/** The running room: entities, static collision, hazards, camera, effects. */
import type { Renderer } from '../core/renderer';
import { settings } from './settings';
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
const NEIGH4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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
  /** A point the camera leans towards (a guardian in a fight), keeping the child in view. */
  camLook: [number, number] | null = null;
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
  /** Indigo froze something here (strokes, loops, the wave). */
  onFreeze: ((x: number, y: number, r: number) => void)[] = [];
  /** Gold lightning struck here. */
  onBolt: ((x: number, y: number, r: number) => void)[] = [];

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
    if (!settings.shake) return;
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
    const misty = e === this.player && this.player.misty;
    for (let it = 0; it < 2; it++) {
      for (const c of near) {
        if (misty && c.tag === 'thorn') continue;
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

  /** Walkable grid of a dungeon (1 = floor, cell = 1 unit) and the distance field to the child. */
  nav: { w: number; h: number; grid: Uint8Array; dist: Int16Array; t: number } | null = null;

  private walkable(x: number, y: number): boolean {
    const n = this.nav!;
    const ix = Math.floor(x), iy = Math.floor(y);
    return ix >= 0 && iy >= 0 && ix < n.w && iy < n.h && n.grid[iy * n.w + ix] === 1;
  }

  /** Does a straight line cross a wall? (dungeons only) */
  lineBlocked(ax: number, ay: number, bx: number, by: number): boolean {
    if (!this.nav) return false;
    const d = Math.hypot(bx - ax, by - ay);
    const n = Math.ceil(d / 0.4);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!this.walkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return true;
    }
    return false;
  }

  /** Breadth-first distances from the child, a few times a second. */
  private updateNav(dt: number): void {
    const n = this.nav;
    if (!n) return;
    n.t -= dt;
    if (n.t > 0) return;
    n.t = 0.25;
    n.dist.fill(-1);
    const sx = Math.floor(this.player.x), sy = Math.floor(this.player.y);
    if (sx < 0 || sy < 0 || sx >= n.w || sy >= n.h) return;
    const q = new Int32Array(n.w * n.h);
    let head = 0, tail = 0;
    q[tail++] = sy * n.w + sx;
    n.dist[sy * n.w + sx] = 0;
    while (head < tail) {
      const c = q[head++];
      const cd = n.dist[c];
      if (cd > 40) continue;
      const cx: number = c % n.w, cy: number = (c - cx) / n.w;
      for (const [ox, oy] of NEIGH4) {
        const x: number = cx + ox, y: number = cy + oy;
        if (x < 0 || y < 0 || x >= n.w || y >= n.h) continue;
        const k = y * n.w + x;
        if (n.grid[k] !== 1 || n.dist[k] >= 0) continue;
        n.dist[k] = cd + 1;
        q[tail++] = k;
      }
    }
  }

  /**
   * Which way to go to reach (tx, ty): straight when nothing is in between,
   * otherwise down the distance field. Returns a vector whose length is the remaining path length.
   */
  steer(x: number, y: number, tx: number, ty: number): [number, number] {
    const dx = tx - x, dy = ty - y;
    if (!this.nav || !this.lineBlocked(x, y, tx, ty)) return [dx, dy];
    const n = this.nav;
    const ix = Math.floor(x), iy = Math.floor(y);
    let best = -1, bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const cx = ix + ox, cy = iy + oy;
        if (cx < 0 || cy < 0 || cx >= n.w || cy >= n.h) continue;
        const d = n.dist[cy * n.w + cx];
        if (d < 0) continue;
        // no corner cutting
        if (ox && oy && (n.grid[iy * n.w + cx] !== 1 || n.grid[cy * n.w + ix] !== 1)) continue;
        if (best < 0 || d < best) { best = d; bx = cx + 0.5; by = cy + 0.5; }
      }
    }
    if (best < 0) return [dx, dy];
    const l = Math.hypot(bx - x, by - y) || 1;
    const k = (best + 1) / l;
    return [(bx - x) * k, (by - y) * k];
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
    this.updateNav(dt);
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
    // while a finger is drawing, the page holds still under it, unless the child walks
    // towards the edge (the other thumb on the stick): then it is kept in a box around the centre
    if (this.input.drawing) {
      const vh = this.r.viewH / this.r.zoom, vw = vh * (this.r.pxW / this.r.pxH);
      const bx = vw * 0.28, by = vh * 0.26;
      const dx = p.x - this.camX, dy = p.y + 0.5 - this.camY;
      const k = Math.min(1, dt * 8);
      if (Math.abs(dx) > bx) this.camX += (dx - Math.sign(dx) * bx) * k;
      if (Math.abs(dy) > by) this.camY += (dy - Math.sign(dy) * by) * k;
      this.clampCamera();
      if (this.shakeT > 0) this.shakeT -= dt;
      return;
    }
    let tx = p.x + ax * 1.4 + p.vx * 0.04, ty = p.y + 0.5 + ay * 1.0 + p.vy * 0.04;
    if (this.camLook) {
      const vh = this.r.viewH / this.r.zoom, vw = vh * (this.r.pxW / this.r.pxH);
      tx += Math.max(-vw * 0.26, Math.min(vw * 0.26, (this.camLook[0] - p.x) * 0.45));
      ty += Math.max(-vh * 0.26, Math.min(vh * 0.26, (this.camLook[1] - p.y) * 0.45));
    }
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
    this.onFreeze = [];
    this.onBolt = [];
    this.camLook = null;
    this.clearGrid();
    this.colliders = [];
    this.hazards = [];
    this.scripts = [];
    this.nav = null;
    this.tele.clear();
    this.vfx.clear();
    this.wind = [0, 0];
  }

  mouseWorld(): V {
    return this.r.screenToWorld(this.input.mouseX, this.input.mouseY);
  }
}
