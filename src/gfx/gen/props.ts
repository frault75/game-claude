/** Man-made things: posts, lamps, huts, boats. Red marks go to a separate red-layer painter. */
import { Painter, INK, PIG_A, PIG_B, VERMILION, LIGHT, mixPig } from '../paint';
import { stroke, V2 } from '../brush';
import { washPoly, washBlob, noisyOutline, roughen } from '../wash';
import { Rng } from '../rng';
import { SPRITE_PPU } from './flora';

export interface PropArt {
  pig: Painter;
  red?: Painter;
}

/** The vermilion knot: the universal sign that the thread can take something. */
export function drawKnot(p: Painter, x: number, y: number, s: number, seed: number): void {
  const r = new Rng(seed);
  // loop
  const loop: V2[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.6;
    loop.push([x + Math.cos(a) * s * 0.35, y + s * 0.15 + Math.sin(a) * s * 0.28]);
  }
  stroke(p, loop, { width: s * 0.22, pig: VERMILION, load: 1, dry: 0.15, taperStart: 0.05, taperEnd: 0.2, seed, body: 0.9, press: 0.5 });
  // two tails
  for (const side of [-1, 1]) {
    stroke(p, [[x, y], [x + side * s * 0.25, y - s * 0.3], [x + side * s * (0.35 + r.range(0, 0.15)), y - s * 0.6]], {
      width: s * 0.18, pig: VERMILION, load: 1, dry: 0.3, taperStart: 0.02, taperEnd: 0.8, seed: seed + side * 7, body: 0.9,
    });
  }
}

export function drawPost(seed: number, height = 1.4, knot = true): PropArt {
  const r = new Rng(seed);
  const W = 1.2, H = height + 0.8;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
  const tw = 0.24;
  pig.reserve(() => pig.ctx.rect(-tw / 2, 0, tw, height), 0.9);
  pig.glaze();
  washPoly(pig, roughen([[-tw / 2, 0], [tw / 2, 0], [tw / 2, height], [-tw / 2, height]], 0.015, seed, 0.1), { pig: INK, density: 0.22, soft: 0.05, edge: 0.6, seed });
  stroke(pig, [[-tw / 2, 0.02], [-tw / 2 - 0.01, height]], { width: 0.07, load: 0.95, dry: 0.5, seed: seed + 1, taperEnd: 0.1 });
  stroke(pig, [[tw / 2, height * 0.9], [tw / 2 + 0.01, 0.05]], { width: 0.05, load: 0.8, dry: 0.7, seed: seed + 2, taperEnd: 0.6 });
  // top cap
  washBlob(pig, 0, height, tw * 0.6, 0.06, { pig: INK, density: 0.5, soft: 0.1, seed: seed + 3 });
  // wood grain
  for (let i = 0; i < 3; i++) {
    const x = r.range(-tw * 0.3, tw * 0.3), y = r.range(0.2, height - 0.3);
    stroke(pig, [[x, y], [x + r.gauss() * 0.02, y + r.range(0.15, 0.3)]], { width: 0.02, load: 0.5, dry: 0.6, seed: r.int(1, 1e6), body: 0 });
  }
  let red: Painter | undefined;
  if (knot) {
    red = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
    red.glaze();
    drawKnot(red, 0, height * 0.72, 0.42, seed + 9);
  }
  return { pig, red };
}

