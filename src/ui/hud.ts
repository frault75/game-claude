/** Painted HUD: ink drops for life, vermilion dabs for ink charges, a calligraphic combo. */
import { Renderer } from '../core/renderer';
import { Painter, INK, VERMILION } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { washPoly } from '../gfx/wash';
import { stroke, V2, dot } from '../gfx/brush';
import { brushText } from '../gfx/text';

const UI_PPU = 1.5;

function dropShape(cx: number, cy: number, s: number): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = s * (1 - 0.55 * Math.max(0, Math.sin(a)) ** 3);
    pts.push([cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 1.1 + (Math.sin(a) > 0 ? Math.sin(a) ** 4 * s * 0.9 : 0)]);
  }
  return pts;
}

export class Hud {
  private full: Frame;
  private empty: Frame;
  private drops: Sprite[] = [];
  private shown = 5;
  private splashT: number[] = [0, 0, 0, 0, 0];
  private chargeFull: Frame;
  private chargeEmpty: Frame;
  private charges: Sprite[] = [];
  private chargeBg: Sprite[] = [];
  private chargePop: number[] = [0, 0, 0];
  private chargeShown = 3;
  private hint: Sprite | null = null;
  private hintT = 0;
  private hintDur = 0;
  private bossName: Sprite | null = null;
  private bossBar: Sprite | null = null;
  private bossBarFrame: Frame | null = null;
  bossVis = 0;
  bossFrac = 1;
  private bossNameT = 0;
  private comboS: Sprite;
  private comboBar: Sprite;
  private comboCache = new Map<number, Frame>();
  private comboN = 0;
  private comboPop = 0;
  comboFrac = 0;
  visible = true;

  constructor(private r: Renderer) {
    const pf = new Painter(56, 64, UI_PPU, -28, -28);
    pf.glaze();
    washPoly(pf, dropShape(0, 0, 17), { pig: INK, density: 0.9, soft: 0.05, edge: 0.8, seed: 3 });
    stroke(pf, [[-7, 4], [-5, -6]], { width: 3, load: 0.4, dry: 0.6, seed: 4 });
    this.full = frameFrom(pf);
    const pe = new Painter(56, 64, UI_PPU, -28, -28);
    pe.glaze();
    const o = dropShape(0, 0, 17);
    stroke(pe, o.slice(2, 22), { width: 2.4, load: 0.45, dry: 0.7, seed: 5, taperStart: 0.1, taperEnd: 0.3 });
    this.empty = frameFrom(pe);
    for (let i = 0; i < 5; i++) {
      const s = new Sprite(this.full);
      s.mesh.renderOrder = LAYER.ui;
      r.uiPig.add(s.mesh);
      this.drops.push(s);
    }
    const cf = new Painter(60, 40, UI_PPU, -30, -20);
    cf.glaze();
    stroke(cf, [[-22, 2], [-5, 5], [10, 1], [22, -3]], { width: 15, pig: VERMILION, load: 1, dry: 0.45, seed: 21, taperStart: 0.05, taperEnd: 0.5, press: 0.6 });
    this.chargeFull = frameFrom(cf);
    const ce = new Painter(60, 40, UI_PPU, -30, -20);
    ce.glaze();
    stroke(ce, [[-22, 2], [-5, 5], [10, 1], [22, -3]], { width: 2, pig: INK, load: 0.35, dry: 0.7, seed: 22, taperStart: 0.05, taperEnd: 0.5, body: 0.2 });
    dot(ce, -22, 2, 3, INK, 0.3, 23);
    this.chargeEmpty = frameFrom(ce);
    for (let i = 0; i < 3; i++) {
      const bg = new Sprite(this.chargeEmpty);
      bg.mesh.renderOrder = LAYER.ui;
      r.uiPig.add(bg.mesh);
      this.chargeBg.push(bg);
      const s = new Sprite(this.chargeFull);
      s.mesh.renderOrder = LAYER.ui + 1;
      r.uiRed.add(s.mesh);
      this.charges.push(s);
    }
    this.comboS = new Sprite(this.comboFrame(1));
    this.comboS.mesh.renderOrder = LAYER.ui;
    r.uiPig.add(this.comboS.mesh);
    const bar = new Painter(200, 30, 1, -100, -15);
    bar.glaze();
    stroke(bar, [[-95, 0], [0, 3], [95, -2]], { width: 9, pig: VERMILION, load: 1, dry: 0.5, seed: 31, taperStart: 0.03, taperEnd: 0.4 });
    this.comboBar = new Sprite(bar);
    this.comboBar.mesh.renderOrder = LAYER.ui;
    r.uiRed.add(this.comboBar.mesh);
  }

  private comboFrame(n: number): Frame {
    let f = this.comboCache.get(n);
    if (!f) {
      f = brushText(String(n), { size: 84, ppu: 1.2, italic: true, weight: 700, seed: n });
      this.comboCache.set(n, f);
    }
    return f;
  }

  setHp(hp: number): void {
    for (let i = 0; i < 5; i++) {
      const has = i < hp;
      if (!has && i < this.shown) this.splashT[i] = 0.5;
      this.drops[i].setTexture(has ? this.full.tex : this.empty.tex);
    }
    this.shown = hp;
  }

