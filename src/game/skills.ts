/**
 * The Tree of Strokes: one point per level, three branches. Passive ranks make the child stronger;
 * active skills are new attacks with a cooldown, worn in three slots.
 */
import { save } from './progression';
import { lang } from '../i18n';

export type Branch = 'red' | 'colour' | 'wash';
export type SkillId =
  | 'edge' | 'reach' | 'whirl' | 'redEnso' | 'flow' | 'seals'
  | 'grind' | 'reserve' | 'wave' | 'frost' | 'chain' | 'storm'
  | 'breath' | 'parry' | 'mend' | 'second' | 'light' | 'mist';

type Tr = { fr: string; en: string };

export interface SkillDef {
  id: SkillId;
  branch: Branch;
  /** Row in its branch (0 at the top); a row needs 2 × row points spent in the branch. */
  row: number;
  ranks: number;
  active?: { cooldown: number };
  name: Tr;
  /** What one rank does ({v} = total at the current rank). */
  text: Tr;
  per: number;
}

export const BRANCH_NAMES: Record<Branch, Tr> = {
  red: { fr: 'Vermillon', en: 'Vermilion' },
  colour: { fr: 'Couleurs', en: 'Colours' },
  wash: { fr: 'Lavis', en: 'Wash' },
};

export const BRANCH_RGB: Record<Branch, [number, number, number]> = {
  red: [0.76, 0.23, 0.17],
  colour: [0.2, 0.33, 0.58],
  wash: [0.3, 0.45, 0.38],
};

export const SKILLS: SkillDef[] = [
  // Vermilion: the stroke and the blade
  { id: 'edge', branch: 'red', row: 0, ranks: 3, per: 12, name: { fr: 'Trait affûté', en: 'Honed Stroke' }, text: { fr: '+{v} % de dégâts au pinceau et au trait', en: '+{v}% brush and stroke damage' } },
  { id: 'reach', branch: 'red', row: 0, ranks: 2, per: 20, name: { fr: 'Long trait', en: 'Long Stroke' }, text: { fr: 'Trait droit {v} % plus long', en: 'Straight stroke {v}% longer' } },
  { id: 'whirl', branch: 'red', row: 1, ranks: 1, per: 1, active: { cooldown: 6 }, name: { fr: 'Tourbillon', en: 'Whirl' }, text: { fr: 'Un coup de pinceau tout autour de Shu, qui repousse', en: 'A brush sweep all around Shu that knocks back' } },
  { id: 'redEnso', branch: 'red', row: 2, ranks: 3, per: 20, name: { fr: 'Ensō écarlate', en: 'Scarlet Ensō' }, text: { fr: '+{v} % de dégâts des boucles vermillon', en: '+{v}% vermilion loop damage' } },
  { id: 'flow', branch: 'red', row: 2, ranks: 2, per: 15, name: { fr: 'Encre vive', en: 'Quick Ink' }, text: { fr: '+{v} % de recharge d’encre', en: '+{v}% ink flow' } },
  { id: 'seals', branch: 'red', row: 3, ranks: 1, per: 1, active: { cooldown: 12 }, name: { fr: 'Pluie de sceaux', en: 'Rain of Seals' }, text: { fr: 'Des sceaux rouges tombent autour et explosent', en: 'Red seals fall around and burst' } },
  // Colours: pigment, ice and lightning
  { id: 'grind', branch: 'colour', row: 0, ranks: 3, per: 10, name: { fr: 'Broyage fin', en: 'Fine Grinding' }, text: { fr: 'Les encres de couleur coûtent {v} % de moins', en: 'Coloured inks cost {v}% less' } },
  { id: 'reserve', branch: 'colour', row: 0, ranks: 3, per: 3, name: { fr: 'Réserve', en: 'Reserve' }, text: { fr: '+{v} de pigment', en: '+{v} pigment' } },
  { id: 'wave', branch: 'colour', row: 1, ranks: 1, per: 1, active: { cooldown: 9 }, name: { fr: 'Vague d’indigo', en: 'Indigo Wave' }, text: { fr: 'Une vague gelée devant Shu : elle fige et blesse', en: 'A frozen wave ahead of Shu: it freezes and hurts' } },
  { id: 'frost', branch: 'colour', row: 2, ranks: 2, per: 30, name: { fr: 'Gel profond', en: 'Deep Frost' }, text: { fr: 'Le gel dure {v} % plus longtemps', en: 'Freezing lasts {v}% longer' } },
  { id: 'chain', branch: 'colour', row: 2, ranks: 2, per: 1, name: { fr: 'Foudre en chaîne', en: 'Chain Lightning' }, text: { fr: 'La foudre de l’or rebondit sur {v} ennemi(s) de plus', en: 'Gold lightning leaps to {v} more foe(s)' } },
  { id: 'storm', branch: 'colour', row: 3, ranks: 1, per: 1, active: { cooldown: 15 }, name: { fr: 'Orage', en: 'Storm' }, text: { fr: 'La foudre frappe les ennemis proches, six fois', en: 'Lightning strikes nearby foes, six times' } },
  // Wash: breath, guard, patience
  { id: 'breath', branch: 'wash', row: 0, ranks: 3, per: 1, name: { fr: 'Souffle', en: 'Breath' }, text: { fr: '+{v} de vie', en: '+{v} life' } },
  { id: 'parry', branch: 'wash', row: 0, ranks: 3, per: 4, name: { fr: 'Garde', en: 'Guard' }, text: { fr: '+{v} % de parade', en: '+{v}% parry' } },
  { id: 'mend', branch: 'wash', row: 1, ranks: 1, per: 1, active: { cooldown: 18 }, name: { fr: 'Lavis de soin', en: 'Mending Wash' }, text: { fr: 'Rend 2 points de vie et un peu d’encre', en: 'Restores 2 life and some ink' } },
  { id: 'second', branch: 'wash', row: 2, ranks: 1, per: 1, name: { fr: 'Second souffle', en: 'Second Wind' }, text: { fr: 'Une fois par minute, un coup mortel laisse Shu à 1 point de vie', en: 'Once a minute, a deadly blow leaves Shu at 1 life' } },
  { id: 'light', branch: 'wash', row: 2, ranks: 2, per: 6, name: { fr: 'Pas léger', en: 'Light Step' }, text: { fr: '+{v} % de vitesse, compétences rechargées {v} % plus vite', en: '+{v}% speed, skills recharge {v}% faster' } },
  { id: 'mist', branch: 'wash', row: 3, ranks: 1, per: 1, active: { cooldown: 14 }, name: { fr: 'Brume', en: 'Mist' }, text: { fr: 'Shu devient brume : intouchable deux secondes et plus rapide', en: 'Shu turns to mist: untouchable for two seconds and faster' } },
];

