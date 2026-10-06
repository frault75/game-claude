/**
 * The dungeons of Act I: the Firefly Cave (two floors, the Mother of Blots holds the indigo)
 * and the Sunken Temple (two floors, the Drowned Warden guards the gold).
 * Floors are generated from seeds; rooms hold camps, torches light the dark, stairs link the floors.
 */
import type { RoomDef } from '../room';
import type { Game } from '../game';
import type { World } from '../world';
import { Entity } from '../entity';
import { Creature } from '../enemies';
import { Prop } from '../objects';
import { Pickup } from '../pickups';
import { Stele } from '../npc';
import { MotherOfBlots } from '../bosses/mother';
import { DrownedWarden } from '../bosses/warden';
import { generateDungeon, DungeonMap, DungeonSpec, DRoom, V } from '../../world/dungeon';
import { paintDungeon, DungeonStyle } from '../../world/dungeonPaint';
import type { EnemyKind } from '../../world/layout';
import { makeEnemy, sharedArt, sharedStamps, GROUND_DETAIL_PPU, SURFACE } from './overworld';
import { Sprite, Frame, frameFrom, makeTexture, ySort, LAYER } from '../../gfx/sprite';
import { Painter, INK, PIG_B, VERMILION, LIGHT, ERASE, mixPig } from '../../gfx/paint';
import { washPoly, noisyOutline, roughen } from '../../gfx/wash';
import { stroke } from '../../gfx/brush';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { IS_MOBILE } from '../../core/renderer';
import { L, MURALS, NAMES, UI } from '../../i18n/lore';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { save, writeSave } from '../progression';
import { STEP, setMain } from '../quests';
import { giveXp, onKill, unlockInk, hasColour, discover } from '../rewards';
import { dropLoot } from '../loot';
import type { InkId } from '../inks';
import { MapSource, Mark } from '../../ui/mapArt';

interface FloorDef {
  id: string;
  area: 'cave' | 'temple';
  style: DungeonStyle;
  floor: number;
  spec: DungeonSpec;
  tier: number;
  enemies: EnemyKind[];
  /** Where the stairs up lead (and where to appear there). */
  up: { to: string; spawn: () => V };
  /** The floor below, if any. */
  down?: string;
  boss?: 'mother' | 'warden';
  mural: string;
  well?: boolean;
}

const FLOORS: FloorDef[] = [
  {
    id: 'cave1', area: 'cave', style: 'cave', floor: 1, tier: 1,
    spec: { seed: 1101, w: 64, h: 50, rooms: 7, minRoom: 7, maxRoom: 12, corridor: 3 },
    enemies: ['bat', 'bat', 'blot', 'grub', 'mite', 'bat', 'splitter'],
    up: { to: 'overworld', spawn: () => SURFACE.cave }, down: 'cave2', mural: 'cave1',
  },
  {
    id: 'cave2', area: 'cave', style: 'cave', floor: 2, tier: 2,
    spec: { seed: 2207, w: 66, h: 54, rooms: 6, minRoom: 7, maxRoom: 12, corridor: 3, boss: { w: 17, h: 13 } },
    enemies: ['bat', 'grub', 'grub', 'bat', 'splitter', 'totem', 'wisp'],
    up: { to: 'cave1', spawn: () => mapOf('cave1').downSpawn }, boss: 'mother', mural: 'cave2',
  },
  {
    id: 'temple1', area: 'temple', style: 'temple', floor: 1, tier: 3,
    spec: { seed: 3313, w: 68, h: 52, rooms: 8, minRoom: 7, maxRoom: 12, corridor: 3 },
    enemies: ['soldier', 'lantern', 'lantern', 'wisp', 'soldier', 'splitter'],
    up: { to: 'overworld', spawn: () => SURFACE.temple }, down: 'temple2', mural: 'temple1', well: true,
  },
  {
    id: 'temple2', area: 'temple', style: 'temple', floor: 2, tier: 3,
    spec: { seed: 4421, w: 70, h: 56, rooms: 6, minRoom: 8, maxRoom: 12, corridor: 3, boss: { w: 18, h: 14 } },
    enemies: ['soldier', 'lantern', 'soldier', 'lantern', 'totem', 'wisp', 'brute'],
    up: { to: 'temple1', spawn: () => mapOf('temple1').downSpawn }, boss: 'warden', mural: 'temple2', well: true,
  },
];

