/** Player preferences, kept apart from the save: volumes, screen shake, the minimap, the play style. */
import { audio } from '../audio/engine';

export interface Settings {
  music: number;
  sfx: number;
  shake: boolean;
  minimap: boolean;
  /** 'action': move + Attack, Stroke and Ensō buttons (any device). 'brush': strokes and loops drawn freely. */
  style: 'action' | 'brush';
}

const KEY = 'trait.settings.v1';

export const settings: Settings = { music: 0.7, sfx: 0.85, shake: true, minimap: true, style: 'action' };

export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch {
    /* storage unavailable */
  }
  applySettings();
}

export function saveSettings(): void {
  applySettings();
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function applySettings(): void {
  audio.volume.music = settings.music;
  audio.volume.sfx = settings.sfx;
  audio.setVolumes();
}
