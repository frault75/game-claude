/** Act III side quests: the librarian's torn sutras, the yak herder's lost peace, the painter's white, the novice's bells. */
import type { QuestDef } from './questbook';
import { save } from './progression';
import { STEP } from './quests';
import { P3_VISTAS, P3_GRELOTS } from '../world/peaks';

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
  {
    id: 'suzu',
    title: { fr: 'Le blanc de Suzu', en: 'Suzu’s White' },
    giver: 'suzu',
    available: () => save.main >= STEP.bells,
    offer: {
      fr: [
        'Trois ans que je suis là-haut, et je n’ai toujours rien peint. Chaque fois que je pose le pinceau sur la neige, elle cesse d’être de la neige. Elle devient de l’encre.',
        'Mère Neige dit que le blanc ne se peint pas : il se laisse. Mais comment est-ce qu’on laisse quelque chose ?',
        'Il y a trois endroits où je m’asseyais pour regarder : au bord du lac gelé, sur les pentes du vent, à l’orée de la forêt de givre. Une pierre plate à chacun. Va t’y asseoir à ma place, et trace un cercle autour de la pierre. Un cercle laisse le blanc au milieu. C’est peut-être ça.',
      ],
      en: [
        'Three years I have been up here, and I still have not painted anything. Every time I put the brush on the snow, it stops being snow. It becomes ink.',
        'Mother Snow says white is not painted: it is left. But how does one leave something?',
        'There are three places where I used to sit and look: by the frozen lake, on the windswept slopes, at the edge of the frost forest. A flat stone at each. Go and sit there in my place, and draw a circle round the stone. A circle leaves the white in the middle. Perhaps that is it.',
      ],
    },
    accept: { fr: 'J’irai tracer tes cercles.', en: 'I will go and draw your circles.' },
    later: { fr: 'Plus tard, Suzu.', en: 'Later, Suzu.' },
    stages: [
      {
        goal: { fr: 'Trace un cercle autour des trois pierres de Suzu (lac, pentes, forêt)', en: 'Draw a circle round Suzu’s three stones (lake, slopes, forest)' },
        kind: 'event', event: 'vista', distinct: true, count: 3,
        spots: P3_VISTAS.map(([x, y]) => ({ room: 'peaks', x, y })),
      },
      {
        goal: { fr: 'Retourne voir Suzu', en: 'Return to Suzu' },
        kind: 'talk', npc: 'suzu',
        say: {
          fr: ['Tu les as tracés ? … Alors c’est ça. Le cercle ne peint pas le blanc. Il le garde.', 'Regarde : j’ai enfin peint quelque chose. Trois cercles vides. C’est le plus beau tableau que j’aie jamais fait — et il n’y a rien dedans.', 'Prends ceci. Je n’en ai plus besoin : je sais maintenant ce que je cherchais.'],
          en: ['You drew them? … Then that is it. The circle does not paint the white. It keeps it.', 'Look: I have finally painted something. Three empty circles. It is the most beautiful painting I have ever made — and there is nothing in it.', 'Take this. I do not need it any more: now I know what I was looking for.'],
        },
      },
    ],
    reward: () => ({ xp: 420, rarity: 'rare' }),
  },
  {
    id: 'grelots',
    title: { fr: 'Les grelots de Pema', en: 'Pema’s Bells' },
    giver: 'pema',
    available: () => save.main >= STEP.bells,
    offer: {
      fr: [
        'Chut ! Ne le dis pas à Mère Neige. J’ai perdu les grelots du grand portail. Les trois.',
        'Je voulais juste voir si les renards aimaient la musique… Ils l’aiment trop. Ils les ont emportés. Un dans la forêt, un sur les pentes… et le dernier, je l’ai entendu tinter du côté de la vallée effacée.',
        'Si tu me les rapportes, je te montrerai comment on fait sonner trois grelots d’une seule main. C’est un secret de novice.',
      ],
      en: [
        'Shh! Don’t tell Mother Snow. I lost the bells of the great gate. All three.',
        'I only wanted to see whether the foxes liked music… They like it too much. They carried them off. One into the forest, one onto the slopes… and the last one I heard tinkling over by the erased valley.',
        'If you bring them back, I will show you how to ring three bells with one hand. It is a novice’s secret.',
      ],
    },
    accept: { fr: 'Je retrouverai tes grelots.', en: 'I will find your bells.' },
    later: { fr: 'Plus tard, Pema.', en: 'Later, Pema.' },
    stages: [
      {
        goal: { fr: 'Retrouve le grelot emporté dans la forêt', en: 'Find the bell carried into the forest' }, kind: 'find', thing: 'grelot', at: { room: 'peaks', x: P3_GRELOTS[0][0], y: P3_GRELOTS[0][1] },
        read: { name: { fr: 'Grelot du portail', en: 'Gate bell' }, text: { fr: ['Un petit grelot de bronze, dans la neige entre deux pins. Il tinte comme un rire.'], en: ['A little bronze bell in the snow between two pines. It tinkles like a laugh.'] } },
      },
      {
        goal: { fr: 'Retrouve le grelot perdu sur les pentes', en: 'Find the bell lost on the slopes' }, kind: 'find', thing: 'grelot', at: { room: 'peaks', x: P3_GRELOTS[1][0], y: P3_GRELOTS[1][1] },
        read: { name: { fr: 'Grelot du portail', en: 'Gate bell' }, text: { fr: ['Le deuxième grelot, dans une trace de renard. Il sent un peu le renard.'], en: ['The second bell, in a fox track. It smells a little of fox.'] } },
      },
      {
        goal: { fr: 'Retrouve le grelot au bord de la vallée effacée', en: 'Find the bell at the edge of the erased valley' }, kind: 'find', thing: 'grelot', at: { room: 'peaks', x: P3_GRELOTS[2][0], y: P3_GRELOTS[2][1] },
        read: { name: { fr: 'Grelot du portail', en: 'Gate bell' }, text: { fr: ['Le troisième grelot, au bord d’un trou dans le papier. Il ne tinte presque plus : le blanc lui a mangé sa voix.'], en: ['The third bell, at the edge of a hole in the paper. It barely tinkles: the white has eaten its voice.'] } },
      },
      {
        goal: { fr: 'Rapporte les trois grelots à Pema', en: 'Bring the three bells to Pema' },
        kind: 'talk', npc: 'pema',
        say: {
          fr: ['Les trois ! … Le dernier est tout pâle. Il a eu peur, le pauvre. Ça lui reviendra.', 'Regarde : une main, trois grelots, un seul geste. Voilà. Maintenant tu es un peu novice, toi aussi.', 'Et ça, c’est pour toi. Je l’ai trouvé sous mon lit. Ne demande pas.'],
          en: ['All three! … The last one is all pale. It was frightened, poor thing. It will come back.', 'Look: one hand, three bells, a single gesture. There. Now you are a bit of a novice too.', 'And this is for you. I found it under my bed. Don’t ask.'],
        },
      },
    ],
    reward: () => ({ xp: 380, rarity: 'rare', perk: ['coins', 40, { fr: '40 pièces (les économies de Pema).', en: '40 coins (Pema’s savings).' }] }),
  },
];
