/**
 * The new creatures of each region, painted like the others: ink, a few strokes, paper-white eyes.
 * Every builder returns shared frames.
 */
import { Painter, INK, PIG_A, PIG_B, LIGHT, mixPig } from '../paint';
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

/** Paper eyes: lifted, then covered again so they read as paper. */
function eyes(p: Painter, pts: [number, number, number, number][]): void {
  p.lift();
  for (const [x, y, rx, ry] of pts) { p.ctx.fillStyle = 'rgba(0,0,0,1)'; p.ctx.beginPath(); p.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); p.ctx.fill(); }
  p.over();
  for (const [x, y, rx, ry] of pts) { p.ctx.fillStyle = 'rgba(0,0,0,1)'; p.ctx.beginPath(); p.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); p.ctx.fill(); }
  p.glaze();
}

/** Ink crow, faces +x: [wings up, level, down, dive]. */
export function buildCrowFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0.5, 0, -0.45, -0.1].forEach((wing, i) => {
    const p = new Painter(2.2, 1.8, SPRITE_PPU, -1.1, -0.6);
    const r = new Rng(seed + i);
    const dive = i === 3;
    const b = noisyOutline(0.05, 0.25, dive ? 0.42 : 0.32, dive ? 0.14 : 0.18, 0.18, seed + i);
    body(p, b, 0.8, seed + i);
    // beak and tail
    stroke(p, [[0.32, 0.27], [0.55, 0.24]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.95 });
    stroke(p, [[-0.25, 0.25], [-0.5, 0.2 + (dive ? 0.05 : 0)], [-0.62, 0.15]], { width: 0.14, load: 0.9, dry: 0.5, seed: r.int(1, 1e6), taperEnd: 0.6 });
    // wings: two broad strokes with ragged feathers
    if (!dive) {
      for (const side of [1, -1]) {
        const tip: V2 = [-0.2 + side * 0.05, 0.3 + wing * 0.9 * side];
        stroke(p, [[0.05, 0.3], [-0.05, 0.3 + wing * 0.5 * side], tip], { width: 0.22, load: 0.95, dry: 0.55, seed: r.int(1, 1e6), taperStart: 0.05, taperEnd: 0.5 });
        for (let k = 0; k < 3; k++) stroke(p, [tip, [tip[0] - 0.12 - k * 0.06, tip[1] - side * 0.05 * k]], { width: 0.05, load: 0.8, dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.9 });
      }
    } else {
      stroke(p, [[0.0, 0.32], [-0.45, 0.45], [-0.7, 0.42]], { width: 0.16, load: 0.95, dry: 0.5, seed: r.int(1, 1e6), taperEnd: 0.6 });
    }
    eyes(p, [[0.2, 0.3, 0.04, 0.04]]);
    out.push(frameFrom(p));
  });
  return out;
}

/** Scarecrow: [arms high, arms low, spin]. */
export function buildScarecrowFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0.15, -0.1, 0].forEach((tilt, i) => {
    const p = new Painter(3.2, 3.4, SPRITE_PPU, -1.6, -0.3);
    const r = new Rng(seed + i * 7);
    stroke(p, [[0, 0], [0.02, 2.0]], { width: 0.12, load: 1, dry: 0.4, seed: r.int(1, 1e6), taperEnd: 0.1 });
    // arms: a crossbar with rags, blurred when spinning
    const arm: V2[] = [[-1.1, 1.55 + tilt], [0, 1.6], [1.1, 1.55 - tilt]];
    stroke(p, arm, { width: 0.1, load: 1, dry: 0.4, seed: r.int(1, 1e6) });
    if (i === 2) {
      for (let k = 0; k < 3; k++) stroke(p, [[-1.15, 1.2 + k * 0.25], [0, 1.65 + k * 0.05], [1.15, 2.0 - k * 0.25]], { width: 0.04, load: 0.4, dry: 0.8, seed: r.int(1, 1e6), body: 0.1 });
    }
    for (const x of [-0.95, -0.5, 0.5, 0.95]) {
      const y = 1.55 + (x < 0 ? tilt : -tilt) * Math.abs(x);
      stroke(p, [[x, y], [x + r.gauss() * 0.05, y - 0.35], [x + r.gauss() * 0.08, y - 0.55]], { width: 0.08, load: 0.7, dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.9 });
    }
    // straw coat
    body(p, roughen([[-0.38, 1.6], [0.38, 1.6], [0.5, 0.75], [-0.5, 0.75]], 0.04, seed + i, 0.12), 0.32, seed + i, mixPig(INK, PIG_B, 0.5));
    for (let k = 0; k < 6; k++) stroke(p, [[-0.45 + k * 0.18, 0.78], [-0.48 + k * 0.18, 0.55]], { width: 0.03, load: 0.6, dry: 0.7, seed: r.int(1, 1e6), taperEnd: 0.8 });
    // sack head and straw hat
    const head = noisyOutline(0, 1.95, 0.26, 0.24, 0.1, seed + 30 + i);
    body(p, head, 0.75, seed + 30 + i);
    const hat = noisyOutline(0, 2.18, 0.55, 0.14, 0.1, seed + 40);
    body(p, hat, 0.3, seed + 40, mixPig(INK, PIG_B, 0.4));
    stroke(p, [[-0.56, 2.16], [0, 2.1], [0.56, 2.16]], { width: 0.05, load: 1, seed: seed + 41 });
    eyes(p, [[-0.09, 1.97, 0.06, 0.05], [0.09, 1.97, 0.06, 0.05]]);
    stroke(p, [[-0.1, 1.84], [0, 1.8], [0.1, 1.85]], { width: 0.03, load: 0.6, seed: seed + 42 });
    out.push(frameFrom(p));
  });
  return out;
}

