/**
 * Act III's open world, the White Peaks: the Cloud Stair, the windswept slopes, the Hanging
 * Monastery and its people, the Frost Forest, the Glacier and its crevasses, the Erased Valley,
 * and the three bells that held the page taut.
 */
import type { RoomDef } from '../room';
import type { Game } from '../game';
import type { World } from '../world';
import { Entity } from '../entity';
import { Creature } from '../enemies';
import { Chunks } from '../../world/chunks';
import { PEAKS, P3, P3_ENTRY, P3_NORTH, P3_PONDS, P3_CAMPS, P3_SHRINES, P3_REGIONS, P3_MONASTERY, P3_BELLS, P3_CREVASSES, P3_TEARS, P3_KING, P3_DRAGON, P3_SUMMIT, P3_GATE, P3_HAND, P3_VISTAS, P3_HEART_STAIR, P3_RING, p3RingArc, p3RegionAt } from '../../world/peaks';
import { p3MapSource } from '../../world/p3Map';
import type { EnemyKind } from '../../world/layout';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../../gfx/sprite';
import { Painter, INK, PIG_A, PIG_B, VERMILION, ERASE, mixPig } from '../../gfx/paint';
import { washPoly, noisyOutline, roughen } from '../../gfx/wash';
import { stroke } from '../../gfx/brush';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { lang, t } from '../../i18n';
import { L, LL } from '../../i18n/lore';
import { HEART_UI } from '../../i18n/heart';
import { NAMES3, SNOW, IDLE3, REGION_LORE3, ACT3_TITLE, BELL3_UI, KING_UI, DRAGON_UI, SEAL_UI, SUMMIT_UI, HAND_UI, MASTER, MASTER_NAME, CHOICE_END, REVEAL, ENDINGS } from '../../i18n/lore3';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { save, writeSave } from '../progression';
import { Npc } from '../npc';
import { STEP, setMain } from '../quests';
import { giveXp, onKill, discover } from '../rewards';
import { Pickup } from '../pickups';
import { dropLoot } from '../loot';
import { Boss } from '../boss';
import { SnowKing } from '../bosses/snowKing';
import { PaperDragon } from '../bosses/paperDragon';
import { MasterHand } from '../bosses/masterHand';
import { buildSealGate, buildPlantedBrush } from '../../gfx/gen/bestiary5';
import { makeEnemy, sharedArt, sharedStamps, GROUND_DETAIL_PPU, Shrine } from './overworld';
import { runCamps } from '../camps';
import { Events } from '../events';
import { act3Shots, revealShots, endingShots } from '../../ui/cinematic';
import type { Choice } from '../../ui/dialog';
import { pointInPoly } from '../physics';

export function p3ShrineSpawn(id: number): [number, number] {
  const s = P3_SHRINES.find((q) => q.id === id) ?? P3_SHRINES[0];
  return [s.x, s.y - 1.6];
}

let bellArt: { pig: Frame; red: Frame; shadow: Frame } | null = null;
function bellFrames() {
  if (bellArt) return bellArt;
  const p = new Painter(3, 3.6, SPRITE_PPU / 1.5, -1.5, -0.3);
  const q = new Painter(3, 3.6, SPRITE_PPU / 2, -1.5, -0.3);
  p.glaze();
  q.glaze();
  // a frame of two posts and a curved roof
  for (const x of [-1.05, 1.05]) stroke(p, [[x, 0], [x, 2.7]], { width: 0.13, load: 1, dry: 0.3, seed: 4601 + x * 10 });
  stroke(p, [[-1.4, 2.65], [0, 2.95], [1.4, 2.65]], { width: 0.18, load: 1, seed: 4603 });
  stroke(p, [[-1.25, 2.85], [0, 3.2], [1.25, 2.85]], { width: 0.1, load: 0.9, seed: 4604 });
  // the bronze bell
  const bell: [number, number][] = [];
  for (let k = 0; k <= 16; k++) { const tt = k / 16; bell.push([-(0.3 + tt * tt * 0.45), 2.35 - tt * 1.5]); }
  for (let k = 16; k >= 0; k--) { const tt = k / 16; bell.push([0.3 + tt * tt * 0.45, 2.35 - tt * 1.5]); }
  p.reserve(() => bell.forEach((v, i) => (i === 0 ? p.ctx.moveTo(v[0], v[1]) : p.ctx.lineTo(v[0], v[1]))), 0.95);
  p.glaze();
  washPoly(p, bell, { pig: mixPig(INK, PIG_B, 0.6), density: 0.6, soft: 0.05, edge: 0.9, seed: 4605 });
  for (let k = 0; k < 3; k++) stroke(p, [[-0.5, 1.6 - k * 0.3], [0.5, 1.6 - k * 0.3]], { width: 0.03, load: 0.6, seed: 4606 + k });
  for (let k = 0; k < 9; k++) p.circle(-0.32 + (k % 3) * 0.32, 2.0 - Math.floor(k / 3) * 0.16, 0.035, INK, 0.8);
  // the red cord of the striker
  stroke(q, [[0, 2.62], [0.05, 2.35]], { width: 0.05, pig: VERMILION, load: 1, seed: 4610 });
  stroke(q, [[0.75, 1.5], [1.3, 1.45]], { width: 0.12, pig: VERMILION, load: 0.9, seed: 4611 });
  const sp = new Painter(3, 1.2, SPRITE_PPU / 3, -1.5, -0.6);
  sp.glaze();
  shadow(sp, 0, 0, 1.3, 0.35, 0.4);
  bellArt = { pig: frameFrom(p), red: frameFrom(q), shadow: frameFrom(sp) };
  return bellArt;
}

