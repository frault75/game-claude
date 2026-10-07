/**
 * Act II's open world, the Rice Terraces: the Misty Pass, the terraced hill and its three sluices,
 * the Reed Village and its people, the Lotus Lake, the Bamboo Grove, the Sky Pagoda's court.
 */
import type { RoomDef } from '../room';
import type { Game } from '../game';
import { Entity } from '../entity';
import { Creature } from '../enemies';
import { Chunks } from '../../world/chunks';
import { TERRACES, T2, T2_ENTRY, T2_PONDS, T2_STREAM, T2_STREAM_HALF, T2_BRIDGE, T2_NORTH, T2_CAMPS, T2_SHRINES, T2_SLUICES, T2_REGIONS, T2_VILLAGE, T2_PAGODA, T2_BASIN, T2_HERMIT, T2_QUEEN, T2_STAIR_LAMPS, T2_JETTY, t2RegionAt } from '../../world/terraces';
import { t2MapSource } from '../../world/t2Map';
import { WORLD } from '../../world/layout';
import type { EnemyKind } from '../../world/layout';
import type { World } from '../world';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../../gfx/sprite';
import { Painter, INK, PIG_A, PIG_B, LIGHT, VERMILION, mixPig } from '../../gfx/paint';
import { washPoly, washBlob, roughen, noisyOutline } from '../../gfx/wash';
import { stroke } from '../../gfx/brush';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { lang } from '../../i18n';
import { L, LL } from '../../i18n/lore';
import { NAMES2, HERON, YU, IDLE2, REGION_LORE2, ACT2_TITLE, SLUICE_UI, BASIN_UI, QUEEN_UI, LAMP_UI } from '../../i18n/lore2';
import { MantisQueen } from '../bosses/mantisQueen';
import { Pickup } from '../pickups';
import { dropLoot } from '../loot';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { save, writeSave } from '../progression';
import { Npc } from '../npc';
import { STEP, setMain } from '../quests';
import { giveXp, onKill, discover } from '../rewards';
import { makeEnemy, sharedArt, sharedStamps, GROUND_DETAIL_PPU, Shrine } from './overworld';
import { runCamps } from '../camps';
import { Events } from '../events';
import { act2Shots } from '../../ui/cinematic';
import type { Choice } from '../../ui/dialog';
import { t } from '../../i18n';

export function t2ShrineSpawn(id: number): [number, number] {
  const s = T2_SHRINES.find((q) => q.id === id) ?? T2_SHRINES[0];
  return [s.x, s.y - 1.6];
}

let sluiceArt: { shut: Frame; open: Frame } | null = null;
function sluiceFrames() {
  if (sluiceArt) return sluiceArt;
  const mk = (open: boolean) => {
    const p = new Painter(3, 3, SPRITE_PPU, -1.5, -0.3);
    p.glaze();
    // two posts and a beam
    for (const x of [-0.9, 0.9]) stroke(p, [[x, 0], [x, 1.9]], { width: 0.14, load: 1, dry: 0.4, seed: 900 + x * 10 });
    stroke(p, [[-1.1, 1.9], [1.1, 1.95]], { width: 0.12, load: 1, seed: 903 });
    // the wheel with its spokes
    const ring: [number, number][] = [];
    for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2; ring.push([Math.cos(a) * 0.6, 1.0 + Math.sin(a) * 0.6]); }
    stroke(p, ring, { width: 0.08, load: 0.9, dry: 0.4, seed: 904 });
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI + (open ? 0.4 : 0); stroke(p, [[Math.cos(a) * 0.6, 1 + Math.sin(a) * 0.6], [-Math.cos(a) * 0.6, 1 - Math.sin(a) * 0.6]], { width: 0.05, load: 0.9, seed: 905 + k }); }
    // the gate below: ink-clogged or open
    washPoly(p, roughen([[-0.7, 0], [0.7, 0], [0.7, open ? 0.15 : 0.5], [-0.7, open ? 0.15 : 0.5]], 0.01, 909, 0.05), { pig: open ? mixPig(INK, PIG_B, 0.6) : INK, density: open ? 0.3 : 0.85, soft: 0.05, seed: 909 });
    return frameFrom(p);
  };
  sluiceArt = { shut: mk(false), open: mk(true) };
  return sluiceArt;
}

