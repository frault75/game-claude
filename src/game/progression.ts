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
}

export const save: Save = { level: 1, xp: 0, inks: ['vermilion'], ink: 'vermilion', camps: [], bosses: [], shrine: 0, shrines: [0] };

export function xpToNext(level: number): number {
  return Math.round(40 * Math.pow(level, 1.45));
}

export const stats = {
  maxHp: (lv: number) => 5 + Math.floor((lv - 1) / 2),
  inkMax: (lv: number) => 22 + (lv - 1) * 2,
  dmg: (lv: number) => 1 + (lv - 1) * 0.15,
};

export function loadSave(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    Object.assign(save, JSON.parse(raw));
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
  Object.assign(save, { level: 1, xp: 0, inks: ['vermilion'], ink: 'vermilion', camps: [], bosses: [], shrine: 0, shrines: [0] });
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
