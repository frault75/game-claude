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
import { PEAKS, P3, P3_ENTRY, P3_NORTH, P3_PONDS, P3_CAMPS, P3_SHRINES, P3_REGIONS, P3_MONASTERY, P3_BELLS, P3_CREVASSES, P3_TEARS, P3_KING, P3_DRAGON, P3_SUMMIT, p3RegionAt } from '../../world/peaks';
import { p3MapSource } from '../../world/p3Map';
import type { EnemyKind } from '../../world/layout';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../../gfx/sprite';
import { Painter, INK, PIG_A, PIG_B, VERMILION, mixPig } from '../../gfx/paint';
import { washPoly } from '../../gfx/wash';
import { stroke } from '../../gfx/brush';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { lang, t } from '../../i18n';
import { L, LL } from '../../i18n/lore';
import { NAMES3, SNOW, IDLE3, REGION_LORE3, ACT3_TITLE, BELL3_UI, KING_UI, DRAGON_UI, SEAL_UI } from '../../i18n/lore3';
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
import { makeEnemy, sharedArt, sharedStamps, GROUND_DETAIL_PPU, Shrine } from './overworld';
import { runCamps } from '../camps';
import { Events } from '../events';
import { act3Shots } from '../../ui/cinematic';
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
      } else speak(snow, LL(SNOW.after));
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
      g.onEnso = (e) => {
        if (!vb.faded || !(pointInPoly(vb.x, vb.y + 1, e.poly) || pointInPoly(vb.x, vb.y, e.poly))) return;
        vb.faded = false;
        save.perks.bell2painted = 1;
        writeSave();
        w.vfx.splat(vb.x, vb.y + 1.4, 0, 14, 1.2);
        g.hud.showHint(L(BELL3_UI.repainted), 3);
        sfx.uiConfirm();
      };
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
      if (save.main === STEP.summit && Math.hypot(p.x - P3_SUMMIT.x, p.y - P3_SUMMIT.y) < 12) g.hintOnce('summitSoon', L(SEAL_UI.summit), 5);
    });

    g.onRespawn = () => {
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
      g.washTarget = reg === 'erased' ? 0.55 : 0;
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
      } else if (m === STEP.summit) target = [P3_SUMMIT.x, P3_SUMMIT.y - 6];
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
