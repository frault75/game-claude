/**
 * Act III: the White Peaks. Up the Cloud Stair from the terraces; the windswept slopes; the Hanging
 * Monastery; the Frost Forest to the west; the Glacier to the east, split by crevasses; the Erased
 * Valley to the north, where the paper itself is torn; the master's summit above it all.
 * Here the snow is the paper: the ink only paints its shadows.
 */
import type { Land, PondDef, Region, V } from './land';
import type { Fixed, CampDef } from './layout';
import { INK, PIG_A, PIG_B, mixPig } from '../gfx/paint';
import { stroke } from '../gfx/brush';
import { washBlob, washPoly, noisyOutline, roughen } from '../gfx/wash';
import { chasm } from '../gfx/gen/ground';
import { stampAt } from './stamps';
import { noise } from '../gfx/noise';
import { Rng } from '../gfx/rng';
import { closestOnSeg } from '../game/physics';
import { placeFixed } from './act1';

export const P3 = { w: 200, h: 160, chunk: 16 };
export const P3_NORTH = 152;
/** Where the Cloud Stair comes out of the clouds. */
export const P3_ENTRY: V = [100, 5];
export const P3_MONASTERY = { x: 100, y: 58, r: 14 };
export const P3_SUMMIT = { x: 100, y: 146 };
export const P3_LAKE = { x: 136, y: 30, rx: 9, ry: 5.5 };
/** The three Bells of the Peaks: in the Frost Forest, on the Glacier, in the Erased Valley. */
export const P3_BELLS: V[] = [[34, 106], [172, 100], [100, 128]];
/** The glacier bell stands on an island of ice, ringed by a crevasse. */
export const P3_ISLE = { x: 172, y: 100, r: 3.2, ring: 6 };

export const P3_ROADS: { pts: V[]; w: number }[] = [
  { pts: [[100, 0], [88, 10], [110, 18], [90, 27], [104, 36], [100, 46]], w: 2.4 },
  { pts: [[88, 60], [70, 68], [52, 82], [40, 100]], w: 1.8 },
  { pts: [[114, 60], [134, 66], [152, 76], [160, 90]], w: 1.8 },
  { pts: [[100, 72], [96, 88], [102, 104], [100, 118]], w: 1.8 },
  { pts: [[100, 134], [96, 140], [100, 146]], w: 1.6 },
];

export const P3_PONDS: PondDef[] = [{ ...P3_LAKE, seed: 3301 }];

export const P3_REGIONS: Record<string, Region> = {
  stair: { id: 'stair', name: { fr: 'L’Escalier des nuages', en: 'The Cloud Stair' }, palette: 'snow', music: 'peaks' },
  slopes: { id: 'slopes', name: { fr: 'Les Pentes du vent', en: 'The Windswept Slopes' }, palette: 'snow', music: 'peaks' },
  monastery: { id: 'monastery', name: { fr: 'Le Monastère suspendu', en: 'The Hanging Monastery' }, palette: 'monastery', music: 'monastery' },
  forest: { id: 'forest', name: { fr: 'La Forêt de givre', en: 'The Frost Forest' }, palette: 'frost', music: 'frost' },
  glacier: { id: 'glacier', name: { fr: 'Le Glacier', en: 'The Glacier' }, palette: 'glacier', music: 'glacier' },
  erased: { id: 'erased', name: { fr: 'La Vallée effacée', en: 'The Erased Valley' }, palette: 'erased', music: 'erased' },
  summit: { id: 'summit', name: { fr: 'Le Sommet du maître', en: 'The Master’s Summit' }, palette: 'summit', music: 'summit' },
};

export function p3RegionAt(x: number, y: number): string {
  if (Math.hypot(x - P3_MONASTERY.x, y - P3_MONASTERY.y) < P3_MONASTERY.r) return 'monastery';
  if (Math.hypot(x - P3_SUMMIT.x, y - P3_SUMMIT.y) < 10) return 'summit';
  if (y < 40) return 'stair';
  if (x < 68) return 'forest';
  if (x > 138) return 'glacier';
  if (y > 108) return 'erased';
  return 'slopes';
}

