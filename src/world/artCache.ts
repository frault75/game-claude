/** Variants of trees, rocks and bamboo painted once and shared by every chunk. */
import { drawTree, drawBamboo, TreeSpecies } from '../gfx/gen/flora';
import { drawRock } from '../gfx/gen/stone';
import { drawStoneLamp, drawHut, drawPost } from '../gfx/gen/props';
import { drawHouse, drawStall, drawWell, drawFence, drawGate, drawRailing, drawCaveMouth, drawTempleGate, drawPillar, drawRuinWall, drawMountains, drawTorch, drawBrambles } from '../gfx/gen/town';
import { BRIDGE } from './layout';
import { Frame, frameFrom } from '../gfx/sprite';
import { Painter } from '../gfx/paint';

export interface PropArt {
  pig: Frame;
  red?: Frame;
  radius: number;
  crown?: { x: number; y: number; rx: number; ry: number };
}

export interface ArtCache {
  plum: PropArt[];
  willow: PropArt[];
  pine: PropArt[];
  bamboo: PropArt[];
  rock: PropArt[];
  bigRock: PropArt[];
  lamp: PropArt[];
  hut: PropArt[];
  post: PropArt[];
  house: PropArt[];
  stall: Record<'dyer' | 'food' | 'pots', PropArt>;
  well: PropArt;
  fence: PropArt;
  gate: PropArt;
  rail: PropArt;
  cave: PropArt;
  templeGate: PropArt;
  pillar: PropArt;
  broken: PropArt[];
  ruinWall: PropArt[];
  mountains: PropArt[];
  bigWillow: PropArt;
  torch: PropArt;
  brambles: PropArt;
  /** Act III: pines and rocks under snow (the paper left bare on top). */
  snowPine: PropArt[];
  snowRock: PropArt[];
}

/** Snow on a painted tree or rock: lift the ink off the tops, leaving bare paper. */
function snowOn(p: Painter, seed: number, cx: number, cy: number, rx: number, ry: number, n: number): void {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  p.lift();
  for (let k = 0; k < n; k++) {
    const x = cx + (rnd() - 0.5) * rx * 2, y = cy + (rnd() - 0.3) * ry * 1.6;
    const w = rx * (0.25 + rnd() * 0.35), h = 0.08 + rnd() * 0.1;
    p.ctx.fillStyle = `rgba(0,0,0,${(0.75 + rnd() * 0.25).toFixed(2)})`;
    p.ctx.beginPath();
    p.ctx.ellipse(x, y, w, h, (rnd() - 0.5) * 0.3, Math.PI, Math.PI * 2);
    p.ctx.fill();
  }
  p.glaze();
}

