/**
 * The last guardian: the master's own hand, come down out of a sleeve of ink, still trying to wipe
 * the blot off its painting, and wiping the world with it. Pale skin left as paper, knuckles and
 * creases in dry ink, a red cord tied round the wrist.
 */
import { Painter, INK, PIG_B, VERMILION, mixPig } from '../paint';
import { stroke, V2 } from '../brush';
import { washPoly, noisyOutline, roughen } from '../wash';
import { Frame, frameFrom } from '../sprite';
import { Rng } from '../rng';
import { SPRITE_PPU } from './flora';

export interface HandFrames { pig: Frame[]; red: Frame[] }

type Pose = 'open' | 'fist' | 'point' | 'slam' | 'tremble';
/** Frame order. */
export const HAND = { open: 0, fist: 1, point: 2, slam: 3, tremble: 4 } as const;

function poly(p: Painter, pts: V2[]): void {
  pts.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
  p.ctx.closePath();
}

/** A finger as a tapered outline from its root to its tip, bending by `curl`. */
function finger(root: V2, dir: number, len: number, width: number, curl: number): V2[] {
  const pts: V2[] = [];
  const n = 6;
  let a = dir, x = root[0], y = root[1];
  const left: V2[] = [], right: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = width * (1 - t * 0.35) * (i === n ? 0.6 : 1);
    left.push([x + Math.cos(a + Math.PI / 2) * w / 2, y + Math.sin(a + Math.PI / 2) * w / 2]);
    right.push([x + Math.cos(a - Math.PI / 2) * w / 2, y + Math.sin(a - Math.PI / 2) * w / 2]);
    x += Math.cos(a) * (len / n);
    y += Math.sin(a) * (len / n);
    a += curl / n;
  }
  pts.push(...left, ...right.reverse());
  return pts;
}

