/**
 * Act III's creatures, painted on snow: the yeti of the stair and the forest, the white snow fox and
 * its illusions, the paper crane of the glacier, the eraser of the erased valley (a hole in the drawing).
 */
import { Painter, INK, PIG_A, PIG_B, VERMILION, mixPig } from '../paint';
import { stroke, V2 } from '../brush';
import { washPoly, noisyOutline } from '../wash';
import { Frame, frameFrom } from '../sprite';
import { Rng } from '../rng';
import { SPRITE_PPU } from './flora';

function poly(p: Painter, pts: V2[]): void {
  pts.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
  p.ctx.closePath();
}

function eyes(p: Painter, pts: [number, number, number, number][]): void {
  p.lift();
  for (const [x, y, rx, ry] of pts) { p.ctx.fillStyle = 'rgba(0,0,0,1)'; p.ctx.beginPath(); p.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); p.ctx.fill(); }
  p.over();
  for (const [x, y, rx, ry] of pts) { p.ctx.fillStyle = 'rgba(0,0,0,1)'; p.ctx.beginPath(); p.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); p.ctx.fill(); }
  p.glaze();
}

/** Fur: short dry strokes around an outline, so a white body still reads on white snow. */
function fur(p: Painter, o: V2[], seed: number, n: number, len: number): void {
  const r = new Rng(seed);
  for (let k = 0; k < n; k++) {
    const i = r.int(0, o.length - 1);
    const [x, y] = o[i];
    const [nx, ny] = o[(i + 1) % o.length];
    const tx = nx - x, ty = ny - y, l = Math.hypot(tx, ty) || 1;
    const ox = ty / l, oy = -tx / l;
    stroke(p, [[x, y], [x + ox * len + r.gauss() * 0.03, y + oy * len + r.gauss() * 0.03]], { width: 0.035, load: 0.85, dry: 0.5, seed: r.int(1, 1e6), taperEnd: 0.9, press: 0 });
  }
}

/** Yeti, faces +x: [idle, walk a, walk b, raise, slam, throw]. White fur outlined in ink, a dark face. */
export function buildYetiFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 6; i++) {
    const p = new Painter(3.6, 3.6, SPRITE_PPU, -1.8, -0.3);
    const r = new Rng(seed + i * 13);
    p.glaze();
    const raise = i === 3 ? 1 : 0, slam = i === 4 ? 1 : 0;
    const st = i === 1 ? 0.1 : i === 2 ? -0.1 : 0;
    // the hulking body: mostly paper, the fur painted at its edge
    const b = noisyOutline(0, 1.25 - slam * 0.15, 0.95, 1.05 - slam * 0.15, 0.14, seed + i);
    p.reserve(() => poly(p, b), 0.95);
    p.glaze();
    washPoly(p, b, { pig: mixPig(INK, PIG_B, 0.45), density: 0.2, soft: 0.5, edge: 0.95, seed: seed + i, blooms: 1 });
    // shaggy: long fur at the rim, a few locks inside, a darker belly shadow
    fur(p, b, seed + 20 + i, 120, 0.22);
    for (let k = 0; k < 14; k++) {
      const x = r.range(-0.6, 0.6), y = r.range(0.6, 1.9) - slam * 0.15;
      stroke(p, [[x, y], [x + r.gauss() * 0.05, y - r.range(0.15, 0.3)]], { width: 0.03, load: 0.5, dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.9, press: 0 });
    }
    washPoly(p, noisyOutline(0, 0.65, 0.7, 0.3, 0.2, seed + 25 + i), { pig: INK, density: 0.12, soft: 0.6, seed: seed + 25 + i });
    // legs
    for (const lx of [-0.45, 0.45]) stroke(p, [[lx, 0.35], [lx + st * Math.sign(lx), 0.0]], { width: 0.3, load: 0.25, dry: 0.4, seed: r.int(1, 1e6) });
    for (const lx of [-0.45, 0.45]) stroke(p, [[lx - 0.25, 0.02], [lx + 0.25, 0.0]], { width: 0.06, load: 1, seed: r.int(1, 1e6) });
    // arms: hanging, raised high, or slammed down
    for (const s of [1, -1]) {
      const arm: V2[] = raise ? [[s * 0.75, 1.7], [s * 1.0, 2.5], [s * 0.7, 3.1]] : slam ? [[s * 0.8, 1.5], [s * 1.25, 0.9], [s * 1.35, 0.2]] : i === 5 && s > 0 ? [[0.8, 1.6], [1.35, 1.9], [1.6, 2.3]] : [[s * 0.85, 1.6], [s * 1.05, 1.0], [s * 0.95, 0.5]];
      stroke(p, arm, { width: 0.32, pig: mixPig(INK, PIG_B, 0.3), load: 0.22, dry: 0.4, seed: r.int(1, 1e6) });
      fur(p, arm, seed + 40 + s + i, 10, 0.1);
      stroke(p, [arm[2], [arm[2][0] + s * 0.08, arm[2][1] - 0.12]], { width: 0.08, load: 1, seed: r.int(1, 1e6) });
    }
    if (i === 5) washPoly(p, noisyOutline(1.65, 2.45, 0.32, 0.3, 0.15, seed + 60), { pig: mixPig(INK, PIG_A, 0.2), density: 0.18, soft: 0.2, edge: 0.9, seed: seed + 60 });
    // the face: dark, small eyes, a heavy brow
    const fx = 0.25, fy = 1.95 - slam * 0.2;
    washPoly(p, noisyOutline(fx, fy, 0.34, 0.3, 0.1, seed + 70), { pig: INK, density: 0.75, soft: 0.05, seed: seed + 70 });
    eyes(p, [[fx - 0.1, fy + 0.05, 0.05, 0.04], [fx + 0.14, fy + 0.05, 0.05, 0.04]]);
    p.lift();
    p.ctx.fillStyle = 'rgba(0,0,0,0.9)';
    p.ctx.fillRect(fx - 0.14, fy - 0.17, 0.3, 0.04);
    p.glaze();
    stroke(p, [[fx - 0.3, fy + 0.18], [fx + 0.3, fy + 0.16]], { width: 0.06, load: 1, seed: r.int(1, 1e6) });
    out.push(frameFrom(p));
  }
  return out;
}

