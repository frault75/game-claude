/**
 * The bag: what the child wears (brush, robe, talisman, seal), sixteen places for the rest,
 * and a card for the chosen item with what it would change. Tap or click; I or Esc to close.
 */
import type { Renderer } from '../core/renderer';
import { tabStrip, MenuTab } from './menu';
import type { Input } from '../core/input';
import { Painter, INK, VERMILION } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { roughen, washPoly } from '../gfx/wash';
import { stroke, V2 } from '../gfx/brush';
import { brushText } from '../gfx/text';
import { itemArt } from '../gfx/gen/itemArt';
import { maskSprite } from './mask';
import { save, writeSave, gearChanged, gear, BAG_SIZE, stats } from '../game/progression';
import {
  Item, Slot, SLOTS, SLOT_NAMES, RARITY_NAMES, RARITY_RGB, Stat, STATS, itemName, itemLines, uniqueFlavor, statLine,
} from '../game/items';
import { lang } from '../i18n';
import { sfx } from '../audio/sfx';

type Sel = { where: 'equip'; slot: Slot } | { where: 'bag'; index: number } | null;

interface Cell { x: number; y: number; frame: Sprite; wash: Sprite | null; icon: Sprite | null; iconRed: Sprite | null }

const T = {
  title: { fr: 'Sac', en: 'Bag' },
  equip: { fr: 'Équiper', en: 'Equip' },
  remove: { fr: 'Retirer', en: 'Take off' },
  grind: { fr: 'Broyer', en: 'Grind' },
  sure: { fr: 'Confirmer', en: 'Confirm' },
  sureHint: { fr: 'Objet précieux : touche « Confirmer » pour le broyer.', en: 'A precious item: tap “Confirm” to grind it.' },
  level: { fr: 'niveau', en: 'level' },
  worn: { fr: 'Comparé à ce que tu portes :', en: 'Compared with what you wear:' },
  empty: { fr: 'Touche un objet pour le regarder.\nBroyer un objet rend du pigment.', en: 'Tap an item to look at it.\nGrinding an item gives pigment back.' },
  full: { fr: 'Sac plein', en: 'Bag full' },
  ground: { fr: 'broyé en pigment', en: 'ground into pigment' },
};
const L = (x: { fr: string; en: string }) => x[lang];

export class Inventory {
  active = false;
  private sprites: Sprite[] = [];
  private cells: Cell[] = [];
  private equipCells: Cell[] = [];
  private detail: Sprite[] = [];
  private stat: Sprite | null = null;
  private sel: Sel = null;
  private ring: Sprite;
  private pw = 0;
  private tabs: { id: MenuTab; x: number; y: number; w: number; h: number }[] = [];
  /** Another tab of the menu was chosen. */
  onTab?: (id: MenuTab) => void;
  private ph = 0;
  private c = 100;
  private buttons: { x: number; y: number; w: number; h: number; act: () => void; sprites: Sprite[] }[] = [];
  private sureT = 0;
  private cellFrame: Frame | null = null;
  private buttonFrame: Frame | null = null;
  onChange?: () => void;

