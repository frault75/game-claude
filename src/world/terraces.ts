/**
 * Act II: the Rice Terraces of the Jade Mist. In from the west through the Misty Pass; terraced
 * paddies on the great hill; the Reed Village by the lake shore; the Lotus Lake to the south-east;
 * the Bamboo Grove to the north-east; the Sky Pagoda at the top of the northern stair.
 */
import type { Land, PondDef, Region, V } from './land';
import type { Fixed, CampDef } from './layout';
import { INK, PIG_A, PIG_B, mixPig, pigStyle } from '../gfx/paint';
import { stroke } from '../gfx/brush';
import { washBlob, washPoly, noisyOutline } from '../gfx/wash';
import { stampAt } from './stamps';
import { noise } from '../gfx/noise';
import { Rng } from '../gfx/rng';
import { closestOnSeg } from '../game/physics';
import { cellRng } from './layout';
import { placeFixed } from './act1';

export const T2 = { w: 200, h: 150, chunk: 16 };
export const T2_NORTH = 142;
export const T2_VILLAGE = { x: 118, y: 44, r: 14 };
export const T2_LAKE = { x: 162, y: 28, rx: 22, ry: 13 };
export const T2_HILL = { x: 70, y: 86 };
export const T2_PAGODA = { x: 100, y: 136 };
/** Where the pass meets Act I's valley. */
export const T2_ENTRY: V = [5, 70];

export const T2_ROADS: { pts: V[]; w: number }[] = [
  { pts: [[1, 70], [12, 74], [24, 70], [36, 74], [48, 72], [60, 64], [76, 58], [92, 52], [106, 47], [118, 45]], w: 2.6 },
  { pts: [[118, 45], [131, 40], [144, 37]], w: 2.2 },
  { pts: [[106, 47], [102, 64], [96, 82], [100, 100], [100, 118], [100, 133]], w: 2.2 },
  { pts: [[76, 58], [70, 72], [74, 96], [88, 104], [100, 100]], w: 1.7 },
  { pts: [[100, 102], [118, 108], [136, 113], [154, 118]], w: 1.7 },
];

/** The stream from the north, along the hill's east flank, into the lake. */
const STREAM: V[] = [[128, 151], [124, 132], [130, 114], [124, 98], [128, 82], [122, 66], [126, 54], [138, 48], [149, 43], [156, 36]];
export const T2_STREAM_HALF = 1.4;
export const T2_STREAM = (() => {
  const out: { x: number; y: number; nx: number; ny: number }[] = [];
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [ax, ay] = STREAM[i], [bx, by] = STREAM[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    const n = Math.ceil(L / 0.5);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      out.push({ x: x + noise(157).get(x * 0.15, y * 0.15) * 0.9, y, nx: 0, ny: 0 });
    }
  }
  out.push({ x: STREAM[STREAM.length - 1][0], y: STREAM[STREAM.length - 1][1], nx: 0, ny: 0 });
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 2)], b = out[Math.min(out.length - 1, i + 2)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    out[i].nx = -dy / l;
    out[i].ny = dx / l;
  }
  return out;
})();
export const T2_BRIDGE = { x: 129.6, y: 111, x0: 126, x1: 133.4, half: 1.35 };

export function streamDist(x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < T2_STREAM.length; i += 2) {
    const s = T2_STREAM[i];
    if (Math.abs(s.y - y) > 8) continue;
    best = Math.min(best, Math.hypot(x - s.x, y - s.y));
  }
  return best;
}

export const T2_PONDS: PondDef[] = [
  { ...T2_LAKE, seed: 2201 },
  { x: 40, y: 96, rx: 3.6, ry: 2.2, seed: 2202 },
  { x: 150, y: 76, rx: 4.2, ry: 2.6, seed: 2203 },
  { x: 86, y: 30, rx: 4, ry: 2.4, seed: 2204 },
  { x: 182, y: 70, rx: 3.4, ry: 2.2, seed: 2205 },
];