const maps = new Map<string, DungeonMap>();
function mapOf(id: string): DungeonMap {
  let m = maps.get(id);
  if (!m) {
    m = generateDungeon(FLOORS.find((f) => f.id === id)!.spec);
    maps.set(id, m);
  }
  return m;
}

// ---------- small things that live down there ----------

let wellArt: Frame | null = null;

/** An inkstone basin: heals, refills ink and pigment, and is where the child comes back after falling. */
class Basin extends Entity {
  private cool = 0;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.6;
    this.solid = true;
    this.label = 'basin';
  }
  init(): void {
    if (!wellArt) {
      const p = new Painter(2, 1.4, SPRITE_PPU, -1, -0.5);
      const o = noisyOutline(0, 0.15, 0.7, 0.34, 0.1, 501);
      p.reserve(() => o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
      p.glaze();
      washPoly(p, o, { pig: INK, density: 0.3, soft: 0.05, edge: 0.9, seed: 501 });
      washPoly(p, noisyOutline(0, 0.2, 0.45, 0.18, 0.1, 502), { pig: INK, density: 0.95, soft: 0.05, edge: 0.5, seed: 502 });
      wellArt = frameFrom(p);
    }
    const s = this.addSprite(new Sprite(wellArt));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = ySort(this.y);
  }
  update(dt: number): void {
    const w = this.world;
    const p = w.player;
    this.cool -= dt;
    w.vfx.glowAt(this.x, this.y + 0.6, 3, 0.03);
    if (Math.hypot(p.x - this.x, p.y - this.y) < 1.6 && this.cool <= 0 && p.state !== 'dead') {
      if (p.hp < p.maxHp || p.ink < p.inkMax - 1 || (hasColour() && p.pigment < p.pigmentMax - 0.5)) {
        p.hp = p.maxHp;
        p.ink = p.inkMax;
        if (hasColour()) p.pigment = p.pigmentMax;
        sfx.inkstone();
        w.vfx.ripple(this.x, this.y + 0.2, 0.8);
      }
      w.checkpoint = [this.x, this.y - 1.4];
      this.cool = 2;
    }
  }
}

let urnArt: Frame | null = null;

/** A clay urn: break it for pigment; it is refilled after a while (the Warden's room). */
class Urn extends Entity {
  private broken = 0;
  private s!: Sprite;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.4;
    this.team = 'enemy';
    this.label = 'urn';
  }
  init(): void {
    if (!urnArt) {
      const p = new Painter(1.2, 1.4, SPRITE_PPU, -0.6, -0.25);
      const o = noisyOutline(0, 0.38, 0.32, 0.36, 0.08, 601);
      for (const q of o) if (q[1] < 0.04) q[1] = 0.04;
      p.reserve(() => o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
      p.glaze();
      washPoly(p, o, { pig: mixPig(INK, PIG_B, 0.5), density: 0.3, soft: 0.05, edge: 0.8, seed: 601 });
      stroke(p, [[-0.18, 0.78], [0, 0.82], [0.18, 0.78]], { width: 0.07, load: 1, seed: 602 });
      stroke(p, [[-0.3, 0.4], [0.3, 0.42]], { width: 0.03, load: 0.6, seed: 603 });
      urnArt = frameFrom(p);
    }
    this.s = this.addSprite(new Sprite(urnArt));
    this.s.setPos(this.x, this.y);
    this.s.mesh.renderOrder = ySort(this.y);
  }
  onHit(): boolean {
    if (this.broken > 0) return false;
    this.broken = 25;
    sfx.clink();
    this.world.vfx.splat(this.x, this.y + 0.4, Math.random() * 6, 8, 1);
    this.world.add(new Pickup(this.x, this.y, 'pigment', 3));
    if (Math.random() < 0.4) this.world.add(new Pickup(this.x, this.y, 'life', 1));
    return true;
  }
  update(dt: number): void {
    if (this.broken > 0) {
      this.broken -= dt;
      this.s.opacity = this.broken > 0 ? 0 : 1;
      this.interactive = false;
    }
  }
}

