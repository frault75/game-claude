/** Act I's valley as a Land: Willow Hamlet, the orchard, the river and its bridge, the plain, the stone circle. */
import type { Land, PropHost } from './land';
import type { ArtCache } from './artCache';
import { INK, PIG_B, mixPig } from '../gfx/paint';
import { washBlob, washPoly, noisyOutline } from '../gfx/wash';
import { stroke } from '../gfx/brush';
import { pond, puddle } from '../gfx/gen/ground';
import { stampAt } from './stamps';
import { save } from '../game/progression';
import {
  type Fixed, WORLD, ROAD, PATHS, PONDS, VILLAGE, ARENA, CAMPS, SHRINES, RIVER_SAMPLES, BRIDGE, PADDIES, FIXED, TEMPLE, CAVE, NORTH_WALL, REGIONS,
  forestDensity, isClearing, cellRng, regionAt, roadDist, riverHalf,
} from './layout';

export const ACT1: Land = {
  id: 'overworld',
  w: WORLD.w,
  h: WORLD.h,
  chunk: WORLD.chunk,
  roads: [{ pts: ROAD, w: 2.6 }, ...PATHS.map((p) => ({ pts: p, w: 1.7 }))],
  ponds: PONDS,
  paddies: PADDIES,
  river: { samples: RIVER_SAMPLES, half: riverHalf },
  bridge: BRIDGE,
  camps: CAMPS,
  shrines: SHRINES,
  regions: REGIONS,
  forestDensity,
  isClearing,
  regionAt,
  roadDist,
  washPig: (reg, r) => (reg === 'arena' ? INK : r.chance(0.7) ? PIG_B : INK),
  bare: (reg) => reg === 'arena',
  ground(g, x0, y0, S, st) {
    const M = 4;
    const near = (x: number, y: number, r: number) => x + r > x0 - M && x - r < x0 + S + M && y + r > y0 - M && y - r < y0 + S + M;
    if (near(TEMPLE.x, TEMPLE.y, 9)) {
      if (!save.bosses.includes('ramking')) pond(g, TEMPLE.x, TEMPLE.y - 0.6, 6.4, 3.4, 731);
      else {
        washBlob(g, TEMPLE.x, TEMPLE.y - 1.2, 6, 3, { pig: INK, density: 0.1, soft: 0.6, seed: 732 });
        const r = cellRng(9, 9, 733);
        for (let i = 0; i < 5; i++) puddle(g, TEMPLE.x + r.range(-5, 5), TEMPLE.y - r.range(2.5, 4), r.range(0.5, 1), r.range(0.3, 0.5), r.int(1, 1e6));
      }
    }
    if (near(CAVE.x, CAVE.y, 8)) {
      washBlob(g, CAVE.x, CAVE.y - 0.4, 4, 1.6, { pig: INK, density: 0.14, soft: 0.7, seed: 741 });
      washBlob(g, CAVE.x, CAVE.y + 1.4, 5, 2.4, { pig: INK, density: 0.1, soft: 0.8, seed: 742 });
    }
    if (y0 + S > NORTH_WALL - 3) {
      washPoly(g, [[x0 - 1, NORTH_WALL - 1.5], [x0 + S + 1, NORTH_WALL - 1.5], [x0 + S + 1, WORLD.h + 1], [x0 - 1, WORLD.h + 1]], { pig: mixPig(INK, PIG_B, 0.4), density: 0.1, soft: 0.7, seed: 751 });
    }
    // the hamlet's plaza and the stone circle
    if (Math.hypot(VILLAGE.x - (x0 + S / 2), VILLAGE.y - (y0 + S / 2)) < VILLAGE.r + S) {
      const r = cellRng(1, 2, 99);
      for (let i = 0; i < 60; i++) {
        const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * 6;
        const x = VILLAGE.x + Math.cos(a) * d, y = VILLAGE.y + Math.sin(a) * d * 0.8;
        if (x < x0 - 1 || x > x0 + S + 1 || y < y0 - 1 || y > y0 + S + 1) continue;
        stampAt(g, st.stones[r.int(0, st.stones.length - 1)], x, y, r.chance(0.5), 0.8);
      }
    }
    if (Math.hypot(ARENA.x - (x0 + S / 2), ARENA.y - (y0 + S / 2)) < ARENA.r + S) {
      washPoly(g, noisyOutline(ARENA.x, ARENA.y, ARENA.r, ARENA.r * 0.82, 0.08, 4242), { pig: INK, density: 0.08, soft: 0.6, seed: 4242 });
      const ring: [number, number][] = [];
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        ring.push([ARENA.x + Math.cos(a) * ARENA.r, ARENA.y + Math.sin(a) * ARENA.r * 0.82]);
      }
      stroke(g, ring, { width: 0.18, load: 0.5, dry: 0.7, seed: 4243, taperStart: 0.01, taperEnd: 0.02, body: 0.3, press: 0 });
    }
  },
  props(h, A) {
    placeFixed(h, A, FIXED);
    // the stone circle's standing rocks, open to the west
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      if (Math.abs(Math.cos(a) + 1) < 0.25) continue;
      const x = ARENA.x + Math.cos(a) * (ARENA.r + 1.2), y = ARENA.y + Math.sin(a) * (ARENA.r + 1.2) * 0.82;
      if (h.inChunk(x, y)) h.add(A.bigRock[k % A.bigRock.length], x, y, k % 2 === 0, 1.4);
    }
  },
};