export const T2_REGIONS: Record<string, Region> = {
  pass: { id: 'pass', name: { fr: 'Le Col des Brumes', en: 'The Misty Pass' }, palette: 'pass', music: 'pass' },
  terraces: { id: 'terraces', name: { fr: 'Les Terrasses de Jade', en: 'The Jade Terraces' }, palette: 'terraces', music: 'terraces' },
  reeds: { id: 'reeds', name: { fr: 'Le Village des Roseaux', en: 'The Reed Village' }, palette: 'terraces', music: 'reeds' },
  lake: { id: 'lake', name: { fr: 'Le Lac aux Lotus', en: 'The Lotus Lake' }, palette: 'lake', music: 'lake' },
  bamboo: { id: 'bamboo', name: { fr: 'La Bambouseraie', en: 'The Bamboo Grove' }, palette: 'bamboo', music: 'bamboo' },
  pagoda: { id: 'pagoda', name: { fr: 'Le Parvis de la Pagode', en: 'The Pagoda Court' }, palette: 'pagoda', music: 'pagoda' },
};

export function t2RegionAt(x: number, y: number): string {
  if (Math.hypot(x - T2_VILLAGE.x, y - T2_VILLAGE.y) < T2_VILLAGE.r) return 'reeds';
  if (Math.hypot(x - T2_PAGODA.x, y - T2_PAGODA.y) < 14) return 'pagoda';
  if (((x - T2_LAKE.x) / (T2_LAKE.rx + 9)) ** 2 + ((y - T2_LAKE.y) / (T2_LAKE.ry + 9)) ** 2 < 1) return 'lake';
  if (x < 42) return 'pass';
  if (x > 138 && y > 86) return 'bamboo';
  return 'terraces';
}

export const T2_CAMPS: CampDef[] = [
  { id: 100, x: 20, y: 84, r: 5, tier: 3, members: ['goat', 'goat', 'wraith'], elites: 0 },
  { id: 101, x: 32, y: 60, r: 5, tier: 3, members: ['goat', 'wraith', 'wisp', 'goat'], elites: 1 },
  { id: 102, x: 58, y: 98, r: 5, tier: 3, members: ['frog', 'frog', 'frog', 'wisp'], elites: 0 },
  { id: 103, x: 86, y: 108, r: 5, tier: 3, members: ['frog', 'frog', 'splitter'], elites: 1 },
  { id: 104, x: 88, y: 74, r: 5, tier: 3, members: ['frog', 'wraith', 'frog', 'frog'], elites: 0 },
  { id: 105, x: 52, y: 74, r: 5, tier: 3, members: ['frog', 'goat', 'frog'], elites: 1 },
  { id: 106, x: 156, y: 102, r: 5, tier: 4, members: ['mantis', 'mantis', 'wraith'], elites: 0 },
  { id: 107, x: 178, y: 122, r: 6, tier: 4, members: ['mantis', 'mantis', 'mantis', 'wraith'], elites: 1 },
  { id: 108, x: 170, y: 96, r: 5, tier: 4, members: ['mantis', 'frog', 'mantis'], elites: 0 },
  { id: 109, x: 138, y: 18, r: 5, tier: 3, members: ['frog', 'frog', 'wisp', 'frog'], elites: 0 },
  { id: 110, x: 186, y: 44, r: 5, tier: 4, members: ['frog', 'mantis', 'wraith'], elites: 1 },
  { id: 111, x: 90, y: 124, r: 5, tier: 4, members: ['goat', 'wraith', 'brute'], elites: 1 },
  { id: 112, x: 112, y: 126, r: 5, tier: 4, members: ['wraith', 'wraith', 'mantis'], elites: 0 },
  { id: 113, x: 146, y: 47, r: 4, tier: 3, members: ['frog', 'frog', 'frog'], elites: 0 },
];

export const T2_SHRINES = [
  { id: 10, x: 10, y: 77 },
  { id: 11, x: 112, y: 51 },
  { id: 12, x: 72, y: 66 },
  { id: 13, x: 148, y: 112 },
  { id: 14, x: 98, y: 126 },
];