/** The crevasses of the glacier: long cracks, and a ring around the bell's island. */
export const P3_CREVASSES: V[][] = (() => {
  const out: V[][] = [];
  const I = P3_ISLE;
  // the ring, in two halves (each a simple polygon)
  for (const [a0, a1] of [[0, Math.PI], [Math.PI, Math.PI * 2]]) {
    const outer: V[] = [], inner: V[] = [];
    for (let k = 0; k <= 16; k++) {
      const a = a0 + ((a1 - a0) * k) / 16;
      const wob = 1 + Math.sin(a * 5) * 0.06;
      outer.push([I.x + Math.cos(a) * I.ring * wob, I.y + Math.sin(a) * I.ring * 0.8 * wob]);
      inner.push([I.x + Math.cos(a) * (I.r + 0.2), I.y + Math.sin(a) * (I.r + 0.2) * 0.8]);
    }
    out.push([...outer, ...inner.reverse()]);
  }
  // long cracks across the ice, each with a gap somewhere to walk around
  const crack = (pts: V[], half: number) => {
    const l: V[] = [], r: V[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const h = half * (i === 0 || i === pts.length - 1 ? 0.2 : 1);
      l.push([pts[i][0] - (dy / d) * h, pts[i][1] + (dx / d) * h]);
      r.push([pts[i][0] + (dy / d) * h, pts[i][1] - (dx / d) * h]);
    }
    out.push([...l, ...r.reverse()]);
  };
  crack([[146, 52], [152, 58], [150, 66], [156, 72]], 0.9);
  crack([[164, 62], [172, 66], [180, 64], [188, 70]], 1.0);
  crack([[150, 110], [156, 116], [164, 114], [170, 120]], 0.9);
  crack([[180, 80], [186, 86], [192, 84]], 0.8);
  return out;
})();

/** Torn paper in the Erased Valley: holes into nothing. */
export const P3_TEARS: V[][] = (() => {
  const out: V[][] = [];
  const r = new Rng(3401);
  for (const [cx, cy, s] of [[82, 116, 2.2], [118, 112, 2.6], [90, 134, 1.8], [114, 132, 2.0], [76, 128, 1.6], [124, 124, 1.5]] as [number, number, number][]) {
    out.push(roughen(noisyOutline(cx, cy, s * 1.3, s * 0.8, 0.35, r.int(1, 1e6)), 0.05, r.int(1, 1e6), 0.25));
  }
  return out;
})();

export const P3_CAMPS: CampDef[] = [
  { id: 200, x: 80, y: 20, r: 5, tier: 4, members: ['crane', 'crane', 'snowfox'], elites: 0 },
  { id: 201, x: 120, y: 26, r: 5, tier: 4, members: ['yeti', 'crane'], elites: 0 },
  { id: 202, x: 44, y: 56, r: 5, tier: 4, members: ['snowfox', 'snowfox', 'yeti'], elites: 0 },
  { id: 203, x: 30, y: 82, r: 5, tier: 4, members: ['yeti', 'snowfox', 'snowfox'], elites: 1 },
  { id: 204, x: 54, y: 120, r: 6, tier: 5, members: ['yeti', 'yeti', 'snowfox'], elites: 1 },
  { id: 205, x: 150, y: 46, r: 5, tier: 4, members: ['crane', 'crane', 'crane'], elites: 0 },
  { id: 206, x: 166, y: 84, r: 5, tier: 5, members: ['yeti', 'crane', 'crane'], elites: 0 },
  { id: 207, x: 184, y: 128, r: 6, tier: 5, members: ['crane', 'yeti', 'snowfox'], elites: 1 },
  { id: 208, x: 84, y: 106, r: 5, tier: 5, members: ['eraser', 'eraser', 'crane'], elites: 0 },
  { id: 209, x: 120, y: 120, r: 5, tier: 5, members: ['eraser', 'eraser', 'eraser'], elites: 1 },
  { id: 210, x: 112, y: 92, r: 5, tier: 4, members: ['snowfox', 'crane', 'yeti'], elites: 0 },
  { id: 211, x: 22, y: 128, r: 5, tier: 5, members: ['snowfox', 'snowfox', 'snowfox', 'yeti'], elites: 1 },
];