/** The colour the guardian kept: walk into it to take it. */
class Relic extends Entity {
  private t = 0;
  onTake?: () => void;
  constructor(x: number, y: number, private ink: InkId) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.5;
    this.label = 'relic';
  }
  init(): void {
    const p = new Painter(1.6, 1.8, SPRITE_PPU, -0.8, -0.3);
    const o = noisyOutline(0, 0.42, 0.42, 0.42, 0.06, 701);
    for (const q of o) if (q[1] < 0.03) q[1] = 0.03;
    p.reserve(() => o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
    p.glaze();
    washPoly(p, o, { pig: INK, density: 0.45, soft: 0.05, edge: 0.9, seed: 701 });
    stroke(p, [[-0.25, 0.86], [0, 0.92], [0.25, 0.86]], { width: 0.09, load: 1, seed: 702 });
    this.addSprite(new Sprite(p));
    const c = new Painter(1.2, 0.8, SPRITE_PPU, -0.6, 0.5);
    c.over();
    c.ctx.fillStyle = this.ink === 'indigo' ? 'rgba(51,84,148,1)' : 'rgba(219,168,51,1)';
    c.ctx.beginPath();
    c.ctx.ellipse(0, 0.9, 0.26, 0.09, 0, 0, Math.PI * 2);
    c.ctx.fill();
    const acc = new Sprite(c);
    this.sprites.push(acc);
    this.world.r.sceneAcc.add(acc.mesh);
    const l = new Painter(6, 6, SPRITE_PPU / 4, -3, -2.5);
    l.glaze();
    l.dab(0, 0.6, 2.6, LIGHT, 0.9, 0);
    this.addSprite(new Sprite(l), true);
  }
  update(dt: number): void {
    this.t += dt;
    for (const s of this.sprites) {
      s.setPos(this.x, this.y + Math.sin(this.t * 2) * 0.06);
      s.mesh.renderOrder = ySort(this.y);
    }
    const p = this.world.player;
    if (Math.hypot(p.x - this.x, p.y - this.y) < 0.9) {
      this.destroy();
      this.onTake?.();
    }
  }
}

/** A tear in the paper: it leads back up to the surface. */
class Rift extends Entity {
  private t = 0;
  onEnter?: () => void;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.6;
    this.label = 'rift';
  }
  init(): void {
    const p = new Painter(2.4, 3.6, SPRITE_PPU / 2, -1.2, -0.3);
    p.glaze();
    const tear: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      tear.push([Math.cos(a) * 0.45 * (1 - 0.3 * Math.abs(Math.sin(a * 3))), 1.4 + Math.sin(a) * 1.3]);
    }
    const rt = roughen(tear, 0.08, 801, 0.1);
    washPoly(p, rt, { pig: ERASE, density: 1, soft: 0.2, seed: 801 });
    stroke(p, rt.slice(0, 12), { width: 0.08, pig: VERMILION, load: 1, dry: 0.4, seed: 802 });
    stroke(p, rt.slice(10), { width: 0.06, pig: VERMILION, load: 0.9, dry: 0.5, seed: 803 });
    p.dab(0, 1.4, 1.2, LIGHT, 0.8, 0);
    this.addSprite(new Sprite(p), true);
  }
  update(dt: number): void {
    this.t += dt;
    const s = this.sprites[0];
    s.setPos(this.x, this.y);
    s.mesh.scale.set(1 + Math.sin(this.t * 3) * 0.05, 1, 1);
    s.mesh.renderOrder = ySort(this.y);
    const p = this.world.player;
    if (Math.hypot(p.x - this.x, p.y - (this.y + 0.3)) < 0.8) this.onEnter?.();
  }
}

let flyFrames: { dot: Frame; light: Frame } | null = null;

