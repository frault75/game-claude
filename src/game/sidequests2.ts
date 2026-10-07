/** Act II side quests: the tea master, the fisher girl, the last monk outside the pagoda. */
import type { QuestDef } from './questbook';
import { save } from './progression';
import { STEP } from './quests';

export const SIDE_QUESTS2: QuestDef[] = [
  {
    id: 'tea',
    title: { fr: 'Le thé des brumes', en: 'Mist Tea' },
    giver: 'tao',
    available: () => save.main >= STEP.meetHeron,
    offer: {
      fr: [
        'Le thé des brumes ne pousse qu’au col, là où le brouillard s’accroche aux pierres. Trois buissons, le long du sentier.',
        'Rapporte-m’en une feuille de chacun et je te ferai un thé qui tient chaud tout un hiver. Ta gourde n’aura jamais rien goûté de meilleur.',
      ],
      en: [
        'Mist tea grows only in the pass, where the fog clings to the stones. Three bushes, along the path.',
        'Bring me a leaf from each and I will make you a tea that keeps you warm all winter. Your gourd will never have tasted better.',
      ],
    },
    accept: { fr: 'Trois feuilles, entendu.', en: 'Three leaves, understood.' },
    later: { fr: 'Plus tard.', en: 'Later.' },
    stages: [
      { goal: { fr: 'Cueille le premier buisson de thé, au col (gardé)', en: 'Pick the first tea bush, in the pass (guarded)' }, kind: 'find', thing: 'tea', at: { room: 'terraces', x: 18, y: 88.5 } },
      { goal: { fr: 'Cueille le deuxième buisson de thé, au col', en: 'Pick the second tea bush, in the pass' }, kind: 'find', thing: 'tea', at: { room: 'terraces', x: 24.6, y: 79.6 } },
      { goal: { fr: 'Cueille le troisième buisson de thé, au col (gardé)', en: 'Pick the third tea bush, in the pass (guarded)' }, kind: 'find', thing: 'tea', at: { room: 'terraces', x: 28.5, y: 56.2 } },
      {
        goal: { fr: 'Rapporte les feuilles à Tao', en: 'Bring the leaves to Tao' },
        kind: 'talk', npc: 'tao',
        say: {
          fr: ['Ah… le parfum des pierres mouillées.', 'Verse ce thé dans ta gourde : elle tiendra une gorgée de plus, et chacune réchauffera jusqu’aux os.'],
          en: ['Ah… the scent of wet stones.', 'Pour this tea into your gourd: it will hold one more sip, and each one will warm you to the bone.'],
        },
      },
    ],
    reward: () => ({ xp: 220, perk: ['gourd', 1, { fr: 'Ta gourde tient une gorgée de plus.', en: 'Your gourd holds one more sip.' }] }),
  },
  {
    id: 'net',
    title: { fr: 'Le filet de Mina', en: 'Mina’s Net' },
    giver: 'mina',
    available: () => save.main >= STEP.meetHeron,
    offer: {
      fr: [
        'Mon filet ! Je l’ai laissé sécher sur la rive nord du lac, et les grenouilles d’encre se sont installées dessus comme sur un trône.',
        'Sans filet, pas de poisson ; sans poisson, grand-mère va encore me faire manger du riz noir. Tu pourrais… ?',
      ],
      en: [
        'My net! I left it to dry on the lake’s north shore, and the ink frogs settled on it like on a throne.',
        'No net, no fish; no fish, and grandmother will make me eat black rice again. Could you…?',
      ],
    },
    accept: { fr: 'Je te le rapporte.', en: 'I’ll bring it back.' },
    later: { fr: 'Pas maintenant, Mina.', en: 'Not now, Mina.' },
    stages: [
      { goal: { fr: 'Reprends le filet aux grenouilles, sur la rive nord du lac', en: 'Take the net back from the frogs, on the lake’s north shore' }, kind: 'find', thing: 'net', at: { room: 'terraces', x: 147.5, y: 44.4 } },
      {
        goal: { fr: 'Rends son filet à Mina', en: 'Give Mina her net' },
        kind: 'talk', npc: 'mina',
        say: {
          fr: ['Mon filet ! Même les nœuds de grand-mère ont tenu.', 'Tiens, c’est la plus belle chose que j’aie jamais pêchée. Non, pas un poisson. Regarde.'],
          en: ['My net! Even grandmother’s knots held.', 'Here, it is the most beautiful thing I ever fished out. No, not a fish. Look.'],
        },
      },
    ],
    reward: () => ({ xp: 180, rarity: 'rare' }),
  },
  {
    id: 'beads',
    title: { fr: 'Le chapelet de Frère Gong', en: 'Brother Gong’s Beads' },
    giver: 'gong',
    available: () => save.main >= STEP.meetHeron,
    offer: {
      fr: [
        'Je suis le dernier moine dehors. La nuit de l’orage, j’étais descendu chercher de l’huile. Quand je suis remonté, les portes étaient scellées, et les spectres de brume tournaient autour de la pagode.',
        'L’un d’eux m’a arraché mon chapelet. Sans lui, je ne peux pas réciter la prière qui ouvre les portes. Chasse les spectres qui rôdent autour du parvis : il tombera bien de l’un d’eux.',
      ],
      en: [
        'I am the last monk outside. On the night of the storm I had gone down for oil. When I came back up, the doors were sealed and the mist wraiths were circling the pagoda.',
        'One of them tore away my prayer beads. Without them I cannot recite the prayer that opens the doors. Hunt the wraiths prowling around the court: they will fall from one of them.',
      ],
    },
    accept: { fr: 'Je chasserai les spectres.', en: 'I will hunt the wraiths.' },
    later: { fr: 'Plus tard, mon frère.', en: 'Later, brother.' },
    stages: [
      { goal: { fr: 'Chasse les spectres de brume autour de la pagode', en: 'Hunt the mist wraiths around the pagoda' }, kind: 'kill', label: 'wraith', count: 4 },
      {
        goal: { fr: 'Rapporte le chapelet à Frère Gong', en: 'Bring the beads to Brother Gong' },
        kind: 'talk', npc: 'gong',
        say: {
          fr: ['Mon chapelet ! Cent huit grains, et pas un ne manque.', 'Quand le moment viendra, je réciterai la prière. Mais les portes ne s’ouvriront que pour celui qui aura rendu l’eau aux terrasses. Ainsi l’ont voulu les moines.'],
          en: ['My beads! One hundred and eight, and not one missing.', 'When the time comes, I will recite the prayer. But the doors will open only for one who has given the water back to the terraces. So the monks decided.'],
        },
      },
    ],
    reward: () => ({ xp: 200, rarity: 'magic' }),
  },
  {
    id: 'jadeToad',
    title: { fr: 'Le crapaud de fortune', en: 'The Fortune Toad' },
    giver: 'lin',
    available: () => save.main >= STEP.sluices,
    offer: {
      fr: [
        'Mon crapaud de fortune ! Un petit crapaud de jade à trois pattes, une pièce dans la bouche. Il gardait ma caisse depuis que j’ai ouvert boutique.',
        'Cette nuit, une lanterne de pierre est entrée chez moi. Oui, une lanterne. Elle est repartie avec mon crapaud, en riant. Des tanuki, j’en mettrais ma main au feu.',
        'Leur terrier est dans les bois de l’est, au-delà du lac. Méfie-toi des lanternes qui ont une feuille sur le toit.',
      ],
      en: [
        'My fortune toad! A little three-legged jade toad, a coin in its mouth. It has guarded my till since I opened shop.',
        'Last night a stone lantern walked into my shop. Yes, a lantern. It left with my toad, laughing. Tanuki, I would bet my hand on it.',
        'Their den is in the east woods, beyond the lake. Beware of lanterns with a leaf on the roof.',
      ],
    },
    accept: { fr: 'Je te rapporte ton crapaud.', en: 'I’ll bring your toad back.' },
    later: { fr: 'Plus tard, Lin.', en: 'Later, Lin.' },
    stages: [
      { goal: { fr: 'Chasse les tanuki de leur terrier, dans les bois de l’est', en: 'Drive the tanuki out of their den, in the east woods' }, kind: 'kill', label: 'tanuki', count: 4 },
      { goal: { fr: 'Fouille le terrier : le crapaud de jade y est caché', en: 'Search the den: the jade toad is hidden there' }, kind: 'find', thing: 'jadeToad', at: { room: 'terraces', x: 191.5, y: 57.8 } },
      {
        goal: { fr: 'Rends son crapaud de fortune à Lin', en: 'Give Lin back her fortune toad' },
        kind: 'talk', npc: 'lin',
        say: {
          fr: ['Le voilà ! Et il a encore sa pièce. Les tanuki n’ont même pas su la lui prendre, ces amateurs.', 'Tiens, prends ça. Et reviens quand tu veux : pour toi, la boutique est toujours ouverte.'],
          en: ['There it is! And it still has its coin. The tanuki could not even get it off him, the amateurs.', 'Here, take this. And come back whenever you like: for you, the shop is always open.'],
        },
      },
    ],
    reward: () => ({ xp: 260, rarity: 'rare', perk: ['coins', 120, { fr: '+120 pièces : Lin ne compte pas quand elle est contente.', en: '+120 coins: Lin does not count when she is happy.' }] }),
  },
  {
    id: 'lanterns',
    title: { fr: 'Les lanternes de l’escalier', en: 'The Lanterns of the Stair' },
    giver: 'gong',
    available: () => !!save.quests.beads?.done,
    offer: {
      fr: [
        'Les quatre lanternes de pierre, le long de l’escalier de la pagode… Elles brûlaient jour et nuit, pour que les morts trouvent le chemin du ciel.',
        'Depuis l’orage, elles sont froides, et les spectres errent sur les marches. Les moines les allumaient avec la foudre d’or du maître. Tu as l’or, n’est-ce pas ?',
        'Allume-les toutes les quatre. Mais prends garde : la lumière réveille ce qui dort sur l’escalier.',
      ],
      en: [
        'The four stone lanterns along the pagoda stair… They burned day and night, so the dead could find the way to the sky.',
        'Since the storm they are cold, and the wraiths wander the steps. The monks lit them with the master’s golden lightning. You have the gold, don’t you?',
        'Light all four. But beware: the light wakes what sleeps on the stair.',
      ],
    },
    accept: { fr: 'Je les allumerai.', en: 'I will light them.' },
    later: { fr: 'Plus tard, mon frère.', en: 'Later, brother.' },
    stages: [
      { goal: { fr: 'Allume les quatre lanternes de l’escalier avec la foudre d’or', en: 'Light the four stair lanterns with golden lightning' }, kind: 'event', event: 'stairLamp', count: 4, distinct: true },
      {
        goal: { fr: 'Retourne voir Frère Gong', en: 'Return to Brother Gong' },
        kind: 'talk', npc: 'gong',
        say: {
          fr: ['Je les vois d’ici… Quatre petites lunes sur l’escalier. Les morts vont pouvoir rentrer chez eux.', 'Le maître disait qu’un trait bien placé vaut mieux que cent traits rapides. Garde ceci en mémoire — et ce point de sagesse avec.'],
          en: ['I can see them from here… Four little moons on the stair. The dead will be able to go home.', 'The master said one well-placed stroke is worth a hundred quick ones. Keep that in mind — and this point of wisdom with it.'],
        },
      },
    ],
    reward: () => ({ xp: 240, perk: ['points', 1, { fr: 'Un point de trait en plus dans l’Arbre des traits.', en: 'One extra point in the Tree of Strokes.' }] }),
  },
];
