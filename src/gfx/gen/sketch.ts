/**
 * The Sketch: the master's first child, painted all in black and never finished. The same few strokes
 * as the child, but taller, darker, with the construction lines still showing — and where the red
 * scarf should be, only a dotted outline.
 */
import { Painter, INK, PIG_B, mixPig } from '../paint';
import { stroke, V2 } from '../brush';
import { washPoly, noisyOutline } from '../wash';
import { Frame, frameFrom } from '../sprite';
import { SPRITE_PPU } from './flora';
import { Rng } from '../rng';

/** Poses, in this order: idle, idle (breath), wind-up, strike, cast (drawing a circle), dash, breathless, kneel. */
export const SKETCH_F = { idle: 0, idle2: 1, windup: 2, strike: 3, cast: 4, dash: 5, breathless: 6, kneel: 7 };

interface Pose { legF: number; legB: number; reach: number; raise: number; bob: number; lean: number; kneel?: boolean }

const POSES: Pose[] = [
  { legF: 0.2, legB: -0.2, reach: 0.2, raise: 0, bob: 0, lean: 0 },
  { legF: 0.2, legB: -0.2, reach: 0.2, raise: 0, bob: -0.03, lean: 0.02 },
  { legF: 0.6, legB: -0.5, reach: -0.6, raise: 0.8, bob: -0.05, lean: -0.08 },
  { legF: 1, legB: -0.8, reach: 1.2, raise: 0.1, bob: -0.08, lean: 0.16 },
  { legF: 0.4, legB: -0.4, reach: 1, raise: 0.6, bob: 0, lean: 0.04 },
  { legF: 1.1, legB: -1.1, reach: 0.8, raise: 0, bob: -0.12, lean: 0.3 },
  { legF: 0.5, legB: -0.3, reach: 0, raise: -0.4, bob: -0.12, lean: 0.22 },
  { legF: 0, legB: 0, reach: 0, raise: -0.6, bob: -0.4, lean: 0.12, kneel: true },
];

const K = 1.4;