/** Fireflies drifting in the dark. */
class Fireflies extends Entity {
  private flies: { x: number; y: number; vx: number; vy: number; ph: number; dot: Sprite; light: Sprite }[] = [];
  constructor(private spots: V[]) {
    super();
    this.label = 'fireflies';
  }
  init(w: World): void {
    if (!flyFrames) {
      const d = new Painter(0.3, 0.3, 64, -0.15, -0.15);
      d.over();
      d.ctx.fillStyle = 'rgba(255,220,120,1)';
      d.ctx.beginPath();
      d.ctx.arc(0, 0, 0.055, 0, Math.PI * 2);
      d.ctx.fill();
      const l = new Painter(2.4, 2.4, 16, -1.2, -1.2);
      l.glaze();
      l.dab(0, 0, 1.1, LIGHT, 0.55, 0);
      flyFrames = { dot: frameFrom(d), light: frameFrom(l) };
    }
    for (const [x, y] of this.spots) {
      const dot = new Sprite(flyFrames.dot);
      dot.mesh.renderOrder = LAYER.canopy + 20;
      w.r.sceneAcc.add(dot.mesh);
      const light = new Sprite(flyFrames.light);
      light.mesh.renderOrder = LAYER.ground + 6;
      w.r.sceneRed.add(light.mesh);
      this.sprites.push(dot, light);
      this.flies.push({ x, y, vx: 0, vy: 0, ph: Math.random() * 6, dot, light });
    }
  }
  update(dt: number): void {
    const t = this.world.time;
    for (const f of this.flies) {
      f.vx += (Math.sin(t * 0.7 + f.ph * 3) * 0.6 - f.vx) * dt;
      f.vy += (Math.cos(t * 0.53 + f.ph * 2) * 0.5 - f.vy) * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const glow = 0.5 + 0.5 * Math.sin(t * 2.3 + f.ph);
      f.dot.setPos(f.x, f.y + 1.2 + Math.sin(t * 1.7 + f.ph) * 0.2);
      f.dot.opacity = 0.4 + glow * 0.6;
      f.light.setPos(f.x, f.y + 0.6);
      f.light.opacity = glow;
    }
  }
}

// ---------- the floors ----------