/** A sluice of the terraces: touch it, clear the creatures that come out of the ink, the water flows again. */
class Sluice extends Entity {
  private body!: Sprite;
  open = false;
  busy = false;
  onTouch?: () => void;
  constructor(readonly index: number, x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.9;
    this.solid = true;
    this.weight = Infinity;
    this.interactive = true;
    this.label = 'sluice';
    this.promptH = 2.6;
  }
  init(): void {
    this.open = save.sluices.includes(this.index);
    const f = sluiceFrames();
    this.body = this.addSprite(new Sprite(this.open ? f.open : f.shut));
    this.body.setPos(this.x, this.y);
    this.body.mesh.renderOrder = ySort(this.y);
    if (this.open) this.interactive = false;
  }
  interact(): void {
    if (!this.open && !this.busy) this.onTouch?.();
  }
  setOpen(): void {
    this.open = true;
    this.interactive = false;
    this.body.setTexture(sluiceFrames().open.tex);
  }
  update(dt: number): void {
    if (this.open && Math.random() < dt * 3) this.world.vfx.ripple(this.x + (Math.random() - 0.5) * 1.2, this.y - 1 - Math.random() * 3, 0.4);
  }
}

let mouthArt: { flooded: Frame; open: Frame } | null = null;
function mouthFrames() {
  if (mouthArt) return mouthArt;
  const mk = (open: boolean) => {
    const p = new Painter(9, 6.6, SPRITE_PPU / 2, -4.5, -3.3);
    p.glaze();
    // the stone rim of the old cistern
    const rim: [number, number][] = [[-3.4, -2.2], [3.4, -2.2], [3.4, 2.2], [-3.4, 2.2]];
    washPoly(p, roughen(rim, 0.02, 2901, 0.08), { pig: mixPig(INK, PIG_B, 0.4), density: 0.32, soft: 0.05, edge: 0.9, seed: 2901 });
    const inner: [number, number][] = [[-2.7, -1.6], [2.7, -1.6], [2.7, 1.6], [-2.7, 1.6]];
    if (!open) {
      washPoly(p, roughen(inner, 0.02, 2902, 0.06), { pig: INK, density: 0.88, soft: 0.1, edge: 0.6, seed: 2902 });
      washBlob(p, -0.8, 0.4, 1.4, 0.4, { pig: mixPig(INK, PIG_A, 0.6), density: 0.25, soft: 0.6, seed: 2903 });
    } else {
      washPoly(p, roughen(inner, 0.02, 2902, 0.06), { pig: INK, density: 0.45, soft: 0.1, edge: 0.6, seed: 2904 });
      // steps going down from the north rim into the dark
      for (let k = 0; k < 6; k++) {
        const yy = 1.5 - k * 0.42, hw = 1.3 - k * 0.08;
        washPoly(p, [[-hw, yy - 0.36], [hw, yy - 0.36], [hw, yy], [-hw, yy]], { pig: mixPig(INK, PIG_B, 0.4), density: 0.18 + k * 0.12, soft: 0.05, edge: 0.6, seed: 2910 + k });
        stroke(p, [[-hw, yy], [hw, yy]], { width: 0.06, load: 0.85, dry: 0.4, seed: 2920 + k });
      }
      washPoly(p, noisyOutline(0, -1.3, 1.3, 0.35, 0.1, 2930), { pig: INK, density: 0.95, soft: 0.05, seed: 2930 });
    }
    for (let k = 0; k < 4; k++) stroke(p, [rim[k], rim[(k + 1) % 4]], { width: 0.14, load: 0.9, dry: 0.5, seed: 2940 + k, rough: 0.5, taperStart: 0.02, taperEnd: 0.02 });
    for (let k = 0; k < 4; k++) stroke(p, [inner[k], inner[(k + 1) % 4]], { width: 0.08, load: 0.7, dry: 0.5, seed: 2950 + k, taperStart: 0.02, taperEnd: 0.02 });
    return frameFrom(p);
  };
  mouthArt = { flooded: mk(false), open: mk(true) };
  return mouthArt;
}

