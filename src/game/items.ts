/**
 * Loot: brushes, robes, talismans and seals, in four rarities, with rolled qualities.
 * Pure data and rolls; drawing and the bag live elsewhere.
 */
import { Rng } from '../gfx/rng';
import { lang } from '../i18n';

export type Slot = 'brush' | 'robe' | 'charm' | 'seal';
export type Rarity = 'common' | 'magic' | 'rare' | 'unique';
export type Stat = 'dmg' | 'hp' | 'ink' | 'pigment' | 'regen' | 'speed' | 'enso' | 'crit' | 'heal' | 'pigKill' | 'guard';

export const SLOTS: Slot[] = ['brush', 'robe', 'charm', 'seal'];

export interface Item {
  id: number;
  slot: Slot;
  rarity: Rarity;
  /** Index of the base in BASES[slot]. */
  base: number;
  level: number;
  stats: Partial<Record<Stat, number>>;
  /** Rare names and uniques. */
  name?: { fr: string; en: string };
  unique?: number;
}

type Tr = { fr: string; en: string };

export const SLOT_NAMES: Record<Slot, Tr> = {
  brush: { fr: 'Pinceau', en: 'Brush' },
  robe: { fr: 'Robe', en: 'Robe' },
  charm: { fr: 'Talisman', en: 'Talisman' },
  seal: { fr: 'Sceau', en: 'Seal' },
};

export const RARITY_NAMES: Record<Rarity, Tr> = {
  common: { fr: 'Commun', en: 'Common' },
  magic: { fr: 'Magique', en: 'Magic' },
  rare: { fr: 'Rare', en: 'Rare' },
  unique: { fr: 'Unique', en: 'Unique' },
};

/** Rarity colours (gouache), for seals and names. */
export const RARITY_RGB: Record<Rarity, [number, number, number]> = {
  common: [0.42, 0.4, 0.38],
  magic: [0.2, 0.33, 0.58],
  rare: [0.82, 0.6, 0.15],
  unique: [0.76, 0.23, 0.17],
};

interface Base { name: Tr; main: Stat; lo: number; hi: number }

export const BASES: Record<Slot, Base[]> = {
  brush: [
    { name: { fr: 'Pinceau de bambou', en: 'Bamboo Brush' }, main: 'dmg', lo: 4, hi: 9 },
    { name: { fr: 'Pinceau en poil de loup', en: 'Wolf-hair Brush' }, main: 'dmg', lo: 6, hi: 12 },
    { name: { fr: 'Pinceau de cèdre', en: 'Cedar Brush' }, main: 'dmg', lo: 8, hi: 15 },
    { name: { fr: 'Grand pinceau', en: 'Great Brush' }, main: 'dmg', lo: 11, hi: 20 },
  ],
  robe: [
    { name: { fr: 'Robe de chanvre', en: 'Hemp Robe' }, main: 'guard', lo: 2, hi: 4 },
    { name: { fr: 'Manteau de paille', en: 'Straw Cloak' }, main: 'guard', lo: 3, hi: 6 },
    { name: { fr: 'Robe matelassée', en: 'Quilted Robe' }, main: 'guard', lo: 4, hi: 8 },
    { name: { fr: 'Robe de soie', en: 'Silk Robe' }, main: 'guard', lo: 6, hi: 10 },
  ],
  charm: [
    { name: { fr: 'Talisman de papier', en: 'Paper Talisman' }, main: 'ink', lo: 2, hi: 4 },
    { name: { fr: 'Clochette de cuivre', en: 'Copper Bell' }, main: 'ink', lo: 3, hi: 6 },
    { name: { fr: 'Pendentif de jade', en: 'Jade Pendant' }, main: 'ink', lo: 4, hi: 8 },
  ],
  seal: [
    { name: { fr: 'Sceau de pierre', en: 'Stone Seal' }, main: 'crit', lo: 2, hi: 4 },
    { name: { fr: 'Sceau de bronze', en: 'Bronze Seal' }, main: 'crit', lo: 3, hi: 6 },
    { name: { fr: 'Sceau d’ivoire', en: 'Ivory Seal' }, main: 'crit', lo: 4, hi: 8 },
  ],
};

