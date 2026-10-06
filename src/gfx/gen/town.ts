/**
 * The hamlet and the ruins: houses with tiled roofs, market stalls, a well, fences, the gate,
 * the old bridge's railings, ink brambles, the cave mouth, the sunken temple, torches, pillars, mountains.
 * Upright things are drawn with their base at (0, 0), like every other prop.
 */
import { Painter, Pig, INK, PIG_A, PIG_B, VERMILION, LIGHT, mixPig } from '../paint';
import { stroke, dot, V2 } from '../brush';
import { washPoly, washBlob, noisyOutline, roughen } from '../wash';
import { Rng } from '../rng';
import { SPRITE_PPU } from './flora';
import type { PropArt } from './props';

function poly(p: Painter, pts: V2[]): void {
  pts.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
  p.ctx.closePath();
}

/** Fill a shape so it hides what is behind, then glaze a wash into it. */
function solid(p: Painter, pts: V2[], pig: Pig, density: number, seed: number, edge = 0.7, rough = 0.02): V2[] {
  const rp = rough > 0 ? roughen(pts, rough, seed, 0.1) : pts;
  p.reserve(() => poly(p, rp), 1);
  p.glaze();
  washPoly(p, rp, { pig, density, soft: 0.05, edge, seed });
  return rp;
}

/** Text drawn upright into a y-up painter. */
function writeText(p: Painter, txt: string, x: number, y: number, size: number, alpha = 0.85): void {
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, -1);
  ctx.font = `700 ${size}px "Iowan Old Style", Palatino, Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,0,0,${alpha})`;
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}

/** A house with a curved tiled roof, a veranda and paper windows. */
export function drawHouse(seed: number, wide = 1): PropArt {
  const r = new Rng(seed);
  const hw = 2.3 * wide;
  const W = hw * 2 + 2.2, H = 5.6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  const red = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  red.glaze();
  // stone base
  solid(pig, [[-hw - 0.15, 0], [hw + 0.15, 0], [hw + 0.1, 0.28], [-hw - 0.1, 0.28]], INK, 0.2, seed, 0.8);
  // walls: pale plaster between dark timber
  const wall: V2[] = [[-hw, 0.28], [hw, 0.28], [hw, 2.0], [-hw, 2.0]];
  solid(pig, wall, PIG_B, 0.07, seed + 1, 0.3, 0.015);
  const posts = Math.round(hw * 1.3) + 1;
  for (let i = 0; i < posts; i++) {
    const x = -hw + (i / (posts - 1)) * hw * 2;
    stroke(pig, [[x, 0.28], [x + r.gauss() * 0.01, 2.05]], { width: 0.11, load: 0.95, dry: 0.4, seed: r.int(1, 1e6), taperEnd: 0.05 });
  }
  stroke(pig, [[-hw, 1.95], [hw, 1.97]], { width: 0.1, load: 0.95, dry: 0.4, seed: seed + 2 });
  // door and lattice windows
  const dx = r.range(-hw * 0.4, hw * 0.4);
  solid(pig, [[dx - 0.42, 0.28], [dx + 0.42, 0.28], [dx + 0.42, 1.55], [dx - 0.42, 1.55]], INK, 0.55, seed + 3, 0.5);
  for (const wx of [dx - 1.4, dx + 1.4]) {
    if (Math.abs(wx) > hw - 0.5) continue;
    solid(pig, [[wx - 0.4, 0.85], [wx + 0.4, 0.85], [wx + 0.4, 1.55], [wx - 0.4, 1.55]], PIG_B, 0.12, r.int(1, 1e6), 0.4, 0);
    for (let k = -1; k <= 1; k++) stroke(pig, [[wx + k * 0.2, 0.86], [wx + k * 0.2, 1.54]], { width: 0.022, load: 0.8, seed: r.int(1, 1e6), body: 0.3 });
    stroke(pig, [[wx - 0.4, 1.2], [wx + 0.4, 1.2]], { width: 0.022, load: 0.8, seed: r.int(1, 1e6), body: 0.3 });
  }
  // roof: curved eaves, tiles in rows, ridge with upturned ends
  const ry0 = 1.85, ry1 = 3.9 + wide * 0.25;
  const roof: V2[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -hw - 1.0 + t * (hw * 2 + 2.0);
    const lift = Math.pow(Math.abs(t - 0.5) * 2, 4) * 0.35;
    roof.push([x, ry0 + lift]);
  }
  roof.push([hw * 0.62, ry1], [-hw * 0.62, ry1]);
  const rr = solid(pig, roof, mixPig(INK, PIG_A, 0.15), 0.42, seed + 4, 0.8, 0.03);
  void rr;
  // tile rows
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    const y = ry0 + (ry1 - ry0) * t;
    const half = (hw + 1.0) * (1 - t) + hw * 0.62 * t;
    stroke(pig, [[-half, y + 0.05], [0, y], [half, y + 0.05]], { width: 0.035, load: 0.6, dry: 0.6, seed: r.int(1, 1e6), body: 0.2, taperStart: 0.05, taperEnd: 0.1 });
  }
  for (let i = 0; i < Math.round(hw * 7); i++) {
    const t = r.next();
    const xb = -hw - 0.9 + t * (hw * 2 + 1.8);
    const xt = xb * 0.62 * hw / (hw + 1.0);
    stroke(pig, [[xt, ry1 - 0.05], [xb, ry0 + 0.1]], { width: 0.025, load: r.range(0.25, 0.5), dry: 0.7, seed: r.int(1, 1e6), body: 0, taperEnd: 0.5 });
  }
  stroke(pig, roof.slice(0, steps + 1), { width: 0.12, load: 1, dry: 0.35, seed: seed + 5, taperStart: 0.03, taperEnd: 0.03 });
  stroke(pig, [[-hw * 0.62 - 0.35, ry1 + 0.18], [-hw * 0.62, ry1 + 0.02], [hw * 0.62, ry1 + 0.02], [hw * 0.62 + 0.35, ry1 + 0.18]], { width: 0.14, load: 1, dry: 0.3, seed: seed + 6 });
  // a red charm on the door
  washPoly(red, roughen([[dx - 0.12, 1.15], [dx + 0.12, 1.15], [dx + 0.12, 1.42], [dx - 0.12, 1.42]], 0.01, seed + 7, 0.05), { pig: VERMILION, density: 0.85, soft: 0.05, edge: 0.4, seed: seed + 7 });
  // warm light in the windows
  red.dab(dx - 1.4, 1.2, 0.9, LIGHT, 0.45, 0);
  return { pig, red };
}