/** The mouth of the Great Basin: drowned in black water until the sluices are open, then a stair down. */
class BasinMouth extends Entity {
  private s!: Sprite;
  private isOpen = false;
  constructor(x: number, y: number, private openNow: () => boolean) {
    super();
    this.x = x; this.y = y;
    this.label = 'basinMouth';
  }
  init(w: World): void {
    this.isOpen = this.openNow();
    const f = mouthFrames();
    this.s = new Sprite(this.isOpen ? f.open : f.flooded);
    this.s.mesh.renderOrder = LAYER.groundDetail + 15;
    w.r.scenePig.add(this.s.mesh);
    this.sprites.push(this.s);
    this.s.setPos(this.x, this.y);
    if (!this.isOpen) this.wall(w);
  }
  private wall(w: World): void {
    w.addCollider({ kind: 'circle', x: this.x - 1.6, y: this.y, r: 1.7 }, 'basinWater');
    w.addCollider({ kind: 'circle', x: this.x + 1.6, y: this.y, r: 1.7 }, 'basinWater');
  }
  update(): void {
    const w = this.world;
    if (!this.isOpen && this.openNow()) {
      this.isOpen = true;
      this.s.setTexture(mouthFrames().open.tex);
      w.removeColliders('basinWater');
      w.vfx.ripple(this.x, this.y, 3);
      sfx.wave();
    }
    if (!this.isOpen && Math.random() < 0.02) w.vfx.ripple(this.x + (Math.random() - 0.5) * 4, this.y + (Math.random() - 0.5) * 2, 0.5);
  }
}

let lampArt: { cold: Frame; light: Frame; flame: Frame } | null = null;
/** A stone lantern on the pagoda stair: lightning lights it. */
class StairLamp extends Entity {
  lit = false;
  private glow!: Sprite;
  onLit?: () => void;
  constructor(readonly index: number, x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.solid = true;
    this.weight = Infinity;
    this.label = 'stairLamp';
  }
  init(): void {
    if (!lampArt) {
      const p = new Painter(1.6, 2.4, SPRITE_PPU, -0.8, -0.3);
      p.glaze();
      const stone = mixPig(INK, PIG_A, 0.15);
      washPoly(p, roughen([[-0.42, 0], [0.42, 0], [0.32, 0.2], [-0.32, 0.2]], 0.01, 3001, 0.03), { pig: stone, density: 0.5, soft: 0.05, edge: 0.9, seed: 3001 });
      washPoly(p, roughen([[-0.12, 0.2], [0.12, 0.2], [0.12, 0.85], [-0.12, 0.85]], 0.01, 3002, 0.02), { pig: stone, density: 0.45, soft: 0.05, edge: 0.9, seed: 3002 });
      washPoly(p, roughen([[-0.32, 0.85], [0.32, 0.85], [0.32, 1.3], [-0.32, 1.3]], 0.01, 3003, 0.02), { pig: stone, density: 0.5, soft: 0.05, edge: 0.9, seed: 3003 });
      washPoly(p, [[-0.14, 0.95], [0.14, 0.95], [0.14, 1.2], [-0.14, 1.2]], { pig: INK, density: 0.85, soft: 0.05, seed: 3004 });
      washPoly(p, roughen([[-0.6, 1.3], [0.6, 1.3], [0.2, 1.62], [-0.2, 1.62]], 0.01, 3005, 0.03), { pig: stone, density: 0.6, soft: 0.05, edge: 0.9, seed: 3005 });
      p.circle(0, 1.72, 0.1, stone, 0.7);
      const l = new Painter(4, 4, SPRITE_PPU / 4, -2, -1);
      l.glaze();
      l.dab(0, 1.08, 1.8, LIGHT, 0.9, 0);
      l.dab(0, 1.08, 0.2, VERMILION, 0.95, 0.7);
      const c = new Painter(1, 1, SPRITE_PPU / 2, -0.5, 0.55);
      c.over();
      c.ctx.fillStyle = 'rgba(255,196,96,1)';
      c.ctx.beginPath();
      c.ctx.ellipse(0, 1.08, 0.11, 0.1, 0, 0, Math.PI * 2);
      c.ctx.fill();
      lampArt = { cold: frameFrom(p), light: frameFrom(l), flame: frameFrom(c) };
    }
    const s = this.addSprite(new Sprite(lampArt.cold));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = ySort(this.y);
    this.glow = this.addSprite(new Sprite(lampArt.light), true);
    this.glow.setPos(this.x, this.y);
    this.glow.mesh.renderOrder = ySort(this.y) + 1;
    this.glow.opacity = 0;
    this.flame = new Sprite(lampArt.flame);
    this.flame.mesh.renderOrder = ySort(this.y) + 2;
    this.flame.setPos(this.x, this.y);
    this.flame.opacity = 0;
    this.world.r.sceneAcc.add(this.flame.mesh);
    this.sprites.push(this.flame);
  }
  private flame!: Sprite;
  private bright = 0;
  light(): void {
    if (this.lit) return;
    this.lit = true;
    this.world.vfx.glowAt(this.x, this.y + 1.1, 3, 0.5);
    sfx.thunder();
    this.onLit?.();
  }
  update(dt: number): void {
    if (this.lit) {
      this.bright = Math.min(1, this.bright + dt * 2);
      const k = this.bright * (0.85 + Math.sin(this.world.time * 7 + this.index) * 0.15);
      this.glow.opacity = k;
      this.flame.opacity = k;
      if (Math.random() < dt * 2) this.world.vfx.glowAt(this.x, this.y + 1.1, 1.6, 0.2);
    }
  }
}

