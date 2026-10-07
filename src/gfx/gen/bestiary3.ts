/**
 * Act II, deeper: the Toad King of the Great Basin and his tadpoles, the kappa of the cisterns,
 * the tanuki who play at being stone lanterns, the Jade Mantis Queen of the grove.
 */
import { Painter, INK, PIG_A, PIG_B, VERMILION, mixPig } from '../paint';
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

export interface Layered { pig: Frame[]; red: Frame[] }

/**
 * The Toad King, faces +x: [idle, crouch, air, tongue, inflate, dazed]; red layer: eyes and the
 * vermilion tips of his reed crown.
 */
export function buildToadKingFrames(seed: number): Layered {
  const pig: Frame[] = [], red: Frame[] = [];
  const skin = mixPig(INK, PIG_B, 0.35);
  for (let i = 0; i < 6; i++) {
    const p = new Painter(7, 6, SPRITE_PPU / 1.5, -3.5, -0.8);
    const q = new Painter(7, 6, SPRITE_PPU / 2, -3.5, -0.8);
    q.glaze();
    const r = new Rng(seed + i * 11);
    const sq = i === 1 ? 0.78 : i === 2 ? 1.18 : i === 5 ? 0.85 : 1;
    const fat = i === 4 ? 1.35 : 1;
    // the great squat body
    const b = noisyOutline(0, 1.05 * sq, 1.9 * fat / Math.sqrt(sq), 1.05 * sq * fat, 0.12, seed + i);
    body(p, b, 0.8, seed + i, skin);
    // a darker back, the ink settled where the rain hit him
    washPoly(p, noisyOutline(-0.25, 1.5 * sq * fat, 1.45 * fat, 0.55 * sq * fat, 0.18, seed + 70 + i), { pig: INK, density: 0.35, soft: 0.5, seed: seed + 70 + i });
    stroke(p, b.slice(0, Math.floor(b.length / 2) + 1), { width: 0.1, load: 0.85, dry: 0.4, seed: seed + 80 + i, taperStart: 0.1, taperEnd: 0.1 });
    // warts: darker spots on the back
    for (let k = 0; k < 16; k++) {
      const a = r.range(0.2, Math.PI - 0.2), d = r.range(0.4, 0.9);
      p.circle(Math.cos(a) * 1.7 * d * fat, 1.05 * sq + Math.sin(a) * 0.9 * d * sq * fat, r.range(0.06, 0.14), INK, r.range(0.35, 0.6));
    }
    // the throat sac: pale, huge when inflated
    p.lift();
    p.ctx.fillStyle = 'rgba(0,0,0,0.55)';
    p.ctx.beginPath();
    p.ctx.ellipse(0.95, 0.62 * sq, i === 4 ? 0.95 : 0.5, i === 4 ? 0.7 : 0.32, 0, 0, Math.PI * 2);
    p.ctx.fill();
    p.glaze();
    stroke(p, [[0.5, 0.45 * sq], [0.95, 0.3 * sq], [1.45, 0.5 * sq]], { width: 0.05, load: 0.6, dry: 0.6, seed: r.int(1, 1e6) });
    // eye domes on top
    const ey = 1.95 * sq * (i === 4 ? 1.12 : 1);
    for (const ex of [0.55, 1.25]) p.circle(ex, ey, 0.28, skin, 0.9);
    eyes(p, [[0.58, ey + 0.05, 0.12, i === 5 ? 0.03 : 0.13], [1.28, ey + 0.05, 0.12, i === 5 ? 0.03 : 0.13]]);
    // the wide mouth
    if (i === 3) {
      washPoly(p, [[0.8, 0.95 * sq], [1.85, 0.85 * sq], [1.85, 0.55 * sq], [0.8, 0.7 * sq]], { pig: INK, density: 0.95, soft: 0.05, seed: seed + 50 });
      stroke(p, [[1.8, 0.72], [2.6, 0.75], [3.3, 0.7]], { width: 0.16, pig: mixPig(INK, PIG_A, 0.4), load: 1, seed: r.int(1, 1e6), taperEnd: 0.3 });
    } else stroke(p, [[0.2, 0.85 * sq], [1.1, 0.72 * sq], [1.8, 0.9 * sq]], { width: 0.08, load: 1, seed: r.int(1, 1e6) });
    // legs: folded, or flung back in the air
    if (i === 2) {
      stroke(p, [[-1.2, 0.6], [-2.2, -0.1], [-2.9, -0.5]], { width: 0.28, load: 1, seed: r.int(1, 1e6), taperEnd: 0.5 });
      stroke(p, [[0.9, 0.3], [1.3, -0.3]], { width: 0.2, load: 1, seed: r.int(1, 1e6), taperEnd: 0.5 });
    } else {
      stroke(p, [[-1.3, 0.55], [-2.0, 0.2], [-1.4, -0.15], [-0.9, -0.1]], { width: 0.3, load: 1, seed: r.int(1, 1e6), taperEnd: 0.4 });
      stroke(p, [[1.0, 0.35], [1.25, -0.05], [1.5, -0.12]], { width: 0.2, load: 1, seed: r.int(1, 1e6), taperEnd: 0.5 });
    }
    // the crown of reeds, its tips in vermilion
    const cy = 2.0 * sq * fat;
    for (let k = 0; k < 5; k++) {
      const x = -0.75 + k * 0.32, h = 0.55 + (k % 2) * 0.25;
      stroke(p, [[x, cy - 0.15], [x + 0.04, cy + h]], { width: 0.08, load: 0.9, dry: 0.3, seed: r.int(1, 1e6), taperEnd: 0.6 });
      stroke(q, [[x + 0.04, cy + h - 0.18], [x + 0.05, cy + h + 0.06]], { width: 0.1, pig: VERMILION, load: 1, seed: r.int(1, 1e6), taperEnd: 0.7 });
    }
    // eyes glow vermilion except when dazed
    if (i !== 5) for (const ex of [0.58, 1.28]) q.circle(ex, ey + 0.05, 0.09, VERMILION, 0.95);
    else for (let k = 0; k < 3; k++) stroke(q, [[-0.3 + k * 0.4, cy + 1.1], [-0.1 + k * 0.4, cy + 1.3]], { width: 0.06, pig: VERMILION, load: 0.8, seed: r.int(1, 1e6) });
    pig.push(frameFrom(p));
    red.push(frameFrom(q));
  }
  return { pig, red };
}