/** The three sluices of the terraces (main quest): where water is let down the hill. */
export const T2_SLUICES: V[] = [[54, 104], [92, 98], [64, 64]];

/** Terrace bands: elliptic arcs around the hill (radius, from-angle, to-angle). */
const BANDS: { r: number; a0: number; a1: number }[] = [];
for (let r = 8; r <= 30; r += 3.2) {
  // gaps where the stairs and the road cross the hill
  BANDS.push({ r, a0: -2.6, a1: -0.55 }, { r, a0: -0.25, a1: 1.15 }, { r, a0: 1.45, a1: 2.85 });
}
const bandPt = (r: number, a: number): V => [T2_HILL.x + Math.cos(a) * r * 1.15, T2_HILL.y + Math.sin(a) * r * 0.85];
function onTerraces(x: number, y: number): boolean {
  const dx = (x - T2_HILL.x) / 1.15, dy = (y - T2_HILL.y) / 0.85;
  const d = Math.hypot(dx, dy);
  return d > 6.5 && d < 32;
}

export const T2_FIXED: Fixed[] = (() => {
  const f: Fixed[] = [
    // the Reed Village
    { kind: 'house', x: 110, y: 40, v: 0 },
    { kind: 'house', x: 124, y: 38, v: 2, flip: true },
    { kind: 'hut', x: 129, y: 48, v: 1 },
    { kind: 'house', x: 108, y: 52, v: 1, flip: true },
    { kind: 'hut', x: 126, y: 54, v: 0 },
    { kind: 'stallFood', x: 115, y: 36.6 },
    { kind: 'stallPots', x: 121, y: 44.6 },
    { kind: 'well', x: 117.5, y: 48.5 },
    { kind: 'lamp', x: 106.5, y: 45 },
    { kind: 'lamp', x: 130.5, y: 43 },
    { kind: 'fence', x: 103, y: 37, v: 3 }, { kind: 'fence', x: 106.5, y: 36.8, v: 3 },
    // the pagoda's gate and old pillars on the stair
    { kind: 'templeGate', x: T2_PAGODA.x, y: T2_PAGODA.y },
    { kind: 'pillar', x: 96, y: 128 }, { kind: 'pillar', x: 104, y: 128 }, { kind: 'pillar', x: 96, y: 118 }, { kind: 'pillar', x: 104, y: 118 },
    // ruins in the pass and by the lake
    { kind: 'broken', x: 26, y: 78, v: 1 }, { kind: 'ruinWall', x: 30, y: 66, v: 0 },
    { kind: 'broken', x: 176, y: 20, v: 2 }, { kind: 'ruinWall', x: 146, y: 14, v: 1 },
  ];
  for (let x = 6, i = 0; x < T2.w; x += 22, i++) f.push({ kind: 'mountains', x, y: T2_NORTH + 0.3 + (i % 2) * 1.2, v: i % 3, flip: i % 2 === 1 });
  return f;
})();

function roadDist(x: number, y: number): number {
  let best = Infinity;
  for (const r of T2_ROADS) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [cx, cy] = closestOnSeg(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      best = Math.min(best, Math.hypot(x - cx, y - cy));
    }
  }
  return best;
}

function forestDensity(x: number, y: number): number {
  const n = noise(191).fbm(x * 0.05, y * 0.05, 3) * 0.5 + 0.5;
  const edge = Math.min(x, y, T2.w - x, T2_NORTH - y);
  const edgeBoost = edge < 10 ? (10 - edge) / 10 : 0;
  let d = Math.max(0, (n - 0.5) * 2.4) + edgeBoost * 1.2;
  // the pass: steep slopes of pines either side of the road
  if (x < 42) d += Math.max(0, 0.9 - roadDist(x, y) * 0.12);
  // the grove: bamboo almost everywhere
  if (x > 138 && y > 86) d = Math.max(d, 0.85);
  return Math.min(1, d);
}