function art(a: { pig: Painter; red?: Painter }, radius = 0): PropArt {
  return { pig: frameFrom(a.pig), red: a.red ? frameFrom(a.red) : undefined, radius };
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function tree(seed: number, sp: TreeSpecies, scale = 1): PropArt {
  const t = drawTree(seed, sp, scale);
  return { pig: frameFrom(t.painter), radius: t.trunkRadius, crown: t.crown };
}

export async function buildArtCache(mobile: boolean, progress: (t: number) => void): Promise<ArtCache> {
  const n = mobile ? 0.6 : 1;
  const c = { plum: [], willow: [], pine: [], bamboo: [], rock: [], bigRock: [], lamp: [], hut: [], post: [], house: [], broken: [], ruinWall: [], mountains: [], stall: {}, snowPine: [], snowRock: [] } as unknown as ArtCache;
  const jobs: (() => void)[] = [];
  for (let i = 0; i < Math.round(6 * n); i++) jobs.push(() => c.plum.push(tree(7100 + i, 'plum', 0.9 + (i % 3) * 0.12)));
  for (let i = 0; i < Math.round(3 * n); i++) jobs.push(() => c.willow.push(tree(7200 + i, 'willow')));
  for (let i = 0; i < Math.round(4 * n); i++) jobs.push(() => c.pine.push(tree(7300 + i, 'pine', 1 + (i % 2) * 0.15)));
  for (let i = 0; i < 3; i++) jobs.push(() => {
    const p = drawBamboo(7400 + i);
    c.bamboo.push({ pig: frameFrom(p), radius: 0.45, crown: { x: 0, y: 3, rx: 1.5, ry: 2.5 } });
  });
  for (let i = 0; i < 5; i++) jobs.push(() => c.rock.push({ pig: frameFrom(drawRock(7500 + i, 0.8 + (i % 3) * 0.2)), radius: 0.65 + (i % 3) * 0.15 }));
  for (let i = 0; i < 3; i++) jobs.push(() => c.bigRock.push({ pig: frameFrom(drawRock(7600 + i, 1.7 + i * 0.2, 0.8)), radius: 1.3 + i * 0.15 }));
  jobs.push(() => {
    const a = drawStoneLamp(7700, true);
    c.lamp.push({ pig: frameFrom(a.pig), red: a.red ? frameFrom(a.red) : undefined, radius: 0.4 });
  });
  for (let i = 0; i < 2; i++) jobs.push(() => {
    const a = drawHut(7800 + i);
    c.hut.push({ pig: frameFrom(a.pig), radius: 0.1 });
  });
  jobs.push(() => {
    const a = drawPost(7900, 1.6, false);
    c.post.push({ pig: frameFrom(a.pig), radius: 0.22 });
  });
  for (let i = 0; i < 3; i++) jobs.push(() => c.house.push(art(drawHouse(7950 + i, [1, 0.85, 1.15][i]))));
  jobs.push(() => {
    c.stall.dyer = art(drawStall(8001, 'dyer'));
    c.stall.food = art(drawStall(8002, 'food'));
    c.stall.pots = art(drawStall(8003, 'pots'));
  });
  jobs.push(() => {
    c.well = art(drawWell(8010));
    c.fence = art(drawFence(8011, 3));
    c.gate = art(drawGate(8012, mobile ? 'Saules' : 'Hameau des Saules'));
  });
  jobs.push(() => {
    c.rail = art(drawRailing(8020, BRIDGE.x1 - BRIDGE.x0));
    c.cave = art(drawCaveMouth(8021));
    c.templeGate = art(drawTempleGate(8022));
  });
  jobs.push(() => {
    c.pillar = art(drawPillar(8030, false), 0.45);
    for (let i = 0; i < 5; i++) c.broken.push(art(drawPillar(8031 + i, true), 0.45));
    for (let i = 0; i < 2; i++) c.ruinWall.push(art(drawRuinWall(8040 + i)));
  });
  for (let i = 0; i < 3; i++) jobs.push(() => c.mountains.push(art(drawMountains(8050 + i))));
  jobs.push(() => {
    const t = drawTree(8060, 'willow', 1.45);
    c.bigWillow = { pig: frameFrom(t.painter), radius: t.trunkRadius, crown: t.crown };
    c.torch = art(drawTorch(8061), 0.25);
    c.brambles = art(drawBrambles(8062));
  });
  for (let i = 0; i < Math.round(4 * n); i++) jobs.push(() => {
    const t = drawTree(8100 + i, 'pine', 1 + (i % 2) * 0.2);
    const cr = t.crown ?? { x: 0, y: 3.5, rx: 2, ry: 2 };
    snowOn(t.painter, 8110 + i, cr.x, cr.y, cr.rx, cr.ry, 26);
    c.snowPine.push({ pig: frameFrom(t.painter), radius: t.trunkRadius, crown: t.crown });
  });
  for (let i = 0; i < 3; i++) jobs.push(() => {
    const size = 0.9 + i * 0.35;
    const p = drawRock(8120 + i, size, 0);
    snowOn(p, 8130 + i, 0, 0.75 * size, 0.85 * size, 0.35 * size, 5);
    c.snowRock.push({ pig: frameFrom(p), radius: 0.7 + i * 0.25 });
  });
  for (let i = 0; i < jobs.length; i++) {
    jobs[i]();
    progress((i + 1) / jobs.length);
    if (i % 2 === 1) await nextFrame();
  }
  return c;
}

export { Painter };
