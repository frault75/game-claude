/**
 * The Heart of the Mountain, under the summit: what makes its three floors more than rooms and camps.
 *   1. The Frozen Halls: the floor has split across the corridors (a Stroke of fresh ink carries you
 *      over), and icicles fall in some halls (watch their shadows).
 *   2. The Gallery of the Unfinished: three circles the master never closed; close each with an ensō
 *      and the last door unseals. The Sketch waits behind it.
 *   3. The Master's Studio: four unfinished scrolls to read; then the paintings wake, three waves of
 *      them, and the master's own stair opens up to the summit.
 */
import type { Game } from '../game';
import type { World } from '../world';
import { Entity } from '../entity';
import type { Creature } from '../enemies';
import type { DungeonMap, DRoom, V } from '../../world/dungeon';
import type { EnemyKind } from '../../world/layout';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../../gfx/sprite';
import { Painter, INK, PIG_A, PIG_B, VERMILION, LIGHT, mixPig } from '../../gfx/paint';
import { washPoly, noisyOutline } from '../../gfx/wash';
import { stroke, V2 } from '../../gfx/brush';
import { chasm } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { Rng } from '../../gfx/rng';
import { pointInPoly } from '../physics';
import { sfx } from '../../audio/sfx';
import { save, writeSave } from '../progression';
import { L, LL } from '../../i18n/lore';
import { HEART_UI, PAINTINGS } from '../../i18n/heart';
import { loopHint } from '../controls';
import { giveXp } from '../rewards';
import { dropLoot, ItemDrop, takeItem } from '../loot';
import { questItem } from '../items';
import { Chest } from '../secrets';
import { makeEnemy } from './overworld';
import type { Mark } from '../../ui/mapArt';
import { P3_HEART_OUT } from '../../world/peaks';

export type HeartKind = 'ice' | 'gallery' | 'studio';

export interface HeartCtx {
  g: Game;
  w: World;
  map: DungeonMap;
  add: <T extends Entity>(e: T) => T;
  /** Corridor mouths into the last room (closed by the guardian's fight, sealed on the gallery floor). */
  doors: [number, number, number, number][];
  closeDoors: () => void;
  openDoors: () => void;
  /** Set by the floor: where the arrow points (undefined = the usual). */
  objective?: () => V | null | undefined;
  /** Set by the floor: called when the child gets up again after falling. */
  onRespawn?: () => void;
}

// ---------- the critical path, and where it narrows ----------

function pathCells(map: DungeonMap, from: V, to: V): number[] {
  const { w, h, grid } = map;
  const s = Math.floor(from[1]) * w + Math.floor(from[0]), t = Math.floor(to[1]) * w + Math.floor(to[0]);
  const prev = new Int32Array(w * h).fill(-1);
  prev[s] = s;
  const q = [s];
  for (let head = 0; head < q.length && prev[t] < 0; head++) {
    const c = q[head], cx = c % w, cy = (c - cx) / w;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cx + ox, y = cy + oy, k = y * w + x;
      if (x < 0 || y < 0 || x >= w || y >= h || grid[k] !== 1 || prev[k] >= 0) continue;
      prev[k] = c;
      q.push(k);
    }
  }
  if (prev[t] < 0) return [];
  const out: number[] = [];
  for (let c = t; c !== s; c = prev[c]) out.push(c);
  out.push(s);
  return out.reverse();
}

interface Crevasse { poly: V[]; cx: number; cy: number; cells: number[] }