/** Every quality: its range at item level 1 and 10, how it reads, and a suffix for magic names. */
export const STATS: Record<Stat, { lo: [number, number]; hi: [number, number]; fmt: Tr; suffix: Tr; int?: boolean }> = {
  dmg: { lo: [4, 8], hi: [14, 26], fmt: { fr: '+{v} % de dégâts', en: '+{v}% damage' }, suffix: { fr: 'du Tranchant', en: 'of Edges' } },
  hp: { lo: [1, 1], hi: [1, 3], fmt: { fr: '+{v} de vie', en: '+{v} life' }, suffix: { fr: 'de la Montagne', en: 'of the Mountain' }, int: true },
  ink: { lo: [2, 4], hi: [6, 10], fmt: { fr: '+{v} d’encre', en: '+{v} ink' }, suffix: { fr: 'de l’Encrier', en: 'of the Inkwell' }, int: true },
  pigment: { lo: [1, 3], hi: [4, 7], fmt: { fr: '+{v} de pigment', en: '+{v} pigment' }, suffix: { fr: 'de la Teinturière', en: 'of the Dyer' }, int: true },
  regen: { lo: [8, 15], hi: [25, 45], fmt: { fr: '+{v} % de recharge d’encre', en: '+{v}% ink flow' }, suffix: { fr: 'de la Source', en: 'of the Spring' } },
  speed: { lo: [3, 6], hi: [8, 14], fmt: { fr: '+{v} % de vitesse', en: '+{v}% speed' }, suffix: { fr: 'du Vent', en: 'of the Wind' } },
  enso: { lo: [10, 20], hi: [30, 55], fmt: { fr: '+{v} % de dégâts d’ensō', en: '+{v}% ensō damage' }, suffix: { fr: 'du Cercle', en: 'of the Circle' } },
  crit: { lo: [2, 4], hi: [7, 12], fmt: { fr: '+{v} % de coups critiques', en: '+{v}% critical strikes' }, suffix: { fr: 'du Faucon', en: 'of the Falcon' } },
  heal: { lo: [3, 6], hi: [8, 14], fmt: { fr: '{v} % de chance de soin par victoire', en: '{v}% chance to heal on kill' }, suffix: { fr: 'du Saule', en: 'of the Willow' } },
  pigKill: { lo: [0.2, 0.3], hi: [0.5, 0.9], fmt: { fr: '+{v} pigment par victoire', en: '+{v} pigment per kill' }, suffix: { fr: 'de l’Arc-en-ciel', en: 'of the Rainbow' } },
  guard: { lo: [2, 4], hi: [6, 10], fmt: { fr: '{v} % de parade', en: '{v}% parry' }, suffix: { fr: 'de la Carapace', en: 'of the Shell' } },
};

/** Which qualities each slot may roll. */
const POOLS: Record<Slot, Stat[]> = {
  brush: ['dmg', 'crit', 'enso', 'heal', 'pigKill', 'regen'],
  robe: ['hp', 'guard', 'speed', 'heal', 'regen'],
  charm: ['ink', 'pigment', 'regen', 'pigKill', 'speed', 'hp'],
  seal: ['crit', 'enso', 'dmg', 'pigment', 'guard', 'speed'],
};

export interface UniqueDef { slot: Slot; base: number; name: Tr; flavor: Tr; stats: Partial<Record<Stat, number>> }