/** The hand, palm down, fingers towards the ground: [open, fist, point, slam, tremble]. */
export function buildHandFrames(seed: number): HandFrames {
  const pig: Frame[] = [], red: Frame[] = [];
  const poses: Pose[] = ['open', 'fist', 'point', 'slam', 'tremble'];
  const skin = mixPig(INK, PIG_B, 0.55);
  poses.forEach((pose, i) => {
    const p = new Painter(7, 9, SPRITE_PPU / 1.8, -3.5, -0.6);
    const q = new Painter(7, 9, SPRITE_PPU / 2.6, -3.5, -0.6);
    p.glaze(); q.glaze();
    const r = new Rng(seed + i * 31);
    const flat = pose === 'slam' ? 0.7 : 1;
    const shake = pose === 'tremble' ? 0.08 : 0;
    const j = (v: number) => v + (shake ? r.gauss() * shake : 0);
    // the sleeve: a great fall of ink coming down from above the page
    const sleeve = roughen([[-1.9, 8.6], [1.9, 8.6], [1.45, 4.5 * flat + 0.6], [-1.45, 4.5 * flat + 0.6]], 0.08, seed + 1, 0.12);
    washPoly(p, sleeve, { pig: INK, density: 0.62, soft: 0.25, edge: 0.9, seed: seed + 2, blooms: 2 });
    for (let k = 0; k < 6; k++) {
      const x = -1.5 + k * 0.6 + r.gauss() * 0.05;
      stroke(p, [[x, 8.4], [x * 0.85, 4.6 * flat + 0.8]], { width: 0.05, load: 0.5, dry: 0.7, seed: r.int(1, 1e6), press: 0 });
    }
    // the wrist and the palm, left as pale paper inside a dry outline
    const palmY = 3.5 * flat;
    const palm: V2[] = [[-1.15, palmY + 1.25], [1.15, palmY + 1.25], [1.3, palmY - 0.1], [0.9, palmY - 0.95 * flat], [-0.95, palmY - 0.95 * flat], [-1.3, palmY - 0.1]];
    const fingers: V2[][] = [];
    const tipY = palmY - 0.95 * flat;
    const roots: V2[] = [[-0.72, tipY + 0.1], [-0.24, tipY], [0.24, tipY], [0.72, tipY + 0.1]];
    const spread = pose === 'slam' ? 0.45 : pose === 'open' || pose === 'tremble' ? 0.3 : 0.06;
    const widths = [0.36, 0.42, 0.4, 0.33];
    const lines: { root: V2; dir: number; len: number; curl: number }[] = [];
    roots.forEach((rt, k) => {
      const dir = -Math.PI / 2 + (k - 1.5) * spread;
      const len = [1.3, 1.6, 1.5, 1.1][k] * (pose === 'slam' ? 0.85 : 1);
      let curl = 0;
      if (pose === 'fist') curl = 2.7;
      if (pose === 'point') curl = k === 1 ? 0 : 2.6;
      if (pose === 'tremble') curl = 0.6 + r.range(0, 0.5);
      const l = pose === 'fist' || (pose === 'point' && k !== 1) ? len * 0.62 : len;
      const c = curl * (k < 2 ? 1 : -1) * 0.5;
      fingers.push(finger([j(rt[0]), j(rt[1])], dir, l, widths[k], c));
      lines.push({ root: rt, dir, len: l, curl: c });
    });
    // the thumb, to the side
    const thumb = finger([1.2, palmY + 0.2], -0.5 - (pose === 'slam' ? 0.5 : 0), pose === 'fist' ? 0.7 : 1.05, 0.44, pose === 'fist' ? -1.8 : -0.5);
    for (const part of [palm, ...fingers, thumb]) {
      p.reserve(() => poly(p, part), 0.95);
      p.glaze();
      washPoly(p, part, { pig: skin, density: 0.12, soft: 0.4, edge: 0.95, seed: r.int(1, 1e6) });
      stroke(p, [...part, part[0]], { width: 0.06, load: 0.95, dry: 0.45, seed: r.int(1, 1e6), taperStart: 0.03, taperEnd: 0.03 });
    }
    // the back of the hand: tendons fanning from the wrist to the knuckles, the knuckles themselves
    lines.forEach((ln, k) => {
      stroke(p, [[(k - 1.5) * 0.18, palmY + 1.1], [ln.root[0] * 0.95, ln.root[1] + 0.25]], { width: 0.03, pig: skin, load: 0.45, dry: 0.7, seed: r.int(1, 1e6), press: 0, taperStart: 0.3, taperEnd: 0.3 });
      const [kx, ky] = ln.root;
      stroke(p, [[kx - 0.13, ky + 0.12], [kx, ky + 0.2], [kx + 0.13, ky + 0.12]], { width: 0.04, load: 0.75, dry: 0.4, seed: r.int(1, 1e6) });
    });
    // finger joints and nails, following each finger
    lines.forEach((ln, k) => {
      let a = ln.dir, x = ln.root[0], y = ln.root[1];
      const n = 6;
      for (let i = 1; i <= n; i++) {
        x += Math.cos(a) * (ln.len / n);
        y += Math.sin(a) * (ln.len / n);
        a += ln.curl / n;
        const w = widths[k] * (1 - (i / n) * 0.35) * 0.42;
        const nx = Math.cos(a + Math.PI / 2) * w, ny = Math.sin(a + Math.PI / 2) * w;
        if (i === 2 || i === 4) stroke(p, [[x - nx, y - ny], [x + nx, y + ny]], { width: 0.03, load: 0.6, dry: 0.5, seed: r.int(1, 1e6), press: 0 });
        if (i === n - 1) {
          // the nail: a pale rounded shape near the tip
          const nail: V2[] = [[x - nx * 0.7, y - ny * 0.7], [x + nx * 0.7, y + ny * 0.7], [x + nx * 0.6 + Math.cos(a) * 0.16, y + ny * 0.6 + Math.sin(a) * 0.16], [x - nx * 0.6 + Math.cos(a) * 0.16, y - ny * 0.6 + Math.sin(a) * 0.16]];
          stroke(p, [...nail, nail[0]], { width: 0.025, load: 0.7, seed: r.int(1, 1e6), press: 0 });
        }
      }
    });
    // the red cord round the wrist, and its two loose ends
    const wy = palmY + 1.25;
    stroke(q, [[-1.2, wy + 0.05], [0, wy - 0.06], [1.2, wy + 0.05]], { width: 0.14, pig: VERMILION, load: 1, seed: seed + 90, taperStart: 0.05, taperEnd: 0.05 });
    stroke(q, [[0.3, wy - 0.05], [0.45, wy - 0.6], [0.35, wy - 1.0]], { width: 0.08, pig: VERMILION, load: 0.9, seed: seed + 91, taperEnd: 0.8 });
    stroke(q, [[0.42, wy - 0.05], [0.7, wy - 0.5], [0.8, wy - 0.85]], { width: 0.07, pig: VERMILION, load: 0.9, seed: seed + 92, taperEnd: 0.8 });
    pig.push(frameFrom(p));
    red.push(frameFrom(q));
  });
  return { pig, red };
}