/** Tadpole: an ink comma that wriggles, [a, b]. */
export function buildTadpoleFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 2; i++) {
    const p = new Painter(1.6, 0.9, SPRITE_PPU, -0.8, -0.3);
    const r = new Rng(seed + i);
    body(p, noisyOutline(0.25, 0.15, 0.22, 0.17, 0.1, seed + i), 0.85, seed + i, mixPig(INK, PIG_B, 0.2));
    const s = i ? 1 : -1;
    stroke(p, [[0.05, 0.15], [-0.2, 0.15 + s * 0.08], [-0.45, 0.15 - s * 0.06], [-0.65, 0.15 + s * 0.05]], { width: 0.1, load: 0.9, seed: r.int(1, 1e6), taperEnd: 0.95 });
    eyes(p, [[0.36, 0.2, 0.035, 0.035]]);
    out.push(frameFrom(p));
  }
  return out;
}

/** Kappa, faces +x: [idle, walk a, walk b, lunge, bow]. A shell on its back, a dish of water on its head. */
export function buildKappaFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  const green = mixPig(INK, PIG_A, 0.5);
  for (let i = 0; i < 5; i++) {
    const p = new Painter(2.6, 2.8, SPRITE_PPU, -1.3, -0.35);
    const r = new Rng(seed + i * 9);
    const lean = i === 3 ? 0.25 : i === 4 ? 0.35 : 0;
    const bow = i === 4;
    p.glaze();
    // the shell: a dark dome on the back
    washPoly(p, roughen(noisyOutline(-0.25 - lean * 0.3, 0.78, 0.48, 0.5, 0.06, seed + 3), 0.01, seed + i, 0.03), { pig: mixPig(INK, PIG_B, 0.4), density: 0.85, soft: 0.05, edge: 0.9, seed: seed + i });
    for (let k = 0; k < 3; k++) stroke(p, [[-0.6 - lean * 0.3, 0.55 + k * 0.22], [0.05 - lean * 0.3, 0.6 + k * 0.22]], { width: 0.03, load: 0.5, dry: 0.6, seed: r.int(1, 1e6) });
    // the body and the beaked head
    const hx = 0.28 + lean, hy = bow ? 0.95 : 1.38;
    washPoly(p, roughen([[-0.1, 0.25], [0.35, 0.3], [0.4 + lean * 0.6, 1.0], [0.05, 1.1]], 0.01, seed + 20 + i, 0.04), { pig: green, density: 0.62, soft: 0.05, edge: 0.8, seed: seed + 20 });
    p.circle(hx, hy, 0.26, green, 0.75);
    washPoly(p, [[hx + 0.18, hy - 0.02], [hx + 0.45, hy - 0.08], [hx + 0.2, hy - 0.14]], { pig: INK, density: 0.9, soft: 0.05, seed: seed + 30 });
    eyes(p, [[hx + 0.1, hy + 0.06, 0.05, 0.05]]);
    // the dish of water on its head (spilled when it bows)
    p.lift();
    p.ctx.fillStyle = 'rgba(0,0,0,0.9)';
    p.ctx.beginPath();
    p.ctx.ellipse(hx - 0.02, hy + 0.2, 0.15, 0.06, bow ? 0.5 : 0, 0, Math.PI * 2);
    p.ctx.fill();
    p.glaze();
    const tuft: V2[] = [[hx - 0.24, hy + 0.12], [hx - 0.02, hy + 0.3], [hx + 0.2, hy + 0.12]];
    stroke(p, tuft, { width: 0.05, load: 0.9, dry: 0.4, seed: r.int(1, 1e6) });
    if (bow) for (let k = 0; k < 4; k++) p.circle(hx + 0.3 + k * 0.12, hy - 0.1 - k * 0.15, 0.04, mixPig(INK, PIG_A, 0.7), 0.6);
    // webbed limbs
    const st = i === 1 ? 0.14 : i === 2 ? -0.14 : 0;
    stroke(p, [[-0.05, 0.3], [-0.1 - st, -0.15]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.4 });
    stroke(p, [[0.25, 0.3], [0.3 + st, -0.15]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.4 });
    const arm: V2[] = i === 3 ? [[0.3, 0.85], [0.8, 0.85], [1.15, 0.78]] : [[0.3, 0.85], [0.55, 0.6], [0.5, 0.4]];
    stroke(p, arm, { width: 0.07, load: 1, seed: r.int(1, 1e6), taperEnd: 0.5 });
    out.push(frameFrom(p));
  }
  return out;
}