export type StallKind = 'dyer' | 'food' | 'pots';

/** A market stall: awning on four posts, a table, goods. */
export function drawStall(seed: number, kind: StallKind): PropArt {
  const r = new Rng(seed);
  const W = 4.6, H = 3.6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  const red = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  red.glaze();
  pig.glaze();
  for (const x of [-1.6, 1.6]) stroke(pig, [[x, 0], [x, 2.3]], { width: 0.09, load: 0.95, dry: 0.4, seed: r.int(1, 1e6), taperEnd: 0.05 });
  // table
  solid(pig, [[-1.7, 0.75], [1.7, 0.75], [1.7, 0.95], [-1.7, 0.95]], INK, 0.45, seed + 1, 0.6, 0.01);
  solid(pig, [[-1.55, 0], [1.55, 0], [1.55, 0.75], [-1.55, 0.75]], PIG_B, 0.12, seed + 2, 0.3, 0.01);
  // goods
  if (kind === 'food') {
    for (let i = 0; i < 9; i++) dot(pig, -1.3 + i * 0.32, 1.08 + r.range(-0.03, 0.06), r.range(0.1, 0.15), i % 2 ? PIG_A : mixPig(INK, PIG_B, 0.5), 0.9, r.int(1, 1e6));
  } else if (kind === 'pots') {
    for (let i = 0; i < 5; i++) {
      const x = -1.2 + i * 0.6;
      solid(pig, noisyOutline(x, 1.2, 0.18, 0.24, 0.08, r.int(1, 1e6)), mixPig(INK, PIG_B, 0.4), 0.3, r.int(1, 1e6), 0.8, 0);
    }
  } else {
    // dyer: vats and cloth hanging from a pole
    for (const x of [-1.0, 0.1]) {
      solid(pig, noisyOutline(x, 1.2, 0.35, 0.22, 0.06, r.int(1, 1e6)), INK, 0.3, r.int(1, 1e6), 0.9, 0);
      washBlob(pig, x, 1.3, 0.25, 0.08, { pig: INK, density: 0.5, soft: 0.2, seed: r.int(1, 1e6) });
    }
    stroke(pig, [[-1.9, 2.15], [1.9, 2.15]], { width: 0.05, load: 0.9, seed: seed + 9 });
    for (let i = 0; i < 4; i++) {
      const x = -1.5 + i * 0.95;
      const target = i % 2 === 0 ? red : pig;
      stroke(target, [[x, 2.12], [x + 0.03, 1.7], [x - 0.02, 1.25]], { width: 0.28, pig: i % 2 === 0 ? VERMILION : mixPig(INK, PIG_B, 0.3), load: i % 2 === 0 ? 0.85 : 0.25, dry: 0.15, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.1, body: 1 });
    }
  }
  // awning
  const aw: V2[] = [[-2.2, 2.2], [2.2, 2.2], [1.8, 2.95], [-1.8, 2.95]];
  solid(pig, aw, kind === 'food' ? PIG_A : mixPig(INK, PIG_B, 0.4), kind === 'food' ? 0.3 : 0.28, seed + 3, 0.8, 0.02);
  for (let i = 0; i < 7; i++) {
    const x = -2.0 + i * 0.66;
    stroke(pig, [[x, 2.22], [x * 0.85, 2.92]], { width: 0.03, load: 0.5, dry: 0.6, seed: r.int(1, 1e6), body: 0.2 });
  }
  // scalloped edge
  const sc: V2[] = [];
  for (let i = 0; i <= 12; i++) sc.push([-2.2 + i * (4.4 / 12), 2.2 - (i % 2 ? 0.12 : 0)]);
  stroke(kind === 'dyer' ? red : pig, sc, { width: 0.07, pig: kind === 'dyer' ? VERMILION : INK, load: 0.9, dry: 0.3, seed: seed + 4 });
  return { pig, red };
}