function buildFloor(def: FloorDef, room: RoomDef, b: Parameters<RoomDef['build']>[0]): void {
  const g: Game = b.game;
  const w = b.world;
  const r = w.r;
  const A = sharedArt();
  const map = mapOf(def.id);
  const caveArea = def.area === 'cave';
  w.activeRadius = 24;
  g.lampRadius = caveArea ? 6.2 : 6.8;
  w.onKill = (e) => onKill(g, e);
  // the floor, in tiles
  const ppu = IS_MOBILE ? 16 : 22;
  for (const tile of paintDungeon(map, def.style, def.spec.seed, ppu, sharedStamps(), !!def.down)) {
    const s = new Sprite({ tex: makeTexture(tile.canvas, false), w: tile.w, h: tile.h, ox: tile.originX, oy: tile.originY });
    (s as unknown as { owned: boolean }).owned = true;
    s.mesh.renderOrder = LAYER.ground;
    r.scenePig.add(s.mesh);
    w.roomSprites.push(s);
  }
  void GROUND_DETAIL_PPU;
  for (const wl of map.walls) w.addCollider({ kind: 'seg', ax: wl.ax, ay: wl.ay, bx: wl.bx, by: wl.by, r: 0.12 }, 'walls');
  w.nav = { w: map.w, h: map.h, grid: map.grid, dist: new Int16Array(map.w * map.h), t: 0 };
  // torches
  for (const [x, y] of map.torches) b.add(new Prop(A.torch, x, y, 0.25, true));
  if (def.boss) {
    const e = map.end;
    for (const [x, y] of [[e.x + 1.5, e.y + 1.5], [e.x + e.w - 1.5, e.y + 1.5]]) b.add(new Prop(A.torch, x, y, 0.25, true));
  }
  // fireflies drift through the cave
  if (caveArea) {
    const spots: V[] = [];
    for (const o of map.rooms) for (let k = 0; k < (IS_MOBILE ? 2 : 4); k++) spots.push([o.x + 1 + Math.random() * (o.w - 2), o.y + 1 + Math.random() * (o.h - 2)]);
    b.add(new Fireflies(spots));
  }
  if (def.well) b.add(new Basin(map.start.cx + 2.5, map.start.cy - 0.5));
  // camps in the rooms
  const deepest = Math.max(1, ...map.rooms.map((o) => o.depth));
  const camps: { room: DRoom; members: Creature[] }[] = [];
  map.rooms.forEach((o, i) => {
    if (o === map.start || (def.boss && o === map.end)) return;
    const n = Math.max(2, Math.min(7, Math.round((o.w * o.h) / 22)));
    const members: Creature[] = [];
    const deep = o.depth / deepest;
    let elites = deep > 0.6 ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const kind = def.enemies[(i * 3 + k * 7) % def.enemies.length];
      const x = o.x + 1.5 + ((k * 37 + i * 11) % 10) / 10 * (o.w - 3), y = o.y + 1.5 + ((k * 53 + i * 7) % 10) / 10 * (o.h - 3);
      const e = makeEnemy(kind, x, y);
      const elite = elites > 0 && kind !== 'mite' && kind !== 'totem';
      if (elite) elites--;
      e.setup(def.tier + (deep > 0.7 ? 1 : 0), elite);
      e.home = [o.cx, o.cy];
      e.leash = Math.max(o.w, o.h) + 8;
      b.add(e);
      members.push(e);
    }
    camps.push({ room: o, members });
  });
  void camps;
  // named places for quests: the deepest room, one halfway, the first room
  const inner = map.rooms.filter((o) => o !== map.start && !(def.boss && o === map.end));
  const byDepth = [...inner].sort((a, b2) => a.depth - b2.depth);
  g.roomSpot = (name) => {
    const o = name === 'deep' ? byDepth[byDepth.length - 1] : name === 'mid' ? byDepth[Math.floor(byDepth.length / 2)] : map.start;
    return o ? [o.cx + 1.2, o.cy - 0.8] : null;
  };
  // a mural on a wall of a middle room
  const mid = map.rooms.find((o) => o !== map.start && o !== map.end) ?? map.start;
  const mural = b.add(new Stele(def.floor + (caveArea ? 0 : 1), mid.x + 1.6, mid.y + mid.h - 1.2));
  mural.read = save.steles.includes(100 + FLOORS.indexOf(def));
  mural.onRead = () => {
    g.talk({ name: L(NAMES.mural) }, [L(MURALS[def.mural])], () => {
      const key = 100 + FLOORS.indexOf(def);
      if (!save.steles.includes(key)) { save.steles.push(key); writeSave(); giveXp(g, 20); }
      mural.read = true;
    });
  };
  // the story moves on when the child comes down
  if (def.id === 'cave1' && save.main === STEP.findCave) setMain(g, STEP.caveDeep);
  if (def.id === 'temple1' && save.main === STEP.findTemple) setMain(g, STEP.templeDeep);
  const name = caveArea ? L(UI.enterCave) : L(UI.enterTemple);
  g.after(0.4, () => void g.story.show([name, `${L(UI.floor)} ${def.floor}`], { size: 44, y: r.uiH / 2 - 200, hold: 1.6, italic: false, stagger: 0.4 }));

  // ---------- the guardian ----------
  let bossE: MotherOfBlots | DrownedWarden | null = null;
  const e = map.end;
  const bossId = def.boss === 'mother' ? 'mother' : 'warden';
  const ink: InkId = def.boss === 'mother' ? 'indigo' : 'gold';
  const doors: [number, number, number, number][] = [];
  if (def.boss) {
    // corridor mouths into the guardian's room, closed during the fight
    const floor = (x: number, y: number) => x >= 0 && y >= 0 && x < map.w && y < map.h && map.grid[y * map.w + x] === 1;
    const scan = (horizontal: boolean, fixed: number, from: number, to: number, outside: number) => {
      let run = -1;
      for (let k = from; k <= to; k++) {
        const open = k < to && (horizontal ? floor(k, outside) : floor(outside, k));
        if (open && run < 0) run = k;
        if (!open && run >= 0) {
          doors.push(horizontal ? [run, fixed, k, fixed] : [fixed, run, fixed, k]);
          run = -1;
        }
      }
    };
    scan(true, e.y, e.x, e.x + e.w, e.y - 1);
    scan(true, e.y + e.h, e.x, e.x + e.w, e.y + e.h);
    scan(false, e.x, e.y, e.y + e.h, e.x - 1);
    scan(false, e.x + e.w, e.y, e.y + e.h, e.x + e.w);
  }
  const doorSprites: Prop[] = [];
  const closeDoors = () => {
    for (const [ax, ay, bx, by] of doors) {
      w.addCollider({ kind: 'seg', ax, ay, bx, by, r: 0.5 }, 'bossdoor');
      const pr = new Prop(A.brambles, (ax + bx) / 2, Math.min(ay, by) - (ay === by ? 0.3 : 0), 0, false);
      b.add(pr);
      doorSprites.push(pr);
    }
  };
  const openDoors = () => {
    w.removeColliders('bossdoor');
    for (const d of doorSprites) d.destroy();
    doorSprites.length = 0;
  };
  const spawnRelic = () => {
    if (save.inks.includes(ink)) return;
    const relic = b.add(new Relic(e.cx, e.cy + 1.5, ink));
    relic.onTake = () => {
      unlockInk(g, ink);
      if (ink === 'indigo') { if (save.main <= STEP.caveDeep) setMain(g, STEP.indigoBack); }
      else if (save.main <= STEP.templeDeep) setMain(g, STEP.goldBack);
    };
  };
  const spawnRift = () => {
    const rift = b.add(new Rift(e.cx, e.y + e.h - 2.6));
    rift.onEnter = () => void g.travel('overworld', caveArea ? SURFACE.cave : SURFACE.temple);
  };
  if (def.boss && save.bosses.includes(bossId)) {
    spawnRelic();
    spawnRift();
  }
  const startBoss = () => {
    closeDoors();
    if (def.boss === 'mother') {
      bossE = b.add(new MotherOfBlots(e.cx, e.cy + 1, e));
      g.hud.showBoss(L(UI.bossMother));
    } else {
      const wd = b.add(new DrownedWarden(e.cx, e.cy + 1.5, e));
      wd.onArmour = () => { g.hud.showHint(L(UI.wardenHint), 3.5); g.after(4, () => g.flags.add('wardenArmour')); };
      bossE = wd;
      g.hud.showBoss(L(UI.bossWarden));
      g.after(2.5, () => { if (!wd.defeated) g.hud.showHint(L(UI.wardenHint), 4); });
      // urns of pigment around the room
      for (const [ux, uy] of [[e.x + 2, e.y + 2], [e.x + e.w - 2, e.y + 2], [e.x + 2, e.y + e.h - 2.2], [e.x + e.w - 2, e.y + e.h - 2.2]]) b.add(new Urn(ux, uy));
    }
    sfx.wave();
    const boss = bossE;
    boss.onDefeat = () => {
      music.boss = 0.2;
      g.hud.hideBoss();
      save.bosses.push(bossId);
      writeSave();
      discover(g, bossId);
      giveXp(g, def.boss === 'mother' ? 220 : 380);
      for (let i = 0; i < 4; i++) b.add(new Pickup(boss.x, boss.y, i % 2 ? 'ink' : 'life', i % 2 ? 10 : 2));
      dropLoot(g, boss.x, boss.y, 'boss', def.boss === 'mother' ? 4 : 8);
      for (const en of w.entities) if (en.team === 'enemy' && en !== boss && en.label !== 'urn') (en as Creature).onHit?.({ dmg: 999, fromX: boss.x, fromY: boss.y, kind: 'enso' });
      g.after(1.6, () => {
        openDoors();
        void g.story.show([L(def.boss === 'mother' ? UI.motherDown : UI.wardenDown)], { size: 38, y: r.uiH / 2 - 200, hold: 3 });
        spawnRelic();
        g.after(2, () => { spawnRift(); g.hud.showHint(L(UI.rift), 4); });
      });
    };
  };
  w.scripts.push(() => {
    const p = w.player;
    if (bossE) {
      g.hud.bossFrac = bossE.frac;
      if (def.boss === 'warden' && !bossE.defeated) {
        if (p.pigmentFrac < 0.25) g.hintOnce('wardenUrns', L(UI.urnHint), 4);
        else if (save.ink !== 'indigo' && g.flags.has('wardenArmour')) g.hintOnce('wardenIndigo', L(UI.indigoHint), 4);
      }
      music.boss = bossE.defeated ? 0.2 : 1;
      return;
    }
    if (def.boss && !save.bosses.includes(bossId)) {
      if (p.x > e.x + 1.2 && p.x < e.x + e.w - 1.2 && p.y > e.y + 1.2 && p.y < e.y + e.h - 1.2) startBoss();
    }
    let aggro = 0;
    for (const en of w.entities) if (en.team === 'enemy' && !en.dead && (en as Creature).aggro) aggro++;
    music.boss = aggro ? Math.min(1, 0.45 + aggro * 0.07) : 0.05;
  });
  g.onRespawn = () => {
    if (bossE && !bossE.defeated) {
      bossE.destroy();
      bossE = null;
      openDoors();
      g.hud.hideBoss();
      for (const en of w.entities) if ((en.label === 'blotlet' || en.label === 'wisp' || en.label === 'urn') && !(en as Creature).home) en.destroy();
    }
  };
  // where to go: the stairs down, the guardian, or the way out
  w.scripts.push(() => {
    let target: V | null = null;
    if (def.down) target = map.down;
    else if (!save.bosses.includes(bossId)) target = [e.cx, e.cy];
    else if (!save.inks.includes(ink)) target = [e.cx, e.cy + 1.5];
    else target = [e.cx, e.y + e.h - 2.6];
    g.objective = target;
    const vh = r.viewH / r.zoom, vw = vh * (r.pxW / r.pxH);
    g.hud.arrowTarget = target ? [((target[0] - w.camX) / vw) * r.uiW, ((target[1] - w.camY) / vh) * r.uiH] : null;
    w.areaName = `${def.id}`;
    w.roomName = `rooms ${map.rooms.length} · lvl ${save.level} · step ${save.main}`;
  });
  void room;
}

