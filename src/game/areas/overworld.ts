/** The open world: village and plain, camps, shrines, the Ram King's stone circle. */
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
import { WORLD, CAMPS, SHRINES, PONDS, ARENA, REGIONS, CampDef, EnemyKind, regionAt } from '../../world/layout';
import { Sprite, Frame, frameFrom, ySort } from '../../gfx/sprite';
import { Painter, INK, LIGHT } from '../../gfx/paint';
import { washPoly, noisyOutline } from '../../gfx/wash';
import { stroke } from '../../gfx/brush';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { IS_MOBILE } from '../../core/renderer';
import { t, lang } from '../../i18n';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { save, writeSave, gainXp } from '../progression';
import { INKS, InkId } from '../inks';

let stamps: StampSet | null = null;
let art: ArtCache | null = null;
const CHUNK_PPU = IS_MOBILE ? 20 : 28;

/** Paint the shared stamps and prop variants (once, with a progress callback). */
export async function prepareOverworld(progress: (t: number) => void): Promise<void> {
  if (!stamps) stamps = buildStamps(CHUNK_PPU);
  progress(0.1);
  if (!art) art = await buildArtCache(IS_MOBILE, (k) => progress(0.1 + k * 0.9));
}

function makeEnemy(kind: EnemyKind, x: number, y: number): Creature {
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

/** A shrine: an inkstone under two lamps. Heals, refills ink, becomes the respawn point. */
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
      if (first || p.hp < p.maxHp || p.ink < p.inkMax - 1 || save.shrine !== this.id) {
        p.hp = p.maxHp;
        p.ink = p.inkMax;
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

export const overworld: RoomDef = {
  id: 'overworld',
  area: 'overworld',
  w: WORLD.w,
  h: WORLD.h,
  palette: 'orchard',
  spawn: shrineSpawn(0),
  goal: [1, 0],
  music: 'orchard',
  post: { washed: 0, night: 0, fog: 0.16, fogScale: 0.1, fogDrift: [0.05, 0.02] },
  build(b) {
    const g: Game = b.game;
    const w = b.world;
    const r = w.r;
    w.activeRadius = 40;
    const chunks = new Chunks(w, stamps!, art!, CHUNK_PPU);
    w.cleanups.push(() => chunks.clear());
    const start = shrineSpawn(save.shrine);
    chunks.buildAround(start[0], start[1], r.viewW / 2 + 2, r.viewH / 2 + 2);
    w.scripts.push((dt) => chunks.update(dt, w.camX, w.camY, r.viewW / (2 * r.zoom), r.viewH / (2 * r.zoom)));
    // ponds are solid water
    PONDS.forEach((p, i) => {
      const n = Math.max(2, Math.round(p.rx / p.ry * 1.5));
      for (let k = 0; k < n; k++) {
        const tt = n === 1 ? 0 : k / (n - 1) - 0.5;
        w.addCollider({ kind: 'circle', x: p.x + tt * (p.rx * 1.3), y: p.y, r: p.ry * 0.85 }, 'pond' + i);
      }
    });

    // shrines
    for (const s of SHRINES) {
      const sh = b.add(new Shrine(s.id, s.x, s.y));
      sh.onUse = (first) => {
        g.hud.showHint(t('shrine'), 3);
        if (first && s.id > 0) {
          const line = [t('shrine1'), t('shrine2'), t('shrine3')][s.id - 1];
          if (line) void g.story.show([line], { size: 34, y: r.uiH / 2 - 200, hold: 2.8 });
        }
        if (s.id === 1 && !save.inks.includes('indigo')) g.after(1.2, () => unlockInk('indigo'));
      };
    }

    const unlockInk = (id: InkId) => {
      if (save.inks.includes(id)) return;
      save.inks.push(id);
      writeSave();
      const def = INKS[id];
      sfx.uiConfirm();
      music.motif(false, 'bell', 1);
      w.flash = 0.4;
      void g.story.show([`${t('inkFound')} : ${def.name[lang]}`, def.verb[lang]], { size: 44, y: r.uiH / 2 - 230, hold: 3, italic: false, stagger: 0.6 });
      g.after(2.5, () => g.hud.showHint(g.input.device === 'touch' ? t('inkSwitchTouch') : t('inkSwitchKbm'), 6));
      g.player.selectInk(id);
    };

    // camps
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
        if (c.state === 'dormant' && d < 20) spawnCamp(c);
        else if (c.state === 'active') {
          c.members = c.members.filter((e) => !e.dead);
          if (!c.members.length) {
            c.state = 'cleared';
            save.camps.push(c.def.id);
            writeSave();
            const bonus = 15 * c.def.tier;
            g.hud.showHint(`${t('campCleared')}  +${bonus}`, 2.5);
            giveXp(bonus);
            sfx.wave();
            w.vfx.ripple(c.def.x, c.def.y, 3);
          } else if (d > 38 || p.state === 'dead') {
            for (const e of c.members) e.destroy();
            c.members = [];
            c.state = 'dormant';
          }
        }
      }
    });

    // experience, levels and drops
    const giveXp = (n: number) => {
      const ups = gainXp(n);
      writeSave();
      if (ups > 0) {
        const p = w.player;
        p.hp = p.maxHp;
        p.ink = p.inkMax;
        sfx.uiConfirm();
        sfx.enso(3, 6);
        w.flash = Math.max(w.flash, 0.3);
        for (let i = 0; i < 6; i++) w.vfx.splat(p.x, p.y + 0.5, (i / 6) * Math.PI * 2, 6, 1.2, 'red');
        w.numbers?.pop(p.x, p.y + 2, `${t('levelUp')} ${save.level}`, { red: true, size: 0.7, life: 1.8, big: true });
      }
    };
    w.onKill = (e) => {
      const c = e as Creature;
      giveXp(c.xp ?? 3);
      const lifeChance = c.elite ? 1 : 0.12, inkChance = c.elite ? 1 : 0.22;
      if (Math.random() < lifeChance) b.add(new Pickup(e.x, e.y, 'life', 1));
      if (Math.random() < inkChance) b.add(new Pickup(e.x, e.y, 'ink', 7));
      if (!g.flags.has('drawHint')) {
        g.flags.add('drawHint');
        g.after(1.5, () => g.hud.showHint(g.input.device === 'touch' ? t('owHintDraw') : t('hintEnso'), 6));
      }
    };

    // the guardian
    let boss: RamKing | null = null;
    const gate = () => {
      // close the gap in the standing stones
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
        giveXp(300);
        for (let i = 0; i < 4; i++) b.add(new Pickup(boss!.x, boss!.y, i % 2 ? 'ink' : 'life', i % 2 ? 10 : 2));
        g.after(1.2, () => {
          void g.story.show([t('bossDown')], { size: 42, y: r.uiH / 2 - 200, hold: 2.5 });
          g.after(3.2, () => unlockInk('gold'));
          g.after(9, () => void g.story.show([t('nextRegion')], { size: 34, y: r.uiH / 2 - 200, hold: 3 }));
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
      // a lost fight resets the guardian
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

    // regions: name, music, light
    let region = '';
    const storm = new Storm(w, IS_MOBILE ? 36 : 80, -3.5, -14);
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
      const targetNight = region === 'arena' ? 0.2 : region === 'village' ? 0 : 0.06;
      r.post.night += (targetNight - r.post.night) * Math.min(1, dt * 1.5);
      storm.update(dt);
      // intensity follows the fight
      let aggro = 0;
      for (const e of w.entities) {
        const c = e as Creature;
        if (e.team === 'enemy' && !e.dead && c.aggro && Math.hypot(e.x - p.x, e.y - p.y) < 16) aggro++;
      }
      music.boss = boss && !boss.defeated ? 1 : aggro ? Math.min(1, 0.4 + aggro * 0.06 + w.combo * 0.03) : 0.05;
      // where to go next
      const next = SHRINES.slice(1).find((s) => !save.shrines.includes(s.id));
      const target: [number, number] = next ? [next.x, next.y] : [ARENA.x, ARENA.y];
      const vh = r.viewH / r.zoom, vw = vh * (r.pxW / r.pxH);
      g.hud.arrowTarget = save.bosses.includes('ramking') ? null : [((target[0] - w.camX) / vw) * r.uiW, ((target[1] - w.camY) / vh) * r.uiH];
      w.areaName = REGIONS[region]?.id ?? region;
      w.roomName = `chunks ${chunks.count} · lvl ${save.level} · xp ${save.xp}`;
    });

    // first steps
    if (!g.flags.has('owIntro')) {
      g.flags.add('owIntro');
      g.after(0.5, () => void g.story.show([t('owTitle'), t('owSub')], { size: 46, y: r.uiH / 2 - 230, hold: 2, italic: false, stagger: 0.6 }));
      g.after(1.5, () => g.hud.showHint(g.input.device === 'touch' ? t('owHintMove') : t('owHintMoveKbm'), 7));
      if (g.input.device === 'touch') g.after(10, () => g.hud.showHint(t('owHintHold'), 5));
    }
    void LIGHT;
  },
};
