/** Ground painting: drawn straight into a room's ground painter (plan view). */
import { Painter, INK, PIG_A, PIG_B, Pig, mixPig } from '../paint';
import { stroke, dot, V2 } from '../brush';
import { washBlob, sweep, washPoly, noisyOutline } from '../wash';
import { Rng } from '../rng';
import { noise } from '../noise';
import { drawGrassTuft, drawGrassClump } from './flora';

export const GROUND_PPU = 40;

export interface Rect { x: number; y: number; w: number; h: number }

/** Large, quiet washes so the paper is never perfectly flat. */
export function groundBase(p: Painter, r: Rect, seed: number, tint: Pig = PIG_B, amount = 1): void {
  const rng = new Rng(seed);
  const n = Math.round((r.w * r.h) / 40 * amount);
  for (let i = 0; i < n; i++) {
    const x = rng.range(r.x, r.x + r.w), y = rng.range(r.y, r.y + r.h);
    const s = rng.range(2.5, 6);
    washBlob(p, x, y, s, s * rng.range(0.3, 0.55), {
      pig: rng.chance(0.75) ? tint : INK, density: rng.chance(0.75) ? rng.range(0.05, 0.12) : rng.range(0.02, 0.04), soft: 0.9, seed: rng.int(1, 1e6), rot: rng.gauss() * 0.25, rough: 0.35,
    });
  }
}

export function grassField(p: Painter, r: Rect, count: number, seed: number, avoid?: (x: number, y: number) => boolean): void {
  const rng = new Rng(seed);
  const nz = noise(seed % 911);
  for (let i = 0; i < count * 2; i++) {
    const x = rng.range(r.x, r.x + r.w), y = rng.range(r.y, r.y + r.h);
    if (avoid && avoid(x, y)) continue;
    // grass grows in clumps
    if (nz.fbm(x * 0.12, y * 0.12, 2) + rng.range(-0.2, 0.2) < 0.18) continue;
    const s = rng.range(0.22, 0.5);
    const pig = rng.chance(0.55) ? mixPig(INK, PIG_B, rng.range(0.3, 0.8)) : INK;
    if (rng.chance(0.6)) drawGrassClump(p, x, y, s, rng.int(1, 1e6), pig, rng.range(0.35, 1));
    else drawGrassTuft(p, x, y, s * 0.8, rng.int(1, 1e6), pig, rng.range(0.25, 0.8));
  }
}

export function scatterPetals(p: Painter, r: Rect, count: number, seed: number): void {
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) {
    const x = rng.range(r.x, r.x + r.w), y = rng.range(r.y, r.y + r.h);
    dot(p, x, y, rng.range(0.05, 0.09), PIG_A, rng.range(0.4, 0.9), rng.int(1, 1e6));
  }
}

