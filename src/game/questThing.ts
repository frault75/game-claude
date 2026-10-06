/** Something a quest looks for, lying in the world: a kite in a tree, a doll in the reeds, a helmet in the dark. */
import { Entity } from './entity';
import { Sprite, Frame, frameFrom, ySort } from '../gfx/sprite';
import { Painter, INK, VERMILION, PIG_B, mixPig } from '../gfx/paint';
import { washPoly, noisyOutline, roughen } from '../gfx/wash';
import { stroke } from '../gfx/brush';
import { SPRITE_PPU } from '../gfx/gen/flora';

export type ThingId = 'kite' | 'root' | 'gall' | 'spring' | 'helmet' | 'doll' | 'oil' | 'tea' | 'net';

const art = new Map<ThingId, { pig: Frame; red: Frame }>();

function paint(id: ThingId): { pig: Frame; red: Frame } {
  const hit = art.get(id);
  if (hit) return hit;
  const p = new Painter(1.4, 1.6, SPRITE_PPU, -0.7, -0.2);
  const r = new Painter(1.4, 1.6, SPRITE_PPU, -0.7, -0.2);
  p.glaze();
  r.glaze();
  switch (id) {
    case 'kite':
      washPoly(r, roughen([[0, 1.25], [0.38, 0.8], [0, 0.35], [-0.38, 0.8]], 0.01, 1, 0.06), { pig: VERMILION, density: 0.9, soft: 0.05, edge: 0.4, seed: 1 });
      stroke(p, [[0, 1.25], [0, 0.35]], { width: 0.03, load: 0.8, seed: 2 });
      stroke(p, [[-0.38, 0.8], [0.38, 0.8]], { width: 0.03, load: 0.8, seed: 3 });
      stroke(p, [[0, 0.35], [0.12, 0.2], [-0.08, 0.05], [0.1, -0.1]], { width: 0.025, load: 0.7, dry: 0.5, seed: 4 });
      break;
    case 'root':
      stroke(p, [[-0.1, 0.9], [0.05, 0.6], [-0.08, 0.35], [0.1, 0.1]], { width: 0.12, pig: mixPig(INK, PIG_B, 0.2), load: 0.9, dry: 0.4, seed: 5, taperEnd: 0.8 });
      stroke(p, [[0.02, 0.55], [0.25, 0.4], [0.3, 0.2]], { width: 0.06, load: 0.8, seed: 6, taperEnd: 0.8 });
      stroke(r, [[-0.1, 0.9], [0.05, 0.6]], { width: 0.08, pig: VERMILION, load: 0.6, seed: 7 });
      break;
    case 'gall':
      washPoly(p, noisyOutline(0, 0.35, 0.22, 0.2, 0.15, 8), { pig: mixPig(INK, PIG_B, 0.4), density: 0.7, soft: 0.05, edge: 0.6, seed: 8 });
      stroke(p, [[0, 0.55], [0.06, 0.75]], { width: 0.04, load: 0.9, seed: 9 });
      break;
    case 'spring':
      washPoly(p, roughen([[-0.16, 0.05], [0.16, 0.05], [0.2, 0.55], [0.08, 0.7], [0.08, 0.85], [-0.08, 0.85], [-0.08, 0.7], [-0.2, 0.55]], 0.01, 10, 0.05), { pig: mixPig(INK, PIG_B, 0.7), density: 0.55, soft: 0.05, edge: 0.7, seed: 10 });
      stroke(r, [[-0.12, 0.4], [0.12, 0.4]], { width: 0.05, pig: VERMILION, load: 0.9, seed: 11 });
      break;
    case 'helmet':
      washPoly(p, roughen([[-0.38, 0.12], [0.38, 0.12], [0.3, 0.45], [0, 0.62], [-0.3, 0.45]], 0.01, 12, 0.05), { pig: INK, density: 0.75, soft: 0.05, edge: 0.6, seed: 12 });
      stroke(r, [[0.15, 0.6], [0.32, 0.95], [0.42, 1.1]], { width: 0.07, pig: VERMILION, load: 1, seed: 13, taperEnd: 0.9 });
      break;
    case 'doll':
      p.circle(0, 0.72, 0.13, INK, 0.8);
      washPoly(p, roughen([[-0.16, 0.6], [0.16, 0.6], [0.22, 0.12], [-0.22, 0.12]], 0.01, 14, 0.05), { pig: mixPig(INK, PIG_B, 0.5), density: 0.5, soft: 0.05, edge: 0.6, seed: 14 });
      stroke(r, [[-0.18, 0.45], [0.18, 0.45]], { width: 0.05, pig: VERMILION, load: 0.9, seed: 15 });
      break;
    case 'oil':
      washPoly(p, noisyOutline(0, 0.32, 0.24, 0.22, 0.1, 16), { pig: INK, density: 0.6, soft: 0.05, edge: 0.6, seed: 16 });
      stroke(p, [[-0.08, 0.56], [0.08, 0.56]], { width: 0.08, load: 0.9, seed: 17 });
      stroke(r, [[0, 0.62], [0.02, 0.82]], { width: 0.06, pig: VERMILION, load: 1, seed: 18, taperEnd: 0.9 });
      break;
    case 'tea':
      for (let k = 0; k < 7; k++) {
        const a = -1.2 + k * 0.4;
        stroke(p, [[0, 0.1], [Math.cos(a + Math.PI / 2) * 0.35, 0.3 + Math.sin(a + Math.PI / 2) * 0.45]], { width: 0.12, pig: mixPig(INK, PIG_B, 0.2), load: 0.85, seed: 20 + k, taperStart: 0.2, taperEnd: 0.9 });
      }
      stroke(r, [[0.05, 0.62], [0.12, 0.7]], { width: 0.06, pig: VERMILION, load: 0.9, seed: 29 });
      break;
    case 'net':
      for (let k = 0; k < 5; k++) {
        stroke(p, [[-0.4 + k * 0.2, 0.05], [-0.3 + k * 0.15, 0.75]], { width: 0.025, load: 0.8, seed: 30 + k });
        stroke(p, [[-0.42, 0.12 + k * 0.15], [0.42, 0.18 + k * 0.13]], { width: 0.025, load: 0.8, seed: 40 + k });
      }
      p.circle(0.35, 0.75, 0.06, INK, 0.9);
      stroke(r, [[-0.42, 0.78], [-0.2, 0.86]], { width: 0.05, pig: VERMILION, load: 0.9, seed: 49 });
      break;
  }
  const f = { pig: frameFrom(p), red: frameFrom(r) };
  art.set(id, f);
  return f;
}

export class QuestThing extends Entity {
  private t = Math.random() * 3;
  private taken = false;
  onTake?: (id: ThingId) => void;

  constructor(readonly thing: ThingId, x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    this.radius = 0.4;
    this.label = 'questThing';
  }

  init(): void {
    const f = paint(this.thing);
    this.addSprite(new Sprite(f.pig));
    this.addSprite(new Sprite(f.red), true);
  }

  update(dt: number): void {
    const w = this.world;
    const p = w.player;
    this.t += dt;
    const bob = Math.sin(this.t * 2.2) * 0.08 + 0.15;
    for (const s of this.sprites) {
      s.setPos(this.x, this.y + bob);
      s.mesh.renderOrder = ySort(this.y);
    }
    // a soft shimmer so it can be found
    if (Math.sin(this.t * 3) > 0.4) w.vfx.glowAt(this.x, this.y + 0.5, 1.4, 0.3);
    if (!this.taken && p.state !== 'dead' && Math.hypot(p.x - this.x, p.y - this.y) < 1.1) {
      this.taken = true;
      w.vfx.ripple(this.x, this.y, 0.8);
      this.onTake?.(this.thing);
      this.destroy();
    }
  }
}