export const P3_SHRINES = [
  { id: 20, x: 104, y: 9 },
  { id: 21, x: 108, y: 50 },
  { id: 22, x: 48, y: 94 },
  { id: 23, x: 148, y: 62 },
  { id: 24, x: 106, y: 102 },
];

export const P3_FIXED: Fixed[] = (() => {
  const M = P3_MONASTERY;
  const f: Fixed[] = [
    // the Hanging Monastery: halls on the cliff, a gate, lamps
    { kind: 'templeGate', x: M.x, y: M.y - 9 },
    { kind: 'house', x: M.x - 8, y: M.y + 3, v: 2 },
    { kind: 'house', x: M.x + 8, y: M.y + 4, v: 0, flip: true },
    { kind: 'house', x: M.x, y: M.y + 8, v: 1 },
    { kind: 'hut', x: M.x - 10, y: M.y - 4, v: 0 },
    { kind: 'hut', x: M.x + 11, y: M.y - 3, v: 1, flip: true },
    { kind: 'stallPots', x: M.x + 4, y: M.y - 2.4 },
    { kind: 'well', x: M.x - 3.5, y: M.y - 2 },
    { kind: 'lamp', x: M.x - 4, y: M.y - 7 }, { kind: 'lamp', x: M.x + 4, y: M.y - 7 },
    { kind: 'pillar', x: M.x - 6, y: M.y + 11 }, { kind: 'pillar', x: M.x + 6, y: M.y + 11 },
    // the master's hut at the summit
    { kind: 'hut', x: P3_SUMMIT.x, y: P3_SUMMIT.y + 1.5, v: 1 },
    // old ruins on the slopes and in the erased valley
    { kind: 'broken', x: 74, y: 44, v: 1 }, { kind: 'ruinWall', x: 128, y: 44, v: 0 },
    { kind: 'broken', x: 92, y: 120, v: 3 }, { kind: 'broken', x: 108, y: 114, v: 2 },
  ];
  for (let x = 6, i = 0; x < P3.w; x += 22, i++) f.push({ kind: 'mountains', x, y: P3_NORTH + 0.3 + (i % 2) * 1.2, v: i % 3, flip: i % 2 === 1 });
  return f;
})();

function roadDist(x: number, y: number): number {
  let best = Infinity;
  for (const r of P3_ROADS) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [cx, cy] = closestOnSeg(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      best = Math.min(best, Math.hypot(x - cx, y - cy));
    }
  }
  return best;
}