export const terraces: RoomDef = {
  id: 'terraces',
  area: 'terraces',
  w: T2.w,
  h: T2.h,
  palette: 'terraces',
  spawn: T2_ENTRY,
  goal: [1, 0],
  music: 'pass',
  post: { washed: 0.3, night: 0, fog: 0.26, fogScale: 0.1, fogDrift: [0.04, 0.015], gloom: 0 },
  exits: [
    { x: 0, y: 64, w: 1.4, h: 12, to: 'overworld', spawn: [WORLD.w - 4, 62] },
    { x: T2_BASIN.x - 1.2, y: T2_BASIN.y - 1.0, w: 2.4, h: 1.6, to: 'basin1', open: () => save.main >= STEP.toad },
  ],
  map: (g) => t2MapSource(g),
  build(b) {
    const g: Game = b.game;
    const w = b.world;
    const r = w.r;
    const A = sharedArt();
    w.activeRadius = 40;
    g.lampRadius = 6.5;
    const chunks = new Chunks(w, sharedStamps(), A, GROUND_DETAIL_PPU, TERRACES);
    w.cleanups.push(() => chunks.clear());
    w.scripts.push((dt) => chunks.update(dt, w.camX, w.camY, r.viewW / (2 * r.zoom), r.viewH / (2 * r.zoom)));
    w.onKill = (e) => onKill(g, e);
    g.after(0, () => chunks.buildAround(w.player.x, w.player.y, r.viewW / 2 + 2, r.viewH / 2 + 2));

    // ---------- water and walls ----------
    T2_PONDS.forEach((p, i) => {
      const n = Math.max(2, Math.round((p.rx / p.ry) * 1.5));
      for (let k = 0; k < n; k++) {
        const tt = n === 1 ? 0 : k / (n - 1) - 0.5;
        w.addCollider({ kind: 'circle', x: p.x + tt * (p.rx * 1.3), y: p.y, r: p.ry * 0.85 }, 't2pond' + i);
      }
    });
    const deckLo = T2_BRIDGE.y - T2_BRIDGE.half - 0.15, deckHi = T2_BRIDGE.y + T2_BRIDGE.half + 0.15;
    for (const side of [1, -1]) {
      for (let i = 0; i < T2_STREAM.length - 2; i += 2) {
        const a = T2_STREAM[i], c = T2_STREAM[i + 2];
        const h = T2_STREAM_HALF * 0.92;
        const ax = a.x + a.nx * h * side, ay = a.y + a.ny * h * side;
        const cx = c.x + c.nx * h * side, cy = c.y + c.ny * h * side;
        if (Math.max(ay, cy) > deckLo && Math.min(ay, cy) < deckHi) continue;
        w.addCollider({ kind: 'seg', ax, ay, bx: cx, by: cy, r: 0.3 }, 'stream');
      }
    }
    for (const y of [T2_BRIDGE.y - T2_BRIDGE.half, T2_BRIDGE.y + T2_BRIDGE.half]) w.addCollider({ kind: 'seg', ax: T2_BRIDGE.x0 - 0.6, ay: y, bx: T2_BRIDGE.x1 + 0.6, by: y, r: 0.2 }, 'stream');
    w.addCollider({ kind: 'seg', ax: 0, ay: T2_NORTH, bx: T2.w, by: T2_NORTH, r: 0.3 }, 'north');

    // ---------- shrines ----------
    for (const s of T2_SHRINES) {
      const sh = b.add(new Shrine(s.id, s.x, s.y));
      sh.onUse = () => {
        g.hud.showHint(t('shrine'), 3);
        g.quests.event('shrine', s.id);
        save.gourd = save.gourdMax;
        save.shopSeed++;
        save.shopBought = [];
        if (save.perks.lamps) g.player.blessT = 60;
      };
    }

    // ---------- camps and the road's events ----------
    runCamps(g, b, T2_CAMPS, makeEnemy);
    const localKinds = (reg: string): { kinds: EnemyKind[]; champions: EnemyKind[]; tier: number } | null => {
      if (reg === 'reeds') return null;
      if (reg === 'pass') return { kinds: ['goat', 'wraith', 'wisp'], champions: ['goat', 'wraith', 'brute'], tier: 3 };
      if (reg === 'bamboo') return { kinds: ['mantis', 'wraith'], champions: ['mantis', 'brute'], tier: 4 };
      if (reg === 'lake') return { kinds: ['frog', 'wisp', 'kappa'], champions: ['frog', 'kappa', 'splitter'], tier: 3 };
      return { kinds: ['frog', 'frog', 'wraith', 'mite'], champions: ['frog', 'goat', 'splitter'], tier: 3 };
    };
    const events = new Events(g, {
      make: (k, x, y) => makeEnemy(k, x, y),
      local: (x, y) => localKinds(t2RegionAt(x, y)),
      calm: () => {
        const p = w.player;
        if (g.dialog.active || g.sheetOpen || p.state === 'dead' || g.hud.bossVis > 0) return false;
        if (t2RegionAt(p.x, p.y) === 'reeds') return false;
        return !w.entities.some((e) => e.team === 'enemy' && !e.dead && (e as Creature).aggro && Math.hypot(e.x - p.x, e.y - p.y) < 16);
      },
    });
    g.events = events;
    w.scripts.push((dt) => events.update(dt));

    // ---------- the people ----------
    const speak = (n: Npc, pages: string[], after?: () => void, choices?: Choice[]) => g.talk({ name: n.displayName, ...n.portrait() }, pages, after, choices);
    const npc = (id: string, look: ConstructorParameters<typeof Npc>[2], x: number, y: number, wander = 0) => b.add(new Npc(id, L(NAMES2[id]), look, x, y, wander));
    const heron = npc('heron', { seed: 31, scale: 1.15, robe: mixPig(INK, PIG_B, 0.2), robeDensity: 0.09, hair: 'white', hat: 'none', bent: 0.4, prop: 'cane' }, T2_VILLAGE.x - 0.5, T2_VILLAGE.y + 2.6);
    const cheng = npc('cheng', { seed: 32, scale: 1.05, robe: mixPig(INK, PIG_A, 0.4), robeDensity: 0.25, hair: 'none', hat: 'straw', bent: 0.6, beard: true, prop: 'cane' }, 69.5, 64.6);
    const tao = npc('tao', { seed: 33, scale: 1.12, robe: mixPig(INK, PIG_A, 0.6), robeDensity: 0.22, hair: 'bun', hat: 'none', beard: true }, 113.2, 38.8);
    const mina = npc('mina', { seed: 34, scale: 0.9, robe: mixPig(INK, PIG_B, 0.4), robeDensity: 0.22, hair: 'long', hat: 'straw', prop: 'basket' }, 131.6, 41.6, 2);
    const gong = npc('gong', { seed: 35, scale: 1.12, robe: mixPig(INK, PIG_A, 0.75), robeDensity: 0.3, hair: 'none', hat: 'none', redSash: true }, T2_PAGODA.x + 3.5, T2_PAGODA.y - 6);
    const lin = npc('lin', { seed: 36, scale: 1.05, robe: mixPig(INK, PIG_A, 0.3), robeDensity: 0.28, hair: 'bun', hat: 'scarf', apron: true, prop: 'cloth' }, 121, 43);
    const yu = npc('yu', { seed: 37, scale: 1.05, robe: mixPig(INK, PIG_A, 0.5), robeDensity: 0.2, hair: 'white', hat: 'cone', beard: true, bent: 0.3, prop: 'cane' }, T2_HERMIT.x - 2.2, T2_HERMIT.y - 2.6);
    const people: Npc[] = [heron, cheng, tao, mina, gong, lin, yu];
    if (save.quests.kaze?.c === 'ally') people.push(npc('kaze', { seed: 19, scale: 1.2, robe: INK, robeDensity: 0.45, hair: 'long', hat: 'cone', prop: 'cane', redSash: true }, 14, 75.5));
    for (const n of people) n.onTalk = () => speak(n, LL(IDLE2[n.id] ?? IDLE2.heron));
    heron.onTalk = () => {
      const m = save.main;
      if (m <= STEP.meetHeron) speak(heron, LL(HERON.meet), () => { if (save.main < STEP.sluices) { giveXp(g, 120); setMain(g, STEP.sluices); } });
      else if (m === STEP.sluices) speak(heron, LL(HERON.sluices));
      else if (m === STEP.toad || m === STEP.basinDeep) speak(heron, LL(HERON.toad));
      else if (m === STEP.toadBack) speak(heron, LL(HERON.toadBack), () => { if (save.main === STEP.toadBack) { giveXp(g, 150); setMain(g, STEP.hermit); } });
      else if (m === STEP.hermit) speak(heron, LL(HERON.hermit));
      else speak(heron, LL(IDLE2.heron));
    };
    yu.onTalk = () => {
      const m = save.main;
      if (m === STEP.hermit) speak(yu, LL(YU.meet), () => { if (save.main === STEP.hermit) { giveXp(g, 120); setMain(g, STEP.queen); } });
      else if (m === STEP.queen) speak(yu, LL(YU.queen));
      else if (m === STEP.yuBack) speak(yu, LL(YU.back), () => { if (save.main === STEP.yuBack) { giveXp(g, 220); setMain(g, STEP.lotus); } });
      else speak(yu, LL(YU.after));
    };
    lin.onTalk = () => speak(lin, LL(IDLE2.lin), undefined, [
      { label: lang === 'fr' ? 'Voir tes marchandises' : 'See your goods', act: () => g.shop.open(lin.displayName) },
      { label: lang === 'fr' ? 'Rien, merci' : 'Nothing, thanks', act: () => {} },
    ]);
    const mainBusiness: Record<string, () => boolean> = {
      heron: () => (save.main <= STEP.meetHeron && save.main >= STEP.end) || save.main === STEP.toadBack,
      yu: () => save.main === STEP.hermit || save.main === STEP.yuBack,
    };
    for (const n of people) {
      const base = n.onTalk;
      n.onTalk = () => {
        if (!mainBusiness[n.id]?.() && g.quests.talk(n.id, (pages, after, choices) => speak(n, pages, after, choices))) return;
        base?.();
      };
    }
    w.scripts.push(() => {
      for (const n of people) n.marker = mainBusiness[n.id]?.() || g.quests.wants(n.id) ? 'quest' : 'none';
    });

    // ---------- the three sluices ----------
    T2_SLUICES.forEach(([sx, sy], i) => {
      const sl = b.add(new Sluice(i, sx, sy));
      sl.onTouch = () => {
        if (save.main < STEP.sluices) { g.hud.showHint(L(SLUICE_UI.wait), 3); return; }
        sl.busy = true;
        g.hud.showHint(L(SLUICE_UI.clogged), 3.5);
        sfx.splash();
        const wave: Creature[] = [];
        const kinds: EnemyKind[] = ['frog', 'frog', 'frog', i === 2 ? 'wraith' : 'frog'];
        kinds.forEach((k, j) => {
          const a = (j / kinds.length) * Math.PI * 2 + 0.4;
          const e = b.add(makeEnemy(k, sx + Math.cos(a) * 2.6, sy - 1.6 + Math.sin(a) * 1.8).setup(3, j === 0 && i === 2));
          e.emerge = 0.6;
          e.aggro = true;
          wave.push(e);
        });
        const watch = () => {
          if (wave.some((e) => !e.dead)) return false;
          sl.busy = false;
          sl.setOpen();
          save.sluices.push(i);
          writeSave();
          giveXp(g, 90);
          sfx.wave();
          w.vfx.ripple(sx, sy - 1, 2.5);
          g.hud.showHint(`${L(SLUICE_UI.open)}  (${save.sluices.length}/3)`, 3.5);
          // colour comes back to the hill as the water clears
          g.washTarget = Math.max(0, 0.3 - save.sluices.length * 0.1);
          if (save.sluices.length >= 3) g.after(2, () => setMain(g, STEP.toad));
          return true;
        };
        const fn = () => { if (watch()) { const k = w.scripts.indexOf(fn); if (k >= 0) w.scripts.splice(k, 1); } };
        w.scripts.push(fn);
      };
    });

    // ---------- the Great Basin ----------
    b.add(new BasinMouth(T2_BASIN.x, T2_BASIN.y, () => save.main >= STEP.toad));
    let mouthHintT = 0;
    w.scripts.push((dt) => {
      mouthHintT -= dt;
      const p = w.player;
      if (mouthHintT > 0 || Math.hypot(p.x - T2_BASIN.x, p.y - T2_BASIN.y) > 4.6) return;
      if (save.main >= STEP.toad) g.hintOnce('basinOpen', L(BASIN_UI.drained), 4);
      else { g.hud.showHint(L(BASIN_UI.flooded), 4); mouthHintT = 12; }
    });

    // ---------- the Mantis Queen, in the heart of the grove ----------
    let queen: MantisQueen | null = null;
    const startQueen = () => {
      const qn = b.add(new MantisQueen(T2_QUEEN.x, T2_QUEEN.y + 2, T2_QUEEN));
      queen = qn;
      // the bamboo closes around the clearing
      const R = T2_QUEEN.r + 0.3;
      for (let k = 0; k < 24; k++) {
        const a0 = (k / 24) * Math.PI * 2, a1 = ((k + 1) / 24) * Math.PI * 2;
        w.addCollider({ kind: 'seg', ax: T2_QUEEN.x + Math.cos(a0) * R, ay: T2_QUEEN.y + Math.sin(a0) * R * 0.8, bx: T2_QUEEN.x + Math.cos(a1) * R, by: T2_QUEEN.y + Math.sin(a1) * R * 0.8, r: 0.3 }, 'queenRing');
      }
      g.hud.showBoss(L(QUEEN_UI.boss));
      sfx.wave();
      g.after(3, () => { if (!qn.defeated) g.hud.showHint(L(QUEEN_UI.hint), 4); });
      qn.onPhase = () => g.after(1.5, () => { if (!qn.defeated) g.hud.showHint(L(QUEEN_UI.rustle), 3.5); });
      qn.onDefeat = () => {
        music.boss = 0.2;
        w.removeColliders('queenRing');
        g.hud.hideBoss();
        save.bosses.push('queen');
        writeSave();
        discover(g, 'queen');
        giveXp(g, 480);
        for (let i = 0; i < 4; i++) b.add(new Pickup(qn.x, qn.y, i % 2 ? 'ink' : 'life', i % 2 ? 10 : 2));
        for (let i = 0; i < 4; i++) b.add(new Pickup(qn.x + (i - 1.5) * 0.5, qn.y, 'coin', 10));
        dropLoot(g, qn.x, qn.y, 'boss', 10);
        for (const en of w.entities) if (en.label === 'mantis' && !(en as Creature).home) (en as Creature).onHit?.({ dmg: 999, fromX: qn.x, fromY: qn.y, kind: 'enso' });
        g.after(1.4, () => {
          void g.story.show([L(QUEEN_UI.down)], { size: 38, y: r.uiH / 2 - 200, hold: 3 });
          if (save.main === STEP.queen) setMain(g, STEP.yuBack);
          queen = null;
        });
      };
    };
    w.scripts.push(() => {
      const p = w.player;
      if (queen) { g.hud.bossFrac = queen.frac; if (!queen.defeated) music.boss = 1; return; }
      if (save.bosses.includes('queen') || p.state === 'dead') return;
      if (Math.hypot(p.x - T2_QUEEN.x, p.y - T2_QUEEN.y) < T2_QUEEN.r - 2) {
        if (save.main >= STEP.queen) startQueen();
        else g.hintOnce('queenWait', L(QUEEN_UI.wait), 4);
      }
    });
    g.onRespawn = () => {
      if (queen && !queen.defeated) {
        queen.destroy();
        queen = null;
        w.removeColliders('queenRing');
        g.hud.hideBoss();
        for (const en of w.entities) if (en.label === 'mantis' && !(en as Creature).home) en.destroy();
      }
      chunks.buildAround(w.player.x, w.player.y, r.viewW / 2 + 2, r.viewH / 2 + 2);
    };

    // ---------- the stone lanterns of the pagoda stair (lit by lightning) ----------
    const lamps = T2_STAIR_LAMPS.map(([x, y], i) => {
      const l = b.add(new StairLamp(i, x, y));
      l.onLit = () => {
        g.hud.showHint(L(LAMP_UI.lit), 2);
        g.quests.event('stairLamp', i);
        const q = g.quests.state('lanterns');
        if (q && !q.done) {
          // the light wakes what slept on the stair
          for (let k = 0; k < 2; k++) {
            const a = Math.random() * Math.PI * 2;
            const e = b.add(makeEnemy('wraith', x + Math.cos(a) * 3, y + Math.sin(a) * 2.5).setup(4, false));
            e.emerge = 0.6;
            e.aggro = true;
          }
        }
      };
      return l;
    });
    w.onBolt.push((x, y, rr) => { for (const l of lamps) if (!l.lit && Math.hypot(l.x - x, l.y + 0.8 - y) < rr + 1.3) l.light(); });
    w.scripts.push(() => {
      const p = w.player;
      const q = g.quests.state('lanterns');
      if (!q || q.done) return;
      for (const l of lamps) if (!l.lit && Math.hypot(p.x - l.x, p.y - l.y) < 2.2) g.hintOnce('lampCold', L(LAMP_UI.cold), 4);
    });

    // ---------- regions: names, music, colours, stories ----------
    let region = '';
    w.scripts.push(() => {
      const p = w.player;
      const reg = t2RegionAt(p.x, p.y);
      if (reg === region) return;
      const first = region !== '';
      region = reg;
      const R = T2_REGIONS[reg];
      if (first) void g.story.show([R.name[lang]], { size: 46, y: r.uiH / 2 - 120, hold: 1.4, italic: false });
      music.play(R.music);
      g.fadePalette(R.palette);
      if (reg === 'reeds' && save.main === STEP.reeds) setMain(g, STEP.meetHeron);
      const key = 't2' + reg;
      if (!save.regions.includes(key) && REGION_LORE2[reg]) {
        g.after(first ? 2.4 : 4, () => {
          if (t2RegionAt(w.player.x, w.player.y) !== reg || save.regions.includes(key)) return;
          save.regions.push(key);
          writeSave();
          void g.story.show([L(REGION_LORE2[reg])], { size: 30, y: r.uiH / 2 - 170, hold: 4.5 });
        });
      }
    });

    // ---------- where to go ----------
    w.scripts.push(() => {
      const m = save.main, p = w.player;
      let target: [number, number] | null = null;
      if (m <= STEP.reeds) target = [T2_VILLAGE.x, T2_VILLAGE.y];
      else if (m === STEP.meetHeron) target = [heron.x, heron.y];
      else if (m === STEP.sluices) {
        let bd = Infinity;
        T2_SLUICES.forEach(([x, y], i) => { if (save.sluices.includes(i)) return; const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; target = [x, y]; } });
      } else if (m === STEP.toad || m === STEP.basinDeep) target = [T2_BASIN.x, T2_BASIN.y + 1];
      else if (m === STEP.toadBack) target = [heron.x, heron.y];
      else if (m === STEP.hermit || m === STEP.yuBack) target = [yu.x, yu.y];
      else if (m === STEP.queen) target = [T2_QUEEN.x, T2_QUEEN.y];
      else if (m === STEP.lotus) target = [T2_JETTY[0], T2_JETTY[1]];
      g.objective = target;
      const vh = r.viewH / r.zoom, vw = vh * (r.pxW / r.pxH);
      g.hud.arrowTarget = target ? [((target[0] - w.camX) / vw) * r.uiW, ((target[1] - w.camY) / vh) * r.uiH] : null;
      w.areaName = 'terraces/' + region;
    });

    // ---------- arriving: the story moves on, and the act opens ----------
    if (save.main === STEP.end) setMain(g, STEP.reeds);
    g.washTarget = save.bosses.includes('toad') ? 0 : Math.max(0, 0.3 - save.sluices.length * 0.1);
    if (!save.perks.seenAct2) {
      save.perks.seenAct2 = 1;
      writeSave();
      g.after(0.2, () => g.cine.play(act2Shots({ act: L(ACT2_TITLE.act), name: L(ACT2_TITLE.name), line: L(ACT2_TITLE.line) })));
    }
    void T2_PAGODA;
  },
};