/** The strip of the page the hand has wiped: a torn hole into nothing, frayed at the edges. */
export function erasedStrip(length: number, width: number, seed: number): Painter {
  const p = new Painter(length + 1, width + 1, SPRITE_PPU / 3, -0.5, -(width + 1) / 2);
  const o = roughen([[0, -width / 2], [length, -width / 2], [length, width / 2], [0, width / 2]], 0.12, seed, 0.25);
  p.glaze();
  washPoly(p, o, { pig: INK, density: 0.88, soft: 0.05, edge: 0.4, seed });
  const r = new Rng(seed + 1);
  for (let i = 0; i < Math.ceil(length * 1.5); i++) {
    const x = r.range(0, length), s = r.chance(0.5) ? 1 : -1;
    stroke(p, [[x, s * width / 2], [x + r.gauss() * 0.15, s * (width / 2 + r.range(0.08, 0.25))]], { width: 0.05, pig: mixPig(INK, PIG_B, 0.3), load: 0.7, dry: 0.6, seed: r.int(1, 1e6), press: 0 });
  }
  return p;
}

/** The brush the master planted in the snow by his hut. */
export function buildPlantedBrush(seed: number): Frame {
  const p = new Painter(1.6, 3.2, SPRITE_PPU, -0.8, -0.3);
  p.glaze();
  stroke(p, [[0.05, 0], [-0.02, 2.4]], { width: 0.1, pig: mixPig(INK, PIG_B, 0.2), load: 1, seed, taperStart: 0.02, taperEnd: 0.02 });
  washPoly(p, noisyOutline(0, 0.05, 0.12, 0.28, 0.2, seed + 1), { pig: INK, density: 0.9, soft: 0.05, seed: seed + 1 });
  stroke(p, [[-0.08, 2.35], [0.08, 2.35]], { width: 0.05, load: 1, seed: seed + 2 });
  return frameFrom(p);
}

/** The summit gate: a red torii in the clouds; sealed, a paper talisman hangs across it. [sealed, open]. */
export function buildSealGate(seed: number): { pig: Frame[]; red: Frame[] } {
  const pig: Frame[] = [], red: Frame[] = [];
  for (const sealed of [true, false]) {
    const p = new Painter(5, 5, SPRITE_PPU, -2.5, -0.4);
    const q = new Painter(5, 5, SPRITE_PPU / 2, -2.5, -0.4);
    p.glaze(); q.glaze();
    const r = new Rng(seed);
    for (const x of [-1.6, 1.6]) {
      const post: V2[] = [[x - 0.2, 0], [x + 0.2, 0], [x + 0.16, 3.3], [x - 0.16, 3.3]];
      washPoly(q, post, { pig: VERMILION, density: 0.85, soft: 0.05, edge: 0.6, seed: r.int(1, 1e6) });
      stroke(p, [...post, post[0]], { width: 0.04, load: 0.9, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.02 });
      washPoly(p, [[x - 0.26, -0.05], [x + 0.26, -0.05], [x + 0.26, 0.25], [x - 0.26, 0.25]], { pig: INK, density: 0.8, soft: 0.05, seed: r.int(1, 1e6) });
    }
    const beam: V2[] = [[-2.3, 3.25], [2.3, 3.25], [2.5, 3.65], [0, 3.55], [-2.5, 3.65]];
    washPoly(q, beam, { pig: VERMILION, density: 0.9, soft: 0.05, seed: seed + 5 });
    stroke(p, [[-2.55, 3.7], [0, 3.6], [2.55, 3.7]], { width: 0.12, load: 1, dry: 0.3, seed: seed + 6 });
    washPoly(q, [[-1.9, 2.6], [1.9, 2.6], [1.9, 2.8], [-1.9, 2.8]], { pig: VERMILION, density: 0.8, soft: 0.05, seed: seed + 7 });
    stroke(p, [[-1.9, 2.82], [1.9, 2.82]], { width: 0.04, load: 0.8, seed: seed + 8 });
    if (sealed) {
      // a long paper talisman hanging across, the master's seal stamped on it
      const strip: V2[] = [[-1.4, 2.55], [1.4, 2.55], [1.35, 0.5], [-1.35, 0.5]];
      p.reserve(() => poly(p, strip), 0.92);
      p.glaze();
      stroke(p, [...strip, strip[0]], { width: 0.035, load: 0.8, dry: 0.4, seed: seed + 9, taperStart: 0.02, taperEnd: 0.02 });
      for (let k = 0; k < 5; k++) stroke(p, [[-1.0 + k * 0.5, 2.3], [-1.05 + k * 0.5, 1.9 - (k % 2) * 0.3]], { width: 0.05, load: 0.7, seed: r.int(1, 1e6) });
      washPoly(q, roughen([[-0.38, 0.75], [0.38, 0.75], [0.38, 1.5], [-0.38, 1.5]], 0.03, seed + 10, 0.1), { pig: VERMILION, density: 0.95, soft: 0.05, seed: seed + 10 });
      stroke(q, [[0, 1.4], [0.04, 0.85]], { width: 0.08, pig: VERMILION, load: 1, seed: seed + 11 });
    }
    pig.push(frameFrom(p));
    red.push(frameFrom(q));
  }
  return { pig, red };
}