/** A trodden earth path: pale wash, a few broken drag marks and grassy edges. */
export function earthPath(p: Painter, pts: V2[], width: number, seed: number): void {
  const rng = new Rng(seed);
  sweep(p, pts, width, { pig: INK, density: 0.13, soft: 0.55, seed, rough: 0.3 });
  sweep(p, pts, width * 0.55, { pig: INK, density: 0.05, soft: 0.8, seed: seed + 1, rough: 0.5 });
  // total length
  const segs: { a: V2; b: V2; l: number }[] = [];
  let total = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const l = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
    segs.push({ a: pts[k], b: pts[k + 1], l });
    total += l;
  }
  const at = (d: number): { x: number; y: number; dx: number; dy: number } => {
    for (const s of segs) {
      if (d <= s.l) {
        const t = d / s.l;
        return { x: s.a[0] + (s.b[0] - s.a[0]) * t, y: s.a[1] + (s.b[1] - s.a[1]) * t, dx: (s.b[0] - s.a[0]) / s.l, dy: (s.b[1] - s.a[1]) / s.l };
      }
      d -= s.l;
    }
    const s = segs[segs.length - 1];
    return { x: s.b[0], y: s.b[1], dx: (s.b[0] - s.a[0]) / s.l, dy: (s.b[1] - s.a[1]) / s.l };
  };
  // broken edges of the trodden band
  for (const side of [-1, 1]) {
    for (let i = 0; i < total * 0.25; i++) {
      const d0 = rng.range(0, total);
      const L = rng.range(1, 3);
      const path: V2[] = [];
      for (let j = 0; j <= 3; j++) {
        const q = at(Math.min(total, d0 + (L * j) / 3));
        const off = side * width * rng.range(0.42, 0.5);
        path.push([q.x - q.dy * off, q.y + q.dx * off]);
      }
      stroke(p, path, { width: rng.range(0.05, 0.1), load: rng.range(0.15, 0.35), dry: rng.range(0.6, 0.9), seed: rng.int(1, 1e6), body: 0, taperStart: 0.3, taperEnd: 0.6, press: 0 });
    }
  }
  // pebbles
  for (let i = 0; i < total * 0.8; i++) {
    const q = at(rng.range(0, total));
    const off = rng.gauss() * width * 0.4;
    dot(p, q.x - q.dy * off, q.y + q.dx * off, rng.range(0.02, 0.05), INK, rng.range(0.3, 0.7), rng.int(1, 1e6));
  }
  // grassy edges, irregular
  for (let i = 0; i < total * 0.7; i++) {
    const q = at(rng.range(0, total));
    const side = rng.chance(0.5) ? 1 : -1;
    const off = width * 0.5 * rng.range(0.8, 1.25) * side;
    drawGrassTuft(p, q.x - q.dy * off, q.y + q.dx * off, rng.range(0.16, 0.3), rng.int(1, 1e6), rng.chance(0.5) ? INK : mixPig(INK, PIG_B, 0.6));
  }
}

/** Still water: a wash with a darker bank, ripple strokes and reeds. Returns the outline. */
export function pond(p: Painter, cx: number, cy: number, rx: number, ry: number, seed: number): V2[] {
  const rng = new Rng(seed);
  const o = noisyOutline(cx, cy, rx, ry, 0.18, seed);
  washPoly(p, o, { pig: INK, density: 0.16, soft: 0.15, edge: 0.9, seed, blooms: 0 });
  washPoly(p, noisyOutline(cx, cy - ry * 0.1, rx * 0.75, ry * 0.6, 0.2, seed + 1), { pig: mixPig(INK, PIG_B, 0.3), density: 0.07, soft: 0.8, seed: seed + 1 });
  // bank strokes on the top edge (the near bank is hidden in 3/4 view)
  const n = o.length;
  const bank: V2[] = [];
  for (let i = Math.floor(n * 0.05); i < Math.floor(n * 0.5); i += 2) bank.push(o[i]);
  stroke(p, bank, { width: 0.14, load: 0.85, dry: 0.6, seed: seed + 2, taperStart: 0.1, taperEnd: 0.3 });
  // ripples
  for (let i = 0; i < Math.round(rx * ry * 0.8); i++) {
    const x = cx + rng.gauss() * rx * 0.55, y = cy + rng.gauss() * ry * 0.5;
    const l = rng.range(0.3, 0.9);
    stroke(p, [[x - l / 2, y], [x, y + 0.03], [x + l / 2, y]], { width: 0.035, load: rng.range(0.25, 0.5), dry: 0.6, seed: rng.int(1, 1e6), body: 0.2, taperStart: 0.3, taperEnd: 0.4 });
  }
  // reeds along part of the bank
  for (let c = 0; c < 3; c++) {
    const base = rng.int(0, n - 1);
    for (let i = 0; i < 6; i++) {
      const q = o[(base + rng.int(-3, 3) + n) % n];
      const h = rng.range(0.35, 0.9);
      const lean = rng.gauss() * 0.2;
      stroke(p, [[q[0], q[1]], [q[0] + lean * 0.3, q[1] + h * 0.6], [q[0] + lean, q[1] + h]], { width: 0.028, load: rng.range(0.4, 0.8), dry: 0.4, seed: rng.int(1, 1e6), taperStart: 0.02, taperEnd: 0.97, body: 0.4, press: 0 });
      if (rng.chance(0.4)) dot(p, q[0] + lean, q[1] + h + 0.05, 0.035, INK, 0.8, rng.int(1, 1e6));
    }
  }
  return o;
}

