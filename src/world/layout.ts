/**
 * The world map: Willow Hamlet and its orchard west of the river, the old bridge, the Plum Plain,
 * the Stone Circle, the Firefly Cave to the north and the Sunken Temple to the south.
 * Fixed layout plus noise-driven scenery. Deterministic: the same world every time.
 */
import { noise } from '../gfx/noise';
import { Rng } from '../gfx/rng';
import { closestOnSeg } from '../game/physics';

export type V = [number, number];

export const WORLD = { w: 184, h: 124, chunk: 16 };

export interface Region {
  id: string;
  name: { fr: string; en: string };
  palette: string;
  music: string;
}

export const REGIONS: Record<string, Region> = {
  village: { id: 'village', name: { fr: 'Le Hameau des Saules', en: 'Willow Hamlet' }, palette: 'orchard', music: 'orchard' },
  orchard: { id: 'orchard', name: { fr: 'Le Verger', en: 'The Orchard' }, palette: 'orchard', music: 'river' },
  plain: { id: 'plain', name: { fr: 'La Plaine des pruniers', en: 'The Plum Plain' }, palette: 'orchard', music: 'storm' },
  arena: { id: 'arena', name: { fr: 'Le Cercle de pierres', en: 'The Stone Circle' }, palette: 'storm', music: 'storm' },
  cave: { id: 'cave', name: { fr: 'La Grotte aux lucioles', en: 'The Firefly Cave' }, palette: 'orchard', music: 'river' },
  temple: { id: 'temple', name: { fr: 'Le Temple englouti', en: 'The Sunken Temple' }, palette: 'orchard', music: 'storm' },
};

export const VILLAGE = { x: 22, y: 62, r: 15 };
export const ARENA = { x: 164, y: 62, r: 11 };
/** The cave mouth faces south; walking into it leads down. */
export const CAVE = { x: 34, y: 106 };
/** The temple's steps go down, north of the pool. */
export const TEMPLE = { x: 124, y: 16 };
/** The old bridge across the river, on the main road. */
export const BRIDGE = { x: 75, y: 64, x0: 70.5, x1: 79.5, half: 1.45 };
/** Mountains close the north edge. */
export const NORTH_WALL = 113.5;

export type EnemyKind = 'blot' | 'mite' | 'wisp' | 'splitter' | 'brute' | 'totem';

export interface CampDef {
  id: number;
  x: number;
  y: number;
  r: number;
  tier: number;
  members: EnemyKind[];
  elites: number;
}

export interface ShrineDef {
  id: number;
  x: number;
  y: number;
}

export interface PondDef {
  x: number;
  y: number;
  rx: number;
  ry: number;
  seed: number;
}

/** The main road, west to east (straight over the bridge). */
export const ROAD: V[] = [
  [4, 62], [14, 61], [22, 62], [34, 60], [46, 63], [58, 66], [66, 64], [84, 64], [94, 56], [106, 56], [118, 63], [130, 68], [142, 66], [154, 62], [164, 62],
];

/** Side paths to shrines, camps, the cave and the temple. */
export const PATHS: V[][] = [
  [[84, 64], [86, 50], [88, 42]],
  [[118, 63], [124, 72], [128, 80]],
  [[46, 63], [44, 76], [40, 88], [37, 98], [34, 104]],
  [[58, 66], [58, 78], [56, 86]],
  [[94, 56], [96, 40], [100, 30]],
  [[106, 56], [110, 42], [116, 28], [115.5, 17], [120, 12.5], [124, 12.8]],
  [[22, 62], [22, 50], [16, 46]],
];

/** The river, north to south. */
export const RIVER: V[] = [
  [64, 125], [67, 114], [72, 104], [70, 94], [74, 84], [73, 74], [75, 64], [73, 54], [76, 44], [72, 34], [74, 24], [70, 12], [71, -1],
];
export const RIVER_HALF = 2.2;

export const SHRINES: ShrineDef[] = [
  { id: 0, x: 24, y: 58.2 },
  { id: 1, x: 88, y: 43 },
  { id: 2, x: 128, y: 79 },
  { id: 3, x: 150, y: 64.5 },
];