/** Ink boar, faces +x: [idle, run a, run b, stunned]. */
export function buildBoarFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0, 0.06, -0.06, 0].forEach((lean, i) => {
    const p = new Painter(3.2, 2.2, SPRITE_PPU, -1.6, -0.4);
    const r = new Rng(seed + i * 11);
    const b = noisyOutline(lean, 0.45, 0.85, 0.42, 0.2, seed + i);
    body(p, b, 0.78, seed + i);
    // bristled back
    for (let k = 0; k < 8; k++) {
      const x = -0.6 + k * 0.17 + lean;
      stroke(p, [[x, 0.8], [x - 0.05, 0.98 + r.range(0, 0.08)]], { width: 0.05, load: 1, seed: r.int(1, 1e6), taperEnd: 0.9 });
    }
    // snout and tusks
    stroke(p, [[0.75 + lean, 0.4], [1.0 + lean, 0.35]], { width: 0.22, load: 1, seed: r.int(1, 1e6), taperEnd: 0.2 });
    p.lift();
    stroke(p, [[0.88 + lean, 0.3], [1.0 + lean, 0.5]], { width: 0.05, load: 1, seed: r.int(1, 1e6), taperEnd: 0.9 });
    p.glaze();
    // legs
    const st = i === 1 ? 0.12 : i === 2 ? -0.12 : 0;
    for (const lx of [-0.55, -0.25, 0.3, 0.55]) stroke(p, [[lx + lean * 0.5, 0.15], [lx + st * (lx > 0 ? 1 : -1), -0.15]], { width: 0.12, load: 1, dry: 0.4, seed: r.int(1, 1e6), taperEnd: 0.4 });
    if (i === 3) {
      eyes(p, [[0.55 + lean, 0.55, 0.1, 0.1]]);
      const sp: V2[] = [];
      for (let k = 0; k < 12; k++) { const a = k * 0.9; sp.push([0.55 + Math.cos(a) * k * 0.008, 0.55 + Math.sin(a) * k * 0.008]); }
      stroke(p, sp, { width: 0.02, load: 1, seed: 7, body: 0.5 });
    } else eyes(p, [[0.55 + lean, 0.55, 0.07, i ? 0.04 : 0.06]]);
    out.push(frameFrom(p));
  });
  return out;
}

