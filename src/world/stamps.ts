/**
 * Pre-painted ground stamps (grass, stones, flowers, pebbles). Chunks are painted by
 * stamping these instead of stroking hundreds of brush marks each time: fast enough for phones.
 */
import { Painter, INK, PIG_A, PIG_B, mixPig } from '../gfx/paint';
import { stroke, dot } from '../gfx/brush';
import { washPoly, noisyOutline } from '../gfx/wash';
import { drawGrassClump, drawGrassTuft } from '../gfx/gen/flora';
import { Rng } from '../gfx/rng';

export interface Stamp {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  /** Anchor (local units from the canvas bottom-left). */
  ax: number;
  ay: number;
}

export interface StampSet {
  grass: Stamp[];
  tufts: Stamp[];
  stones: Stamp[];
  flowers: Stamp[];
  pebbles: Stamp[];
  reeds: Stamp[];
}

function make(w: number, h: number, ppu: number, ax: number, ay: number, paint: (p: Painter) => void): Stamp {
  const p = new Painter(w, h, ppu, -ax, -ay);
  p.glaze();
  paint(p);
  return { canvas: p.canvas, w, h, ax, ay };
}

export function buildStamps(ppu: number): StampSet {
  const r = new Rng(4040);
  const grass: Stamp[] = [], tufts: Stamp[] = [], stones: Stamp[] = [], flowers: Stamp[] = [], pebbles: Stamp[] = [], reeds: Stamp[] = [];
  for (let i = 0; i < 10; i++) {
    const s = r.range(0.28, 0.5);
    const pig = r.chance(0.55) ? mixPig(INK, PIG_B, r.range(0.3, 0.8)) : INK;
    const load = r.range(0.4, 0.95);
    grass.push(make(1.8, 1.2, ppu, 0.9, 0.2, (p) => drawGrassClump(p, 0, 0, s, r.int(1, 1e6), pig, load)));
  }
  for (let i = 0; i < 8; i++) {
    const s = r.range(0.2, 0.36);
    tufts.push(make(1, 0.8, ppu, 0.5, 0.15, (p) => drawGrassTuft(p, 0, 0, s, r.int(1, 1e6), r.chance(0.5) ? INK : mixPig(INK, PIG_B, 0.6), r.range(0.3, 0.8))));
  }
  for (let i = 0; i < 8; i++) {
    const s = r.range(0.35, 0.65);
    stones.push(make(1.6, 1.3, ppu, 0.8, 0.65, (p) => {
      const o = noisyOutline(0, 0, s, s * 0.65, 0.22, r.int(1, 1e6));
      washPoly(p, o, { pig: INK, density: r.range(0.04, 0.09), soft: 0.1, edge: 0.4, seed: r.int(1, 1e6) });
      const n = o.length, from = r.int(0, n - 1), len = Math.floor(n * r.range(0.3, 0.55));
      const part: [number, number][] = [];
      for (let k = 0; k < len; k += 2) part.push(o[(from + k) % n]);
      if (part.length > 2) stroke(p, part, { width: 0.05, load: r.range(0.3, 0.55), dry: 0.6, seed: r.int(1, 1e6), taperStart: 0.2, taperEnd: 0.5, body: 0.2, press: 0 });
    }));
  }
  for (let i = 0; i < 8; i++) {
    flowers.push(make(1.4, 1.0, ppu, 0.7, 0.5, (p) => {
      const n = r.int(3, 8);
      for (let k = 0; k < n; k++) dot(p, r.gauss() * 0.35, r.gauss() * 0.22, r.range(0.04, 0.08), i % 3 === 0 ? PIG_B : PIG_A, r.range(0.5, 0.95), r.int(1, 1e6));
    }));
  }
  for (let i = 0; i < 6; i++) {
    pebbles.push(make(1.2, 0.8, ppu, 0.6, 0.4, (p) => {
      for (let k = 0; k < r.int(3, 7); k++) dot(p, r.gauss() * 0.3, r.gauss() * 0.18, r.range(0.02, 0.05), INK, r.range(0.3, 0.7), r.int(1, 1e6));
    }));
  }
  for (let i = 0; i < 5; i++) {
    reeds.push(make(1.4, 1.6, ppu, 0.7, 0.2, (p) => {
      for (let k = 0; k < r.int(4, 8); k++) {
        const x = r.gauss() * 0.25, h = r.range(0.4, 1.1), lean = r.gauss() * 0.2;
        stroke(p, [[x, 0], [x + lean * 0.4, h * 0.6], [x + lean, h]], { width: 0.03, load: r.range(0.5, 0.9), dry: 0.4, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.95, body: 0.4, press: 0 });
        if (r.chance(0.4)) dot(p, x + lean, h + 0.05, 0.035, INK, 0.8, r.int(1, 1e6));
      }
    }));
  }
  return { grass, tufts, stones, flowers, pebbles, reeds };
}

/** Draw a stamp into a world-unit painter (y up) at (x, y). */
export function stampAt(p: Painter, s: Stamp, x: number, y: number, flip = false, alpha = 1): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, -1);
  ctx.drawImage(s.canvas, -s.ax, -(s.h - s.ay), s.w, s.h);
  ctx.restore();
}
