/** Painted HUD: ink drops for life, vermilion dabs for ink charges, a calligraphic combo. */
import { Renderer } from '../core/renderer';
import { Painter, INK, VERMILION } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { washPoly } from '../gfx/wash';
import { stroke, V2 } from '../gfx/brush';
import { brushText } from '../gfx/text';
import { INKS, InkId, INK_ORDER } from '../game/inks';
import { noisyOutline } from '../gfx/wash';
import { maskSprite } from './mask';
import { skillArt } from '../gfx/gen/skillArt';
import type { SkillId } from '../game/skills';

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
  private bag: Sprite;
  private bagDot: Sprite;
  /** Shows a vermilion dot on the bag. */
  bagNew = false;
  /** Where the bag button is (UI units), for taps. */
  bagRegion = { x: 0, y: 0, r: 0 };
  private tree: Sprite;
  private treeDot: Sprite;
  /** Shows a vermilion dot on the tree (points to spend). */
  treeNew = false;
  treeRegion = { x: 0, y: 0, r: 0 };
  /** Active skill buttons (bottom right, above the ink pots). */
  private skillBtns: { id: string; ring: Sprite; art: Sprite[]; key: Sprite | null; x: number; y: number }[] = [];
  skillRegions: { slot: number; x: number; y: number; r: number }[] = [];
  private skillKey = '';
  private stickRing: Sprite;
  private stickKnob: Sprite;
  private stickVis = 0;
  private stickPos: { bx: number; by: number; kx: number; ky: number; r: number } | null = null;
  private questT: Sprite | null = null;
  private questG: Sprite | null = null;
  private questKey = '';
  private questW = 0;
  private questGW = 0;
  private questPop = 0;
  private masks: { tl: Sprite; br: Sprite; tr: Sprite; hint: Sprite; boss: Sprite };
  private papers: { tl: Sprite; br: Sprite; tr: Sprite; hint: Sprite };
  /** Paper sheets behind the HUD in dark places (0..1). */
  backdrop = 0;

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
    // the bag: a cloth bundle tied at the top
    const bp = new Painter(120, 120, 1, -60, -60);
    const bundle: V2[] = [];
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const rr = 1 + 0.06 * Math.sin(a * 5);
      bundle.push([Math.cos(a) * 36 * rr, -10 + Math.sin(a) * (Math.sin(a) > 0 ? 24 : 30) * rr]);
    }
    bp.reserve(() => bundle.forEach((q, k) => (k === 0 ? bp.ctx.moveTo(q[0], q[1]) : bp.ctx.lineTo(q[0], q[1]))), 1);
    bp.glaze();
    washPoly(bp, bundle, { pig: INK, density: 0.42, soft: 0.05, edge: 0.9, seed: 63 });
    // the knot and its two ears
    washPoly(bp, noisyOutline(0, 16, 11, 8, 0.1, 64), { pig: INK, density: 0.9, soft: 0.05, edge: 0.5, seed: 64 });
    stroke(bp, [[-4, 18], [-18, 34], [-24, 30]], { width: 7, load: 1, dry: 0.3, seed: 65, taperEnd: 0.6 });
    stroke(bp, [[4, 18], [18, 36], [26, 32]], { width: 7, load: 1, dry: 0.3, seed: 66, taperEnd: 0.6 });
    // a woven pattern
    bp.lift();
    for (const [dx, dy] of [[-16, -14], [0, -20], [16, -14], [-8, -2], [8, -2]] as V2[]) bp.circle(dx, dy, 3.2, INK, 0.8);
    bp.glaze();
    this.bag = new Sprite(frameFrom(bp));
    this.bag.mesh.renderOrder = LAYER.ui + 1;
    r.uiPig.add(this.bag.mesh);
    const dp = new Painter(40, 40, 1, -20, -20);
    dp.glaze();
    dp.dab(0, 0, 11, VERMILION, 1, 0.7);
    this.bagDot = new Sprite(frameFrom(dp));
    this.bagDot.mesh.renderOrder = LAYER.ui + 2;
    r.uiRed.add(this.bagDot.mesh);
    // the tree button: a little brushed tree
    const tp = new Painter(110, 110, 1, -55, -55);
    tp.glaze();
    stroke(tp, [[0, -32], [2, -6], [-2, 18]], { width: 7, load: 1, dry: 0.3, seed: 68, taperEnd: 0.4 });
    stroke(tp, [[1, -6], [-18, 10], [-26, 22]], { width: 5, load: 0.9, seed: 69, taperEnd: 0.7 });
    stroke(tp, [[1, -2], [18, 12], [24, 26]], { width: 5, load: 0.9, seed: 70, taperEnd: 0.7 });
    for (const [x, y] of [[-26, 24], [24, 28], [-2, 24], [-14, 30], [12, 34]] as V2[]) washPoly(tp, noisyOutline(x, y, 8, 6, 0.2, 71 + x), { pig: INK, density: 0.45, soft: 0.1, seed: 71 + y });
    this.tree = new Sprite(frameFrom(tp));
    this.tree.mesh.renderOrder = LAYER.ui + 1;
    r.uiPig.add(this.tree.mesh);
    this.treeDot = new Sprite(frameFrom(dp));
    this.treeDot.mesh.renderOrder = LAYER.ui + 2;
    r.uiRed.add(this.treeDot.mesh);
    // the floating stick (phones): a brushed ring and an ink dab
    const sr = new Painter(240, 240, 1, -120, -120);
    sr.glaze();
    const ring: V2[] = [];
    for (let k = 0; k <= 36; k++) { const a = (k / 36) * Math.PI * 2.04 + 0.3; ring.push([Math.cos(a) * 100, Math.sin(a) * 100]); }
    stroke(sr, ring, { width: 7, load: 0.7, dry: 0.6, seed: 61, taperStart: 0.05, taperEnd: 0.3, press: 0.2 });
    this.stickRing = new Sprite(frameFrom(sr));
    this.stickRing.mesh.renderOrder = LAYER.ui + 2;
    this.stickRing.opacity = 0;
    r.uiPig.add(this.stickRing.mesh);
    const sk = new Painter(120, 120, 1, -60, -60);
    sk.glaze();
    washPoly(sk, noisyOutline(0, 0, 34, 34, 0.12, 62), { pig: INK, density: 0.7, soft: 0.1, edge: 0.6, seed: 62 });
    this.stickKnob = new Sprite(frameFrom(sk));
    this.stickKnob.mesh.renderOrder = LAYER.ui + 3;
    this.stickKnob.opacity = 0;
    r.uiPig.add(this.stickKnob.mesh);
    this.masks = {
      tl: maskSprite(r, 900, 330),
      br: maskSprite(r, 560, 260),
      tr: maskSprite(r, 900, 230),
      hint: maskSprite(r, 1300, 150),
      boss: maskSprite(r, 1100, 210),
    };
    this.papers = {
      tl: maskSprite(r, 560, 210, 'paper'),
      br: maskSprite(r, 460, 210, 'paper'),
      tr: maskSprite(r, 700, 160, 'paper'),
      hint: maskSprite(r, 1200, 120, 'paper'),
    };
    for (const s of Object.values(this.papers)) s.opacity = 0;
  }

  /** The current quest, top right. */
  setQuest(title: string, goal: string): void {
    const key = title + '|' + goal;
    if (key === this.questKey) return;
    const titleChanged = !this.questKey.startsWith(title + '|');
    this.questKey = key;
    if (titleChanged) {
      this.questT?.dispose();
      const a = brushText(title, { size: 30, ppu: 1.5, weight: 700, align: 'right' });
      this.questW = a.w;
      this.questT = new Sprite(a);
      this.questT.mesh.renderOrder = LAYER.ui;
      this.r.uiPig.add(this.questT.mesh);
      this.questT.reveal = 0;
    }
    this.questG?.dispose();
    const g = brushText(goal, { size: 25, ppu: 1.5, italic: true, align: 'right', maxWidth: Math.min(640, this.r.uiW * 0.4) });
    this.questGW = g.w;
    this.questG = new Sprite(g);
    this.questG.mesh.renderOrder = LAYER.ui;
    this.r.uiPig.add(this.questG.mesh);
    this.questG.reveal = 0;
    this.questPop = 0;
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

  private skillCool: number[] = [];
  /** A panel (bag, tree) covers the screen: skill buttons step aside. */
  panelOpen = false;
  private skillSlot: number[] = [];

  /** The active skills in their slots, with how much of each cooldown remains (0..1). */
  setSkills(slots: (string | null)[], cool: number[], keys: boolean): void {
    const key = slots.join(',') + (keys ? 'k' : '');
    if (key !== this.skillKey) {
      this.skillKey = key;
      for (const b of this.skillBtns) { b.ring.dispose(); for (const s of b.art) s.dispose(); b.key?.dispose(); }
      this.skillBtns = [];
      this.skillSlot = [];
      slots.forEach((id, k) => {
        if (!id) return;
        const a = skillArt(id as SkillId);
        const ring = new Sprite(this.potRing);
        ring.mesh.renderOrder = LAYER.ui + 1;
        ring.mesh.scale.set(0.95, 0.95, 1);
        this.r.uiPig.add(ring.mesh);
        // a faint ghost of the glyph, and the glyph itself, repainted as the skill recharges
        const art = [new Sprite(a.pig), new Sprite(a.red), new Sprite(a.acc), new Sprite(a.pig), new Sprite(a.acc)];
        this.r.uiPig.add(art[0].mesh);
        this.r.uiRed.add(art[1].mesh);
        this.r.uiAcc.add(art[2].mesh);
        this.r.uiPig.add(art[3].mesh);
        this.r.uiAcc.add(art[4].mesh);
        for (const s of art) { s.mesh.renderOrder = LAYER.ui + 2; s.mesh.scale.set(0.82, 0.82, 1); }
        let ks: Sprite | null = null;
        if (keys) {
          ks = new Sprite(brushText(['R', 'T', 'G'][k], { size: 24, ppu: 1.5, weight: 700 }));
          ks.mesh.renderOrder = LAYER.ui + 3;
          this.r.uiPig.add(ks.mesh);
        }
        this.skillBtns.push({ id, ring, art, key: ks, x: 0, y: 0 });
        this.skillSlot.push(k);
      });
    }
    this.skillCool = this.skillSlot.map((k) => cool[k] ?? 0);
  }

  /** The thumb stick, in UI units (null when no thumb is down). */
  setStick(s: { bx: number; by: number; kx: number; ky: number; r: number } | null): void {
    if (s) this.stickPos = s;
    this.stickVis = s ? 1 : 0;
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
      p.fill.opacity = this.visible && !this.panelOpen && n > 1 ? (sel ? 1 : 0.7) : 0;
      p.ring.opacity = this.visible && !this.panelOpen && n > 1 && sel ? 1 : 0;
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
    const cx = r.uiW / 2 - 150, cy = r.uiH / 2 - 230;
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
    // the bag button, under the experience line
    const bx = left - 6, by = top - 168;
    this.bag.setPos(bx, by);
    this.bag.opacity = this.visible ? 1 : 0;
    this.bagDot.setPos(bx + 30, by + 26);
    this.bagDot.opacity = this.visible && this.bagNew ? 0.75 + Math.sin(performance.now() / 200) * 0.25 : 0;
    this.bagRegion = { x: bx, y: by, r: 62 };
    const tx = bx + 110;
    this.tree.setPos(tx, by);
    this.tree.opacity = this.visible ? 1 : 0;
    this.treeDot.setPos(tx + 30, by + 30);
    this.treeDot.opacity = this.visible && this.treeNew ? 0.75 + Math.sin(performance.now() / 200) * 0.25 : 0;
    this.treeRegion = { x: tx, y: by, r: 56 };
    // active skills: the brush repaints the glyph as it recharges
    this.skillRegions = [];
    const nPots = this.pots.length;
    for (let i = 0; i < this.skillBtns.length; i++) {
      const b = this.skillBtns[i];
      b.x = r.uiW / 2 - 90 - (this.skillBtns.length - 1 - i) * 118;
      b.y = -r.uiH / 2 + (nPots > 1 ? 220 : 110);
      b.ring.setPos(b.x, b.y);
      b.ring.opacity = this.visible ? 0.9 : 0;
      const frac = this.skillCool[i] ?? 0;
      const vis = this.visible && !this.panelOpen;
      b.ring.opacity = vis ? 0.9 : 0;
      b.art.forEach((s, k) => {
        s.setPos(b.x, b.y);
        if (k >= 3) { s.opacity = vis && frac > 0 ? 0.22 : 0; return; }
        s.reveal = frac > 0 ? Math.max(0.001, 1 - frac) : 1.5;
        s.opacity = vis ? (frac > 0 ? 0.7 : 1) : 0;
      });
      if (b.key) { b.key.setPos(b.x + 38, b.y - 40); b.key.opacity = vis ? 0.8 : 0; }
      this.skillRegions.push({ slot: this.skillSlot[i], x: b.x, y: b.y, r: 56 });
    }
    // the thumb stick
    const sp = this.stickPos;
    const sa = this.stickRing.opacity + ((this.stickVis * 0.55) - this.stickRing.opacity) * Math.min(1, dt * 14);
    this.stickRing.opacity = sa;
    this.stickKnob.opacity = sa * 1.3;
    if (sp) {
      const k = sp.r / 100;
      this.stickRing.setPos(sp.bx, sp.by);
      this.stickRing.mesh.scale.set(k, k, 1);
      this.stickKnob.setPos(sp.kx, sp.ky);
    }
    // quest tracker
    this.questPop += dt;
    const qx = r.uiW / 2 - 40, qy = r.uiH / 2 - 52;
    if (this.questT) {
      this.questT.setPos(qx - this.questW / 2, qy);
      this.questT.reveal = Math.min(1.5, this.questPop * 1.5);
      this.questT.opacity = this.visible ? 1 : 0;
    }
    if (this.questG) {
      this.questG.setPos(qx - this.questGW / 2, qy - 46);
      this.questG.reveal = Math.min(1.5, this.questPop * 1.2);
      this.questG.opacity = this.visible ? 0.9 : 0;
    }
    const m = this.masks;
    m.tl.setPos(-r.uiW / 2 + 400, r.uiH / 2 - 150);
    m.br.setPos(r.uiW / 2 - 230, -r.uiH / 2 + 110);
    m.br.opacity = this.pots.length > 1 ? 1 : 0;
    m.tr.setPos(r.uiW / 2 - 400, r.uiH / 2 - 90);
    m.hint.setPos(0, -r.uiH / 2 + 90);
    m.hint.opacity = this.hint ? 1 : 0;
    m.boss.setPos(0, -r.uiH / 2 + 110);
    m.boss.opacity = this.bossVis;
    const pp = this.papers, bd = this.visible ? this.backdrop * 0.85 : 0;
    pp.tl.setPos(-r.uiW / 2 + 250, r.uiH / 2 - 100);
    pp.tl.opacity = bd;
    pp.br.setPos(r.uiW / 2 - 230, -r.uiH / 2 + 100);
    pp.br.opacity = this.pots.length > 1 ? bd : 0;
    pp.tr.setPos(r.uiW / 2 - 300, r.uiH / 2 - 70);
    pp.tr.opacity = bd;
    pp.hint.setPos(0, -r.uiH / 2 + 90);
    pp.hint.opacity = this.hint ? bd * this.hint.opacity : 0;
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
