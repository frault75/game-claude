/**
 * Dungeon floors: rooms joined by corridors on a grid of 1-unit cells, generated from a seed.
 * The same seed always gives the same floor, so links between floors can be computed up front.
 */
import { Rng } from '../gfx/rng';

export type V = [number, number];

export interface DungeonSpec {
  seed: number;
  /** Size in cells (= world units). */
  w: number;
  h: number;
  rooms: number;
  minRoom: number;
  maxRoom: number;
  corridor: number;
  /** A big last room for the guardian. */
  boss?: { w: number; h: number };
}

export interface DRoom {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** Corridor steps from the first room. */
  depth: number;
}

export interface DungeonMap {
  w: number;
  h: number;
  /** 1 = floor, 0 = rock. */
  grid: Uint8Array;
  rooms: DRoom[];
  start: DRoom;
  end: DRoom;
  /** Stairs up (in the first room, against its north wall) and where to appear next to them. */
  up: V;
  upSpawn: V;
  /** Stairs down / the guardian's spot in the last room, and where to appear when coming back up. */
  down: V;
  downSpawn: V;
  torches: V[];
  /** Boundary edges between floor and rock, merged into long segments. */
  walls: { ax: number; ay: number; bx: number; by: number; face: 'n' | 's' | 'e' | 'w' }[];
}

