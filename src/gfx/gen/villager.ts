/**
 * Villagers: the same few confident strokes as the child, in longer robes,
 * with hats, hair, aprons and what they carry. Frames are painted once per look.
 */
import { Painter, Pig, INK, PIG_A, PIG_B, VERMILION, mixPig } from '../paint';
import { stroke, dot, V2 } from '../brush';
import { washPoly, noisyOutline } from '../wash';
import { Frame, frameFrom } from '../sprite';
import { SPRITE_PPU } from './flora';

export interface VillagerLook {
  seed: number;
  /** Size relative to the child. */
  scale: number;
  robe: Pig;
  robeDensity: number;
  hair: 'bun' | 'short' | 'long' | 'none' | 'white';
  hat: 'none' | 'straw' | 'cone' | 'scarf';
  /** Elder's stoop, 0..1. */
  bent?: number;
  prop?: 'none' | 'cane' | 'spear' | 'basket' | 'kite' | 'cloth';
  apron?: boolean;
  beard?: boolean;
  redSash?: boolean;
}

export interface VillagerFrames {
  down: { pig: Frame; red: Frame }[];
  side: { pig: Frame; red: Frame }[];
  /** Feet-to-head height in world units (for labels and markers). */
  height: number;
}

const W = 2.4, H = 3.0, OX = -1.2, OY = -0.3;

function path(p: Painter, pts: V2[]): void {
  pts.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
  p.ctx.closePath();
}