/** Two or three splits across the corridors on the way down (never in a room). */
function findCrevasses(map: DungeonMap, seed: number): Crevasse[] {
  const { w, grid } = map;
  const floor = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < map.h && grid[y * w + x] === 1;
  const inRoom = (x: number, y: number) => map.rooms.some((o) => x >= o.x - 2 && x < o.x + o.w + 2 && y >= o.y - 2 && y < o.y + o.h + 2);
  const path = pathCells(map, map.upSpawn, map.down);
  const r = new Rng(seed);
  const out: Crevasse[] = [];
  const used: number[] = [];
  for (const f of [0.3, 0.55, 0.8]) {
    const i0 = Math.floor(f * path.length), span = Math.floor(path.length * 0.14);
    let found: Crevasse | null = null;
    for (let k = 0; k <= span && !found; k++) {
      for (const i of [i0 + k, i0 - k]) {
        if (i < 3 || i >= path.length - 3 || used.some((u) => Math.abs(u - i) < 10)) continue;
        const c = path[i], x = c % w, y = (c - x) / w;
        if (inRoom(x, y)) continue;
        const a = path[i - 3], b = path[i + 3];
        const ddx = (b % w) - (a % w), ddy = Math.floor(b / w) - Math.floor(a / w);
        const horiz = Math.abs(ddx) > Math.abs(ddy);
        if (Math.abs(ddx) > 0 && Math.abs(ddy) > 0) continue;
        // the corridor's width here, the same over the five cells the split covers
        let lo = horiz ? y : x, hi = lo;
        const at = (u: number, v: number) => (horiz ? floor(u, v) : floor(v, u));
        const along = horiz ? x : y;
        while (at(along, lo - 1)) lo--;
        while (at(along, hi + 1)) hi++;
        if (hi - lo + 1 > 4) continue;
        let ok = true;
        for (let s = along - 2; s <= along + 2 && ok; s++) {
          for (let v = lo; v <= hi; v++) if (!at(s, v)) ok = false;
          if (at(s, lo - 1) || at(s, hi + 1)) ok = false;
        }
        if (!ok) continue;
        // a jagged split, straight where it meets the walls
        const g0 = along + 0.5 - 1.35, g1 = along + 0.5 + 1.45;
        const n = 6, edgeA: V[] = [], edgeB: V[] = [];
        for (let j = 0; j <= n; j++) {
          const v = lo - 0.05 + ((hi + 1.1 - lo) * j) / n;
          edgeA.push(horiz ? [g0 + r.range(-0.22, 0.22), v] : [v, g0 + r.range(-0.22, 0.22)]);
          edgeB.push(horiz ? [g1 + r.range(-0.22, 0.22), v] : [v, g1 + r.range(-0.22, 0.22)]);
        }
        const poly = [...edgeA, ...edgeB.reverse()];
        const cells: number[] = [];
        for (let s = along - 1; s <= along + 1; s++) for (let v = lo; v <= hi; v++) cells.push(horiz ? v * w + s : s * w + v);
        found = { poly, cx: horiz ? along + 0.5 : (lo + hi + 1) / 2, cy: horiz ? (lo + hi + 1) / 2 : along + 0.5, cells };
        used.push(i);
        break;
      }
    }
    if (found) out.push(found);
  }
  return out;
}

function crevasseSprite(c: Crevasse, seed: number): Sprite {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of c.poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const p = new Painter(x1 - x0 + 0.6, y1 - y0 + 0.6, SPRITE_PPU / 2, x0 - 0.3, y0 - 0.3);
  p.glaze();
  chasm(p, c.poly as V2[], seed);
  // a rim of blue ice on the two jagged edges
  const half = c.poly.length / 2;
  stroke(p, c.poly.slice(0, half) as V2[], { width: 0.07, pig: mixPig(INK, PIG_A, 0.6), load: 0.8, dry: 0.5, seed: seed + 1, taperStart: 0.05, taperEnd: 0.05 });
  stroke(p, c.poly.slice(half) as V2[], { width: 0.07, pig: mixPig(INK, PIG_A, 0.6), load: 0.8, dry: 0.5, seed: seed + 2, taperStart: 0.05, taperEnd: 0.05 });
  const s = new Sprite(frameFrom(p));
  s.mesh.renderOrder = LAYER.groundDetail + 10;
  return s;
}

// ---------- things down there ----------

/** Icicles break from the ceiling of a hall while the child is in it: their shadows come first. */
class IcicleHall extends Entity {
  private t = 1.5;
  constructor(private room: DRoom, private g: Game) {
    super();
    this.label = 'icicles';
  }
  update(dt: number): void {
    const w = this.world, p = w.player, o = this.room;
    if (p.state === 'dead' || p.x < o.x + 0.3 || p.x > o.x + o.w - 0.3 || p.y < o.y + 0.3 || p.y > o.y + o.h - 0.3) { this.t = Math.max(this.t, 0.8); return; }
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 2.3 + Math.random() * 1.3;
    this.g.hintOnce('heartIcicles', L(HEART_UI.icicles), 4);
    sfx.telegraph('high', 1);
    for (let i = 0; i < 3; i++) {
      let x = p.x + p.vx * 0.35, y = p.y + p.vy * 0.35;
      if (i > 0) { x = o.x + 1 + Math.random() * (o.w - 2); y = o.y + 1 + Math.random() * (o.h - 2); }
      x = Math.max(o.x + 0.8, Math.min(o.x + o.w - 0.8, x));
      y = Math.max(o.y + 0.8, Math.min(o.y + o.h - 0.8, y));
      w.tele.add({ kind: 'circle', r: 0.95 }, x, y, 0, 1 + i * 0.12, {
        hold: 0.05,
        onFire: () => {
          if (Math.hypot(p.x - x, p.y - y) < 1.05 && p.hurt(1, x, y + 1)) p.slowT = Math.max(p.slowT, 1.5);
          w.vfx.dust(x, y, 10, PIG_A);
          w.vfx.ripple(x, y, 0.9);
          sfx.impact(false);
        },
      });
    }
  }
}

let circleArt: { open: Frame; shut: Frame } | null = null;