function overlaps(a: DRoom, b: DRoom, pad: number): boolean {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

export function generateDungeon(spec: DungeonSpec): DungeonMap {
  const r = new Rng(spec.seed);
  const { w, h } = spec;
  const grid = new Uint8Array(w * h);
  const rooms: DRoom[] = [];
  const mk = (x: number, y: number, rw: number, rh: number): DRoom => ({ x, y, w: rw, h: rh, cx: x + rw / 2, cy: y + rh / 2, depth: 0 });
  // the first room sits low and to one side, the guardian's room high on the other
  const sw = r.int(spec.minRoom + 1, spec.maxRoom), sh = r.int(spec.minRoom + 1, spec.maxRoom);
  const leftStart = r.chance(0.5);
  rooms.push(mk(leftStart ? r.int(3, 8) : w - sw - r.int(3, 8), r.int(3, 7), sw, sh));
  let boss: DRoom | null = null;
  if (spec.boss) {
    const bw = spec.boss.w, bh = spec.boss.h;
    boss = mk(leftStart ? w - bw - r.int(3, 6) : r.int(3, 6), h - bh - r.int(3, 6), bw, bh);
  }
  for (let tries = 0; tries < spec.rooms * 60 && rooms.length < spec.rooms; tries++) {
    const rw = r.int(spec.minRoom, spec.maxRoom), rh = r.int(spec.minRoom, spec.maxRoom - 1);
    const cand = mk(r.int(2, w - rw - 2), r.int(2, h - rh - 2), rw, rh);
    if (rooms.some((o) => overlaps(o, cand, 4))) continue;
    if (boss && overlaps(boss, cand, 4)) continue;
    rooms.push(cand);
  }
  if (boss) rooms.push(boss);
  // chain the rooms: from the first, always to the nearest not yet joined (the guardian's room last)
  const order: DRoom[] = [rooms[0]];
  const left = rooms.slice(1).filter((o) => o !== boss);
  while (left.length) {
    const last = order[order.length - 1];
    let bi = 0, bd = Infinity;
    left.forEach((o, i) => {
      const d = Math.hypot(o.cx - last.cx, o.cy - last.cy);
      if (d < bd) { bd = d; bi = i; }
    });
    order.push(left.splice(bi, 1)[0]);
  }
  if (boss) order.push(boss);
  const carve = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(1, Math.min(y0, y1)); y < Math.min(h - 1, Math.max(y0, y1)); y++) {
      for (let x = Math.max(1, Math.min(x0, x1)); x < Math.min(w - 1, Math.max(x0, x1)); x++) grid[y * w + x] = 1;
    }
  };
  for (const o of rooms) carve(o.x, o.y, o.x + o.w, o.y + o.h);
  const half = Math.floor(spec.corridor / 2), cw = spec.corridor;
  const hseg = (x0: number, x1: number, y: number) => carve(Math.min(x0, x1) - half, y - half, Math.max(x0, x1) + half + 1, y - half + cw);
  const vseg = (y0: number, y1: number, x: number) => carve(x - half, Math.min(y0, y1) - half, x - half + cw, Math.max(y0, y1) + half + 1);
  const corridor = (a: DRoom, b: DRoom) => {
    const ax = Math.floor(a.cx), ay = Math.floor(a.cy), bx = Math.floor(b.cx), by = Math.floor(b.cy);
    if (r.chance(0.5)) { hseg(ax, bx, ay); vseg(ay, by, bx); }
    else { vseg(ay, by, ax); hseg(ax, bx, by); }
  };
  for (let i = 1; i < order.length; i++) corridor(order[i - 1], order[i]);
  // a couple of loops so it is not a single line
  for (let k = 0; k < Math.min(2, order.length - 3); k++) {
    const i = r.int(0, order.length - 3);
    const j = Math.min(order.length - 2, i + 2 + r.int(0, 1));
    if (order[j] !== boss) corridor(order[i], order[j]);
  }
  // depth of each room along the corridors (for difficulty and the last room)
  const dist = new Int32Array(w * h).fill(-1);
  const q: number[] = [];
  const s0 = Math.floor(rooms[0].cy) * w + Math.floor(rooms[0].cx);
  dist[s0] = 0;
  q.push(s0);
  for (let head = 0; head < q.length; head++) {
    const c = q[head];
    const cx = c % w, cy = (c - cx) / w;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cx + ox, y = cy + oy;
      const k = y * w + x;
      if (x < 0 || y < 0 || x >= w || y >= h || grid[k] !== 1 || dist[k] >= 0) continue;
      dist[k] = dist[c] + 1;
      q.push(k);
    }
  }
  for (const o of rooms) o.depth = Math.max(0, dist[Math.floor(o.cy) * w + Math.floor(o.cx)]);
  const start = rooms[0];
  const end = boss ?? rooms.reduce((a, b) => (b.depth > a.depth ? b : a), rooms[1] ?? rooms[0]);
  // torches along the north walls of rooms
  const torches: V[] = [];
  for (const o of rooms) {
    const n = o === boss ? 4 : r.int(1, 3);
    for (let k = 0; k < n; k++) {
      const x = o.x + 1.5 + ((k + 0.5) / n) * (o.w - 3) + r.range(-0.5, 0.5);
      const y = o.y + o.h - 0.7;
      if (grid[Math.floor(o.y + o.h) * w + Math.floor(x)] === 0) torches.push([x, y]);
    }
  }
  // walls: boundary edges merged into runs
  const walls: DungeonMap['walls'] = [];
  const floor = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x] === 1;
  for (let y = 0; y <= h; y++) {
    // horizontal edges between row y-1 and row y
    let run: { x0: number; face: 'n' | 's' } | null = null;
    for (let x = 0; x <= w; x++) {
      const below = x < w && floor(x, y - 1), above = x < w && floor(x, y);
      const face: 'n' | 's' | null = below && !above ? 's' : above && !below ? 'n' : null;
      if (run && face !== run.face) { walls.push({ ax: run.x0, ay: y, bx: x, by: y, face: run.face }); run = null; }
      if (face && !run) run = { x0: x, face };
    }
  }
  for (let x = 0; x <= w; x++) {
    let run: { y0: number; face: 'e' | 'w' } | null = null;
    for (let y = 0; y <= h; y++) {
      const l = y < h && floor(x - 1, y), rr = y < h && floor(x, y);
      const face: 'e' | 'w' | null = l && !rr ? 'e' : rr && !l ? 'w' : null;
      if (run && face !== run.face) { walls.push({ ax: x, ay: run.y0, bx: x, by: y, face: run.face }); run = null; }
      if (face && !run) run = { y0: y, face };
    }
  }
  const up: V = [start.cx, start.y + start.h - 1.1];
  const down: V = [end.cx, end.cy];
  return {
    w, h, grid, rooms, start, end, up, upSpawn: [start.cx, start.y + start.h - 3.4], down, downSpawn: [end.cx, end.cy - 2.6], torches, walls,
  };
}
