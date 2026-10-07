/**
 * Act I, zone by zone: paper moths in the orchard, ink eels in the firefly marshes, inkpot crabs on
 * the riverbanks, ink stags in the red hills.
 */
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

/** Paper moth: a folded sketch with ink veins, [wings up, wings down, burst]. */
export function buildMothFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 3; i++) {
    const p = new Painter(1.8, 1.6, SPRITE_PPU, -0.9, -0.4);
    const r = new Rng(seed + i);
    p.glaze();
    const up = i === 0 ? 1 : i === 1 ? 0.35 : 1.25;
    for (const s of [1, -1]) {
      const wing: V2[] = [[0, 0.45], [s * 0.7, 0.45 + 0.5 * up], [s * 0.8, 0.45 + 0.1 * up], [s * 0.45, 0.25]];
      p.reserve(() => poly(p, wing), 0.9);
      p.glaze();
      washPoly(p, wing, { pig: mixPig(INK, PIG_B, 0.3), density: 0.18, soft: 0.1, edge: 0.9, seed: seed + 10 + s });
      stroke(p, [wing[0], wing[1]], { width: 0.03, load: 0.8, seed: r.int(1, 1e6) });
      stroke(p, [[0, 0.42], [s * 0.6, 0.45 + 0.25 * up]], { width: 0.02, load: 0.6, dry: 0.5, seed: r.int(1, 1e6) });
      // the master's old brush marks show through the paper
      stroke(p, [[s * 0.2, 0.5 + 0.15 * up], [s * 0.45, 0.55 + 0.3 * up]], { width: 0.04, pig: mixPig(INK, PIG_A, 0.5), load: 0.5, dry: 0.6, seed: r.int(1, 1e6) });
    }
    stroke(p, [[0, 0.25], [0, 0.65]], { width: 0.09, load: 1, seed: r.int(1, 1e6), taperEnd: 0.5 });
    for (const s of [1, -1]) stroke(p, [[0, 0.65], [s * 0.15, 0.85]], { width: 0.02, load: 0.9, seed: r.int(1, 1e6) });
    if (i === 2) for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; p.circle(Math.cos(a) * 0.6, 0.45 + Math.sin(a) * 0.4, 0.05, mixPig(INK, PIG_A, 0.4), 0.5); }
    out.push(frameFrom(p));
  }
  return out;
}

/** Ink eel: a sinuous line of ink, [swim a, swim b, strike]. */
export function buildEelFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 3; i++) {
    const p = new Painter(3, 1.6, SPRITE_PPU, -1.5, -0.4);
    const r = new Rng(seed + i);
    p.glaze();
    const pts: V2[] = [];
    const strike = i === 2;
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const x = -1.2 + t * (strike ? 2.5 : 2.2);
      const y = 0.25 + Math.sin(t * Math.PI * 2 + i * 1.6) * (strike ? 0.05 : 0.16) + (strike ? t * 0.4 : 0);
      pts.push([x, y]);
    }
    stroke(p, pts, { width: 0.26, pig: mixPig(INK, PIG_B, 0.2), load: 0.95, dry: 0.2, seed: r.int(1, 1e6), taperStart: 0.9, taperEnd: 0.15 });
    stroke(p, pts.slice(3), { width: 0.07, load: 0.6, dry: 0.6, seed: r.int(1, 1e6), taperStart: 0.5, taperEnd: 0.5 });
    const h = pts[pts.length - 1];
    p.circle(h[0], h[1], 0.16, INK, 0.9);
    eyes(p, [[h[0] + 0.03, h[1] + 0.06, 0.035, 0.035]]);
    if (strike) stroke(p, [[h[0] + 0.1, h[1] - 0.02], [h[0] + 0.3, h[1] - 0.08]], { width: 0.05, load: 1, seed: r.int(1, 1e6) });
    // a barbel, like the master's signature flourish
    stroke(p, [[h[0], h[1] - 0.08], [h[0] - 0.15, h[1] - 0.25], [h[0] - 0.05, h[1] - 0.35]], { width: 0.02, load: 0.8, seed: r.int(1, 1e6) });
    out.push(frameFrom(p));
  }
  return out;
}

/** Inkpot crab: a shell like an inkstone, two claws, [walk a, walk b, pinch, shell]. */
export function buildCrabFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 4; i++) {
    const p = new Painter(2.4, 1.8, SPRITE_PPU, -1.2, -0.3);
    const r = new Rng(seed + i * 3);
    const shell = i === 3;
    // legs
    if (!shell) {
      const st = i === 0 ? 0.08 : i === 1 ? -0.08 : 0;
      for (const s of [1, -1]) for (let k = 0; k < 3; k++) stroke(p, [[s * 0.3, 0.3 - k * 0.04], [s * (0.6 + k * 0.08), 0.35 + st * s], [s * (0.7 + k * 0.1), 0.0]], { width: 0.05, load: 1, seed: r.int(1, 1e6), taperEnd: 0.5 });
    }
    // the shell: a dark inkstone, its well full of ink
    body(p, noisyOutline(0, 0.42, 0.5, shell ? 0.3 : 0.34, 0.1, seed + i), 0.7, seed + i, mixPig(INK, PIG_B, 0.4));
    washPoly(p, noisyOutline(0, 0.5, 0.28, 0.14, 0.15, seed + 20 + i), { pig: INK, density: 0.9, soft: 0.1, seed: seed + 20 + i });
    if (!shell) {
      eyes(p, [[-0.14, 0.78, 0.04, 0.05], [0.14, 0.78, 0.04, 0.05]]);
      for (const s of [1, -1]) stroke(p, [[s * 0.14, 0.7], [s * 0.15, 0.8]], { width: 0.03, load: 1, seed: r.int(1, 1e6) });
      // claws: open, or snapping shut
      for (const s of [1, -1]) {
        const reach = i === 2 ? 0.95 : 0.7;
        stroke(p, [[s * 0.4, 0.45], [s * reach, 0.6], [s * (reach + 0.1), 0.75]], { width: 0.1, load: 1, seed: r.int(1, 1e6), taperEnd: 0.3 });
        washPoly(p, [[s * (reach + 0.02), 0.75], [s * (reach + 0.3), 0.95], [s * (reach + 0.35), 0.75], [s * (reach + 0.12), 0.68]], { pig: INK, density: 0.85, soft: 0.05, seed: seed + 30 + s });
        if (i !== 2) stroke(p, [[s * (reach + 0.1), 0.72], [s * (reach + 0.32), 0.6]], { width: 0.05, load: 1, seed: r.int(1, 1e6) });
      }
    }
    out.push(frameFrom(p));
  }
  return out;
}

