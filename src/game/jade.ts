/** Jade: a stroke grows a hedge of bamboo that stops foes and their ink; a loop heals and roots. */
import { Entity } from './entity';
import type { World } from './world';
import { Sprite, Frame, frameFrom, ySort } from '../gfx/sprite';
import { Painter, INK, PIG_A, mixPig } from '../gfx/paint';
import { stroke } from '../gfx/brush';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { Rng } from '../gfx/rng';

let shootArt: Frame[] | null = null;
function shootFrames(): Frame[] {
  if (shootArt) return shootArt;
  shootArt = [0, 1, 2].map((v) => {
    const p = new Painter(1.4, 2.6, SPRITE_PPU, -0.7, -0.2);
    const r = new Rng(6101 + v);
    p.glaze();
    const green = mixPig(INK, PIG_A, 0.55);
    for (let k = 0; k < 2; k++) {
      const x = (k - 0.5) * 0.22 + r.gauss() * 0.03, h = 1.6 + r.range(0, 0.6) - k * 0.3;
      stroke(p, [[x, 0], [x + r.gauss() * 0.05, h]], { width: 0.1, pig: green, load: 0.95, dry: 0.3, seed: r.int(1, 1e6), taperStart: 0.02, taperEnd: 0.3 });
      for (let n = 0.4; n < h; n += 0.42) stroke(p, [[x - 0.07, n], [x + 0.07, n + 0.01]], { width: 0.04, load: 1, seed: r.int(1, 1e6) });
      for (let l = 0; l < 2; l++) {
        const ly = h * r.range(0.55, 0.95), dir = l % 2 ? 1 : -1;
        stroke(p, [[x, ly], [x + dir * 0.25, ly + 0.05], [x + dir * 0.45, ly - 0.06]], { width: 0.08, pig: green, load: 0.9, seed: r.int(1, 1e6), taperStart: 0.3, taperEnd: 0.9 });
      }
    }
    return frameFrom(p);
  });
  return shootArt;
}

let nextId = 0;

/** One clump of jade bamboo: solid while it stands, then it withers. */
export class BambooShoot extends Entity {
  private s!: Sprite;
  private t = 0;
  private tag: string;
  constructor(x: number, y: number, private life: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.32;
    this.label = 'bamboo';
    this.tag = 'jade' + nextId++;
  }
  init(w: World): void {
    const f = shootFrames();
    this.s = this.addSprite(new Sprite(f[Math.floor(Math.random() * f.length)]));
    this.s.setPos(this.x, this.y);
    this.s.mesh.renderOrder = ySort(this.y);
    w.addCollider({ kind: 'circle', x: this.x, y: this.y + 0.1, r: 0.34 }, this.tag);
  }
  update(dt: number): void {
    this.t += dt;
    const grow = Math.min(1, this.t / 0.18);
    const wither = Math.max(0, Math.min(1, (this.life - this.t) / 0.5));
    this.s.mesh.scale.set(0.6 + grow * 0.4, grow, 1);
    this.s.opacity = wither;
    if (this.t >= this.life) this.destroy();
  }
  dispose(): void {
    this.world.removeColliders(this.tag);
    super.dispose();
  }
}
