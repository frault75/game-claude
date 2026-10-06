/**
 * The child: a few confident strokes, a round straw hat, a red scarf.
 * Frames are painted once (each with its own seed, so they "boil") and reused.
 */
import { Painter, INK, PIG_B, VERMILION, mixPig } from '../paint';
import { stroke, V2 } from '../brush';
import { washPoly, noisyOutline } from '../wash';
import { Frame, frameFrom } from '../sprite';
import { SPRITE_PPU } from './flora';

export type Facing = 'down' | 'up' | 'side';
export type ChildPose = 'idle' | 'walk' | 'strike' | 'cast' | 'hurt';

const W = 1.8, H = 2.0, OX = -0.9, OY = -0.25;

interface PoseParams {
  legL: number; // forward swing -1..1
  legR: number;
  armL: number;
  armR: number;
  bob: number;
  lean: number;
  reach?: number; // brush arm extended forward
  scarf: number; // tail flutter
}

function paintChild(facing: Facing, pp: PoseParams, seed: number): { pig: Painter; red: Painter } {
  const p = new Painter(W, H, SPRITE_PPU, OX, OY);
  const red = new Painter(W, H, SPRITE_PPU, OX, OY);
  p.glaze();
  red.glaze();
  const b = pp.bob;
  const lean = pp.lean;
  const side = facing === 'side';
  const hipY = 0.36 + b;
  // legs
  const leg = (x: number, swing: number, s: number) => {
    const fx = side ? swing * 0.16 : x + swing * 0.02;
    const fy = side ? 0.02 + Math.max(0, -swing) * 0.04 : 0.02 + Math.max(0, swing) * 0.05;
    stroke(p, [[x * (side ? 0.3 : 1) + lean * 0.5, hipY], [fx * 0.7 + x * 0.3, (hipY + fy) / 2], [fx, fy]], {
      width: 0.075, load: 1, dry: 0.3, taperStart: 0.05, taperEnd: 0.25, seed: s, body: 0.8, press: 0.2,
    });
  };
  leg(-0.09, pp.legL, seed + 1);
  leg(0.09, pp.legR, seed + 2);

  // robe
  const robe: V2[] = side
    ? [[-0.16 + lean, 0.78 + b], [0.12 + lean, 0.78 + b], [0.2 + lean * 0.5, 0.3 + b], [-0.24 + lean * 0.5, 0.3 + b]]
    : [[-0.15 + lean, 0.78 + b], [0.15 + lean, 0.78 + b], [0.24, 0.3 + b], [-0.24, 0.3 + b]];
  p.reserve(() => robe.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
  p.glaze();
  washPoly(p, robe, { pig: mixPig(INK, PIG_B, 0.15), density: 0.32, soft: 0.05, edge: 0.8, seed: seed + 3 });
  stroke(p, [robe[0], [robe[0][0] - 0.03, 0.55 + b], robe[3]], { width: 0.06, load: 1, dry: 0.4, seed: seed + 4, taperStart: 0.05, taperEnd: 0.4 });
  stroke(p, [robe[1], [robe[1][0] + 0.03, 0.55 + b], robe[2]], { width: 0.05, load: 0.9, dry: 0.6, seed: seed + 5, taperStart: 0.05, taperEnd: 0.6 });
  // sash
  stroke(p, [[robe[3][0] * 0.7 + lean * 0.4, 0.52 + b], [robe[2][0] * 0.7 + lean * 0.4, 0.52 + b]], { width: 0.05, load: 1, seed: seed + 6, body: 0.9 });

  // arms
  const arm = (sx: number, swing: number, s: number, reach = 0) => {
    const shx = sx * 0.16 + lean, shy = 0.72 + b;
    let hx: number, hy: number;
    if (reach > 0) {
      hx = side ? shx + 0.38 * reach : shx + sx * 0.25 * reach;
      hy = side ? shy - 0.05 : shy - 0.1 - 0.15 * reach;
    } else {
      hx = side ? shx + swing * 0.14 : shx + sx * 0.06;
      hy = shy - 0.3 + Math.abs(swing) * 0.03;
    }
    stroke(p, [[shx, shy], [(shx + hx) / 2 + sx * 0.03, (shy + hy) / 2], [hx, hy]], {
      width: 0.06, load: 0.95, dry: 0.4, taperStart: 0.05, taperEnd: 0.4, seed: s, body: 0.7,
    });
    return [hx, hy] as V2;
  };
  if (!side || true) {
    arm(-1, pp.armL, seed + 7);
    arm(1, pp.armR, seed + 8, pp.reach ?? 0);
  }

  // head (paper face reserved)
  const hx = lean * 1.2, hy = 0.9 + b;
  const head = noisyOutline(hx, hy, 0.14, 0.13, 0.05, seed + 9);
  p.reserve(() => head.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
  p.glaze();
  if (facing === 'up') {
    washPoly(p, head, { pig: INK, density: 0.5, soft: 0.1, seed: seed + 10 });
  } else {
    stroke(p, head.slice(4, head.length - 2), { width: 0.03, load: 0.9, dry: 0.3, seed: seed + 10, body: 0.5 });
    if (facing === 'down') {
      p.circle(hx - 0.05, hy - 0.02, 0.018, INK, 1);
      p.circle(hx + 0.05, hy - 0.02, 0.018, INK, 1);
    } else {
      p.circle(hx + 0.07, hy - 0.02, 0.018, INK, 1);
      // hair at the back
      washPoly(p, noisyOutline(hx - 0.07, hy + 0.02, 0.07, 0.09, 0.2, seed + 11), { pig: INK, density: 0.6, soft: 0.1, seed: seed + 11 });
    }
  }

  // straw hat: wide, flat, round
  const hatY = hy + 0.11;
  const hat = noisyOutline(hx, hatY, 0.36, 0.12, 0.08, seed + 12);
  p.reserve(() => hat.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
  p.glaze();
  washPoly(p, hat, { pig: mixPig(INK, PIG_B, 0.4), density: 0.22, soft: 0.05, edge: 0.9, seed: seed + 12 });
  stroke(p, [[hx - 0.37, hatY - 0.01], [hx - 0.15, hatY - 0.09], [hx + 0.15, hatY - 0.09], [hx + 0.37, hatY - 0.01]], {
    width: 0.045, load: 1, dry: 0.35, seed: seed + 13, taperStart: 0.05, taperEnd: 0.2,
  });
  stroke(p, [[hx - 0.12, hatY + 0.02], [hx, hatY + 0.12], [hx + 0.12, hatY + 0.02]], { width: 0.04, load: 0.9, dry: 0.5, seed: seed + 14 });

  // red scarf (vermilion layer)
  const ny = 0.77 + b;
  stroke(red, [[-0.13 + lean, ny], [0, ny - 0.03], [0.13 + lean, ny]], { width: 0.07, pig: VERMILION, load: 1, dry: 0.1, seed: seed + 15, body: 1, taperStart: 0.1, taperEnd: 0.1 });
  const tailDir = facing === 'side' ? -1 : facing === 'up' ? 0.2 : -0.6;
  const fl = pp.scarf;
  stroke(red, [[0.06 + lean, ny - 0.02], [0.06 + tailDir * 0.12 + lean, ny - 0.1 + fl * 0.03], [0.06 + tailDir * 0.26 + lean, ny - 0.14 + fl * 0.06]], {
    width: 0.06, pig: VERMILION, load: 1, dry: 0.25, seed: seed + 16, taperStart: 0.05, taperEnd: 0.8,
  });
  // the thread knot at the wrist (right hand)
  return { pig: p, red };
}

export interface ChildFrames {
  pig: Record<Facing, Record<ChildPose, Frame[]>>;
  red: Record<Facing, Record<ChildPose, Frame[]>>;
}

export function buildChildFrames(): ChildFrames {
  const facings: Facing[] = ['down', 'up', 'side'];
  const out = { pig: {} as ChildFrames['pig'], red: {} as ChildFrames['red'] };
  let seed = 1000;
  for (const f of facings) {
    out.pig[f] = {} as Record<ChildPose, Frame[]>;
    out.red[f] = {} as Record<ChildPose, Frame[]>;
    const poses: Record<ChildPose, PoseParams[]> = {
      idle: [
        { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0, lean: 0, scarf: 0 },
        { legL: 0, legR: 0, armL: 0, armR: 0, bob: -0.01, lean: 0, scarf: 0.5 },
        { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0, lean: 0, scarf: 1 },
      ],
      walk: [
        { legL: 1, legR: -1, armL: -1, armR: 1, bob: 0.0, lean: f === 'side' ? 0.03 : 0, scarf: 1 },
        { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0.025, lean: f === 'side' ? 0.03 : 0, scarf: 0 },
        { legL: -1, legR: 1, armL: 1, armR: -1, bob: 0.0, lean: f === 'side' ? 0.03 : 0, scarf: 1 },
        { legL: 0, legR: 0, armL: 0, armR: 0, bob: 0.025, lean: f === 'side' ? 0.03 : 0, scarf: 0 },
      ],
      strike: [
        { legL: 0.6, legR: -0.4, armL: 0, armR: 0, bob: -0.02, lean: f === 'side' ? 0.06 : 0, reach: 0.4, scarf: 1 },
        { legL: 0.8, legR: -0.6, armL: 0, armR: 0, bob: -0.03, lean: f === 'side' ? 0.09 : 0, reach: 1, scarf: 1 },
      ],
      cast: [{ legL: 0.3, legR: -0.3, armL: 0, armR: 0, bob: 0, lean: f === 'side' ? 0.04 : 0, reach: 1, scarf: 0.5 }],
      hurt: [{ legL: -0.5, legR: 0.5, armL: 1, armR: 1, bob: 0.02, lean: f === 'side' ? -0.07 : 0, scarf: 1 }],
    };
    for (const pose of Object.keys(poses) as ChildPose[]) {
      out.pig[f][pose] = [];
      out.red[f][pose] = [];
      for (const pp of poses[pose]) {
        const { pig, red } = paintChild(f, pp, seed++ * 13);
        out.pig[f][pose].push(frameFrom(pig));
        out.red[f][pose].push(frameFrom(red));
      }
    }
  }
  return out;
}

export const CHILD_FRAME = { w: W, h: H, ox: OX, oy: OY };
