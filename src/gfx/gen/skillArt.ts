/** Glyphs for the skills: one quick painting each, in pigment (ink) and real colour (accent). */
import { Painter, INK, VERMILION } from '../paint';
import { stroke, V2 } from '../brush';
import { washPoly, noisyOutline, roughen } from '../wash';
import { Frame, frameFrom } from '../sprite';
import type { SkillId } from '../../game/skills';

const cache = new Map<SkillId, { pig: Frame; red: Frame; acc: Frame }>();

/** 100 × 100 UI units, centred. */
export function skillArt(id: SkillId): { pig: Frame; red: Frame; acc: Frame } {
  let f = cache.get(id);
  if (f) return f;
  const p = new Painter(100, 100, 1.2, -50, -50);
  const red = new Painter(100, 100, 1.2, -50, -50);
  const acc = new Painter(100, 100, 1.2, -50, -50);
  p.glaze();
  red.glaze();
  acc.over();
  const col = (c: string, pts: V2[], w: number) => {
    acc.ctx.strokeStyle = c;
    acc.ctx.lineWidth = w;
    acc.ctx.lineCap = 'round';
    acc.ctx.lineJoin = 'round';
    acc.ctx.beginPath();
    pts.forEach((q, i) => (i === 0 ? acc.ctx.moveTo(q[0], q[1]) : acc.ctx.lineTo(q[0], q[1])));
    acc.ctx.stroke();
  };
  const s = id.length * 31;
  const spiral = (n: number, r0: number, r1: number, turns: number): V2[] => {
    const pts: V2[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * Math.PI * 2 * turns;
      const r = r0 + (r1 - r0) * t;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  };
  switch (id) {
    case 'whirl':
      stroke(red, spiral(30, 6, 30, 1.6), { width: 7, pig: VERMILION, load: 1, dry: 0.35, seed: s, taperStart: 0.05, taperEnd: 0.4 });
      stroke(p, [[-30, -30], [-14, -12]], { width: 6, load: 1, seed: s + 1, taperEnd: 0.7 });
      break;
    case 'seals':
      for (const [x, y] of [[-14, 10], [14, 14], [0, -14]] as V2[]) {
        washPoly(red, roughen([[x - 9, y - 9], [x + 9, y - 9], [x + 9, y + 9], [x - 9, y + 9]], 1, s + x, 3), { pig: VERMILION, density: 0.95, soft: 0.05, edge: 0.4, seed: s + y });
      }
      stroke(p, [[-30, 30], [-20, 22]], { width: 3, load: 0.6, seed: s + 2 });
      break;
    case 'wave':
      for (let k = 0; k < 3; k++) col('rgba(51,84,148,1)', [[-30, -14 + k * 14], [-12, -6 + k * 14], [6, -16 + k * 14], [28, -6 + k * 14]], 6 - k);
      stroke(p, [[-32, -26], [30, -26]], { width: 3, load: 0.5, dry: 0.6, seed: s + 3 });
      break;
    case 'storm':
      col('rgba(219,168,51,1)', [[6, 32], [-8, 4], [8, 4], [-6, -30]], 7);
      washPoly(p, noisyOutline(0, 30, 28, 10, 0.2, s + 4), { pig: INK, density: 0.45, soft: 0.2, seed: s + 4 });
      break;
    case 'mend':
      col('rgba(77,153,107,1)', [[0, -28], [-18, 0], [0, 26], [18, 0], [0, -28]], 6);
      stroke(p, [[0, -20], [0, 18]], { width: 3, load: 0.7, seed: s + 5 });
      break;
    case 'mist':
      washPoly(p, noisyOutline(-8, 4, 22, 14, 0.25, s + 6), { pig: INK, density: 0.2, soft: 0.7, seed: s + 6 });
      washPoly(p, noisyOutline(12, -6, 18, 11, 0.25, s + 7), { pig: INK, density: 0.18, soft: 0.7, seed: s + 7 });
      stroke(p, spiral(20, 4, 22, 1.2), { width: 3, load: 0.6, dry: 0.5, seed: s + 8 });
      break;
    case 'edge':
      stroke(p, [[-26, -26], [24, 24]], { width: 8, load: 1, dry: 0.3, seed: s, taperStart: 0.05, taperEnd: 0.6 });
      stroke(red, [[-28, -20], [-18, -30]], { width: 5, pig: VERMILION, load: 1, seed: s + 1 });
      break;
    case 'reach':
      stroke(red, [[-32, 0], [30, 0]], { width: 6, pig: VERMILION, load: 1, dry: 0.4, seed: s, taperStart: 0.02, taperEnd: 0.5 });
      stroke(p, [[16, 12], [30, 0], [16, -12]], { width: 4, load: 0.9, seed: s + 1 });
      break;
    case 'redEnso': {
      const ring: V2[] = [];
      for (let k = 0; k <= 30; k++) { const a = (k / 30) * Math.PI * 1.9 + 0.5; ring.push([Math.cos(a) * 26, Math.sin(a) * 26]); }
      stroke(red, ring, { width: 7, pig: VERMILION, load: 1, dry: 0.4, seed: s, taperStart: 0.05, taperEnd: 0.4 });
      break;
    }
    case 'flow':
      stroke(p, [[-20, 28], [-6, 10], [-14, -6], [4, -26]], { width: 5, load: 0.9, seed: s, taperEnd: 0.8 });
      stroke(red, [[10, 20], [18, 0], [12, -18]], { width: 5, pig: VERMILION, load: 1, seed: s + 1, taperEnd: 0.8 });
      break;
    case 'grind':
      washPoly(p, noisyOutline(0, -8, 26, 14, 0.12, s), { pig: INK, density: 0.35, soft: 0.05, edge: 0.8, seed: s });
      stroke(p, [[-6, 4], [16, 30]], { width: 6, load: 1, seed: s + 1 });
      col('rgba(51,84,148,1)', [[-10, -10], [10, -8]], 5);
      break;
    case 'reserve':
      washPoly(p, roughen([[-16, -24], [16, -24], [20, 16], [-20, 16]], 1, s, 4), { pig: INK, density: 0.3, soft: 0.05, edge: 0.8, seed: s });
      col('rgba(219,168,51,1)', [[-12, 6], [12, 6]], 6);
      col('rgba(51,84,148,1)', [[-12, -6], [12, -6]], 6);
      break;
    case 'frost':
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI;
        col('rgba(51,84,148,1)', [[Math.cos(a) * -26, Math.sin(a) * -26], [Math.cos(a) * 26, Math.sin(a) * 26]], 5);
      }
      break;
    case 'chain':
      col('rgba(219,168,51,1)', [[-28, 20], [-10, 0], [0, 12], [14, -8], [28, 4]], 5);
      break;
    case 'breath':
      stroke(p, [[-22, 0], [0, 14], [22, 0]], { width: 5, load: 0.9, seed: s });
      stroke(p, [[-16, -12], [0, -2], [16, -12]], { width: 4, load: 0.7, seed: s + 1 });
      break;
    case 'parry':
      washPoly(p, roughen([[-18, 22], [18, 22], [14, -12], [0, -26], [-14, -12]], 1, s, 4), { pig: INK, density: 0.3, soft: 0.05, edge: 0.9, seed: s });
      break;
    case 'second':
      stroke(red, [[-6, 26], [-6, -26]], { width: 6, pig: VERMILION, load: 1, seed: s });
      stroke(p, [[10, 26], [10, -26]], { width: 6, load: 1, seed: s + 1 });
      break;
    case 'light':
      for (let k = 0; k < 3; k++) stroke(p, [[-28 + k * 8, -10 + k * 10], [10 + k * 8, -10 + k * 10]], { width: 3, load: 0.6, dry: 0.6, seed: s + k, taperStart: 0.6, taperEnd: 0.05 });
      break;
  }
  f = { pig: frameFrom(p), red: frameFrom(red), acc: frameFrom(acc) };
  cache.set(id, f);
  return f;
}