  constructor(private r: Renderer, private input: Input) {
    const p = new Painter(140, 140, 1, -70, -70);
    p.glaze();
    const pts: V2[] = [];
    for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI * 2.05 + 0.5; pts.push([Math.cos(a) * 58, Math.sin(a) * 58]); }
    stroke(p, pts, { width: 6, pig: VERMILION, load: 1, dry: 0.4, seed: 91, taperStart: 0.05, taperEnd: 0.3 });
    this.ring = new Sprite(frameFrom(p));
    this.ring.mesh.renderOrder = LAYER.ui + 34;
    this.ring.opacity = 0;
    r.uiRed.add(this.ring.mesh);
  }

  private add(s: Sprite, scene: 'pig' | 'red' | 'acc', order = LAYER.ui + 31): Sprite {
    s.mesh.renderOrder = order;
    (scene === 'pig' ? this.r.uiPig : scene === 'red' ? this.r.uiRed : this.r.uiAcc).add(s.mesh);
    return s;
  }

  private text(str: string, size: number, o: { bold?: boolean; italic?: boolean; maxWidth?: number; color?: [number, number, number]; align?: 'left' | 'center' } = {}): { s: Sprite; w: number; h: number } {
    const art = brushText(str, { size, ppu: 1.4, weight: o.bold ? 700 : 400, italic: o.italic, maxWidth: o.maxWidth, align: o.align ?? 'left', color: o.color, lineHeight: 1.25 });
    const s = this.add(new Sprite(art), o.color ? 'acc' : 'pig', LAYER.ui + 33);
    return { s, w: art.w, h: art.h };
  }

  open(): void {
    if (this.active) return;
    this.active = true;
    save.newItems = false;
    this.sel = null;
    this.build();
    this.input.swallow();
    sfx.ui();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    for (const s of this.sprites) s.dispose();
    for (const s of this.detail) s.dispose();
    for (const b of this.buttons) for (const s of b.sprites) s.dispose();
    this.stat?.dispose();
    // the item pictures belong to the cells: take them off the screen too
    for (const c of [...this.cells, ...this.equipCells]) {
      c.wash?.dispose();
      c.icon?.dispose();
      c.iconRed?.dispose();
    }
    this.sprites = [];
    this.detail = [];
    this.buttons = [];
    this.cells = [];
    this.equipCells = [];
    this.stat = null;
    this.ring.opacity = 0;
    this.input.swallow();
    sfx.ui();
  }

  toggle(): void {
    if (this.active) this.close();
    else this.open();
  }

  private build(): void {
    const r = this.r;
    const pw = Math.min(1560, r.uiW - 40), ph = Math.min(860, r.uiH - 40);
    this.pw = pw;
    this.ph = ph;
    const c = Math.min(110, (ph - 200) / 4.9);
    this.c = c;
    // the sheet
    const p = new Painter(pw + 40, ph + 40, 0.5, -(pw + 40) / 2, -(ph + 40) / 2);
    const edge = roughen([[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, ph / 2], [-pw / 2, ph / 2]], 8, 51, 20);
    p.reserve(() => edge.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 0.97);
    p.glaze();
    washPoly(p, edge, { pig: INK, density: 0.03, soft: 0.6, seed: 52 });
    stroke(p, [[-pw / 2 + 20, ph / 2 - 8], [pw / 2 - 20, ph / 2 - 12]], { width: 8, load: 0.85, dry: 0.5, seed: 53, taperStart: 0.03, taperEnd: 0.12 });
    stroke(p, [[-pw / 2 + 30, -ph / 2 + 8], [pw / 2 - 30, -ph / 2 + 6]], { width: 5, load: 0.5, dry: 0.7, seed: 54, taperStart: 0.1, taperEnd: 0.2 });
    const dx = -pw / 2 + 300 + c * 4.4 + 40;
    stroke(p, [[dx - 20, ph / 2 - 90], [dx - 24, -ph / 2 + 40]], { width: 3, load: 0.35, dry: 0.7, seed: 55, taperStart: 0.1, taperEnd: 0.2 });
    this.sprites.push(this.add(new Sprite(frameFrom(p)), 'pig', LAYER.ui + 30));
    const m = maskSprite(r, pw + 160, ph + 160);
    m.mesh.renderOrder = LAYER.ui + 30;
    this.sprites.push(m, maskSprite(r, pw + 30, ph + 30, 'cover'));
    // the menu's tabs (this sheet is the bag) and the close mark
    this.tabs = tabStrip(r, pw, ph, 'bag', (sp) => this.sprites.push(sp));
    const x = new Painter(80, 80, 1, -40, -40);
    x.glaze();
    stroke(x, [[-22, -22], [22, 22]], { width: 7, load: 1, dry: 0.4, seed: 56 });
    stroke(x, [[22, -22], [-22, 22]], { width: 7, load: 1, dry: 0.4, seed: 57 });
    const xs = this.add(new Sprite(frameFrom(x)), 'pig', LAYER.ui + 33);
    xs.setPos(pw / 2 - 52, ph / 2 - 50);
    this.sprites.push(xs);
    // cell frame
    if (!this.cellFrame) {
      const f = new Painter(130, 130, 1, -65, -65);
      f.glaze();
      const sq = roughen([[-50, -50], [50, -50], [50, 50], [-50, 50]], 2, 58, 8);
      stroke(f, [...sq, sq[0]], { width: 3.5, load: 0.55, dry: 0.6, seed: 58, taperStart: 0.01, taperEnd: 0.01 });
      this.cellFrame = frameFrom(f);
    }
    // worn items
    const top = ph / 2 - 150;
    SLOTS.forEach((slot, i) => {
      const cx = -pw / 2 + 120, cy = top - i * (c + 30);
      this.equipCells.push(this.makeCell(cx, cy));
      const lab = this.text(L(SLOT_NAMES[slot]), 19, { italic: true, align: 'center' });
      lab.s.setPos(cx, cy - c / 2 - 12);
      this.sprites.push(lab.s);
    });
    // the bag
    for (let k = 0; k < BAG_SIZE; k++) {
      const cx = -pw / 2 + 300 + c * 0.55 + (k % 4) * c * 1.1, cy = top - Math.floor(k / 4) * c * 1.1;
      this.cells.push(this.makeCell(cx, cy));
    }
    this.refresh();
  }

  private makeCell(x: number, y: number): Cell {
    const f = this.add(new Sprite(this.cellFrame!), 'pig', LAYER.ui + 31);
    f.setPos(x, y);
    f.mesh.scale.set(this.c / 100, this.c / 100, 1);
    this.sprites.push(f);
    return { x, y, frame: f, wash: null, icon: null, iconRed: null };
  }

  private fill(cell: Cell, it: Item | undefined, ghost?: Slot): void {
    cell.wash?.dispose();
    cell.icon?.dispose();
    cell.iconRed?.dispose();
    cell.wash = cell.icon = cell.iconRed = null;
    const k = this.c * 0.78;
    // an empty slot stays empty (its name is written under it)
    void ghost;
    if (!it) return;
    if (it.rarity !== 'common') {
      const [cr, cg, cb] = RARITY_RGB[it.rarity];
      const wp = new Painter(110, 110, 0.5, -55, -55);
      wp.over();
      wp.ctx.fillStyle = `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},0.32)`;
      const sq = roughen([[-46, -46], [46, -46], [46, 46], [-46, 46]], 3, it.id % 97, 10);
      wp.ctx.beginPath();
      sq.forEach((q, i) => (i === 0 ? wp.ctx.moveTo(q[0], q[1]) : wp.ctx.lineTo(q[0], q[1])));
      wp.ctx.fill();
      cell.wash = this.add(new Sprite(wp), 'acc', LAYER.ui + 31);
      cell.wash.setPos(cell.x, cell.y);
      cell.wash.mesh.scale.set(this.c / 100, this.c / 100, 1);
    }
    const a = itemArt(it.slot, it.base, 96);
    cell.icon = this.add(new Sprite(a.pig), 'pig', LAYER.ui + 32);
    cell.iconRed = this.add(new Sprite(a.red), 'red', LAYER.ui + 32);
    for (const s of [cell.icon, cell.iconRed]) {
      s.setPos(cell.x, cell.y - k * 0.5);
      s.mesh.scale.set(k, k, 1);
    }
  }

  private refresh(): void {
    SLOTS.forEach((slot, i) => this.fill(this.equipCells[i], save.equip[slot], slot));
    this.cells.forEach((cell, k) => this.fill(cell, save.bag[k]));
    this.showDetail();
    this.showStats();
  }

  private selected(): Item | undefined {
    const s = this.sel;
    if (!s) return undefined;
    return s.where === 'equip' ? save.equip[s.slot] : save.bag[s.index];
  }

  private showStats(): void {
    this.stat?.dispose();
    const gr = gear();
    const fr = lang === 'fr';
    const parts = [
      `${fr ? 'Vie' : 'Life'} ${stats.maxHp(save.level) + gr.hp}`,
      `${fr ? 'Encre' : 'Ink'} ${Math.round(stats.inkMax(save.level) + gr.ink)}`,
      `${fr ? 'Pigment' : 'Pigment'} ${Math.round(stats.pigmentMax(save.level) + gr.pigment)}`,
      `${fr ? 'Dégâts' : 'Damage'} ×${(stats.dmg(save.level) * (1 + gr.dmg / 100)).toFixed(2)}`,
      `${fr ? 'Critique' : 'Crit'} ${gr.crit} %`,
      `${fr ? 'Parade' : 'Parry'} ${gr.guard} %`,
      `${fr ? 'Vitesse' : 'Speed'} +${gr.speed} %`,
    ];
    const t = this.text(parts.join('  ·  '), 20, { italic: true, maxWidth: this.c * 4.4 + 40 });
    const top = this.ph / 2 - 150;
    t.s.setPos(-this.pw / 2 + 300 + t.w / 2, top - this.c * 3.3 - this.c * 0.55 - 14 - t.h / 2);
    this.stat = t.s;
  }

  private button(label: string, x: number, y: number, act: () => void): void {
    if (!this.buttonFrame) {
      const p = new Painter(280, 100, 1, -140, -50);
      p.glaze();
      washPoly(p, roughen([[-120, -34], [120, -34], [120, 34], [-120, 34]], 4, 59, 12), { pig: INK, density: 0.1, soft: 0.2, edge: 0.6, seed: 59 });
      stroke(p, [[-118, -30], [0, -34], [118, -28]], { width: 5, load: 0.8, dry: 0.5, seed: 60 });
      this.buttonFrame = frameFrom(p);
    }
    const bg = this.add(new Sprite(this.buttonFrame), 'pig', LAYER.ui + 32);
    bg.setPos(x, y);
    const t = this.text(label, 28, { bold: true, align: 'center' });
    t.s.setPos(x, y + 2);
    this.buttons.push({ x, y, w: 240, h: 76, act, sprites: [bg, t.s] });
  }

  private showDetail(): void {
    for (const s of this.detail) s.dispose();
    this.detail = [];
    for (const b of this.buttons) for (const s of b.sprites) s.dispose();
    this.buttons = [];
    const it = this.selected();
    const x0 = -this.pw / 2 + 300 + this.c * 4.4 + 50;
    const w = this.pw / 2 - 40 - x0;
    let y = this.ph / 2 - 60;
    const put = (str: string, size: number, o: Parameters<Inventory['text']>[2] = {}) => {
      const t = this.text(str, size, { maxWidth: w, ...o });
      t.s.setPos(x0 + t.w / 2, y - t.h / 2);
      y -= t.h + 4;
      this.detail.push(t.s);
    };
    // the selection ring
    const s = this.sel;
    const cell = s ? (s.where === 'equip' ? this.equipCells[SLOTS.indexOf(s.slot)] : this.cells[s.index]) : null;
    if (cell && it) {
      this.ring.setPos(cell.x, cell.y);
      this.ring.mesh.scale.set(this.c / 100, this.c / 100, 1);
      this.ring.opacity = 1;
    } else this.ring.opacity = 0;
    if (!it) {
      put(L(T.empty), 26, { italic: true });
      return;
    }
    put(itemName(it), 34, { bold: true, color: it.rarity === 'common' ? undefined : RARITY_RGB[it.rarity] });
    put(`${L(RARITY_NAMES[it.rarity])} · ${L(SLOT_NAMES[it.slot])} · ${L(T.level)} ${it.level}`, 23, { italic: true });
    y -= 8;
    put(itemLines(it).join('\n'), 27);
    const fl = uniqueFlavor(it);
    if (fl) { y -= 6; put(fl, 23, { italic: true }); }
    // what it would change
    if (s?.where === 'bag') {
      const worn = save.equip[it.slot];
      if (worn) {
        y -= 12;
        put(`${L(T.worn)} ${itemName(worn)}`, 22, { italic: true });
        const keys = new Set<Stat>([...Object.keys(it.stats), ...Object.keys(worn.stats)] as Stat[]);
        const diffs: string[] = [];
        for (const k of keys) {
          const d = Math.round(((it.stats[k] ?? 0) - (worn.stats[k] ?? 0)) * 10) / 10;
          if (d === 0) continue;
          const line = statLine(k, Math.abs(d)).replace(/^\+/, '');
          diffs.push(`${d > 0 ? '▲' : '▼'} ${d > 0 ? '' : '−'}${line}`);
        }
        if (diffs.length) put(diffs.join('\n'), 23);
      }
    }
    if (this.sureT > 0) { y -= 10; put(L(T.sureHint), 24, { italic: true, color: [0.76, 0.23, 0.17] }); }
    const by = -this.ph / 2 + 70;
    if (s?.where === 'bag') this.button(L(T.equip), x0 + 130, by, () => this.equipSel());
    else if (s?.where === 'equip') this.button(L(T.remove), x0 + 130, by, () => this.unequipSel());
    this.button(this.sureT > 0 ? L(T.sure) : L(T.grind), x0 + 410, by, () => this.grindSel());
    void STATS;
  }

  private changed(): void {
    gearChanged();
    writeSave();
    this.onChange?.();
    this.refresh();
  }

  private equipSel(): void {
    const s = this.sel;
    if (!s || s.where !== 'bag') return;
    const it = save.bag[s.index];
    if (!it) return;
    const old = save.equip[it.slot];
    save.equip[it.slot] = it;
    if (old) save.bag[s.index] = old;
    else save.bag.splice(s.index, 1);
    this.sel = { where: 'equip', slot: it.slot };
    sfx.uiConfirm();
    this.changed();
  }

  private unequipSel(): void {
    const s = this.sel;
    if (!s || s.where !== 'equip') return;
    const it = save.equip[s.slot];
    if (!it) return;
    if (save.bag.length >= BAG_SIZE) { sfx.empty(); return; }
    delete save.equip[s.slot];
    save.bag.push(it);
    this.sel = { where: 'bag', index: save.bag.length - 1 };
    sfx.ui();
    this.changed();
  }

  /** Grinding gives pigment back (the better the item, the more). */
  grindGain = (it: Item) => ({ common: 1.5, magic: 3, rare: 5, unique: 8 })[it.rarity];
  onGrind?: (pigment: number, name: string) => void;

  private grindSel(): void {
    const it = this.selected();
    const s = this.sel;
    if (!it || !s) return;
    if ((it.rarity === 'rare' || it.rarity === 'unique') && this.sureT <= 0) {
      this.sureT = 2.5;
      this.showDetail();
      return;
    }
    this.sureT = 0;
    if (s.where === 'equip') delete save.equip[s.slot];
    else save.bag.splice(s.index, 1);
    this.sel = null;
    sfx.inkstone();
    this.onGrind?.(this.grindGain(it), itemName(it));
    this.changed();
  }

  update(dt: number): void {
    if (!this.active) return;
    if (this.sureT > 0) {
      this.sureT -= dt;
      if (this.sureT <= 0) this.showDetail();
    }
    const inp = this.input;
    if (inp.keyPressed('KeyI') || inp.pressed('back')) { this.close(); return; }
    if (inp.keyPressed('KeyM')) { this.close(); this.onTab?.('map'); return; }
    if (inp.keyPressed('KeyJ')) { this.close(); this.onTab?.('journal'); return; }
    if (inp.keyPressed('KeyC')) { this.close(); this.onTab?.('tree'); return; }
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
    for (const tb of this.tabs) {
      if (tb.id !== 'bag' && Math.abs(x - tb.x) < tb.w / 2 && Math.abs(y - tb.y) < tb.h / 2) { this.close(); this.onTab?.(tb.id); return; }
    }
    for (const b of this.buttons) {
      if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2) { b.act(); return; }
    }
    const half = this.c / 2 + 4;
    for (let i = 0; i < SLOTS.length; i++) {
      const cl = this.equipCells[i];
      if (Math.abs(x - cl.x) < half && Math.abs(y - cl.y) < half) {
        this.sel = save.equip[SLOTS[i]] ? { where: 'equip', slot: SLOTS[i] } : null;
        this.sureT = 0;
        sfx.ui();
        this.showDetail();
        return;
      }
    }
    for (let k = 0; k < this.cells.length; k++) {
      const cl = this.cells[k];
      if (Math.abs(x - cl.x) < half && Math.abs(y - cl.y) < half) {
        this.sel = save.bag[k] ? { where: 'bag', index: k } : null;
        this.sureT = 0;
        sfx.ui();
        this.showDetail();
        return;
      }
    }
  }
}
