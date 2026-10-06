/**
 * Paints a dungeon floor: earth or flagstones, rock walls with a lit face where they look south,
 * stairs up and down. Everything goes into tiles of ground canvas.
 */
import { Painter, INK, PIG_A, PIG_B, mixPig, pigStyle, Pig } from '../gfx/paint';
import { stroke, dot } from '../gfx/brush';
import { washBlob, washPoly, noisyOutline } from '../gfx/wash';
import { Rng } from '../gfx/rng';
import { noise } from '../gfx/noise';
import type { DungeonMap } from './dungeon';
import { puddle } from '../gfx/gen/ground';
import type { StampSet } from './stamps';
import { stampAt } from './stamps';

export type DungeonStyle = 'cave' | 'temple';

const TILE = 16;

/** Paint the floor into square tiles (keeps every canvas small enough for phones). */
export function paintDungeon(map: DungeonMap, style: DungeonStyle, seed: number, ppu: number, st: StampSet, stairsDown: boolean): Painter[] {
  const tiles: Painter[] = [];
  for (let ty = 0; ty < map.h; ty += TILE) {
    for (let tx = 0; tx < map.w; tx += TILE) {
      const g = new Painter(Math.min(TILE, map.w - tx), Math.min(TILE, map.h - ty), ppu, tx, ty);
      g.glaze();
      paintTile(g, map, style, seed, tx, ty, st, stairsDown);
      tiles.push(g);
    }
  }
  return tiles;
}

const rockCache = new Map<DungeonMap, HTMLCanvasElement>();

/** Rock density for the whole floor at 4 px per cell (image space: row 0 is the top). */
function rockCanvas(map: DungeonMap, style: DungeonStyle, seed: number): HTMLCanvasElement {
  let c = rockCache.get(map);
  if (c) return c;
  const K = 4;
  c = document.createElement('canvas');
  c.width = map.w * K;
  c.height = map.h * K;
  const ctx = c.getContext('2d')!;
  const nz = noise((seed % 900) + 7);
  const pig = style === 'cave' ? mixPig(INK, PIG_B, 0.15) : INK;
  for (let iy = 0; iy < map.h; iy++) {
    for (let ix = 0; ix < map.w; ix++) {
      if (map.grid[iy * map.w + ix] === 1) continue;
      ctx.fillStyle = pigStyle(pig, 0.64 + nz.get(ix * 0.3, iy * 0.3) * 0.12);
      ctx.fillRect(ix * K, (map.h - 1 - iy) * K, K, K);
    }
  }
  rockCache.set(map, c);
  return c;
}

