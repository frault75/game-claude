/** The running room: entities, static collision, hazards, camera, effects. */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { Entity } from './entity';
import { Collider, pushOut, pointInPoly, distToPoly, V, segIntersect, side } from './physics';
import { Telegraphs } from './telegraph';
import { Vfx } from './vfx';
import type { Player } from './player';
import type { Thread } from './thread';
import { Sprite } from '../gfx/sprite';

export interface Hazard {
  kind: 'water' | 'void';
  poly: V[];
}

export interface Bounds { x: number; y: number; w: number; h: number }

export class World {
  entities: Entity[] = [];
  colliders: Collider[] = [];
  hazards: Hazard[] = [];
  bounds: Bounds = { x: 0, y: 0, w: 30, h: 20 };
  player!: Player;
  thread!: Thread;
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

  constructor(readonly r: Renderer, readonly input: Input) {
    this.tele = new Telegraphs(r);
    this.vfx = new Vfx(r);
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
    for (let it = 0; it < 2; it++) {
      for (const c of this.colliders) {
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

  /** Does a straight line cross a thread-blocking wall? */
  lineBlocked(ax: number, ay: number, bx: number, by: number): boolean {
    for (const c of this.colliders) {
      if (!c.blocksThread || c.kind !== 'seg') continue;
      if (segIntersect(ax, ay, bx, by, c.ax, c.ay, c.bx, c.by) >= 0) return true;
    }
    return false;
  }

  /** The taut (tied) thread as a segment, if any. */
  tautSegment(): [number, number, number, number] | null {
    return this.thread ? this.thread.tautSegment() : null;
  }

  /** Would moving from (x0,y0) to (x1,y1) cross the taut thread? */
  crossesThread(x0: number, y0: number, x1: number, y1: number): boolean {
    const s = this.tautSegment();
    if (!s) return false;
    return side(x0, y0, s[0], s[1], s[2], s[3]) !== side(x1, y1, s[0], s[1], s[2], s[3]) && segIntersect(x0, y0, x1, y1, s[0], s[1], s[2], s[3]) >= 0;
  }

  update(dt: number): void {
    this.time += dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.vfx.update(dt * 0.25);
      return;
    }
    for (const e of this.entities) if (!e.dead) e.update(dt);
    this.thread.update(dt);
    for (const s of this.scripts) s(dt);
    this.tele.update(dt);
    this.vfx.update(dt);
    const dead = this.entities.filter((e) => e.dead);
    if (dead.length) {
      for (const e of dead) {
        this.thread.forget(e);
        e.dispose();
      }
      this.entities = this.entities.filter((e) => !e.dead);
    }
    this.updateCamera(dt);
  }

  updateCamera(dt: number): void {
    const p = this.player;
    const [ax, ay] = p.aim;
    const tx = p.x + ax * 0.8, ty = p.y + 0.5 + ay * 0.6;
    const k = Math.min(1, dt * 4);
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
    if (this.shakeAmp <= 0) return [this.camX, this.camY];
    const a = this.shakeAmp * Math.min(1, this.shakeT * 4);
    return [this.camX + (Math.random() - 0.5) * a, this.camY + (Math.random() - 0.5) * a];
  }

  /** Remove everything (room change). The player and thread are kept by the caller. */
  clearRoom(keep: Entity[]): void {
    for (const e of this.entities) if (!keep.includes(e)) e.dispose();
    this.entities = this.entities.filter((e) => keep.includes(e));
    for (const s of this.roomSprites) s.dispose();
    this.roomSprites = [];
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