function inPoly(x: number, y: number, poly: V[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function forestDensity(x: number, y: number): number {
  const n = noise(311).fbm(x * 0.05, y * 0.05, 3) * 0.5 + 0.5;
  const edge = Math.min(x, y, P3.w - x, P3_NORTH - y);
  const edgeBoost = edge < 10 ? (10 - edge) / 10 : 0;
  let d = Math.max(0, (n - 0.55) * 2.2) * 0.7 + edgeBoost * 1.2;
  const reg = p3RegionAt(x, y);
  if (reg === 'forest') d = Math.max(d, 0.32 + n * 0.38);
  if (reg === 'glacier') d *= 0.15;
  if (reg === 'erased') d *= 0.35;
  return Math.min(1, d);
}

function isClearing(x: number, y: number): boolean {
  if (roadDist(x, y) < 2.4) return true;
  if (y > P3_NORTH - 2) return true;
  if (Math.hypot(x - P3_MONASTERY.x, y - P3_MONASTERY.y) < P3_MONASTERY.r - 1) return true;
  if (Math.hypot(x - P3_SUMMIT.x, y - P3_SUMMIT.y) < 7) return true;
  if (Math.hypot(x - P3_ENTRY[0], y - P3_ENTRY[1]) < 5) return true;
  for (const c of P3_CAMPS) if (Math.hypot(x - c.x, y - c.y) < c.r + 2) return true;
  for (const s of P3_SHRINES) if (Math.hypot(x - s.x, y - s.y) < 3) return true;
  // around the bells, and wide to the south: tall pines in front would hide them
  for (const b of P3_BELLS) {
    const dx = (x - b[0]) / 7.5, dy = y - b[1];
    if (dx * dx + (dy < 0 ? dy / 12 : dy / 6) ** 2 < 1) return true;
  }
  if (Math.hypot(x - P3_ISLE.x, y - P3_ISLE.y) < P3_ISLE.ring + 2) return true;
  for (const p of P3_PONDS) if (((x - p.x) / (p.rx + 1.5)) ** 2 + ((y - p.y) / (p.ry + 1.5)) ** 2 < 1) return true;
  for (const c of P3_CREVASSES) if (inPoly(x, y, c)) return true;
  for (const t of P3_TEARS) if (inPoly(x, y, t)) return true;
  for (const f of P3_FIXED) if (f.kind !== 'mountains' && f.kind !== 'fence' && Math.hypot(x - f.x, y - f.y) < 3) return true;
  return false;
}

export const PEAKS: Land = {
  id: 'peaks',
  w: P3.w,
  h: P3.h,
  chunk: P3.chunk,
  roads: P3_ROADS,
  ponds: P3_PONDS,
  paddies: [],
  river: null,
  bridge: null,
  camps: P3_CAMPS,
  shrines: P3_SHRINES,
  regions: P3_REGIONS,
  forestDensity,
  isClearing,
  regionAt: p3RegionAt,
  roadDist,
  species: (_x, _y, _n, r, A) => (r.chance(0.85) ? A.snowPine : A.pine),
  washPig: (reg, r) => (reg === 'glacier' ? PIG_A : reg === 'erased' ? INK : r.chance(0.6) ? PIG_B : INK),
  bare: (reg) => reg === 'glacier' || reg === 'erased' || reg === 'stair' || reg === 'slopes',
  ground(g, x0, y0, S, st) {
    const M = 4;
    const near = (x: number, y: number, rr: number) => x + rr > x0 - M && x - rr < x0 + S + M && y + rr > y0 - M && y - rr < y0 + S + M;
    const r = new Rng(Math.round(x0 * 31 + y0 * 977 + 3500));
    // wind across the snow: long dry strokes, drifts in the hollows
    for (let i = 0; i < 6; i++) {
      const x = x0 + r.next() * S, y = y0 + r.next() * S;
      const l = r.range(1.5, 4);
      stroke(g, [[x, y], [x + l * 0.5, y + r.gauss() * 0.15], [x + l, y + r.gauss() * 0.2]], { width: 0.05, pig: mixPig(INK, PIG_B, 0.4), load: 0.2, dry: 0.85, seed: r.int(1, 1e6), press: 0, taperStart: 0.3, taperEnd: 0.5 });
      if (r.chance(0.35)) washBlob(g, x, y - 0.6, r.range(1.2, 2.6), r.range(0.4, 0.8), { pig: PIG_B, density: 0.05, soft: 0.8, seed: r.int(1, 1e6) });
    }
    // the glacier: ice crazed with fine cracks, a pale blue wash
    if (x0 + S > 136) {
      for (let i = 0; i < 10; i++) {
        const x = x0 + r.next() * S, y = y0 + r.next() * S;
        if (p3RegionAt(x, y) !== 'glacier') continue;
        washBlob(g, x, y, r.range(1.5, 3.5), r.range(0.8, 1.6), { pig: PIG_A, density: 0.06, soft: 0.7, seed: r.int(1, 1e6) });
        const pts: V[] = [[x, y]];
        for (let k = 0; k < 3; k++) pts.push([pts[k][0] + r.gauss() * 0.8, pts[k][1] + r.gauss() * 0.5]);
        stroke(g, pts, { width: 0.025, pig: mixPig(INK, PIG_A, 0.5), load: 0.45, dry: 0.6, seed: r.int(1, 1e6), press: 0 });
      }
    }
    for (const c of P3_CREVASSES) {
      const [cx, cy] = c[0];
      if (!near(cx, cy, 14)) continue;
      chasm(g, c, Math.round(cx * 13 + cy * 7));
    }
    // the erased valley: holes torn into the paper, their edges frayed
    for (const t of P3_TEARS) {
      const [tx, ty] = t[0];
      if (!near(tx, ty, 6)) continue;
      g.lift();
      g.ctx.fillStyle = 'rgba(0,0,0,1)';
      g.ctx.beginPath();
      t.forEach((q, i) => (i === 0 ? g.ctx.moveTo(q[0], q[1]) : g.ctx.lineTo(q[0], q[1])));
      g.ctx.closePath();
      g.ctx.fill();
      g.glaze();
      washPoly(g, t, { pig: INK, density: 0.88, soft: 0.05, edge: 0.4, seed: Math.round(tx * 9) });
      for (let i = 0; i < t.length; i += 2) {
        const a = t[i], b = t[(i + 1) % t.length];
        stroke(g, [a, b], { width: 0.06, pig: mixPig(INK, PIG_B, 0.3), load: 0.8, dry: 0.7, seed: Math.round(a[0] * 31 + a[1]), press: 0 });
      }
    }
    // the monastery: swept flagstones under the snow, prayer flags across the court
    const Mo = P3_MONASTERY;
    if (near(Mo.x, Mo.y, Mo.r)) {
      washBlob(g, Mo.x, Mo.y, 9, 6, { pig: INK, density: 0.05, soft: 0.8, seed: 3501 });
      const rr = new Rng(3502);
      for (let i = 0; i < 80; i++) {
        const a = rr.range(0, Math.PI * 2), d = Math.sqrt(rr.next()) * 9;
        const x = Mo.x + Math.cos(a) * d, y = Mo.y + Math.sin(a) * d * 0.7;
        if (x < x0 - 1 || x > x0 + S + 1 || y < y0 - 1 || y > y0 + S + 1) continue;
        stampAt(g, st.stones[rr.int(0, st.stones.length - 1)], x, y, rr.chance(0.5), 0.75);
      }
      for (const [ax, ay, bx, by] of [[Mo.x - 9, Mo.y + 6, Mo.x + 9, Mo.y + 7], [Mo.x - 7, Mo.y - 5, Mo.x + 8, Mo.y - 4]] as [number, number, number, number][]) {
        const pts: V[] = [];
        for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push([ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.6]); }
        stroke(g, pts, { width: 0.03, load: 0.7, seed: Math.round(ax * 7), press: 0 });
        for (let k = 1; k < 12; k++) {
          const [px, py] = pts[k];
          washPoly(g, [[px - 0.18, py], [px + 0.18, py], [px + 0.16, py - 0.42], [px - 0.16, py - 0.42]], { pig: k % 3 === 0 ? PIG_A : k % 3 === 1 ? PIG_B : INK, density: 0.35, soft: 0.05, seed: Math.round(px * 13 + k) });
        }
      }
    }
    // the bells' plinths
    for (const [bx, by] of P3_BELLS) {
      if (!near(bx, by, 3)) continue;
      washPoly(g, noisyOutline(bx, by - 0.2, 1.8, 1.0, 0.1, Math.round(bx * 3)), { pig: INK, density: 0.12, soft: 0.3, seed: Math.round(bx * 3) });
    }
    // the north: mountain foot
    if (y0 + S > P3_NORTH - 3) {
      washPoly(g, [[x0 - 1, P3_NORTH - 1.5], [x0 + S + 1, P3_NORTH - 1.5], [x0 + S + 1, P3.h + 1], [x0 - 1, P3.h + 1]], { pig: mixPig(INK, PIG_B, 0.4), density: 0.08, soft: 0.7, seed: 3551 });
    }
  },
  props(h, A) {
    placeFixed(h, A, P3_FIXED);
    // snowy boulders along the stair and the slopes
    const r = new Rng(3601);
    for (let i = 0; i < 70; i++) {
      const x = r.range(6, P3.w - 6), y = r.range(4, P3_NORTH - 4);
      if (!h.inChunk(x, y) || isClearing(x, y) || roadDist(x, y) < 3.5) continue;
      if (p3RegionAt(x, y) === 'forest') continue;
      const a = A.snowRock[i % A.snowRock.length];
      h.add(a, x, y, i % 2 === 0, a.radius + 0.2);
    }
  },
};
