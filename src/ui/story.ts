/** Brief text: memories, area names, fragments. Brushed in, held, faded. */
import type { Renderer } from '../core/renderer';
import { Sprite, LAYER } from '../gfx/sprite';
import { brushText } from '../gfx/text';
import { maskSprite } from './mask';

interface Line {
  group: number;
  s: Sprite;
  mask: Sprite;
  paper: Sprite;
  t: number;
  revealDur: number;
  hold: number;
  fade: number;
  y: number;
  done: boolean;
}

export class Story {
  private lines: Line[] = [];
  private groups = new Map<number, () => void>();
  private nextGroup = 1;
  /** Paper behind the lines in dark places (0..1). */
  backdrop = 0;
  /** Under an open sheet (menu, bag, tree), story lines wait hidden. */
  hidden = false;
  constructor(private r: Renderer) {}

  /** Show lines together, centered; resolves when they have faded. */
  show(texts: string[], o: { size?: number; y?: number; hold?: number; gap?: number; italic?: boolean; stagger?: number } = {}): Promise<void> {
    const size = o.size ?? 40;
    const gap = o.gap ?? size * 1.6;
    let y = o.y ?? 60;
    // a phone held upright keeps its life, icons, minimap and quest at the top: write below them
    const r = this.r;
    if (r.uiH > r.uiW * 1.2 && y > r.uiH / 2 - 340) y = Math.min(y, r.uiH / 2 - 560);
    const y0 = y + ((texts.length - 1) * gap) / 2;
    const stagger = o.stagger ?? 1.2;
    const group = this.nextGroup++;
    // wait for what is already on screen (but not too long)
    let wait = 0;
    for (const l of this.lines) wait = Math.max(wait, l.revealDur + l.hold + l.fade * 0.6 - l.t);
    wait = Math.min(4, wait);
    texts.forEach((txt, i) => {
      const art = brushText(txt, { size, ppu: 1.5, italic: o.italic ?? true, maxWidth: Math.min(1400, this.r.uiW * 0.9), seed: i + 3 });
      const s = new Sprite(art);
      s.mesh.renderOrder = LAYER.ui + 5;
      s.reveal = 0;
      this.r.uiPig.add(s.mesh);
      const revealDur = 0.35 + txt.length * 0.018;
      const mask = maskSprite(this.r, Math.min(1500, art.w + 160), art.h + 70);
      mask.opacity = 0;
      const paper = maskSprite(this.r, Math.min(1500, art.w + 120), art.h + 40, 'paper');
      paper.opacity = 0;
      const line: Line = { group, s, mask, paper, t: -i * stagger - wait, revealDur, hold: (o.hold ?? 3) + (texts.length - 1 - i) * 0.2, fade: 1.2, y: y0 - i * gap, done: false };
      this.lines.push(line);
    });
    return new Promise((res) => this.groups.set(group, res));
  }

  get busy(): boolean {
    return this.lines.length > 0;
  }

  update(dt: number): void {
    for (const l of this.lines) {
      l.t += dt;
      const t = l.t;
      l.s.setPos(0, l.y);
      l.mask.setPos(0, l.y);
      l.paper.setPos(0, l.y);
      if (t < 0) { l.s.opacity = 0; continue; }
      l.s.opacity = 1;
      l.mask.opacity = 1;
      l.paper.opacity = this.backdrop * 0.9;
      l.s.reveal = Math.min(1.5, t / l.revealDur);
      const after = t - l.revealDur - l.hold;
      if (after > 0) {
        l.s.opacity = l.mask.opacity = Math.max(0, 1 - after / l.fade);
        l.paper.opacity = l.s.opacity * this.backdrop * 0.9;
      }
      if (this.hidden) l.s.opacity = l.mask.opacity = l.paper.opacity = 0;
      if (after > l.fade) { l.done = true; l.s.dispose(); l.mask.dispose(); l.paper.dispose(); }
    }
    this.lines = this.lines.filter((l) => !l.done);
    for (const [g, res] of this.groups) {
      if (!this.lines.some((l) => l.group === g)) {
        this.groups.delete(g);
        res();
      }
    }
  }

  clear(): void {
    for (const l of this.lines) { l.s.dispose(); l.mask.dispose(); l.paper.dispose(); }
    this.lines = [];
    for (const res of this.groups.values()) res();
    this.groups.clear();
  }
}
