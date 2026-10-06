/** Ink creatures: smudges with paper-white eyes where the ink did not take. Never red. */
import { Painter, INK, PIG_B, mixPig } from '../paint';
import { stroke } from '../brush';
import { washPoly, noisyOutline } from '../wash';
import { Frame, frameFrom } from '../sprite';
import { Rng } from '../rng';
import { SPRITE_PPU } from './flora';

/** Blot frames: [boil0, boil1, boil2, gather, lunge]. */
export function buildBlotFrames(seed: number, size = 1): Frame[] {
  const frames: Frame[] = [];
  const shapes: { sx: number; sy: number; dark: number; lean: number }[] = [
    { sx: 1, sy: 1, dark: 0, lean: 0 },
    { sx: 1.04, sy: 0.96, dark: 0, lean: 0.02 },
    { sx: 0.97, sy: 1.03, dark: 0, lean: -0.02 },
    { sx: 1.25, sy: 0.7, dark: 0.25, lean: 0 },
    { sx: 0.8, sy: 1.25, dark: 0.1, lean: 0 },
  ];
  shapes.forEach((sh, i) => {
    const W = 2.2 * size, H = 2.2 * size;
    const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.5 * size);
    const r = new Rng(seed + i * 31);
    const rx = 0.5 * size * sh.sx, ry = 0.42 * size * sh.sy;
    const cy = ry * 0.95;
    const body = noisyOutline(sh.lean, cy, rx, ry, 0.32, seed + i * 7);
    p.reserve(() => body.forEach((q, k) => (k === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 0.95);
    p.glaze();
    washPoly(p, body, { pig: INK, density: 0.62 + sh.dark, soft: 0.05, edge: 0.9, seed: seed + i, blooms: 1 });
    washPoly(p, noisyOutline(sh.lean - rx * 0.2, cy + ry * 0.2, rx * 0.5, ry * 0.4, 0.4, seed + i + 3), { pig: INK, density: 0.25, soft: 0.6, seed: seed + i + 3 });
    // bleeding tendrils at the base
    for (let k = 0; k < 5; k++) {
      const x = r.range(-rx, rx);
      stroke(p, [[x, 0.08], [x + r.gauss() * 0.15, -0.1], [x + r.gauss() * 0.25, -0.25 * size]], {
        width: 0.08 * size, load: 0.7, dry: 0.7, taperStart: 0.05, taperEnd: 0.9, seed: r.int(1, 1e6), body: 0.4,
      });
    }
    // eyes: unpainted paper
    p.lift();
    const ey = cy + ry * 0.15;
    for (const ex of [-0.15, 0.15]) {
      p.ctx.fillStyle = 'rgba(0,0,0,1)';
      p.ctx.beginPath();
      p.ctx.ellipse(sh.lean + ex * size * sh.sx, ey, 0.07 * size, (i === 3 ? 0.04 : 0.085) * size, 0, 0, Math.PI * 2);
      p.ctx.fill();
    }
    p.over();
    // keep coverage behind the eyes so they read as paper, not holes
    p.ctx.fillStyle = 'rgba(0,0,0,1)';
    for (const ex of [-0.15, 0.15]) {
      p.ctx.beginPath();
      p.ctx.ellipse(sh.lean + ex * size * sh.sx, ey, 0.07 * size, (i === 3 ? 0.04 : 0.085) * size, 0, 0, Math.PI * 2);
      p.ctx.fill();
    }
    frames.push(frameFrom(p));
  });
  return frames;
}

/** Ink wisp: a curl of smoke with a bright paper core. */
export function buildWispFrames(seed: number): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < 4; i++) {
    const W = 1.8, H = 2.2;
    const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.4);
    p.glaze();
    const r = new Rng(seed + i * 13);
    const body = noisyOutline(0, 0.75, 0.32, 0.36, 0.3, seed + i * 5);
    washPoly(p, body, { pig: mixPig(INK, PIG_B, 0.2), density: 0.5, soft: 0.25, edge: 0.8, seed: seed + i });
    // trailing curl
    const ph = i * 0.6;
    stroke(p, [[0, 0.45], [0.18 * Math.sin(ph), 0.2], [-0.15 * Math.sin(ph + 1), 0.0], [0.1 * Math.sin(ph + 2), -0.2]], {
      width: 0.18, load: 0.6, dry: 0.6, taperStart: 0.05, taperEnd: 0.95, seed: r.int(1, 1e6), body: 0.5,
    });
    p.lift();
    p.ctx.fillStyle = 'rgba(0,0,0,1)';
    p.ctx.beginPath();
    p.ctx.ellipse(0, 0.8, 0.09, 0.11, 0, 0, Math.PI * 2);
    p.ctx.fill();
    p.over();
    p.ctx.fillStyle = 'rgba(0,0,0,1)';
    p.ctx.beginPath();
    p.ctx.ellipse(0, 0.8, 0.09, 0.11, 0, 0, Math.PI * 2);
    p.ctx.fill();
    frames.push(frameFrom(p));
  }
  return frames;
}