/** The village well: stone ring, little roof, bucket on a rope. */
export function drawWell(seed: number): PropArt {
  const r = new Rng(seed);
  const W = 3, H = 3.4;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  const ring: V2[] = [[-0.85, 0], [0.85, 0], [0.85, 0.7], [-0.85, 0.7]];
  solid(pig, ring, INK, 0.2, seed, 0.8, 0.03);
  washBlob(pig, 0, 0.72, 0.85, 0.22, { pig: INK, density: 0.7, soft: 0.1, seed: seed + 1 });
  for (let i = 0; i < 6; i++) {
    const x = -0.7 + i * 0.28, y = r.range(0.15, 0.55);
    stroke(pig, [[x - 0.1, y], [x + 0.1, y + 0.02]], { width: 0.03, load: 0.6, dry: 0.6, seed: r.int(1, 1e6) });
  }
  for (const x of [-0.8, 0.8]) stroke(pig, [[x, 0.6], [x, 2.1]], { width: 0.08, load: 0.95, dry: 0.4, seed: r.int(1, 1e6) });
  stroke(pig, [[-0.85, 1.75], [0.85, 1.75]], { width: 0.06, load: 0.9, seed: seed + 2 });
  solid(pig, [[-1.25, 2.0], [1.25, 2.0], [0.25, 2.65], [-0.25, 2.65]], mixPig(INK, PIG_A, 0.2), 0.4, seed + 3, 0.8, 0.02);
  stroke(pig, [[0.1, 1.75], [0.1, 1.15]], { width: 0.015, load: 0.8, seed: seed + 4, body: 0.2 });
  solid(pig, [[-0.08, 0.95], [0.28, 0.95], [0.24, 1.2], [-0.04, 1.2]], mixPig(INK, PIG_B, 0.5), 0.35, seed + 5, 0.8, 0);
  return { pig };
}

