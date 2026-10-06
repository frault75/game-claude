/** Items on the ground: a little painting with its rarity's seal; walk over it to take it. */
import { Entity } from './entity';
import type { World } from './world';
import type { Game } from './game';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../gfx/sprite';
import { Painter, LIGHT } from '../gfx/paint';
import { brushText } from '../gfx/text';
import { itemArt } from '../gfx/gen/itemArt';
import { Item, Rarity, RARITY_RGB, makeItem, rollRarity, itemName } from './items';
import { save, writeSave, BAG_SIZE, gearChanged } from './progression';
import { Rng } from '../gfx/rng';
import { sfx } from '../audio/sfx';
import { lang } from '../i18n';

const sealCache = new Map<Rarity, Frame>();
function sealFrame(r: Rarity): Frame {
  let f = sealCache.get(r);
  if (!f) {
    const p = new Painter(1.2, 1.2, 48, -0.6, -0.3);
    p.over();
    const [cr, cg, cb] = RARITY_RGB[r];
    const g = p.ctx.createRadialGradient(0, 0.05, 0.05, 0, 0.05, 0.5);
    g.addColorStop(0, `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},0.75)`);
    g.addColorStop(1, `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},0)`);
    p.ctx.fillStyle = g;
    p.ctx.beginPath();
    p.ctx.ellipse(0, 0.05, 0.5, 0.22, 0, 0, Math.PI * 2);
    p.ctx.fill();
    f = frameFrom(p);
    sealCache.set(r, f);
  }
  return f;
}

let beamFrame: Frame | null = null;

export class ItemDrop extends Entity {
  private t = 0;
  private vz = 4;
  private label2: Sprite | null = null;
  private fullHintT = 0;
  onTake?: (it: Item) => boolean;

  constructor(x: number, y: number, readonly item: Item) {
    super();
    this.x = x + (Math.random() - 0.5) * 0.8;
    this.y = y + (Math.random() - 0.5) * 0.6;
    this.z = 0.4;
    this.radius = 0.3;
    this.label = 'item';
  }

  init(w: World): void {
    const art = itemArt(this.item.slot, this.item.base, 64);
    const glow = new Sprite(sealFrame(this.item.rarity));
    glow.mesh.renderOrder = LAYER.shadow + 2;
    this.sprites.push(glow);
    w.r.sceneAcc.add(glow.mesh);
    this.addSprite(new Sprite(art.pig));
    this.addSprite(new Sprite(art.red), true);
    if (this.item.rarity === 'rare' || this.item.rarity === 'unique') {
      if (!beamFrame) {
        const p = new Painter(4, 6, 12, -2, -0.5);
        p.glaze();
        p.dab(0, 0.6, 1.6, LIGHT, 0.7, 0);
        beamFrame = frameFrom(p);
      }
      this.addSprite(new Sprite(beamFrame), true);
    }
  }

  update(dt: number): void {
    const w = this.world;
    const p = w.player;
    this.t += dt;
    this.fullHintT -= dt;
    if (this.vz !== 0 || this.z > 0) {
      this.vz -= 14 * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) { this.z = 0; this.vz = Math.abs(this.vz) > 1.5 ? -this.vz * 0.35 : 0; }
    }
    const bob = this.z + Math.sin(this.t * 2.5) * 0.04;
    const [glow, pig, red, beam] = this.sprites;
    glow.setPos(this.x, this.y);
    glow.opacity = 0.7 + Math.sin(this.t * 3) * 0.2;
    for (const s of [pig, red]) {
      s.setPos(this.x - 0.0, this.y + bob - 0.1);
      s.mesh.scale.set(0.7, 0.7, 1);
      s.mesh.renderOrder = ySort(this.y);
    }
    if (beam) { beam.setPos(this.x, this.y); beam.opacity = 0.6 + Math.sin(this.t * 2) * 0.3; }
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    // its name when the child is near
    if (d < 4 && !this.label2) {
      this.label2 = new Sprite(brushText(itemName(this.item), { size: 0.26, ppu: 90, italic: true, weight: this.item.rarity === 'common' ? 400 : 700 }));
      this.label2.mesh.renderOrder = LAYER.weather + 19;
      w.r.scenePig.add(this.label2.mesh);
    }
    if (this.label2) {
      this.label2.setPos(this.x, this.y + 0.9);
      this.label2.opacity = Math.max(0, Math.min(1, (4 - d) / 1.2));
      if (d > 4.5) { this.label2.dispose(); this.label2 = null; }
    }
    if (d < 0.75 && this.t > 0.5 && p.state !== 'dead') {
      if (this.onTake?.(this.item)) this.destroy();
      else if (this.fullHintT <= 0) this.fullHintT = 4;
    }
  }

  dispose(): void {
    super.dispose();
    this.label2?.dispose();
    this.label2 = null;
  }
}

/** Put an item in the bag (or straight on, if that slot is bare). */
export function takeItem(g: Game, it: Item): boolean {
  const name = itemName(it);
  if (!save.equip[it.slot]) {
    save.equip[it.slot] = it;
    gearChanged();
    writeSave();
    sfx.uiConfirm();
    g.hud.showHint(`${lang === 'fr' ? 'Équipé' : 'Equipped'} : ${name}`, 2.5);
    return true;
  }
  if (save.bag.length >= BAG_SIZE) {
    g.hud.showHint(lang === 'fr' ? 'Sac plein — broie des objets (sac en haut à gauche)' : 'Bag full — grind some items (bag, top left)', 3);
    return false;
  }
  save.bag.push(it);
  save.newItems = true;
  writeSave();
  sfx.ui();
  g.world.numbers?.pop(g.player.x, g.player.y + 1.8, name, { size: 0.32, life: 1.4, red: it.rarity === 'unique' });
  return true;
}

/** Drop loot at a spot: how much and how good depends on who fell. */
export function dropLoot(g: Game, x: number, y: number, kind: 'normal' | 'elite' | 'boss', level: number): void {
  const r = new Rng(Math.floor(Math.random() * 1e9));
  const n = kind === 'boss' ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const rarity = kind === 'boss' && i > 0 ? 'magic' : rollRarity(r, kind);
    const it = makeItem(Math.max(1, Math.min(10, Math.round(level))), rarity, r.int(1, 1e9));
    const d = g.world.add(new ItemDrop(x, y, it));
    d.onTake = (item) => takeItem(g, item);
  }
}
