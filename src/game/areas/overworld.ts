/**
 * The open world: Willow Hamlet and its people, the orchard, the river and the old bridge,
 * the Plum Plain with its camps and shrines, the Ram King's stone circle, the ways down into the cave and the temple.
 */
import type { RoomDef } from '../room';
import type { Game } from '../game';
import type { World } from '../world';
import { Entity } from '../entity';
import { Creature, Blot, Mite, Wisp, Splitter, Brute, Totem } from '../enemies';
import { RamKing } from '../bosses/ramKing';
import { Pickup } from '../pickups';
import { Storm } from '../weather';
import { Chunks } from '../../world/chunks';
import { buildStamps, StampSet } from '../../world/stamps';
import { buildArtCache, ArtCache } from '../../world/artCache';
import {
  WORLD, CAMPS, SHRINES, PONDS, ARENA, REGIONS, CAVE, TEMPLE, BRIDGE, NORTH_WALL, RIVER_SAMPLES, ORCHARD_CAMPS,
  STELE_SPOTS, NPC_SPOTS, CampDef, EnemyKind, regionAt, riverHalf, riverX,
} from '../../world/layout';
import { Sprite, Frame, frameFrom, ySort } from '../../gfx/sprite';
import { Painter, INK, PIG_A, PIG_B, mixPig } from '../../gfx/paint';
import { washPoly, noisyOutline } from '../../gfx/wash';
import { stroke } from '../../gfx/brush';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { IS_MOBILE } from '../../core/renderer';
import { t, lang } from '../../i18n';
import { L, LL, NAMES, WILLOW, MADDER, ELM, PIP, LINDEN, STELES, UI } from '../../i18n/lore';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { save, writeSave } from '../progression';
import { Npc, Stele } from '../npc';
import { Brambles } from '../brambles';
import { STEP, setMain } from '../quests';
import { giveXp, onKill, hasColour } from '../rewards';

let stamps: StampSet | null = null;
let art: ArtCache | null = null;
const CHUNK_PPU = IS_MOBILE ? 20 : 28;

/** Paint the shared stamps and prop variants (once, with a progress callback). */
export async function prepareOverworld(progress: (t: number) => void): Promise<void> {
  if (!stamps) stamps = buildStamps(CHUNK_PPU);
  progress(0.1);
  if (!art) art = await buildArtCache(IS_MOBILE, (k) => progress(0.1 + k * 0.9));
}

export function sharedArt(): ArtCache {
  return art!;
}

export function sharedStamps(): StampSet {
  return stamps!;
}

export const GROUND_DETAIL_PPU = CHUNK_PPU;

export function makeEnemy(kind: EnemyKind, x: number, y: number): Creature {
  switch (kind) {
    case 'blot': return new Blot(x, y);
    case 'mite': return new Mite(x, y);
    case 'wisp': return new Wisp(x, y);
    case 'splitter': return new Splitter(x, y);
    case 'brute': return new Brute(x, y);
    case 'totem': return new Totem(x, y);
  }
}

let shrineArt: Frame | null = null;