/** Snow fox, faces +x: [run a, run b, bite, cast]. White on white: ink only for its eyes, ears, tails. */
export function buildSnowfoxFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 4; i++) {
    const p = new Painter(2.8, 2.2, SPRITE_PPU, -1.4, -0.3);
    const r = new Rng(seed + i * 7);
    p.glaze();
    const st = i === 0 ? 0.12 : i === 1 ? -0.12 : 0;
    // a long low body with an arched back
    const bb: V2[] = [];
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const x = Math.cos(a) * 0.55 - 0.05;
      const top = Math.sin(a) > 0;
      bb.push([x, 0.58 + Math.sin(a) * (top ? 0.2 + Math.cos(a * 0.5) * 0.02 : 0.13)]);
    }
    p.reserve(() => poly(p, bb), 0.95);
    p.glaze();
    washPoly(p, bb, { pig: mixPig(INK, PIG_A, 0.35), density: 0.16, soft: 0.5, edge: 0.95, seed: seed + i, blooms: 1 });
    stroke(p, bb.slice(1, 12), { width: 0.04, load: 0.7, dry: 0.5, seed: r.int(1, 1e6), taperStart: 0.2, taperEnd: 0.2 });
    stroke(p, bb.slice(13, 23), { width: 0.025, load: 0.5, dry: 0.6, seed: r.int(1, 1e6), taperStart: 0.2, taperEnd: 0.2 });
    // three tails, fanned like brush tips
    for (let k = 0; k < 3; k++) {
      const a = 2.5 + k * 0.28 + (i === 3 ? -0.3 : 0);
      const tail: V2[] = [[-0.5, 0.6], [-0.5 + Math.cos(a) * 0.5, 0.6 + Math.sin(a) * 0.4], [-0.5 + Math.cos(a) * 0.95, 0.6 + Math.sin(a) * 0.75]];
      stroke(p, tail, { width: 0.26, pig: mixPig(INK, PIG_A, 0.35), load: 0.32, dry: 0.4, seed: r.int(1, 1e6), taperStart: 0.5, taperEnd: 0.15 });
      stroke(p, tail, { width: 0.04, load: 0.6, dry: 0.6, seed: r.int(1, 1e6), taperStart: 0.3, taperEnd: 0.2 });
      p.circle(-0.5 + Math.cos(a) * 0.95, 0.58 + Math.sin(a) * 0.75, 0.05, INK, 0.9);
    }
    // head with pointed ears
    const hx = i === 2 ? 0.75 : 0.62, hy = i === 2 ? 0.62 : 0.8;
    washPoly(p, [[hx - 0.2, hy - 0.08], [hx + 0.32, hy - 0.04], [hx - 0.05, hy + 0.15]], { pig: mixPig(INK, PIG_A, 0.4), density: 0.15, soft: 0.1, edge: 0.95, seed: seed + 30 + i });
    for (const ex of [-0.12, 0.0]) stroke(p, [[hx + ex, hy + 0.1], [hx + ex - 0.04, hy + 0.32]], { width: 0.06, load: 1, seed: r.int(1, 1e6), taperEnd: 0.7 });
    eyes(p, [[hx + 0.06, hy + 0.03, 0.035, 0.02]]);
    p.circle(hx + 0.32, hy - 0.04, 0.03, INK, 1);
    if (i === 2) stroke(p, [[hx + 0.1, hy - 0.08], [hx + 0.3, hy - 0.12]], { width: 0.03, load: 1, seed: r.int(1, 1e6) });
    // legs
    // running legs: bent, with dark paws
    for (const [lx, ph] of [[-0.4, 1], [-0.25, -1], [0.15, 1], [0.3, -1]] as [number, number][]) {
      const knee: V2 = [lx + st * ph * 0.6 + (lx < 0 ? -0.06 : 0.06), 0.24];
      const paw: V2 = [lx + st * ph * 1.4, 0.02];
      stroke(p, [[lx, 0.48], knee, paw], { width: 0.06, load: 0.9, seed: r.int(1, 1e6), taperEnd: 0.3 });
      p.circle(paw[0], paw[1] + 0.02, 0.045, INK, 0.9);
    }
    // fox-fire, when it casts
    if (i === 3) for (let k = 0; k < 3; k++) p.circle(0.2 + k * 0.35, 1.35 + Math.sin(k * 2) * 0.12, 0.09, mixPig(INK, PIG_A, 0.6), 0.6);
    out.push(frameFrom(p));
  }
  return out;
}