function isClearing(x: number, y: number): boolean {
  if (roadDist(x, y) < 2.4) return true;
  if (y > T2_NORTH - 2) return true;
  if (Math.hypot(x - T2_VILLAGE.x, y - T2_VILLAGE.y) < T2_VILLAGE.r - 1) return true;
  if (Math.hypot(x - T2_PAGODA.x, y - T2_PAGODA.y) < 9) return true;
  if (onTerraces(x, y)) return true;
  if (streamDist(x, y) < T2_STREAM_HALF + 2) return true;
  for (const c of T2_CAMPS) if (Math.hypot(x - c.x, y - c.y) < c.r + 2) return true;
  for (const s of T2_SHRINES) if (Math.hypot(x - s.x, y - s.y) < 3) return true;
  for (const s of T2_SLUICES) if (Math.hypot(x - s[0], y - s[1]) < 3) return true;
  for (const p of T2_PONDS) if (((x - p.x) / (p.rx + 1.5)) ** 2 + ((y - p.y) / (p.ry + 1.5)) ** 2 < 1) return true;
  for (const f of T2_FIXED) if (f.kind !== 'mountains' && f.kind !== 'fence' && Math.hypot(x - f.x, y - f.y) < 3) return true;
  if (Math.hypot(x - T2_ENTRY[0], y - T2_ENTRY[1]) < 5) return true;
  return false;
}