/** A run of fence along x: posts and two rails, `len` units long. */
export function drawFence(seed: number, len = 3): PropArt {
  const r = new Rng(seed);
  const W = len + 0.6, H = 1.6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
  const n = Math.max(2, Math.round(len / 1.0) + 1);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i / (n - 1)) * len;
    stroke(pig, [[x, 0], [x + r.gauss() * 0.02, 0.95 + r.range(-0.05, 0.05)]], { width: 0.08, load: 0.95, dry: 0.4, seed: r.int(1, 1e6), taperEnd: 0.1 });
  }
  for (const y of [0.4, 0.75]) stroke(pig, [[-len / 2 - 0.1, y + r.gauss() * 0.02], [0, y + r.gauss() * 0.03], [len / 2 + 0.1, y + r.gauss() * 0.02]], { width: 0.05, load: 0.85, dry: 0.5, seed: r.int(1, 1e6), taperStart: 0.05, taperEnd: 0.05 });
  return { pig };
}

/** The hamlet's gate: two pillars, a curved lintel, a sign. */
export function drawGate(seed: number, sign: string): PropArt {
  const r = new Rng(seed);
  const W = 6.4, H = 5.2;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  const red = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  red.glaze();
  for (const x of [-2.2, 2.2]) {
    solid(pig, [[x - 0.17, 0], [x + 0.17, 0], [x + 0.15, 3.4], [x - 0.15, 3.4]], INK, 0.5, r.int(1, 1e6), 0.6, 0.015);
    washBlob(pig, x, 0.05, 0.35, 0.12, { pig: INK, density: 0.5, soft: 0.2, seed: r.int(1, 1e6) });
  }
  stroke(pig, [[-2.6, 2.75], [2.6, 2.75]], { width: 0.14, load: 1, dry: 0.3, seed: seed + 1 });
  stroke(pig, [[-3.1, 3.55], [-1.5, 3.32], [0, 3.28], [1.5, 3.32], [3.1, 3.55]], { width: 0.24, load: 1, dry: 0.3, seed: seed + 2, taperStart: 0.04, taperEnd: 0.04 });
  stroke(pig, [[-2.9, 3.75], [0, 3.55], [2.9, 3.75]], { width: 0.1, load: 0.9, dry: 0.5, seed: seed + 3 });
  // sign board with the hamlet's name
  solid(pig, [[-0.95, 2.82], [0.95, 2.82], [0.95, 3.22], [-0.95, 3.22]], PIG_B, 0.2, seed + 4, 0.7, 0);
  pig.glaze();
  writeText(pig, sign, 0, 3.02, 0.26, 0.85);
  // red tassels
  for (const x of [-2.2, 2.2]) stroke(red, [[x, 2.7], [x + 0.03, 2.35], [x - 0.02, 2.05]], { width: 0.08, pig: VERMILION, load: 1, dry: 0.3, seed: r.int(1, 1e6), taperEnd: 0.8 });
  return { pig, red };
}

/** One railing of the old bridge (seen from the side), `len` long. */
export function drawRailing(seed: number, len: number): PropArt {
  const r = new Rng(seed);
  const W = len + 0.8, H = 1.6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
  const n = Math.round(len / 1.4) + 1;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i / (n - 1)) * len;
    stroke(pig, [[x, 0], [x, 1.0]], { width: 0.12, load: 0.95, dry: 0.35, seed: r.int(1, 1e6), taperEnd: 0.05 });
    washBlob(pig, x, 1.02, 0.09, 0.05, { pig: INK, density: 0.7, soft: 0.1, seed: r.int(1, 1e6) });
  }
  stroke(pig, [[-len / 2, 0.85], [0, 0.95], [len / 2, 0.85]], { width: 0.08, load: 0.95, dry: 0.4, seed: seed + 1, taperStart: 0.02, taperEnd: 0.02 });
  stroke(pig, [[-len / 2, 0.45], [len / 2, 0.45]], { width: 0.05, load: 0.7, dry: 0.6, seed: seed + 2 });
  return { pig };
}

