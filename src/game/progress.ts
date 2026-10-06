/** What has been restored, and where to continue. Saved in localStorage. */
import type { V } from './physics';

const KEY = 'vermillon.save.v1';

export interface SaveData {
  restored: Record<string, boolean>;
  room: string;
  spawn: V | null;
  finished: boolean;
}

export const progress: SaveData = { restored: {}, room: '', spawn: null, finished: false };

export function loadProgress(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as SaveData;
    Object.assign(progress, d);
    return !!progress.room;
  } catch {
    return false;
  }
}

export function saveProgress(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function resetProgress(): void {
  progress.restored = {};
  progress.room = '';
  progress.spawn = null;
  progress.finished = false;
  saveProgress();
}