export const CAMPS: CampDef[] = [
  { id: 0, x: 50, y: 54, r: 4, tier: 1, members: ['blot', 'blot', 'blot'], elites: 0 },
  { id: 1, x: 58, y: 76, r: 5, tier: 1, members: ['mite', 'mite', 'mite', 'mite', 'mite', 'blot'], elites: 0 },
  { id: 2, x: 42, y: 92, r: 5, tier: 1, members: ['blot', 'blot', 'wisp', 'blot'], elites: 0 },
  { id: 3, x: 64, y: 54, r: 5, tier: 1, members: ['blot', 'blot', 'blot', 'wisp'], elites: 1 },
  { id: 4, x: 82, y: 92, r: 6, tier: 2, members: ['totem', 'blot', 'blot', 'mite', 'mite', 'mite'], elites: 0 },
  { id: 5, x: 86, y: 74, r: 5, tier: 2, members: ['splitter', 'blot', 'wisp', 'wisp'], elites: 0 },
  { id: 6, x: 98, y: 32, r: 6, tier: 2, members: ['splitter', 'splitter', 'mite', 'mite', 'mite', 'mite'], elites: 1 },
  { id: 7, x: 104, y: 68, r: 5, tier: 2, members: ['brute', 'blot', 'blot', 'wisp'], elites: 0 },
  { id: 8, x: 112, y: 46, r: 6, tier: 3, members: ['totem', 'wisp', 'wisp', 'blot', 'blot'], elites: 1 },
  { id: 9, x: 120, y: 90, r: 6, tier: 3, members: ['brute', 'splitter', 'mite', 'mite', 'mite', 'mite', 'mite'], elites: 1 },
  { id: 10, x: 138, y: 54, r: 6, tier: 3, members: ['brute', 'brute', 'wisp', 'wisp', 'blot'], elites: 1 },
  { id: 11, x: 140, y: 80, r: 6, tier: 3, members: ['totem', 'splitter', 'wisp', 'blot', 'blot'], elites: 2 },
  { id: 12, x: 134, y: 26, r: 6, tier: 3, members: ['splitter', 'wisp', 'wisp', 'mite', 'mite', 'mite'], elites: 1 },
  { id: 13, x: 158, y: 96, r: 6, tier: 3, members: ['totem', 'brute', 'wisp', 'blot'], elites: 1 },
];

/** Camps the first quest asks for: the orchard east of the hamlet. */
export const ORCHARD_CAMPS = [0, 1, 3];

export const PONDS: PondDef[] = (() => {
  const r = new Rng(31337);
  const out: PondDef[] = [];
  const fixed: V[] = [[32, 76], [56, 44], [96, 80], [104, 22], [126, 40], [146, 90], [50, 100], [150, 40], [92, 104], [30, 44], [170, 30]];
  for (const [x, y] of fixed) out.push({ x, y, rx: r.range(2.5, 4.5), ry: r.range(1.6, 2.6), seed: r.int(1, 1e6) });
  return out;
})();

/** Flooded rice paddies south-west of the hamlet. */
export const PADDIES: { x: number; y: number; w: number; h: number }[] = [
  { x: 5, y: 41, w: 7, h: 4.5 }, { x: 13, y: 40, w: 6.5, h: 4 }, { x: 5, y: 47, w: 6, h: 4 }, { x: 26, y: 40.5, w: 6, h: 4.2 },
];

export type FixedKind =
  | 'house' | 'hut' | 'stallDyer' | 'stallFood' | 'stallPots' | 'well' | 'fence' | 'gate' | 'lamp'
  | 'bigWillow' | 'railN' | 'railS' | 'cave' | 'templeGate' | 'pillar' | 'broken' | 'ruinWall' | 'mountains';

export interface Fixed {
  kind: FixedKind;
  x: number;
  y: number;
  v?: number;
  flip?: boolean;
}