/** A bell of the peaks: silent until it is rung. A fake (a fox's illusion) casts no shadow. */
class PeakBell extends Entity {
  private body!: Sprite;
  private redS!: Sprite;
  private shadowS: Sprite | null = null;
  private t = 0;
  private swing = 0;
  rung = false;
  faded = false;
  onRing?: () => void;
  constructor(readonly index: number, x: number, y: number, readonly fake = false) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.9;
    this.solid = true;
    this.weight = Infinity;
    this.interactive = true;
    this.label = 'peakBell';
    this.promptH = 3.4;
  }
  init(w: World): void {
    const f = bellFrames();
    if (!this.fake) {
      this.shadowS = new Sprite(f.shadow);
      this.shadowS.mesh.renderOrder = LAYER.shadow;
      w.r.scenePig.add(this.shadowS.mesh);
      this.sprites.push(this.shadowS);
      this.shadowS.setPos(this.x, this.y);
    }
    this.body = this.addSprite(new Sprite(f.pig));
    this.redS = this.addSprite(new Sprite(f.red), true);
    for (const s of [this.body, this.redS]) { s.setPos(this.x, this.y); s.mesh.renderOrder = ySort(this.y); }
  }
  interact(): void {
    if (!this.rung) this.onRing?.();
  }
  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    for (const s of this.sprites) { s.setPos(x, y); s.mesh.renderOrder = ySort(y); }
    if (this.shadowS) this.shadowS.mesh.renderOrder = LAYER.shadow;
  }
  ring(): void {
    this.rung = true;
    this.interactive = false;
    this.swing = 3;
    const w = this.world;
    sfx.inkstone();
    music.motif(true, 'bell', 0);
    w.shake(0.25, 0.8);
    for (let k = 0; k < 6; k++) w.vfx.ripple(this.x, this.y, 1.5 + k * 1.6);
  }
  update(dt: number): void {
    this.t += dt;
    this.swing = Math.max(0, this.swing - dt);
    const a = this.swing > 0 ? Math.sin(this.t * 9) * 0.05 * this.swing : 0;
    for (const s of [this.body, this.redS]) s.mesh.rotation.z = a;
    const op = this.faded ? 0.12 + Math.sin(this.t * 2) * 0.05 : 1;
    this.body.opacity = op;
    this.redS.opacity = this.faded ? 0 : 1;
    if (this.shadowS) this.shadowS.opacity = this.faded ? 0.1 : 1;
    if (this.rung && Math.random() < dt * 0.6) this.world.vfx.ripple(this.x, this.y, 2 + Math.random() * 3);
  }
}