function paintSketch(pp: Pose, seed: number): Painter {
  const p = new Painter(2.8, 3.2, SPRITE_PPU, -1.4, -0.3);
  p.glaze();
  const r = new Rng(seed);
  const b = pp.bob, lean = pp.lean;
  const s = (x: number, y: number): V2 => [x * K, y * K];
  const hipY = (pp.kneel ? 0.2 : 0.36) + b;
  // construction lines: an axis, an oval for the body, a circle for the head (the master's first marks)
  const hx = lean * 1.3, hy = (pp.kneel ? 0.66 : 0.9) + b;
  stroke(p, [s(lean * 0.4, 0), s(lean * 0.9, hipY + 0.3), s(hx, hy + 0.25)], { width: 0.014, load: 0.28, dry: 0.7, seed: r.int(1, 1e6), press: 0 });
  const oval: V2[] = [];
  for (let k = 0; k <= 22; k++) { const a = (k / 22) * Math.PI * 2.1; oval.push(s(lean * 0.6 + Math.cos(a) * 0.27, hipY + 0.2 + Math.sin(a) * 0.3)); }
  stroke(p, oval, { width: 0.012, load: 0.22, dry: 0.75, seed: r.int(1, 1e6), press: 0 });
  const ring: V2[] = [];
  for (let k = 0; k <= 18; k++) { const a = (k / 18) * Math.PI * 2.15 + 0.3; ring.push(s(hx + Math.cos(a) * 0.19, hy + Math.sin(a) * 0.18)); }
  stroke(p, ring, { width: 0.012, load: 0.25, dry: 0.7, seed: r.int(1, 1e6), press: 0 });
  // legs
  const leg = (swing: number, back: boolean) => {
    if (pp.kneel) {
      const kx = back ? -0.12 : 0.18;
      stroke(p, [s(lean * 0.5 + (back ? -0.04 : 0.04), hipY), s(kx, 0.08), s(kx - 0.22, 0.02)], { width: 0.1, load: 1, dry: 0.35, taperStart: 0.05, taperEnd: 0.3, seed: r.int(1, 1e6), body: 0.8 });
      return;
    }
    const fx = swing * 0.2, fy = 0.02 + Math.max(0, -swing) * 0.05;
    stroke(p, [s(lean * 0.5, hipY), s(fx * 0.6 + lean * 0.2, (hipY + fy) / 2 + 0.02), s(fx, fy)], {
      width: 0.1, load: back ? 0.8 : 1, dry: 0.35, taperStart: 0.05, taperEnd: 0.25, seed: r.int(1, 1e6), body: 0.8, press: 0.2,
    });
  };
  leg(pp.legB, true);
  leg(pp.legF, false);
  // robe: denser than the child's, all ink
  const robe: V2[] = [s(-0.17 + lean, hipY + 0.44), s(0.13 + lean, hipY + 0.44), s(0.22 + lean * 0.5, hipY - 0.04), s(-0.26 + lean * 0.5, hipY - 0.04)];
  p.reserve(() => robe.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
  p.glaze();
  washPoly(p, robe, { pig: mixPig(INK, PIG_B, 0.1), density: 0.62, soft: 0.05, edge: 0.9, seed: r.int(1, 1e6) });
  washPoly(p, robe, { pig: INK, density: 0.4, soft: 0.2, seed: r.int(1, 1e6) });
  stroke(p, [robe[0], s(-0.2 + lean * 0.7, hipY + 0.2), robe[3]], { width: 0.07, load: 1, dry: 0.45, seed: r.int(1, 1e6), taperStart: 0.05, taperEnd: 0.4 });
  // where the red scarf should be: a dotted outline, nothing inside
  const ny = hipY + 0.42;
  for (let k = 0; k < 6; k++) {
    const t = k / 5;
    const x = -0.15 + lean + t * 0.3, y = ny - Math.sin(t * Math.PI) * 0.03;
    stroke(p, [s(x, y), s(x + 0.025, y)], { width: 0.016, load: 0.55, seed: r.int(1, 1e6), press: 0 });
  }
  for (let k = 0; k < 4; k++) {
    const x = -0.04 + lean - k * 0.07, y = ny - 0.04 - k * 0.045;
    stroke(p, [s(x, y), s(x - 0.02, y - 0.012)], { width: 0.014, load: 0.5, seed: r.int(1, 1e6), press: 0 });
  }
  // arms: the back one hangs, the front one holds a long brush
  const shx = 0.15 + lean, shy = hipY + 0.38;
  stroke(p, [s(-0.15 + lean, shy), s(-0.2 + lean, shy - 0.16), s(-0.2 + lean + pp.raise * -0.05, shy - 0.32)], { width: 0.07, load: 0.85, dry: 0.45, seed: r.int(1, 1e6), taperEnd: 0.4 });
  const ha = -1.2 + pp.reach * 1.1 + pp.raise * 0.9;
  const hand: V2 = [shx + Math.cos(ha) * 0.32, shy + Math.sin(ha) * 0.32];
  stroke(p, [s(shx, shy), s((shx + hand[0]) / 2 + 0.02, (shy + hand[1]) / 2 + 0.03), s(hand[0], hand[1])], { width: 0.075, load: 1, dry: 0.4, taperStart: 0.05, taperEnd: 0.35, seed: r.int(1, 1e6), body: 0.7 });
  const ba = ha + (pp.reach > 0.6 ? -0.25 : 0.5);
  const tip: V2 = [hand[0] + Math.cos(ba) * 0.62, hand[1] + Math.sin(ba) * 0.62];
  stroke(p, [s(hand[0] - Math.cos(ba) * 0.08, hand[1] - Math.sin(ba) * 0.08), s(tip[0], tip[1])], { width: 0.035, load: 0.95, seed: r.int(1, 1e6), taperStart: 0, taperEnd: 0.05, press: 0 });
  stroke(p, [s(tip[0], tip[1]), s(tip[0] + Math.cos(ba) * 0.14, tip[1] + Math.sin(ba) * 0.14)], { width: 0.08, load: 1, dry: 0.3, seed: r.int(1, 1e6), taperStart: 0.1, taperEnd: 0.95 });
  // head: a dark wash with two paper-white eyes left in it
  const head = noisyOutline(hx * K, hy * K, 0.17 * K, 0.155 * K, 0.07, r.int(1, 1e6));
  washPoly(p, head, { pig: INK, density: 0.72, soft: 0.08, edge: 0.9, seed: r.int(1, 1e6) });
  p.lift();
  p.ctx.fillStyle = 'rgba(0,0,0,0.95)';
  for (const ex of [0.045, 0.12]) {
    p.ctx.beginPath();
    p.ctx.ellipse((hx + ex) * K, (hy - 0.01) * K, 0.022 * K, 0.03 * K, 0, 0, Math.PI * 2);
    p.ctx.fill();
  }
  p.glaze();
  // the hat, only outlined: the master never filled it
  const hatY = hy + 0.12;
  stroke(p, [s(hx - 0.4, hatY - 0.01), s(hx - 0.16, hatY - 0.1), s(hx + 0.16, hatY - 0.1), s(hx + 0.4, hatY - 0.01)], { width: 0.03, load: 0.7, dry: 0.55, seed: r.int(1, 1e6), taperStart: 0.1, taperEnd: 0.3 });
  stroke(p, [s(hx - 0.14, hatY + 0.01), s(hx, hatY + 0.13), s(hx + 0.13, hatY + 0.01)], { width: 0.025, load: 0.6, dry: 0.6, seed: r.int(1, 1e6) });
  // loose strands of ink trailing off the figure (it is never quite still)
  for (let k = 0; k < 5; k++) {
    const y = hipY + r.range(-0.1, 0.5);
    const x = -0.28 + lean * 0.5 - r.range(0, 0.12);
    stroke(p, [s(x, y), s(x - r.range(0.12, 0.3), y + r.gauss() * 0.06)], { width: r.range(0.012, 0.025), load: r.range(0.4, 0.8), dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.9, press: 0 });
  }
  return p;
}

export function buildSketchFrames(seed: number): Frame[] {
  return POSES.map((pp, i) => frameFrom(paintSketch(pp, seed + i * 37)));
}

/** A black ink circle drawn in pieces: `n` arcs, shown one after another as it closes. */
export function buildBlackRing(radius: number, n: number, seed: number): Frame[] {
  const out: Frame[] = [];
  const pad = 0.5;
  const sz = radius * 2 + pad * 2;
  for (let i = 0; i < n; i++) {
    const p = new Painter(sz, sz, SPRITE_PPU / 2, -sz / 2, -sz / 2);
    p.glaze();
    const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2, a1 = -Math.PI / 2 + ((i + 1.08) / n) * Math.PI * 2;
    const pts: V2[] = [];
    for (let k = 0; k <= 8; k++) { const a = a0 + ((a1 - a0) * k) / 8; pts.push([Math.cos(a) * radius, Math.sin(a) * radius]); }
    stroke(p, pts, { width: 0.2, load: 1, dry: 0.3, seed: seed + i, taperStart: 0.02, taperEnd: 0.02, press: 0 });
    out.push(frameFrom(p));
  }
  return out;
}