/** Paper crane: folded wings, a crisp beak, [fly a, fly b, dive, landed]. */
export function buildCraneFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 4; i++) {
    const p = new Painter(3, 2.2, SPRITE_PPU, -1.5, -0.3);
    const r = new Rng(seed + i);
    p.glaze();
    const up = i === 0 ? 1 : i === 1 ? -0.4 : i === 2 ? 0.2 : 0.6;
    const by = i === 3 ? 0.35 : 0.7;
    // body: two folded triangles
    const bodyA: V2[] = [[-0.5, by], [0.45, by + 0.05], [0.0, by + 0.32]];
    const bodyB: V2[] = [[-0.5, by], [0.45, by + 0.05], [0.0, by - 0.18]];
    for (const [tri, d] of [[bodyA, 0.12], [bodyB, 0.28]] as [V2[], number][]) {
      p.reserve(() => poly(p, tri), 0.95);
      p.glaze();
      washPoly(p, tri, { pig: mixPig(INK, PIG_B, 0.3), density: d, soft: 0.05, edge: 0.95, seed: seed + 10 + i });
      stroke(p, [...tri, tri[0]], { width: 0.025, load: 0.9, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.02 });
    }
    // wings: big flat folds
    for (const s of [1, -1]) {
      const wing: V2[] = [[-0.1, by + 0.15], [0.3, by + 0.15], [s > 0 ? 0.05 : 0.15, by + 0.15 + up * (s > 0 ? 0.9 : 0.6)]];
      p.reserve(() => poly(p, wing), 0.95);
      p.glaze();
      washPoly(p, wing, { pig: mixPig(INK, PIG_A, 0.3), density: s > 0 ? 0.1 : 0.22, soft: 0.05, edge: 0.95, seed: seed + 20 + s });
      stroke(p, [...wing, wing[0]], { width: 0.025, load: 0.9, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.02 });
    }
    // the folded neck and head, the tail point
    stroke(p, [[0.42, by + 0.05], [0.62, by + 0.45], [0.82, by + 0.42]], { width: 0.04, load: 1, seed: r.int(1, 1e6) });
    stroke(p, [[-0.5, by], [-0.75, by + 0.35]], { width: 0.04, load: 1, seed: r.int(1, 1e6) });
    if (i === 3) for (const lx of [-0.05, 0.12]) stroke(p, [[lx, by - 0.1], [lx, 0.0]], { width: 0.02, load: 1, seed: r.int(1, 1e6) });
    // a red-brown stain where it was folded, like a seal
    p.circle(0.05, by + 0.06, 0.06, mixPig(INK, PIG_A, 0.7), 0.5);
    out.push(frameFrom(p));
  }
  return out;
}