/** Tanuki, faces +x: [statue, sit, run a, run b, throw]. The statue is a stone lantern. */
export function buildTanukiFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  const fur = mixPig(INK, PIG_B, 0.55);
  for (let i = 0; i < 5; i++) {
    const p = new Painter(2.4, 2.8, SPRITE_PPU, -1.2, -0.3);
    const r = new Rng(seed + i * 7);
    p.glaze();
    if (i === 0) {
      // a stone lantern: base, post, firebox, roof, finial — with a leaf on top (the giveaway)
      const stone = mixPig(INK, PIG_A, 0.15);
      washPoly(p, roughen([[-0.42, 0], [0.42, 0], [0.32, 0.2], [-0.32, 0.2]], 0.01, seed, 0.03), { pig: stone, density: 0.5, soft: 0.05, edge: 0.9, seed });
      washPoly(p, roughen([[-0.12, 0.2], [0.12, 0.2], [0.12, 0.85], [-0.12, 0.85]], 0.01, seed + 1, 0.02), { pig: stone, density: 0.45, soft: 0.05, edge: 0.9, seed: seed + 1 });
      washPoly(p, roughen([[-0.32, 0.85], [0.32, 0.85], [0.32, 1.3], [-0.32, 1.3]], 0.01, seed + 2, 0.02), { pig: stone, density: 0.5, soft: 0.05, edge: 0.9, seed: seed + 2 });
      washPoly(p, [[-0.14, 0.95], [0.14, 0.95], [0.14, 1.2], [-0.14, 1.2]], { pig: INK, density: 0.85, soft: 0.05, seed: seed + 3 });
      washPoly(p, roughen([[-0.6, 1.3], [0.6, 1.3], [0.2, 1.62], [-0.2, 1.62]], 0.01, seed + 4, 0.03), { pig: stone, density: 0.6, soft: 0.05, edge: 0.9, seed: seed + 4 });
      p.circle(0, 1.72, 0.1, stone, 0.7);
      stroke(p, [[0.02, 1.8], [0.2, 1.98], [0.35, 1.92]], { width: 0.06, pig: mixPig(INK, PIG_A, 0.7), load: 0.9, seed: seed + 5, taperStart: 0.4, taperEnd: 0.9 });
      out.push(frameFrom(p));
      continue;
    }
    const run = i === 2 || i === 3;
    const by = run ? 0.45 : 0.55;
    // round belly and body
    body(p, noisyOutline(run ? 0 : -0.05, by, run ? 0.55 : 0.45, run ? 0.32 : 0.48, 0.12, seed + i), 0.55, seed + i, fur);
    p.lift();
    p.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    p.ctx.beginPath();
    p.ctx.ellipse(run ? 0.15 : 0.12, by - 0.05, 0.22, 0.25, 0, 0, Math.PI * 2);
    p.ctx.fill();
    p.glaze();
    // the head with its bandit mask
    const hx = run ? 0.55 : 0.3, hy = run ? 0.75 : 1.12;
    p.circle(hx, hy, 0.26, fur, 0.8);
    washPoly(p, [[hx - 0.18, hy + 0.04], [hx + 0.28, hy + 0.05], [hx + 0.22, hy - 0.08], [hx - 0.12, hy - 0.06]], { pig: INK, density: 0.85, soft: 0.1, seed: seed + 40 + i });
    eyes(p, [[hx + 0.12, hy + 0.0, 0.05, 0.045]]);
    for (const ex of [-0.12, 0.12]) p.circle(hx + ex, hy + 0.24, 0.08, INK, 0.8);
    p.circle(hx + 0.32, hy - 0.06, 0.04, INK, 1);
    // striped tail
    const tail: V2[] = run ? [[-0.45, 0.5], [-0.8, 0.6], [-1.0, 0.75]] : [[-0.4, 0.3], [-0.75, 0.25], [-0.85, 0.5]];
    stroke(p, tail, { width: 0.2, pig: fur, load: 0.85, seed: r.int(1, 1e6), taperStart: 0.3, taperEnd: 0.5 });
    for (let k = 0; k < 2; k++) {
      const t = tail[1];
      stroke(p, [[t[0] - 0.05 + k * 0.18, t[1] - 0.12], [t[0] - 0.02 + k * 0.18, t[1] + 0.12]], { width: 0.05, load: 0.9, seed: r.int(1, 1e6) });
    }
    // legs
    const st = i === 2 ? 0.16 : i === 3 ? -0.16 : 0;
    for (const lx of [-0.25, 0.25]) stroke(p, [[lx, by - 0.2], [lx + st * (lx > 0 ? 1 : -1), -0.05]], { width: 0.1, load: 1, seed: r.int(1, 1e6), taperEnd: 0.4 });
    // the leaf it throws (or wears)
    if (i === 4) stroke(p, [[0.45, 0.85], [0.85, 1.2], [1.05, 1.15]], { width: 0.12, pig: mixPig(INK, PIG_A, 0.7), load: 0.9, seed: r.int(1, 1e6), taperStart: 0.3, taperEnd: 0.9 });
    else stroke(p, [[hx - 0.05, hy + 0.3], [hx + 0.1, hy + 0.5], [hx + 0.25, hy + 0.45]], { width: 0.08, pig: mixPig(INK, PIG_A, 0.7), load: 0.9, seed: r.int(1, 1e6), taperStart: 0.3, taperEnd: 0.9 });
    out.push(frameFrom(p));
  }
  return out;
}

