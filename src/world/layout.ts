/**
 * The world map: a fixed layout (village, plain, roads, ponds, camps, shrines, the guardian's arena)
 * plus noise-driven scenery. Deterministic: the same world every time.
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
  village: { id: 'village', name: { fr: 'Le Village', en: 'The Village' }, palette: 'orchard', music: 'orchard' },
  plain: { id: 'plain', name: { fr: 'La Plaine des pruniers', en: 'The Plum Plain' }, palette: 'orchard', music: 'storm' },
  arena: { id: 'arena', name: { fr: 'Le Cercle de pierres', en: 'The Stone Circle' }, palette: 'storm', music: 'storm' },
};

export const VILLAGE = { x: 22, y: 62, r: 15 };
export const ARENA = { x: 164, y: 62, r: 11 };

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

/** The main road, west to east. */
export const ROAD: V[] = [
  [4, 62], [14, 61], [22, 62], [34, 60], [46, 63], [58, 68], [70, 66], [82, 59], [94, 54], [106, 56], [118, 63], [130, 68], [142, 66], [154, 62], [164, 62],
];

/** Side paths to shrines and camps. */
export const PATHS: V[][] = [
  [[82, 59], [86, 50], [88, 42]],
  [[118, 63], [124, 72], [128, 80]],
  [[46, 63], [44, 76], [40, 88]],
  [[70, 66], [74, 80], [72, 94]],
  [[94, 54], [96, 40], [100, 30]],
];

export const SHRINES: ShrineDef[] = [
  { id: 0, x: 24, y: 63.5 },
  { id: 1, x: 88, y: 43 },
  { id: 2, x: 128, y: 79 },
  { id: 3, x: 150, y: 64.5 },
];

export const CAMPS: CampDef[] = [
  { id: 0, x: 50, y: 54, r: 4, tier: 1, members: ['blot', 'blot', 'blot'], elites: 0 },
  { id: 1, x: 56, y: 76, r: 5, tier: 1, members: ['mite', 'mite', 'mite', 'mite', 'mite', 'blot'], elites: 0 },
  { id: 2, x: 38, y: 90, r: 5, tier: 1, members: ['blot', 'blot', 'wisp', 'blot'], elites: 0 },
  { id: 3, x: 66, y: 54, r: 5, tier: 1, members: ['blot', 'blot', 'blot', 'wisp'], elites: 1 },
  { id: 4, x: 76, y: 92, r: 6, tier: 2, members: ['totem', 'blot', 'blot', 'mite', 'mite', 'mite'], elites: 0 },
  { id: 5, x: 80, y: 72, r: 5, tier: 2, members: ['splitter', 'blot', 'wisp', 'wisp'], elites: 0 },
  { id: 6, x: 98, y: 32, r: 6, tier: 2, members: ['splitter', 'splitter', 'mite', 'mite', 'mite', 'mite'], elites: 1 },
  { id: 7, x: 104, y: 66, r: 5, tier: 2, members: ['brute', 'blot', 'blot', 'wisp'], elites: 0 },
  { id: 8, x: 112, y: 46, r: 6, tier: 3, members: ['totem', 'wisp', 'wisp', 'blot', 'blot'], elites: 1 },
  { id: 9, x: 120, y: 86, r: 6, tier: 3, members: ['brute', 'splitter', 'mite', 'mite', 'mite', 'mite', 'mite'], elites: 1 },
  { id: 10, x: 138, y: 54, r: 6, tier: 3, members: ['brute', 'brute', 'wisp', 'wisp', 'blot'], elites: 1 },
  { id: 11, x: 140, y: 78, r: 6, tier: 3, members: ['totem', 'splitter', 'wisp', 'blot', 'blot'], elites: 2 },
];

export const PONDS: PondDef[] = (() => {
  const r = new Rng(31337);
  const out: PondDef[] = [];
  const fixed: V[] = [[32, 74], [62, 44], [92, 78], [108, 26], [126, 40], [146, 90], [58, 98], [150, 40], [86, 104], [30, 44]];
  for (const [x, y] of fixed) out.push({ x, y, rx: r.range(2.5, 4.5), ry: r.range(1.6, 2.6), seed: r.int(1, 1e6) });
  return out;
})();

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
  return 'plain';
}

/** Places where nothing tall may grow. */
export function isClearing(x: number, y: number): boolean {
  if (roadDist(x, y) < 2.4) return true;
  if (Math.hypot(x - VILLAGE.x, y - VILLAGE.y) < 9) return true;
  if (Math.hypot(x - ARENA.x, y - ARENA.y) < ARENA.r + 1.5) return true;
  for (const c of CAMPS) if (Math.hypot(x - c.x, y - c.y) < c.r + 2) return true;
  for (const s of SHRINES) if (Math.hypot(x - s.x, y - s.y) < 3) return true;
  for (const p of PONDS) if (((x - p.x) / (p.rx + 1.5)) ** 2 + ((y - p.y) / (p.ry + 1.5)) ** 2 < 1) return true;
  return false;
}

/** 0..1 forest density: woods along the edges and in patches. */
export function forestDensity(x: number, y: number): number {
  const n = noise(91).fbm(x * 0.045, y * 0.045, 3) * 0.5 + 0.5;
  const edge = Math.min(x, y, WORLD.w - x, WORLD.h - y);
  const edgeBoost = edge < 10 ? (10 - edge) / 10 : 0;
  return Math.min(1, Math.max(0, (n - 0.52) * 2.6) + edgeBoost * 1.2);
}

/** Per-cell deterministic randomness. */
export function cellRng(ix: number, iy: number, salt: number): Rng {
  return new Rng(((ix * 73856093) ^ (iy * 19349663) ^ (salt * 83492791)) >>> 0);
}