export function drawStoneLamp(seed: number, lit = false): PropArt {
  const r = new Rng(seed);
  const W = 1.8, H = 2.8;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
  const body = (pts: V2[], d: number, s: number) => {
    const rp = roughen(pts, 0.02, s, 0.08);
    pig.reserve(() => {
      rp.forEach((q, i) => (i === 0 ? pig.ctx.moveTo(q[0], q[1]) : pig.ctx.lineTo(q[0], q[1])));
      pig.ctx.closePath();
    }, 0.9);
    pig.glaze();
    washPoly(pig, rp, { pig: INK, density: d, soft: 0.05, edge: 0.7, seed: s });
  };
  body([[-0.45, 0], [0.45, 0], [0.38, 0.25], [-0.38, 0.25]], 0.18, seed);
  body([[-0.14, 0.25], [0.14, 0.25], [0.12, 1.05], [-0.12, 1.05]], 0.2, seed + 1);
  body([[-0.4, 1.05], [0.4, 1.05], [0.3, 1.2], [-0.3, 1.2]], 0.2, seed + 2);
  body([[-0.3, 1.2], [0.3, 1.2], [0.3, 1.65], [-0.3, 1.65]], 0.16, seed + 3);
  body([[-0.6, 1.65], [0.6, 1.65], [0.15, 2.0], [-0.15, 2.0]], 0.28, seed + 4);
  body([[-0.07, 2.0], [0.07, 2.0], [0.04, 2.2], [-0.04, 2.2]], 0.3, seed + 5);
  // fire window
  pig.over();
  pig.ctx.fillStyle = 'rgba(0,0,0,1)';
  pig.ctx.fillRect(-0.14, 1.28, 0.28, 0.28);
  pig.glaze();
  stroke(pig, [[-0.6, 1.65], [0, 1.98], [0.6, 1.65]], { width: 0.06, load: 0.9, dry: 0.4, seed: seed + 6 });
  stroke(pig, [[-0.45, 0.02], [-0.38, 0.25]], { width: 0.05, load: 0.8, dry: 0.5, seed: seed + 7 });
  for (let i = 0; i < 4; i++) {
    const x = r.range(-0.3, 0.3), y = r.range(0.1, 1.9);
    stroke(pig, [[x, y], [x + 0.05, y - 0.08]], { width: 0.03, load: 0.6, dry: 0.7, seed: r.int(1, 1e6), body: 0 });
  }
  let red: Painter | undefined;
  if (lit) {
    red = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
    red.glaze();
    red.dab(0, 1.42, 0.16, VERMILION, 0.7, 0.2);
    red.dab(0, 1.42, 0.9, LIGHT, 0.9, 0.0);
  }
  return { pig, red };
}

export function drawHut(seed: number): PropArt {
  const r = new Rng(seed);
  const W = 6, H = 5.2;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
  // walls
  const wall: V2[] = [[-1.9, 0], [1.9, 0], [1.9, 1.7], [-1.9, 1.7]];
  pig.reserve(() => wall.forEach((q, i) => (i === 0 ? pig.ctx.moveTo(q[0], q[1]) : pig.ctx.lineTo(q[0], q[1]))), 1);
  pig.glaze();
  washPoly(pig, roughen(wall, 0.03, seed, 0.2), { pig: INK, density: 0.06, soft: 0.2, edge: 0.3, seed });
  // posts
  for (const x of [-1.85, -0.6, 0.6, 1.85]) {
    stroke(pig, [[x, 0], [x + r.gauss() * 0.01, 1.75]], { width: 0.1, load: 0.9, dry: 0.45, seed: r.int(1, 1e6), taperEnd: 0.05 });
  }
  // door
  washPoly(pig, roughen([[-0.45, 0], [0.45, 0], [0.45, 1.25], [-0.45, 1.25]], 0.02, seed + 1, 0.15), { pig: INK, density: 0.55, soft: 0.1, edge: 0.5, seed: seed + 1 });
  // lattice window
  for (let i = 0; i < 4; i++) {
    stroke(pig, [[1.0 + i * 0.15, 0.7], [1.0 + i * 0.15, 1.3]], { width: 0.025, load: 0.7, seed: r.int(1, 1e6), body: 0.3 });
  }
  stroke(pig, [[0.95, 1.0], [1.5, 1.0]], { width: 0.025, load: 0.7, seed: r.int(1, 1e6), body: 0.3 });
  // roof: big thatched wash with curved eaves
  const roof: V2[] = [[-2.7, 1.5], [-2.2, 1.85], [-1.2, 3.4], [1.2, 3.4], [2.2, 1.85], [2.7, 1.5], [0, 1.7]];
  const roofR = roughen(roof, 0.05, seed + 2, 0.2);
  pig.reserve(() => roofR.forEach((q, i) => (i === 0 ? pig.ctx.moveTo(q[0], q[1]) : pig.ctx.lineTo(q[0], q[1]))), 1);
  pig.glaze();
  washPoly(pig, roofR, { pig: mixPig(INK, PIG_B, 0.25), density: 0.3, soft: 0.15, edge: 0.7, seed: seed + 2, blooms: 2 });
  stroke(pig, [[-2.75, 1.48], [-1.2, 1.72], [0, 1.75], [1.2, 1.72], [2.75, 1.48]], { width: 0.12, load: 1, dry: 0.35, seed: seed + 3, taperStart: 0.05, taperEnd: 0.1 });
  stroke(pig, [[-1.25, 3.4], [0, 3.48], [1.25, 3.4]], { width: 0.1, load: 0.95, dry: 0.5, seed: seed + 4 });
  // thatch strokes
  for (let i = 0; i < 26; i++) {
    const t = r.next();
    const x0 = -1.1 + t * 2.2;
    const x1 = -2.5 + t * 5.0;
    stroke(pig, [[x0, 3.35], [x1 * 0.6 + x0 * 0.4, 2.5], [x1, 1.8]], { width: 0.03, load: r.range(0.3, 0.6), dry: 0.8, seed: r.int(1, 1e6), body: 0, taperEnd: 0.7 });
  }
  return { pig };
}