/** The Jade Mantis Queen, faces +x: [idle, raise, slash, run, wings]; red layer: her eyes. */
export function buildQueenFrames(seed: number): Layered {
  const pig: Frame[] = [], red: Frame[] = [];
  const green = mixPig(INK, PIG_A, 0.6);
  for (let i = 0; i < 5; i++) {
    const p = new Painter(6, 6, SPRITE_PPU / 1.5, -3, -0.6);
    const q = new Painter(6, 6, SPRITE_PPU / 2, -3, -0.6);
    q.glaze();
    const r = new Rng(seed + i * 5);
    p.glaze();
    // wings: pale washes, spread when she takes to the air
    const spread = i === 4 ? 1 : i === 1 ? 0.45 : 0.15;
    for (const s of [1, -1]) {
      const wing: V2[] = [[-0.2, 1.3], [-1.6 - spread * 0.6, 1.5 + spread * 1.6 * (s > 0 ? 1 : 0.7)], [-2.3 - spread * 0.4, 1.1 + spread * 0.9], [-1.0, 1.05]];
      washPoly(p, roughen(wing, 0.02, seed + 60 + s, 0.06), { pig: mixPig(INK, PIG_A, 0.75), density: 0.16, soft: 0.4, seed: seed + 60 + s });
      stroke(p, wing.slice(0, 3), { width: 0.03, load: 0.5, dry: 0.6, seed: r.int(1, 1e6) });
    }
    // long abdomen, thorax, the crested head
    washPoly(p, roughen([[-2.2, 0.85], [-0.5, 1.0], [0.4, 1.5], [0.3, 1.8], [-0.6, 1.35], [-2.2, 1.15]], 0.01, seed + i, 0.08), { pig: green, density: 0.75, soft: 0.05, edge: 0.8, seed: seed + i });
    for (let k = 0; k < 5; k++) stroke(p, [[-2.0 + k * 0.35, 0.88], [-1.95 + k * 0.35, 1.12]], { width: 0.04, load: 0.6, dry: 0.5, seed: r.int(1, 1e6) });
    washPoly(p, [[0.3, 2.1], [1.0, 2.25], [0.6, 1.82]], { pig: green, density: 0.9, soft: 0.05, seed: seed + 9 });
    for (let k = 0; k < 3; k++) stroke(p, [[0.35 + k * 0.15, 2.15], [0.2 + k * 0.2, 2.65 + (k === 1 ? 0.15 : 0)]], { width: 0.05, load: 0.9, seed: r.int(1, 1e6), taperEnd: 0.8 });
    eyes(p, [[0.74, 2.12, 0.08, 0.06]]);
    q.circle(0.74, 2.12, 0.07, VERMILION, 1);
    // the scythes
    const arms: V2[][] = i === 1 ? [[[0.4, 1.7], [0.7, 2.7], [1.2, 3.0]], [[0.3, 1.65], [0.5, 2.5], [0.9, 2.85]]]
      : i === 2 ? [[[0.4, 1.7], [1.5, 1.5], [2.4, 1.0]], [[0.3, 1.6], [1.3, 1.1], [2.0, 0.5]]]
      : [[[0.4, 1.7], [0.9, 2.1], [0.85, 1.5]], [[0.3, 1.6], [0.75, 1.95], [0.7, 1.4]]];
    for (const a of arms) stroke(p, a, { width: 0.13, load: 1, seed: r.int(1, 1e6), taperEnd: 0.95 });
    if (i === 2) stroke(q, [[1.6, 1.42], [2.4, 1.0]], { width: 0.05, pig: VERMILION, load: 0.6, dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.9 });
    // legs
    const st = i === 3 ? 0.3 : 0;
    for (const lx of [-1.0, -0.3, 0.1]) stroke(p, [[lx, 1.0], [lx - 0.3 + st, 0.45], [lx - 0.1 - st, -0.2]], { width: 0.07, load: 1, seed: r.int(1, 1e6) });
    pig.push(frameFrom(p));
    red.push(frameFrom(q));
  }
  return { pig, red };
}

/**
 * The Ink Heron, faces +x: [stand, stab, wings, fly, gaze, hurt]; red layer: her eye (it burns
 * when she stares) and the tip of her crest.
 */