/** Eraser: a hole in the drawing, ringed in ragged ink, [a, b, gulp]. The inside is bare paper. */
export function buildEraserFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 3; i++) {
    const p = new Painter(2.4, 2.4, SPRITE_PPU, -1.2, -0.2);
    const r = new Rng(seed + i);
    const gulp = i === 2;
    const o = noisyOutline(0, 0.8, gulp ? 0.85 : 0.65 + i * 0.04, gulp ? 0.75 : 0.62, 0.22, seed + i);
    p.reserve(() => poly(p, o), 1);
    p.glaze();
    // ragged ink rim, crumbs of erased paper around it
    for (let k = 0; k < o.length; k += 2) {
      const a = o[k], b = o[(k + 1) % o.length];
      stroke(p, [a, b], { width: 0.07, load: 0.95, dry: 0.6, seed: r.int(1, 1e6), press: 0 });
    }
    for (let k = 0; k < 14; k++) {
      const a = r.range(0, Math.PI * 2), d = r.range(0.75, 1.05);
      p.circle(Math.cos(a) * d * 0.9, 0.8 + Math.sin(a) * d * 0.75, r.range(0.02, 0.05), INK, 0.6);
    }
    // inside: nothing — two faint smudges for eyes, a mouth that swallows lines
    p.circle(-0.18, 0.95, 0.06, mixPig(INK, PIG_B, 0.3), 0.35);
    p.circle(0.18, 0.95, 0.06, mixPig(INK, PIG_B, 0.3), 0.35);
    if (gulp) washPoly(p, noisyOutline(0, 0.6, 0.35, 0.18, 0.2, seed + 9), { pig: INK, density: 0.5, soft: 0.2, seed: seed + 9 });
    else stroke(p, [[-0.15, 0.62], [0.15, 0.6]], { width: 0.03, pig: mixPig(INK, PIG_B, 0.3), load: 0.5, seed: r.int(1, 1e6) });
    out.push(frameFrom(p));
  }
  return out;
}

export interface Layered4 { pig: Frame[]; red: Frame[] }

/**
 * The Snow King, faces +x: [idle, raise, slam, roll, breath, dazed]. A yeti twice as tall, a crown of
 * icicles; the red layer gives him two cold embers for eyes.
 */