/** Smoke fox, faces +x: [sit, run a, run b, bite]. */
export function buildFoxFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0, 1, 2, 3].forEach((i) => {
    const p = new Painter(2.8, 2.0, SPRITE_PPU, -1.4, -0.4);
    p.glaze();
    const r = new Rng(seed + i * 5);
    const run = i === 1 || i === 2;
    const len = run ? 0.62 : 0.45;
    const b = noisyOutline(0, 0.42, len, 0.22, 0.25, seed + i);
    washPoly(p, b, { pig: mixPig(INK, PIG_B, 0.3), density: 0.55, soft: 0.35, edge: 0.6, seed: seed + i });
    // head with tall ears
    const hx = len * 0.95, hy = i === 3 ? 0.48 : 0.62;
    washPoly(p, noisyOutline(hx, hy, 0.2, 0.15, 0.15, seed + 9 + i), { pig: INK, density: 0.7, soft: 0.1, edge: 0.7, seed: seed + 9 });
    stroke(p, [[hx - 0.05, hy + 0.1], [hx - 0.1, hy + 0.35]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.95 });
    stroke(p, [[hx + 0.08, hy + 0.1], [hx + 0.08, hy + 0.34]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.95 });
    stroke(p, [[hx + 0.15, hy - 0.02], [hx + 0.35, hy - 0.06 - (i === 3 ? 0.06 : 0)]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.8 });
    // smoky tail
    const tw = i * 0.4;
    stroke(p, [[-len, 0.45], [-len - 0.35, 0.7 + Math.sin(tw) * 0.1], [-len - 0.7, 0.6 + Math.cos(tw) * 0.15], [-len - 0.9, 0.85]], { width: 0.3, load: 0.45, dry: 0.75, seed: r.int(1, 1e6), taperStart: 0.05, taperEnd: 0.9, body: 0.3 });
    // legs
    const st = i === 1 ? 0.15 : i === 2 ? -0.15 : 0;
    for (const lx of [-0.3, 0.3]) stroke(p, [[lx, 0.25], [lx + st * (lx > 0 ? 1 : -1), -0.12]], { width: 0.07, load: 0.9, dry: 0.5, seed: r.int(1, 1e6), taperEnd: 0.5 });
    eyes(p, [[hx + 0.06, hy + 0.02, 0.035, i === 3 ? 0.02 : 0.03]]);
    out.push(frameFrom(p));
  });
  return out;
}

/** Ink bat: [wings up, wings down]. */
export function buildBatFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0.35, -0.25].forEach((wing, i) => {
    const p = new Painter(1.8, 1.2, SPRITE_PPU, -0.9, -0.4);
    const r = new Rng(seed + i);
    body(p, noisyOutline(0, 0.15, 0.13, 0.15, 0.2, seed + i), 0.85, seed + i);
    for (const side of [1, -1]) {
      const pts: V2[] = [[0.08 * side, 0.2], [0.35 * side, 0.2 + wing], [0.6 * side, 0.12 + wing * 0.7], [0.45 * side, 0.05 + wing * 0.3], [0.3 * side, 0.1 + wing * 0.4], [0.12 * side, 0.08]];
      body(p, pts, 0.75, r.int(1, 1e6));
    }
    stroke(p, [[-0.06, 0.3], [-0.1, 0.4]], { width: 0.04, load: 1, seed: r.int(1, 1e6), taperEnd: 0.9 });
    stroke(p, [[0.06, 0.3], [0.1, 0.4]], { width: 0.04, load: 1, seed: r.int(1, 1e6), taperEnd: 0.9 });
    eyes(p, [[-0.04, 0.18, 0.025, 0.025], [0.04, 0.18, 0.025, 0.025]]);
    out.push(frameFrom(p));
  });
  return out;
}

/** Grub: [mound, emerging, out, bite]. */
export function buildGrubFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0, 0.5, 1, 1.15].forEach((up, i) => {
    const p = new Painter(2.2, 2.2, SPRITE_PPU, -1.1, -0.5);
    p.glaze();
    const r = new Rng(seed + i);
    washPoly(p, noisyOutline(0, 0, 0.7, 0.25, 0.25, seed + 50), { pig: INK, density: 0.35, soft: 0.3, seed: seed + 50 });
    if (up > 0) {
      const segs = 5;
      for (let k = 0; k < segs; k++) {
        const t = k / (segs - 1);
        const y = 0.05 + t * 0.9 * up, x = Math.sin(t * 2 + i) * 0.08;
        const rr = 0.24 - t * 0.06;
        p.reserve(() => poly(p, noisyOutline(x, y, rr, rr * 0.8, 0.1, seed + k)), 1);
        p.glaze();
        washPoly(p, noisyOutline(x, y, rr, rr * 0.8, 0.1, seed + k), { pig: mixPig(INK, PIG_B, 0.3), density: 0.55 + k * 0.05, soft: 0.05, edge: 0.9, seed: seed + k });
      }
      const top: V2 = [Math.sin(2 + i) * 0.08, 0.05 + 0.9 * up];
      if (i === 3) {
        for (const s of [-1, 1]) stroke(p, [[top[0] + s * 0.08, top[1] + 0.12], [top[0] + s * 0.2, top[1] + 0.28]], { width: 0.05, load: 1, seed: r.int(1, 1e6), taperEnd: 0.9 });
      }
      eyes(p, [[top[0] - 0.07, top[1] + 0.04, 0.035, 0.03], [top[0] + 0.07, top[1] + 0.04, 0.035, 0.03]]);
    } else {
      for (let k = 0; k < 5; k++) stroke(p, [[-0.5 + k * 0.25, 0.05], [-0.45 + k * 0.25, 0.15]], { width: 0.04, load: 0.6, dry: 0.6, seed: r.int(1, 1e6) });
    }
    out.push(frameFrom(p));
  });
  return out;
}

