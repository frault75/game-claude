/** Act II's creatures: ink frogs of the terraces, mist goats of the pass, mist wraiths, jade mantises. */
import { Painter, INK, PIG_A, PIG_B, mixPig } from '../paint';
import { stroke, V2 } from '../brush';
import { washPoly, noisyOutline, roughen } from '../wash';
import { Frame, frameFrom } from '../sprite';
import { Rng } from '../rng';
import { SPRITE_PPU } from './flora';

function poly(p: Painter, pts: V2[]): void {
  pts.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
  p.ctx.closePath();
}

function body(p: Painter, pts: V2[], d: number, seed: number, pig = INK): void {
  p.reserve(() => poly(p, pts), 0.95);
  p.glaze();
  washPoly(p, pts, { pig, density: d, soft: 0.05, edge: 0.9, seed, blooms: 1 });
}

function eyes(p: Painter, pts: [number, number, number, number][]): void {
  p.lift();
  for (const [x, y, rx, ry] of pts) { p.ctx.fillStyle = 'rgba(0,0,0,1)'; p.ctx.beginPath(); p.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); p.ctx.fill(); }
  p.over();
  for (const [x, y, rx, ry] of pts) { p.ctx.fillStyle = 'rgba(0,0,0,1)'; p.ctx.beginPath(); p.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); p.ctx.fill(); }
  p.glaze();
}

/** Ink frog, faces +x: [sit, crouch, leap, tongue]. */
export function buildFrogFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0, 1, 2, 3].forEach((i) => {
    const p = new Painter(2.6, 2.2, SPRITE_PPU, -1.3, -0.4);
    const r = new Rng(seed + i * 7);
    const sq = i === 1 ? 0.75 : i === 2 ? 1.3 : 1;
    const b = noisyOutline(0, 0.32 * sq, 0.62 / Math.sqrt(sq), 0.34 * sq, 0.16, seed + i);
    body(p, b, 0.72, seed + i, mixPig(INK, PIG_B, 0.3));
    // eye bumps on top
    for (const ex of [0.12, 0.38]) p.circle(ex, 0.58 * sq + 0.08, 0.11, mixPig(INK, PIG_B, 0.3), 0.85);
    eyes(p, [[0.14, 0.64 * sq + 0.1, 0.05, 0.06], [0.4, 0.64 * sq + 0.1, 0.05, 0.06]]);
    // the wide mouth
    stroke(p, [[0.1, 0.3 * sq], [0.4, 0.26 * sq], [0.6, 0.32 * sq]], { width: 0.04, load: 1, seed: r.int(1, 1e6) });
    // legs: folded, or flung back in the leap
    if (i === 2) {
      stroke(p, [[-0.4, 0.2], [-0.8, -0.05], [-1.05, -0.2]], { width: 0.1, load: 1, seed: r.int(1, 1e6), taperEnd: 0.6 });
      stroke(p, [[0.3, 0.1], [0.55, -0.15]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.6 });
    } else {
      stroke(p, [[-0.45, 0.15], [-0.7, 0.05], [-0.5, -0.12]], { width: 0.12, load: 1, seed: r.int(1, 1e6), taperEnd: 0.5 });
      stroke(p, [[0.3, 0.08], [0.45, -0.12]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.6 });
    }
    if (i === 3) stroke(p, [[0.55, 0.3], [0.95, 0.32], [1.2, 0.3]], { width: 0.06, pig: mixPig(INK, PIG_A, 0.6), load: 0.9, seed: r.int(1, 1e6), taperEnd: 0.2 });
    out.push(frameFrom(p));
  });
  return out;
}

