/**
 * Things that happen on the road: a golden blot that runs off with its coins, an ink rain that brings
 * waves of creatures, a named champion prowling with its escort. One at a time, now and then.
 */
import type { Game } from './game';
import type { World } from './world';
import { Creature } from './enemies';
import { Pickup } from './pickups';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { Painter } from '../gfx/paint';
import { brushText } from '../gfx/text';
import { buildBlotFrames } from '../gfx/gen/creatures';
import { dropLoot } from './loot';
import { giveXp } from './rewards';
import { save } from './progression';
import { sfx } from '../audio/sfx';
import { lang } from '../i18n';
import { BESTIARY } from '../i18n/lore';
import type { EnemyKind } from '../world/layout';
import type { Mark } from '../ui/mapArt';

const tr = (fr: string, en: string) => (lang === 'fr' ? fr : en);

let goldFrames: Frame[] | null = null;
let shineFrame: Frame | null = null;

/** A blot full of swallowed coins: it runs, and dives back into the ink if not caught in time. */
export class GoldenBlot extends Creature {
  private t = 0;
  private dir: [number, number] = [1, 0];
  private turnT = 0;
  private shine!: Sprite;
  escaped = false;
  onEscape?: () => void;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.hp = 55;
    this.xp = 30;
    this.knockback = 0.7;
    this.aggroRange = 0;
    this.label = 'golden';
  }
  init(w: World): void {
    if (!goldFrames) goldFrames = buildBlotFrames(1777);
    if (!shineFrame) {
      const p = new Painter(1.6, 1.6, 48, -0.8, -0.3);
      p.over();
      const g = p.ctx.createRadialGradient(0, 0.45, 0.05, 0, 0.45, 0.7);
      g.addColorStop(0, 'rgba(240,196,80,0.85)');
      g.addColorStop(1, 'rgba(240,196,80,0)');
      p.ctx.fillStyle = g;
      p.ctx.fillRect(-0.8, -0.3, 1.6, 1.6);
      shineFrame = frameFrom(p);
    }
    this.body = this.addSprite(new Sprite(goldFrames[0]));
    this.shine = new Sprite(shineFrame);
    this.shine.mesh.renderOrder = LAYER.actorsBase + 3000;
    w.r.sceneAcc.add(this.shine.mesh);
    this.sprites.push(this.shine);
    this.initCommon(w, 0.5);
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) { this.shine.opacity = this.dying > 0 ? 0 : 0.8; this.shine.setPos(this.x, this.y); return; }
    const w = this.world, p = w.player;
    this.t += dt;
    this.turnT -= dt;
    const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (this.turnT <= 0) {
      // away from the child, with a twist
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * (d < 6 ? 1.2 : 2.6);
      this.dir = [Math.cos(a), Math.sin(a)];
      this.turnT = 0.45 + Math.random() * 0.5;
    }
    const sp = d < 9 ? 4.4 : 2;
    const ox = this.x, oy = this.y;
    this.walk(this.dir[0] * sp * dt, this.dir[1] * sp * dt);
    if (Math.hypot(this.x - ox, this.y - oy) < sp * dt * 0.3) this.turnT = 0;
    const f = goldFrames!;
    this.place(f[Math.abs(Math.floor(this.t * 9)) % 3], Math.abs(Math.sin(this.t * 9)) * 0.1);
    this.shine.setPos(this.x, this.y);
    this.shine.opacity = 0.65 + Math.sin(this.t * 10) * 0.25;
    if (Math.random() < dt * 4) w.vfx.glowAt(this.x, this.y + 0.4, 1.2, 0.2);
    // out of time: back into the ink
    if (this.t > 22 && !this.escaped) {
      this.escaped = true;
      this.dying = 0.001;
      w.vfx.stain(this.x, this.y, 1, 8);
      sfx.splash();
      this.onEscape?.();
    }
  }
}

type Affix = 'swift' | 'enraged' | 'shielded' | 'giant' | 'explosive';
const AFFIX_NAME: Record<Affix, { fr: string; en: string }> = {
  swift: { fr: 'le Véloce', en: 'the Swift' },
  enraged: { fr: 'l’Enragé', en: 'the Raging' },
  shielded: { fr: 'le Cuirassé', en: 'the Armoured' },
  giant: { fr: 'le Colosse', en: 'the Colossus' },
  explosive: { fr: 'l’Explosif', en: 'the Bursting' },
};

export interface EventHooks {
  /** Make a creature of a kind (from the open world). */
  make: (kind: EnemyKind, x: number, y: number) => Creature;
  /** Creatures that belong where the child stands, and how tough. */
  local: (x: number, y: number) => { kinds: EnemyKind[]; champions: EnemyKind[]; tier: number } | null;
  /** May something happen right now (no boss, no fight, not in the hamlet…)? */
  calm: () => boolean;
}