export const UNIQUES: UniqueDef[] = [
  {
    slot: 'brush', base: 3, name: { fr: 'Le Pinceau du maître', en: 'The Master’s Brush' },
    flavor: { fr: 'Il sent encore l’encre fraîche.', en: 'It still smells of fresh ink.' },
    stats: { dmg: 30, enso: 45, crit: 6 },
  },
  {
    slot: 'robe', base: 3, name: { fr: 'La Robe de pluie', en: 'The Rain Robe' },
    flavor: { fr: 'Tissée pendant l’orage.', en: 'Woven during the storm.' },
    stats: { hp: 2, guard: 14, regen: 25 },
  },
  {
    slot: 'charm', base: 1, name: { fr: 'Le Grelot de Pip', en: 'Pip’s Bell' },
    flavor: { fr: 'Il tinte quand le vent tourne.', en: 'It rings when the wind turns.' },
    stats: { pigment: 6, speed: 12, pigKill: 0.6 },
  },
  {
    slot: 'seal', base: 2, name: { fr: 'Le Sceau rouge', en: 'The Red Seal' },
    flavor: { fr: '« Ce que je signe vit. »', en: '“What I sign, lives.”' },
    stats: { crit: 12, heal: 12, dmg: 10 },
  },
];

const RARE_A: Tr[] = [
  { fr: 'Brume', en: 'Mist' }, { fr: 'Lune', en: 'Moon' }, { fr: 'Rosée', en: 'Dew' }, { fr: 'Cendre', en: 'Ash' },
  { fr: 'Pluie', en: 'Rain' }, { fr: 'Neige', en: 'Snow' }, { fr: 'Grue', en: 'Crane' }, { fr: 'Lanterne', en: 'Lantern' },
  { fr: 'Corbeau', en: 'Raven' }, { fr: 'Marée', en: 'Tide' }, { fr: 'Orage', en: 'Storm' }, { fr: 'Saule', en: 'Willow' },
];
const RARE_B: Tr[] = [
  { fr: 'de cendre', en: 'of Ash' }, { fr: 'd’automne', en: 'of Autumn' }, { fr: 'de minuit', en: 'of Midnight' }, { fr: 'du soir', en: 'of Evening' },
  { fr: 'de jade', en: 'of Jade' }, { fr: 'de fer', en: 'of Iron' }, { fr: 'des cimes', en: 'of the Peaks' }, { fr: 'de l’étang', en: 'of the Pond' },
  { fr: 'sans nom', en: 'without Name' }, { fr: 'du col', en: 'of the Pass' },
];

let nextId = Date.now() % 1e6;

function roll(stat: Stat, level: number, r: Rng): number {
  const d = STATS[stat];
  const k = Math.max(0, Math.min(1, (level - 1) / 9));
  const lo = d.lo[0] + (d.hi[0] - d.lo[0]) * k, hi = d.lo[1] + (d.hi[1] - d.lo[1]) * k;
  const v = lo + (hi - lo) * r.next();
  return d.int ? Math.max(1, Math.round(v)) : stat === 'pigKill' ? Math.round(v * 10) / 10 : Math.round(v);
}

export function rollRarity(r: Rng, kind: 'normal' | 'elite' | 'boss'): Rarity {
  const w: Record<Rarity, number> = kind === 'boss'
    ? { common: 0, magic: 0, rare: 75, unique: 25 }
    : kind === 'elite' ? { common: 25, magic: 48, rare: 22, unique: 5 } : { common: 58, magic: 32, rare: 9, unique: 1 };
  let x = r.next() * (w.common + w.magic + w.rare + w.unique);
  for (const k of ['common', 'magic', 'rare', 'unique'] as Rarity[]) {
    x -= w[k];
    if (x <= 0) return k;
  }
  return 'common';
}

