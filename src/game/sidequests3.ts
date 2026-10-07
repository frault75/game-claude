/** Act III side quests: the librarian's torn sutras, the yak herder's lost peace. */
import type { QuestDef } from './questbook';
import { save } from './progression';
import { STEP } from './quests';

export const SIDE_QUESTS3: QuestDef[] = [
  {
    id: 'sutras',
    title: { fr: 'Les sutras déchirés', en: 'The Torn Sutras' },
    giver: 'kun',
    available: () => save.main >= STEP.bells,
    offer: {
      fr: [
        'Le vent est entré dans la bibliothèque la nuit de l’orage. Trois pages du Sutra du Pinceau sont parties avec lui — les seules que personne n’avait jamais recopiées.',
        'Une s’est accrochée aux pins de la forêt. Une autre est tombée près du glacier. La troisième… le vent l’a portée vers les pentes, au-dessus du monastère.',
        'Rapporte-les-moi avant que le blanc ne les mange. Ce sont les seuls mots que le maître ait écrits sur ce qu’il voulait faire là-haut.',
      ],
      en: [
        'The wind came into the library on the night of the storm. Three pages of the Brush Sutra left with it — the only ones no one had ever copied.',
        'One caught in the pines of the forest. Another fell near the glacier. The third… the wind carried it to the slopes, above the monastery.',
        'Bring them back before the white eats them. They are the only words the master ever wrote about what he meant to do up there.',
      ],
    },
    accept: { fr: 'Je les retrouverai.', en: 'I will find them.' },
    later: { fr: 'Plus tard, mon frère.', en: 'Later, brother.' },
    stages: [
      {
        goal: { fr: 'Retrouve la page accrochée aux pins de la forêt', en: 'Find the page caught in the forest pines' }, kind: 'find', thing: 'page', at: { room: 'peaks', x: 26, y: 70 },
        read: { name: { fr: 'Sutra du Pinceau, page 1', en: 'Brush Sutra, page 1' }, text: { fr: ['« Toute ma vie, j’ai peint ce qui se voit. Il me reste à peindre ce qui ne se voit pas : le papier lui-même. »'], en: ['“All my life I painted what can be seen. What is left is to paint what cannot be seen: the paper itself.”'] } },
      },
      {
        goal: { fr: 'Retrouve la page tombée près du glacier', en: 'Find the page fallen near the glacier' }, kind: 'find', thing: 'page', at: { room: 'peaks', x: 144, y: 40 },
        read: { name: { fr: 'Sutra du Pinceau, page 2', en: 'Brush Sutra, page 2' }, text: { fr: ['« Mais on ne peint pas le blanc. On l’efface jusqu’à lui. J’ai peur de ce que je vais effacer pour l’atteindre. »'], en: ['“But white is not painted. One erases down to it. I am afraid of what I will erase to reach it.”'] } },
      },
      {
        goal: { fr: 'Retrouve la page emportée sur les pentes', en: 'Find the page carried onto the slopes' }, kind: 'find', thing: 'page', at: { room: 'peaks', x: 130, y: 88 },
        read: { name: { fr: 'Sutra du Pinceau, page 3', en: 'Brush Sutra, page 3' }, text: { fr: ['« S’il m’arrive de ne pas redescendre, qu’on cherche le dernier trait que j’ai laissé en bas. Il saura finir. »'], en: ['“If I do not come down, let them look for the last stroke I left below. It will know how to finish.”'] } },
      },
      {
        goal: { fr: 'Rapporte les trois pages à Frère Kun', en: 'Bring the three pages to Brother Kun' },
        kind: 'talk', npc: 'kun',
        say: {
          fr: ['« Le dernier trait qu’il a laissé en bas »… Tu as lu, n’est-ce pas ? Ne me regarde pas comme ça. Je ne fais que recopier.', 'Prends ceci. Il appartenait à un moine qui voulait monter au sommet. Il n’a jamais osé.'],
          en: ['“The last stroke he left below”… You read it, didn’t you? Don’t look at me like that. I only copy.', 'Take this. It belonged to a monk who wanted to climb to the summit. He never dared.'],
        },
      },
    ],
    reward: () => ({ xp: 420, rarity: 'rare' }),
  },
  {
    id: 'herd',
    title: { fr: 'La paix de Jun', en: 'Jun’s Peace' },
    giver: 'jun',
    available: () => save.main >= STEP.bells,
    offer: {
      fr: [
        'Les yétis portaient notre bois pour une poignée de sel. Depuis l’orage, ils descendent la nuit et mes yaks ne dorment plus.',
        'Je ne te demande pas de les haïr. Ils ne savent plus ce qu’ils font. Mais trois d’entre eux rôdent sur l’escalier et dans la forêt : apaise-les. À ta façon.',
      ],
      en: [
        'The yetis carried our wood for a fistful of salt. Since the storm they come down at night and my yaks no longer sleep.',
        'I don’t ask you to hate them. They no longer know what they do. But three of them prowl the stair and the forest: bring them peace. Your way.',
      ],
    },
    accept: { fr: 'Je les apaiserai.', en: 'I will bring them peace.' },
    later: { fr: 'Plus tard, grand-père.', en: 'Later, grandfather.' },
    stages: [
      { goal: { fr: 'Apaise trois yétis, sur l’escalier ou dans la forêt', en: 'Bring peace to three yetis, on the stair or in the forest' }, kind: 'kill', label: 'yeti', count: 3 },
      {
        goal: { fr: 'Retourne voir le vieux Jun', en: 'Return to Old Jun' },
        kind: 'talk', npc: 'jun',
        say: {
          fr: ['Mes yaks ont dormi cette nuit. Moi aussi, pour la première fois depuis l’orage.', 'Bois ça : du thé au beurre de yak. Ça tient chaud au cœur, et le cœur, c’est ce qui lâche en premier, là-haut.'],
          en: ['My yaks slept last night. So did I, for the first time since the storm.', 'Drink this: yak-butter tea. It keeps the heart warm, and up here the heart is what gives out first.'],
        },
      },
    ],
    reward: () => ({ xp: 360, perk: ['life', 1, { fr: 'Une vie de plus : le thé au beurre de yak.', en: 'One more life: yak-butter tea.' }] }),
  },
];