/** Thorny tangles of ink that choke the bridge. */
export function drawBrambles(seed: number): PropArt {
  const r = new Rng(seed);
  const W = 5, H = 3.6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.5);
  pig.glaze();
  washBlob(pig, 0, 0.3, 1.9, 0.6, { pig: INK, density: 0.35, soft: 0.5, seed });
  for (let i = 0; i < 26; i++) {
    const x0 = r.range(-1.8, 1.8), y0 = r.range(-0.1, 0.5);
    const pts: V2[] = [[x0, y0]];
    let a = r.range(0.4, 2.7), x = x0, y = y0;
    for (let k = 0; k < 5; k++) {
      a += r.gauss() * 0.7;
      const l = r.range(0.25, 0.55);
      x += Math.cos(a) * l;
      y += Math.abs(Math.sin(a)) * l * 0.8;
      pts.push([x, Math.min(2.6, y)]);
    }
    stroke(pig, pts, { width: r.range(0.05, 0.11), load: 0.95, dry: 0.4, seed: r.int(1, 1e6), taperStart: 0.05, taperEnd: 0.6, rough: 0.4 });
    // thorns
    for (let k = 1; k < pts.length; k++) {
      if (!r.chance(0.6)) continue;
      const [px, py] = pts[k];
      const ta = r.range(0, Math.PI * 2);
      stroke(pig, [[px, py], [px + Math.cos(ta) * 0.14, py + Math.sin(ta) * 0.14]], { width: 0.035, load: 1, seed: r.int(1, 1e6), taperStart: 0, taperEnd: 0.95 });
    }
  }
  for (let i = 0; i < 10; i++) dot(pig, r.range(-1.8, 1.8), r.range(0, 1.8), r.range(0.05, 0.12), INK, 0.9, r.int(1, 1e6));
  return { pig };
}

/** A rocky hill with a black mouth: the way down. */
export function drawCaveMouth(seed: number): PropArt {
  const r = new Rng(seed);
  const W = 9, H = 6.2;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.6);
  const red = new Painter(W, H, SPRITE_PPU, -W / 2, -0.6);
  red.glaze();
  const hill = noisyOutline(0, 1.6, 4.0, 2.2, 0.16, seed);
  for (const q of hill) if (q[1] < 0) q[1] = 0;
  solid(pig, hill, mixPig(INK, PIG_B, 0.25), 0.26, seed + 1, 0.9, 0);
  // rock facets
  for (let i = 0; i < 14; i++) {
    const x = r.range(-3.4, 3.4), y = r.range(0.6, 3.4);
    if (Math.abs(x) < 1.3 && y < 2.2) continue;
    const l = r.range(0.4, 1.1);
    stroke(pig, [[x, y], [x + r.gauss() * 0.3, y - l]], { width: r.range(0.04, 0.09), load: r.range(0.5, 0.9), dry: 0.6, seed: r.int(1, 1e6), taperEnd: 0.6 });
  }
  stroke(pig, hill.slice(Math.floor(hill.length * 0.05), Math.floor(hill.length * 0.48)), { width: 0.12, load: 0.95, dry: 0.5, seed: seed + 2, taperStart: 0.05, taperEnd: 0.1 });
  // the mouth
  const mouth: V2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI;
    mouth.push([Math.cos(a) * 1.2, Math.sin(a) * 1.9]);
  }
  const rm = roughen(mouth, 0.06, seed + 3, 0.1);
  pig.reserve(() => poly(pig, rm), 1);
  pig.glaze();
  washPoly(pig, rm, { pig: INK, density: 1, soft: 0.05, edge: 0.2, seed: seed + 3 });
  washPoly(pig, rm, { pig: INK, density: 0.6, soft: 0.05, edge: 0.2, seed: seed + 4 });
  // moss and hanging roots
  for (let i = 0; i < 8; i++) {
    const x = r.range(-1.1, 1.1);
    stroke(pig, [[x, 1.9 - Math.abs(x) * 0.5], [x + r.gauss() * 0.05, 1.4 - r.range(0, 0.4)]], { width: 0.03, load: 0.8, seed: r.int(1, 1e6), taperEnd: 0.9 });
  }
  // fireflies at the threshold
  for (let i = 0; i < 6; i++) red.dab(r.range(-1.5, 1.5), r.range(0.6, 2.4), 0.25, LIGHT, 0.8, 0);
  return { pig, red };
}