/** A fresh item of a given level (1..10). */
export function makeItem(level: number, rarity: Rarity, seed = Math.random() * 1e9, slot?: Slot): Item {
  const r = new Rng(Math.floor(seed));
  if (rarity === 'unique') {
    const pool = UNIQUES.map((u, i) => ({ u, i })).filter((o) => !slot || o.u.slot === slot);
    const { u, i } = pool[r.int(0, pool.length - 1)];
    return { id: nextId++, slot: u.slot, rarity, base: u.base, level, stats: { ...u.stats }, name: u.name, unique: i };
  }
  slot = slot ?? SLOTS[r.int(0, SLOTS.length - 1)];
  const bases = BASES[slot];
  // better bases appear deeper in
  const bi = Math.min(bases.length - 1, Math.floor(r.next() * Math.min(bases.length, 1 + level / 2.5)));
  const base = bases[bi];
  const k = Math.max(0, Math.min(1, (level - 1) / 9));
  const stats: Partial<Record<Stat, number>> = {};
  const mainV = Math.round(base.lo + (base.hi - base.lo) * (0.5 * k + 0.5 * r.next()));
  stats[base.main] = mainV;
  const n = rarity === 'magic' ? r.int(1, 2) : rarity === 'rare' ? r.int(3, 4) : 0;
  const pool = POOLS[slot].slice();
  for (let i = 0; i < n && pool.length; i++) {
    const s = pool.splice(r.int(0, pool.length - 1), 1)[0];
    const v = roll(s, level, r);
    stats[s] = Math.round(((stats[s] ?? 0) + v) * 10) / 10;
  }
  const item: Item = { id: nextId++, slot, rarity, base: bi, level, stats };
  if (rarity === 'rare') {
    const a = RARE_A[r.int(0, RARE_A.length - 1)], b = RARE_B[r.int(0, RARE_B.length - 1)];
    item.name = { fr: `${a.fr} ${b.fr}`, en: `${a.en} ${b.en}` };
  }
  return item;
}

/** Display name in the current language. */
export function itemName(it: Item): string {
  const base = BASES[it.slot][it.base].name[lang];
  if (it.rarity === 'unique' && it.name) return it.name[lang];
  if (it.rarity === 'rare' && it.name) return lang === 'fr' ? `${base} « ${it.name.fr} »` : `${base} “${it.name.en}”`;
  if (it.rarity === 'magic') {
    // named after its strongest extra quality
    const main = BASES[it.slot][it.base].main;
    let best: Stat | null = null, bv = -1;
    for (const [s, v] of Object.entries(it.stats) as [Stat, number][]) {
      if (s === main) continue;
      const span = STATS[s].hi[1] || 1;
      if (v / span > bv) { bv = v / span; best = s; }
    }
    if (best) return `${base} ${STATS[best].suffix[lang]}`;
  }
  return base;
}

export function statLine(s: Stat, v: number): string {
  return STATS[s].fmt[lang].replace('{v}', String(v));
}

export function itemLines(it: Item): string[] {
  const order: Stat[] = ['dmg', 'hp', 'guard', 'ink', 'pigment', 'crit', 'enso', 'regen', 'speed', 'heal', 'pigKill'];
  return order.filter((s) => it.stats[s] !== undefined).map((s) => statLine(s, it.stats[s]!));
}

export function uniqueFlavor(it: Item): string | null {
  return it.unique !== undefined ? UNIQUES[it.unique].flavor[lang] : null;
}

/** Sum of the qualities of the worn items. */
export function totals(equip: Partial<Record<Slot, Item>>): Record<Stat, number> {
  const t = { dmg: 0, hp: 0, ink: 0, pigment: 0, regen: 0, speed: 0, enso: 0, crit: 0, heal: 0, pigKill: 0, guard: 0 } as Record<Stat, number>;
  for (const s of SLOTS) {
    const it = equip[s];
    if (!it) continue;
    for (const [k, v] of Object.entries(it.stats) as [Stat, number][]) t[k] += v;
  }
  t.guard = Math.min(40, t.guard);
  t.crit = Math.min(50, t.crit);
  t.speed = Math.min(30, t.speed);
  return t;
}

/** A rough worth, to compare items at a glance. */
export function itemScore(it: Item): number {
  let s = 0;
  for (const [k, v] of Object.entries(it.stats) as [Stat, number][]) s += v / (STATS[k as Stat].hi[1] || 1);
  return s;
}