export const peaks: RoomDef = {
  id: 'peaks',
  area: 'peaks',
  w: P3.w,
  h: P3.h,
  palette: 'snow',
  spawn: P3_ENTRY,
  goal: [0, 1],
  music: 'peaks',
  post: { washed: 0, night: 0, fog: 0.3, fogScale: 0.08, fogDrift: [0.06, 0.01], gloom: 0 },
  exits: [
    { x: P3.w / 2 - 6, y: 0, w: 12, h: 1.2, to: 'terraces', spawn: [62, 137.5] },
    // beside the summit gate, once it is open: down into the heart of the mountain
    { x: P3_HEART_STAIR[0] - 1, y: P3_HEART_STAIR[1] - 0.6, w: 2, h: 1.2, to: 'heart1', open: () => !!save.perks.summitOpen },
  ],
  map: (g) => p3MapSource(g),
  build(b) {
    const g: Game = b.game;
    const w = b.world;
    const r = w.r;
    const A = sharedArt();
    w.activeRadius = 40;
    g.lampRadius = 6.5;
    const chunks = new Chunks(w, sharedStamps(), A, GROUND_DETAIL_PPU, PEAKS);
    w.cleanups.push(() => chunks.clear());
    w.scripts.push((dt) => chunks.update(dt, w.camX, w.camY, r.viewW / (2 * r.zoom), r.viewH / (2 * r.zoom)));
    w.onKill = (e) => onKill(g, e);
    g.after(0, () => chunks.buildAround(w.player.x, w.player.y, r.viewW / 2 + 2, r.viewH / 2 + 2));

    // ---------- ice, crevasses, torn paper, the mountain wall ----------
    P3_PONDS.forEach((p, i) => {
      for (let k = 0; k < 3; k++) w.addCollider({ kind: 'circle', x: p.x + (k - 1) * p.rx * 0.6, y: p.y, r: p.ry * 0.85 }, 'p3pond' + i);
    });
    for (const c of P3_CREVASSES) w.hazards.push({ kind: 'void', poly: c });
    for (const c of P3_TEARS) w.hazards.push({ kind: 'void', poly: c });
    w.addCollider({ kind: 'seg', ax: 0, ay: P3_NORTH, bx: P3.w, by: P3_NORTH, r: 0.3 }, 'north');

    // ---------- shrines ----------
    for (const s of P3_SHRINES) {
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
    runCamps(g, b, P3_CAMPS, makeEnemy);
    const localKinds = (reg: string): { kinds: EnemyKind[]; champions: EnemyKind[]; tier: number } | null => {
      if (reg === 'monastery' || reg === 'summit') return null;
      if (reg === 'forest') return { kinds: ['snowfox', 'snowfox', 'yeti'], champions: ['snowfox', 'yeti'], tier: 4 };
      if (reg === 'glacier') return { kinds: ['crane', 'crane', 'yeti'], champions: ['crane', 'yeti'], tier: 5 };
      if (reg === 'erased') return { kinds: ['eraser', 'eraser', 'crane'], champions: ['eraser'], tier: 5 };
      return { kinds: ['crane', 'snowfox', 'yeti'], champions: ['yeti', 'crane'], tier: 4 };
    };
    const events = new Events(g, {
      make: (k, x, y) => makeEnemy(k, x, y),
      local: (x, y) => localKinds(p3RegionAt(x, y)),
      calm: () => {
        const p = w.player;
        if (g.dialog.active || g.sheetOpen || p.state === 'dead' || g.hud.bossVis > 0) return false;
        const reg = p3RegionAt(p.x, p.y);
        if (reg === 'monastery' || reg === 'summit') return false;
        return !w.entities.some((e) => e.team === 'enemy' && !e.dead && (e as Creature).aggro && Math.hypot(e.x - p.x, e.y - p.y) < 16);
      },
    });
    g.events = events;
    w.scripts.push((dt) => events.update(dt));

    // ---------- the people of the monastery ----------
    const M = P3_MONASTERY;
    const speak = (n: Npc, pages: string[], after?: () => void, choices?: Choice[]) => g.talk({ name: n.displayName, ...n.portrait() }, pages, after, choices);
    const npc = (id: string, look: ConstructorParameters<typeof Npc>[2], x: number, y: number, wander = 0) => b.add(new Npc(id, L(NAMES3[id]), look, x, y, wander));
    const snow = npc('snow', { seed: 41, scale: 1.12, robe: mixPig(INK, PIG_B, 0.15), robeDensity: 0.06, hair: 'white', hat: 'none', bent: 0.2, prop: 'cane' }, M.x, M.y + 2.5);
    const kun = npc('kun', { seed: 42, scale: 1.05, robe: mixPig(INK, PIG_A, 0.6), robeDensity: 0.25, hair: 'none', hat: 'none', beard: true }, M.x - 7.5, M.y + 0.6);
    const jun = npc('jun', { seed: 43, scale: 1.1, robe: mixPig(INK, PIG_B, 0.5), robeDensity: 0.3, hair: 'short', hat: 'scarf', bent: 0.3, beard: true, prop: 'cane' }, M.x + 9.5, M.y - 5.6, 2);
    const suzu = npc('suzu', { seed: 44, scale: 0.98, robe: mixPig(INK, PIG_A, 0.35), robeDensity: 0.22, hair: 'bun', hat: 'none', apron: true, prop: 'cloth' }, M.x + 4, M.y - 0.6);
    const pema = npc('pema', { seed: 45, scale: 0.82, robe: mixPig(INK, PIG_A, 0.7), robeDensity: 0.2, hair: 'none', hat: 'none', redSash: true }, M.x - 3, M.y - 6, 3);
    const people: Npc[] = [snow, kun, jun, suzu, pema];
    if (save.quests.kaze?.c === 'ally') people.push(npc('kaze', { seed: 19, scale: 1.2, robe: INK, robeDensity: 0.45, hair: 'long', hat: 'cone', prop: 'cane', redSash: true }, 104, 40));
    for (const n of people) n.onTalk = () => speak(n, LL(IDLE3[n.id] ?? IDLE3.snow));
    snow.onTalk = () => {
      const m = save.main;
      if (m <= STEP.snow) speak(snow, LL(SNOW.meet), () => { if (save.main < STEP.bells) { giveXp(g, 200); setMain(g, STEP.bells); } });
      else if (m === STEP.bells) speak(snow, LL(SNOW.bells));
      else if (m === STEP.bellsBack) speak(snow, LL(SNOW.back), () => { if (save.main === STEP.bellsBack) { giveXp(g, 300); setMain(g, STEP.kings); } });
      else if (m === STEP.kings) speak(snow, LL(SNOW.kings));
      else if (m === STEP.sealBack) {
        speak(snow, LL(SNOW.seal), () => {
          if (save.main !== STEP.sealBack) return;
          save.perks.seal = 1;
          giveXp(g, 600);
          w.vfx.splat(snow.x, snow.y + 1.4, 0, 12, 1, 'red');
          sfx.uiConfirm();
          void g.story.show([L(SEAL_UI.joined)], { size: 38, y: r.uiH / 2 - 200, hold: 3 });
          setMain(g, STEP.summit);
        });
      } else if (save.perks.ending) speak(snow, LL(save.perks.ending === 1 ? SNOW.endSign : SNOW.endBrush));
      else speak(snow, LL(SNOW.after));
    };
    suzu.onTalk = () => speak(suzu, LL(IDLE3.suzu), undefined, [
      { label: lang === 'fr' ? 'Voir tes marchandises' : 'See your goods', act: () => g.shop.open(suzu.displayName) },
      { label: lang === 'fr' ? 'Rien, merci' : 'Nothing, thanks', act: () => {} },
    ]);
    const mainBusiness: Record<string, () => boolean> = {
      snow: () => (save.main >= STEP.act3 && save.main <= STEP.snow) || save.main === STEP.bellsBack || save.main === STEP.sealBack,
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

    // loops drawn on the peaks: several things listen (the valley bell, Suzu's stones)
    const loopHooks: ((e: Parameters<NonNullable<Game['onEnso']>>[0]) => void)[] = [];
    g.onEnso = (e) => { for (const h of loopHooks) h(e); };

    // ---------- Suzu's stones: a circle round each keeps the white ----------
    const vistas = P3_VISTAS.map(([x, y], i) => b.add(new VistaStone(i, x, y)));
    loopHooks.push((e) => {
      const q = g.quests.state('suzu');
      if (!q || q.done) return;
      for (const v of vistas) {
        if (!pointInPoly(v.x, v.y + 0.2, e.poly)) continue;
        v.circled();
        g.quests.event('vista', v.index);
      }
    });

    // ---------- the three bells ----------
    const bellsRung = () => [0, 1, 2].filter((i) => save.perks['bell' + i]).length;
    const rang = (bell: PeakBell) => {
      bell.ring();
      save.perks['bell' + bell.index] = 1;
      writeSave();
      giveXp(g, 180);
      const n = bellsRung();
      void g.story.show([`${L(BELL3_UI.names[bell.index])} ${L(BELL3_UI.rings)}  (${n}/3)`], { size: 34, y: r.uiH / 2 - 190, hold: 3.2 });
      if (n >= 3) g.after(3, () => setMain(g, STEP.bellsBack));
    };
    const bells = P3_BELLS.map(([x, y], i) => {
      const bl = b.add(new PeakBell(i, x, y));
      if (save.perks['bell' + i]) { bl.rung = true; bl.interactive = false; }
      return bl;
    });
    // the forest bell: when the child comes near, the foxes make three more, and shuffle them
    {
      const real = bells[0];
      let shuffled = false;
      const fakes: PeakBell[] = [];
      w.scripts.push(() => {
        if (shuffled || real.rung || save.main < STEP.bells) return;
        const p = w.player;
        if (Math.hypot(p.x - real.x, p.y - real.y) > 7) return;
        shuffled = true;
        const spots: [number, number][] = [[real.x, real.y], [real.x - 4.2, real.y + 1.2], [real.x + 4.2, real.y + 1.4], [real.x + 0.6, real.y - 3.6]];
        const k = Math.floor(Math.random() * spots.length);
        [spots[0], spots[k]] = [spots[k], spots[0]];
        real.moveTo(spots[0][0], spots[0][1]);
        for (let i = 1; i < spots.length; i++) {
          const f = b.add(new PeakBell(0, spots[i][0], spots[i][1], true));
          f.onRing = () => {
            g.hud.showHint(L(BELL3_UI.fake), 3);
            w.vfx.dust(f.x, f.y + 1, 16, PIG_B);
            sfx.spawn();
            for (let j = 0; j < 2; j++) {
              const e = b.add(makeEnemy('snowfox', f.x + (j ? 1.2 : -1.2), f.y).setup(4, false));
              e.emerge = 0.4;
              e.aggro = true;
            }
            f.destroy();
          };
          fakes.push(f);
        }
        for (const [x, y] of spots) w.vfx.dust(x, y + 1, 12, PIG_B);
        sfx.spawn();
      });
      real.onRing = () => {
        if (save.main < STEP.bells) { g.hud.showHint(L(BELL3_UI.silent), 3); return; }
        rang(real);
        for (const f of fakes) { if (!f.dead) { w.vfx.dust(f.x, f.y + 1, 10, PIG_B); f.destroy(); } }
      };
    }
    // the glacier bell: beyond the crevasse (fresh ink carries the child over)
    bells[1].onRing = () => {
      if (save.main < STEP.bells) { g.hud.showHint(L(BELL3_UI.silent), 3); return; }
      rang(bells[1]);
    };
    // the valley bell: erased; a loop around it paints it back
    {
      const vb = bells[2];
      vb.faded = !save.perks.bell2 && !save.perks.bell2painted;
      vb.onRing = () => {
        if (save.main < STEP.bells) { g.hud.showHint(L(BELL3_UI.silent), 3); return; }
        if (vb.faded) { g.hud.showHint(L(BELL3_UI.erased), 4); return; }
        rang(vb);
      };
      loopHooks.push((e) => {
        if (!vb.faded || !(pointInPoly(vb.x, vb.y + 1, e.poly) || pointInPoly(vb.x, vb.y, e.poly))) return;
        vb.faded = false;
        save.perks.bell2painted = 1;
        writeSave();
        w.vfx.splat(vb.x, vb.y + 1.4, 0, 14, 1.2);
        g.hud.showHint(L(BELL3_UI.repainted), 3);
        sfx.uiConfirm();
      });
    }
    // a word at the crevasse's edge
    w.scripts.push(() => {
      const p = w.player;
      for (const c of P3_CREVASSES) {
        const [cx, cy] = c[0];
        if (Math.hypot(p.x - cx, p.y - cy) < 10 && w.nearHazard(p.x, p.y, 1.2)) { g.hintOnce('crevasse', L(BELL3_UI.crevasse), 4); break; }
      }
    });

    // ---------- the two keepers of the master's seal ----------
    const fights: { boss: Boss | null; tag: string; adds: string }[] = [];
    const halfWon = (key: 'sealA' | 'sealB') => {
      save.perks[key] = 1;
      writeSave();
      const n = ['sealA', 'sealB'].filter((k) => save.perks[k]).length;
      g.after(3.4, () => {
        void g.story.show([n >= 2 ? L(SEAL_UI.both) : `${L(SEAL_UI.half)}  (${n}/2)`], { size: 34, y: r.uiH / 2 - 200, hold: 3 });
        if (n >= 2 && save.main === STEP.kings) setMain(g, STEP.sealBack);
      });
    };
    const ring = (a: { x: number; y: number; r: number }, tag: string) => {
      const R = a.r + 0.4;
      for (let k = 0; k < 28; k++) {
        const a0 = (k / 28) * Math.PI * 2, a1 = ((k + 1) / 28) * Math.PI * 2;
        w.addCollider({ kind: 'seg', ax: a.x + Math.cos(a0) * R, ay: a.y + Math.sin(a0) * R * 0.85, bx: a.x + Math.cos(a1) * R, by: a.y + Math.sin(a1) * R * 0.85, r: 0.3 }, tag);
      }
    };
    const reward = (bs: Boss, key: string, xp: number, adds: string) => {
      music.boss = 0.2;
      g.hud.hideBoss();
      save.bosses.push(key);
      writeSave();
      discover(g, key);
      giveXp(g, xp);
      for (let i = 0; i < 4; i++) b.add(new Pickup(bs.x, bs.y, i % 2 ? 'ink' : 'life', i % 2 ? 12 : 2));
      for (let i = 0; i < 6; i++) b.add(new Pickup(bs.x + (i - 2.5) * 0.5, bs.y, 'coin', 12));
      dropLoot(g, bs.x, bs.y, 'boss', 12);
      for (const en of w.entities) if (en.label === adds && !(en as Creature).home) (en as Creature).onHit?.({ dmg: 9999, fromX: bs.x, fromY: bs.y, kind: 'enso' });
    };
    const king: { boss: Boss | null; tag: string; adds: string } = { boss: null, tag: 'kingRing', adds: 'yeti' };
    const dragon: { boss: Boss | null; tag: string; adds: string } = { boss: null, tag: 'dragonRing', adds: 'crane' };
    fights.push(king, dragon);
    const startKing = () => {
      const K = P3_KING;
      const sk = b.add(new SnowKing(K.x, K.y + 2, K));
      king.boss = sk;
      ring(K, king.tag);
      g.hud.showBoss(L(KING_UI.boss));
      sfx.wave();
      g.after(3.5, () => { if (!sk.defeated) g.hud.showHint(L(KING_UI.hint), 4); });
      let toldBlock = false;
      sk.onBreath = (blocked) => {
        if (blocked && !toldBlock) { toldBlock = true; g.hud.showHint(L(KING_UI.blocked), 2.5); }
        if (!blocked) g.hintOnce('kingBreath', L(KING_UI.breath), 5);
      };
      sk.onPhase = () => g.after(1, () => { if (!sk.defeated) g.hud.showHint(L(KING_UI.call), 3); });
      sk.onDefeat = () => {
        w.removeColliders(king.tag);
        reward(sk, 'snowking', 1100, 'yeti');
        g.after(1.6, () => {
          void g.story.show([L(KING_UI.down)], { size: 36, y: r.uiH / 2 - 200, hold: 3 });
          halfWon('sealA');
          king.boss = null;
        });
      };
    };
    const startDragon = () => {
      const D = P3_DRAGON;
      const pd = b.add(new PaperDragon(D.x, D.y + 1, D));
      dragon.boss = pd;
      ring(D, dragon.tag);
      g.hud.showBoss(L(DRAGON_UI.boss));
      g.after(4, () => { if (!pd.defeated) g.hud.showHint(L(DRAGON_UI.hint), 4); });
      pd.onDowned = () => g.hintOnce('dragonGold', L(DRAGON_UI.gold), 3);
      pd.onPhase = () => g.after(0.4, () => { if (!pd.defeated) g.hud.showHint(L(DRAGON_UI.fold), 3); });
      pd.onDefeat = () => {
        w.removeColliders(dragon.tag);
        reward(pd, 'dragon', 1100, 'crane');
        g.after(1.6, () => {
          void g.story.show([L(DRAGON_UI.down)], { size: 36, y: r.uiH / 2 - 200, hold: 3 });
          halfWon('sealB');
          dragon.boss = null;
        });
      };
    };
    w.scripts.push(() => {
      const p = w.player;
      w.camLook = null;
      for (const f of fights) {
        if (!f.boss) continue;
        g.hud.bossFrac = f.boss.frac;
        if (!f.boss.defeated) { music.boss = 1; w.camLook = [f.boss.x, f.boss.y + f.boss.z + 1.5]; }
        return;
      }
      if (p.state === 'dead') return;
      if (!save.bosses.includes('snowking') && Math.hypot(p.x - P3_KING.x, p.y - P3_KING.y) < P3_KING.r - 2.5) {
        if (save.main >= STEP.kings) startKing();
        else g.hintOnce('kingWait', L(KING_UI.wait), 4);
      }
      if (!save.bosses.includes('dragon') && Math.hypot(p.x - P3_DRAGON.x, p.y - P3_DRAGON.y) < P3_DRAGON.r - 2.5) {
        if (save.main >= STEP.kings) startDragon();
        else g.hintOnce('dragonWait', L(DRAGON_UI.wait), 4);
      }
    });

    // ---------- the summit: the cloud wall, the sealed gate, the master's hand ----------
    for (const arc of p3RingArc()) for (let i = 0; i < arc.length - 1; i++) w.addCollider({ kind: 'seg', ax: arc[i][0], ay: arc[i][1], bx: arc[i + 1][0], by: arc[i + 1][1], r: 0.45 }, 'cloudWall');
    const gate = b.add(new SealGate(P3_GATE.x, P3_GATE.y, !!save.perks.summitOpen));
    const gateBar = () => w.addCollider({ kind: 'seg', ax: P3_GATE.x - 1.7, ay: P3_GATE.y, bx: P3_GATE.x + 1.7, by: P3_GATE.y, r: 0.4 }, 'sealGate');
    if (!save.perks.summitOpen) gateBar();
    let gateHintT = 0;
    w.scripts.push((dt) => {
      gateHintT -= dt;
      const p = w.player;
      if (save.perks.summitOpen || Math.hypot(p.x - P3_GATE.x, p.y - P3_GATE.y) > 3.4) return;
      if (save.perks.seal) {
        save.perks.summitOpen = 1;
        writeSave();
        w.removeColliders('sealGate');
        gate.open();
        sfx.uiConfirm();
        void g.story.show([L(SUMMIT_UI.opens)], { size: 34, y: r.uiH / 2 - 200, hold: 3 });
        if (erasedOn()) {
          erasedBar();
          g.after(3.6, () => void g.story.show([L(HEART_UI.erased)], { size: 32, y: r.uiH / 2 - 200, hold: 5 }));
        }
      } else if (gateHintT <= 0) { g.hud.showHint(L(SUMMIT_UI.sealed), 4); gateHintT = 10; }
    });
    // behind the open gate the path is wiped away, until the child comes up through the mountain
    const erasedOn = () => !!save.perks.summitOpen && !save.perks.hollowDone && !save.bosses.includes('hand');
    const erasedBar = () => w.addCollider({ kind: 'seg', ax: P3_GATE.x - 2, ay: P3_GATE.y + 0.7, bx: P3_GATE.x + 2, by: P3_GATE.y + 0.7, r: 0.45 }, 'erasedPath');
    if (erasedOn()) erasedBar();
    b.add(new ErasedPath(P3_GATE.x, P3_GATE.y + 2, erasedOn));
    b.add(new HeartStair(P3_HEART_STAIR[0], P3_HEART_STAIR[1]));
    let erasedHintT = 0;
    w.scripts.push((dt) => {
      erasedHintT -= dt;
      const p = w.player;
      if (erasedOn() && erasedHintT <= 0 && Math.hypot(p.x - P3_GATE.x, p.y - P3_GATE.y) < 2.6) { g.hud.showHint(L(HEART_UI.erased), 5); erasedHintT = 14; }
      // up the master's stair: the summit, and the path coming back behind
      if (save.perks.hollowDone && !save.perks.heartSummit && Math.hypot(p.x - P3_SUMMIT.x, p.y - P3_SUMMIT.y) < P3_RING) {
        save.perks.heartSummit = 1;
        writeSave();
        w.removeColliders('erasedPath');
        void g.story.show([L(HEART_UI.summit)], { size: 32, y: r.uiH / 2 - 200, hold: 3.5 });
      }
    });
    if (save.perks.ending !== 2) b.add(new PlantedBrush(P3_SUMMIT.x + 2.2, P3_SUMMIT.y - 2.8));
    let hand: MasterHand | null = null;
    let handWaking = false;
    const finale = (kind: 1 | 2) => {
      save.perks.ending = kind;
      if (save.main < STEP.epilogue) save.main = STEP.epilogue;
      writeSave();
      g.washTarget = 0;
      w.removeColliders('handGate');
      g.after(1.2, () => void g.story.show([L(SUMMIT_UI.after)], { size: 32, y: r.uiH / 2 - 200, hold: 5 }));
      music.play('summit');
    };
    const meetMaster = (mx: number, my: number) => {
      const m = b.add(new Npc('master', L(MASTER_NAME), { seed: 7, scale: 1.25, robe: INK, robeDensity: 0.4, hair: 'white', hat: 'none', bent: 0.35, beard: true }, mx, my));
      m.ghostly = true;
      const who = { name: L(MASTER_NAME), ...m.portrait() };
      const choose = (kind: 1 | 2) => g.after(0.3, () => g.talk(who, LL(kind === 1 ? MASTER.sign : MASTER.brush), () => g.after(0.8, () => {
        const e = kind === 1 ? ENDINGS.sign : ENDINGS.brush;
        g.cine.child = g.player.frames;
        g.cine.play(endingShots(kind === 1 ? 'sign' : 'brush', { title: L(e.title), lines: LL(e.lines), end: L(kind === 1 ? ENDINGS.end : ENDINGS.almost), thanks: L(ENDINGS.thanks) }), () => {
          m.destroy();
          finale(kind);
        });
      })));
      g.after(1, () => g.talk(who, LL(MASTER.words), undefined, [
        { label: L(CHOICE_END.sign), act: () => choose(1) },
        { label: L(CHOICE_END.brush), act: () => choose(2) },
      ]));
    };
    const startHand = () => {
      const H = P3_HAND;
      const hd = b.add(new MasterHand(H.x, H.y + 3, H));
      hand = hd;
      w.addCollider({ kind: 'seg', ax: P3_GATE.x - 1.7, ay: P3_GATE.y, bx: P3_GATE.x + 1.7, by: P3_GATE.y, r: 0.4 }, 'handGate');
      g.hud.showBoss(L(HAND_UI.boss));
      sfx.wave();
      hd.onEvent = (what) => {
        if (what === 'strip') g.hintOnce('handStrip', L(HAND_UI.strip), 5);
        else if (what === 'grasp') g.hud.showHint(L(HAND_UI.grasp), 2.5);
        else if (what === 'paint') g.hintOnce('handPaint', L(HAND_UI.paint), 3);
        else g.hud.showHint(L(HAND_UI.doubt), 4);
      };
      hd.onDefeat = () => {
        music.boss = 0;
        g.hud.hideBoss();
        save.bosses.push('hand');
        writeSave();
        discover(g, 'hand');
        giveXp(g, 2000);
        dropLoot(g, hd.x, hd.y, 'boss', 14);
        for (let i = 0; i < 4; i++) b.add(new Pickup(hd.x, hd.y, i % 2 ? 'ink' : 'life', i % 2 ? 14 : 3));
        for (const en of w.entities) if (en.label === 'eraser' && !(en as Creature).home) (en as Creature).onHit?.({ dmg: 9999, fromX: hd.x, fromY: hd.y, kind: 'enso' });
        g.after(1.2, () => void g.story.show([L(HAND_UI.stops)], { size: 36, y: r.uiH / 2 - 200, hold: 3 }));
        g.after(5, () => {
          hd.clearStrips();
          g.cine.child = g.player.frames;
          g.cine.play(revealShots(LL(REVEAL)), () => {
            hd.destroy();
            hand = null;
            meetMaster(P3_SUMMIT.x, P3_SUMMIT.y - 2);
          });
        });
      };
    };
    w.scripts.push(() => {
      const p = w.player;
      if (hand) { g.hud.bossFrac = hand.frac; if (!hand.defeated) { music.boss = 1; w.camLook = [hand.x, hand.y + 3]; } return; }
      if (handWaking || save.main !== STEP.summit || save.bosses.includes('hand') || p.state === 'dead') return;
      if (Math.hypot(p.x - P3_HAND.x, p.y - P3_HAND.y) < 6) {
        handWaking = true;
        void g.story.show([L(SUMMIT_UI.hut)], { size: 34, y: r.uiH / 2 - 200, hold: 2.4 });
        g.after(2.8, () => {
          void g.story.show([L(SUMMIT_UI.rises)], { size: 34, y: r.uiH / 2 - 200, hold: 2.6 });
          startHand();
          handWaking = false;
        });
      }
    });

    g.onRespawn = () => {
      if (hand && !hand.defeated) {
        hand.destroy();
        hand = null;
        w.removeColliders('handGate');
        g.hud.hideBoss();
        for (const en of w.entities) if (en.label === 'eraser' && !(en as Creature).home) en.destroy();
      }
      for (const f of fights) {
        if (!f.boss || f.boss.defeated) continue;
        f.boss.destroy();
        f.boss = null;
        w.removeColliders(f.tag);
        g.hud.hideBoss();
        for (const en of w.entities) if (en.label === f.adds && !(en as Creature).home) en.destroy();
      }
      chunks.buildAround(w.player.x, w.player.y, r.viewW / 2 + 2, r.viewH / 2 + 2);
    };

    // ---------- regions: names, music, colours, stories ----------
    let region = '';
    w.scripts.push(() => {
      const p = w.player;
      const reg = p3RegionAt(p.x, p.y);
      if (reg === region) return;
      const first = region !== '';
      region = reg;
      const R = P3_REGIONS[reg];
      if (first) void g.story.show([R.name[lang]], { size: 46, y: r.uiH / 2 - 120, hold: 1.4, italic: false });
      music.play(R.music);
      g.fadePalette(R.palette);
      // the erased valley: the colours themselves fade
      g.washTarget = reg === 'erased' && !save.perks.ending ? 0.55 : 0;
      if (reg === 'monastery' && save.main === STEP.monastery) setMain(g, STEP.snow);
      const key = 'p3' + reg;
      if (!save.regions.includes(key) && REGION_LORE3[reg]) {
        g.after(first ? 2.4 : 4, () => {
          if (p3RegionAt(w.player.x, w.player.y) !== reg || save.regions.includes(key)) return;
          save.regions.push(key);
          writeSave();
          void g.story.show([L(REGION_LORE3[reg])], { size: 30, y: r.uiH / 2 - 170, hold: 4.5 });
        });
      }
    });

    // ---------- where to go ----------
    w.scripts.push(() => {
      const m = save.main, p = w.player;
      let target: [number, number] | null = null;
      if (m <= STEP.monastery) target = [M.x, M.y - 9];
      else if (m === STEP.snow || m === STEP.bellsBack || m === STEP.sealBack) target = [snow.x, snow.y];
      else if (m === STEP.kings) {
        let bd = Infinity;
        for (const [key, a] of [['snowking', P3_KING], ['dragon', P3_DRAGON]] as const) {
          if (save.bosses.includes(key)) continue;
          const d = Math.hypot(a.x - p.x, a.y - p.y);
          if (d < bd) { bd = d; target = [a.x, a.y]; }
        }
      } else if (m === STEP.summit) target = !save.perks.summitOpen ? [P3_GATE.x, P3_GATE.y] : erasedOn() ? [P3_HEART_STAIR[0], P3_HEART_STAIR[1]] : [P3_HAND.x, P3_HAND.y];
      else if (m === STEP.bells) {
        let bd = Infinity;
        for (const bl of bells) {
          if (bl.rung) continue;
          const d = Math.hypot(bl.x - p.x, bl.y - p.y);
          if (d < bd) { bd = d; target = [bl.x, bl.y]; }
        }
      }
      g.objective = target;
      const vh = r.viewH / r.zoom, vw = vh * (r.pxW / r.pxH);
      g.hud.arrowTarget = target ? [((target[0] - w.camX) / vw) * r.uiW, ((target[1] - w.camY) / vh) * r.uiH] : null;
      w.areaName = 'peaks/' + region;
    });

    // ---------- arriving: the story moves on, and the act opens ----------
    if (save.main === STEP.act3) setMain(g, STEP.monastery);
    if (!save.perks.seenAct3) {
      save.perks.seenAct3 = 1;
      writeSave();
      g.after(0.2, () => g.cine.play(act3Shots({ act: L(ACT3_TITLE.act), name: L(ACT3_TITLE.name), line: L(ACT3_TITLE.line) })));
    }
  },
};

let gateArt: ReturnType<typeof buildSealGate> | null = null;
/** The red gate in the cloud wall: sealed by a paper talisman until the master's seal comes. */
class SealGate extends Entity {
  private pig!: Sprite;
  private red!: Sprite;
  private burnT = -1;
  constructor(x: number, y: number, private isOpen: boolean) {
    super();
    this.x = x; this.y = y;
    this.label = 'gate';
  }
  init(): void {
    if (!gateArt) gateArt = buildSealGate(5801);
    const k = this.isOpen ? 1 : 0;
    this.pig = this.addSprite(new Sprite(gateArt.pig[k]));
    this.red = this.addSprite(new Sprite(gateArt.red[k]), true);
    for (const s of [this.pig, this.red]) { s.setPos(this.x, this.y); s.mesh.renderOrder = ySort(this.y); }
  }
  open(): void {
    this.isOpen = true;
    this.burnT = 0;
    this.world.vfx.splat(this.x, this.y + 1.5, 0, 14, 1.2, 'red');
  }
  update(dt: number): void {
    if (this.burnT < 0) return;
    // the talisman burns away without a flame
    this.burnT += dt;
    this.pig.dissolve = Math.min(1, this.burnT / 1.2);
    this.red.dissolve = Math.min(1, this.burnT / 1.2);
    if (Math.random() < dt * 20) this.world.vfx.flame(this.x + (Math.random() - 0.5) * 2.4, this.y + 0.6 + Math.random() * 1.8, 0.4);
    if (this.burnT > 1.2) {
      this.pig.setTexture(gateArt!.pig[1].tex);
      this.red.setTexture(gateArt!.red[1].tex);
      this.pig.dissolve = this.red.dissolve = 0;
      this.burnT = -1;
    }
  }
}

let brushArt: Frame | null = null;
/** The master's brush, planted in the snow by his hut. */
class PlantedBrush extends Entity {
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.label = 'brush';
  }
  init(): void {
    if (!brushArt) brushArt = buildPlantedBrush(5901);
    const s = this.addSprite(new Sprite(brushArt));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = ySort(this.y);
  }
}

let stoneArt: { pig: Frame; red: Frame } | null = null;
/** One of Suzu's flat stones, where she sat to look at the white. A circle drawn round it keeps the white. */
class VistaStone extends Entity {
  private ring!: Sprite;
  private glow = 0;
  constructor(readonly index: number, x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.label = 'vista';
  }
  init(w: World): void {
    if (!stoneArt) {
      const p = new Painter(2.4, 1.4, SPRITE_PPU, -1.2, -0.5);
      const q = new Painter(2.4, 1.4, SPRITE_PPU, -1.2, -0.5);
      p.glaze(); q.glaze();
      const o: [number, number][] = [[-0.85, 0.05], [-0.4, -0.18], [0.5, -0.15], [0.9, 0.08], [0.55, 0.32], [-0.5, 0.3]];
      washPoly(p, o, { pig: mixPig(INK, PIG_B, 0.3), density: 0.32, soft: 0.1, edge: 0.8, seed: 3701 });
      stroke(p, [...o, o[0]], { width: 0.04, load: 0.85, seed: 3702, taperStart: 0.02, taperEnd: 0.02 });
      // a little red brush mark where she sat
      stroke(q, [[-0.15, 0.14], [0.05, 0.1], [0.18, 0.16]], { width: 0.06, pig: VERMILION, load: 0.9, seed: 3703 });
      stoneArt = { pig: frameFrom(p), red: frameFrom(q) };
    }
    const s = this.addSprite(new Sprite(stoneArt.pig));
    const r = this.addSprite(new Sprite(stoneArt.red), true);
    for (const sp of [s, r]) { sp.setPos(this.x, this.y); sp.mesh.renderOrder = ySort(this.y + 0.4); }
    // the circle, once drawn, stays faintly on the snow
    const c = new Painter(3.4, 2.4, SPRITE_PPU / 2, -1.7, -1.2);
    c.glaze();
    const pts: [number, number][] = [];
    for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 1.9 + 0.4; pts.push([Math.cos(a) * 1.4, Math.sin(a) * 0.9]); }
    stroke(c, pts, { width: 0.07, load: 0.8, dry: 0.4, seed: 3704 + this.index, taperStart: 0.1, taperEnd: 0.4 });
    this.ring = this.addSprite(new Sprite(c));
    this.ring.setPos(this.x, this.y + 0.1);
    this.ring.mesh.renderOrder = LAYER.shadow;
    const q = save.quests.suzu;
    this.ring.opacity = q && (q.done || q.seen?.includes(this.index)) ? 0.6 : 0;
    void w;
  }
  circled(): void {
    if (this.ring.opacity > 0) return;
    this.glow = 1.2;
    this.world.vfx.ripple(this.x, this.y, 1.6);
    sfx.uiConfirm();
  }
  update(dt: number): void {
    if (this.glow > 0) {
      this.glow -= dt;
      this.ring.opacity = Math.min(0.6, (1.2 - this.glow) * 0.8);
      this.ring.reveal = Math.min(1.5, (1.2 - this.glow) * 1.5);
    }
  }
}