export function drawBoat(seed: number): PropArt {
  const W = 3.6, H = 1.6;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.6);
  const hull: V2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = -1.6 + t * 3.2;
    hull.push([x, 0.25 + 0.15 * Math.pow(Math.abs(t - 0.5) * 2, 3)]);
  }
  for (let i = 20; i >= 0; i--) {
    const t = i / 20;
    const x = -1.6 + t * 3.2;
    hull.push([x * 0.95, -0.25 * Math.sin(t * Math.PI) - 0.02]);
  }
  pig.reserve(() => hull.forEach((q, i) => (i === 0 ? pig.ctx.moveTo(q[0], q[1]) : pig.ctx.lineTo(q[0], q[1]))), 1);
  pig.glaze();
  washPoly(pig, hull, { pig: INK, density: 0.2, soft: 0.05, edge: 0.8, seed });
  stroke(pig, hull.slice(0, 21), { width: 0.08, load: 1, dry: 0.3, seed: seed + 1, taperStart: 0.05, taperEnd: 0.05 });
  stroke(pig, [[-0.4, -0.15], [-0.4, 0.3]], { width: 0.05, load: 0.8, seed: seed + 2 });
  stroke(pig, [[0.4, -0.15], [0.4, 0.3]], { width: 0.05, load: 0.8, seed: seed + 3 });
  const red = new Painter(W, H, SPRITE_PPU, -W / 2, -0.6);
  red.glaze();
  drawKnot(red, 1.45, 0.3, 0.32, seed + 5);
  return { pig, red };
}

export function drawLanternPaper(seed: number, lit = true): PropArt {
  const W = 1.0, H = 1.2;
  const pig = new Painter(W, H, SPRITE_PPU, -W / 2, -0.2);
  const o = noisyOutline(0, 0.4, 0.26, 0.3, 0.06, seed);
  pig.reserve(() => o.forEach((q, i) => (i === 0 ? pig.ctx.moveTo(q[0], q[1]) : pig.ctx.lineTo(q[0], q[1]))), 1);
  pig.glaze();
  washPoly(pig, o, { pig: PIG_B, density: lit ? 0.35 : 0.1, soft: 0.4, edge: 0.4, seed });
  for (let i = -1; i <= 1; i++) {
    stroke(pig, [[i * 0.12, 0.12], [i * 0.17, 0.4], [i * 0.12, 0.68]], { width: 0.025, load: 0.6, seed: seed + i + 3, body: 0.2 });
  }
  stroke(pig, [[-0.12, 0.7], [0.12, 0.7]], { width: 0.06, load: 0.9, seed: seed + 8 });
  stroke(pig, [[-0.1, 0.1], [0.1, 0.1]], { width: 0.06, load: 0.9, seed: seed + 9 });
  let red: Painter | undefined;
  if (lit) {
    red = new Painter(W, H, SPRITE_PPU, -W / 2, -0.2);
    red.glaze();
    red.dab(0, 0.4, 0.5, LIGHT, 0.8, 0);
  }
  return { pig, red };
}

export { PIG_A };