/** A floor as a map: rooms and corridors in pale wash, walls in ink. */
function floorMap(def: FloorDef, map: DungeonMap): MapSource {
  return {
    key: def.id,
    w: map.w,
    h: map.h,
    ppu: 6,
    cell: 2,
    sight: 7.5,
    view: 14,
    paint(ctx) {
      ctx.fillStyle = def.area === 'cave' ? 'rgba(96,88,80,0.34)' : 'rgba(120,104,72,0.34)';
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (map.grid[y * map.w + x] === 1) ctx.fillRect(x - 0.02, y - 0.02, 1.04, 1.04);
      ctx.strokeStyle = 'rgba(36,32,30,0.85)';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      for (const wl of map.walls) { ctx.moveTo(wl.ax, wl.ay); ctx.lineTo(wl.bx, wl.by); }
      ctx.stroke();
    },
    marks(): Mark[] {
      const out: Mark[] = [{ x: map.up[0], y: map.up[1], kind: 'up' }];
      if (def.down) out.push({ x: map.down[0], y: map.down[1], kind: 'down' });
      if (def.well) out.push({ x: map.start.cx + 2.5, y: map.start.cy - 0.5, kind: 'basin' });
      const bossId = def.boss === 'mother' ? 'mother' : 'warden';
      if (def.boss && !save.bosses.includes(bossId)) out.push({ x: map.end.cx, y: map.end.cy, kind: 'boss' });
      return out;
    },
  };
}

export function dungeonRooms(): RoomDef[] {
  return FLOORS.map((def) => {
    const map = mapOf(def.id);
    const exits: RoomDef['exits'] = [
      { x: map.up[0] - 1.0, y: map.up[1] - 0.2, w: 2.0, h: 1.2, to: def.up.to, spawn: def.up.spawn() },
    ];
    if (def.down) exits.push({ x: map.down[0] - 0.9, y: map.down[1] - 0.7, w: 1.8, h: 1.3, to: def.down });
    const room: RoomDef = {
      id: def.id,
      area: def.area,
      w: map.w,
      h: map.h,
      palette: def.style,
      spawn: map.upSpawn,
      goal: [0, 1],
      music: def.style,
      post: { washed: 0, night: 0, fog: 0.05, fogScale: 0.2, gloom: def.area === 'cave' ? 0.84 : 0.78, vignette: 1.3 },
      exits,
      map: () => floorMap(def, map),
      build: (b) => buildFloor(def, room, b),
    };
    return room;
  });
}

/** Where to appear on a floor when coming back up from the one below. */
export function downSpawnOf(id: string): V {
  return mapOf(id).downSpawn;
}

export { INK };