function paint(look: VillagerLook, side: boolean, step: number, bob: number, seed: number): { pig: Painter; red: Painter } {
  const ppu = SPRITE_PPU * look.scale;
  const p = new Painter(W, H, ppu, OX, OY);
  const red = new Painter(W, H, ppu, OX, OY);
  p.glaze();
  red.glaze();
  const bent = look.bent ?? 0;
  const lean = side ? 0.06 * bent + 0.02 * Math.abs(step) : 0;
  const top = 0.86 - bent * 0.1 + bob;
  const sx = side ? 0.7 : 1;
  // feet peeking under the hem
  const fA = side ? step * 0.12 : -0.1, fB = side ? -step * 0.12 : 0.1;
  for (const [fx, s] of [[fA, 1], [fB, 2]] as [number, number][]) {
    stroke(p, [[fx - 0.05, 0.03], [fx + (side ? 0.07 : 0.03), 0.02]], { width: 0.07, load: 1, dry: 0.3, seed: seed + s, taperStart: 0.1, taperEnd: 0.3 });
  }
  // robe: long, a little flared, swaying with the step
  const sway = side ? step * 0.04 : 0;
  const robe: V2[] = [
    [-0.18 * sx + lean, top], [0.18 * sx + lean, top],
    [0.3 * sx + sway, 0.08 + bob * 0.5], [-0.3 * sx + sway, 0.08 + bob * 0.5],
  ];
  p.reserve(() => path(p, robe), 1);
  p.glaze();
  washPoly(p, robe, { pig: look.robe, density: look.robeDensity, soft: 0.05, edge: 0.8, seed: seed + 3 });
  stroke(p, [robe[0], [robe[0][0] - 0.04, (top + 0.08) / 2], robe[3]], { width: 0.065, load: 1, dry: 0.4, seed: seed + 4, taperStart: 0.05, taperEnd: 0.35 });
  stroke(p, [robe[1], [robe[1][0] + 0.04, (top + 0.08) / 2], robe[2]], { width: 0.05, load: 0.85, dry: 0.6, seed: seed + 5, taperStart: 0.05, taperEnd: 0.6 });
  // hem
  stroke(p, [robe[3], [sway, 0.06 + bob * 0.5], robe[2]], { width: 0.04, load: 0.8, dry: 0.5, seed: seed + 6, taperStart: 0.1, taperEnd: 0.2, body: 0.4 });
  if (look.apron && !side) {
    const ap: V2[] = [[-0.13, 0.55 + bob], [0.13, 0.55 + bob], [0.17, 0.14], [-0.17, 0.14]];
    p.reserve(() => path(p, ap), 1);
    p.glaze();
    washPoly(p, ap, { pig: PIG_A, density: 0.12, soft: 0.1, edge: 0.6, seed: seed + 7 });
    // dye stains
    dot(red, -0.06, 0.32, 0.035, VERMILION, 0.8, seed + 8);
    dot(p, 0.07, 0.24, 0.04, mixPig(INK, PIG_B, 0.5), 0.7, seed + 9);
  }
  // sash
  const sashY = 0.54 + bob - bent * 0.04;
  stroke(look.redSash ? red : p, [[-0.2 * sx + lean, sashY], [0.2 * sx + lean, sashY]], { width: 0.055, pig: look.redSash ? VERMILION : INK, load: 1, seed: seed + 10, body: 0.9 });
  // arms in wide sleeves
  const arm = (s: number, swing: number, k: number): V2 => {
    const shx = s * 0.17 * sx + lean, shy = top - 0.06;
    const hx = side ? shx + swing * 0.12 + bent * 0.12 : shx + s * 0.1;
    const hy = shy - 0.36 + Math.abs(swing) * 0.03;
    stroke(p, [[shx, shy], [(shx + hx) / 2 + s * 0.05, (shy + hy) / 2], [hx, hy]], { width: 0.085, load: 0.9, dry: 0.45, seed: seed + k, taperStart: 0.05, taperEnd: 0.2, body: 0.7 });
    return [hx, hy];
  };
  arm(-1, -step, 11);
  const hand = arm(1, step, 12);
  // head
  const hx = lean * 1.6 + (side ? 0.03 : 0), hy = top + 0.16 - bent * 0.06;
  const head = noisyOutline(hx, hy, 0.13, 0.125, 0.05, seed + 13);
  p.reserve(() => path(p, head), 1);
  p.glaze();
  stroke(p, head.slice(4, head.length - 2), { width: 0.03, load: 0.9, dry: 0.3, seed: seed + 14, body: 0.5 });
  if (side) p.circle(hx + 0.07, hy - 0.01, 0.017, INK, 1);
  else {
    p.circle(hx - 0.045, hy - 0.01, 0.017, INK, 1);
    p.circle(hx + 0.045, hy - 0.01, 0.017, INK, 1);
  }
  if (look.beard) {
    for (let k = -1; k <= 1; k++) stroke(p, [[hx + k * 0.04, hy - 0.08], [hx + k * 0.05, hy - 0.2]], { width: 0.025, load: 0.8, dry: 0.5, seed: seed + 15 + k, taperEnd: 0.8 });
  }
  // hair
  const hairPig = look.hair === 'white' ? mixPig(INK, PIG_B, 0.2) : INK;
  const hairD = look.hair === 'white' ? 0.18 : 0.75;
  if (look.hair === 'bun' || look.hair === 'white') {
    washPoly(p, noisyOutline(hx - (side ? 0.08 : 0), hy + 0.17, 0.08, 0.07, 0.15, seed + 16), { pig: hairPig, density: hairD, soft: 0.1, edge: 0.6, seed: seed + 16 });
    stroke(p, [[hx - 0.13, hy + 0.04], [hx, hy + 0.13], [hx + 0.13, hy + 0.04]], { width: 0.05, pig: hairPig, load: look.hair === 'white' ? 0.35 : 0.9, dry: 0.4, seed: seed + 17 });
  } else if (look.hair === 'long') {
    washPoly(p, [[hx - 0.14, hy + 0.08], [hx + 0.14, hy + 0.08], [hx + 0.16, hy - 0.3], [hx - 0.16, hy - 0.3]], { pig: INK, density: 0.55, soft: 0.2, edge: 0.4, seed: seed + 18 });
  } else if (look.hair === 'short') {
    stroke(p, [[hx - 0.13, hy + 0.03], [hx - 0.04, hy + 0.13], [hx + 0.1, hy + 0.1], [hx + 0.13, hy + 0.02]], { width: 0.07, load: 0.95, dry: 0.3, seed: seed + 19 });
  }
  // hats
  if (look.hat === 'straw') {
    const hat = noisyOutline(hx, hy + 0.12, 0.38, 0.12, 0.08, seed + 20);
    p.reserve(() => path(p, hat), 1);
    p.glaze();
    washPoly(p, hat, { pig: mixPig(INK, PIG_B, 0.4), density: 0.22, soft: 0.05, edge: 0.9, seed: seed + 20 });
    stroke(p, [[hx - 0.38, hy + 0.11], [hx, hy + 0.04], [hx + 0.38, hy + 0.11]], { width: 0.045, load: 1, dry: 0.35, seed: seed + 21 });
  } else if (look.hat === 'cone') {
    const cone: V2[] = [[hx - 0.36, hy + 0.08], [hx + 0.36, hy + 0.08], [hx, hy + 0.42]];
    p.reserve(() => path(p, cone), 1);
    p.glaze();
    washPoly(p, cone, { pig: mixPig(INK, PIG_B, 0.3), density: 0.32, soft: 0.05, edge: 0.9, seed: seed + 22 });
    stroke(p, [[hx - 0.37, hy + 0.08], [hx + 0.37, hy + 0.08]], { width: 0.05, load: 1, dry: 0.3, seed: seed + 23 });
    stroke(p, [[hx - 0.3, hy + 0.1], [hx, hy + 0.42], [hx + 0.3, hy + 0.1]], { width: 0.03, load: 0.7, dry: 0.6, seed: seed + 24, body: 0.2 });
  } else if (look.hat === 'scarf') {
    const sc: V2[] = [[hx - 0.15, hy + 0.0], [hx - 0.12, hy + 0.16], [hx + 0.12, hy + 0.16], [hx + 0.15, hy + 0.0], [hx, hy + 0.08]];
    washPoly(red, sc, { pig: VERMILION, density: 0.9, soft: 0.05, edge: 0.3, seed: seed + 25 });
    stroke(red, [[hx + 0.12, hy + 0.04], [hx + 0.2, hy - 0.08], [hx + 0.24, hy - 0.2]], { width: 0.05, pig: VERMILION, load: 1, dry: 0.3, seed: seed + 26, taperEnd: 0.8 });
  }
  // what they carry
  const prop = look.prop ?? 'none';
  if (prop === 'cane') {
    stroke(p, [[hand[0] + 0.02, hand[1] + 0.08], [hand[0] + 0.06, hand[1] - 0.2], [hand[0] + 0.1, 0.02]], { width: 0.045, load: 1, dry: 0.4, seed: seed + 27, taperStart: 0.05, taperEnd: 0.1 });
  } else if (prop === 'spear') {
    const x = hand[0] + 0.02;
    stroke(p, [[x, 0.02], [x + 0.01, 1.7]], { width: 0.04, load: 1, dry: 0.3, seed: seed + 28, taperStart: 0.02, taperEnd: 0.05 });
    washPoly(p, [[x - 0.05, 1.68], [x + 0.06, 1.68], [x + 0.01, 1.92]], { pig: INK, density: 0.8, soft: 0.05, edge: 0.5, seed: seed + 29 });
    stroke(red, [[x - 0.06, 1.62], [x + 0.08, 1.6]], { width: 0.05, pig: VERMILION, load: 1, seed: seed + 30 });
  } else if (prop === 'basket') {
    const b = noisyOutline(hand[0] + 0.05, hand[1] - 0.08, 0.15, 0.1, 0.1, seed + 31);
    p.reserve(() => path(p, b), 1);
    p.glaze();
    washPoly(p, b, { pig: mixPig(INK, PIG_B, 0.6), density: 0.3, soft: 0.05, edge: 0.8, seed: seed + 31 });
    stroke(p, [[hand[0] - 0.08, hand[1] - 0.05], [hand[0] + 0.05, hand[1] + 0.12], [hand[0] + 0.18, hand[1] - 0.05]], { width: 0.025, load: 0.9, seed: seed + 32 });
  } else if (prop === 'kite') {
    const kx = hand[0] + 0.35, ky = 1.75;
    stroke(p, [[hand[0], hand[1]], [kx - 0.15, ky - 0.6], [kx, ky - 0.15]], { width: 0.012, load: 0.6, seed: seed + 33, body: 0.2, taperStart: 0, taperEnd: 0 });
    washPoly(red, [[kx, ky + 0.2], [kx + 0.14, ky], [kx, ky - 0.18], [kx - 0.14, ky]], { pig: VERMILION, density: 0.95, soft: 0.05, edge: 0.4, seed: seed + 34 });
    stroke(red, [[kx, ky - 0.18], [kx - 0.06, ky - 0.32], [kx + 0.03, ky - 0.45]], { width: 0.03, pig: VERMILION, load: 1, seed: seed + 35, taperEnd: 0.9 });
  } else if (prop === 'cloth') {
    // a length of dyed cloth over the arm
    stroke(red, [[hand[0] - 0.05, hand[1] + 0.12], [hand[0] + 0.05, hand[1] - 0.05], [hand[0] + 0.02, hand[1] - 0.35]], { width: 0.1, pig: VERMILION, load: 0.9, dry: 0.2, seed: seed + 36, taperStart: 0.1, taperEnd: 0.3, body: 0.9 });
  }
  return { pig: p, red };
}

export function buildVillagerFrames(look: VillagerLook): VillagerFrames {
  const down: VillagerFrames['down'] = [];
  const side: VillagerFrames['side'] = [];
  let seed = look.seed * 31;
  for (const bob of [0, -0.012]) {
    const f = paint(look, false, 0, bob, seed++ * 7);
    down.push({ pig: frameFrom(f.pig), red: frameFrom(f.red) });
  }
  for (const [step, bob] of [[1, 0], [0, 0.02], [-1, 0], [0, 0.02]]) {
    const f = paint(look, true, step, bob, seed++ * 7);
    side.push({ pig: frameFrom(f.pig), red: frameFrom(f.red) });
  }
  return { down, side, height: (1.15 + (look.hat === 'cone' ? 0.3 : 0.1)) * look.scale };
}

export { INK, PIG_A, PIG_B };