/** A circle the master never closed, painted on the floor. An ensō round it closes it. */
class OpenCircle extends Entity {
  closed: boolean;
  private s!: Sprite;
  private glow = 0;
  onClose?: () => void;
  constructor(readonly index: number, x: number, y: number, private g: Game) {
    super();
    this.x = x; this.y = y;
    this.label = 'opencircle';
    this.closed = !!save.perks['hc' + index];
  }
  init(): void {
    if (!circleArt) {
      const mk = (gap: number) => {
        const p = new Painter(4, 4, SPRITE_PPU / 2, -2, -2);
        p.glaze();
        const pts: V2[] = [];
        const a0 = Math.PI * 0.35, a1 = a0 + Math.PI * 2 - gap;
        for (let k = 0; k <= 40; k++) { const a = a0 + ((a1 - a0) * k) / 40; pts.push([Math.cos(a) * 1.5, Math.sin(a) * 1.5]); }
        stroke(p, pts, { width: 0.16, load: 0.95, dry: 0.45, seed: 6100 + Math.round(gap * 10), taperStart: 0.08, taperEnd: gap > 0.1 ? 0.6 : 0.1 });
        return frameFrom(p);
      };
      circleArt = { open: mk(1.25), shut: mk(-0.15) };
    }
    this.s = this.addSprite(new Sprite(this.closed ? circleArt.shut : circleArt.open));
    this.s.setPos(this.x, this.y);
    this.s.mesh.renderOrder = LAYER.groundDetail + 12;
    this.onLoop = (poly) => { if (!this.closed && pointInPoly(this.x, this.y, poly)) this.close(); };
  }
  close(): void {
    this.closed = true;
    save.perks['hc' + this.index] = 1;
    writeSave();
    this.s.setTexture(circleArt!.shut.tex);
    this.glow = 1;
    this.world.vfx.ripple(this.x, this.y, 2);
    sfx.uiConfirm();
    this.onClose?.();
  }
  update(dt: number): void {
    const p = this.world.player;
    if (this.glow > 0) { this.glow -= dt; this.world.vfx.glowAt(this.x, this.y + 0.3, 2.2, 0.1); }
    if (this.closed) return;
    // the gap breathes
    if (Math.sin(this.world.time * 2.5) > 0.7) this.world.vfx.glowAt(this.x + Math.cos(-0.27) * 1.5, this.y + Math.sin(-0.27) * 1.5, 0.8, 0.12);
    if (Math.hypot(p.x - this.x, p.y - this.y) < 2.6) this.g.hintOnce('heartCircle', `${L(HEART_UI.circle)} ${loopHint(this.g)}`, 6);
  }
}

/** A paper talisman across a doorway: the gallery's last door, until the three circles are closed. */
class SealStrip extends Entity {
  private burnT = -1;
  constructor(private ax: number, private ay: number, private bx: number, private by: number) {
    super();
    this.x = (ax + bx) / 2; this.y = (ay + by) / 2;
    this.label = 'sealstrip';
  }
  init(): void {
    const horiz = this.ay === this.by;
    const len = horiz ? Math.abs(this.bx - this.ax) : Math.abs(this.by - this.ay);
    const w = horiz ? len + 0.4 : 0.9, h = horiz ? 1.6 : len + 1.2;
    const p = new Painter(w, h, SPRITE_PPU / 2, -w / 2, horiz ? -0.2 : -len / 2 - 0.2);
    const q = new Painter(w, h, SPRITE_PPU / 2, -w / 2, horiz ? -0.2 : -len / 2 - 0.2);
    p.glaze(); q.glaze();
    // the strip: paper with an ink border, hung across the opening
    const band: V2[] = horiz
      ? [[-len / 2, 0.55], [len / 2, 0.55], [len / 2, 1.05], [-len / 2, 1.05]]
      : [[-0.22, -len / 2], [0.22, -len / 2], [0.22, len / 2], [-0.22, len / 2]];
    p.lift();
    p.ctx.fillStyle = 'rgba(0,0,0,0.85)';
    p.ctx.beginPath();
    band.forEach((pt, i) => (i === 0 ? p.ctx.moveTo(pt[0], pt[1]) : p.ctx.lineTo(pt[0], pt[1])));
    p.ctx.closePath();
    p.ctx.fill();
    p.glaze();
    stroke(p, [...band, band[0]], { width: 0.04, load: 0.85, seed: 6201, taperStart: 0.01, taperEnd: 0.01 });
    for (let k = 0; k < 4; k++) {
      const t = (k + 0.5) / 4 - 0.5;
      const [cx, cy] = horiz ? [t * len, 0.8] : [0, t * len];
      stroke(q, [[cx - 0.1, cy + 0.1], [cx + 0.1, cy - 0.08]], { width: 0.08, pig: VERMILION, load: 1, seed: 6210 + k });
      stroke(q, [[cx - 0.08, cy - 0.1], [cx + 0.1, cy + 0.1]], { width: 0.06, pig: VERMILION, load: 0.9, seed: 6220 + k });
    }
    const a = this.addSprite(new Sprite(frameFrom(p)));
    const b = this.addSprite(new Sprite(frameFrom(q)), true);
    for (const s of [a, b]) { s.setPos(this.x, this.y); s.mesh.renderOrder = ySort(this.y - 0.5); }
  }
  burn(): void {
    if (this.burnT < 0) this.burnT = 0;
  }
  update(dt: number): void {
    if (this.burnT < 0) return;
    this.burnT += dt;
    for (const s of this.sprites) s.dissolve = Math.min(1, this.burnT / 1.1);
    if (Math.random() < dt * 16) this.world.vfx.flame(this.x + (Math.random() - 0.5) * 2, this.y + Math.random() * 1.2, 0.35);
    if (this.burnT > 1.2) this.destroy();
  }
}