function paintTile(g: Painter, map: DungeonMap, style: DungeonStyle, seed: number, x0: number, y0: number, st: StampSet, stairsDown: boolean): void {
  const { w, h, grid } = map;
  const x1 = x0 + g.w, y1 = y0 + g.h;
  const M = 3;
  const floor = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && grid[y * w + x] === 1;
  const cell = (ix: number, iy: number, salt: number) => new Rng(((ix * 73856093) ^ (iy * 19349663) ^ ((seed + salt) * 83492791)) >>> 0);
  const tint: Pig = style === 'cave' ? PIG_B : PIG_A;
  // 1. floor washes on a 6-cell grid
  for (let ix = Math.floor((x0 - M) / 6); ix <= Math.floor((x1 + M) / 6); ix++) {
    for (let iy = Math.floor((y0 - M) / 6); iy <= Math.floor((y1 + M) / 6); iy++) {
      const r = cell(ix, iy, 1);
      const x = ix * 6 + r.range(0, 6), y = iy * 6 + r.range(0, 6);
      const s = r.range(2.5, 5);
      washBlob(g, x, y, s, s * r.range(0.4, 0.7), { pig: r.chance(0.6) ? tint : INK, density: style === 'cave' ? r.range(0.08, 0.18) : r.range(0.05, 0.12), soft: 0.9, seed: r.int(1, 1e6), rough: 0.35 });
    }
  }
  // 2. flagstones (temple) or pebbles, moss and puddles (cave)
  for (let iy = y0 - 1; iy < y1 + 1; iy++) {
    for (let ix = x0 - 1; ix < x1 + 1; ix++) {
      if (!floor(ix, iy)) continue;
      const r = cell(ix, iy, 2);
      if (style === 'temple') {
        // flagstones: grout lines along rows, joints staggered from row to row
        if (floor(ix, iy - 1)) stroke(g, [[ix + 0.02, iy], [ix + 0.98, iy + r.gauss() * 0.01]], { width: 0.025, load: r.range(0.14, 0.26), dry: 0.75, seed: r.int(1, 1e6), body: 0.15, taperStart: 0.15, taperEnd: 0.15, press: 0 });
        if ((ix + (iy % 2)) % 2 === 0 && floor(ix - 1, iy)) stroke(g, [[ix, iy + 0.04], [ix + r.gauss() * 0.01, iy + 0.96]], { width: 0.025, load: r.range(0.14, 0.26), dry: 0.75, seed: r.int(1, 1e6), body: 0.15, taperStart: 0.15, taperEnd: 0.15, press: 0 });
        if (r.chance(0.12)) washBlob(g, ix + 0.5, iy + 0.5, 0.45, 0.35, { pig: INK, density: r.range(0.03, 0.07), soft: 0.5, seed: r.int(1, 1e6) });
        if (r.chance(0.035)) puddle(g, ix + 0.5, iy + 0.5, r.range(0.6, 1.2), r.range(0.3, 0.5), r.int(1, 1e6));
        else if (r.chance(0.06)) stampAt(g, st.tufts[r.int(0, st.tufts.length - 1)], ix + r.next(), iy + r.next(), r.chance(0.5), 0.7);
      } else {
        const roll = r.next();
        if (roll < 0.1) stampAt(g, st.pebbles[r.int(0, st.pebbles.length - 1)], ix + r.next(), iy + r.next(), r.chance(0.5), 0.9);
        else if (roll < 0.16) stampAt(g, st.stones[r.int(0, st.stones.length - 1)], ix + r.next(), iy + r.next(), r.chance(0.5), 0.7);
        else if (roll < 0.21) stampAt(g, st.tufts[r.int(0, st.tufts.length - 1)], ix + r.next(), iy + r.next(), r.chance(0.5), 0.6);
        else if (roll < 0.22) puddle(g, ix + 0.5, iy + 0.5, r.range(0.6, 1.2), r.range(0.35, 0.6), r.int(1, 1e6));
        else if (roll < 0.26) washBlob(g, ix + r.next(), iy + r.next(), r.range(0.3, 0.7), r.range(0.2, 0.4), { pig: PIG_B, density: r.range(0.08, 0.16), soft: 0.6, seed: r.int(1, 1e6) });
      }
    }
  }
  // 3. rock: one small canvas for the whole floor, enlarged with smoothing (no seams between cells)
  const rock = rockCanvas(map, style, seed);
  g.ctx.save();
  g.ctx.imageSmoothingEnabled = true;
  g.ctx.translate(0, h);
  g.ctx.scale(1, -1);
  g.ctx.drawImage(rock, 0, 0, w, h);
  g.ctx.restore();
  // 4. walls: a lit face where the rock looks south, a dark rim elsewhere
  for (const wl of map.walls) {
    if (Math.max(wl.ax, wl.bx) < x0 - M || Math.min(wl.ax, wl.bx) > x1 + M || Math.max(wl.ay, wl.by) < y0 - M || Math.min(wl.ay, wl.by) > y1 + M) continue;
    const r = new Rng(Math.round(wl.ax * 131 + wl.ay * 977 + seed));
    const len = Math.hypot(wl.bx - wl.ax, wl.by - wl.ay);
    if (wl.face === 's') {
      // the rock face rises from the floor line: lighter band, strata, a dark top lip
      const fh = 1.15;
      const y = wl.ay;
      const face: [number, number][] = [[wl.ax, y], [wl.bx, y], [wl.bx, y + fh], [wl.ax, y + fh]];
      g.reserve(() => face.forEach((q, i) => (i === 0 ? g.ctx.moveTo(q[0], q[1]) : g.ctx.lineTo(q[0], q[1]))), 1);
      g.glaze();
      washPoly(g, face, { pig: style === 'cave' ? mixPig(INK, PIG_B, 0.4) : mixPig(INK, PIG_A, 0.2), density: 0.3, soft: 0.05, edge: 0.3, seed: r.int(1, 1e6) });
      if (style === 'temple') {
        for (let row = 0; row < 3; row++) {
          const yy = y + 0.12 + row * 0.36;
          stroke(g, [[wl.ax + 0.05, yy], [wl.bx - 0.05, yy]], { width: 0.03, load: 0.5, dry: 0.6, seed: r.int(1, 1e6), body: 0.2, press: 0 });
          for (let x = wl.ax + (row % 2) * 0.5 + 0.4; x < wl.bx - 0.2; x += 1.0) {
            stroke(g, [[x, yy], [x, yy + 0.34]], { width: 0.025, load: 0.45, dry: 0.6, seed: r.int(1, 1e6), body: 0.2, press: 0 });
          }
        }
      } else {
        for (let k = 0; k < len * 1.6; k++) {
          const x = r.range(wl.ax, wl.bx), yy = y + r.range(0.1, fh - 0.1);
          const l = r.range(0.2, 0.7);
          stroke(g, [[x, yy], [x + r.gauss() * 0.1, yy - l * 0.6]], { width: r.range(0.03, 0.06), load: r.range(0.4, 0.8), dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.7, press: 0 });
        }
        // roots and drips
        for (let k = 0; k < len * 0.3; k++) {
          const x = r.range(wl.ax, wl.bx);
          stroke(g, [[x, y + fh], [x + r.gauss() * 0.05, y + fh - r.range(0.3, 0.9)]], { width: 0.025, load: 0.8, seed: r.int(1, 1e6), taperEnd: 0.95, press: 0 });
        }
      }
      stroke(g, [[wl.ax, y + fh], [wl.bx, y + fh]], { width: 0.12, load: 0.95, dry: 0.4, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.02, rough: 0.5 });
      stroke(g, [[wl.ax, y + 0.02], [wl.bx, y + 0.02]], { width: 0.07, load: 0.7, dry: 0.6, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.02, rough: 0.4, press: 0 });
      washBlob(g, (wl.ax + wl.bx) / 2, y - 0.35, len * 0.5, 0.35, { pig: INK, density: 0.12, soft: 0.9, seed: r.int(1, 1e6) });
    } else {
      // rim: a broken dark line, rocks spilling a little onto the floor
      stroke(g, [[wl.ax, wl.ay], [(wl.ax + wl.bx) / 2 + r.gauss() * 0.05, (wl.ay + wl.by) / 2 + r.gauss() * 0.05], [wl.bx, wl.by]], { width: 0.14, load: 0.95, dry: 0.45, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.02, rough: 0.6 });
      const nx = wl.face === 'n' ? 0 : wl.face === 'e' ? 1 : -1, ny = wl.face === 'n' ? 1 : 0;
      for (let k = 0; k < len * 0.8; k++) {
        const t = r.next();
        const x = wl.ax + (wl.bx - wl.ax) * t + nx * r.range(0.05, 0.3), y = wl.ay + (wl.by - wl.ay) * t + ny * r.range(0.05, 0.3);
        washPoly(g, noisyOutline(x, y, r.range(0.1, 0.25), r.range(0.08, 0.18), 0.3, r.int(1, 1e6)), { pig: INK, density: 0.55, soft: 0.1, edge: 0.6, seed: r.int(1, 1e6) });
      }
    }
  }
  // 5. stairs
  const inTile = (x: number, y: number, m: number) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  if (inTile(map.up[0], map.up[1], 3)) {
    const [ux, uy] = map.up;
    for (let k = 0; k < 4; k++) {
      const yy = uy - 0.5 + k * 0.32, hw = 1.0 - k * 0.06;
      washPoly(g, [[ux - hw, yy], [ux + hw, yy], [ux + hw, yy + 0.3], [ux - hw, yy + 0.3]], { pig: mixPig(INK, tint, 0.3), density: 0.12 + k * 0.05, soft: 0.05, edge: 0.6, seed: seed + 50 + k });
      stroke(g, [[ux - hw, yy], [ux + hw, yy]], { width: 0.05, load: 0.85, dry: 0.4, seed: seed + 60 + k });
    }
  }
  if (stairsDown && inTile(map.down[0], map.down[1], 3)) {
    const [dx, dy] = map.down;
    washPoly(g, noisyOutline(dx, dy, 1.25, 0.9, 0.12, seed + 70), { pig: INK, density: 0.35, soft: 0.05, edge: 0.9, seed: seed + 70 });
    for (let k = 0; k < 4; k++) {
      const yy = dy + 0.45 - k * 0.3, hw = 0.95 - k * 0.12;
      washPoly(g, [[dx - hw, yy - 0.28], [dx + hw, yy - 0.28], [dx + hw, yy], [dx - hw, yy]], { pig: INK, density: 0.2 + k * 0.18, soft: 0.05, edge: 0.5, seed: seed + 80 + k });
    }
    dot(g, dx, dy - 0.6, 0.35, INK, 1, seed + 90);
  }
}
