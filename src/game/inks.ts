/** The master's inks: each colour changes what a stroke and a closed loop do. */
export type InkId = 'vermilion' | 'indigo' | 'gold' | 'jade';

export interface InkDef {
  id: InkId;
  /** Display colour (gouache). */
  rgb: [number, number, number];
  /** Shu runs along the stroke (vermilion) or the stroke is painted at a distance. */
  runs: boolean;
  /** Ink spent per unit of stroke. */
  cost: number;
  name: { fr: string; en: string };
  verb: { fr: string; en: string };
}

export const INKS: Record<InkId, InkDef> = {
  vermilion: {
    id: 'vermilion', rgb: [0.76, 0.23, 0.17], runs: true, cost: 1,
    name: { fr: 'Vermillon', en: 'Vermilion' },
    verb: { fr: 'Le trait tranche, la boucle explose.', en: 'The stroke cuts, the loop bursts.' },
  },
  indigo: {
    id: 'indigo', rgb: [0.2, 0.33, 0.58], runs: false, cost: 0.8,
    name: { fr: 'Indigo', en: 'Indigo' },
    verb: { fr: 'Le trait gèle, la boucle fige tout.', en: 'The stroke freezes, the loop holds all still.' },
  },
  gold: {
    id: 'gold', rgb: [0.86, 0.66, 0.2], runs: false, cost: 1.2,
    name: { fr: 'Or', en: 'Gold' },
    verb: { fr: 'La foudre suit le trait, la boucle devient orage.', en: 'Lightning follows the stroke, the loop becomes a storm.' },
  },
  jade: {
    id: 'jade', rgb: [0.3, 0.6, 0.42], runs: false, cost: 1,
    name: { fr: 'Jade', en: 'Jade' },
    verb: { fr: 'Le trait fait pousser des bambous, la boucle soigne.', en: 'The stroke grows bamboo, the loop heals.' },
  },
};

export const INK_ORDER: InkId[] = ['vermilion', 'indigo', 'gold', 'jade'];

export function inkCss(id: InkId, a = 1): string {
  const [r, g, b] = INKS[id].rgb;
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
}
