/** Experience, levels, loot and new inks: shared by the open world and the dungeons. */
import type { Game } from './game';
import type { Entity } from './entity';
import type { Creature } from './enemies';
import { Pickup } from './pickups';
import { save, writeSave, gainXp, gear } from './progression';
import { dropLoot } from './loot';
import { INKS, InkId } from './inks';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { t, lang } from '../i18n';

export function giveXp(g: Game, n: number): void {
  const w = g.world;
  const ups = gainXp(n);
  writeSave();
  if (ups > 0) {
    const p = g.player;
    p.hp = p.maxHp;
    p.ink = p.inkMax;
    p.pigment = Math.max(p.pigment, p.pigmentMax * 0.5);
    sfx.uiConfirm();
    sfx.enso(3, 6);
    w.flash = Math.max(w.flash, 0.3);
    for (let i = 0; i < 6; i++) w.vfx.splat(p.x, p.y + 0.5, (i / 6) * Math.PI * 2, 6, 1.2, 'red');
    w.numbers?.pop(p.x, p.y + 2, `${t('levelUp')} ${save.level}`, { red: true, size: 0.7, life: 1.8, big: true });
  }
}

export function hasColour(): boolean {
  return save.inks.some((i) => i !== 'vermilion');
}

/** A creature fell: experience and maybe a drop. */
export function onKill(g: Game, e: Entity): void {
  const c = e as Creature;
  giveXp(g, c.xp ?? 3);
  const lifeChance = c.elite ? 1 : 0.12, inkChance = c.elite ? 1 : 0.2;
  if (Math.random() < lifeChance) g.world.add(new Pickup(e.x, e.y, 'life', 1));
  if (Math.random() < inkChance) g.world.add(new Pickup(e.x, e.y, 'ink', 7));
  if (hasColour() && Math.random() < (c.elite ? 1 : 0.12)) g.world.add(new Pickup(e.x, e.y, 'pigment', c.elite ? 5 : 2.5));
  // loot
  if (c.tier !== undefined && Math.random() < (c.elite ? 0.65 : 0.07)) {
    dropLoot(g, e.x, e.y, c.elite ? 'elite' : 'normal', c.tier * 2 - 1 + (c.elite ? 1 : 0) + Math.floor(Math.random() * 2));
  }
  // what the child wears
  const gr = gear();
  const p = g.player;
  if (gr.heal > 0 && Math.random() * 100 < gr.heal && p.hp < p.maxHp) {
    p.heal(1);
    g.world.numbers?.pop(p.x, p.y + 1.4, '+1', { size: 0.4 });
  }
  if (gr.pigKill > 0 && hasColour()) p.pigment = Math.min(p.pigmentMax, p.pigment + gr.pigKill);
  if (!g.flags.has('drawHint')) {
    g.flags.add('drawHint');
    g.after(1.5, () => g.hud.showHint(g.input.device === 'touch' ? t('owHintDraw') : t('hintEnso'), 6));
  }
}

/** A colour comes back. */
export function unlockInk(g: Game, id: InkId): void {
  if (save.inks.includes(id)) return;
  const r = g.r;
  save.inks.push(id);
  writeSave();
  const def = INKS[id];
  sfx.uiConfirm();
  music.motif(false, 'bell', 1);
  g.world.flash = 0.4;
  g.player.pigment = g.player.pigmentMax;
  void g.story.show([`${t('inkFound')} : ${def.name[lang]}`, def.verb[lang]], { size: 44, y: r.uiH / 2 - 230, hold: 3, italic: false, stagger: 0.6 });
  g.after(2.5, () => g.hud.showHint(g.input.device === 'touch' ? t('inkSwitchTouch') : t('inkSwitchKbm'), 6));
  g.player.selectInk(id);
}