const scrollArt: { pig: Frame; red: Frame }[] = [];

/** One of the four unfinished scrolls on its stand. */
class Scroll extends Entity {
  read: boolean;
  private glowT = 0;
  onRead?: () => void;
  constructor(readonly index: number, x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.5;
    this.solid = true;
    this.weight = Infinity;
    this.interactive = true;
    this.label = 'scroll';
    this.read = !!save.perks['hp' + index];
  }
  init(): void {
    if (!scrollArt.length) {
      for (let k = 0; k < 4; k++) {
        const p = new Painter(1.8, 3, SPRITE_PPU, -0.9, -0.2);
        const q = new Painter(1.8, 3, SPRITE_PPU, -0.9, -0.2);
        p.glaze(); q.glaze();
        // the stand: two posts and a crossbar
        stroke(p, [[-0.6, 0], [-0.58, 2.5]], { width: 0.07, load: 1, dry: 0.3, seed: 6300 + k, press: 0 });
        stroke(p, [[0.6, 0], [0.58, 2.5]], { width: 0.07, load: 1, dry: 0.3, seed: 6310 + k, press: 0 });
        stroke(p, [[-0.72, 2.45], [0.72, 2.48]], { width: 0.08, load: 1, dry: 0.3, seed: 6320 + k, press: 0 });
        // the paper
        const sheet: V2[] = [[-0.48, 0.55], [0.48, 0.55], [0.48, 2.36], [-0.48, 2.36]];
        p.lift();
        p.ctx.fillStyle = 'rgba(0,0,0,0.9)';
        p.ctx.beginPath();
        sheet.forEach((pt, i) => (i === 0 ? p.ctx.moveTo(pt[0], pt[1]) : p.ctx.lineTo(pt[0], pt[1])));
        p.ctx.closePath();
        p.ctx.fill();
        p.glaze();
        stroke(p, [[-0.52, 0.52], [0.52, 0.52]], { width: 0.06, load: 0.9, seed: 6330 + k, press: 0 });
        stroke(p, [[-0.5, 2.36], [0.5, 2.36]], { width: 0.04, load: 0.8, seed: 6340 + k, press: 0 });
        if (k === 0) {
          // a mountain whose top was never painted
          stroke(p, [[-0.4, 0.8], [-0.2, 1.3], [-0.08, 1.55]], { width: 0.05, load: 0.9, dry: 0.4, seed: 6350, taperEnd: 0.8 });
          stroke(p, [[0.4, 0.8], [0.22, 1.25], [0.1, 1.5]], { width: 0.05, load: 0.9, dry: 0.4, seed: 6351, taperEnd: 0.8 });
          washPoly(p, [[-0.4, 0.8], [0.4, 0.8], [0.15, 1.3], [-0.15, 1.3]], { pig: INK, density: 0.18, soft: 0.5, seed: 6352 });
        } else if (k === 1) {
          // a child, in black, with no scarf
          washPoly(p, noisyOutline(0, 1.55, 0.11, 0.1, 0.1, 6353), { pig: INK, density: 0.8, soft: 0.1, seed: 6353 });
          washPoly(p, [[-0.12, 1.45], [0.12, 1.45], [0.17, 1.0], [-0.17, 1.0]], { pig: INK, density: 0.65, soft: 0.1, seed: 6354 });
          stroke(p, [[-0.06, 1.0], [-0.08, 0.72]], { width: 0.05, load: 1, seed: 6355 });
          stroke(p, [[0.06, 1.0], [0.08, 0.72]], { width: 0.05, load: 1, seed: 6356 });
        } else if (k === 2) {
          // two hands, one painting, one wiping
          for (const [sx, sd] of [[-0.22, 1], [0.22, -1]] as const) {
            washPoly(p, noisyOutline(sx, 1.3, 0.14, 0.18, 0.15, 6357 + sd), { pig: INK, density: 0.35, soft: 0.2, seed: 6357 + sd });
            for (let f = 0; f < 4; f++) stroke(p, [[sx - 0.09 + f * 0.06, 1.45], [sx - 0.1 + f * 0.065, 1.72 - Math.abs(f - 1.5) * 0.05]], { width: 0.03, load: 0.85, seed: 6360 + f + sd * 10, taperEnd: 0.5 });
          }
          stroke(p, [[0.05, 0.85], [0.42, 0.95]], { width: 0.1, pig: PIG_B, load: 0.35, dry: 0.8, seed: 6370 });
        } else {
          // an empty scroll but for one drop of red at the bottom right
          stroke(q, [[0.28, 0.72], [0.31, 0.68]], { width: 0.1, pig: VERMILION, load: 1, seed: 6371 });
          stroke(p, [[-0.3, 2.1], [0.2, 2.12]], { width: 0.02, load: 0.4, seed: 6372 });
        }
        scrollArt.push({ pig: frameFrom(p), red: frameFrom(q) });
      }
    }
    const a = scrollArt[this.index % 4];
    const s = this.addSprite(new Sprite(a.pig));
    const r = this.addSprite(new Sprite(a.red), true);
    for (const sp of [s, r]) { sp.setPos(this.x, this.y); sp.mesh.renderOrder = ySort(this.y); }
  }
  interact(): void {
    this.onRead?.();
  }
  update(dt: number): void {
    this.glowT += dt;
    if (!this.read && Math.sin(this.glowT * 2) > 0.6) this.world.vfx.glowAt(this.x, this.y + 1.5, 1.4, 0.25);
  }
}

