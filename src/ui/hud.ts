/** Painted HUD: ink drops for life, vermilion dabs for ink charges, a calligraphic combo. */
import { Renderer } from '../core/renderer';
import { Painter, INK, VERMILION } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { washPoly } from '../gfx/wash';
import { stroke, V2 } from '../gfx/brush';
import { brushText } from '../gfx/text';
import { INKS, InkId, INK_ORDER } from '../game/inks';
import { noisyOutline } from '../gfx/wash';

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
  private maxShown = 5;
  private splashT: number[] = new Array(14).fill(0);
  private inkBars = new Map<InkId, Sprite>();
  private inkBar!: Sprite;
  private inkBg: Sprite;
  private xpBar: Sprite;
  private xpBg: Sprite;
  private xpFrac = 0;
  private levelS: Sprite | null = null;
  private level = 0;
  private pots: { id: InkId; ring: Sprite; fill: Sprite; x: number; y: number }[] = [];
  private potFrames = new Map<InkId, Frame>();
  private potRing!: Frame;
  private currentInk: InkId = 'vermilion';
  /** Positions of the ink pots in UI units (for touch/click). */
  potRegions: { id: InkId; x: number; y: number; r: number }[] = [];
  private arrow: Sprite;
  arrowTarget: [number, number] | null = null;
  private inkFrac = 1;
  private inkLow = 0;
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
    for (let i = 0; i < 14; i++) {
      const s = new Sprite(this.full);
      s.mesh.renderOrder = LAYER.ui;
      r.uiPig.add(s.mesh);
      this.drops.push(s);
    }
    // the ink gauge: one long stroke in the current ink's colour that empties as Shu paints
    for (const id of INK_ORDER) {
      const [cr, cg, cb] = INKS[id].rgb;
      const ib = new Painter(300, 40, UI_PPU, -150, -20);
      ib.over();
      stroke(ib, [[-140, 1], [-40, 4], [60, 0], [140, -2]], { width: 15, pig: { ink: cr, a: cg, b: cb }, load: 1, dry: 0.4, seed: 21, taperStart: 0.03, taperEnd: 0.25, press: 0.5 });
      const s = new Sprite(ib);
      s.mesh.renderOrder = LAYER.ui + 1;
      s.opacity = 0;
      r.uiAcc.add(s.mesh);
      this.inkBars.set(id, s);
      // ink pot: a round dab of the colour
      const pp = new Painter(110, 110, 1, -55, -55);
      pp.over();
      const o = noisyOutline(0, 0, 34, 34, 0.12, 31 + INK_ORDER.indexOf(id));
      pp.ctx.fillStyle = `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},1)`;
      pp.ctx.beginPath();
      o.forEach((q, k) => (k === 0 ? pp.ctx.moveTo(q[0], q[1]) : pp.ctx.lineTo(q[0], q[1])));
      pp.ctx.fill();
      this.potFrames.set(id, frameFrom(pp));
    }
    this.inkBar = this.inkBars.get('vermilion')!;
    const ringP = new Painter(130, 130, 1, -65, -65);
    ringP.glaze();
    const rp: V2[] = [];
    for (let k = 0; k <= 30; k++) { const a = (k / 30) * Math.PI * 2.05 + 0.4; rp.push([Math.cos(a) * 46, Math.sin(a) * 46]); }
    stroke(ringP, rp, { width: 6, load: 0.85, dry: 0.5, seed: 33, taperStart: 0.05, taperEnd: 0.3, press: 0.3 });
    this.potRing = frameFrom(ringP);
    // experience: a thin ink line that fills
    const xb = new Painter(300, 20, UI_PPU, -150, -10);
    xb.glaze();
    stroke(xb, [[-140, 0], [0, 1], [140, -1]], { width: 5, pig: INK, load: 0.85, dry: 0.3, seed: 25, taperStart: 0.02, taperEnd: 0.1, press: 0 });
    this.xpBar = new Sprite(xb);
    this.xpBar.mesh.renderOrder = LAYER.ui + 1;
    r.uiPig.add(this.xpBar.mesh);
    const xg = new Painter(300, 20, UI_PPU, -150, -10);
    xg.glaze();
    stroke(xg, [[-140, 0], [0, 1], [140, -1]], { width: 5, pig: INK, load: 0.15, dry: 0.4, seed: 26, taperStart: 0.02, taperEnd: 0.1, body: 0.5, press: 0 });
    this.xpBg = new Sprite(xg);
    this.xpBg.mesh.renderOrder = LAYER.ui;
    r.uiPig.add(this.xpBg.mesh);
    // objective arrow at the screen edge
    const ap = new Painter(80, 80, 1, -40, -40);
    ap.glaze();
    stroke(ap, [[-26, 0], [24, 0]], { width: 8, load: 0.9, dry: 0.4, seed: 27, taperStart: 0.05, taperEnd: 0.1 });
    stroke(ap, [[8, 14], [26, 0], [8, -14]], { width: 8, load: 0.95, dry: 0.3, seed: 28, taperStart: 0.05, taperEnd: 0.3 });
    this.arrow = new Sprite(ap);
    this.arrow.mesh.renderOrder = LAYER.ui;
    r.uiPig.add(this.arrow.mesh);
    const ig = new Painter(300, 40, UI_PPU, -150, -20);
    ig.glaze();
    stroke(ig, [[-140, 1], [-40, 4], [60, 0], [140, -2]], { width: 15, pig: INK, load: 0.12, dry: 0.5, seed: 22, taperStart: 0.03, taperEnd: 0.25, body: 0.5, press: 0 });
    this.inkBg = new Sprite(ig);
    this.inkBg.mesh.renderOrder = LAYER.ui;
    r.uiPig.add(this.inkBg.mesh);
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

  setHp(hp: number, max = 5): void {
    this.maxShown = Math.min(14, max);
    for (let i = 0; i < 14; i++) {
      const has = i < hp;
      if (!has && i < this.shown) this.splashT[i] = 0.5;
      this.drops[i].setTexture(has ? this.full.tex : this.empty.tex);
    }
    this.shown = hp;
  }

  setXp(frac: number, level: number): void {
    this.xpFrac = frac;
    if (level !== this.level) {
      this.level = level;
      this.levelS?.dispose();
      this.levelS = new Sprite(brushText(String(level), { size: 40, ppu: 1.5, italic: true, weight: 700 }));
      this.levelS.mesh.renderOrder = LAYER.ui;
      this.r.uiPig.add(this.levelS.mesh);
    }
  }

  /** Show the inks the child owns as pots; the current one is ringed. */
  setInks(owned: InkId[], current: InkId): void {
    const ids = INK_ORDER.filter((i) => owned.includes(i));
    if (ids.length !== this.pots.length) {
      for (const p of this.pots) { p.ring.dispose(); p.fill.dispose(); }
      this.pots = ids.map((id) => {
        const fill = new Sprite(this.potFrames.get(id)!);
        fill.mesh.renderOrder = LAYER.ui;
        this.r.uiAcc.add(fill.mesh);
        const ring = new Sprite(this.potRing);
        ring.mesh.renderOrder = LAYER.ui + 1;
        this.r.uiPig.add(ring.mesh);
        return { id, ring, fill, x: 0, y: 0 };
      });
    }
    if (current !== this.currentInk) {
      this.inkBar.opacity = 0;
      this.currentInk = current;
    }
    this.inkBar = this.inkBars.get(current)!;
  }

  setInk(frac: number): void {
    if (frac < this.inkFrac - 0.001 && frac < 0.08) this.inkLow = 0.3;
    this.inkFrac = frac;
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
    const art = brushText(text, { size: 30, ppu: 1.5, italic: true, maxWidth: Math.min(1100, this.r.uiW * 0.88) });
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
    for (let i = 0; i < 14; i++) {
      const s = this.drops[i];
      this.splashT[i] = Math.max(0, this.splashT[i] - dt);
      const k = this.splashT[i] / 0.5;
      s.setPos(left + i * 46, top);
      const sc = (1 + k * 0.6) * 0.92;
      s.mesh.scale.set(sc, sc, 1);
      s.opacity = this.visible && i < this.maxShown ? 1 - k * 0.5 : 0;
    }
    // experience and level
    const xx = left + 120, xy = top - 92;
    this.xpBar.setPos(xx, xy);
    this.xpBg.setPos(xx, xy);
    this.xpBar.reveal = Math.max(0.001, this.xpFrac);
    this.xpBar.opacity = this.visible ? 1 : 0;
    this.xpBg.opacity = this.visible ? 0.9 : 0;
    if (this.levelS) {
      this.levelS.setPos(xx + 175, xy + 18);
      this.levelS.opacity = this.visible ? 1 : 0;
    }
    // ink pots, bottom right
    const n = this.pots.length;
    this.potRegions = [];
    for (let i = 0; i < n; i++) {
      const p = this.pots[i];
      p.x = r.uiW / 2 - 90 - (n - 1 - i) * 110;
      p.y = -r.uiH / 2 + 90;
      const sel = p.id === this.currentInk;
      const sc = sel ? 1.15 : 0.8;
      p.fill.setPos(p.x, p.y);
      p.fill.mesh.scale.set(sc, sc, 1);
      p.ring.setPos(p.x, p.y);
      p.ring.mesh.scale.set(sc, sc, 1);
      p.fill.opacity = this.visible && n > 1 ? (sel ? 1 : 0.7) : 0;
      p.ring.opacity = this.visible && n > 1 && sel ? 1 : 0;
      this.potRegions.push({ id: p.id, x: p.x, y: p.y, r: 60 });
    }
    // objective arrow when the goal is off screen
    this.arrow.opacity = 0;
    if (this.arrowTarget && this.visible) {
      const [ux, uy] = this.arrowTarget;
      const hw = r.uiW / 2 - 70, hh = r.uiH / 2 - 70;
      if (Math.abs(ux) > hw || Math.abs(uy) > hh) {
        const k = Math.min(hw / Math.max(1, Math.abs(ux)), hh / Math.max(1, Math.abs(uy)));
        this.arrow.setPos(ux * k, uy * k);
        this.arrow.mesh.rotation.z = Math.atan2(uy, ux);
        this.arrow.opacity = 0.85;
      }
    }
    this.inkLow = Math.max(0, this.inkLow - dt);
    const ix = left + 120, iy = top - 56;
    this.inkBar.setPos(ix, iy);
    this.inkBg.setPos(ix, iy);
    this.inkBar.reveal = Math.max(0.001, this.inkFrac);
    this.inkBar.opacity = this.visible ? 1 : 0;
    this.inkBg.opacity = this.visible ? 0.9 : 0;
    this.inkBg.mesh.position.x = ix + (this.inkLow > 0 ? Math.sin(this.inkLow * 80) * 4 : 0);
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