export function buildHeronFrames(seed: number): Layered {
  const pig: Frame[] = [], red: Frame[] = [];
  const plume = mixPig(INK, PIG_B, 0.25);
  for (let i = 0; i < 6; i++) {
    const p = new Painter(8, 8, SPRITE_PPU / 1.6, -4, -0.6);
    const q = new Painter(8, 8, SPRITE_PPU / 2.4, -4, -0.6);
    q.glaze();
    const r = new Rng(seed + i * 13);
    p.glaze();
    const fly = i === 3;
    const legTop = fly ? 2.2 : 2.3;
    // long legs (trailing behind in flight)
    if (fly) {
      stroke(p, [[-0.3, legTop], [-1.4, legTop - 0.6], [-2.4, legTop - 0.9]], { width: 0.07, load: 1, seed: r.int(1, 1e6), taperEnd: 0.4 });
      stroke(p, [[-0.1, legTop], [-1.2, legTop - 0.8], [-2.2, legTop - 1.2]], { width: 0.07, load: 1, seed: r.int(1, 1e6), taperEnd: 0.4 });
    } else {
      stroke(p, [[-0.15, legTop], [-0.25, 1.2], [-0.2, 0]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.2 });
      stroke(p, [[0.15, legTop], [0.3, 1.2], [0.25, 0]], { width: 0.08, load: 1, seed: r.int(1, 1e6), taperEnd: 0.2 });
      for (const fx of [-0.2, 0.25]) stroke(p, [[fx - 0.3, 0.02], [fx + 0.35, 0.0]], { width: 0.05, load: 0.9, seed: r.int(1, 1e6) });
    }
    // the body: a long teardrop of grey wash
    const by = fly ? 2.9 : 3.0;
    const bodyPts: V2[] = [];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const back = Math.cos(a) < 0 ? 1.45 : 1.0;
      bodyPts.push([-0.2 + Math.cos(a) * back, by + Math.sin(a) * 0.5 * (Math.cos(a) < 0 ? 0.85 : 1) - (Math.cos(a) < -0.5 ? 0.12 : 0)]);
    }
    washPoly(p, roughen(bodyPts, 0.02, seed + i, 0.04), { pig: plume, density: 0.55, soft: 0.1, edge: 0.9, seed: seed + i, blooms: 1 });
    stroke(p, bodyPts.slice(2, 15), { width: 0.06, load: 0.7, dry: 0.5, seed: seed + 90 + i, taperStart: 0.2, taperEnd: 0.3 });
    // trailing plumes of the tail
    for (let k = 0; k < 4; k++) stroke(p, [[-1.2, by + 0.05 - k * 0.1], [-2.0 - k * 0.15, by - 0.3 - k * 0.18]], { width: 0.06, pig: plume, load: 0.7, dry: 0.5, seed: r.int(1, 1e6), taperEnd: 0.95 });
    // wings
    if (i === 2 || fly) {
      for (const s of [1, -1]) {
        const up = fly ? 1 : 0.4;
        const wing: V2[] = [[-0.3, by + 0.2], [-1.2, by + 1.3 * up + (s > 0 ? 0.6 : 0)], [-2.8, by + 1.9 * up + (s > 0 ? 0.9 : 0.2)], [-3.4, by + 1.1 * up], [-1.6, by + 0.3]];
        washPoly(p, roughen(wing, 0.03, seed + 40 + s + i, 0.08), { pig: s > 0 ? plume : mixPig(INK, PIG_B, 0.5), density: s > 0 ? 0.45 : 0.3, soft: 0.2, edge: 0.8, seed: seed + 40 + s });
        for (let k = 0; k < 5; k++) stroke(p, [[-1.4 - k * 0.38, by + (1.0 + k * 0.18) * up], [-1.7 - k * 0.42, by + (0.5 + k * 0.1) * up]], { width: 0.05, load: 0.8, dry: 0.5, seed: r.int(1, 1e6), taperEnd: 0.9 });
      }
    } else {
      stroke(p, [[-0.9, by + 0.35], [0.0, by + 0.15], [0.6, by + 0.3]], { width: 0.05, load: 0.7, dry: 0.5, seed: r.int(1, 1e6) });
    }
    // the neck and head
    let neck: V2[], head: [number, number], beak = 0.9, beakA = 0;
    if (i === 1) { neck = [[0.7, by + 0.2], [1.6, by + 0.5], [2.6, by + 0.4]]; head = [2.75, by + 0.4]; beak = 1.3; beakA = -0.15; }
    else if (i === 4) { neck = [[0.7, by + 0.3], [0.85, by + 1.3], [0.55, by + 2.1], [0.85, by + 2.7]]; head = [0.95, by + 2.75]; beakA = 0.2; }
    else if (i === 5) { neck = [[0.7, by + 0.2], [1.1, by + 0.6], [1.3, by + 0.2], [1.4, by - 0.3]]; head = [1.45, by - 0.35]; beakA = -1.1; }
    else if (fly) { neck = [[0.7, by + 0.2], [1.3, by + 0.45], [1.8, by + 0.5]]; head = [1.9, by + 0.5]; }
    else { neck = [[0.7, by + 0.3], [1.1, by + 1.0], [0.7, by + 1.6], [1.0, by + 2.2]]; head = [1.1, by + 2.25]; }
    stroke(p, neck, { width: 0.2, pig: plume, load: 0.85, seed: r.int(1, 1e6), taperStart: 0.1, taperEnd: 0.1 });
    p.circle(head[0], head[1], 0.2, plume, 0.85);
    const bx = Math.cos(beakA), byy = Math.sin(beakA);
    washPoly(p, [[head[0] + 0.12, head[1] + 0.07], [head[0] + 0.12 + bx * beak, head[1] + byy * beak], [head[0] + 0.12, head[1] - 0.07]], { pig: INK, density: 0.95, soft: 0.05, seed: seed + 60 + i });
    // the crest: two long black plumes
    for (let k = 0; k < 2; k++) stroke(p, [[head[0] - 0.05, head[1] + 0.12], [head[0] - 0.6 - k * 0.2, head[1] + 0.35 + k * 0.1], [head[0] - 1.1 - k * 0.3, head[1] + 0.3 + k * 0.15]], { width: 0.05, load: 1, seed: r.int(1, 1e6), taperEnd: 0.95 });
    stroke(q, [[head[0] - 0.9, head[1] + 0.32], [head[0] - 1.15, head[1] + 0.32]], { width: 0.06, pig: VERMILION, load: 0.9, seed: r.int(1, 1e6), taperEnd: 0.8 });
    // the eye: it burns when she stares
    eyes(p, [[head[0] + 0.05, head[1] + 0.04, 0.05, 0.05]]);
    q.circle(head[0] + 0.05, head[1] + 0.04, i === 4 ? 0.16 : 0.07, VERMILION, 1);
    if (i === 4) q.dab(head[0] + 0.05, head[1] + 0.04, 0.45, VERMILION, 0.5, 0.2);
    pig.push(frameFrom(p));
    red.push(frameFrom(q));
  }
  return { pig, red };
}