/** The road's director: picks an event now and then and runs it. */
export class Events {
  private wait = 80;
  private running: { kind: string; t: number; update: (dt: number) => boolean; marks?: () => Mark[] } | null = null;

  constructor(private g: Game, private hooks: EventHooks) {}

  marks(): Mark[] {
    return this.running?.marks?.() ?? [];
  }

  update(dt: number): void {
    if (this.running) {
      this.running.t += dt;
      if (!this.running.update(dt)) { this.running = null; this.wait = 70 + Math.random() * 80; }
      return;
    }
    if (save.level < 3) return;
    this.wait -= dt;
    if (this.wait > 0 || !this.hooks.calm()) return;
    const roll = Math.random();
    if (roll < 0.34) this.golden();
    else if (roll < 0.67) this.rain();
    else this.champion();
    if (!this.running) this.wait = 20;
  }

  /** A free spot at some distance from the child. */
  private spot(dMin: number, dMax: number): [number, number] | null {
    const w = this.g.world, p = w.player;
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * Math.PI * 2, d = dMin + Math.random() * (dMax - dMin);
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      const b = w.bounds;
      if (x < b.x + 3 || y < b.y + 3 || x > b.x + b.w - 3 || y > b.y + b.h - 8) continue;
      if (w.collidersNear(x, y, 1.2).length) continue;
      if (w.lineBlocked(p.x, p.y, x, y)) continue;
      return [x, y];
    }
    return null;
  }

  private reward(x: number, y: number, coins: number, lootKind: 'normal' | 'elite' | 'boss', xp: number): void {
    const g = this.g;
    for (let i = 0; i < Math.ceil(coins / 8); i++) g.world.add(new Pickup(x, y, 'coin', Math.min(8, coins - i * 8)));
    dropLoot(g, x, y, lootKind, Math.max(1, save.level));
    giveXp(g, xp);
  }

  private golden(): void {
    const g = this.g, w = g.world;
    const at = this.spot(7, 11);
    const loc = this.hooks.local(w.player.x, w.player.y);
    if (!at || !loc) return;
    const gb = w.add(new GoldenBlot(at[0], at[1]).setup(loc.tier, false));
    gb.emerge = 0.6;
    g.hud.showHint(tr('Un Pâté doré ! Attrape-le avant qu’il ne replonge dans l’encre !', 'A Golden Blot! Catch it before it dives back into the ink!'), 4);
    sfx.charge(5);
    let done = false;
    gb.onDie = () => {
      if (gb.escaped) return;
      done = true;
      sfx.uiConfirm();
      g.hud.showHint(tr('Le Pâté doré éclate en pièces de cuivre !', 'The Golden Blot bursts into copper coins!'), 3);
      this.reward(gb.x, gb.y, 50 + save.level * 6, 'elite', 40 + save.level * 4);
    };
    gb.onEscape = () => { done = true; g.hud.showHint(tr('Il a filé…', 'It got away…'), 2.5); };
    this.running = { kind: 'golden', t: 0, update: () => !done && !gb.dead, marks: () => (gb.dead ? [] : [{ x: gb.x, y: gb.y, kind: 'boss' }]) };
  }

  private rain(): void {
    const g = this.g, w = g.world;
    const loc = this.hooks.local(w.player.x, w.player.y);
    if (!loc) return;
    g.hud.showHint(tr('Le ciel se couvre… Une pluie d’encre ! Tiens bon.', 'The sky darkens… An ink rain! Hold on.'), 4);
    sfx.thunder();
    const spawned: Creature[] = [];
    const waves = [1.5, 10, 19];
    let wave = 0;
    let finished = false;
    this.running = {
      kind: 'rain', t: 0,
      update: (dt) => {
        const t = this.running!.t;
        g.weatherNight = Math.min(0.32, t * 0.15);
        if (Math.random() < dt * 14) {
          const p = w.player;
          w.vfx.splat(p.x + (Math.random() - 0.5) * 18, p.y + (Math.random() - 0.5) * 11, -Math.PI / 2, 3, 0.5);
        }
        if (wave < waves.length && t > waves[wave]) {
          const n = 3 + wave + Math.floor(Math.random() * 2);
          for (let i = 0; i < n; i++) {
            const at = this.spot(3.5, 8);
            if (!at) continue;
            const kind = loc.kinds[Math.floor(Math.random() * loc.kinds.length)];
            const e = w.add(this.hooks.make(kind, at[0], at[1]).setup(loc.tier, wave === 2 && i === 0));
            e.emerge = 0.6;
            e.aggro = true;
            spawned.push(e);
          }
          sfx.spawn();
          wave++;
        }
        if (wave >= waves.length && !finished && spawned.every((e) => e.dead)) {
          finished = true;
          const p = w.player;
          g.hud.showHint(tr('La pluie s’arrête. L’encre a laissé un trésor.', 'The rain stops. The ink left a treasure behind.'), 3.5);
          sfx.uiConfirm();
          this.reward(p.x, p.y + 1, 40 + save.level * 5, 'elite', 60 + save.level * 6);
        }
        if (t > 60 && !finished) finished = true;
        if (finished) {
          g.weatherNight = Math.max(0, g.weatherNight - dt * 0.2);
          return g.weatherNight > 0;
        }
        return true;
      },
    };
  }

  private champion(): void {
    const g = this.g, w = g.world;
    const loc = this.hooks.local(w.player.x, w.player.y);
    const at = this.spot(10, 15);
    if (!loc || !at || !loc.champions.length) return;
    const kind = loc.champions[Math.floor(Math.random() * loc.champions.length)];
    const all: Affix[] = ['swift', 'enraged', 'shielded', 'giant', 'explosive'];
    const affixes: Affix[] = [];
    while (affixes.length < 2) { const a = all[Math.floor(Math.random() * all.length)]; if (!affixes.includes(a)) affixes.push(a); }
    const champ = this.hooks.make(kind, at[0], at[1]).setup(loc.tier + 1, true);
    if (affixes.includes('giant')) { champ.hp = Math.round(champ.hp * 1.6); champ.maxHp = champ.hp; champ.scaleK *= 1.25; champ.radius *= 1.2; }
    if (affixes.includes('shielded')) champ.armorK = 0.55;
    if (affixes.includes('enraged')) champ.bonusPower = 1;
    if (affixes.includes('swift')) { const up = champ.update.bind(champ); champ.update = (dt: number) => up(dt * 1.4); }
    champ.xp *= 2;
    w.add(champ);
    const escort: Creature[] = [];
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const k = loc.kinds[Math.floor(Math.random() * loc.kinds.length)];
      const a = (i / 3) * Math.PI * 2;
      escort.push(w.add(this.hooks.make(k, at[0] + Math.cos(a) * 1.8, at[1] + Math.sin(a) * 1.4).setup(loc.tier, false)));
    }
    const base = BESTIARY[kind]?.name[lang] ?? kind;
    const title = `${base} ${affixes.map((a) => AFFIX_NAME[a][lang]).join(lang === 'fr' ? ' et ' : ' and ')}`;
    const art = brushText(title, { size: 0.42, ppu: 90, weight: 700, italic: true, color: [0.72, 0.5, 0.18] });
    const label = new Sprite(art);
    label.mesh.renderOrder = LAYER.weather + 18;
    w.r.sceneAcc.add(label.mesh);
    g.hud.showHint(tr(`Un champion rôde : ${title}`, `A champion prowls: ${title}`), 4.5);
    sfx.wave();
    let over = false;
    champ.onDie = () => {
      over = true;
      label.dispose();
      if (affixes.includes('explosive')) {
        const x = champ.x, y = champ.y;
        w.tele.add({ kind: 'circle', r: 2.6 }, x, y, 0, 1.1, {
          onFire: () => {
            const p = w.player;
            if (Math.hypot(p.x - x, p.y - y) < 2.6) p.hurt(champ.power, x, y);
            for (let i = 0; i < 10; i++) w.vfx.splat(x, y + 0.4, (i / 10) * Math.PI * 2, 9, 1.2);
            w.shake(0.25, 0.3);
            sfx.impact(true);
          },
        });
      }
      g.hud.showHint(tr(`${title} est vaincu.`, `${title} is defeated.`), 3);
      this.reward(champ.x, champ.y, 60 + save.level * 6, 'boss', 80 + save.level * 8);
    };
    this.running = {
      kind: 'champion', t: 0,
      update: () => {
        if (over) return false;
        label.setPos(champ.x, champ.y + 2.1 * champ.scaleK);
        // it gives up and leaves if the child goes far away
        if (Math.hypot(w.player.x - champ.x, w.player.y - champ.y) > 45 || this.running!.t > 240) {
          label.dispose();
          for (const e of [champ, ...escort]) if (!e.dead) e.destroy();
          return false;
        }
        return true;
      },
      marks: () => (over ? [] : [{ x: champ.x, y: champ.y, kind: 'boss' }]),
    };
  }
}