/** Mist goat, faces +x: [idle, run a, run b, stunned]. */
export function buildGoatFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0, 0.08, -0.08, 0].forEach((lean, i) => {
    const p = new Painter(3, 2.6, SPRITE_PPU, -1.5, -0.4);
    const r = new Rng(seed + i * 13);
    const b = noisyOutline(lean, 0.6, 0.7, 0.32, 0.2, seed + i);
    body(p, b, 0.5, seed + i, mixPig(INK, PIG_B, 0.5));
    // head, horns curling back, beard
    p.circle(0.72 + lean, 0.88, 0.2, INK, 0.75);
    const horn: V2[] = [];
    for (let k = 0; k <= 10; k++) { const a = Math.PI * 0.2 + k * 0.28; horn.push([0.66 + lean - Math.cos(a) * 0.28 + k * 0.01, 1.0 + Math.sin(a) * 0.26]); }
    stroke(p, horn, { width: 0.07, load: 1, seed: r.int(1, 1e6), taperEnd: 0.8 });
    stroke(p, [[0.8 + lean, 0.72], [0.82 + lean, 0.52]], { width: 0.06, load: 0.8, dry: 0.5, seed: r.int(1, 1e6), taperEnd: 0.9 });
    const st = i === 1 ? 0.14 : i === 2 ? -0.14 : 0;
    for (const lx of [-0.5, -0.25, 0.3, 0.52]) stroke(p, [[lx + lean * 0.5, 0.35], [lx + st * (lx > 0 ? 1 : -1), -0.15]], { width: 0.07, load: 1, dry: 0.4, seed: r.int(1, 1e6), taperEnd: 0.3 });
    eyes(p, [[0.78 + lean, 0.92, i === 3 ? 0.07 : 0.05, i === 3 ? 0.07 : 0.035]]);
    out.push(frameFrom(p));
  });
  return out;
}

/** Mist wraith: a hanging veil with two eyes, [a, b]. */
export function buildWraithFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 2; i++) {
    const p = new Painter(2.4, 3.2, SPRITE_PPU, -1.2, -0.3);
    const r = new Rng(seed + i);
    const pts: V2[] = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const top = Math.sin(a) > 0;
      const rx = 0.55 + (top ? 0 : 0.1);
      const y = top ? 1.3 + Math.sin(a) * 0.9 : 1.3 + Math.sin(a) * 1.2 + Math.sin(k * 2.7 + i) * 0.12;
      pts.push([Math.cos(a) * rx, y]);
    }
    p.glaze();
    washPoly(p, roughen(pts, 0.03, seed + i, 0.08), { pig: mixPig(INK, PIG_B, 0.6), density: 0.32, soft: 0.45, seed: seed + i });
    for (let k = 0; k < 4; k++) stroke(p, [[-0.35 + k * 0.23, 0.6], [-0.38 + k * 0.23 + Math.sin(k + i) * 0.08, 0.1 + r.range(0, 0.2)]], { width: 0.05, load: 0.5, dry: 0.7, seed: r.int(1, 1e6), taperEnd: 0.9 });
    p.circle(-0.18, 1.75, 0.09, INK, 0.9);
    p.circle(0.18, 1.75, 0.09, INK, 0.9);
    out.push(frameFrom(p));
  }
  return out;
}

/** Jade mantis, faces +x: [idle, raise, slash, run]. */
export function buildMantisFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0, 1, 2, 3].forEach((i) => {
    const p = new Painter(3, 3, SPRITE_PPU, -1.5, -0.4);
    const r = new Rng(seed + i * 5);
    const green = mixPig(INK, PIG_A, 0.55);
    p.glaze();
    // long abdomen and thorax
    washPoly(p, roughen([[-0.9, 0.42], [-0.2, 0.5], [0.2, 0.75], [0.15, 0.9], [-0.25, 0.68], [-0.9, 0.56]], 0.01, seed + i, 0.05), { pig: green, density: 0.7, soft: 0.05, edge: 0.8, seed: seed + i });
    // triangular head
    washPoly(p, [[0.15, 1.05], [0.48, 1.12], [0.3, 0.92]], { pig: green, density: 0.85, soft: 0.05, seed: seed + 9 });
    eyes(p, [[0.36, 1.07, 0.04, 0.03]]);
    // scythe arms
    const arm: V2[] = i === 1 ? [[0.2, 0.85], [0.35, 1.35], [0.55, 1.5]] : i === 2 ? [[0.2, 0.85], [0.75, 0.75], [1.15, 0.5]] : [[0.2, 0.85], [0.45, 1.05], [0.42, 0.75]];
    stroke(p, arm, { width: 0.07, load: 1, seed: r.int(1, 1e6), taperEnd: 0.9 });
    // thin legs
    const st = i === 3 ? 0.15 : 0;
    for (const lx of [-0.5, -0.15, 0.05]) stroke(p, [[lx, 0.5], [lx - 0.15 + st, 0.2], [lx - 0.05 - st, -0.15]], { width: 0.04, load: 1, seed: r.int(1, 1e6) });
    out.push(frameFrom(p));
  });
  return out;
}