/** Ink stag, faces +x: [stand, step, rear, plant]. Its antlers are branches of the master's plum trees. */
export function buildStagFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 4; i++) {
    const p = new Painter(3.4, 3.6, SPRITE_PPU, -1.7, -0.3);
    const r = new Rng(seed + i * 11);
    const rear = i === 2 ? 0.35 : 0, low = i === 3 ? -0.35 : 0;
    const coat = mixPig(INK, PIG_B, 0.45);
    // body
    // a deep chest, a slim belly, a round rump
    const b: V2[] = [];
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * Math.PI * 2;
      const x = Math.cos(a) * 0.85 - 0.1;
      const front = Math.cos(a) > 0.2 ? 1.2 : Math.cos(a) < -0.5 ? 1.05 : 0.8;
      const y = 1.2 + Math.sin(a) * 0.24 * front + (x > 0 ? rear * (x + 0.1) * 0.5 : 0);
      b.push([x, y]);
    }
    body(p, roughen(b, 0.01, seed + i, 0.03), 0.62, seed + i, coat);
    washPoly(p, noisyOutline(-0.2, 1.32 + rear * 0.2, 0.6, 0.1, 0.2, seed + 50 + i), { pig: INK, density: 0.25, soft: 0.5, seed: seed + 50 + i });
    // legs, slender
    const st = i === 1 ? 0.12 : 0;
    for (const [lx, ph] of [[-0.7, 1], [-0.45, -1], [0.3, 1], [0.5, -1]] as [number, number][]) {
      const top: V2 = [lx, lx > 0 ? 1.05 + rear : 1.0];
      // a knee forward, a hock back, a small black hoof
      const knee: V2 = [lx + st * ph + (lx > 0 ? 0.06 : -0.08), 0.55 + (lx > 0 ? rear * 0.6 : 0)];
      const hoof: V2 = [lx + st * ph * 1.2 + (lx > 0 ? 0.02 : 0.05), lx > 0 ? rear * 0.9 : 0];
      stroke(p, [top, knee, hoof], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperStart: 0.05, taperEnd: 0.3 });
      p.circle(hoof[0], hoof[1] + 0.03, 0.05, INK, 0.95);
    }
    // neck and head
    const hx = 0.95, hy = 1.95 + rear + low * 1.6;
    stroke(p, [[0.55, 1.3 + rear], [0.8, 1.65 + rear + low], [hx, hy]], { width: 0.2, pig: coat, load: 0.85, seed: r.int(1, 1e6) });
    washPoly(p, [[hx - 0.15, hy + 0.1], [hx + 0.42, hy - 0.08], [hx + 0.35, hy - 0.2], [hx - 0.1, hy - 0.12]], { pig: coat, density: 0.7, soft: 0.05, seed: seed + 40 + i });
    eyes(p, [[hx + 0.08, hy + 0.02, 0.04, 0.035]]);
    // antlers: plum branches, a blossom or two
    const ant = (s: number) => {
      const base: V2 = [hx - 0.05, hy + 0.12];
      const tip: V2 = [hx - 0.3 + s * 0.15 + (i === 3 ? 0.6 : 0), hy + 1.0 + (i === 3 ? -0.5 : 0)];
      stroke(p, [base, [base[0] - 0.1 + (i === 3 ? 0.3 : 0), base[1] + 0.45], tip], { width: 0.06, load: 1, dry: 0.3, seed: r.int(1, 1e6), taperEnd: 0.8 });
      for (let k = 0; k < 3; k++) {
        const t = 0.35 + k * 0.22;
        const bx = base[0] + (tip[0] - base[0]) * t, by = base[1] + (tip[1] - base[1]) * t;
        stroke(p, [[bx, by], [bx + (s > 0 ? 0.22 : -0.18), by + 0.18]], { width: 0.035, load: 1, seed: r.int(1, 1e6), taperEnd: 0.8 });
      }
      p.circle(tip[0], tip[1], 0.06, mixPig(INK, PIG_A, 0.6), 0.6);
    };
    ant(1); ant(-1);
    // a tuft of tail
    stroke(p, [[-0.9, 1.3 + rear * 0.3], [-1.05, 1.4]], { width: 0.1, load: 0.9, seed: r.int(1, 1e6), taperEnd: 0.6 });
    out.push(frameFrom(p));
  }
  return out;
}