/** A shrine: an inkstone under two lamps. Heals, refills ink and pigment, becomes the respawn point. */
class Shrine extends Entity {
  private cool = 0;
  onUse?: (first: boolean) => void;
  constructor(readonly id: number, x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.7;
    this.solid = true;
    this.label = 'shrine';
  }
  init(w: World): void {
    if (!shrineArt) {
      const p = new Painter(2.4, 1.6, SPRITE_PPU, -1.2, -0.6);
      const o = noisyOutline(0, 0.14, 0.75, 0.38, 0.12, 81);
      p.reserve(() => o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
      p.glaze();
      washPoly(p, o, { pig: INK, density: 0.3, soft: 0.05, edge: 0.9, seed: 81 });
      washPoly(p, noisyOutline(0.05, 0.18, 0.45, 0.18, 0.1, 82), { pig: INK, density: 0.95, soft: 0.05, edge: 0.5, seed: 82 });
      stroke(p, [[-0.75, 0.12], [-0.35, 0.5], [0.35, 0.52], [0.75, 0.14]], { width: 0.07, load: 0.9, dry: 0.4, seed: 83 });
      shrineArt = frameFrom(p);
    }
    const s = this.addSprite(new Sprite(shrineArt));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = ySort(this.y);
    void w;
  }
  update(dt: number): void {
    const w = this.world;
    const p = w.player;
    this.cool -= dt;
    w.vfx.glowAt(this.x, this.y + 0.8, 2.6, 0.03);
    if (Math.hypot(p.x - this.x, p.y - this.y) < 1.7 && this.cool <= 0 && p.state !== 'dead') {
      const first = !save.shrines.includes(this.id);
      const lowPigment = hasColour() && p.pigment < p.pigmentMax - 0.5;
      if (first || p.hp < p.maxHp || p.ink < p.inkMax - 1 || lowPigment || save.shrine !== this.id) {
        p.hp = p.maxHp;
        p.ink = p.inkMax;
        if (hasColour()) p.pigment = p.pigmentMax;
        save.shrine = this.id;
        if (first) save.shrines.push(this.id);
        writeSave();
        w.checkpoint = [this.x, this.y - 1.4];
        sfx.inkstone();
        w.vfx.ripple(this.x, this.y + 0.2, 0.8);
        this.onUse?.(first);
      }
      this.cool = 2;
    }
  }
}

interface CampState {
  def: CampDef;
  state: 'dormant' | 'active' | 'cleared';
  members: Creature[];
}

export function shrineSpawn(id: number): [number, number] {
  const s = SHRINES[id] ?? SHRINES[0];
  return [s.x, s.y - 1.6];
}

/** Where the child comes out of each dungeon. */
export const SURFACE = {
  cave: [CAVE.x, CAVE.y - 1.8] as [number, number],
  temple: [TEMPLE.x, TEMPLE.y - 3.2] as [number, number],
};

/** How grey the world still is: colours return as the story moves on. */
function washedFor(main: number): number {
  if (main >= STEP.end) return 0;
  if (main >= STEP.findTemple) return 0.14;
  if (main >= STEP.indigoBack) return 0.3;
  return 0.5;
}

export const overworld: RoomDef = {
  id: 'overworld',
  area: 'overworld',
  w: WORLD.w,
  h: WORLD.h,
  palette: 'orchard',
  spawn: shrineSpawn(0),
  goal: [1, 0],
  music: 'orchard',
  post: { washed: 0.5, night: 0, fog: 0.16, fogScale: 0.1, fogDrift: [0.05, 0.02], gloom: 0 },
  exits: [
    { x: CAVE.x - 1.1, y: CAVE.y - 0.1, w: 2.2, h: 1.0, to: 'cave1', open: () => save.main >= STEP.findCave },
    { x: TEMPLE.x - 1.2, y: TEMPLE.y + 0.35, w: 2.4, h: 0.9, to: 'temple1', open: () => save.bosses.includes('ramking') },
  ],
  build(b) {
    const g: Game = b.game;
    const w = b.world;
    const r = w.r;
    const A = art!;
    w.activeRadius = 40;
    g.lampRadius = 6.5;
    r.post.washed = washedFor(save.main);
    const chunks = new Chunks(w, stamps!, A, CHUNK_PPU);
    w.cleanups.push(() => chunks.clear());
    w.scripts.push((dt) => chunks.update(dt, w.camX, w.camY, r.viewW / (2 * r.zoom), r.viewH / (2 * r.zoom)));
    w.onKill = (e) => onKill(g, e);
    g.after(0, () => chunks.buildAround(w.player.x, w.player.y, r.viewW / 2 + 2, r.viewH / 2 + 2));

    // ---------- water and walls ----------
    PONDS.forEach((p, i) => {
      const n = Math.max(2, Math.round(p.rx / p.ry * 1.5));
      for (let k = 0; k < n; k++) {
        const tt = n === 1 ? 0 : k / (n - 1) - 0.5;
        w.addCollider({ kind: 'circle', x: p.x + tt * (p.rx * 1.3), y: p.y, r: p.ry * 0.85 }, 'pond' + i);
      }
    });
    // the river's banks, open only where the bridge crosses
    const deckLo = BRIDGE.y - BRIDGE.half - 0.15, deckHi = BRIDGE.y + BRIDGE.half + 0.15;
    for (const side of [1, -1]) {
      for (let i = 0; i < RIVER_SAMPLES.length - 2; i += 2) {
        const a = RIVER_SAMPLES[i], c = RIVER_SAMPLES[i + 2];
        const ha = riverHalf(i) * 0.92, hc = riverHalf(i + 2) * 0.92;
        const ax = a.x + a.nx * ha * side, ay = a.y + a.ny * ha * side;
        const cx = c.x + c.nx * hc * side, cy = c.y + c.ny * hc * side;
        if (Math.max(ay, cy) > deckLo && Math.min(ay, cy) < deckHi) continue;
        w.addCollider({ kind: 'seg', ax, ay, bx: cx, by: cy, r: 0.3 }, 'river');
      }
    }
    for (const y of [BRIDGE.y - BRIDGE.half, BRIDGE.y + BRIDGE.half]) {
      w.addCollider({ kind: 'seg', ax: BRIDGE.x0 - 0.6, ay: y, bx: BRIDGE.x1 + 0.6, by: y, r: 0.2 }, 'river');
    }
    w.addCollider({ kind: 'seg', ax: 0, ay: NORTH_WALL, bx: WORLD.w, by: NORTH_WALL, r: 0.3 }, 'north');
    // the temple pool, until the Ram King falls
    const sealTemple = () => {
      for (let k = -2; k <= 2; k++) w.addCollider({ kind: 'circle', x: TEMPLE.x + k * 2.4, y: TEMPLE.y - 0.6, r: 2.6 }, 'templePool');
    };
    if (!save.bosses.includes('ramking')) sealTemple();

    // ---------- the brambles on the old bridge ----------
    let brambles: Brambles | null = null;
    if (!save.brambles) {
      brambles = b.add(new Brambles(A.brambles, BRIDGE.x, BRIDGE.y, BRIDGE.half));
      brambles.onRebuff = () => g.hud.showHint(L(UI.bramblesHurt), 3.5);
      brambles.onShatter = () => {
        save.brambles = true;
        writeSave();
        brambles = null;
        giveXp(g, 40);
        void g.story.show([L(UI.bramblesGone)], { size: 36, y: r.uiH / 2 - 200, hold: 2.5 });
        if (save.main >= STEP.indigoBack) setMain(g, STEP.plain);
      };
    }

    // ---------- shrines ----------
    for (const s of SHRINES) {
      const sh = b.add(new Shrine(s.id, s.x, s.y));
      sh.onUse = (first) => {
        g.hud.showHint(t('shrine'), 3);
        if (first && s.id > 0) {
          const line = [t('shrine1'), t('shrine2'), t('shrine3')][s.id - 1];
          if (line) void g.story.show([line], { size: 34, y: r.uiH / 2 - 200, hold: 2.8 });
        }
      };
    }

    // ---------- steles: the master's notebook ----------
    const steles = STELE_SPOTS.map(([x, y], i) => {
      const st = b.add(new Stele(i, x, y));
      st.read = save.steles.includes(i);
      st.onRead = () => {
        g.talk({ name: `${L(NAMES.stele)} — ${L(UI.steleRead)} ${i + 1}/${STELES.length}` }, [L(STELES[i])], () => {
          if (!save.steles.includes(i)) {
            save.steles.push(i);
            writeSave();
            giveXp(g, 15);
          }
          st.read = true;
        });
      };
      return st;
    });
    void steles;

    // ---------- the villagers ----------
    const speak = (n: Npc, pages: string[], after?: () => void) => g.talk({ name: n.displayName, ...n.portrait() }, pages, after);
    const willow = b.add(new Npc('willow', L(NAMES.willow), {
      seed: 11, scale: 1.12, robe: mixPig(INK, PIG_B, 0.5), robeDensity: 0.22, hair: 'white', hat: 'none', bent: 0.8, prop: 'cane',
    }, ...NPC_SPOTS.willow));
    const madder = b.add(new Npc('madder', L(NAMES.madder), {
      seed: 12, scale: 1.18, robe: mixPig(INK, PIG_A, 0.4), robeDensity: 0.2, hair: 'bun', hat: 'scarf', apron: true, prop: 'cloth',
    }, ...NPC_SPOTS.madder));
    const elm = b.add(new Npc('elm', L(NAMES.elm), {
      seed: 13, scale: 1.25, robe: INK, robeDensity: 0.3, hair: 'short', hat: 'cone', prop: 'spear', redSash: true, beard: true,
    }, ...NPC_SPOTS.elm));
    const pip = b.add(new Npc('pip', L(NAMES.pip), {
      seed: 14, scale: 0.88, robe: mixPig(INK, PIG_B, 0.3), robeDensity: 0.25, hair: 'short', hat: 'none', prop: 'kite',
    }, ...NPC_SPOTS.pip, 4));
    const linden = b.add(new Npc('linden', L(NAMES.linden), {
      seed: 15, scale: 1.15, robe: mixPig(INK, PIG_B, 0.6), robeDensity: 0.2, hair: 'none', hat: 'straw', prop: 'basket', beard: true, bent: 0.3,
    }, ...NPC_SPOTS.linden, 2.5));

    willow.onTalk = () => {
      const m = save.main;
      if (m === STEP.meetWillow) speak(willow, LL(WILLOW[0]), () => setMain(g, STEP.orchard));
      else if (m === STEP.orchard) speak(willow, LL(WILLOW[1]));
      else if (m === STEP.orchardBack) speak(willow, LL(WILLOW[2]), () => {
        giveXp(g, 60);
        setMain(g, STEP.findCave);
        g.after(4.6, () => g.hud.showHint(L(UI.lantern), 3));
      });
      else if (m === STEP.findCave || m === STEP.caveDeep) speak(willow, LL(WILLOW[3]));
      else if (m === STEP.indigoBack) speak(willow, LL(WILLOW[5]), () => {
        giveXp(g, 120);
        setMain(g, save.brambles ? STEP.plain : STEP.brambles);
      });
      else if (m === STEP.brambles) speak(willow, LL(WILLOW[6]));
      else if (m === STEP.plain) speak(willow, LL(WILLOW[7]));
      else if (m === STEP.findTemple || m === STEP.templeDeep) speak(willow, LL(WILLOW[8]));
      else if (m === STEP.goldBack) speak(willow, LL(WILLOW[10]), () => {
        giveXp(g, 300);
        setMain(g, STEP.end);
        r.post.washed = 0;
        w.flash = 0.5;
        sfx.enso(5, 8);
        music.motif(false, 'bell', 1);
      });
      else speak(willow, LL(WILLOW[11]));
    };
    const refill = () => {
      const p = g.player;
      p.pigment = p.pigmentMax;
      sfx.inkstone();
      w.vfx.ripple(p.x, p.y, 1);
      g.hud.showHint(L(UI.pigmentFull), 2);
    };
    madder.onTalk = () => {
      if (!hasColour()) speak(madder, LL(MADDER.noInk));
      else if (!save.madder) speak(madder, LL(MADDER.first), () => { save.madder = true; writeSave(); refill(); });
      else { refill(); speak(madder, LL(MADDER.refill)); }
    };
    elm.onTalk = () => {
      if (save.bosses.includes('ramking')) speak(elm, LL(ELM.ram));
      else if (save.brambles) speak(elm, LL(ELM.open));
      else if (save.inks.includes('indigo')) speak(elm, LL(ELM.indigo));
      else speak(elm, LL(ELM.before));
    };
    pip.onTalk = () => {
      const lines = LL(PIP);
      speak(pip, [lines[save.pip % lines.length]]);
      save.pip++;
      writeSave();
    };
    linden.onTalk = () => {
      if (save.main >= STEP.end) speak(linden, LL(LINDEN.late));
      else if (save.inks.includes('indigo')) speak(linden, LL(LINDEN.indigo));
      else speak(linden, LL(LINDEN.early));
    };
    w.scripts.push(() => {
      const m = save.main;
      willow.marker = m === STEP.meetWillow || m === STEP.orchardBack || m === STEP.indigoBack || m === STEP.goldBack ? 'quest' : 'none';
      madder.marker = hasColour() && !save.madder ? 'quest' : 'none';
      elm.marker = save.inks.includes('indigo') && !save.brambles ? 'quest' : 'none';
    });

    // ---------- camps ----------
    const sameSide = (ax: number, ay: number, bx: number, by: number) => (ax < riverX(ay)) === (bx < riverX(by));
    const camps: CampState[] = CAMPS.map((def) => ({ def, state: save.camps.includes(def.id) ? 'cleared' : 'dormant', members: [] }));
    const spawnCamp = (c: CampState) => {
      c.state = 'active';
      let elites = c.def.elites;
      c.def.members.forEach((kind, i) => {
        const a = (i / c.def.members.length) * Math.PI * 2 + c.def.id;
        const rr = kind === 'totem' ? 0 : c.def.r * (0.4 + 0.5 * ((i * 37) % 10) / 10);
        const e = makeEnemy(kind, c.def.x + Math.cos(a) * rr, c.def.y + Math.sin(a) * rr * 0.8);
        const elite = elites > 0 && kind !== 'mite' && kind !== 'totem';
        if (elite) elites--;
        e.setup(c.def.tier, elite);
        e.home = [c.def.x, c.def.y];
        b.add(e);
        c.members.push(e);
      });
    };
    w.scripts.push(() => {
      const p = w.player;
      for (const c of camps) {
        if (c.state === 'cleared') continue;
        const d = Math.hypot(p.x - c.def.x, p.y - c.def.y);
        if (c.state === 'dormant' && d < 20 && (save.brambles || sameSide(p.x, p.y, c.def.x, c.def.y))) spawnCamp(c);
        else if (c.state === 'active') {
          c.members = c.members.filter((e) => !e.dead);
          if (!c.members.length) {
            c.state = 'cleared';
            save.camps.push(c.def.id);
            writeSave();
            const bonus = 15 * c.def.tier;
            g.hud.showHint(`${t('campCleared')}  +${bonus}`, 2.5);
            giveXp(g, bonus);
            sfx.wave();
            w.vfx.ripple(c.def.x, c.def.y, 3);
            if (save.main === STEP.orchard && ORCHARD_CAMPS.every((id) => save.camps.includes(id))) g.after(2.6, () => setMain(g, STEP.orchardBack));
          } else if (d > 38 || p.state === 'dead') {
            for (const e of c.members) e.destroy();
            c.members = [];
            c.state = 'dormant';
          }
        }
      }
    });

    // ---------- the guardian ----------
    let boss: RamKing | null = null;
    const gate = () => {
      w.addCollider({ kind: 'seg', ax: ARENA.x - ARENA.r - 1, ay: ARENA.y - 3, bx: ARENA.x - ARENA.r - 1, by: ARENA.y + 3, r: 0.4 }, 'gate');
    };
    const startBoss = () => {
      boss = b.add(new RamKing(ARENA.x + 2, ARENA.y + 1, ARENA));
      gate();
      g.hud.showBoss(t('bossRam'));
      sfx.wave();
      boss.onDefeat = () => {
        music.boss = 0.2;
        w.removeColliders('gate');
        g.hud.hideBoss();
        save.bosses.push('ramking');
        writeSave();
        giveXp(g, 300);
        for (let i = 0; i < 4; i++) b.add(new Pickup(boss!.x, boss!.y, i % 2 ? 'ink' : 'life', i % 2 ? 10 : 2));
        if (hasColour()) b.add(new Pickup(boss!.x, boss!.y, 'pigment', 8));
        // the temple's waters recede
        w.removeColliders('templePool');
        chunks.invalidate(TEMPLE.x, TEMPLE.y, 10);
        g.after(1.2, () => {
          void g.story.show([t('bossDown')], { size: 42, y: r.uiH / 2 - 200, hold: 2.5 });
          g.after(3.4, () => void g.story.show([L(UI.temple)], { size: 36, y: r.uiH / 2 - 200, hold: 3 }));
          g.after(4, () => { if (save.main >= STEP.indigoBack) setMain(g, STEP.findTemple); });
        });
      };
    };
    w.scripts.push(() => {
      const p = w.player;
      if (save.bosses.includes('ramking') || boss) {
        if (boss) g.hud.bossFrac = boss.frac;
        return;
      }
      if (Math.hypot(p.x - ARENA.x, p.y - ARENA.y) < ARENA.r - 2) startBoss();
    });
    g.onRespawn = () => {
      if (boss && !boss.defeated) {
        boss.destroy();
        boss = null;
        w.removeColliders('gate');
        g.hud.hideBoss();
      }
      for (const e of w.entities) if (e.label === 'mite' && !(e as Creature).home) e.destroy();
      const [sx, sy] = shrineSpawn(save.shrine);
      w.player.x = sx;
      w.player.y = sy;
      w.camX = sx; w.camY = sy;
      chunks.buildAround(sx, sy, r.viewW / 2 + 2, r.viewH / 2 + 2);
    };

    // ---------- the ways down ----------
    let sealHintT = 0;
    w.scripts.push((dt) => {
      const p = w.player;
      sealHintT -= dt;
      if (sealHintT > 0) return;
      if (save.main < STEP.findCave && Math.hypot(p.x - CAVE.x, p.y - CAVE.y) < 2.4) {
        g.hud.showHint(L(UI.noLantern), 4);
        sealHintT = 8;
      } else if (!save.bosses.includes('ramking') && Math.hypot(p.x - TEMPLE.x, p.y - (TEMPLE.y - 4)) < 4) {
        g.hud.showHint(L(UI.sealed), 4);
        sealHintT = 8;
      }
    });

    // ---------- regions: name, music, light; where to go next ----------
    let region = '';
    const storm = new Storm(w, IS_MOBILE ? 36 : 80, -3.5, -14);
    const objective = (): [number, number] | null => {
      const m = save.main;
      if (m === STEP.meetWillow || m === STEP.orchardBack || m === STEP.indigoBack || m === STEP.goldBack) return [willow.x, willow.y];
      if (m === STEP.orchard) {
        const p = w.player;
        let best: [number, number] | null = null, bd = Infinity;
        for (const id of ORCHARD_CAMPS) {
          if (save.camps.includes(id)) continue;
          const c = CAMPS[id];
          const d = Math.hypot(c.x - p.x, c.y - p.y);
          if (d < bd) { bd = d; best = [c.x, c.y]; }
        }
        return best;
      }
      if (m === STEP.findCave || m === STEP.caveDeep) return [CAVE.x, CAVE.y];
      if (m === STEP.brambles) return [BRIDGE.x, BRIDGE.y];
      if (m === STEP.plain) {
        const next = SHRINES.slice(1).find((s) => !save.shrines.includes(s.id));
        return next ? [next.x, next.y] : [ARENA.x, ARENA.y];
      }
      if (m === STEP.findTemple || m === STEP.templeDeep) return [TEMPLE.x, TEMPLE.y - 1];
      return null;
    };
    w.scripts.push((dt) => {
      const p = w.player;
      const reg = regionAt(p.x, p.y);
      if (reg !== region) {
        const firstTime = region !== '';
        region = reg;
        const R = REGIONS[reg];
        if (firstTime) void g.story.show([R.name[lang]], { size: 46, y: r.uiH / 2 - 120, hold: 1.4, italic: false });
        music.play(R.music);
        storm.lightning = reg === 'arena';
      }
      const targetNight = region === 'arena' ? 0.2 : region === 'village' ? 0 : 0.05;
      r.post.night += (targetNight - r.post.night) * Math.min(1, dt * 1.5);
      const wt = save.main >= STEP.end ? 0 : washedFor(save.main);
      r.post.washed += (wt - r.post.washed) * Math.min(1, dt * 0.5);
      storm.update(dt);
      let aggro = 0;
      for (const e of w.entities) {
        const c = e as Creature;
        if (e.team === 'enemy' && !e.dead && c.aggro && Math.hypot(e.x - p.x, e.y - p.y) < 16) aggro++;
      }
      music.boss = boss && !boss.defeated ? 1 : aggro ? Math.min(1, 0.4 + aggro * 0.06 + w.combo * 0.03) : 0.05;
      const target = objective();
      const vh = r.viewH / r.zoom, vw = vh * (r.pxW / r.pxH);
      g.hud.arrowTarget = target ? [((target[0] - w.camX) / vw) * r.uiW, ((target[1] - w.camY) / vh) * r.uiH] : null;
      w.areaName = REGIONS[region]?.id ?? region;
      w.roomName = `chunks ${chunks.count} · lvl ${save.level} · step ${save.main}`;
    });

    // ---------- first steps ----------
    if (!g.flags.has('owIntro')) {
      g.flags.add('owIntro');
      if (save.main === STEP.meetWillow) {
        g.after(0.5, () => void g.story.show([t('owTitle'), t('owSub')], { size: 46, y: r.uiH / 2 - 230, hold: 2, italic: false, stagger: 0.6 }));
        g.after(1.5, () => g.hud.showHint(g.input.device === 'touch' ? t('owHintMove') : t('owHintMoveKbm'), 7));
        if (g.input.device === 'touch') g.after(10, () => g.hud.showHint(t('owHintHold'), 5));
      }
    }
  },
};