let erasedArt: Frame | null = null;
/** Inside the open gate, the hand has wiped the path away: torn white, nothing to stand on. */
class ErasedPath extends Entity {
  constructor(x: number, y: number, private on: () => boolean) {
    super();
    this.x = x; this.y = y;
    this.label = 'erasedpath';
  }
  init(): void {
    if (!erasedArt) {
      const p = new Painter(6, 4, SPRITE_PPU / 2, -3, -2);
      p.glaze();
      const o = roughen(noisyOutline(0, 0, 2.3, 1.4, 0.25, 6501), 0.12, 6502, 0.15);
      washPoly(p, o, { pig: ERASE, density: 1, soft: 0.3, seed: 6503 });
      stroke(p, o.slice(0, Math.floor(o.length * 0.45)), { width: 0.05, load: 0.5, dry: 0.7, seed: 6504, taperStart: 0.1, taperEnd: 0.4 });
      erasedArt = frameFrom(p);
    }
    const s = this.addSprite(new Sprite(erasedArt), true);
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = LAYER.groundDetail + 20;
  }
  update(): void {
    const target = this.on() ? 1 : 0;
    const s = this.sprites[0];
    s.opacity += (target - s.opacity) * 0.05;
  }
}

let heartStairArt: Frame | null = null;
/** The stair cut into the ice beside the gate: it shows once the gate is open. */
class HeartStair extends Entity {
  private hinted = false;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.label = 'heartstair';
  }
  init(): void {
    if (!heartStairArt) {
      const p = new Painter(3.2, 2.4, SPRITE_PPU / 2, -1.6, -1.2);
      p.glaze();
      washPoly(p, noisyOutline(0, 0, 1.3, 0.95, 0.14, 6511), { pig: mixPig(INK, PIG_A, 0.3), density: 0.4, soft: 0.05, edge: 0.9, seed: 6511 });
      for (let k = 0; k < 4; k++) {
        const yy = 0.42 - k * 0.3, hw = 0.95 - k * 0.12;
        washPoly(p, [[-hw, yy - 0.26], [hw, yy - 0.26], [hw, yy], [-hw, yy]], { pig: INK, density: 0.22 + k * 0.18, soft: 0.05, edge: 0.5, seed: 6512 + k });
      }
      stroke(p, noisyOutline(0, 0, 1.35, 1.0, 0.14, 6511).slice(0, 14), { width: 0.06, pig: mixPig(INK, PIG_A, 0.6), load: 0.8, seed: 6520, taperStart: 0.1, taperEnd: 0.3 });
      heartStairArt = frameFrom(p);
    }
    const s = this.addSprite(new Sprite(heartStairArt));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = LAYER.groundDetail + 20;
  }
  update(): void {
    const open = !!save.perks.summitOpen;
    this.sprites[0].opacity = open ? 1 : 0;
    const p = this.world.player;
    if (open && !this.hinted && Math.hypot(p.x - this.x, p.y - this.y) < 3) {
      this.hinted = true;
      this.world.vfx.glowAt(this.x, this.y, 1.6, 0.4);
    }
  }
}