/** A lotus pad floating on the lake, with or without its flower. */
export function buildLotusFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 3; i++) {
    const p = new Painter(2.2, 1.6, SPRITE_PPU / 2, -1.1, -0.8);
    const r = new Rng(seed + i);
    p.glaze();
    const pad: V2[] = [];
    const notch = r.range(0, Math.PI * 2);
    for (let k = 0; k <= 26; k++) {
      const a = notch + 0.25 + (k / 26) * (Math.PI * 2 - 0.5);
      pad.push([Math.cos(a) * 0.85, Math.sin(a) * 0.5]);
    }
    pad.push([0, 0]);
    washPoly(p, roughen(pad, 0.01, seed + i, 0.03), { pig: mixPig(INK, PIG_A, 0.75), density: 0.42, soft: 0.1, edge: 0.9, seed: seed + i });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; stroke(p, [[0, 0], [Math.cos(a) * 0.7, Math.sin(a) * 0.4]], { width: 0.025, load: 0.45, dry: 0.6, seed: r.int(1, 1e6) }); }
    out.push(frameFrom(p));
  }
  return out;
}

/** Ink monk, faces +x: [walk a, walk b, strike, pray]. A possessed monk with a staff. */
export function buildMonkFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  const robe = mixPig(INK, PIG_A, 0.55);
  for (let i = 0; i < 4; i++) {
    const p = new Painter(2.6, 3, SPRITE_PPU, -1.3, -0.3);
    const r = new Rng(seed + i * 17);
    const st = i === 0 ? 0.08 : i === 1 ? -0.08 : 0;
    // the robe: a bell of wash, darker at the hem
    const robePts: V2[] = [[-0.42 + st, 0.02], [0.42 + st, 0.02], [0.3, 1.25], [0.15, 1.45], [-0.15, 1.45], [-0.3, 1.25]];
    body(p, roughen(robePts, 0.02, seed + i, 0.04), 0.5, seed + i, robe);
    washPoly(p, [[-0.42 + st, 0.02], [0.42 + st, 0.02], [0.38, 0.3], [-0.38, 0.3]], { pig: INK, density: 0.35, soft: 0.3, seed: seed + 5 + i });
    // shaved head, bowed in prayer or raised to strike
    const hy = i === 3 ? 1.55 : 1.7;
    p.circle(0.04, hy, 0.2, mixPig(INK, PIG_B, 0.2), 0.7);
    eyes(p, [[0.12, hy + 0.02, 0.04, i === 3 ? 0.01 : 0.035]]);
    // the staff, the sleeves
    if (i === 2) {
      stroke(p, [[-0.1, 1.2], [0.6, 1.0], [1.2, 0.85]], { width: 0.08, load: 1, seed: r.int(1, 1e6) });
      stroke(p, [[-0.6, 1.5], [0.4, 1.05], [1.15, 0.6]], { width: 0.06, pig: mixPig(INK, PIG_B, 0.6), load: 0.9, seed: r.int(1, 1e6) });
    } else if (i === 3) {
      stroke(p, [[-0.2, 1.1], [0.05, 1.3], [0.25, 1.1]], { width: 0.1, load: 1, seed: r.int(1, 1e6) });
      stroke(p, [[0.5, 0], [0.5, 2.0]], { width: 0.06, pig: mixPig(INK, PIG_B, 0.6), load: 0.9, seed: r.int(1, 1e6) });
      // prayer beads
      for (let k = 0; k < 7; k++) p.circle(-0.15 + k * 0.05, 0.95 - Math.sin(k * 0.45) * 0.12, 0.035, INK, 0.9);
    } else {
      stroke(p, [[0.15, 1.2], [0.35, 0.85]], { width: 0.08, load: 1, seed: r.int(1, 1e6) });
      stroke(p, [[0.4, -0.05], [0.42 + st, 2.05]], { width: 0.06, pig: mixPig(INK, PIG_B, 0.6), load: 0.9, seed: r.int(1, 1e6) });
    }
    out.push(frameFrom(p));
  }
  return out;
}

