/** Storm weather: slanted rain around the camera, and lightning that whitens the page. */
import type { World } from './world';
import { Painter } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { stroke } from '../gfx/brush';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { sfx } from '../audio/sfx';
import { Rng } from '../gfx/rng';

let dropFrame: Frame | null = null;

interface Drop { s: Sprite; x: number; y: number; life: number; max: number }

export class Storm {
  private drops: Drop[] = [];
  private rng = new Rng(31);
  private boltT: number;
  private flashT = -1;
  lightning = true;
  constructor(private w: World, count = 140, private slant = -4.5, private fall = -15) {
    if (!dropFrame) {
      const p = new Painter(0.4, 1.2, SPRITE_PPU, -0.2, -0.6);
      p.glaze();
      stroke(p, [[0.12, 0.5], [-0.12, -0.5]], { width: 0.02, load: 0.32, dry: 0.4, seed: 3, body: 0.3, taperStart: 0.4, taperEnd: 0.6, press: 0 });
      dropFrame = frameFrom(p);
    }
    for (let i = 0; i < count; i++) {
      const s = new Sprite(dropFrame, 'glaze');
      s.mesh.renderOrder = LAYER.weather;
      w.r.scenePig.add(s.mesh);
      w.roomSprites.push(s);
      const d: Drop = { s, x: 0, y: 0, life: 0, max: 1 };
      this.respawn(d, true);
      this.drops.push(d);
    }
    this.boltT = this.rng.range(5, 9);
  }

  private respawn(d: Drop, anywhere: boolean): void {
    const vw = this.w.r.viewW + 6, vh = this.w.r.viewH + 6;
    d.x = this.w.camX + this.rng.range(-vw / 2, vw / 2);
    d.y = this.w.camY + (anywhere ? this.rng.range(-vh / 2, vh / 2) : vh / 2);
    d.max = this.rng.range(0.35, 1.0);
    d.life = anywhere ? this.rng.range(0, d.max) : 0;
  }

  update(dt: number): void {
    for (const d of this.drops) {
      d.life += dt;
      d.x += this.slant * dt;
      d.y += this.fall * dt;
      if (d.life > d.max) {
        if (this.rng.chance(0.025)) this.w.vfx.ripple(d.x, d.y, 0.22);
        this.respawn(d, false);
      }
      d.s.setPos(d.x, d.y);
      d.s.opacity = Math.min(1, (d.max - d.life) * 5) * 0.8;
    }
    if (!this.lightning) return;
    this.boltT -= dt;
    if (this.boltT <= 0) {
      this.boltT = this.rng.range(7, 14);
      this.flashT = 0;
      this.w.flash = 1;
      setTimeout(() => sfx.thunder(), 120 + Math.random() * 500);
    }
    if (this.flashT >= 0) {
      this.flashT += dt;
      // a double flicker
      const f = this.flashT < 0.06 ? 1 : this.flashT < 0.12 ? 0.2 : this.flashT < 0.18 ? 0.8 : Math.max(0, 0.8 - (this.flashT - 0.18) * 5);
      this.w.flash = f;
      if (this.flashT > 0.5) this.flashT = -1;
    }
  }
}
