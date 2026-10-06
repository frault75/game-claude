/** Trees, shrubs and grasses. All drawn upright (3/4 view) with the base at (0, 0). */
import { Painter, INK, PIG_A, PIG_B, mixPig, Pig } from '../paint';
import { stroke, dot, V2 } from '../brush';
import { washBlob } from '../wash';
import { Rng } from '../rng';

export const SPRITE_PPU = 64;

export type TreeSpecies = 'plum' | 'willow' | 'pine' | 'persimmon' | 'bare';

interface BranchCtx {
  p: Painter;
  r: Rng;
  tips: V2[];
  species: TreeSpecies;
  ink: Pig;
}

function branch(c: BranchCtx, x: number, y: number, ang: number, len: number, w: number, depth: number): void {
  const { r } = c;
  const pts: V2[] = [[x, y]];
  const segs = c.species === 'plum' ? r.int(2, 3) : r.int(2, 4);
  let a = ang, px = x, py = y;
  const kink = c.species === 'plum' ? 0.55 : c.species === 'willow' ? 0.2 : 0.3;
  for (let i = 0; i < segs; i++) {
    a += r.gauss() * kink;
    // keep growing upward-ish
    a = a * 0.85 + (Math.PI / 2) * 0.15 * (c.species === 'willow' ? 0.3 : 1);
    const l = len / segs;
    px += Math.cos(a) * l;
    py += Math.sin(a) * l;
    pts.push([px, py]);
  }
  stroke(c.p, pts, {
    width: w,
    pig: c.ink,
    load: 0.95,
    dry: depth === 0 ? 0.55 : 0.4,
    taperStart: 0.02,
    taperEnd: depth > 2 ? 0.8 : 0.45,
    seed: r.int(1, 1e6),
    rough: 0.25,
    body: 0.7,
    press: depth === 0 ? 0.2 : 0.4,
  });
  if (depth >= 3 || len < 0.35) {
    c.tips.push([px, py]);
    return;
  }
  const kids = depth === 0 ? r.int(2, 3) : r.int(1, 3);
  for (let k = 0; k < kids; k++) {
    const t = r.range(0.45, 1);
    const i = Math.min(pts.length - 1, Math.max(1, Math.round(t * (pts.length - 1))));
    const [bx, by] = pts[i];
    const side = k % 2 === 0 ? 1 : -1;
    const na = a + side * r.range(0.35, 0.95);
    branch(c, bx, by, na, len * r.range(0.5, 0.72), w * r.range(0.5, 0.65), depth + 1);
    c.tips.push([bx, by]);
  }
}

/** Plum blossom: five quick petals of pigment A around a dark calyx. */
function blossom(p: Painter, x: number, y: number, s: number, seed: number): void {
  const r = new Rng(seed);
  const open = r.chance(0.7);
  if (open) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + r.range(0, 1.2);
      dot(p, x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.5, s * 0.42, PIG_A, r.range(0.55, 0.95), seed + i);
    }
    p.circle(x, y, s * 0.12, INK, 0.8);
    for (let i = 0; i < 3; i++) {
      const a = r.range(0, Math.PI * 2);
      p.circle(x + Math.cos(a) * s * 0.35, y + Math.sin(a) * s * 0.35, s * 0.05, INK, 0.7);
    }
  } else {
    dot(p, x, y, s * 0.35, mixPig(PIG_A, INK, 0.15), 0.9, seed);
  }
}

export interface TreeArt {
  painter: Painter;
  /** Crown footprint for fading when the player walks behind (local units). */
  crown: { x: number; y: number; rx: number; ry: number };
  trunkRadius: number;
}

export function drawTree(seed: number, species: TreeSpecies, scale = 1): TreeArt {
  const r = new Rng(seed);
  const W = 6.5 * scale, H = 7 * scale;
  const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.6 * scale);
  p.glaze();
  const c: BranchCtx = { p, r, tips: [], species, ink: INK };
  const trunkW = (species === 'pine' ? 0.38 : 0.42) * scale;
  // roots
  for (let i = 0; i < 3; i++) {
    const s = i - 1;
    stroke(p, [[s * 0.05, 0.25 * scale], [s * 0.3 * scale, 0.05], [s * 0.55 * scale, -0.12 * scale]], {
      width: trunkW * 0.5, load: 0.8, dry: 0.6, seed: seed + 11 + i, taperEnd: 0.9,
    });
  }
  const trunkLen = (species === 'willow' ? 2.2 : species === 'pine' ? 2.6 : 1.9) * scale;
  branch(c, 0, 0, Math.PI / 2 + r.gauss() * 0.25, trunkLen, trunkW, 0);
  let crown = { x: 0, y: 3 * scale, rx: 2 * scale, ry: 1.6 * scale };
  if (species === 'plum') {
    for (const [tx, ty] of c.tips) {
      const n = r.int(2, 5);
      for (let i = 0; i < n; i++) {
        blossom(p, tx + r.gauss() * 0.35 * scale, ty + r.gauss() * 0.3 * scale, r.range(0.13, 0.2) * scale, r.int(1, 1e6));
      }
    }
  } else if (species === 'persimmon') {
    for (const [tx, ty] of c.tips) {
      washBlob(p, tx, ty, 0.5 * scale, 0.4 * scale, { pig: mixPig(PIG_B, INK, 0.3), density: 0.25, soft: 0.6, seed: r.int(1, 1e6) });
      if (r.chance(0.5)) dot(p, tx + r.gauss() * 0.2, ty - 0.1, 0.13 * scale, PIG_A, 1, r.int(1, 1e6));
    }
  } else if (species === 'willow') {
    for (const [tx, ty] of c.tips) {
      const n = r.int(2, 4);
      for (let i = 0; i < n; i++) {
        const x0 = tx + r.gauss() * 0.3, y0 = ty + r.gauss() * 0.2;
        const l = r.range(1.2, 2.6) * scale;
        stroke(p, [[x0, y0], [x0 + r.gauss() * 0.2, y0 - l * 0.5], [x0 + r.gauss() * 0.3, y0 - l]], {
          width: 0.05 * scale, pig: mixPig(INK, PIG_B, 0.6), load: 0.6, dry: 0.5, taperStart: 0.05, taperEnd: 0.9, seed: r.int(1, 1e6), body: 0.2,
        });
      }
    }
    crown = { x: 0, y: 2.6 * scale, rx: 2.4 * scale, ry: 2 * scale };
  } else if (species === 'pine') {
    // needle clusters: horizontal pads of short strokes
    for (const [tx, ty] of c.tips) {
      washBlob(p, tx, ty, 0.65 * scale, 0.28 * scale, { pig: mixPig(INK, PIG_B, 0.3), density: 0.35, soft: 0.5, seed: r.int(1, 1e6) });
      for (let i = 0; i < 9; i++) {
        const a = Math.PI / 2 + (i - 4) * 0.28;
        stroke(p, [[tx, ty], [tx + Math.cos(a) * 0.45 * scale, ty + Math.sin(a) * 0.25 * scale]], {
          width: 0.035 * scale, load: 0.8, dry: 0.3, taperEnd: 0.9, seed: r.int(1, 1e6), body: 0.1,
        });
      }
    }
  }
  return { painter: p, crown, trunkRadius: 0.3 * scale };
}

