/** Experience, levels, unlocked inks, cleared camps, defeated guardians. Saved in localStorage. */
import type { InkId } from './inks';

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
}

const fresh = (): Save => ({
  level: 1, xp: 0, inks: ['vermilion'], ink: 'vermilion', camps: [], bosses: [], shrine: 0, shrines: [0],
  main: 0, steles: [], brambles: false, madder: false, pip: 0, pigment: 0,
});

export const save: Save = fresh();

export function xpToNext(level: number): number {
  return Math.round(40 * Math.pow(level, 1.45));
}

export const stats = {
  maxHp: (lv: number) => 5 + Math.floor((lv - 1) / 2),
  inkMax: (lv: number) => 20 + (lv - 1) * 1.5,
  /** Coloured inks draw from pigment, which does not flow back on its own. */
  pigmentMax: (lv: number) => 10 + (lv - 1),
  dmg: (lv: number) => 1 + (lv - 1) * 0.15,
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
