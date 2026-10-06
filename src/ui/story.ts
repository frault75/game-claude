/** Brief text: memories, area names, fragments. Brushed in, held, faded. */
import type { Renderer } from '../core/renderer';
import { Sprite, LAYER } from '../gfx/sprite';
import { brushText } from '../gfx/text';

interface Line {
  group: number;
  s: Sprite;
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
  constructor(private r: Renderer) {}

  /** Show lines together, centered; resolves when they have faded. */
  show(texts: string[], o: { size?: number; y?: number; hold?: number; gap?: number; italic?: boolean; stagger?: number } = {}): Promise<void> {
    const size = o.size ?? 40;
    const gap = o.gap ?? size * 1.6;
    const y0 = (o.y ?? 60) + ((texts.length - 1) * gap) / 2;
    const stagger = o.stagger ?? 1.2;
    const group = this.nextGroup++;
    texts.forEach((txt, i) => {
      const art = brushText(txt, { size, ppu: 1.5, italic: o.italic ?? true, maxWidth: 1400, seed: i + 3 });
      const s = new Sprite(art);
      s.mesh.renderOrder = LAYER.ui + 5;
      s.reveal = 0;
      this.r.uiPig.add(s.mesh);
      const revealDur = 0.6 + txt.length * 0.035;
      const line: Line = { group, s, t: -i * stagger, revealDur, hold: (o.hold ?? 3) + (texts.length - 1 - i) * 0.2, fade: 1.2, y: y0 - i * gap, done: false };
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
      if (t < 0) { l.s.opacity = 0; continue; }
      l.s.opacity = 1;
      l.s.reveal = Math.min(1.5, t / l.revealDur);
      const after = t - l.revealDur - l.hold;
      if (after > 0) l.s.opacity = Math.max(0, 1 - after / l.fade);
      if (after > l.fade) { l.done = true; l.s.dispose(); }
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
    for (const l of this.lines) l.s.dispose();
    this.lines = [];
    for (const res of this.groups.values()) res();
    this.groups.clear();
  }
}