let deskArt: { pig: Frame; red: Frame; jar: Frame } | null = null;

/** The master's low desk (an ink stone worn hollow, brushes, a sheet with one circle) and his jar of brushes. */
class StudioThing extends Entity {
  constructor(private kind: 'desk' | 'jar', x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = kind === 'desk' ? 1.1 : 0.45;
    this.solid = true;
    this.weight = Infinity;
    this.label = 'studio' + kind;
  }
  init(): void {
    if (!deskArt) {
      const p = new Painter(3.4, 2.2, SPRITE_PPU, -1.7, -0.3);
      const q = new Painter(3.4, 2.2, SPRITE_PPU, -1.7, -0.3);
      p.glaze(); q.glaze();
      // legs and top, in lacquer
      for (const lx of [-1.25, 1.25]) stroke(p, [[lx, 0], [lx, 0.55]], { width: 0.09, load: 1, dry: 0.3, seed: 6601 + lx * 10, press: 0 });
      const top: V2[] = [[-1.45, 0.55], [1.45, 0.55], [1.38, 0.82], [-1.38, 0.82]];
      washPoly(p, top, { pig: mixPig(INK, PIG_B, 0.35), density: 0.55, soft: 0.05, edge: 0.8, seed: 6603 });
      stroke(p, [top[0], top[1]], { width: 0.05, load: 1, seed: 6604, press: 0 });
      // the sheet, with a circle that does not close, and a red seal in the corner
      const sh: V2[] = [[-0.25, 0.86], [0.85, 0.86], [0.8, 1.32], [-0.2, 1.32]];
      p.lift();
      p.ctx.fillStyle = 'rgba(0,0,0,0.9)';
      p.ctx.beginPath();
      sh.forEach((pt, i) => (i === 0 ? p.ctx.moveTo(pt[0], pt[1]) : p.ctx.lineTo(pt[0], pt[1])));
      p.ctx.closePath();
      p.ctx.fill();
      p.glaze();
      const ring: V2[] = [];
      for (let k = 0; k <= 16; k++) { const a = 0.9 + (k / 16) * Math.PI * 1.75; ring.push([0.3 + Math.cos(a) * 0.17, 1.09 + Math.sin(a) * 0.13]); }
      stroke(p, ring, { width: 0.03, load: 0.9, dry: 0.4, seed: 6605, taperStart: 0.1, taperEnd: 0.6 });
      stroke(q, [[0.66, 0.95], [0.71, 0.93]], { width: 0.06, pig: VERMILION, load: 1, seed: 6606 });
      // the ink stone, worn into a hollow, and a brush across its edge
      washPoly(p, noisyOutline(-0.85, 0.98, 0.32, 0.13, 0.08, 6607), { pig: INK, density: 0.8, soft: 0.05, edge: 0.9, seed: 6607 });
      p.lift();
      p.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      p.ctx.beginPath();
      p.ctx.ellipse(-0.82, 1.0, 0.15, 0.05, 0, 0, Math.PI * 2);
      p.ctx.fill();
      p.glaze();
      stroke(p, [[-1.25, 1.12], [-0.5, 1.2]], { width: 0.035, load: 1, seed: 6608, press: 0 });
      stroke(p, [[-0.5, 1.2], [-0.38, 1.22]], { width: 0.07, load: 1, dry: 0.3, seed: 6609, taperEnd: 0.95 });
      // the jar of brushes
      const j = new Painter(1.4, 2.4, SPRITE_PPU, -0.7, -0.2);
      j.glaze();
      const jar = noisyOutline(0, 0.38, 0.32, 0.38, 0.06, 6610);
      for (const pt of jar) if (pt[1] < 0.02) pt[1] = 0.02;
      washPoly(j, jar, { pig: mixPig(INK, PIG_A, 0.4), density: 0.45, soft: 0.05, edge: 0.85, seed: 6610 });
      const r = new Rng(6611);
      for (let k = 0; k < 11; k++) {
        const a = Math.PI / 2 + r.range(-0.45, 0.45), l = r.range(0.7, 1.25);
        const x0 = r.range(-0.18, 0.18), y0 = 0.7;
        const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l;
        stroke(j, [[x0, y0], [x1, y1]], { width: 0.03, load: 0.95, seed: r.int(1, 1e6), press: 0 });
        stroke(j, [[x1, y1], [x1 + Math.cos(a) * 0.14, y1 + Math.sin(a) * 0.14]], { width: 0.06, load: 1, dry: 0.3, seed: r.int(1, 1e6), taperStart: 0.2, taperEnd: 0.95 });
      }
      deskArt = { pig: frameFrom(p), red: frameFrom(q), jar: frameFrom(j) };
    }
    const sp = this.addSprite(new Sprite(this.kind === 'desk' ? deskArt.pig : deskArt.jar));
    sp.setPos(this.x, this.y);
    sp.mesh.renderOrder = ySort(this.y);
    if (this.kind === 'desk') {
      const rd = this.addSprite(new Sprite(deskArt.red), true);
      rd.setPos(this.x, this.y);
      rd.mesh.renderOrder = ySort(this.y);
    }
  }
}

