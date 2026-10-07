/** The main quest: one step at a time, saved, shown top right. */
import { save, writeSave } from './progression';
import { MAIN, L, UI, BESTIARY } from '../i18n/lore';
import { HEART_UI } from '../i18n/heart';
import { lang } from '../i18n';
import { ORCHARD_CAMPS, CAMPS } from '../world/layout';
import { sfx } from '../audio/sfx';
import type { Game } from './game';

export const STEP = {
  meetWillow: 0,
  orchard: 1,
  orchardBack: 2,
  findCave: 3,
  caveDeep: 4,
  indigoBack: 5,
  brambles: 6,
  plain: 7,
  findTemple: 8,
  templeDeep: 9,
  goldBack: 10,
  end: 11,
  // Act II
  reeds: 12,
  meetHeron: 13,
  sluices: 14,
  toad: 15,
  basinDeep: 16,
  toadBack: 17,
  hermit: 18,
  queen: 19,
  yuBack: 20,
  lotus: 21,
  heronBoss: 22,
  prayer: 23,
  pagoda: 24,
  jadeBack: 25,
  act3: 26,
  // Act III
  monastery: 27,
  snow: 28,
  bells: 29,
  bellsBack: 30,
  kings: 31,
  sealBack: 32,
  summit: 33,
  epilogue: 34,
} as const;

/** Title and goal of the current step (with progress where it counts). */
export function questLine(): [string, string] {
  const step = MAIN[Math.min(save.main, MAIN.length - 1)];
  let goal = L(step.goal);
  if (save.main === STEP.orchard) {
    const n = ORCHARD_CAMPS.filter((id) => save.camps.includes(id)).length;
    goal += ` (${n}/${ORCHARD_CAMPS.length})`;
  }
  if (save.main === STEP.sluices) goal += ` (${save.sluices.length}/3)`;
  if (save.main === STEP.bells) goal += ` (${[0, 1, 2].filter((i) => save.perks['bell' + i]).length}/3)`;
  if (save.main === STEP.kings) goal += ` (${['sealA', 'sealB'].filter((k) => save.perks[k]).length}/2)`;
  if (save.main === STEP.summit && save.perks.summitOpen && !save.perks.hollowDone && !save.bosses.includes('hand')) goal = L(HEART_UI.goal);
  if (save.main >= MAIN.length) {
    const beasts = Object.keys(BESTIARY).length;
    goal = lang === 'fr'
      ? `Camps ${save.camps.length}/${CAMPS.length} · bestiaire ${save.bestiary.length}/${beasts}`
      : `Camps ${save.camps.length}/${CAMPS.length} · bestiary ${save.bestiary.length}/${beasts}`;
  }
  return [L(step.title), goal];
}

/** Move the story forward (never back). */
export function setMain(g: Game, step: number): void {
  if (step <= save.main) return;
  const before = L(MAIN[save.main].title);
  save.main = step;
  writeSave();
  const now = MAIN[step];
  if (L(now.title) !== before) {
    g.hud.showHint(`${L(UI.questDone)} — ${L(UI.newQuest)} : ${L(now.title)}`, 4.5);
    sfx.uiConfirm();
  } else {
    g.hud.showHint(L(now.goal), 4);
    sfx.ui();
  }
}
