/**
 * The peddler's stall: buy goods (gourd sips, pigment, a map of secrets, forgetting the strokes,
 * a few pieces of gear that change after each rest at a shrine) and sell what the bag carries.
 */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { Painter, INK } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { roughen, washPoly } from '../gfx/wash';
import { stroke } from '../gfx/brush';
import { brushText } from '../gfx/text';
import { maskSprite } from './mask';
import { save, writeSave, gearChanged } from '../game/progression';
import { Item, makeItem, itemName, itemLines, RARITY_RGB, Rarity } from '../game/items';
import { Rng } from '../gfx/rng';
import { lang } from '../i18n';
import { sfx } from '../audio/sfx';

const tr = (fr: string, en: string) => (lang === 'fr' ? fr : en);

interface Good { key: string; name: string; text: string; price: number; item?: Item; can: () => boolean; buy: () => void }

export function sellPrice(it: Item): number {
  const k: Record<Rarity, [number, number]> = { common: [3, 1], magic: [10, 3], rare: [30, 6], unique: [90, 0] };
  const [a, b] = k[it.rarity];
  return a + b * it.level;
}

function buyPrice(it: Item): number {
  return it.rarity === 'rare' ? 110 + it.level * 18 : it.rarity === 'unique' ? 400 : 40 + it.level * 8;
}

/** The current stock of gear (changes with save.shopSeed). */
function stock(): Item[] {
  const r = new Rng(save.shopSeed * 7919 + save.level * 31);
  const lv = Math.max(1, Math.min(10, save.level - 1));
  const out: Item[] = [];
  for (let i = 0; i < 4; i++) out.push(makeItem(Math.max(1, Math.min(10, lv + r.int(-1, 1))), i === 3 ? 'rare' : 'magic', r.int(1, 1e9)));
  return out;
}

export class Shop {
  active = false;
  private sprites: Sprite[] = [];
  private dyn: Sprite[] = [];
  private buttons: { x: number; y: number; w: number; h: number; act: () => void }[] = [];
  private pw = 0;
  private ph = 0;
  private sel: { side: 'buy' | 'sell'; i: number } | null = null;
  private btnFrame: Frame | null = null;
  private goods: Good[] = [];
  /** What the shop can do in the world (refill, respec, reveal…). */
  hooks: { refillPigment?: () => void; respec?: () => void; pigmentOk?: () => boolean } = {};
  merchant = '';

  constructor(private r: Renderer, private input: Input) {}

  private add(s: Sprite, scene: 'pig' | 'acc', order = LAYER.ui + 31): Sprite {
    s.mesh.renderOrder = order;
    (scene === 'pig' ? this.r.uiPig : this.r.uiAcc).add(s.mesh);
    return s;
  }

  private put(str: string, x: number, y: number, size: number, o: { bold?: boolean; italic?: boolean; color?: [number, number, number]; maxWidth?: number; align?: 'left' | 'center' } = {}): { s: Sprite; w: number; h: number } {
    const art = brushText(str, { size, ppu: 1.4, weight: o.bold ? 700 : 400, italic: o.italic, color: o.color, maxWidth: o.maxWidth, align: o.align ?? 'left', lineHeight: 1.25 });
    const s = this.add(new Sprite(art), o.color ? 'acc' : 'pig', LAYER.ui + 33);
    s.setPos(o.align === 'center' ? x : x + art.w / 2, y - art.h / 2);
    this.dyn.push(s);
    return { s, w: art.w, h: art.h };
  }

  open(merchant: string): void {
    if (this.active) return;
    this.active = true;
    this.merchant = merchant;
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
    const edge = roughen([[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, ph / 2], [-pw / 2, ph / 2]], 8, 271, 20);
    p.reserve(() => edge.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 0.97);
    p.glaze();
    washPoly(p, edge, { pig: INK, density: 0.03, soft: 0.6, seed: 272 });
    stroke(p, [[-pw / 2 + 20, ph / 2 - 8], [pw / 2 - 20, ph / 2 - 12]], { width: 8, load: 0.85, dry: 0.5, seed: 273, taperStart: 0.03, taperEnd: 0.12 });
    stroke(p, [[-pw / 2 + 30, ph / 2 - 92], [pw / 2 - 30, ph / 2 - 95]], { width: 3, load: 0.35, dry: 0.7, seed: 274 });
    stroke(p, [[-30, ph / 2 - 110], [-34, -ph / 2 + 200]], { width: 3, load: 0.3, dry: 0.7, seed: 275 });
    stroke(p, [[-pw / 2 + 30, -ph / 2 + 8], [pw / 2 - 30, -ph / 2 + 6]], { width: 5, load: 0.5, dry: 0.7, seed: 276 });
    this.sprites.push(this.add(new Sprite(frameFrom(p)), 'pig', LAYER.ui + 30));
    const m = maskSprite(r, pw + 160, ph + 160);
    m.mesh.renderOrder = LAYER.ui + 30;
    this.sprites.push(m, maskSprite(r, pw + 30, ph + 30, 'cover'));
    const x = new Painter(80, 80, 1, -40, -40);
    x.glaze();
    stroke(x, [[-22, -22], [22, 22]], { width: 7, load: 1, dry: 0.4, seed: 56 });
    stroke(x, [[22, -22], [-22, 22]], { width: 7, load: 1, dry: 0.4, seed: 57 });
    const xs = this.add(new Sprite(frameFrom(x)), 'pig', LAYER.ui + 33);
    xs.setPos(pw / 2 - 52, ph / 2 - 50);
    this.sprites.push(xs);
    this.refresh();
  }