export function buildSnowKingFrames(seed: number): Layered4 {
  const pig: Frame[] = [], red: Frame[] = [];
  for (let i = 0; i < 6; i++) {
    const S = 1.9;
    const p = new Painter(7, 7.2, SPRITE_PPU / 1.6, -3.5, -0.5);
    const q = new Painter(7, 7.2, SPRITE_PPU / 2.4, -3.5, -0.5);
    q.glaze();
    const r = new Rng(seed + i * 17);
    p.glaze();
    const roll = i === 3;
    if (roll) {
      // curled into a great snowball, fur and a glimpse of a fist
      const b = noisyOutline(0, 1.7, 1.75, 1.6, 0.08, seed + i);
      p.reserve(() => poly(p, b), 0.95);
      p.glaze();
      washPoly(p, b, { pig: mixPig(INK, PIG_B, 0.4), density: 0.16, soft: 0.5, edge: 0.95, seed: seed + i, blooms: 1 });
      fur(p, b, seed + 30, 160, 0.3);
      for (let k = 0; k < 6; k++) { const a = r.range(0, Math.PI * 2); stroke(p, [[Math.cos(a) * 0.4, 1.7 + Math.sin(a) * 0.4], [Math.cos(a) * 1.4, 1.7 + Math.sin(a) * 1.3]], { width: 0.05, load: 0.5, dry: 0.7, seed: r.int(1, 1e6), press: 0 }); }
      pig.push(frameFrom(p));
      red.push(frameFrom(q));
      continue;
    }
    const raise = i === 1, slam = i === 2, breath = i === 4, dazed = i === 5;
    const b = noisyOutline(0, 1.25 * S - (slam ? 0.3 : 0), 0.95 * S, 1.05 * S - (slam ? 0.3 : 0), 0.12, seed + i);
    p.reserve(() => poly(p, b), 0.95);
    p.glaze();
    washPoly(p, b, { pig: mixPig(INK, PIG_B, 0.45), density: 0.2, soft: 0.5, edge: 0.95, seed: seed + i, blooms: 1 });
    fur(p, b, seed + 20 + i, 200, 0.36);
    for (let k = 0; k < 22; k++) {
      const x = r.range(-1.1, 1.1), y = r.range(1.2, 3.5);
      stroke(p, [[x, y], [x + r.gauss() * 0.08, y - r.range(0.25, 0.5)]], { width: 0.05, load: 0.5, dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.9, press: 0 });
    }
    for (const lx of [-0.85, 0.85]) {
      stroke(p, [[lx, 0.65], [lx, 0.0]], { width: 0.55, load: 0.25, dry: 0.4, seed: r.int(1, 1e6) });
      stroke(p, [[lx - 0.45, 0.02], [lx + 0.45, 0.0]], { width: 0.1, load: 1, seed: r.int(1, 1e6) });
    }
    for (const s of [1, -1]) {
      const arm: V2[] = raise ? [[s * 1.45, 3.2], [s * 1.9, 4.6], [s * 1.3, 5.7]] : slam ? [[s * 1.5, 2.6], [s * 2.4, 1.5], [s * 2.6, 0.3]] : breath && s > 0 ? [[1.5, 3.0], [2.1, 2.6], [2.3, 2.0]] : [[s * 1.6, 3.0], [s * 2.0, 1.9], [s * 1.8, 0.9]];
      stroke(p, arm, { width: 0.6, pig: mixPig(INK, PIG_B, 0.4), load: 0.24, dry: 0.4, seed: r.int(1, 1e6) });
      fur(p, arm, seed + 40 + s + i, 22, 0.18);
      stroke(p, [arm[2], [arm[2][0] + s * 0.15, arm[2][1] - 0.22]], { width: 0.14, load: 1, seed: r.int(1, 1e6) });
    }
    // the face, and the crown of icicles
    const fx = 0.45, fy = 3.75 - (slam ? 0.4 : 0) - (dazed ? 0.3 : 0);
    washPoly(p, noisyOutline(fx, fy, 0.62, 0.55, 0.1, seed + 70), { pig: INK, density: 0.8, soft: 0.05, seed: seed + 70 });
    if (breath) washPoly(p, noisyOutline(fx + 0.4, fy - 0.22, 0.28, 0.2, 0.15, seed + 75), { pig: mixPig(INK, PIG_A, 0.4), density: 0.5, soft: 0.2, seed: seed + 75 });
    for (let k = 0; k < 7; k++) {
      const x = fx - 0.7 + k * 0.23, h = 0.4 + (k % 2) * 0.35 + (k === 3 ? 0.3 : 0);
      washPoly(p, [[x - 0.08, fy + 0.5], [x + 0.08, fy + 0.5], [x, fy + 0.5 + h]], { pig: mixPig(INK, PIG_A, 0.5), density: 0.4, soft: 0.05, edge: 0.9, seed: seed + 80 + k });
      stroke(p, [[x - 0.08, fy + 0.5], [x, fy + 0.5 + h], [x + 0.08, fy + 0.5]], { width: 0.03, load: 0.9, seed: r.int(1, 1e6) });
    }
    if (dazed) for (let k = 0; k < 3; k++) stroke(q, [[fx - 0.5 + k * 0.4, fy + 1.4], [fx - 0.3 + k * 0.4, fy + 1.6]], { width: 0.08, pig: VERMILION, load: 0.8, seed: r.int(1, 1e6) });
    else for (const ex of [-0.2, 0.25]) q.circle(fx + ex, fy + 0.08, 0.11, VERMILION, 1);
    pig.push(frameFrom(p));
    red.push(frameFrom(q));
  }
  return { pig, red };
}