/** A temple bell spirit on its wooden frame: [still, swing a, swing b]. */
export function buildBellFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 3; i++) {
    const p = new Painter(2.8, 3.2, SPRITE_PPU, -1.4, -0.3);
    const r = new Rng(seed + i);
    p.glaze();
    // the frame: two posts and a curved beam
    for (const x of [-1.0, 1.0]) stroke(p, [[x, 0], [x, 2.6]], { width: 0.12, load: 1, dry: 0.4, seed: r.int(1, 1e6) });
    stroke(p, [[-1.25, 2.55], [0, 2.75], [1.25, 2.55]], { width: 0.14, load: 1, seed: r.int(1, 1e6) });
    // the bell swings
    const sw = i === 1 ? 0.25 : i === 2 ? -0.25 : 0;
    const cx = Math.sin(sw) * 1.2, top = 2.5;
    stroke(p, [[0, top], [cx * 0.3, top - 0.25]], { width: 0.05, load: 1, seed: r.int(1, 1e6) });
    const bell: V2[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const y = top - 0.25 - t * 1.4;
      const w = 0.28 + t * t * 0.45;
      bell.push([cx * (0.3 + t * 0.7) - w, y]);
    }
    for (let k = 16; k >= 0; k--) {
      const t = k / 16;
      const y = top - 0.25 - t * 1.4;
      const w = 0.28 + t * t * 0.45;
      bell.push([cx * (0.3 + t * 0.7) + w, y]);
    }
    body(p, bell, 0.62, seed + 10 + i, mixPig(INK, PIG_B, 0.55));
    for (let k = 0; k < 3; k++) stroke(p, [[cx * 0.6 - 0.45, top - 0.7 - k * 0.3], [cx * 0.6 + 0.45, top - 0.7 - k * 0.3]], { width: 0.03, load: 0.6, dry: 0.5, seed: r.int(1, 1e6) });
    // two hollow eyes on the bronze
    eyes(p, [[cx * 0.7 - 0.18, top - 1.15, 0.07, 0.05], [cx * 0.7 + 0.18, top - 1.15, 0.07, 0.05]]);
    out.push(frameFrom(p));
  }
  return out;
}

/**
 * The Faceless Monk, faces +x: [stand, palm, paint, cast, drink, face]. Where his face was, the storm
 * left a blank oval; the red layer stamps a vermilion seal there. The last frame gives him his face back.
 */