/** The sunken temple's gate: stone pillars, a lintel, steps going down into the dark. */
export function drawTempleGate(seed: number): PropArt {
  const r = new Rng(seed);
  const W = 8, H = 6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.6);
  // steps going down
  for (let k = 0; k < 4; k++) {
    const y = 0.15 + k * 0.28, w = 1.8 - k * 0.12;
    solid(pig, [[-w, y - 0.14], [w, y - 0.14], [w, y + 0.12], [-w, y + 0.12]], INK, 0.15 + k * 0.18, r.int(1, 1e6), 0.7, 0.01);
  }
  solid(pig, [[-1.2, 1.25], [1.2, 1.25], [1.2, 2.7], [-1.2, 2.7]], INK, 0.95, seed + 1, 0.3, 0.02);
  for (const x of [-2.0, 2.0]) {
    solid(pig, [[x - 0.4, 0], [x + 0.4, 0], [x + 0.35, 3.2], [x - 0.35, 3.2]], mixPig(INK, PIG_A, 0.3), 0.3, r.int(1, 1e6), 0.8, 0.03);
    for (let k = 0; k < 4; k++) stroke(pig, [[x - 0.3, 0.6 + k * 0.7], [x + 0.3, 0.62 + k * 0.7]], { width: 0.03, load: 0.6, dry: 0.6, seed: r.int(1, 1e6) });
  }
  solid(pig, [[-3.0, 3.1], [3.0, 3.1], [2.7, 3.6], [-2.7, 3.6]], mixPig(INK, PIG_A, 0.3), 0.38, seed + 2, 0.8, 0.03);
  stroke(pig, [[-3.2, 3.62], [0, 3.75], [3.2, 3.62]], { width: 0.12, load: 1, dry: 0.4, seed: seed + 3 });
  // weeds and water stains
  for (let i = 0; i < 12; i++) {
    const x = r.range(-2.6, 2.6);
    stroke(pig, [[x, 3.1], [x + r.gauss() * 0.1, 3.1 - r.range(0.3, 1.2)]], { width: 0.035, pig: mixPig(INK, PIG_A, 0.5), load: 0.6, dry: 0.5, seed: r.int(1, 1e6), taperEnd: 0.9 });
  }
  return { pig };
}

/** A standing torch with a flame and a pool of light (dungeons). */
export function drawTorch(seed: number): PropArt {
  const r = new Rng(seed);
  const W = 1.4, H = 2.6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
  const red = new Painter(8, 8, SPRITE_PPU / 4, -4, -3.3);
  stroke(pig, [[0, 0], [0.02, 1.35]], { width: 0.08, load: 0.95, dry: 0.4, seed, taperEnd: 0.1 });
  solid(pig, [[-0.18, 1.3], [0.18, 1.3], [0.12, 1.5], [-0.12, 1.5]], INK, 0.6, seed + 1, 0.5, 0);
  for (const sx of [-1, 1]) stroke(pig, [[0, 0.05], [sx * 0.22, 0]], { width: 0.05, load: 0.9, seed: r.int(1, 1e6) });
  red.glaze();
  red.dab(0, 1.75, 0.18, VERMILION, 0.9, 0.3);
  red.dab(0, 1.9, 0.1, VERMILION, 0.8, 0.3);
  red.dab(0, 1.6, 3.4, LIGHT, 0.9, 0.05);
  return { pig, red };
}

/** A stone pillar, whole or broken. */
export function drawPillar(seed: number, broken: boolean): PropArt {
  const r = new Rng(seed);
  const h = broken ? r.range(0.9, 1.8) : 3.0;
  const W = 1.6, H = 3.8;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  solid(pig, [[-0.5, 0], [0.5, 0], [0.45, 0.22], [-0.45, 0.22]], INK, 0.25, seed, 0.7, 0.02);
  const top: V2[] = broken
    ? [[0.32, h], [0.1, h - 0.25], [-0.05, h + 0.1], [-0.32, h - 0.15]]
    : [[0.32, h], [-0.32, h]];
  solid(pig, [[-0.32, 0.22], [0.32, 0.22], ...top], mixPig(INK, PIG_A, 0.25), 0.22, seed + 1, 0.8, 0.02);
  for (let k = 0; k < 3; k++) stroke(pig, [[-0.18 + k * 0.18, 0.3], [-0.18 + k * 0.18 + r.gauss() * 0.01, h - 0.3]], { width: 0.025, load: 0.4, dry: 0.7, seed: r.int(1, 1e6), body: 0 });
  if (!broken) solid(pig, [[-0.5, h], [0.5, h], [0.45, h + 0.25], [-0.45, h + 0.25]], INK, 0.3, seed + 2, 0.7, 0.02);
  for (let i = 0; i < 4; i++) {
    const y = r.range(0.3, h - 0.2);
    stroke(pig, [[-0.32, y], [-0.32 + r.range(0.1, 0.3), y - 0.15]], { width: 0.03, pig: mixPig(INK, PIG_A, 0.5), load: 0.6, seed: r.int(1, 1e6), taperEnd: 0.8 });
  }
  return { pig };
}