/** The Paper Dragon: [head open, head shut], a body fold, a tail; the red layer: eyes and the seal on its brow. */
export function buildDragonFrames(seed: number): { head: Frame[]; headRed: Frame[]; seg: Frame; tail: Frame } {
  const head: Frame[] = [], headRed: Frame[] = [];
  for (let i = 0; i < 2; i++) {
    const p = new Painter(3.2, 2.6, SPRITE_PPU / 1.5, -1.6, -1.0);
    const q = new Painter(3.2, 2.6, SPRITE_PPU / 2, -1.6, -1.0);
    p.glaze(); q.glaze();
    const open = i === 0 ? 0.35 : 0.08;
    const upper: V2[] = [[-0.9, 0.3], [0.2, 0.55], [1.3, 0.2 + open * 0.3], [0.4, 0.05]];
    const lower: V2[] = [[-0.9, 0.1], [0.4, -0.05], [1.2, -0.25 - open * 0.6], [0.1, -0.35]];
    for (const [tri, d] of [[upper, 0.14], [lower, 0.28]] as [V2[], number][]) {
      p.reserve(() => poly(p, tri), 0.95);
      p.glaze();
      washPoly(p, tri, { pig: mixPig(INK, PIG_B, 0.3), density: d, soft: 0.05, edge: 0.95, seed: seed + 10 + i });
      stroke(p, [...tri, tri[0]], { width: 0.035, load: 0.95, seed: seed + 20 + i, taperStart: 0.02, taperEnd: 0.02 });
    }
    // horns: two long folds swept back, whiskers
    for (const s of [0, 1]) stroke(p, [[-0.2 - s * 0.2, 0.5], [-0.9 - s * 0.3, 1.1 + s * 0.15], [-1.4 - s * 0.1, 1.2 + s * 0.2]], { width: 0.05, load: 1, seed: seed + 30 + s, taperEnd: 0.8 });
    stroke(p, [[1.1, 0.0], [1.4, -0.3], [1.5, -0.7]], { width: 0.025, load: 0.9, seed: seed + 35 });
    eyes(p, [[0.35, 0.32, 0.07, 0.05]]);
    q.circle(0.35, 0.32, 0.08, VERMILION, 1);
    washPoly(q, [[-0.15, 0.38], [0.05, 0.38], [0.05, 0.5], [-0.15, 0.5]], { pig: VERMILION, density: 0.9, soft: 0.05, seed: seed + 40 });
    head.push(frameFrom(p));
    headRed.push(frameFrom(q));
  }
  const s = new Painter(1.8, 1.6, SPRITE_PPU / 1.5, -0.9, -0.8);
  s.glaze();
  const dia: V2[] = [[-0.65, 0], [0, 0.42], [0.65, 0], [0, -0.42]];
  s.reserve(() => poly(s, dia), 0.95);
  s.glaze();
  washPoly(s, [[-0.65, 0], [0, 0.42], [0, -0.42]], { pig: mixPig(INK, PIG_B, 0.3), density: 0.12, soft: 0.05, seed: seed + 50 });
  washPoly(s, [[0.65, 0], [0, 0.42], [0, -0.42]], { pig: mixPig(INK, PIG_A, 0.3), density: 0.26, soft: 0.05, seed: seed + 51 });
  stroke(s, [...dia, dia[0]], { width: 0.03, load: 0.95, seed: seed + 52, taperStart: 0.02, taperEnd: 0.02 });
  stroke(s, [[0, 0.42], [0, -0.42]], { width: 0.02, load: 0.7, seed: seed + 53 });
  // a little fin on its back
  stroke(s, [[-0.1, 0.4], [0.05, 0.72], [0.2, 0.38]], { width: 0.03, load: 0.9, seed: seed + 54 });
  const t = new Painter(2, 1.6, SPRITE_PPU / 1.5, -1, -0.8);
  t.glaze();
  for (const k of [-1, 1]) {
    const fin: V2[] = [[0.5, 0], [-0.8, k * 0.55], [-0.4, 0]];
    t.reserve(() => poly(t, fin), 0.95);
    t.glaze();
    washPoly(t, fin, { pig: mixPig(INK, PIG_A, 0.3), density: 0.2, soft: 0.05, seed: seed + 60 + k });
    stroke(t, [...fin, fin[0]], { width: 0.03, load: 0.95, seed: seed + 62 + k, taperStart: 0.02, taperEnd: 0.02 });
  }
  return { head, headRed, seg: frameFrom(s), tail: frameFrom(t) };
}
