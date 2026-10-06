/** Variants of trees, rocks and bamboo painted once and shared by every chunk. */
import { drawTree, drawBamboo, TreeSpecies } from '../gfx/gen/flora';
import { drawRock } from '../gfx/gen/stone';
import { drawStoneLamp, drawHut, drawPost } from '../gfx/gen/props';
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
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function tree(seed: number, sp: TreeSpecies, scale = 1): PropArt {
  const t = drawTree(seed, sp, scale);
  return { pig: frameFrom(t.painter), radius: t.trunkRadius, crown: t.crown };
}

export async function buildArtCache(mobile: boolean, progress: (t: number) => void): Promise<ArtCache> {
  const n = mobile ? 0.6 : 1;
  const c: ArtCache = { plum: [], willow: [], pine: [], bamboo: [], rock: [], bigRock: [], lamp: [], hut: [], post: [] };
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
  for (let i = 0; i < jobs.length; i++) {
    jobs[i]();
    progress((i + 1) / jobs.length);
    if (i % 2 === 1) await nextFrame();
  }
  return c;
}

export { Painter };
