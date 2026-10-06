/**
 * Dialogue on a sheet of paper at the bottom of the screen: a portrait, a name with its seal,
 * the words brushed in. Tap, click or press a key to read on.
 */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { Painter, INK, VERMILION } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { roughen, washPoly } from '../gfx/wash';
import { stroke } from '../gfx/brush';
import { brushText } from '../gfx/text';
import { sfx } from '../audio/sfx';
import { maskSprite } from './mask';

export interface Speaker {
  name: string;
  /** Portrait frames (pigment and vermilion) and how much to enlarge them. */
  pig?: Frame;
  red?: Frame;
  scale?: number;
}

export class Dialog {
  private panel: Sprite | null = null;
  private panelRed: Sprite | null = null;
  private panelW = 0;
  private panelH = 0;
  private mask: Sprite;
  private name: Sprite | null = null;
  private body: Sprite | null = null;
  private portrait: Sprite | null = null;
  private portraitRed: Sprite | null = null;
  private more: Sprite;
  private pages: string[] = [];
  private page = 0;
  private t = 0;
  private revealDur = 1;
  private onClose?: () => void;
  private nameW = 0;
  private bodyW = 0;
  private bodyH = 0;
  private vis = 0;
  active = false;

  constructor(private r: Renderer, private input: Input) {
    this.mask = maskSprite(r, 1, 1);
    this.mask.opacity = 0;
    const m = new Painter(60, 40, 1.5, -30, -20);
    m.glaze();
    stroke(m, [[-16, 10], [4, 0], [-16, -10]], { width: 6, pig: VERMILION, load: 1, dry: 0.3, seed: 5, taperStart: 0.05, taperEnd: 0.3 });
    this.more = new Sprite(frameFrom(m));
    this.more.mesh.renderOrder = LAYER.ui + 22;
    this.more.opacity = 0;
    r.uiRed.add(this.more.mesh);
  }

  private buildPanel(): void {
    const w = Math.min(1500, this.r.uiW - 50);
    const h = this.r.uiH < 800 ? 250 : 290;
    if (this.panel && w === this.panelW && h === this.panelH) return;
    this.panel?.dispose();
    this.panelRed?.dispose();
    this.panelW = w;
    this.panelH = h;
    const p = new Painter(w + 40, h + 40, 0.75, -(w + 40) / 2, -(h + 40) / 2);
    const edge = roughen([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], 7, 41, 18);
    p.reserve(() => edge.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 0.96);
    p.glaze();
    washPoly(p, edge, { pig: INK, density: 0.035, soft: 0.6, seed: 42 });
    stroke(p, [[-w / 2 + 10, h / 2 - 6], [0, h / 2 - 2], [w / 2 - 10, h / 2 - 8]], { width: 7, load: 0.85, dry: 0.55, seed: 43, taperStart: 0.03, taperEnd: 0.15 });
    stroke(p, [[-w / 2 + 30, -h / 2 + 8], [w / 2 - 20, -h / 2 + 4]], { width: 4, load: 0.5, dry: 0.7, seed: 44, taperStart: 0.1, taperEnd: 0.3 });
    this.panel = new Sprite(frameFrom(p));
    this.panel.mesh.renderOrder = LAYER.ui + 20;
    this.r.uiPig.add(this.panel.mesh);
    // the speaker's seal, top-left
    const s = new Painter(70, 70, 1, -35, -35);
    s.glaze();
    washPoly(s, roughen([[-22, -22], [22, -22], [22, 22], [-22, 22]], 3, 45, 6), { pig: VERMILION, density: 0.9, soft: 0.05, edge: 0.4, seed: 45 });
    this.panelRed = new Sprite(frameFrom(s));
    this.panelRed.mesh.renderOrder = LAYER.ui + 21;
    this.r.uiRed.add(this.panelRed.mesh);
    this.mask.dispose();
    this.mask = maskSprite(this.r, w + 120, h + 120);
  }