  private makeGoods(): Good[] {
    const g: Good[] = [];
    const gm = save.gourdMax;
    if (gm < 6) g.push({ key: 'gourd+', name: tr('Une gourde plus grande', 'A bigger gourd'), text: tr(`Une gorgée de plus (${gm} → ${gm + 1}).`, `One more sip (${gm} → ${gm + 1}).`), price: 80 * (gm - 1), can: () => true, buy: () => { save.gourdMax++; save.gourd++; } });
    g.push({ key: 'refill', name: tr('Remplir la gourde', 'Fill the gourd'), text: tr('Toutes les gorgées, tout de suite.', 'Every sip, right now.'), price: 12, can: () => save.gourd < save.gourdMax, buy: () => { save.gourd = save.gourdMax; } });
    if (this.hooks.pigmentOk?.()) g.push({ key: 'pigment', name: tr('Pigment frais', 'Fresh pigment'), text: tr('Ta réserve de couleur pleine.', 'Your colour reserve, full.'), price: 15, can: () => true, buy: () => this.hooks.refillPigment?.() });
    if (!save.perks.secretMap) g.push({ key: 'map', name: tr('Carte des secrets', 'Map of secrets'), text: tr('Les coffres et les clairières cachées apparaissent sur ta carte.', 'Chests and hidden glades appear on your map.'), price: 120, can: () => true, buy: () => { save.perks.secretMap = 1; } });
    const respec = 60 + save.level * 5;
    g.push({ key: 'respec', name: tr('Encens de l’oubli', 'Incense of forgetting'), text: tr('Oublie tes traits appris : tous les points reviennent.', 'Forget the strokes you learnt: every point comes back.'), price: respec, can: () => Object.keys(save.skills).length > 0, buy: () => this.hooks.respec?.() });
    const bought = save.shopBought ?? [];
    stock().forEach((it, i) => {
      if (bought.includes(i)) return;
      g.push({ key: 'item' + i, name: itemName(it), text: itemLines(it).join('\n'), price: buyPrice(it), item: it, can: () => save.bag.length < 16, buy: () => { save.bag.push(it); save.newItems = true; save.shopBought = [...(save.shopBought ?? []), i]; } });
    });
    return g;
  }

