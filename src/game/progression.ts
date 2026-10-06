/** Experience, levels, unlocked inks, cleared camps, defeated guardians. Saved in localStorage. */
import type { InkId } from './inks';
import { Item, Slot, Stat, totals } from './items';

const KEY = 'trait.save.v1';

export interface Save {
  level: number;
  xp: number;
  inks: InkId[];
  ink: InkId;
  camps: number[];
  bosses: string[];
  shrine: number;
  shrines: number[];
  /** Main quest step (see MAIN in i18n/lore). */
  main: number;
  /** Steles already read. */
  steles: number[];
  /** The old bridge is clear of brambles. */
  brambles: boolean;
  /** Madder has explained pigment once. */
  madder: boolean;
  pip: number;
  pigment: number;
  /** Loot carried and worn. */
  bag: Item[];
  equip: Partial<Record<Slot, Item>>;
  newItems: boolean;
  /** Ranks in the Tree of Strokes, and the three active skill slots. */
  skills: Record<string, number>;
  slots: (string | null)[];
  /** Creatures beaten at least once (pages of the bestiary), and regions already walked. */
  bestiary: string[];
  regions: string[];
  /** Fog of war per map: hex bit strings (see ui/mapArt). */
  fog: Record<string, string>;
  /** Side quests: current stage, a counter, the path chosen, done. */
  quests: Record<string, { s: number; n: number; c?: string; done?: boolean; seen?: number[] }>;
  /** Lasting gifts from quests (life, pigment, skill points, the shrines' blessing…). */
  perks: Record<string, number>;
  /** Chests already opened. */
  chests: number[];
  /** Copper cash coins, and the healing gourd (charges left, most it can hold). */
  coins: number;
  gourd: number;
  gourdMax: number;
  /** The merchant's goods: seed of the current stock and when it was laid out. */
  shopSeed: number;
  shopBought: number[];
  /** Act II: the terraces' sluices reopened. */
  sluices: number[];
}

export const BAG_SIZE = 16;

const fresh = (): Save => ({
  level: 1, xp: 0, inks: ['vermilion'], ink: 'vermilion', camps: [], bosses: [], shrine: 0, shrines: [0],
  main: 0, steles: [], brambles: false, madder: false, pip: 0, pigment: 0,
  bag: [], equip: {}, newItems: false,
  skills: {}, slots: [null, null, null],
  bestiary: [], regions: [], fog: {}, quests: {}, perks: {}, chests: [],
  coins: 0, gourd: 2, gourdMax: 2, shopSeed: 1, shopBought: [], sluices: [],
});

let gearCache: Record<Stat, number> | null = null;
/** Qualities of the worn items, summed. */
export function gear(): Record<Stat, number> {
  return (gearCache ??= totals(save.equip));
}
export function gearChanged(): void {
  gearCache = null;
}

export const save: Save = fresh();

export function xpToNext(level: number): number {
  return Math.round(45 * Math.pow(level, 1.6));
}

export const stats = {
  maxHp: (lv: number) => 5 + Math.floor((lv - 1) / 2),
  inkMax: (lv: number) => 20 + (lv - 1) * 1.5,
  /** Coloured inks draw from pigment, which does not flow back on its own. */
  pigmentMax: (lv: number) => 10 + (lv - 1),
  dmg: (lv: number) => 1 + (lv - 1) * 0.09,
};

export function loadSave(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    Object.assign(save, fresh(), JSON.parse(raw));
    // saves from before Act I: keep the level, restart the story
    if (typeof (JSON.parse(raw) as Partial<Save>).main !== 'number') {
      save.inks = ['vermilion'];
      save.ink = 'vermilion';
      save.bosses = [];
      save.camps = [];
      save.shrine = 0;
      save.shrines = [0];
    }
    gearChanged();
    return true;
  } catch {
    return false;
  }
}

export function writeSave(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
}

export function resetSave(): void {
  Object.assign(save, fresh());
  gearChanged();
  writeSave();
}

/** Add experience; returns how many levels were gained. */
export function gainXp(n: number): number {
  save.xp += n;
  let ups = 0;
  while (save.xp >= xpToNext(save.level)) {
    save.xp -= xpToNext(save.level);
    save.level++;
    ups++;
  }
  return ups;
}