  open(speaker: Speaker, pages: string[], onClose?: () => void): void {
    if (!pages.length) { onClose?.(); return; }
    this.close(false);
    this.buildPanel();
    this.pages = pages;
    this.page = 0;
    this.onClose = onClose;
    this.active = true;
    const na = brushText(speaker.name, { size: 36, ppu: 1.5, weight: 700 });
    this.nameW = na.w;
    this.name = new Sprite(na);
    this.name.mesh.renderOrder = LAYER.ui + 22;
    this.r.uiPig.add(this.name.mesh);
    if (speaker.pig) {
      const k = speaker.scale ?? 105;
      this.portrait = new Sprite(speaker.pig);
      this.portrait.mesh.scale.set(k, k, 1);
      this.portrait.mesh.renderOrder = LAYER.ui + 22;
      this.r.uiPig.add(this.portrait.mesh);
      if (speaker.red) {
        this.portraitRed = new Sprite(speaker.red);
        this.portraitRed.mesh.scale.set(k, k, 1);
        this.portraitRed.mesh.renderOrder = LAYER.ui + 22;
        this.r.uiRed.add(this.portraitRed.mesh);
      }
    }
    this.showPage();
    this.input.swallow();
    sfx.ui();
  }

  private textLeft(): number {
    return -this.panelW / 2 + (this.portrait ? 250 : 60);
  }

  private showPage(): void {
    this.body?.dispose();
    const txt = this.pages[this.page];
    const maxW = this.panelW / 2 - 50 - this.textLeft();
    const art = brushText(txt, { size: this.r.uiH < 800 ? 30 : 31, ppu: 1.5, align: 'left', maxWidth: maxW, lineHeight: 1.3 });
    this.bodyW = art.w;
    this.bodyH = art.h;
    this.body = new Sprite(art);
    this.body.mesh.renderOrder = LAYER.ui + 22;
    this.body.reveal = 0;
    this.r.uiPig.add(this.body.mesh);
    this.t = 0;
    this.revealDur = 0.25 + txt.length * 0.012;
  }

  private advance(): void {
    if (this.t < this.revealDur) {
      this.t = this.revealDur;
      return;
    }
    this.page++;
    sfx.ui();
    if (this.page >= this.pages.length) this.close(true);
    else this.showPage();
  }

  close(fire: boolean): void {
    if (!this.active) return;
    this.active = false;
    this.name?.dispose();
    this.body?.dispose();
    this.portrait?.dispose();
    this.portraitRed?.dispose();
    this.name = this.body = this.portrait = this.portraitRed = null;
    this.input.swallow();
    const cb = this.onClose;
    this.onClose = undefined;
    if (fire) cb?.();
  }

  update(dt: number): void {
    const inp = this.input;
    this.vis += ((this.active ? 1 : 0) - this.vis) * Math.min(1, dt * 12);
    if (this.active) {
      this.t += dt;
      if (inp.pressed('confirm') || inp.pressed('interact') || inp.pressed('dodge') || inp.pressed('attack') || inp.pressed('back')) {
        this.advance();
        inp.swallow();
      }
    }
    const r = this.r;
    const cy = -r.uiH / 2 + this.panelH / 2 + 24;
    const top = cy + this.panelH / 2;
    const show = this.vis;
    if (this.panel) {
      this.panel.setPos(0, cy);
      this.panel.opacity = show;
      this.panelRed!.setPos(-this.panelW / 2 + 52, top - 44);
      this.panelRed!.opacity = show * (this.active ? 1 : 0);
    }
    this.mask.setPos(0, cy);
    this.mask.opacity = show;
    if (this.name) this.name.setPos(-this.panelW / 2 + 98 + this.nameW / 2, top - 44);
    if (this.portrait) {
      const y = cy - this.panelH / 2 + 34;
      this.portrait.setPos(-this.panelW / 2 + 140, y);
      this.portraitRed?.setPos(-this.panelW / 2 + 140, y);
    }
    if (this.body) {
      this.body.setPos(this.textLeft() + this.bodyW / 2 - 12, top - 92 - this.bodyH / 2 + 20);
      this.body.reveal = this.t >= this.revealDur ? 1.5 : Math.min(1.5, this.t / this.revealDur);
    }
    const done = this.active && this.t >= this.revealDur;
    this.more.setPos(this.panelW / 2 - 50 + Math.sin(this.t * 5) * 5, cy - this.panelH / 2 + 34);
    this.more.opacity = done ? show : 0;
  }
}
