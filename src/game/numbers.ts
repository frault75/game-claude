/** Floating calligraphic numbers (damage, experience, level up). */
import type { Renderer } from '../core/renderer';
import { Sprite, Frame, LAYER } from '../gfx/sprite';
import { brushText } from '../gfx/text';
import { Pig, INK, VERMILION } from '../gfx/paint';

interface Num { s: Sprite; t: number; life: number; vy: number; x: number; y: number; scale: number }

export class Numbers {
  private cache = new Map<string, Frame>();
  private live: Num[] = [];
  constructor(private r: Renderer) {}

  private frame(text: string, red: boolean, size: number): Frame {
    const k = text + (red ? 'r' : 'k') + size;
    let f = this.cache.get(k);
    if (!f) {
      const pig: Pig = red ? VERMILION : INK;
      f = brushText(text, { size, ppu: 96, italic: true, weight: 700, pig, seed: text.length });
      this.cache.set(k, f);
      if (this.cache.size > 400) this.cache.clear();
    }
    return f;
  }

  /** red = drawn in the vermilion layer. */
  pop(x: number, y: number, text: string, opts: { red?: boolean; size?: number; life?: number; big?: boolean } = {}): void {
    const red = !!opts.red;
    const f = this.frame(text, red, opts.size ?? 0.42);
    const s = new Sprite(f);
    s.mesh.renderOrder = LAYER.canopy + 60;
    (red ? this.r.sceneRed : this.r.scenePig).add(s.mesh);
    const n: Num = { s, t: 0, life: opts.life ?? 0.8, vy: opts.big ? 0.8 : 1.6, x: x + (Math.random() - 0.5) * 0.4, y, scale: opts.big ? 1.6 : 1 };
    this.live.push(n);
  }

  update(dt: number): void {
    for (const n of this.live) {
      n.t += dt;
      n.y += n.vy * dt;
      n.vy *= Math.max(0, 1 - dt * 2.5);
      const k = n.t / n.life;
      const pop = n.t < 0.08 ? 1 + (0.08 - n.t) * 6 : 1;
      n.s.setPos(n.x, n.y);
      n.s.mesh.scale.set(n.scale * pop, n.scale * pop, 1);
      n.s.opacity = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
    }
    for (const n of this.live) if (n.t >= n.life) n.s.dispose();
    this.live = this.live.filter((n) => n.t < n.life);
  }

  clear(): void {
    for (const n of this.live) n.s.dispose();
    this.live = [];
  }
}