/** Hand-placed props of a land (houses, stalls, gates, ruins, mountains…) with their colliders. */
export function placeFixed(h: PropHost, A: ArtCache, list: Fixed[]): void {
    const box = (x: number, y: number, hw: number, d: number) => {
    const c = [[x - hw, y + 0.15], [x + hw, y + 0.15], [x + hw, y + d], [x - hw, y + d]];
    for (let i = 0; i < 4; i++) {
      const a = c[i], b2 = c[(i + 1) % 4];
      h.collider({ kind: 'seg', ax: a[0], ay: a[1], bx: b2[0], by: b2[1], r: 0.22 });
    }
  };
    for (const f of list) {
    if (!h.inChunk(f.x, f.y)) continue;
    const fl = !!f.flip;
    switch (f.kind) {
      case 'house': {
        const wide = [1, 0.85, 1.15][f.v ?? 0];
        h.add(A.house[f.v ?? 0], f.x, f.y, fl, 3.4 * wide, false);
        box(f.x, f.y, 2.3 * wide + 0.1, 1.5);
        break;
      }
      case 'hut':
        h.add(A.hut[(f.v ?? 0) % A.hut.length], f.x, f.y, fl, 3.0, false);
        box(f.x, f.y, 1.95, 1.3);
        break;
      case 'stallDyer': case 'stallFood': case 'stallPots': {
        const k = f.kind === 'stallDyer' ? 'dyer' : f.kind === 'stallFood' ? 'food' : 'pots';
        h.add(A.stall[k], f.x, f.y, fl, 2.2, false);
        h.collider({ kind: 'seg', ax: f.x - 1.6, ay: f.y + 0.35, bx: f.x + 1.6, by: f.y + 0.35, r: 0.35 });
        break;
      }
      case 'well':
        h.add(A.well, f.x, f.y, fl, 1.2, false);
        h.collider({ kind: 'circle', x: f.x, y: f.y + 0.3, r: 0.95 });
        break;
      case 'fence':
        h.add(A.fence, f.x, f.y, fl, 0, false);
        h.collider({ kind: 'seg', ax: f.x - 1.5, ay: f.y + 0.1, bx: f.x + 1.5, by: f.y + 0.1, r: 0.12 });
        break;
      case 'gate':
        h.add(A.gate, f.x, f.y, fl, 0, false);
        for (const sx of [-2.2, 2.2]) h.collider({ kind: 'circle', x: f.x + sx, y: f.y + 0.05, r: 0.3 });
        break;
      case 'lamp':
        h.add(A.lamp[0], f.x, f.y, fl, 0.6);
        break;
      case 'bigWillow':
        h.add(A.bigWillow, f.x, f.y, fl, 2.6);
        break;
      case 'railN': case 'railS':
        h.add(A.rail, f.x, f.y, fl, 0, false);
        break;
      case 'cave':
        h.add(A.cave, f.x, f.y, fl, 0, false);
        for (const [cx, cy, cr] of [[f.x - 2.6, f.y + 0.9, 1.5], [f.x + 2.6, f.y + 0.9, 1.5], [f.x, f.y + 2.6, 1.6], [f.x - 3.6, f.y + 1.8, 1.2], [f.x + 3.6, f.y + 1.8, 1.2]]) {
          h.collider({ kind: 'circle', x: cx, y: cy, r: cr });
        }
        break;
      case 'templeGate':
        h.add(A.templeGate, f.x, f.y, fl, 0, false);
        for (const sx of [-2.0, 2.0]) h.collider({ kind: 'circle', x: f.x + sx, y: f.y + 0.2, r: 0.5 });
        h.collider({ kind: 'seg', ax: f.x - 3, ay: f.y + 1.6, bx: f.x + 3, by: f.y + 1.6, r: 0.3 });
        break;
      case 'pillar':
        h.add(A.pillar, f.x, f.y, fl, 0.9);
        break;
      case 'broken':
        h.add(A.broken[(f.v ?? 0) % A.broken.length], f.x, f.y, fl, 0.8);
        break;
      case 'ruinWall':
        h.add(A.ruinWall[(f.v ?? 0) % A.ruinWall.length], f.x, f.y, fl, 1.8, false);
        h.collider({ kind: 'seg', ax: f.x - 1.85, ay: f.y + 0.2, bx: f.x + 1.85, by: f.y + 0.2, r: 0.3 });
        break;
      case 'mountains':
        h.add(A.mountains[(f.v ?? 0) % A.mountains.length], f.x, f.y, fl, 0, false);
        break;
    }
  }
}