  private refresh(): void {
    for (const s of this.dyn) s.dispose();
    this.dyn = [];
    this.buttons = [];
    const pw = this.pw, ph = this.ph;
    this.goods = this.makeGoods();
    this.put(this.merchant, -pw / 2 + 56, ph / 2 - 28, 36, { bold: true });
    this.put(`◎ ${save.coins}`, pw / 2 - 300, ph / 2 - 30, 34, { bold: true, color: [0.69, 0.48, 0.2] });
    // goods
    const x0 = -pw / 2 + 60, rowH = Math.min(46, (ph - 330) / 9);
    let y = ph / 2 - 120;
    this.put(tr('Marchandises', 'Goods'), x0, y, 26, { italic: true });
    y -= 44;
    this.goods.forEach((gd, i) => {
      const on = this.sel?.side === 'buy' && this.sel.i === i;
      const col = gd.item ? RARITY_RGB[gd.item.rarity] : on ? [0.76, 0.23, 0.17] as [number, number, number] : undefined;
      const t = this.put(gd.name, x0, y, 25, { bold: on, color: col, maxWidth: pw / 2 - 260 });
      this.put(String(gd.price), -100, y, 25, { bold: true });
      if (!gd.can() || gd.price > save.coins) for (const s of this.dyn.slice(-2)) s.opacity = 0.45;
      this.buttons.push({ x: (x0 - 60) / 2, y: y - t.h / 2, w: pw / 2 - 40, h: rowH, act: () => { this.sel = { side: 'buy', i }; sfx.ui(); this.refresh(); } });
      y -= rowH;
    });
    // the bag, to sell
    const x1 = 10;
    let yy = ph / 2 - 120;
    this.put(tr('Ton sac (vendre)', 'Your bag (sell)'), x1, yy, 26, { italic: true });
    yy -= 44;
    const bagH = Math.min(36, (ph - 330) / 16);
    save.bag.forEach((it, i) => {
      const on = this.sel?.side === 'sell' && this.sel.i === i;
      const t = this.put(`${itemName(it)}${on ? '  ◂' : ''}`, x1, yy, 22, { color: RARITY_RGB[it.rarity], maxWidth: pw / 2 - 240 });
      this.put(String(sellPrice(it)), pw / 2 - 160, yy, 22, { bold: true });
      this.buttons.push({ x: pw / 4, y: yy - t.h / 2, w: pw / 2 - 40, h: bagH, act: () => { this.sel = { side: 'sell', i }; sfx.ui(); this.refresh(); } });
      yy -= bagH;
    });
    if (!save.bag.length) this.put(tr('Rien à vendre.', 'Nothing to sell.'), x1, yy, 22, { italic: true });
    // the chosen line, at the bottom
    const by = -ph / 2 + 110;
    if (this.sel?.side === 'buy') {
      const gd = this.goods[this.sel.i];
      if (gd) {
        this.put(gd.text, -pw / 2 + 60, by + 60, 22, { italic: true, maxWidth: pw - 520 });
        const ok = gd.can() && gd.price <= save.coins;
        this.button(ok ? tr(`Acheter · ${gd.price}`, `Buy · ${gd.price}`) : gd.price > save.coins ? tr('Pas assez de pièces', 'Not enough coins') : tr('Inutile', 'No need'), pw / 2 - 210, by, () => {
          if (!ok) { sfx.empty(); return; }
          save.coins -= gd.price;
          gd.buy();
          writeSave();
          gearChanged();
          sfx.uiConfirm();
          this.sel = null;
          this.refresh();
        }, 330);
      }
    } else if (this.sel?.side === 'sell') {
      const it = save.bag[this.sel.i];
      if (it) {
        this.put(itemLines(it).join('   ·   '), -pw / 2 + 60, by + 60, 22, { italic: true, maxWidth: pw - 520 });
        this.button(tr(`Vendre · ${sellPrice(it)}`, `Sell · ${sellPrice(it)}`), pw / 2 - 210, by, () => {
          save.coins += sellPrice(it);
          save.bag.splice(this.sel!.i, 1);
          writeSave();
          sfx.clink();
          this.sel = null;
          this.refresh();
        }, 330);
      }
    } else {
      this.put(tr('Touche une ligne pour la regarder. Les marchandises changent chaque fois que tu te reposes à un sanctuaire.', 'Tap a line to look at it. The goods change each time you rest at a shrine.'), -pw / 2 + 60, by + 40, 22, { italic: true, maxWidth: pw - 140 });
    }
  }

  private button(label: string, x: number, y: number, act: () => void, width = 240): void {
    if (!this.btnFrame) {
      const p = new Painter(280, 100, 1, -140, -50);
      p.glaze();
      washPoly(p, roughen([[-120, -34], [120, -34], [120, 34], [-120, 34]], 4, 59, 12), { pig: INK, density: 0.1, soft: 0.2, edge: 0.6, seed: 59 });
      stroke(p, [[-118, -30], [0, -34], [118, -28]], { width: 5, load: 0.8, dry: 0.5, seed: 60 });
      this.btnFrame = frameFrom(p);
    }
    const bg = this.add(new Sprite(this.btnFrame), 'pig', LAYER.ui + 32);
    bg.setPos(x, y);
    bg.mesh.scale.set(width / 240, 0.9, 1);
    this.dyn.push(bg);
    this.put(label, x, y + 18, 26, { bold: true, align: 'center' });
    this.buttons.push({ x, y, w: width, h: 70, act });
  }

  update(): void {
    if (!this.active) return;
    const inp = this.input;
    if (inp.pressed('back')) { this.close(); return; }
    for (const [sx, sy] of inp.orderTaps) {
      const [ux, uy] = inp.toUi(sx, sy);
      this.tap(ux, uy);
      if (!this.active) break;
    }
    inp.consume();
  }

  private tap(x: number, y: number): void {
    const pw = this.pw, ph = this.ph;
    if (Math.abs(x) > pw / 2 || Math.abs(y) > ph / 2 || Math.hypot(x - (pw / 2 - 52), y - (ph / 2 - 50)) < 50) { this.close(); return; }
    // buttons first (the big one at the bottom), then lines
    const bs = [...this.buttons].reverse();
    for (const b of bs) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2) { b.act(); return; }
  }
}