/** Clay soldier, faces +x: [idle, walk, sweep wind-up, sweep]. */
export function buildSoldierFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  [0, 1, 2, 3].forEach((i) => {
    const p = new Painter(3, 3.2, SPRITE_PPU, -1.5, -0.3);
    const r = new Rng(seed + i * 3);
    const clay = mixPig(INK, PIG_B, 0.55);
    const st = i === 1 ? 0.1 : 0;
    for (const lx of [-0.15, 0.15]) stroke(p, [[lx, 0.55], [lx + st * (lx > 0 ? 1 : -1), 0.02]], { width: 0.13, load: 1, dry: 0.4, seed: r.int(1, 1e6), taperEnd: 0.3 });
    body(p, roughen([[-0.32, 1.45], [0.32, 1.45], [0.36, 0.5], [-0.36, 0.5]], 0.03, seed + i, 0.1), 0.45, seed + i, clay);
    for (let k = 0; k < 3; k++) stroke(p, [[-0.3, 1.25 - k * 0.22], [0.3, 1.27 - k * 0.22]], { width: 0.03, load: 0.6, dry: 0.6, seed: r.int(1, 1e6) });
    // head with a flat helmet
    body(p, noisyOutline(0.04, 1.68, 0.2, 0.2, 0.08, seed + 20), 0.5, seed + 20, clay);
    body(p, [[-0.32, 1.78], [0.36, 1.78], [0.22, 1.92], [-0.18, 1.92]], 0.7, seed + 21);
    eyes(p, [[0.1, 1.68, 0.04, 0.025]]);
    // shield in front (left arm), blade (right arm)
    body(p, roughen([[0.28, 1.35], [0.52, 1.35], [0.52, 0.75], [0.28, 0.75]], 0.02, seed + 22, 0.08), 0.65, seed + 22, clay);
    const swing = i === 2 ? -1 : i === 3 ? 1 : 0;
    const hand: V2 = [-0.35, 1.15];
    const tip: V2 = swing < 0 ? [-0.9, 2.0] : swing > 0 ? [1.2, 0.6] : [-0.5, 0.2];
    stroke(p, [hand, tip], { width: 0.1, load: 1, dry: 0.3, seed: r.int(1, 1e6), taperEnd: 0.7 });
    out.push(frameFrom(p));
  });
  return out;
}

/** Wandering lantern: [bob a, bob b, ignite]; and its glow (red layer). */
export function buildLanternFrames(seed: number): { pig: Frame[]; light: Frame } {
  const pig: Frame[] = [];
  [0, 1, 2].forEach((i) => {
    const p = new Painter(1.4, 1.8, SPRITE_PPU, -0.7, -0.3);
    const r = new Rng(seed + i);
    const o = noisyOutline(0, 0.65, 0.3 + (i === 2 ? 0.05 : 0), 0.38, 0.06, seed + i);
    p.reserve(() => poly(p, o), 1);
    p.glaze();
    washPoly(p, o, { pig: PIG_A, density: i === 2 ? 0.4 : 0.22, soft: 0.3, edge: 0.6, seed: seed + i });
    for (let k = -1; k <= 1; k++) stroke(p, [[k * 0.14, 0.32], [k * 0.2, 0.65], [k * 0.14, 0.98]], { width: 0.025, load: 0.7, seed: r.int(1, 1e6), body: 0.2 });
    stroke(p, [[-0.15, 1.02], [0.15, 1.02]], { width: 0.07, load: 1, seed: r.int(1, 1e6) });
    stroke(p, [[-0.12, 0.28], [0.12, 0.28]], { width: 0.07, load: 1, seed: r.int(1, 1e6) });
    // an ink face, hollow-eyed
    p.circle(-0.09, 0.7, 0.05, INK, 0.9);
    p.circle(0.09, 0.7, 0.05, INK, 0.9);
    stroke(p, [[-0.08, 0.52], [0, i === 2 ? 0.46 : 0.5], [0.08, 0.52]], { width: 0.035, load: 0.9, seed: r.int(1, 1e6) });
    // a tattered tail of paper
    stroke(p, [[0, 0.26], [0.04 * (i - 1), 0.05], [-0.05, -0.15]], { width: 0.06, pig: PIG_A, load: 0.5, dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.9 });
    pig.push(frameFrom(p));
  });
  const l = new Painter(5, 5, SPRITE_PPU / 4, -2.5, -2);
  l.glaze();
  l.dab(0, 0.65, 2.2, LIGHT, 0.85, 0);
  return { pig, light: frameFrom(l) };
}

export { INK };
