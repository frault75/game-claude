/** Soft invisible shapes that keep dungeon darkness off parts of the HUD. */
import type { Renderer } from '../core/renderer';
import { Sprite, Frame, frameFrom, makeTexture, LAYER } from '../gfx/sprite';
import { Painter } from '../gfx/paint';
import { washPoly, noisyOutline } from '../gfx/wash';

const papers = new Map<string, Frame>();
let paperSeed = 1;

/** A torn sheet of paper (hides what lies beneath), for text in the dark. */
function paperSprite(r: Renderer, w: number, h: number): Sprite {
  const key = `${Math.round(w / 40)}x${Math.round(h / 40)}`;
  let f = papers.get(key);
  if (!f) {
    const p = new Painter(w, h, 0.3, -w / 2, -h / 2);
    p.over();
    washPoly(p, noisyOutline(0, 0, w * 0.44, h * 0.38, 0.2, 300 + paperSeed++), { pig: {}, density: 0.97, soft: 0.65 });
    f = frameFrom(p);
    papers.set(key, f);
  }
  const s = new Sprite(f);
  s.mesh.renderOrder = LAYER.ui - 1;
  r.uiPig.add(s.mesh);
  return s;
}

const cache = new Map<string, HTMLCanvasElement>();

/** A soft rounded patch of `w` × `h` UI units, added to the renderer's UI mask. */
export function maskSprite(r: Renderer, w: number, h: number, scene: 'mask' | 'paper' = 'mask'): Sprite {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  let c = cache.get(key);
  if (!c) {
    const pw = Math.max(4, Math.round(w / 8)), ph = Math.max(4, Math.round(h / 8));
    c = document.createElement('canvas');
    c.width = pw;
    c.height = ph;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(pw, ph);
    const fx = Math.min(0.45, 14 / pw), fy = Math.min(0.45, 14 / ph);
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const u = (x + 0.5) / pw, v = (y + 0.5) / ph;
        const ex = Math.min(u, 1 - u) / fx, ey = Math.min(v, 1 - v) / fy;
        const a = Math.max(0, Math.min(1, ex)) * Math.max(0, Math.min(1, ey));
        const k = (y * pw + x) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 0;
        img.data[k + 3] = Math.round(255 * a * a * (3 - 2 * a));
      }
    }
    ctx.putImageData(img, 0, 0);
    cache.set(key, c);
  }
  if (scene === 'paper') return paperSprite(r, w, h);
  const s = new Sprite({ tex: makeTexture(c, false), w, h, ox: -w / 2, oy: -h / 2 });
  (s as unknown as { owned: boolean }).owned = true;
  s.mesh.renderOrder = LAYER.ui - 1;
  // 'paper' hides what lies beneath (a soft sheet behind the HUD in dark places)
  (scene === 'mask' ? r.uiMask : r.uiPig).add(s.mesh);
  return s;
}