export const TERRACES: Land = {
  id: 'terraces',
  w: T2.w,
  h: T2.h,
  chunk: T2.chunk,
  roads: T2_ROADS,
  ponds: T2_PONDS,
  paddies: [],
  // the stream thins out as it melts into the lake
  river: { samples: T2_STREAM, half: (i) => T2_STREAM_HALF * Math.max(0.05, Math.min(1, (T2_STREAM.length - 1 - i) / 16)) },
  bridge: T2_BRIDGE,
  camps: T2_CAMPS,
  shrines: T2_SHRINES,
  regions: T2_REGIONS,
  forestDensity,
  isClearing,
  regionAt: t2RegionAt,
  roadDist,
  species: (x, y, n, r, A) => {
    if (x > 138 && y > 86) return A.bamboo;
    if (x < 42) return r.chance(0.8) ? A.pine : A.willow;
    if (t2RegionAt(x, y) === 'lake') return r.chance(0.6) ? A.willow : A.plum;
    return n > 0.2 ? A.pine : n < -0.3 ? A.bamboo : r.chance(0.3) ? A.willow : A.plum;
  },
  washPig: (reg, r) => (reg === 'pass' ? (r.chance(0.6) ? INK : PIG_A) : reg === 'bamboo' || reg === 'terraces' ? (r.chance(0.7) ? PIG_A : PIG_B) : r.chance(0.6) ? PIG_B : PIG_A),
  ground(g, x0, y0, S, st) {
    const M = 4;
    const near = (x: number, y: number, rr: number) => x + rr > x0 - M && x - rr < x0 + S + M && y + rr > y0 - M && y - rr < y0 + S + M;
    // the terraces: flooded bands on the hill, each with its bank and its shoots
    if (near(T2_HILL.x, T2_HILL.y, 38)) {
      BANDS.forEach((b, bi) => {
        const n = Math.max(6, Math.round((b.a1 - b.a0) * b.r));
        const inner: V[] = [], outer: V[] = [];
        for (let k = 0; k <= n; k++) {
          const a = b.a0 + ((b.a1 - b.a0) * k) / n;
          inner.push(bandPt(b.r - 1.15, a));
          outer.push(bandPt(b.r + 0.95, a));
        }
        const all = [...inner, ...outer.slice().reverse()];
        if (!all.some(([x, y]) => near(x, y, 1))) return;
        g.ctx.fillStyle = pigStyle(mixPig(INK, PIG_B, 0.6), 0.13 + (bi % 3) * 0.02);
        g.ctx.beginPath();
        all.forEach((q, i) => (i === 0 ? g.ctx.moveTo(q[0], q[1]) : g.ctx.lineTo(q[0], q[1])));
        g.ctx.closePath();
        g.ctx.fill();
        stroke(g, outer, { width: 0.18, load: 0.55, dry: 0.6, seed: 2300 + bi, taperStart: 0.02, taperEnd: 0.02, press: 0 });
        stroke(g, inner, { width: 0.08, load: 0.35, dry: 0.7, seed: 2400 + bi, taperStart: 0.05, taperEnd: 0.05, press: 0 });
        const r = cellRng(bi, 5, 2500);
        for (let k = 0; k <= n * 2; k++) {
          const a = b.a0 + ((b.a1 - b.a0) * k) / (n * 2);
          const [x, y] = bandPt(b.r - 0.1 + r.gauss() * 0.3, a);
          if (x < x0 - 1 || x > x0 + S + 1 || y < y0 - 1 || y > y0 + S + 1) continue;
          stampAt(g, st.shoots[r.int(0, st.shoots.length - 1)], x, y, r.chance(0.5), 0.9);
        }
      });
    }
    // sluices: a stone basin and a wooden gate at the top of a channel
    for (const [sx, sy] of T2_SLUICES) {
      if (!near(sx, sy, 3)) continue;
      washPoly(g, noisyOutline(sx, sy - 0.6, 1.6, 0.9, 0.12, Math.round(sx * 7)), { pig: mixPig(INK, PIG_B, 0.5), density: 0.25, soft: 0.2, seed: Math.round(sx * 7) });
      stroke(g, [[sx, sy - 1.2], [sx - 0.3, sy - 4], [sx + 0.2, sy - 7]], { width: 0.5, pig: mixPig(INK, PIG_B, 0.6), load: 0.3, dry: 0.6, seed: Math.round(sy * 9), taperStart: 0.05, taperEnd: 0.6 });
    }
    // the village square and the pagoda court: trodden earth and flagstones
    for (const [cx, cy, rr, seed] of [[T2_VILLAGE.x, T2_VILLAGE.y, 7, 2601], [T2_PAGODA.x, T2_PAGODA.y - 4, 6, 2602]] as [number, number, number, number][]) {
      if (!near(cx, cy, rr + 2)) continue;
      washBlob(g, cx, cy, rr, rr * 0.7, { pig: INK, density: 0.05, soft: 0.8, seed });
      const r = new Rng(seed);
      for (let i = 0; i < 70; i++) {
        const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * rr;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.75;
        if (x < x0 - 1 || x > x0 + S + 1 || y < y0 - 1 || y > y0 + S + 1) continue;
        stampAt(g, st.stones[r.int(0, st.stones.length - 1)], x, y, r.chance(0.5), 0.8);
      }
    }
    // lotus leaves floating near the lake shore
    if (near(T2_LAKE.x, T2_LAKE.y, T2_LAKE.rx + 2)) {
      const r = new Rng(2701);
      for (let i = 0; i < 90; i++) {
        const a = r.range(0, Math.PI * 2), d = r.range(0.55, 0.92);
        const x = T2_LAKE.x + Math.cos(a) * T2_LAKE.rx * d, y = T2_LAKE.y + Math.sin(a) * T2_LAKE.ry * d;
        if (x < x0 - 1 || x > x0 + S + 1 || y < y0 - 1 || y > y0 + S + 1) continue;
        washBlob(g, x, y, r.range(0.35, 0.7), r.range(0.22, 0.4), { pig: mixPig(INK, PIG_A, 0.7), density: 0.28, soft: 0.15, seed: r.int(1, 1e6) });
        if (r.chance(0.15)) g.dab(x + 0.2, y + 0.15, 0.18, PIG_A, 0.6, 0.4);
      }
    }
    // the north: mountain foot
    if (y0 + S > T2_NORTH - 3) {
      washPoly(g, [[x0 - 1, T2_NORTH - 1.5], [x0 + S + 1, T2_NORTH - 1.5], [x0 + S + 1, T2.h + 1], [x0 - 1, T2.h + 1]], { pig: mixPig(INK, PIG_B, 0.4), density: 0.1, soft: 0.7, seed: 2751 });
    }
  },
  props(h, A) {
    placeFixed(h, A, T2_FIXED);
  },
};
