/**
 * A blank page, after the end: a place the master's hand had wiped too much, which the world kept
 * empty for the child. Draw a loop round it and something of the child's own grows on it.
 */
import { Entity } from './entity';
import type { World } from './world';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../gfx/sprite';
import { Painter, INK, PIG_A, PIG_B, VERMILION, mixPig } from '../gfx/paint';
import { stroke, V2 } from '../gfx/brush';
import { washPoly, roughen } from '../gfx/wash';
import { shadow } from '../gfx/gen/ground';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { Rng } from '../gfx/rng';
import { pointInPoly } from './physics';
import { sfx } from '../audio/sfx';

let sheetArt: Frame | null = null;
const motifArt = new Map<number, { pig: Frame; red: Frame }>();

function sheet(): Frame {
  if (sheetArt) return sheetArt;
  const p = new Painter(2.6, 1.9, SPRITE_PPU, -1.3, -0.5);
  p.glaze();
  shadow(p, 0.05, 0.2, 1.2, 0.35, 0.25);
  const o = roughen([[-1.05, 0], [1.05, 0.05], [1.0, 1.2], [-1.0, 1.15]], 0.025, 7101, 0.12);
  p.reserve(() => { o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))); p.ctx.closePath(); }, 1);
  p.glaze();
  stroke(p, [...o, o[0]], { width: 0.03, pig: mixPig(INK, PIG_B, 0.4), load: 0.6, dry: 0.5, seed: 7102, press: 0, taperStart: 0.02, taperEnd: 0.02 });
  // a corner turned up
  stroke(p, [[0.75, 1.15], [0.95, 0.95], [1.0, 1.2]], { width: 0.025, pig: mixPig(INK, PIG_B, 0.4), load: 0.6, seed: 7103, press: 0 });
  sheetArt = frameFrom(p);
  return sheetArt;
}

/** What grows on each page: a plum branch, a crane, bamboo, a pine. */
function motif(i: number): { pig: Frame; red: Frame } {
  const hit = motifArt.get(i);
  if (hit) return hit;
  const p = new Painter(2.6, 1.9, SPRITE_PPU, -1.3, -0.5);
  const q = new Painter(2.6, 1.9, SPRITE_PPU, -1.3, -0.5);
  p.glaze(); q.glaze();
  const r = new Rng(7200 + i);
  if (i === 0) {
    const br: V2[] = [[-0.85, 0.15], [-0.3, 0.45], [0.2, 0.55], [0.75, 0.95]];
    stroke(p, br, { width: 0.07, load: 0.95, dry: 0.4, seed: 7201, taperEnd: 0.6 });
    stroke(p, [[-0.3, 0.45], [-0.15, 0.85]], { width: 0.04, load: 0.9, seed: 7202, taperEnd: 0.8 });
    for (let k = 0; k < 7; k++) q.circle(r.range(-0.6, 0.7), r.range(0.4, 1.0), r.range(0.05, 0.08), VERMILION, 0.85);
  } else if (i === 1) {
    stroke(p, [[-0.8, 0.6], [-0.2, 0.85], [0.3, 0.7]], { width: 0.05, load: 0.9, seed: 7211, taperEnd: 0.5 });
    stroke(p, [[-0.2, 0.82], [-0.5, 1.1], [-0.9, 1.12]], { width: 0.04, load: 0.8, seed: 7212, taperEnd: 0.9 });
    stroke(p, [[-0.1, 0.8], [0.3, 1.1], [0.8, 1.05]], { width: 0.04, load: 0.8, seed: 7213, taperEnd: 0.9 });
    stroke(p, [[0.3, 0.7], [0.55, 0.62], [0.7, 0.6]], { width: 0.02, load: 0.9, seed: 7214 });
    q.circle(0.32, 0.76, 0.04, VERMILION, 1);
  } else if (i === 2) {
    const green = mixPig(INK, PIG_A, 0.55);
    for (let k = 0; k < 3; k++) {
      const x = -0.5 + k * 0.45;
      stroke(p, [[x, 0.1], [x + 0.03, 1.1 - k * 0.15]], { width: 0.06, pig: green, load: 0.95, seed: 7221 + k });
      for (let n = 0.35; n < 1.0; n += 0.3) stroke(p, [[x - 0.04, n], [x + 0.04, n]], { width: 0.03, load: 1, seed: 7225 + k });
      stroke(p, [[x, 0.9 - k * 0.1], [x + 0.25, 0.95 - k * 0.1], [x + 0.4, 0.88 - k * 0.1]], { width: 0.05, pig: green, load: 0.9, seed: 7230 + k, taperStart: 0.3, taperEnd: 0.9 });
    }
  } else {
    stroke(p, [[0, 0.1], [0.05, 0.6], [-0.05, 1.0]], { width: 0.08, load: 0.95, dry: 0.4, seed: 7241 });
    for (const [y, w] of [[0.55, 0.8], [0.8, 0.6], [1.05, 0.4]]) {
      washPoly(p, roughen([[-w, y], [w, y + 0.05], [w * 0.6, y + 0.18], [-w * 0.6, y + 0.15]], 0.03, 7242 + y * 10, 0.08), { pig: mixPig(INK, PIG_A, 0.4), density: 0.4, soft: 0.3, seed: 7245 + Math.round(y * 10) });
    }
    q.circle(0.6, 1.1, 0.07, VERMILION, 0.9);
  }
  const f = { pig: frameFrom(p), red: frameFrom(q) };
  motifArt.set(i, f);
  return f;
}

export class BlankPage extends Entity {
  onDone?: () => void;
  private paint!: Sprite;
  private paintRed!: Sprite;
  private t = -1;
  constructor(readonly index: number, x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.label = 'page';
    this.onLoop = (poly) => {
      if (this.t >= 0 || !pointInPoly(this.x, this.y + 0.5, poly)) return;
      this.t = 0;
      sfx.uiConfirm();
      sfx.trait(3);
      this.world.vfx.ripple(this.x, this.y + 0.5, 1.6);
      this.onDone?.();
    };
  }
  /** Already filled on an earlier visit. */
  done(): void {
    this.t = 99;
  }
  init(_w: World): void {
    const s = this.addSprite(new Sprite(sheet()));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = LAYER.shadow + 1;
    const m = motif(this.index);
    this.paint = this.addSprite(new Sprite(m.pig));
    this.paintRed = this.addSprite(new Sprite(m.red), true);
    const shown = this.t >= 0;
    for (const sp of [this.paint, this.paintRed]) { sp.setPos(this.x, this.y); sp.mesh.renderOrder = ySort(this.y); sp.reveal = shown ? 1.5 : 0; sp.opacity = shown ? 1 : 0; }
  }
  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    for (const sp of [this.paint, this.paintRed]) { sp.opacity = 1; sp.reveal = Math.min(1.5, this.t * 0.8); }
  }
}
