/**
 * Secrets of the open world: chests, and the places only a stroke can open — ink thorns the child
 * slips through as mist, bamboo thickets cut by a whirl, sealed doors whose braziers want gold
 * lightning, ponds that hold an islet once frozen by indigo.
 */
import type { Game } from './game';
import type { World } from './world';
import { Entity, HitInfo } from './entity';
import { Prop } from './objects';
import { Pickup } from './pickups';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../gfx/sprite';
import { Painter, INK, VERMILION, PIG_B, mixPig } from '../gfx/paint';
import { washPoly, noisyOutline, roughen, washBlob } from '../gfx/wash';
import { stroke } from '../gfx/brush';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { save, writeSave } from './progression';
import { dropLoot } from './loot';
import { makeItem, Rarity } from './items';
import { ItemDrop, takeItem } from './loot';
import { sfx } from '../audio/sfx';
import { lang } from '../i18n';
import type { ArtCache } from '../world/artCache';
import { PONDS, GLADES, CHESTS, ISLETS } from '../world/layout';
import { L, STELES, NAMES } from '../i18n/lore';
import { Stele } from './npc';
import { giveXp } from './rewards';

const tr = (fr: string, en: string) => (lang === 'fr' ? fr : en);

// ---------- art ----------

let chestArt: { shut: Frame; open: Frame; red: Frame } | null = null;
function chestFrames() {
  if (chestArt) return chestArt;
  const mk = (open: boolean) => {
    const p = new Painter(1.6, 1.6, SPRITE_PPU, -0.8, -0.2);
    const body = roughen([[-0.5, 0], [0.5, 0], [0.5, 0.5], [-0.5, 0.5]], 0.01, 31, 0.06);
    p.reserve(() => body.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
    p.glaze();
    washPoly(p, body, { pig: mixPig(INK, PIG_B, 0.35), density: 0.45, soft: 0.05, edge: 0.8, seed: 31 });
    stroke(p, [...body, body[0]], { width: 0.05, load: 0.9, dry: 0.4, seed: 32 });
    const lid = open
      ? roughen([[-0.52, 0.5], [0.52, 0.5], [0.44, 1.0], [-0.44, 1.0]], 0.01, 33, 0.06)
      : roughen([[-0.54, 0.5], [0.54, 0.5], [0.5, 0.78], [0, 0.86], [-0.5, 0.78]], 0.01, 33, 0.06);
    washPoly(p, lid, { pig: INK, density: open ? 0.35 : 0.7, soft: 0.05, edge: 0.7, seed: 34 });
    for (const x of [-0.3, 0.3]) stroke(p, [[x, 0.02], [x, 0.5]], { width: 0.05, load: 0.9, seed: 35 + x * 10 });
    if (open) washPoly(p, [[-0.42, 0.5], [0.42, 0.5], [0.4, 0.58], [-0.4, 0.58]], { pig: INK, density: 0.9, soft: 0.05, seed: 36 });
    return frameFrom(p);
  };
  const r = new Painter(1.6, 1.6, SPRITE_PPU, -0.8, -0.2);
  r.glaze();
  washPoly(r, roughen([[-0.1, 0.38], [0.1, 0.38], [0.1, 0.62], [-0.1, 0.62]], 0.01, 37, 0.04), { pig: VERMILION, density: 0.95, soft: 0.05, seed: 37 });
  chestArt = { shut: mk(false), open: mk(true), red: frameFrom(r) };
  return chestArt;
}

let thicketArt: Frame | null = null;
function thicketFrame(): Frame {
  if (thicketArt) return thicketArt;
  const p = new Painter(3.4, 4.2, SPRITE_PPU * 0.7, -1.7, -0.3);
  p.glaze();
  washBlob(p, 0, 0.1, 1.5, 0.4, { pig: INK, density: 0.15, soft: 0.6, seed: 40 });
  for (let i = 0; i < 14; i++) {
    const x = -1.3 + (i / 13) * 2.6 + Math.sin(i * 7.1) * 0.1;
    const h = 2.6 + Math.sin(i * 3.3) * 0.8;
    const pts: [number, number][] = [];
    for (let k = 0; k <= 6; k++) pts.push([x + Math.sin(k * 0.6 + i) * 0.06, (k / 6) * h]);
    stroke(p, pts, { width: 0.11, load: 0.85, dry: 0.3, seed: 41 + i, taperEnd: 0.6 });
    for (let k = 1; k < 5; k++) stroke(p, [[x - 0.07, (k / 5) * h], [x + 0.07, (k / 5) * h + 0.02]], { width: 0.06, load: 1, seed: 60 + i * 5 + k });
    stroke(p, [[x, h * 0.8], [x + 0.4 * (i % 2 ? 1 : -1), h * 0.9]], { width: 0.12, load: 0.8, seed: 90 + i, taperStart: 0.2, taperEnd: 0.9 });
  }
  thicketArt = frameFrom(p);
  return thicketArt;
}

let doorArt: Frame | null = null;
function doorFrame(): Frame {
  if (doorArt) return doorArt;
  const p = new Painter(3, 3.4, SPRITE_PPU * 0.8, -1.5, -0.2);
  const slab = roughen([[-1.1, 0], [1.1, 0], [1.0, 2.8], [-1.0, 2.8]], 0.02, 70, 0.1);
  p.reserve(() => slab.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
  p.glaze();
  washPoly(p, slab, { pig: mixPig(INK, PIG_B, 0.3), density: 0.4, soft: 0.05, edge: 0.9, seed: 70, blooms: 1 });
  stroke(p, [...slab, slab[0]], { width: 0.06, load: 0.9, dry: 0.5, seed: 71 });
  const ring: [number, number][] = [];
  for (let k = 0; k <= 26; k++) { const a = (k / 26) * Math.PI * 1.9 + 0.4; ring.push([Math.cos(a) * 0.55, 1.5 + Math.sin(a) * 0.55]); }
  stroke(p, ring, { width: 0.08, load: 0.9, dry: 0.4, seed: 72 });
  doorArt = frameFrom(p);
  return doorArt;
}

let brazierArt: { pig: Frame; flame: Frame } | null = null;
function brazierFrames() {
  if (brazierArt) return brazierArt;
  const p = new Painter(1.4, 1.6, SPRITE_PPU, -0.7, -0.2);
  p.glaze();
  washPoly(p, roughen([[-0.12, 0], [0.12, 0], [0.1, 0.5], [-0.1, 0.5]], 0.01, 80, 0.05), { pig: INK, density: 0.6, soft: 0.05, seed: 80 });
  washPoly(p, roughen([[-0.42, 0.5], [0.42, 0.5], [0.32, 0.78], [-0.32, 0.78]], 0.01, 81, 0.05), { pig: INK, density: 0.75, soft: 0.05, seed: 81 });
  const f = new Painter(1.4, 1.6, SPRITE_PPU, -0.7, -0.2);
  f.over();
  f.ctx.fillStyle = 'rgba(232,180,64,0.95)';
  f.ctx.beginPath();
  f.ctx.moveTo(-0.24, 0.78); f.ctx.quadraticCurveTo(-0.2, 1.1, 0, 1.4); f.ctx.quadraticCurveTo(0.2, 1.1, 0.24, 0.78); f.ctx.closePath();
  f.ctx.fill();
  brazierArt = { pig: frameFrom(p), flame: frameFrom(f) };
  return brazierArt;
}

let iceArt = new Map<number, Frame>();
function iceFrame(i: number, rx: number, ry: number): Frame {
  let f = iceArt.get(i);
  if (f) return f;
  const p = new Painter(rx * 2 + 1, ry * 2 + 1, 24, -rx - 0.5, -ry - 0.5);
  p.over();
  const o = noisyOutline(0, 0, rx + 0.1, ry + 0.1, 0.06, 900 + i);
  p.ctx.fillStyle = 'rgba(196,214,232,0.82)';
  p.ctx.beginPath();
  o.forEach((q, k) => (k === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
  p.ctx.closePath();
  p.ctx.fill();
  p.ctx.strokeStyle = 'rgba(51,84,148,0.55)';
  p.ctx.lineWidth = 0.05;
  for (let k = 0; k < 7; k++) {
    const a = k * 0.9 + i, l = 0.4 + (k % 3) * 0.3;
    p.ctx.beginPath(); p.ctx.moveTo(Math.cos(a) * rx * 0.3, Math.sin(a) * ry * 0.3); p.ctx.lineTo(Math.cos(a) * rx * (0.3 + l * 0.5), Math.sin(a) * ry * (0.3 + l * 0.5)); p.ctx.stroke();
  }
  f = frameFrom(p);
  iceArt.set(i, f);
  return f;
}

let isletArt: Frame | null = null;
function isletFrame(): Frame {
  if (isletArt) return isletArt;
  const p = new Painter(3, 1.8, SPRITE_PPU / 2, -1.5, -0.9);
  const o = noisyOutline(0, 0, 1.2, 0.6, 0.2, 95);
  p.reserve(() => o.forEach((q, k) => (k === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
  p.glaze();
  washPoly(p, o, { pig: mixPig(INK, PIG_B, 0.3), density: 0.25, soft: 0.1, edge: 0.8, seed: 95 });
  isletArt = frameFrom(p);
  return isletArt;
}

// ---------- entities ----------

/** A chest: open it (walk into it, or E) for loot. */
export class Chest extends Entity {
  private body!: Sprite;
  private seal!: Sprite;
  opened = false;
  onOpen?: () => void;
  constructor(readonly id: number, x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.5;
    this.label = 'chest';
    this.interactive = true;
    this.promptH = 1.5;
  }
  init(): void {
    const f = chestFrames();
    this.opened = save.chests.includes(this.id);
    this.body = this.addSprite(new Sprite(this.opened ? f.open : f.shut));
    this.seal = this.addSprite(new Sprite(f.red), true);
    for (const s of this.sprites) { s.setPos(this.x, this.y); s.mesh.renderOrder = ySort(this.y); }
    this.seal.opacity = this.opened ? 0 : 1;
    if (this.opened) this.interactive = false;
  }
  interact(): void {
    this.open();
  }
  open(): void {
    if (this.opened) return;
    this.opened = true;
    this.interactive = false;
    save.chests.push(this.id);
    writeSave();
    this.body.setTexture(chestFrames().open.tex);
    this.seal.opacity = 0;
    sfx.uiConfirm();
    this.world.vfx.ripple(this.x, this.y, 1);
    for (let i = 0; i < 5; i++) this.world.vfx.splat(this.x, this.y + 0.6, (i / 5) * Math.PI * 2, 5, 0.8, 'red');
    this.onOpen?.();
  }
  update(): void {
    if (!this.opened && this.world.player.state !== 'dead' && Math.hypot(this.world.player.x - this.x, this.world.player.y - this.y) < 0.9) this.open();
  }
}

/** Bamboo grown thick across a way: only a whirling stroke cuts it. */
export class Thicket extends Entity {
  private hintT = 0;
  onCut?: () => void;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 1.3;
    this.solid = true;
    this.weight = Infinity;
    this.team = 'enemy';
    this.hp = 1;
    this.label = 'thicket';
  }
  init(): void {
    const s = this.addSprite(new Sprite(thicketFrame()));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = ySort(this.y);
  }
  update(dt: number): void {
    this.hintT -= dt;
  }
  onHit(h: HitInfo): boolean {
    if (h.kind !== 'whirl') {
      sfx.clink();
      if (this.hintT <= 0) {
        this.hintT = 6;
        this.onBlocked?.();
      }
      return false;
    }
    sfx.cut();
    sfx.strike(1);
    for (let i = 0; i < 10; i++) this.world.vfx.splat(this.x + (Math.random() - 0.5) * 2, this.y + 1 + Math.random() * 1.5, Math.random() * 6.3, 6, 1);
    this.world.shake(0.15, 0.2);
    this.dead = true;
    this.onCut?.();
    this.destroy();
    return true;
  }
  onBlocked?: () => void;
}

/** A brazier by a sealed door: gold lightning lights it. */
export class Brazier extends Entity {
  lit = false;
  private flame!: Sprite;
  private t = 0;
  onLit?: () => void;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.solid = true;
    this.weight = Infinity;
    this.label = 'brazier';
  }
  init(w: World): void {
    const f = brazierFrames();
    const s = this.addSprite(new Sprite(f.pig));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = ySort(this.y);
    this.flame = new Sprite(f.flame);
    this.flame.setPos(this.x, this.y);
    this.flame.mesh.renderOrder = ySort(this.y) + 1;
    this.flame.opacity = 0;
    w.r.sceneAcc.add(this.flame.mesh);
    this.sprites.push(this.flame);
  }
  light(): void {
    if (this.lit) return;
    this.lit = true;
    sfx.fire();
    this.world.vfx.glowAt(this.x, this.y + 1, 2.5, 0.3);
    this.onLit?.();
  }
  update(dt: number): void {
    this.t += dt;
    this.flame.opacity = this.lit ? 0.85 + Math.sin(this.t * 13) * 0.15 : 0;
    this.flame.mesh.scale.set(1, this.lit ? 1 + Math.sin(this.t * 9) * 0.08 : 1, 1);
    if (this.lit) this.world.vfx.glowAt(this.x, this.y + 1.1, 2.2, 0.05);
  }
}

// ---------- the world's secrets ----------

export function pondColliders(w: World, i: number): void {
  const p = PONDS[i];
  const n = Math.max(2, Math.round(p.rx / p.ry * 1.5));
  for (let k = 0; k < n; k++) {
    const tt = n === 1 ? 0 : k / (n - 1) - 0.5;
    w.addCollider({ kind: 'circle', x: p.x + tt * (p.rx * 1.3), y: p.y, r: p.ry * 0.85 }, 'pond' + i);
  }
}

function chestLoot(g: Game, c: Chest, rarity: Rarity, level: number): void {
  const w = g.world;
  const it = makeItem(Math.max(1, Math.min(10, level)), rarity);
  const d = w.add(new ItemDrop(c.x, c.y - 0.6, it));
  d.onTake = (item) => takeItem(g, item);
  if (rarity !== 'unique') dropLoot(g, c.x + 0.4, c.y - 0.4, 'normal', level);
  for (let i = 0; i < 3; i++) w.add(new Pickup(c.x, c.y - 0.3, i === 0 ? 'life' : 'ink', i === 0 ? 2 : 8));
  for (let i = 0; i < 4; i++) w.add(new Pickup(c.x, c.y - 0.3, 'coin', 4 + level * 2));
  giveXp(g, 15 + level * 4);
}

/** Build every secret of the open world (call once from its room builder). */
export function buildSecrets(g: Game, add: <T extends Entity>(e: T) => T, A: ArtCache): void {
  const w = g.world;
  const hint = (key: string, fr: string, en: string) => g.hintOnce(key, tr(fr, en), 4.5);
  // free chests in the corners of the world
  for (const c of CHESTS) {
    const ch = add(new Chest(c.id, c.x, c.y));
    ch.onOpen = () => chestLoot(g, ch, c.rarity, c.level);
  }
  // glades behind thorns, thickets and sealed doors
  for (const gl of GLADES) {
    const ring: [number, number][] = [];
    const n = Math.max(10, Math.round(gl.r * 2.6));
    const gapA = gl.gap, gapW = 2.6 / gl.r;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      ring.push([gl.x + Math.cos(a) * gl.r, gl.y + Math.sin(a) * gl.r * 0.85]);
    }
    const inGap = (a: number) => Math.abs(Math.atan2(Math.sin(a - gapA), Math.cos(a - gapA))) < gapW / 2;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const thorny = gl.gate === 'thorn';
      if (!thorny && (inGap(a0) || inGap(a1))) continue;
      const [ax, ay] = ring[k], [bx, by] = ring[(k + 1) % n];
      w.addCollider({ kind: 'seg', ax, ay, bx, by, r: 0.55, tag: thorny ? 'thorn' : undefined }, 'glade' + gl.id);
      const art = gl.gate === 'thorn' ? A.brambles : gl.gate === 'thicket' ? A.bamboo[k % A.bamboo.length] : A.bigRock[k % A.bigRock.length];
      add(new Prop(art, ax, ay, 0, false));
    }
    const gx = gl.x + Math.cos(gapA) * gl.r, gy = gl.y + Math.sin(gapA) * gl.r * 0.85;
    if (gl.gate === 'thorn') {
      w.scripts.push(() => {
        const p = w.player;
        if (Math.hypot(p.x - gl.x, (p.y - gl.y) / 0.85) < gl.r + 2.2 && Math.hypot(p.x - gl.x, (p.y - gl.y) / 0.85) > gl.r - 0.5 && !p.misty) {
          hint('thorns', 'Des ronces d’encre, serrées comme un mur. Il faudrait devenir brume pour passer.', 'Ink thorns, tight as a wall. You would have to turn to mist to pass.');
        }
      });
    } else if (gl.gate === 'thicket') {
      const done = save.chests.includes(gl.chest.id);
      if (!done) {
        const th = add(new Thicket(gx, gy));
        th.onBlocked = () => hint('thicket', 'Trop serré pour le pinceau. Un coup tournoyant pourrait trancher ces bambous.', 'Too tight for the brush. A whirling stroke might cut through this bamboo.');
      }
    } else {
      // a sealed slab between two braziers
      const open = save.chests.includes(gl.chest.id);
      const door = open ? null : add(new Prop({ pig: doorFrame() }, gx, gy, 1.2, true));
      // the braziers stand outside, on each side of the way in
      const ox = Math.cos(gapA) * 2.2, oy = Math.sin(gapA) * 2.2;
      const left = add(new Brazier(gx + ox - Math.sin(gapA) * 1.9, gy + oy + Math.cos(gapA) * 1.6));
      const right = add(new Brazier(gx + ox + Math.sin(gapA) * 1.9, gy + oy - Math.cos(gapA) * 1.6));
      if (open) { left.lit = true; right.lit = true; }
      const check = () => {
        if (left.lit && right.lit && door && !door.dead) {
          sfx.wave();
          w.shake(0.25, 0.4);
          for (let i = 0; i < 8; i++) w.vfx.dust(door.x, door.y, 3);
          door.destroy();
          g.hud.showHint(tr('Les deux flammes brûlent : la dalle s’enfonce dans la terre.', 'Both flames burn: the slab sinks into the earth.'), 3.5);
        }
      };
      left.onLit = check;
      right.onLit = check;
      w.onBolt.push((x, y, r) => {
        for (const b of [left, right]) if (!b.lit && Math.hypot(b.x - x, b.y - y) < r + 0.8) b.light();
      });
      w.scripts.push(() => {
        const p = w.player;
        if (door && !door.dead && Math.hypot(p.x - gx, p.y - gy) < 4.5) hint('braziers', 'Une dalle scellée entre deux braseros froids. La foudre de l’or pourrait les rallumer.', 'A sealed slab between two cold braziers. Gold lightning might light them.');
      });
    }
    const ch = add(new Chest(gl.chest.id, gl.x, gl.y - 0.4));
    ch.onOpen = () => chestLoot(g, ch, gl.chest.rarity, gl.chest.level);
    if (gl.stele !== undefined) {
      const si = gl.stele;
      const st = add(new Stele(si, gl.x + 1.6, gl.y + 0.6));
      st.read = save.steles.includes(si);
      st.onRead = () => g.talk({ name: `${L(NAMES.stele)}` }, [L(STELES[si])], () => {
        if (!save.steles.includes(si)) { save.steles.push(si); writeSave(); giveXp(g, 25); }
        st.read = true;
      });
    }
  }
  // islets in ponds: reachable once indigo freezes the water
  for (const is of ISLETS) {
    const pd = PONDS[is.pond];
    const islet = new Sprite(isletFrame());
    islet.setPos(pd.x, pd.y);
    islet.mesh.renderOrder = LAYER.groundDetail + 5;
    w.r.scenePig.add(islet.mesh);
    w.cleanups.push(() => islet.dispose());
    const ch = add(new Chest(is.chest.id, pd.x, pd.y + 0.2));
    ch.onOpen = () => chestLoot(g, ch, is.chest.rarity, is.chest.level);
    const ice = new Sprite(iceFrame(is.pond, pd.rx, pd.ry));
    ice.setPos(pd.x, pd.y);
    ice.mesh.renderOrder = LAYER.groundDetail + 4;
    ice.opacity = 0;
    w.r.sceneAcc.add(ice.mesh);
    w.cleanups.push(() => ice.dispose());
    let frozen = 0;
    w.onFreeze.push((x, y, r) => {
      if (((x - pd.x) / (pd.rx + r + 0.4)) ** 2 + ((y - pd.y) / (pd.ry + r + 0.4)) ** 2 > 1) return;
      if (frozen <= 0) {
        w.removeColliders('pond' + is.pond);
        sfx.clink();
        hint('ice', 'L’indigo a gelé l’étang. Vite, avant qu’il ne fonde !', 'Indigo froze the pond. Quick, before it melts!');
      }
      frozen = 14;
    });
    w.scripts.push((dt) => {
      if (frozen <= 0) {
        if (!ch.opened && Math.hypot(w.player.x - pd.x, w.player.y - pd.y) < pd.rx + 4) hint('islet', 'Un coffre, au milieu de l’étang. Si seulement l’eau tenait sous les pieds…', 'A chest in the middle of the pond. If only the water would hold…');
        return;
      }
      frozen -= dt;
      ice.opacity = Math.min(1, frozen / 2.5);
      if (frozen <= 0) {
        pondColliders(w, is.pond);
        const p = w.player;
        const dx = p.x - pd.x, dy = p.y - pd.y;
        if ((dx / pd.rx) ** 2 + (dy / pd.ry) ** 2 < 1) {
          // the ice gives way: back to the bank, soaked
          const a = Math.atan2(dy / pd.ry, dx / pd.rx);
          p.x = pd.x + Math.cos(a) * (pd.rx + 1.2);
          p.y = pd.y + Math.sin(a) * (pd.ry + 1.2);
          p.hp = Math.max(1, p.hp - 1);
          sfx.splash();
          w.vfx.ripple(p.x, p.y, 1.2);
        }
      }
    });
  }
}
