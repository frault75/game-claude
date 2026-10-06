import { fr } from './fr';
import { en } from './en';

export type Lang = 'fr' | 'en';
export type StringKey = keyof typeof fr;

const tables: Record<Lang, Record<StringKey, string>> = { fr, en };

function detect(): Lang {
  try {
    const saved = localStorage.getItem('vermillon.lang');
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {
    /* storage unavailable */
  }
  return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export let lang: Lang = detect();

export function setLang(l: Lang): void {
  lang = l;
  try {
    localStorage.setItem('vermillon.lang', l);
  } catch {
    /* ignore */
  }
}

export function t(key: StringKey): string {
  return tables[lang][key] ?? key;
}
