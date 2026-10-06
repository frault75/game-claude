/**
 * The Tree of Strokes: three branches of four rows. Tap a node to read it, learn it with a point,
 * and put active skills in one of the three slots. C or Esc to close.
 */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { Painter, INK } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { roughen, washPoly } from '../gfx/wash';
import { stroke, V2 } from '../gfx/brush';
import { brushText } from '../gfx/text';
import { skillArt } from '../gfx/gen/skillArt';
import { maskSprite } from './mask';
import { save, writeSave } from '../game/progression';
import { SKILLS, SKILL, SkillId, Branch, BRANCH_NAMES, BRANCH_RGB, rank, canLearn, learn, pointsLeft, spentIn, skillText, skillName, cooldownOf } from '../game/skills';
import { lang } from '../i18n';
import { sfx } from '../audio/sfx';

const T = {
  title: { fr: 'Arbre des traits', en: 'Tree of Strokes' },
  points: { fr: 'points à placer', en: 'points to spend' },
  learn: { fr: 'Apprendre', en: 'Learn' },
  slot: { fr: 'Emplacement', en: 'Slot' },
  locked: { fr: 'Place {n} point(s) dans cette branche pour l’ouvrir.', en: 'Spend {n} point(s) in this branch to open it.' },
  active: { fr: 'Compétence active · recharge {s} s', en: 'Active skill · recharge {s} s' },
  passive: { fr: 'Passif · rang {r}/{m}', en: 'Passive · rank {r}/{m}' },
  hint: { fr: 'Chaque niveau donne un point. Touche une compétence pour la lire.', en: 'Each level gives a point. Tap a skill to read it.' },
  keys: { fr: 'Touches R, T, G (ou les boutons à droite)', en: 'Keys R, T, G (or the buttons on the right)' },
};
const L = (x: { fr: string; en: string }) => x[lang];

const BRANCHES: Branch[] = ['red', 'colour', 'wash'];

interface Node { id: SkillId; x: number; y: number }

export class Tree {
  active = false;
  private sprites: Sprite[] = [];
  private dyn: Sprite[] = [];
  private nodes: Node[] = [];
  private buttons: { x: number; y: number; w: number; h: number; act: () => void }[] = [];
  private sel: SkillId | null = null;
  private pw = 0;
  private ph = 0;
  private ring: Frame | null = null;
  private btn: Frame | null = null;
  onChange?: () => void;

  constructor(private r: Renderer, private input: Input) {}

  private add(s: Sprite, scene: 'pig' | 'red' | 'acc', order = LAYER.ui + 31): Sprite {
    s.mesh.renderOrder = order;
    (scene === 'pig' ? this.r.uiPig : scene === 'red' ? this.r.uiRed : this.r.uiAcc).add(s.mesh);
    return s;
  }

  private text(str: string, size: number, o: { bold?: boolean; italic?: boolean; maxWidth?: number; align?: 'left' | 'center'; color?: [number, number, number] } = {}): { s: Sprite; w: number; h: number } {
    const art = brushText(str, { size, ppu: 1.4, weight: o.bold ? 700 : 400, italic: o.italic, maxWidth: o.maxWidth, align: o.align ?? 'left', lineHeight: 1.25, color: o.color });
    return { s: this.add(new Sprite(art), o.color ? 'acc' : 'pig', LAYER.ui + 33), w: art.w, h: art.h };
  }

  open(): void {
    if (this.active) return;
    this.active = true;
    this.sel = null;
    this.build();
    this.input.swallow();
    sfx.ui();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    for (const s of [...this.sprites, ...this.dyn]) s.dispose();
    this.sprites = [];
    this.dyn = [];
    this.nodes = [];
    this.buttons = [];
    this.input.swallow();
    sfx.ui();
  }