export function buildFacelessFrames(seed: number): Layered {
  const pig: Frame[] = [], red: Frame[] = [];
  const robe = mixPig(INK, PIG_A, 0.4);
  for (let i = 0; i < 6; i++) {
    const p = new Painter(7, 7, SPRITE_PPU / 1.6, -3.5, -0.5);
    const q = new Painter(7, 7, SPRITE_PPU / 2.4, -3.5, -0.5);
    q.glaze();
    const r = new Rng(seed + i * 19);
    const bend = i === 4 ? 0.5 : 0;
    // the great robe, wide sleeves
    const robePts: V2[] = [[-1.2, 0], [1.2, 0], [0.9, 2.2 - bend], [0.55, 3.2 - bend], [-0.55, 3.2 - bend], [-0.9, 2.2 - bend]];
    body(p, roughen(robePts, 0.03, seed + i, 0.06), 0.55, seed + i, robe);
    washPoly(p, [[-1.2, 0], [1.2, 0], [1.05, 0.6], [-1.05, 0.6]], { pig: INK, density: 0.4, soft: 0.3, seed: seed + 30 + i });
    for (let k = 0; k < 4; k++) stroke(p, [[-0.6 + k * 0.4, 0.1], [-0.45 + k * 0.3, 2.6 - bend]], { width: 0.04, load: 0.45, dry: 0.6, seed: r.int(1, 1e6) });
    // a stole of red cloth over one shoulder (red layer)
    stroke(q, [[-0.5, 3.0 - bend], [0.2, 2.2 - bend], [0.7, 1.2]], { width: 0.22, pig: VERMILION, load: 0.6, dry: 0.5, seed: r.int(1, 1e6) });
    // the head: a blank oval where the face was
    const hx = 0.1 + bend * 0.8, hy = 3.65 - bend * 1.2;
    p.reserve(() => { p.ctx.ellipse(hx, hy, 0.38, 0.46, 0, 0, Math.PI * 2); }, 1);
    p.glaze();
    stroke(p, (() => { const o: V2[] = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2; o.push([hx + Math.cos(a) * 0.38, hy + Math.sin(a) * 0.46]); } return o; })(), { width: 0.06, load: 0.9, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.02 });
    if (i === 5) {
      // his face, given back: closed eyes, a quiet mouth
      stroke(p, [[hx - 0.22, hy + 0.08], [hx - 0.08, hy + 0.04]], { width: 0.04, load: 1, seed: r.int(1, 1e6) });
      stroke(p, [[hx + 0.08, hy + 0.04], [hx + 0.22, hy + 0.08]], { width: 0.04, load: 1, seed: r.int(1, 1e6) });
      stroke(p, [[hx - 0.1, hy - 0.22], [hx + 0.1, hy - 0.2]], { width: 0.035, load: 0.8, seed: r.int(1, 1e6) });
    } else {
      // the seal of the storm, stamped where the face was
      q.ctx.save();
      washPoly(q, roughen([[hx - 0.2, hy - 0.2], [hx + 0.2, hy - 0.2], [hx + 0.2, hy + 0.2], [hx - 0.2, hy + 0.2]], 0.01, seed + 70 + i, 0.03), { pig: VERMILION, density: 0.95, soft: 0.05, seed: seed + 70 + i });
      q.ctx.restore();
      if (i === 3) q.dab(hx, hy, 0.9, VERMILION, 0.45, 0.2);
    }
    // arms: a palm thrust, a great brush raised, both hands up, a bowl to the lips
    const sh: V2 = [0.5, 2.9 - bend];
    if (i === 1) {
      washPoly(p, roughen([[0.4, 2.8], [1.9, 2.4], [1.9, 2.0], [0.5, 2.3]], 0.02, seed + 80, 0.05), { pig: robe, density: 0.5, soft: 0.1, edge: 0.8, seed: seed + 80 });
      p.circle(2.1, 2.2, 0.2, mixPig(INK, PIG_B, 0.3), 0.7);
    } else if (i === 2) {
      stroke(p, [sh, [1.0, 3.5], [1.2, 4.2]], { width: 0.18, pig: robe, load: 0.8, seed: r.int(1, 1e6) });
      stroke(p, [[1.1, 3.6], [1.6, 5.2]], { width: 0.08, pig: mixPig(INK, PIG_B, 0.6), load: 1, seed: r.int(1, 1e6) });
      washPoly(p, [[1.55, 5.15], [1.85, 5.6], [1.65, 5.95], [1.45, 5.5]], { pig: INK, density: 0.95, soft: 0.05, seed: seed + 85 });
    } else if (i === 3) {
      for (const sx of [1, -1]) stroke(p, [[sx * 0.5, 2.9], [sx * 1.1, 3.6], [sx * 1.3, 4.3]], { width: 0.2, pig: robe, load: 0.8, seed: r.int(1, 1e6) });
    } else if (i === 4) {
      stroke(p, [sh, [0.9, 2.4], [0.6, 2.75]], { width: 0.18, pig: robe, load: 0.8, seed: r.int(1, 1e6) });
      washPoly(p, noisyOutline(0.7, 2.75, 0.25, 0.12, 0.1, seed + 88), { pig: mixPig(INK, PIG_A, 0.7), density: 0.8, soft: 0.05, seed: seed + 88 });
    } else {
      stroke(p, [sh, [0.75, 2.1], [0.4, 1.7]], { width: 0.18, pig: robe, load: 0.8, seed: r.int(1, 1e6) });
      for (let k = 0; k < 9; k++) p.circle(0.3 + Math.sin(k * 0.6) * 0.15, 1.6 - k * 0.07, 0.045, INK, 0.9);
    }
    pig.push(frameFrom(p));
    red.push(frameFrom(q));
  }
  return { pig, red };
}

/** The jade jar, sealed, at the top of the pagoda: [sealed, open]. */
export function buildJarFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  for (let i = 0; i < 2; i++) {
    const p = new Painter(2.4, 2.6, SPRITE_PPU, -1.2, -0.3);
    const o: V2[] = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      const y = t * 1.6;
      const w = 0.35 + Math.sin(t * Math.PI) * 0.45 - (t > 0.85 ? (t - 0.85) * 1.5 : 0);
      o.push([w, y]);
    }
    const full: V2[] = [...o, ...o.slice().reverse().map(([x, y]): V2 => [-x, y])];
    body(p, full, 0.62, seed + i, mixPig(INK, PIG_A, 0.7));
    stroke(p, [[-0.35, 1.62], [0.35, 1.62]], { width: 0.1, load: 1, seed: seed + 5 });
    for (let k = 0; k < 3; k++) stroke(p, [[-0.6, 0.5 + k * 0.3], [0.6, 0.5 + k * 0.3]], { width: 0.025, load: 0.5, dry: 0.6, seed: seed + 6 + k });
    if (i === 0) washPoly(p, [[-0.32, 1.62], [0.32, 1.62], [0.25, 1.85], [-0.25, 1.85]], { pig: INK, density: 0.8, soft: 0.05, seed: seed + 9 });
    out.push(frameFrom(p));
  }
  return out;
}