/** Hand-placed things: the hamlet, the bridge, entrances, ruins, mountains. */
export const FIXED: Fixed[] = (() => {
  const f: Fixed[] = [
    // the hamlet
    { kind: 'bigWillow', x: 18.5, y: 71.5 },
    { kind: 'house', x: 28.5, y: 68.5, v: 0 },
    { kind: 'hut', x: 10.5, y: 68.5, v: 0 },
    { kind: 'house', x: 13.5, y: 53.5, v: 1, flip: true },
    { kind: 'house', x: 31, y: 53, v: 2 },
    { kind: 'hut', x: 6, y: 58, v: 1, flip: true },
    { kind: 'stallDyer', x: 29.5, y: 63.6 },
    { kind: 'stallFood', x: 14, y: 64 },
    { kind: 'stallPots', x: 18.6, y: 56 },
    { kind: 'well', x: 22.5, y: 65 },
    { kind: 'gate', x: 38, y: 60.4 },
    { kind: 'lamp', x: 33.6, y: 63.4 },
    { kind: 'lamp', x: 11, y: 60.6 },
    { kind: 'fence', x: 13, y: 75, v: 3 }, { kind: 'fence', x: 16.5, y: 75, v: 3 }, { kind: 'fence', x: 23.5, y: 75.2, v: 3 },
    { kind: 'fence', x: 7.5, y: 51.2, v: 3 }, { kind: 'fence', x: 11, y: 51, v: 3 }, { kind: 'fence', x: 17.5, y: 46.2, v: 3 }, { kind: 'fence', x: 29, y: 46.4, v: 3 },
    // the old bridge
    { kind: 'railN', x: BRIDGE.x, y: BRIDGE.y + BRIDGE.half },
    { kind: 'railS', x: BRIDGE.x, y: BRIDGE.y - BRIDGE.half },
    // entrances
    { kind: 'cave', x: CAVE.x, y: CAVE.y },
    { kind: 'templeGate', x: TEMPLE.x, y: TEMPLE.y },
    // ruins in the plain
    { kind: 'pillar', x: 109, y: 76 }, { kind: 'broken', x: 114, y: 76.5, v: 1 }, { kind: 'pillar', x: 109, y: 80.5 }, { kind: 'broken', x: 114.5, y: 81, v: 2 },
    { kind: 'ruinWall', x: 111.5, y: 84.5, v: 0 },
    { kind: 'broken', x: 145, y: 100, v: 0 }, { kind: 'ruinWall', x: 149, y: 102, v: 1 }, { kind: 'broken', x: 152, y: 98.5, v: 3 },
    { kind: 'ruinWall', x: 94, y: 94, v: 1, flip: true }, { kind: 'broken', x: 97.5, y: 92, v: 4 },
    { kind: 'broken', x: 119.5, y: 22, v: 2 }, { kind: 'broken', x: 128.5, y: 21.5, v: 0 }, { kind: 'pillar', x: 119, y: 13 }, { kind: 'pillar', x: 129, y: 13.5 },
    { kind: 'ruinWall', x: 60, y: 98, v: 0 }, { kind: 'broken', x: 63, y: 100, v: 1 },
  ];
  for (let x = 6, i = 0; x < WORLD.w; x += 22, i++) f.push({ kind: 'mountains', x, y: NORTH_WALL + 0.3 + (i % 2) * 1.2, v: i % 3, flip: i % 2 === 1 });
  return f;
})();

/** Readable steles: the master's notebook (index into STELES). */
export const STELE_SPOTS: V[] = [
  [14.6, 58.8], [52, 67.5], [39.5, 96], [83.5, 67.5], [100, 48], [117, 24], [152, 71], [160, 104],
];

/** Where the villagers stand. */
export const NPC_SPOTS = {
  willow: [20.5, 68.6] as V,
  madder: [29.5, 62.2] as V,
  elm: [68.5, 66.2] as V,
  pip: [19, 61] as V,
  linden: [16, 49] as V,
};

/** Resampled river centreline with bank normals. */
export const RIVER_SAMPLES: { x: number; y: number; nx: number; ny: number }[] = (() => {
  const out: { x: number; y: number; nx: number; ny: number }[] = [];
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, ay] = RIVER[i], [bx, by] = RIVER[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    const n = Math.ceil(L / 0.5);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      const w = noise(57).get(x * 0.15, y * 0.15) * 1.2;
      out.push({ x: x + w, y, nx: 0, ny: 0 });
    }
  }
  out.push({ x: RIVER[RIVER.length - 1][0], y: RIVER[RIVER.length - 1][1], nx: 0, ny: 0 });
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 2)], b = out[Math.min(out.length - 1, i + 2)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    out[i].nx = -dy / l;
    out[i].ny = dx / l;
  }
  return out;
})();