  private build(): void {
    const r = this.r;
    const pw = Math.min(1560, r.uiW - 40), ph = Math.min(860, r.uiH - 40);
    this.pw = pw;
    this.ph = ph;
    const p = new Painter(pw + 40, ph + 40, 0.5, -(pw + 40) / 2, -(ph + 40) / 2);
    const edge = roughen([[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, ph / 2], [-pw / 2, ph / 2]], 8, 71, 20);
    p.reserve(() => edge.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 0.97);
    p.glaze();
    washPoly(p, edge, { pig: INK, density: 0.03, soft: 0.6, seed: 72 });
    stroke(p, [[-pw / 2 + 20, ph / 2 - 8], [pw / 2 - 20, ph / 2 - 12]], { width: 8, load: 0.85, dry: 0.5, seed: 73, taperStart: 0.03, taperEnd: 0.12 });
    stroke(p, [[-pw / 2 + 30, -ph / 2 + 8], [pw / 2 - 30, -ph / 2 + 6]], { width: 5, load: 0.5, dry: 0.7, seed: 74, taperStart: 0.1, taperEnd: 0.2 });
    // the tree's three trunks and their branches
    const colX = (b: number) => -pw / 2 + 170 + b * 240;
    const rowY = (row: number) => ph / 2 - 175 - row * ((ph - 270) / 3.2);
    for (let b = 0; b < 3; b++) stroke(p, [[colX(b), rowY(3) - 30], [colX(b) + 6, (rowY(0) + rowY(3)) / 2], [colX(b), rowY(0) + 20]], { width: 5, load: 0.3, dry: 0.7, seed: 75 + b, taperStart: 0.1, taperEnd: 0.4 });
    stroke(p, [[-pw / 2 + 880, ph / 2 - 90], [-pw / 2 + 876, -ph / 2 + 40]], { width: 3, load: 0.35, dry: 0.7, seed: 79 });
    this.sprites.push(this.add(new Sprite(frameFrom(p)), 'pig', LAYER.ui + 30));
    const m = maskSprite(r, pw + 160, ph + 160);
    m.mesh.renderOrder = LAYER.ui + 30;
    this.sprites.push(m);
    const t = this.text(L(T.title), 40, { bold: true });
    t.s.setPos(-pw / 2 + 50 + t.w / 2, ph / 2 - 52);
    this.sprites.push(t.s);
    const x = new Painter(80, 80, 1, -40, -40);
    x.glaze();
    stroke(x, [[-22, -22], [22, 22]], { width: 7, load: 1, dry: 0.4, seed: 56 });
    stroke(x, [[22, -22], [-22, 22]], { width: 7, load: 1, dry: 0.4, seed: 57 });
    const xs = this.add(new Sprite(frameFrom(x)), 'pig', LAYER.ui + 33);
    xs.setPos(pw / 2 - 52, ph / 2 - 50);
    this.sprites.push(xs);
    BRANCHES.forEach((b, i) => {
      const n = this.text(BRANCH_NAMES[b][lang], 27, { bold: true, align: 'center', color: BRANCH_RGB[b] });
      n.s.setPos(colX(i), ph / 2 - 108);
      this.sprites.push(n.s);
    });
    for (const s of SKILLS) {
      const bi = BRANCHES.indexOf(s.branch);
      const pair = SKILLS.filter((o) => o.branch === s.branch && o.row === s.row);
      const k = pair.indexOf(s);
      const x0 = colX(bi) + (pair.length > 1 ? (k === 0 ? -58 : 58) : 0);
      this.nodes.push({ id: s.id, x: x0, y: rowY(s.row) });
    }
    if (!this.ring) {
      const rp = new Painter(130, 130, 1, -65, -65);
      rp.glaze();
      const pts: V2[] = [];
      for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI * 2.04 + 0.4; pts.push([Math.cos(a) * 46, Math.sin(a) * 46]); }
      stroke(rp, pts, { width: 5, load: 0.8, dry: 0.5, seed: 81, taperStart: 0.05, taperEnd: 0.3 });
      this.ring = frameFrom(rp);
    }
    this.refresh();
  }

  private refresh(): void {
    for (const s of this.dyn) s.dispose();
    this.dyn = [];
    this.buttons = [];
    const pw = this.pw, ph = this.ph;
    // points left
    const pl = pointsLeft();
    const pt = this.text(`${pl} ${L(T.points)}`, 26, { italic: true, color: pl > 0 ? [0.76, 0.23, 0.17] : undefined });
    pt.s.setPos(-pw / 2 + 470 + pt.w / 2, ph / 2 - 52);
    this.dyn.push(pt.s);
    for (const n of this.nodes) {
      const s = SKILL[n.id];
      const rk = rank(n.id);
      const open = spentIn(s.branch) >= s.row * 2;
      const can = canLearn(n.id);
      if (rk > 0) {
        const [cr, cg, cb] = BRANCH_RGB[s.branch];
        const wp = new Painter(110, 110, 0.6, -55, -55);
        wp.over();
        wp.ctx.fillStyle = `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},0.3)`;
        wp.ctx.beginPath();
        wp.ctx.arc(0, 0, 44, 0, Math.PI * 2);
        wp.ctx.fill();
        const w = this.add(new Sprite(wp), 'acc', LAYER.ui + 31);
        w.setPos(n.x, n.y);
        this.dyn.push(w);
      }
      const ring = this.add(new Sprite(this.ring!), 'pig', LAYER.ui + 32);
      ring.setPos(n.x, n.y);
      ring.opacity = rk > 0 || can ? 1 : open ? 0.55 : 0.25;
      if (s.active) ring.mesh.scale.set(1.12, 1.12, 1);
      this.dyn.push(ring);
      const a = skillArt(n.id);
      for (const [f, sc] of [[a.pig, 'pig'], [a.red, 'red'], [a.acc, 'acc']] as [Frame, 'pig' | 'red' | 'acc'][]) {
        const sp = this.add(new Sprite(f), sc, LAYER.ui + 33);
        sp.setPos(n.x, n.y);
        sp.mesh.scale.set(0.78, 0.78, 1);
        sp.opacity = rk > 0 || can ? 1 : open ? 0.5 : 0.2;
        this.dyn.push(sp);
      }
      const lab = this.text(`${rk}/${s.ranks}`, 19, { italic: true, align: 'center', color: can ? [0.76, 0.23, 0.17] : undefined });
      lab.s.setPos(n.x, n.y - 58);
      this.dyn.push(lab.s);
      if (this.sel === n.id) {
        const sr = this.add(new Sprite(this.ring!), 'red', LAYER.ui + 34);
        sr.setPos(n.x, n.y);
        sr.mesh.scale.set(1.3, 1.3, 1);
        this.dyn.push(sr);
      }
    }
    // the card on the right
    const x0 = -pw / 2 + 910, w = pw / 2 - 40 - x0;
    let y = ph / 2 - 60;
    const put = (str: string, size: number, o: Parameters<Tree['text']>[2] = {}) => {
      const t = this.text(str, size, { maxWidth: w, ...o });
      t.s.setPos(x0 + t.w / 2, y - t.h / 2);
      y -= t.h + 6;
      this.dyn.push(t.s);
    };
    const id = this.sel;
    if (!id) {
      put(L(T.hint), 26, { italic: true });
      y -= 10;
      put(L(T.keys), 22, { italic: true });
      return;
    }
    const s = SKILL[id];
    const rk = rank(id);
    put(skillName(id), 34, { bold: true, color: BRANCH_RGB[s.branch] });
    put(s.active
      ? L(T.active).replace('{s}', cooldownOf(id).toFixed(1).replace('.0', ''))
      : L(T.passive).replace('{r}', String(rk)).replace('{m}', String(s.ranks)), 22, { italic: true });
    y -= 6;
    put(skillText(id), 27);
    if (spentIn(s.branch) < s.row * 2) { y -= 6; put(L(T.locked).replace('{n}', String(s.row * 2 - spentIn(s.branch))), 22, { italic: true }); }
    const by = -ph / 2 + 70;
    if (canLearn(id)) this.button(L(T.learn), x0 + 130, by, () => { if (learn(id)) { writeSave(); sfx.uiConfirm(); this.onChange?.(); this.refresh(); } });
    if (s.active && rk > 0) {
      // three small slot buttons in a row
      for (let k = 0; k < 3; k++) {
        const on = save.slots[k] === id;
        const bx = x0 + 70 + k * 150, byy = by + (canLearn(id) ? 100 : 0);
        this.button(`${k + 1}${on ? ' ●' : ''}`, bx, byy, () => {
          const prev = save.slots.indexOf(id);
          if (prev >= 0) save.slots[prev] = save.slots[k];
          save.slots[k] = id;
          writeSave();
          sfx.ui();
          this.onChange?.();
          this.refresh();
        }, 120);
      }
      const lab = this.text(L(T.slot), 22, { italic: true });
      lab.s.setPos(x0 + lab.w / 2, by + (canLearn(id) ? 100 : 0) + 56);
      this.dyn.push(lab.s);
    }
  }

  private button(label: string, x: number, y: number, act: () => void, width = 240): void {
    if (!this.btn) {
      const p = new Painter(280, 100, 1, -140, -50);
      p.glaze();
      washPoly(p, roughen([[-120, -34], [120, -34], [120, 34], [-120, 34]], 4, 59, 12), { pig: INK, density: 0.1, soft: 0.2, edge: 0.6, seed: 59 });
      stroke(p, [[-118, -30], [0, -34], [118, -28]], { width: 5, load: 0.8, dry: 0.5, seed: 60 });
      this.btn = frameFrom(p);
    }
    const bg = this.add(new Sprite(this.btn), 'pig', LAYER.ui + 32);
    bg.setPos(x, y);
    bg.mesh.scale.set(width / 240, 1, 1);
    const t = this.text(label, 27, { bold: true, align: 'center' });
    t.s.setPos(x, y + 2);
    this.dyn.push(bg, t.s);
    this.buttons.push({ x, y, w: width, h: 76, act });
  }

  update(): void {
    if (!this.active) return;
    const inp = this.input;
    if (inp.keyPressed('KeyC') || inp.pressed('back')) { this.close(); return; }
    for (const [sx, sy] of inp.orderTaps) {
      const [ux, uy] = inp.toUi(sx, sy);
      this.tap(ux, uy);
      if (!this.active) break;
    }
    inp.swallow();
  }

  private tap(x: number, y: number): void {
    const pw = this.pw, ph = this.ph;
    if (Math.abs(x) > pw / 2 || Math.abs(y) > ph / 2 || Math.hypot(x - (pw / 2 - 52), y - (ph / 2 - 50)) < 50) { this.close(); return; }
    for (const b of this.buttons) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2) { b.act(); return; }
    for (const n of this.nodes) {
      if (Math.hypot(x - n.x, y - n.y) < 52) {
        this.sel = n.id;
        sfx.ui();
        this.refresh();
        return;
      }
    }
  }
}