  setCharges(n: number): void {
    for (let i = 0; i < 3; i++) {
      if (i < n && i >= this.chargeShown) this.chargePop[i] = 0.25;
    }
    this.chargeShown = n;
  }

  setCombo(n: number, frac: number): void {
    if (n !== this.comboN) {
      if (n > this.comboN) this.comboPop = 0.18;
      this.comboN = n;
      if (n > 1) {
        const f = this.comboFrame(n);
        this.comboS.mesh.geometry.dispose();
        const s = new Sprite(f);
        s.mesh.renderOrder = LAYER.ui;
        this.comboS.mesh.removeFromParent();
        this.comboS.mat.dispose();
        this.comboS = s;
        this.r.uiPig.add(s.mesh);
      }
    }
    this.comboFrac = frac;
  }

  showHint(text: string, dur = 5): void {
    if (this.hint) this.hint.dispose();
    const art = brushText(text, { size: 30, ppu: 1.5, italic: true, maxWidth: 1100 });
    this.hint = new Sprite(art);
    this.hint.mesh.renderOrder = LAYER.ui;
    this.r.uiPig.add(this.hint.mesh);
    this.hintT = 0;
    this.hintDur = dur;
  }

  showBoss(name: string): void {
    this.bossName?.dispose();
    const art = brushText(name, { size: 64, ppu: 1.2 });
    this.bossName = new Sprite(art);
    this.bossName.mesh.renderOrder = LAYER.ui;
    this.r.uiPig.add(this.bossName.mesh);
    this.bossNameT = 0;
    if (!this.bossBarFrame) {
      const p = new Painter(900, 60, 1, -450, -30);
      p.glaze();
      stroke(p, [[-440, 0], [-150, 4], [150, -2], [440, 2]], { width: 26, load: 0.85, dry: 0.55, seed: 77, taperStart: 0.03, taperEnd: 0.12, press: 0.5 });
      this.bossBarFrame = frameFrom(p);
    }
    this.bossBar?.dispose();
    this.bossBar = new Sprite(this.bossBarFrame);
    this.bossBar.mesh.renderOrder = LAYER.ui;
    this.r.uiPig.add(this.bossBar.mesh);
    this.bossVis = 1;
    this.bossFrac = 1;
  }

  hideBoss(): void {
    this.bossVis = 0;
  }

  update(dt: number): void {
    const r = this.r;
    const left = -r.uiW / 2 + 70, top = r.uiH / 2 - 62;
    for (let i = 0; i < 5; i++) {
      const s = this.drops[i];
      this.splashT[i] = Math.max(0, this.splashT[i] - dt);
      const k = this.splashT[i] / 0.5;
      s.setPos(left + i * 50, top);
      const sc = 1 + k * 0.6;
      s.mesh.scale.set(sc, sc, 1);
      s.opacity = this.visible ? 1 - k * 0.5 : 0;
    }
    for (let i = 0; i < 3; i++) {
      this.chargePop[i] = Math.max(0, this.chargePop[i] - dt);
      const x = left + 8 + i * 62, y = top - 58;
      this.chargeBg[i].setPos(x, y);
      this.charges[i].setPos(x, y);
      const sc = 1 + this.chargePop[i] * 1.6;
      this.charges[i].mesh.scale.set(sc, sc, 1);
      this.charges[i].opacity = this.visible && i < this.chargeShown ? 1 : 0;
      this.chargeBg[i].opacity = this.visible ? 0.8 : 0;
    }
    this.comboPop = Math.max(0, this.comboPop - dt);
    const cx = r.uiW / 2 - 150, cy = r.uiH / 2 - 90;
    const show = this.comboN > 1 && this.visible ? 1 : 0;
    this.comboS.setPos(cx, cy);
    const sc = 1 + this.comboPop * 2.2;
    this.comboS.mesh.scale.set(sc, sc, 1);
    this.comboS.opacity = show;
    this.comboBar.setPos(cx, cy - 62);
    this.comboBar.mesh.scale.set(Math.max(0.001, this.comboFrac), 1, 1);
    this.comboBar.opacity = show;
    if (this.hint) {
      this.hintT += dt;
      const t = this.hintT;
      this.hint.setPos(0, -r.uiH / 2 + 90);
      this.hint.reveal = Math.min(1.5, t * 1.4);
      this.hint.opacity = Math.max(0, Math.min(1, (this.hintDur - t) / 0.8));
      if (t > this.hintDur) { this.hint.dispose(); this.hint = null; }
    }
    if (this.bossName && this.bossBar) {
      this.bossNameT += dt;
      const showB = this.bossVis;
      this.bossName.setPos(0, -r.uiH / 2 + 150);
      this.bossName.reveal = Math.min(1.5, this.bossNameT * 0.8);
      const nameAlpha = this.bossNameT < 4 ? 1 : Math.max(0.0, 1 - (this.bossNameT - 4) / 1.5);
      this.bossName.opacity = nameAlpha * showB;
      this.bossBar.setPos(0, -r.uiH / 2 + 80);
      this.bossBar.reveal = Math.max(0, Math.min(1.0, this.bossFrac)) * Math.min(1, this.bossNameT * 1.2);
      this.bossBar.opacity = showB * 0.9;
    }
  }
}