/** Soft contact shadow under upright objects. */
export function shadow(p: Painter, x: number, y: number, rx: number, ry: number, density = 0.22): void {
  washBlob(p, x, y, rx, ry, { pig: INK, density, soft: 0.95, rough: 0.15, seed: Math.round(x * 31 + y * 17) });
}

/** Faint calligraphic text fragment written on the ground is handled by ui/text. */
export { PIG_A };

/** A ravine: dark falling wash, dry-brush lips on the far edge. */
export function chasm(p: Painter, poly: V2[], seed: number): void {
  const rng = new Rng(seed);
  washPoly(p, poly, { pig: INK, density: 0.5, soft: 0.05, edge: 0.9, seed });
  // inner depth
  let cx = 0, cy = 0;
  for (const q of poly) { cx += q[0]; cy += q[1]; }
  cx /= poly.length; cy /= poly.length;
  washPoly(p, poly.map(([x, y]) => [cx + (x - cx) * 0.8, cy + (y - cy) * 0.8] as V2), { pig: INK, density: 0.35, soft: 0.7, seed: seed + 1 });
  // rim strokes
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 0.3) continue;
    stroke(p, [a, [(a[0] + b[0]) / 2 + rng.gauss() * 0.05, (a[1] + b[1]) / 2 + rng.gauss() * 0.05], b], {
      width: 0.13, load: 0.9, dry: 0.55, seed: rng.int(1, 1e6), taperStart: 0.05, taperEnd: 0.1, rough: 0.4,
    });
  }
  // falling streaks
  for (let i = 0; i < 30; i++) {
    const q = poly[rng.int(0, poly.length - 1)];
    const x = q[0] + (cx - q[0]) * rng.range(0.05, 0.25), y = q[1] + (cy - q[1]) * rng.range(0.05, 0.25);
    stroke(p, [[x, y], [x + rng.gauss() * 0.05, y - rng.range(0.4, 1.1)]], { width: 0.05, load: 0.6, dry: 0.8, seed: rng.int(1, 1e6), body: 0.2, taperEnd: 0.9 });
  }
}

/** Water filling a polygon (rivers, channels): wash, bank strokes, flowing ripples. */
export function waterPoly(p: Painter, poly: V2[], seed: number, flow: [number, number] = [1, 0], density = 0.2): void {
  const rng = new Rng(seed);
  washPoly(p, poly, { pig: mixPig(INK, PIG_A, 0.25), density, soft: 0.1, edge: 0.9, seed });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const q of poly) { minX = Math.min(minX, q[0]); minY = Math.min(minY, q[1]); maxX = Math.max(maxX, q[0]); maxY = Math.max(maxY, q[1]); }
  const fl = Math.hypot(flow[0], flow[1]) || 1;
  const fx = flow[0] / fl, fy = flow[1] / fl;
  const area = (maxX - minX) * (maxY - minY);
  const inPoly = (x: number, y: number) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) inside = !inside;
    }
    return inside;
  };
  for (let i = 0; i < area * 0.5; i++) {
    const x = rng.range(minX, maxX), y = rng.range(minY, maxY);
    if (!inPoly(x, y)) continue;
    const l = rng.range(0.4, 1.3);
    stroke(p, [[x - fx * l / 2, y - fy * l / 2], [x + fy * 0.04, y - fx * 0.04], [x + fx * l / 2, y + fy * l / 2]], {
      width: 0.035, load: rng.range(0.25, 0.5), dry: 0.6, seed: rng.int(1, 1e6), body: 0.2, taperStart: 0.35, taperEnd: 0.45, press: 0,
    });
  }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    stroke(p, [a, b], { width: 0.1, load: 0.7, dry: 0.6, seed: rng.int(1, 1e6), taperStart: 0.1, taperEnd: 0.1, rough: 0.4 });
  }
}