export function buildInkDropFrames(seed: number): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < 2; i++) {
    const p = new Painter(0.8, 0.8, SPRITE_PPU, -0.4, -0.4);
    p.glaze();
    washPoly(p, noisyOutline(0, 0, 0.17, 0.15, 0.25, seed + i), { pig: INK, density: 0.85, soft: 0.05, edge: 0.6, seed: seed + i });
    stroke(p, [[0.12, 0.02], [0.3, 0.05]], { width: 0.08, load: 0.5, dry: 0.8, seed: seed + 9 + i, taperEnd: 0.9, body: 0.2 });
    frames.push(frameFrom(p));
  }
  return frames;
}

/** Brute (ram): a heavy blot with curled horns. Frames: [idle0, idle1, crouch, charge, stunned]. Faces +x. */
export function buildBruteFrames(seed: number): Frame[] {
  const frames: Frame[] = [];
  const poses = [
    { sx: 1, sy: 1, lean: 0, dizzy: false },
    { sx: 1.03, sy: 0.97, lean: 0.03, dizzy: false },
    { sx: 1.15, sy: 0.82, lean: -0.12, dizzy: false },
    { sx: 1.3, sy: 0.85, lean: 0.25, dizzy: false },
    { sx: 1.05, sy: 0.92, lean: 0, dizzy: true },
  ];
  poses.forEach((ps, i) => {
    const W = 3.6, H = 3.0;
    const p = new Painter(W, H, SPRITE_PPU, -W / 2, -0.6);
    const r = new Rng(seed + i * 17);
    const rx = 0.85 * ps.sx, ry = 0.7 * ps.sy;
    const cy = ry * 0.95;
    const body = noisyOutline(ps.lean, cy, rx, ry, 0.22, seed + i);
    p.reserve(() => body.forEach((q, k) => (k === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
    p.glaze();
    washPoly(p, body, { pig: INK, density: 0.75, soft: 0.05, edge: 0.9, seed: seed + i, blooms: 1 });
    washPoly(p, noisyOutline(ps.lean - 0.25, cy + 0.25, rx * 0.45, ry * 0.35, 0.3, seed + i + 2), { pig: INK, density: 0.3, soft: 0.6, seed: seed + i + 2 });
    // legs
    for (const lx of [-0.45, -0.15, 0.2, 0.5]) {
      stroke(p, [[lx * ps.sx + ps.lean * 0.5, 0.2], [lx * ps.sx + ps.lean * 0.3 + r.gauss() * 0.04, -0.12]], { width: 0.13, load: 1, dry: 0.4, seed: r.int(1, 1e6), taperEnd: 0.4 });
    }
    // curled horns on the facing side
    const hx = ps.lean + rx * 0.55, hy = cy + ry * 0.55;
    for (const off of [0, -0.22]) {
      const pts: [number, number][] = [];
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI * 0.9 - k * 0.42;
        const rr = 0.36 - k * 0.022;
        pts.push([hx + off + Math.cos(a) * rr + 0.25, hy + Math.sin(a) * rr * 0.9]);
      }
      stroke(p, pts, { width: 0.14, load: 1, dry: 0.45, seed: r.int(1, 1e6), taperStart: 0.05, taperEnd: 0.7 });
    }
    // eyes: paper showing through (spirals when dizzy)
    const ey = cy + ry * 0.2, ex = ps.lean + rx * 0.45;
    if (ps.dizzy) {
      p.over();
      p.ctx.fillStyle = 'rgba(0,0,0,1)';
      p.ctx.beginPath(); p.ctx.arc(ex, ey, 0.13, 0, Math.PI * 2); p.ctx.fill();
      p.glaze();
      const sp: [number, number][] = [];
      for (let k = 0; k < 14; k++) { const a = k * 0.8; sp.push([ex + Math.cos(a) * k * 0.009, ey + Math.sin(a) * k * 0.009]); }
      stroke(p, sp, { width: 0.025, load: 1, seed: 5, body: 0.5 });
    } else {
      p.over();
      p.ctx.fillStyle = 'rgba(0,0,0,1)';
      p.ctx.beginPath(); p.ctx.ellipse(ex, ey, 0.11, i === 2 || i === 3 ? 0.05 : 0.09, 0, 0, Math.PI * 2); p.ctx.fill();
      p.glaze();
    }
    frames.push(frameFrom(p));
  });
  return frames;
}

/** Swarm mite: a small flying fleck of ink. Frames: [a, b]. */
export function buildMiteFrames(seed: number): Frame[] {
  const frames: Frame[] = [];
  for (let i = 0; i < 2; i++) {
    const p = new Painter(1, 1, SPRITE_PPU, -0.5, -0.3);
    p.glaze();
    washPoly(p, noisyOutline(0, 0.2, 0.14, 0.12, 0.3, seed + i), { pig: INK, density: 0.85, soft: 0.05, edge: 0.6, seed: seed + i });
    const up = i === 0 ? 0.18 : -0.05;
    stroke(p, [[-0.05, 0.25], [-0.3, 0.25 + up]], { width: 0.06, load: 0.7, dry: 0.6, seed: seed + 3 + i, taperEnd: 0.9 });
    stroke(p, [[0.05, 0.25], [0.3, 0.25 + up]], { width: 0.06, load: 0.7, dry: 0.6, seed: seed + 5 + i, taperEnd: 0.9 });
    p.over();
    p.ctx.fillStyle = 'rgba(0,0,0,1)';
    p.ctx.beginPath(); p.ctx.arc(0.04, 0.22, 0.035, 0, Math.PI * 2); p.ctx.fill();
    frames.push(frameFrom(p));
  }
  return frames;
}