let stairArt: { steps: Frame; light: Frame } | null = null;

/** The master's own stair, at the back of the studio: it climbs to the summit. */
class MasterStair extends Entity {
  private t = 0;
  private shown = false;
  onEnter?: () => void;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.label = 'masterstair';
  }
  init(): void {
    if (!stairArt) {
      const p = new Painter(3.2, 3.4, SPRITE_PPU / 2, -1.6, -0.6);
      p.glaze();
      for (let k = 0; k < 6; k++) {
        const y = k * 0.42, hw = 1.2 - k * 0.12;
        washPoly(p, [[-hw, y], [hw, y], [hw - 0.06, y + 0.36], [-hw + 0.06, y + 0.36]], { pig: mixPig(INK, PIG_B, 0.3), density: 0.34 - k * 0.04, soft: 0.05, edge: 0.6, seed: 6400 + k });
        stroke(p, [[-hw, y], [hw, y]], { width: 0.06, load: 0.9 - k * 0.1, dry: 0.4, seed: 6410 + k });
      }
      const l = new Painter(3.2, 3.4, SPRITE_PPU / 4, -1.6, -0.6);
      l.glaze();
      l.dab(0, 2.6, 1.4, LIGHT, 0.85, 0);
      stairArt = { steps: frameFrom(p), light: frameFrom(l) };
    }
    const s = this.addSprite(new Sprite(stairArt.steps));
    const lt = this.addSprite(new Sprite(stairArt.light), true);
    for (const sp of [s, lt]) { sp.setPos(this.x, this.y); sp.mesh.renderOrder = ySort(this.y + 2); sp.opacity = 0; }
  }
  show(): void {
    this.shown = true;
    this.world.vfx.ripple(this.x, this.y + 1, 2);
  }
  update(dt: number): void {
    if (!this.shown) { for (const s of this.sprites) s.opacity = 0; return; }
    this.t += dt;
    for (const s of this.sprites) s.opacity = Math.min(1, this.t / 1.2);
    if (Math.random() < dt * 3) this.world.vfx.glowAt(this.x, this.y + 2.2, 1.2, 0.3);
    const p = this.world.player;
    if (this.t > 1 && p.state !== 'dead' && Math.hypot(p.x - this.x, p.y - (this.y + 0.4)) < 0.9) this.onEnter?.();
  }
}

// ---------- the floors ----------

/** Rooms in the middle of a floor (not the first, not the last), shallow to deep. */
function innerRooms(map: DungeonMap): DRoom[] {
  return map.rooms.filter((o) => o !== map.start && o !== map.end).sort((a, b) => a.depth - b.depth);
}

function sideChest(ctx: HeartCtx, id: number, avoid: V[]): void {
  const { map, add, g } = ctx;
  const path = new Set(pathCells(map, map.upSpawn, map.down));
  const rooms = innerRooms(map);
  // a room the path does not cross, if there is one; the deepest otherwise
  const off = rooms.filter((o) => !path.has(Math.floor(o.cy) * map.w + Math.floor(o.cx)));
  const o = (off.length ? off : rooms)[(off.length ? off : rooms).length - 1];
  if (!o) return;
  let x = o.x + 1.6, y = o.y + 1.6;
  if (avoid.some(([ax, ay]) => Math.hypot(ax - x, ay - y) < 2.5)) { x = o.x + o.w - 1.6; }
  const ch = add(new Chest(id, x, y));
  ch.onOpen = () => {
    dropLoot(g, ch.x, ch.y, 'boss', 11);
    giveXp(g, 120);
  };
}

