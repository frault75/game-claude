/** Rocks and stone things: wash body, axe-cut texture strokes, moss dots. */
import { Painter, INK, PIG_B, mixPig } from '../paint';
import { stroke, dot, V2 } from '../brush';
import { washPoly, noisyOutline } from '../wash';
import { Rng } from '../rng';
import { SPRITE_PPU } from './flora';

export function drawRock(seed: number, size = 1, moss = 0.5): Painter {
  const r = new Rng(seed);
  const W = 2.6 * size, H = 2.2 * size;
  const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4 * size);
  const rx = r.range(0.75, 1.0) * size, ry = r.range(0.5, 0.75) * size;
  const cy = ry * 0.8;
  const outline = noisyOutline(0, cy, rx, ry, 0.28, seed);
  // flatten the base
  for (const q of outline) if (q[1] < 0.05 * size) q[1] = 0.05 * size + (q[1] - 0.05 * size) * 0.15;
  p.reserve(() => {
    outline.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
    p.ctx.closePath();
  }, 0.85);
  p.glaze();
  washPoly(p, outline, { pig: INK, density: 0.16, soft: 0.1, edge: 0.6, seed });
  // shadow side
  const shade = outline.filter((q) => q[0] > rx * 0.1 || q[1] < cy * 0.6);
  if (shade.length > 3) washPoly(p, shade.concat([[rx * 0.2, cy]]), { pig: INK, density: 0.18, soft: 0.6, seed: seed + 3 });
  // contour: confident on the left/top, broken on the right
  const n = outline.length;
  const start = Math.floor(n * 0.25), end = Math.floor(n * 0.95);
  const contour: V2[] = [];
  for (let i = start; i <= end; i += 2) contour.push(outline[i % n]);
  stroke(p, contour, { width: 0.09 * size, load: 0.95, dry: 0.55, taperStart: 0.05, taperEnd: 0.35, seed: seed + 5, rough: 0.35 });
  // texture strokes
  for (let i = 0; i < r.int(3, 6); i++) {
    const x = r.range(-rx * 0.6, rx * 0.6), y = cy + r.range(-ry * 0.4, ry * 0.5);
    stroke(p, [[x, y], [x + r.range(0.05, 0.25) * size, y - r.range(0.15, 0.35) * size]], {
      width: 0.06 * size, load: r.range(0.4, 0.8), dry: 0.7, taperEnd: 0.8, seed: r.int(1, 1e6), body: 0.2,
    });
  }
  // moss dots along the top
  const dots = Math.round(moss * r.int(4, 10));
  for (let i = 0; i < dots; i++) {
    const q = outline[r.int(Math.floor(n * 0.15), Math.floor(n * 0.4))];
    dot(p, q[0] + r.gauss() * 0.1, q[1] + r.range(-0.05, 0.08), r.range(0.04, 0.08) * size, r.chance(0.5) ? INK : mixPig(INK, PIG_B, 0.6), 1, r.int(1, 1e6));
  }
  return p;
}

/** Stepping stone / flat stone seen from above, drawn straight into a ground painter. */
export function flatStone(p: Painter, x: number, y: number, s: number, seed: number): void {
  const o = noisyOutline(x, y, s, s * 0.7, 0.25, seed);
  washPoly(p, o, { pig: INK, density: 0.13, soft: 0.05, edge: 0.7, seed });
  const n = o.length;
  const c: V2[] = [];
  for (let i = Math.floor(n * 0.4); i < Math.floor(n * 0.9); i += 2) c.push(o[i]);
  stroke(p, c, { width: s * 0.12, load: 0.7, dry: 0.6, seed: seed + 1, taperEnd: 0.6 });
}