/** Half width of the river at a sample (wider in places). */
export function riverHalf(i: number): number {
  const s = RIVER_SAMPLES[i];
  return RIVER_HALF + noise(58).get(s.x * 0.08, s.y * 0.08) * 0.6;
}

/** Distance to the river's centreline (approximate, from samples). */
export function riverDist(x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < RIVER_SAMPLES.length; i += 2) {
    const s = RIVER_SAMPLES[i];
    if (Math.abs(s.y - y) > 8) continue;
    best = Math.min(best, Math.hypot(x - s.x, y - s.y));
  }
  return best;
}

/** x of the river at a given y. */
export function riverX(y: number): number {
  let best = RIVER_SAMPLES[0];
  let bd = Infinity;
  for (const s of RIVER_SAMPLES) {
    const d = Math.abs(s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best.x;
}

/** Distance to the nearest road or path. */
export function roadDist(x: number, y: number): number {
  let best = Infinity;
  const check = (pts: V[]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [cx, cy] = closestOnSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      best = Math.min(best, Math.hypot(x - cx, y - cy));
    }
  };
  check(ROAD);
  for (const p of PATHS) check(p);
  return best;
}

export function regionAt(x: number, y: number): string {
  if (Math.hypot(x - VILLAGE.x, y - VILLAGE.y) < VILLAGE.r) return 'village';
  if (Math.hypot(x - ARENA.x, y - ARENA.y) < ARENA.r + 2) return 'arena';
  if (Math.hypot(x - CAVE.x, y - CAVE.y) < 9) return 'cave';
  if (Math.hypot(x - TEMPLE.x, y - TEMPLE.y) < 10) return 'temple';
  return x < riverX(y) ? 'orchard' : 'plain';
}

/** Places where nothing tall may grow. */
export function isClearing(x: number, y: number): boolean {
  if (roadDist(x, y) < 2.4) return true;
  if (Math.hypot(x - VILLAGE.x, y - VILLAGE.y) < 13) return true;
  if (Math.hypot(x - ARENA.x, y - ARENA.y) < ARENA.r + 1.5) return true;
  if (Math.hypot(x - CAVE.x, y - CAVE.y + 1) < 7) return true;
  if (Math.hypot(x - TEMPLE.x, y - TEMPLE.y) < 8) return true;
  if (y > NORTH_WALL - 2) return true;
  if (riverDist(x, y) < RIVER_HALF + 2) return true;
  for (const c of CAMPS) if (Math.hypot(x - c.x, y - c.y) < c.r + 2) return true;
  for (const s of SHRINES) if (Math.hypot(x - s.x, y - s.y) < 3) return true;
  for (const s of STELE_SPOTS) if (Math.hypot(x - s[0], y - s[1]) < 2) return true;
  for (const p of PONDS) if (((x - p.x) / (p.rx + 1.5)) ** 2 + ((y - p.y) / (p.ry + 1.5)) ** 2 < 1) return true;
  for (const p of PADDIES) if (x > p.x - 1.5 && x < p.x + p.w + 1.5 && y > p.y - 1.5 && y < p.y + p.h + 1.5) return true;
  for (const f of FIXED) if (f.kind !== 'mountains' && f.kind !== 'fence' && Math.hypot(x - f.x, y - f.y) < 3) return true;
  return false;
}

/** 0..1 forest density: woods along the edges and in patches. */
export function forestDensity(x: number, y: number): number {
  const n = noise(91).fbm(x * 0.045, y * 0.045, 3) * 0.5 + 0.5;
  const edge = Math.min(x, y, WORLD.w - x, NORTH_WALL - y);
  const edgeBoost = edge < 10 ? (10 - edge) / 10 : 0;
  return Math.min(1, Math.max(0, (n - 0.52) * 2.6) + edgeBoost * 1.2);
}

/** Per-cell deterministic randomness. */
export function cellRng(ix: number, iy: number, salt: number): Rng {
  return new Rng(((ix * 73856093) ^ (iy * 19349663) ^ (salt * 83492791)) >>> 0);
}
