/** Little paintings of the loot: brushes, robes, talismans, seals. Painted once per base and shared. */
import { Painter, INK, PIG_A, PIG_B, VERMILION, mixPig } from '../paint';
import { stroke, dot, V2 } from '../brush';
import { washPoly, noisyOutline, roughen } from '../wash';
import { Frame, frameFrom } from '../sprite';
import type { Slot } from '../../game/items';

const cache = new Map<string, { pig: Frame; red: Frame }>();

function solid(p: Painter, pts: V2[], pig: typeof INK, d: number, seed: number): V2[] {
  const rp = roughen(pts, 0.01, seed, 0.05);
  p.reserve(() => rp.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
  p.glaze();
  washPoly(p, rp, { pig, density: d, soft: 0.05, edge: 0.8, seed });
  return rp;
}

/** Icon of an item, 1 × 1 unit, centred on (0, 0.5). */
export function itemArt(slot: Slot, base: number, ppu = 96): { pig: Frame; red: Frame } {
  const key = `${slot}:${base}:${ppu}`;
  let f = cache.get(key);
  if (f) return f;
  const p = new Painter(1.1, 1.1, ppu, -0.55, -0.05);
  const red = new Painter(1.1, 1.1, ppu, -0.55, -0.05);
  p.glaze();
  red.glaze();
  const s = 700 + base * 13;
  if (slot === 'brush') {
    // handle, ferrule, hair
    const long = 0.7 + base * 0.05;
    const a: V2 = [-0.3, 0.12], b: V2 = [-0.3 + long * 0.62, 0.12 + long * 0.78];
    stroke(p, [a, b], { width: 0.07 + base * 0.008, pig: base === 2 ? mixPig(INK, PIG_B, 0.6) : INK, load: 0.9, dry: 0.3, seed: s, taperStart: 0.02, taperEnd: 0.02 });
    const hair: V2[] = [[a[0] - 0.02, a[1] + 0.02], [a[0] - 0.09, a[1] - 0.05], [a[0] - 0.13, a[1] - 0.11]];
    stroke(p, hair, { width: 0.11 + base * 0.02, pig: INK, load: 1, dry: 0.15, seed: s + 1, taperStart: 0.05, taperEnd: 0.9, body: 1 });
    stroke(red, [[a[0] + 0.05, a[1] + 0.06], [a[0] + 0.1, a[1] + 0.12]], { width: 0.06, pig: VERMILION, load: 1, seed: s + 2 });
    if (base >= 3) stroke(red, [[b[0] - 0.02, b[1]], [b[0] + 0.06, b[1] - 0.12], [b[0] + 0.02, b[1] - 0.22]], { width: 0.03, pig: VERMILION, load: 1, seed: s + 3, taperEnd: 0.9 });
  } else if (slot === 'robe') {
    const pig = base === 3 ? mixPig(INK, PIG_A, 0.35) : base === 1 ? mixPig(INK, PIG_B, 0.6) : mixPig(INK, PIG_B, 0.3);
    const body = solid(p, [[-0.2, 0.86], [0.2, 0.86], [0.36, 0.1], [-0.36, 0.1]], pig, 0.3 + base * 0.04, s);
    solid(p, [[-0.2, 0.86], [-0.42, 0.62], [-0.32, 0.52], [-0.14, 0.7]], pig, 0.32, s + 1);
    solid(p, [[0.2, 0.86], [0.42, 0.62], [0.32, 0.52], [0.14, 0.7]], pig, 0.32, s + 2);
    stroke(p, [[-0.08, 0.86], [0.04, 0.6], [0.0, 0.12]], { width: 0.03, load: 0.8, seed: s + 3 });
    stroke(p, body.slice(0, Math.floor(body.length / 2)), { width: 0.035, load: 0.9, dry: 0.4, seed: s + 4 });
    stroke(base === 3 ? red : p, [[-0.24, 0.5], [0.24, 0.5]], { width: 0.05, pig: base === 3 ? VERMILION : INK, load: 1, seed: s + 5 });
  } else if (slot === 'charm') {
    stroke(p, [[-0.18, 0.95], [0, 0.72], [0.18, 0.95]], { width: 0.02, load: 0.8, seed: s, body: 0.3 });
    if (base === 0) {
      solid(p, [[-0.17, 0.72], [0.17, 0.72], [0.17, 0.12], [-0.17, 0.12]], PIG_B, 0.12, s + 1);
      for (let k = 0; k < 4; k++) stroke(red, [[-0.06, 0.62 - k * 0.12], [0.06, 0.6 - k * 0.12]], { width: 0.035, pig: VERMILION, load: 1, seed: s + 2 + k });
    } else if (base === 1) {
      solid(p, noisyOutline(0, 0.42, 0.22, 0.26, 0.06, s + 1), mixPig(INK, PIG_B, 0.5), 0.35, s + 1);
      stroke(p, [[-0.2, 0.3], [0, 0.26], [0.2, 0.3]], { width: 0.03, load: 0.9, seed: s + 2 });
      dot(p, 0, 0.14, 0.05, INK, 1, s + 3);
    } else {
      solid(p, noisyOutline(0, 0.42, 0.25, 0.25, 0.04, s + 1), mixPig(INK, PIG_A, 0.5), 0.32, s + 1);
      p.lift();
      p.circle(0, 0.42, 0.08, INK, 1);
      p.glaze();
    }
  } else {
    // a seal: a block with a carved face, red paste on top
    solid(p, [[-0.22, 0.08], [0.22, 0.08], [0.22, 0.6], [-0.22, 0.6]], base === 2 ? PIG_B : INK, base === 2 ? 0.2 : 0.3 + base * 0.1, s);
    solid(p, noisyOutline(0, 0.72, 0.16, 0.14, 0.1, s + 1), base === 1 ? mixPig(INK, PIG_A, 0.4) : INK, 0.45, s + 1);
    washPoly(red, roughen([[-0.2, 0.06], [0.2, 0.06], [0.2, 0.16], [-0.2, 0.16]], 0.01, s + 2, 0.04), { pig: VERMILION, density: 0.9, soft: 0.05, edge: 0.4, seed: s + 2 });
  }
  f = { pig: frameFrom(p), red: frameFrom(red) };
  cache.set(key, f);
  return f;
}
