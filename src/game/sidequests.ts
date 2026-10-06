/** Act I side quests: people of the hamlet and the plain, and what the storm took from them. */
import type { QuestDef } from './questbook';
import { save } from './progression';
import { STEP } from './quests';

const hasColour = () => save.inks.some((i) => i !== 'vermilion');

export const NPC_NAMES = {
  prune: { fr: 'La vieille Prune', en: 'Old Plum' },
  ghost: { fr: 'Le meunier', en: 'The miller' },
  lotus: { fr: 'Sœur Lotus', en: 'Sister Lotus' },
  kaze: { fr: 'Kaze, le peintre errant', en: 'Kaze, the wandering painter' },
};

export const SIDE_QUESTS: QuestDef[] = [
  // ---------- Pip's kite ----------
  {
    id: 'kite',
    title: { fr: 'Le cerf-volant de Pip', en: 'Pip’s Kite' },
    giver: 'pip',
    available: () => save.main >= STEP.orchard,
    offer: {
      fr: [
        'Mon cerf-volant ! Le rouge, avec la queue en papier de riz ! L’orage me l’a arraché des mains.',
        'Il est parti vers le nord, au-dessus du verger. Grand-père Tilleul l’a peut-être vu passer. Tu veux bien le chercher ? S’il te plaît ?',
      ],
      en: [
        'My kite! The red one, with the rice-paper tail! The storm tore it out of my hands.',
        'It flew north, over the orchard. Grandpa Linden may have seen it go by. Will you look for it? Please?',
      ],
    },
    accept: { fr: 'Je le retrouverai.', en: 'I’ll find it.' },
    later: { fr: 'Plus tard, Pip.', en: 'Later, Pip.' },
    stages: [
      {
        goal: { fr: 'Demande au vieux Tilleul s’il a vu le cerf-volant', en: 'Ask Old Linden if he saw the kite' },
        kind: 'talk', npc: 'linden',
        say: {
          fr: ['Un oiseau rouge, la nuit de l’orage ? Oui… Il tournoyait au-dessus des pruniers, au nord du verger.', 'Là où l’épouvantail garde le champ. Méfie-toi : depuis l’orage, les corbeaux lui obéissent.'],
          en: ['A red bird, the night of the storm? Yes… It wheeled over the plum trees, north of the orchard.', 'Where the scarecrow keeps the field. Careful: since the storm, the crows obey it.'],
        },
      },
      {
        goal: { fr: 'Cherche le cerf-volant près du champ de l’épouvantail', en: 'Look for the kite near the scarecrow’s field' },
        kind: 'find', thing: 'kite', at: { room: 'overworld', x: 55.4, y: 79.5 },
      },
      {
        goal: { fr: 'Le cerf-volant est déchiré : montre-le à Garance', en: 'The kite is torn: show it to Madder' },
        kind: 'talk', npc: 'madder',
        say: {
          fr: ['Pauvre Pip, il l’adore. Je peux le recoudre… mais il me faut de la soie, et les vers du verger sont morts dans l’orage.', 'Les Mites d’encre ont mangé les cocons. Chasse-en quelques-unes : ce qu’elles ont avalé se dépose en fils quand elles se dissolvent.'],
          en: ['Poor Pip, he loves it. I can mend it… but I need silk, and the orchard’s worms died in the storm.', 'The ink Mites ate the cocoons. Hunt a few: what they swallowed settles into threads when they dissolve.'],
        },
      },
      {
        goal: { fr: 'Chasse des Mites pour récupérer de la soie', en: 'Hunt Mites to recover silk' },
        kind: 'kill', label: 'mite', count: 5,
      },
      {
        goal: { fr: 'Rapporte la soie à Garance', en: 'Bring the silk to Madder' },
        kind: 'talk', npc: 'madder',
        say: {
          fr: ['Voilà. Un point de vermillon au nœud de la queue : il volera plus haut qu’avant. Va le lui rendre.'],
          en: ['There. A stitch of vermilion at the tail’s knot: it will fly higher than before. Go and give it back.'],
        },
      },
      {
        goal: { fr: 'Rends son cerf-volant à Pip', en: 'Give Pip his kite back' },
        kind: 'talk', npc: 'pip',
        say: {
          fr: ['Mon cerf-volant ! Il est encore plus beau !', 'Tiens, prends mon grelot. Il tinte quand le vent tourne. Le maître disait que le vent tourne quand quelque chose d’important arrive.'],
          en: ['My kite! It’s even more beautiful!', 'Here, take my bell. It rings when the wind turns. The master said the wind turns when something important is coming.'],
        },
      },
    ],
    reward: () => ({ xp: 90, item: 'pipBell' }),
  },

  // ---------- Madder's sky dye ----------
  {
    id: 'dye',
    title: { fr: 'La teinture du ciel', en: 'The Sky Dye' },
    giver: 'madder',
    available: () => hasColour() && save.madder,
    offer: {
      fr: [
        'Tu sais ce que je rêve de faire, depuis que je suis petite ? La teinture du ciel. Celle que le maître portait les jours de fête.',
        'Il faut trois choses : la racine de garance qui pousse au bord de l’étang au nord du hameau, une noix de galle des pruniers de la plaine — les grosses bêtes rôdent autour —, et l’eau de la source qui coule au fond de la grotte aux lucioles.',
        'Si tu me les rapportes, je teindrai ta réserve de pigment. Elle en tiendra davantage, pour toujours.',
      ],
      en: [
        'Do you know what I have dreamt of making since I was little? The sky dye. The one the master wore on feast days.',
        'It takes three things: madder root from the edge of the pond north of the hamlet, an oak gall from the plum trees of the plain — big beasts prowl around them — and water from the spring at the bottom of the Firefly Cave.',
        'Bring them to me and I will dye your pigment reserve. It will hold more, forever.',
      ],
    },
    accept: { fr: 'J’y vais.', en: 'I’m on my way.' },
    later: { fr: 'Pas maintenant.', en: 'Not now.' },
    stages: [
      { goal: { fr: 'Cueille la racine de garance au bord de l’étang, au nord du hameau', en: 'Pick madder root at the pond north of the hamlet' }, kind: 'find', thing: 'root', at: { room: 'overworld', x: 34.5, y: 73.6 } },
      { goal: { fr: 'Trouve une noix de galle dans la plaine (gardée)', en: 'Find an oak gall on the plain (guarded)' }, kind: 'find', thing: 'gall', at: { room: 'overworld', x: 100.5, y: 66.5 } },
      { goal: { fr: 'Puise l’eau de la source, au fond de la grotte (étage 1)', en: 'Draw water from the spring deep in the cave (floor 1)' }, kind: 'find', thing: 'spring', at: { room: 'cave1', spot: 'deep' } },
      {
        goal: { fr: 'Rapporte tout à Garance', en: 'Bring everything to Madder' },
        kind: 'talk', npc: 'madder',
        say: {
          fr: ['La racine pour le rouge du fond, la galle pour fixer, l’eau froide pour le bleu…', 'Regarde. Le bleu du matin, quand la brume se lève. Donne-moi tes pots : voilà, ils en tiendront plus.'],
          en: ['The root for the deep red, the gall to fix it, the cold water for the blue…', 'Look. The blue of morning when the mist lifts. Give me your pots: there, they will hold more.'],
        },
      },
    ],
    reward: () => ({ xp: 140, perk: ['pigment', 3, { fr: 'Ta réserve de pigment grandit de 3, pour toujours.', en: 'Your pigment reserve grows by 3, forever.' }] }),
  },

  // ---------- Elm's brother ----------
  {
    id: 'brother',
    title: { fr: 'Le frère d’Orme', en: 'Elm’s Brother' },
    giver: 'elm',
    available: () => save.main >= STEP.findCave,
    offer: {
      fr: [
        'Tu descends dans la grotte, alors.',
        'Mon frère cadet, Saule-Noir, y est descendu il y a dix hivers. Il voulait voir les lucioles bleues, celles dont parlaient les anciens. Il n’est jamais remonté.',
        'Je ne te demande pas de le ramener. Juste… s’il reste quelque chose. Son casque avait une plume rouge.',
      ],
      en: [
        'So you are going down into the cave.',
        'My younger brother, Black Willow, went down there ten winters ago. He wanted to see the blue fireflies the elders spoke of. He never came back up.',
        'I am not asking you to bring him home. Just… if anything is left. His helmet had a red feather.',
      ],
    },
    accept: { fr: 'Je chercherai.', en: 'I will look.' },
    later: { fr: 'Je ne peux rien promettre.', en: 'I can’t promise anything.' },
    stages: [
      {
        goal: { fr: 'Cherche le casque à plume rouge, au second étage de la grotte', en: 'Look for the red-feathered helmet on the cave’s second floor' },
        kind: 'find', thing: 'helmet', at: { room: 'cave2', spot: 'mid' },
        read: {
          name: { fr: 'Une lettre, pliée dans le casque', en: 'A letter, folded inside the helmet' },
          text: {
            fr: ['« Grand frère. Je les ai vues. Elles ne sont pas bleues, elles sont de toutes les couleurs, et elles chantent.', 'La tache me tient la jambe. Je n’ai pas peur. Dis à mère que les lucioles sont plus belles que dans les histoires. — S. »'],
            en: ['“Big brother. I saw them. They are not blue, they are every colour, and they sing.', 'The blot has my leg. I am not afraid. Tell mother the fireflies are more beautiful than in the stories. — B.”'],
          },
        },
      },
      {
        goal: { fr: 'Rapporte le casque à Orme', en: 'Bring the helmet to Elm' },
        kind: 'talk', npc: 'elm',
        say: {
          fr: ['… C’est le sien. La plume a perdu sa couleur, mais c’est le sien.', 'Il y avait autre chose ? Dis-moi.'],
          en: ['… It is his. The feather has lost its colour, but it is his.', 'Was there anything else? Tell me.'],
        },
        choices: [
          { label: { fr: 'Lui donner la lettre', en: 'Give him the letter' }, c: 'truth' },
          { label: { fr: 'Garder la lettre, pour lui épargner la douleur', en: 'Keep the letter, to spare him the pain' }, c: 'spare' },
        ],
      },
      {
        goal: { fr: 'Parle encore à Orme', en: 'Speak to Elm again' },
        kind: 'talk', npc: 'elm',
        say: (_n, q) => q.c === 'truth'
          ? {
            fr: ['« Elles chantent. » Il a toujours été le plus brave de nous deux.', 'Prends sa lance. Elle était trop lourde pour lui, il disait qu’il grandirait. Toi, tu as déjà grandi.'],
            en: ['“They sing.” He was always the braver of us two.', 'Take his spear. It was too heavy for him; he said he would grow into it. You already have.'],
          }
          : {
            fr: ['Tu as raison. Mieux vaut que je me souvienne de lui riant au bord de la rivière.', 'Garde la plume. Elle te portera chance là où il n’a pas eu la sienne.'],
            en: ['You are right. Better that I remember him laughing by the river.', 'Keep the feather. May it bring you the luck he did not have.'],
          },
      },
    ],
    reward: (q) => (q.c === 'truth' ? { xp: 170, item: 'spear' } : { xp: 170, item: 'feather' }),
  },

  // ---------- the miller's ghost ----------
  {
    id: 'miller',
    title: { fr: 'Le fantôme du moulin', en: 'The Ghost of the Mill' },
    giver: 'ghost',
    available: () => save.main >= STEP.orchard,
    offer: {
      fr: [
        '… Ma meule… elle ne tourne plus…',
        'Et ma petite… Où est ma petite Prune ? L’eau est montée si vite, cette nuit-là… Je l’ai tenue au-dessus de l’eau… et après…',
        'Après, je ne sais plus.',
      ],
      en: [
        '… My millstone… it does not turn any more…',
        'And my little one… Where is my little Plum? The water rose so fast that night… I held her above the water… and then…',
        'Then, I don’t remember.',
      ],
    },
    accept: { fr: 'Je vais découvrir ce qui s’est passé.', en: 'I will find out what happened.' },
    later: { fr: 'Reculer doucement.', en: 'Step back slowly.' },
    stages: [
      {
        goal: { fr: 'Demande à l’Aïeule Saule qui était le meunier', en: 'Ask Grandmother Willow who the miller was' },
        kind: 'talk', npc: 'willow',
        say: {
          fr: ['Le meunier ? Il y a soixante ans, la grande crue a emporté le moulin de l’étang. Il a tenu sa fille au-dessus de l’eau jusqu’au matin, puis il a lâché prise.', 'La petite a survécu. C’est la vieille Prune, qui vit près du puits. Elle n’en parle jamais.'],
          en: ['The miller? Sixty years ago the great flood took the pond mill. He held his daughter above the water until morning, then he let go.', 'The little one lived. She is Old Plum, who lives by the well. She never speaks of it.'],
        },
      },
      {
        goal: { fr: 'Parle à la vieille Prune, près du puits', en: 'Speak to Old Plum, near the well' },
        kind: 'talk', npc: 'prune',
        say: {
          fr: ['Mon père… Tu l’as vu ? Il est encore là-bas ?', 'Il m’avait sculpté une poupée dans du bois de prunier. Je l’ai lâchée dans l’eau, cette nuit-là. Elle doit être quelque part dans les roseaux, près des ruines du moulin.'],
          en: ['My father… You saw him? He is still there?', 'He carved me a doll from plum wood. I let go of it in the water that night. It must be somewhere in the reeds, near the ruins of the mill.'],
        },
      },
      { goal: { fr: 'Cherche la poupée près des ruines du moulin', en: 'Look for the doll near the ruins of the mill' }, kind: 'find', thing: 'doll', at: { room: 'overworld', x: 61.5, y: 100.5 } },
      {
        goal: { fr: 'Donne la poupée au meunier… ou à sa fille', en: 'Give the doll to the miller… or to his daughter' },
        kind: 'talk', npc: ['ghost', 'prune'],
        say: (npc) => npc === 'ghost'
          ? {
            fr: ['… La poupée de Prune. Je me souviens. Je l’ai tenue au-dessus de l’eau… et le matin est venu. Elle a vécu.', 'Elle a vécu… Alors la meule peut s’arrêter. Prends ce sceau. Il a moulu le grain de tout le hameau.'],
            en: ['… Plum’s doll. I remember. I held her above the water… and morning came. She lived.', 'She lived… Then the millstone may stop. Take this seal. It ground the grain of the whole hamlet.'],
          }
          : {
            fr: ['Ma poupée… Elle sent encore la rivière.', 'Va le voir. Dis-lui que j’ai vécu. Que j’ai eu trois fils et sept petits-enfants. Dis-lui qu’il peut lâcher, maintenant.'],
            en: ['My doll… It still smells of the river.', 'Go to him. Tell him I lived. That I had three sons and seven grandchildren. Tell him he can let go now.'],
          },
        next: (q, npc) => { q.c = npc; return npc === 'ghost' ? 'end' : 4; },
      },
      {
        goal: { fr: 'Porte au meunier le message de sa fille', en: 'Bring the miller his daughter’s message' },
        kind: 'talk', npc: 'ghost',
        say: {
          fr: ['… Trois fils. Sept petits-enfants.', 'Merci, petit trait. La meule peut s’arrêter. Dis-lui… dis-lui que je l’ai tenue jusqu’au matin.'],
          en: ['… Three sons. Seven grandchildren.', 'Thank you, little stroke. The millstone may stop. Tell her… tell her I held her until morning.'],
        },
      },
    ],
    reward: (q) => (q.c === 'ghost'
      ? { xp: 160, item: 'millstone' }
      : { xp: 220, perk: ['life', 1, { fr: 'La bénédiction de Prune : +1 de vie, pour toujours.', en: 'Plum’s blessing: +1 life, forever.' }] }),
  },

  // ---------- Sister Lotus's lamps ----------
  {
    id: 'lamps',
    title: { fr: 'Les lampes des sanctuaires', en: 'The Shrine Lamps' },
    giver: 'lotus',
    available: () => save.brambles,
    offer: {
      fr: [
        'Les lampes des sanctuaires s’éteignent l’une après l’autre. Sans elles, les voyageurs se perdent dans la brume, et les taches s’enhardissent.',
        'Tu portes le vermillon. Touche les pierres à encre de trois sanctuaires : ta couleur réveillera leur flamme.',
      ],
      en: [
        'The shrine lamps are going out one after another. Without them, travellers get lost in the mist and the blots grow bold.',
        'You carry vermilion. Touch the inkstones of three shrines: your colour will wake their flame.',
      ],
    },
    accept: { fr: 'Je rallumerai les lampes.', en: 'I will relight the lamps.' },
    later: { fr: 'Une autre fois, ma sœur.', en: 'Another time, sister.' },
    stages: [
      { goal: { fr: 'Touche la pierre à encre de trois sanctuaires', en: 'Touch the inkstone of three shrines' }, kind: 'event', event: 'shrine', count: 3, distinct: true },
      {
        goal: { fr: 'Retourne voir Sœur Lotus', en: 'Return to Sister Lotus' },
        kind: 'talk', npc: 'lotus',
        say: {
          fr: ['Elles brûlent. Mais la flamme a faim : sans huile, elle mourra avant l’hiver.', 'Les prêtres du temple englouti gardaient une huile qui ne s’épuise pas. S’il en reste une jarre, elle est dans les salles du premier étage.'],
          en: ['They are burning. But the flame is hungry: without oil it will die before winter.', 'The priests of the sunken temple kept an oil that never runs out. If a jar remains, it is in the halls of the first floor.'],
        },
      },
      { goal: { fr: 'Trouve l’huile sacrée dans le temple englouti (étage 1)', en: 'Find the sacred oil in the sunken temple (floor 1)' }, kind: 'find', thing: 'oil', at: { room: 'temple1', spot: 'deep' } },
      {
        goal: { fr: 'Rapporte l’huile à Sœur Lotus', en: 'Bring the oil to Sister Lotus' },
        kind: 'talk', npc: 'lotus',
        say: {
          fr: ['L’huile des prêtres… Regarde comme la flamme se redresse.', 'Désormais, chaque sanctuaire te bénira : quand tu toucheras sa pierre, ton trait frappera plus fort, un moment.'],
          en: ['The priests’ oil… See how the flame stands up.', 'From now on, every shrine will bless you: when you touch its stone, your stroke will strike harder for a while.'],
        },
      },
    ],
    reward: () => ({ xp: 200, perk: ['lamps', 1, { fr: 'Les sanctuaires te bénissent : +20 % de dégâts pendant une minute.', en: 'The shrines bless you: +20% damage for a minute.' }] }),
  },

  // ---------- the wandering painter ----------
  {
    id: 'kaze',
    title: { fr: 'Le défi du peintre errant', en: 'The Wandering Painter’s Challenge' },
    giver: 'kaze',
    available: () => save.brambles,
    offer: {
      fr: [
        'Alors c’est toi. Le dernier trait.',
        'J’ai été l’élève du maître, moi aussi. Dix ans à broyer son encre. Un matin, il m’a renvoyé : mon trait était « trop pressé ».',
        'Et c’est toi qu’il a choisi ? Prouve-moi que tu le mérites plus que moi.',
      ],
      en: [
        'So it’s you. The last stroke.',
        'I was the master’s pupil too. Ten years grinding his ink. One morning he sent me away: my stroke was “too hasty”.',
        'And he chose you? Prove to me you deserve it more than I did.',
      ],
    },
    accept: { fr: 'Relever le défi.', en: 'Take the challenge.' },
    later: { fr: 'Je n’ai rien à te prouver.', en: 'I have nothing to prove to you.' },
    stages: [
      { goal: { fr: 'Referme un ensō autour de quatre ennemis à la fois', en: 'Close an ensō around four foes at once' }, kind: 'event', event: 'enso4', count: 1 },
      { goal: { fr: 'Enchaîne quinze coups sans être touché', en: 'Chain fifteen hits without being touched' }, kind: 'event', event: 'combo15', count: 1 },
      {
        goal: { fr: 'Retourne voir Kaze', en: 'Return to Kaze' },
        kind: 'talk', npc: 'kaze',
        say: {
          fr: ['… Ton trait ne se presse pas. Il attend, puis il est déjà passé.', 'Le maître est quelque part au cœur de l’encre. Je l’ai cherché seul pendant des années. Et maintenant ?'],
          en: ['… Your stroke doesn’t hurry. It waits, and then it has already passed.', 'The master is somewhere at the heart of the ink. I searched for him alone for years. And now?'],
        },
        choices: [
          { label: { fr: '« Il avait raison sur toi. »', en: '“He was right about you.”' }, c: 'proud' },
          { label: { fr: '« Cherchons-le ensemble. »', en: '“Let’s look for him together.”' }, c: 'ally' },
        ],
      },
      {
        goal: { fr: 'Écoute la réponse de Kaze', en: 'Hear Kaze’s answer' },
        kind: 'talk', npc: 'kaze',
        say: (_n, q) => q.c === 'proud'
          ? {
            fr: ['Peut-être. Prends mon pinceau, alors. Moi, je n’en ai plus besoin pour ce que je vais faire.'],
            en: ['Maybe. Take my brush, then. I won’t need it for what I am going to do.'],
          }
          : {
            fr: ['Ensemble…', 'Alors écoute ce qu’il m’a appris avant de me renvoyer : « Le trait juste n’est pas le plus rapide. C’est celui qu’on n’a plus besoin de faire. »', 'Je partirai devant, vers l’est. On se reverra au col.'],
            en: ['Together…', 'Then hear what he taught me before he sent me away: “The right stroke is not the fastest. It is the one you no longer need to make.”', 'I will go ahead, east. We will meet again at the pass.'],
          },
      },
    ],
    reward: (q) => (q.c === 'proud'
      ? { xp: 200, item: 'kazeBrush' }
      : { xp: 260, perk: ['points', 1, { fr: 'Un point de compétence de plus, appris de Kaze.', en: 'One more skill point, learnt from Kaze.' }] }),
  },
];