export function heartFloor(kind: HeartKind, ctx: HeartCtx): void {
  if (kind === 'ice') iceFloor(ctx);
  else if (kind === 'gallery') galleryFloor(ctx);
  else studioFloor(ctx);
}

function iceFloor(ctx: HeartCtx): void {
  const { g, w, map, add } = ctx;
  const cs = findCrevasses(map, 7101);
  // creatures walk round the splits
  if (w.nav) {
    const grid = new Uint8Array(w.nav.grid);
    for (const c of cs) for (const k of c.cells) grid[k] = 0;
    w.nav.grid = grid;
  }
  cs.forEach((c, i) => {
    w.hazards.push({ kind: 'void', poly: c.poly });
    const s = crevasseSprite(c, 7200 + i * 7);
    w.r.scenePig.add(s.mesh);
    w.roomSprites.push(s);
  });
  w.scripts.push(() => {
    const p = w.player;
    for (const c of cs) if (Math.hypot(p.x - c.cx, p.y - c.cy) < 4.5) { g.hintOnce('heartCrevasse', L(HEART_UI.crevasse), 5); break; }
  });
  // icicles in two of the halls on the way
  const rooms = innerRooms(map);
  for (const o of [rooms[Math.floor(rooms.length * 0.35)], rooms[Math.floor(rooms.length * 0.75)]]) if (o) add(new IcicleHall(o, g));
  sideChest(ctx, 900, []);
}

function galleryFloor(ctx: HeartCtx): void {
  const { g, w, map, add, doors } = ctx;
  const rooms = innerRooms(map);
  const picks = [rooms[Math.floor(rooms.length * 0.2)], rooms[Math.floor(rooms.length * 0.55)], rooms[rooms.length - 1]].filter((o, i, a) => o && a.indexOf(o) === i);
  // fewer than three rooms: put the rest in the first room's corners
  while (picks.length < 3 && rooms.length) picks.push(rooms[0]);
  const circles: OpenCircle[] = picks.slice(0, 3).map((o, i) => {
    const dup = picks.slice(0, i).filter((q) => q === o).length;
    const x = dup ? o.x + (dup === 1 ? 2.2 : o.w - 2.2) : o.cx, y = dup ? o.y + 2.2 : o.cy - 0.3;
    return add(new OpenCircle(i, x, y, g));
  });
  const shut = () => circles.filter((c) => c.closed).length;
  // the last door stays sealed until the three circles are closed
  const strips: SealStrip[] = [];
  const seal = () => {
    for (const [ax, ay, bx, by] of doors) {
      w.addCollider({ kind: 'seg', ax, ay, bx, by, r: 0.5 }, 'sealdoor');
      strips.push(add(new SealStrip(ax, ay, bx, by)));
    }
  };
  if (shut() < 3) seal();
  for (const c of circles) {
    c.onClose = () => {
      const n = shut();
      g.hud.showHint(L(HEART_UI.closed).replace('{n}', String(n)), 3);
      giveXp(g, 80);
      // the unfinished stir when a circle closes
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2;
        const e = makeEnemy(k === 0 ? 'eraser' : 'monk', c.x + Math.cos(a) * 4, c.y + Math.sin(a) * 3) as Creature;
        e.setup(6, false);
        e.aggro = true;
        e.emerge = 0.6;
        add(e);
      }
      if (n >= 3) {
        g.after(1.2, () => {
          w.removeColliders('sealdoor');
          for (const s of strips) s.burn();
          strips.length = 0;
          sfx.uiConfirm();
          void g.story.show([L(HEART_UI.unsealed)], { size: 34, y: g.world.r.uiH / 2 - 200, hold: 3 });
        });
      }
    };
  }
  let sealHintT = 0;
  w.scripts.push((dt) => {
    sealHintT -= dt;
    if (!strips.length || sealHintT > 0) return;
    const p = w.player;
    for (const [ax, ay, bx, by] of doors) {
      if (Math.hypot(p.x - (ax + bx) / 2, p.y - (ay + by) / 2) < 3) { g.hud.showHint(L(HEART_UI.sealed), 4); sealHintT = 12; break; }
    }
  });
  ctx.objective = () => {
    const p = w.player;
    let best: OpenCircle | null = null, bd = Infinity;
    for (const c of circles) {
      if (c.closed) continue;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best ? [best.x, best.y] : undefined;
  };
  sideChest(ctx, 901, circles.map((c) => [c.x, c.y] as V));
}

const WAVES: EnemyKind[][] = [
  ['monk', 'crane', 'wraith', 'monk'],
  ['eraser', 'eraser', 'snowfox', 'yeti', 'crane'],
  ['yeti', 'eraser', 'monk', 'crane', 'snowfox', 'wraith'],
];