export function drawGrassTuft(p: Painter, x: number, y: number, s: number, seed: number, pig: Pig = INK, load = 0.8): void {
  const r = new Rng(seed);
  const n = r.int(2, 7);
  const tilt = r.gauss() * 0.18;
  const fan = r.range(0.35, 0.8);
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + tilt + (n === 1 ? 0 : (i / (n - 1) - 0.5) * fan) + r.gauss() * 0.12;
    const l = s * r.range(0.6, 1.5) * (i === Math.floor(n / 2) ? 1.25 : 1);
    const bend = r.gauss() * 0.45 + (a - Math.PI / 2) * 0.6;
    const x0 = x + r.gauss() * s * 0.12;
    const mx = x0 + Math.cos(a) * l * 0.55, my = y + Math.sin(a) * l * 0.55;
    stroke(p, [[x0, y], [mx, my], [mx + Math.cos(a + bend) * l * 0.45, my + Math.sin(a + bend) * l * 0.45]], {
      width: s * r.range(0.05, 0.085), pig, load: load * r.range(0.55, 1), dry: 0.35, taperStart: 0.02, taperEnd: 0.97, seed: r.int(1, 1e6), body: 0.35, press: 0.1,
    });
  }
}

/** A clump of tufts: grass grows in families, not alone. */
export function drawGrassClump(p: Painter, x: number, y: number, s: number, seed: number, pig: Pig = INK, load = 0.8): void {
  const r = new Rng(seed);
  const n = r.int(2, 5);
  for (let i = 0; i < n; i++) {
    drawGrassTuft(p, x + r.gauss() * s * 0.9, y + r.gauss() * s * 0.25, s * r.range(0.6, 1.1), r.int(1, 1e6), pig, load * r.range(0.5, 1));
  }
}

export function drawBamboo(seed: number, scale = 1): Painter {
  const r = new Rng(seed);
  const W = 4 * scale, H = 7 * scale;
  const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.3);
  p.glaze();
  const stems = r.int(3, 5);
  for (let s = 0; s < stems; s++) {
    let x = (s - stems / 2) * 0.35 * scale + r.gauss() * 0.1;
    let y = 0;
    const lean = r.gauss() * 0.06;
    const segs = r.int(4, 6);
    for (let k = 0; k < segs; k++) {
      const l = r.range(0.8, 1.1) * scale;
      stroke(p, [[x, y + 0.04], [x + lean * l, y + l - 0.06]], {
        width: 0.13 * scale, pig: mixPig(INK, PIG_B, 0.35), load: 0.75, dry: 0.25, taperStart: 0.05, taperEnd: 0.05, seed: r.int(1, 1e6), press: 0.5, body: 0.8,
      });
      x += lean * l; y += l;
      // node
      stroke(p, [[x - 0.08 * scale, y], [x + 0.08 * scale, y + 0.01]], { width: 0.05 * scale, load: 1, seed: r.int(1, 1e6), body: 0.5 });
      if (r.chance(0.55)) {
        const dir = r.chance(0.5) ? 1 : -1;
        for (let l = 0; l < r.int(2, 4); l++) {
          const a = (dir > 0 ? 0.3 : Math.PI - 0.3) + r.gauss() * 0.4 - 0.2;
          const ll = r.range(0.5, 0.85) * scale;
          stroke(p, [[x, y], [x + Math.cos(a) * ll * 0.5, y + Math.sin(a) * ll * 0.5 + 0.05], [x + Math.cos(a) * ll, y + Math.sin(a) * ll - 0.1]], {
            width: 0.14 * scale, load: r.range(0.6, 0.95), dry: 0.2, taperStart: 0.1, taperEnd: 0.85, seed: r.int(1, 1e6), body: 0.8, press: 0.2,
          });
        }
      }
    }
  }
  return p;
}