export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, SkillDef>;

export function rank(id: SkillId): number {
  return save.skills[id] ?? 0;
}

/** Total effect of a passive at its current rank. */
export function eff(id: SkillId): number {
  return rank(id) * SKILL[id].per;
}

export function spentIn(b: Branch): number {
  let n = 0;
  for (const s of SKILLS) if (s.branch === b) n += rank(s.id);
  return n;
}

export function pointsLeft(): number {
  let spent = 0;
  for (const s of SKILLS) spent += rank(s.id);
  return Math.max(0, save.level - 1 - spent);
}

export function canLearn(id: SkillId): boolean {
  const s = SKILL[id];
  return pointsLeft() > 0 && rank(id) < s.ranks && spentIn(s.branch) >= s.row * 2;
}

/** Spend a point; actives go to the first free slot. */
export function learn(id: SkillId): boolean {
  if (!canLearn(id)) return false;
  save.skills[id] = rank(id) + 1;
  const s = SKILL[id];
  if (s.active && !save.slots.includes(id)) {
    const free = save.slots.findIndex((x) => !x);
    if (free >= 0) save.slots[free] = id;
  }
  return true;
}

export function skillText(id: SkillId): string {
  const s = SKILL[id];
  const r = Math.max(1, rank(id));
  return s.text[lang].split('{v}').join(String(r * s.per));
}

export function skillName(id: SkillId): string {
  return SKILL[id].name[lang];
}

/** Cooldown with Light Step. */
export function cooldownOf(id: SkillId): number {
  const s = SKILL[id];
  return (s.active?.cooldown ?? 0) * (1 - eff('light') / 100);
}