function studioFloor(ctx: HeartCtx): void {
  const { g, w, map, add } = ctx;
  const e = map.end;
  const r = w.r;
  const done = () => !!save.perks.studioDone;
  // four scrolls along the back wall, the master's stair between them
  const scrolls: Scroll[] = [];
  for (let i = 0; i < 4; i++) {
    const t = [0.14, 0.32, 0.68, 0.86][i];
    scrolls.push(add(new Scroll(i, e.x + e.w * t, e.y + e.h - 1.6)));
  }
  const stair = add(new MasterStair(e.cx, e.y + e.h - 2.2));
  add(new StudioThing('desk', e.x + e.w * 0.3, e.cy - 0.5));
  add(new StudioThing('jar', e.x + e.w * 0.3 + 2.4, e.cy - 0.2));
  add(new StudioThing('jar', e.x + e.w * 0.78, e.cy + 1.4));
  const chestAt: V = [e.cx, e.y + 3];
  const openChest = () => {
    const ch = add(new Chest(902, chestAt[0], chestAt[1]));
    ch.onOpen = () => {
      const it = questItem('studioSeal', 10);
      if (it) { const d = add(new ItemDrop(ch.x, ch.y, it)); d.onTake = (item) => takeItem(g, item); }
      dropLoot(g, ch.x, ch.y, 'boss', 12);
    };
  };
  if (done()) { stair.show(); openChest(); }
  stair.onEnter = () => {
    if (!save.perks.hollowDone) { save.perks.hollowDone = 1; writeSave(); }
    void g.travel('peaks', P3_HEART_OUT);
  };
  // waves of the paintings, once the four scrolls are read
  let wave = -1;
  let alive: Creature[] = [];
  let between = 0;
  const startWaves = () => {
    if (wave >= 0 || done()) return;
    wave = 0;
    ctx.closeDoors();
    sfx.wave();
    void g.story.show([L(HEART_UI.awake)], { size: 38, y: r.uiH / 2 - 200, hold: 2.4 });
    between = 2;
  };
  const spawnWave = () => {
    g.hud.showHint(L(HEART_UI.wave).replace('{n}', String(wave + 1)), 2.5);
    alive = WAVES[wave].map((kind, k) => {
      const sc = scrolls[k % 4];
      const c = makeEnemy(kind, sc.x + (Math.random() - 0.5) * 1.5, sc.y - 1.6 - Math.random()) as Creature;
      c.setup(6, wave === 2 && k === 0);
      c.aggro = true;
      c.emerge = 0.6;
      return add(c);
    });
    sfx.spawn();
  };
  const read = () => scrolls.filter((s) => s.read).length;
  for (const s of scrolls) {
    s.onRead = () => {
      g.talk({ name: L(HEART_UI.painting) }, LL(PAINTINGS[s.index]), () => {
        if (!s.read) { s.read = true; save.perks['hp' + s.index] = 1; writeSave(); giveXp(g, 40); }
        if (read() >= 4) g.after(0.6, startWaves);
      });
    };
  }
  let inside = false;
  w.scripts.push((dt) => {
    const p = w.player;
    const inStudio = p.x > e.x + 1 && p.x < e.x + e.w - 1 && p.y > e.y + 1 && p.y < e.y + e.h - 1;
    if (inStudio && !inside) {
      if (!done()) void g.story.show([L(HEART_UI.studio)], { size: 32, y: r.uiH / 2 - 200, hold: 3.5 });
      // back after a fall, with the scrolls already read: the paintings are waiting
      if (!done() && read() >= 4) g.after(1.2, startWaves);
    }
    inside = inStudio;
    if (wave < 0) return;
    if (between > 0) {
      between -= dt;
      if (between <= 0) spawnWave();
      return;
    }
    if (alive.some((c) => !c.dead)) return;
    wave++;
    if (wave < WAVES.length) { between = 1.4; return; }
    // the last one: silence, the chest, the stair
    wave = -1;
    save.perks.studioDone = 1;
    writeSave();
    giveXp(g, 900);
    ctx.openDoors();
    g.after(0.8, () => {
      void g.story.show([L(HEART_UI.calm)], { size: 32, y: r.uiH / 2 - 200, hold: 4 });
      stair.show();
      openChest();
      sfx.uiConfirm();
    });
  });
  ctx.onRespawn = () => {
    if (wave < 0) return;
    for (const c of alive) if (!c.dead) c.destroy();
    alive = [];
    wave = -1;
    ctx.openDoors();
  };
  ctx.objective = () => {
    if (done()) return [stair.x, stair.y];
    const p = w.player;
    let best: Scroll | null = null, bd = Infinity;
    for (const s of scrolls) {
      if (s.read) continue;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best ? [best.x, best.y - 0.6] : [e.cx, e.cy];
  };
}

/** Extra marks for the map of a floor. */
export function heartMarks(kind: HeartKind, map: DungeonMap): Mark[] {
  if (kind === 'studio') {
    const e = map.end;
    return save.perks.studioDone ? [{ x: e.cx, y: e.y + e.h - 2.2, kind: 'up' }] : [{ x: e.cx, y: e.cy, kind: 'quest' }];
  }
  return [];
}