/** A crumbled length of wall for ruins. */
export function drawRuinWall(seed: number): PropArt {
  const r = new Rng(seed);
  const W = 4.4, H = 2.6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  const pts: V2[] = [[-1.9, 0], [1.9, 0]];
  for (let i = 8; i >= 0; i--) pts.push([-1.9 + (i / 8) * 3.8, r.range(0.5, 1.7)]);
  const rp = solid(pig, pts, mixPig(INK, PIG_B, 0.2), 0.22, seed, 0.8, 0.03);
  for (let row = 0; row < 4; row++) {
    const y = 0.3 + row * 0.35;
    stroke(pig, [[-1.85, y], [1.85, y + r.gauss() * 0.02]], { width: 0.025, load: 0.45, dry: 0.7, seed: r.int(1, 1e6), body: 0 });
    for (let k = 0; k < 5; k++) {
      const x = -1.6 + k * 0.8 + (row % 2) * 0.4;
      stroke(pig, [[x, y], [x, y + 0.33]], { width: 0.02, load: 0.4, dry: 0.7, seed: r.int(1, 1e6), body: 0 });
    }
  }
  stroke(pig, rp.slice(Math.floor(rp.length * 0.25)), { width: 0.06, load: 0.85, dry: 0.5, seed: seed + 1, taperStart: 0.05, taperEnd: 0.1 });
  for (let i = 0; i < 4; i++) washBlob(pig, r.range(-2, 2), r.range(-0.1, 0.1), r.range(0.15, 0.3), 0.1, { pig: INK, density: 0.3, soft: 0.2, seed: r.int(1, 1e6) });
  return { pig };
}

/** Distant mountains along the top of the map: layered washes, misty feet. */
export function drawMountains(seed: number): PropArt {
  const r = new Rng(seed);
  const W = 30, H = 14;
  const pig = new Painter(W, H, SPRITE_PPU / 4, -W / 2, -1);
  pig.glaze();
  for (let layer = 0; layer < 3; layer++) {
    const base = layer * 0.6;
    const peaks: V2[] = [[-15, base]];
    let x = -15;
    while (x < 15) {
      x += r.range(2, 5);
      peaks.push([x, base + r.range(4, 11) * (1 - layer * 0.25)]);
      x += r.range(1.5, 3);
      peaks.push([x, base + r.range(1.5, 4)]);
    }
    peaks.push([15, base]);
    washPoly(pig, roughen(peaks, 0.25, seed + layer, 0.6), { pig: layer === 2 ? INK : mixPig(INK, PIG_B, 0.3), density: 0.06 + layer * 0.07, soft: 0.6, seed: seed + layer });
    // ridges
    stroke(pig, peaks.slice(1, peaks.length - 1), { width: 0.18, load: 0.25 + layer * 0.2, dry: 0.75, seed: seed + 10 + layer, body: 0.1, taperStart: 0.02, taperEnd: 0.02, press: 0 });
  }
  return { pig };
}

/** Rice shoots in a flooded paddy: a small stamp of upright ticks. */
export function drawShoots(p: Painter, x: number, y: number, seed: number): void {
  const r = new Rng(seed);
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * 0.12;
    stroke(p, [[x + dx, y], [x + dx + r.gauss() * 0.04, y + r.range(0.2, 0.35)]], { width: 0.03, pig: mixPig(INK, PIG_B, 0.7), load: r.range(0.5, 0.9), dry: 0.3, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.9, body: 0.5, press: 0 });
  }
}

export { INK };
