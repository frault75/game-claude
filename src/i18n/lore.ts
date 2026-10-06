/** The story of Act I: who says what, the master's notebook, quest titles. French and English. */
import { lang } from './index';

export interface Tr { fr: string; en: string }
export interface TrList { fr: string[]; en: string[] }

export const L = (x: Tr): string => x[lang];
export const LL = (x: TrList): string[] => x[lang];

export const NAMES = {
  willow: { fr: 'Aïeule Saule', en: 'Grandmother Willow' },
  madder: { fr: 'Garance, la teinturière', en: 'Madder, the dyer' },
  elm: { fr: 'Orme, le garde', en: 'Elm, the guard' },
  pip: { fr: 'Pip', en: 'Pip' },
  linden: { fr: 'Le vieux Tilleul', en: 'Old Linden' },
  stele: { fr: 'Stèle', en: 'Stele' },
  mural: { fr: 'Fresque', en: 'Mural' },
};

/** Grandmother Willow, by main-quest step. */
export const WILLOW: Record<number, TrList> = {
  0: {
    fr: [
      'Te voilà enfin, petit trait. Je t’ai vu tomber du ciel avec la pluie noire.',
      'Je suis l’Aïeule Saule. Le maître m’a peinte la première, sous ce saule, bien avant les toits et les gens.',
      'La nuit de l’orage, son encrier s’est renversé. Ses couleurs se sont enfuies dans la peinture, et des bêtes d’encre sont nées des taches.',
      'Regarde le verger, à l’est : les taches y grouillent déjà. Va purifier leurs camps, puis reviens me voir.',
    ],
    en: [
      'There you are at last, little stroke. I saw you fall from the sky with the black rain.',
      'I am Grandmother Willow. The master painted me first, under this willow, long before the roofs and the people.',
      'On the night of the storm, his inkwell spilled. His colours fled into the painting, and ink beasts were born from the blots.',
      'Look at the orchard, to the east: the blots are already swarming there. Go and cleanse their camps, then come back to me.',
    ],
  },
  1: {
    fr: ['Les camps du verger sont à l’est du hameau. Frappe les taches du pinceau, et trace des boucles autour d’elles.'],
    en: ['The orchard camps lie east of the hamlet. Strike the blots with your brush, and draw loops around them.'],
  },
  2: {
    fr: [
      'Le verger respire. Tu as la main sûre, pour un trait si jeune.',
      'Écoute. Au nord, il y a la Grotte aux lucioles. Les enfants allaient y voir briller les insectes, les soirs d’été.',
      'Depuis l’orage, il n’en sort plus que de l’encre. La rivière en est noire, et des ronces ont mangé le vieux pont.',
      'Je crois qu’une des couleurs du maître est tombée là-dedans. L’indigo, sans doute : la rivière en avait la teinte, avant.',
      'Prends cette lanterne. Dans la grotte, ne t’éloigne pas de sa lumière.',
    ],
    en: [
      'The orchard breathes again. You have a steady hand, for such a young stroke.',
      'Listen. To the north lies the Firefly Cave. Children used to go there to watch the insects glow, on summer evenings.',
      'Since the storm, nothing comes out of it but ink. The river has turned black, and brambles have swallowed the old bridge.',
      'I believe one of the master’s colours fell in there. Indigo, surely: the river used to have its hue.',
      'Take this lantern. In the cave, do not stray from its light.',
    ],
  },
  3: {
    fr: ['La grotte est au nord, au bout du sentier qui longe le bois. Garde la lanterne haute.'],
    en: ['The cave is to the north, at the end of the path along the woods. Keep the lantern high.'],
  },
  5: {
    fr: [
      'L’indigo… Je reconnais sa couleur. C’est celle de la rivière, les matins calmes.',
      'Montre-le à Garance, la teinturière : elle saura t’en préparer quand ton pigment s’épuisera.',
      'Et maintenant, le vieux pont. Les ronces d’encre se moquent du pinceau et du vermillon. Mais l’indigo fige l’encre…',
      'Au-delà de la rivière s’étend la Plaine des pruniers. Orme garde le pont : il te dira ce qu’il a vu.',
    ],
    en: [
      'Indigo… I know this colour. It is the river’s, on quiet mornings.',
      'Show it to Madder, the dyer: she can prepare more for you when your pigment runs dry.',
      'And now, the old bridge. Ink brambles laugh at the brush and at vermilion. But indigo freezes ink…',
      'Beyond the river lies the Plum Plain. Elm guards the bridge: he will tell you what he has seen.',
    ],
  },
  6: {
    fr: ['Les ronces couvrent le vieux pont, à l’est. Peins-les à l’indigo.'],
    en: ['The brambles cover the old bridge, to the east. Paint them with indigo.'],
  },
  7: {
    fr: ['Les sanctuaires de la plaine te serviront de refuge. Au bout, il y a le Cercle de pierres… quelque chose y piétine, les nuits d’orage.'],
    en: ['The shrines of the plain will shelter you. At its far end stands the Stone Circle… something stamps there on stormy nights.'],
  },
  8: {
    fr: ['Le Temple englouti, au sud de la plaine. Les anciens disaient qu’on y gardait l’or du maître.'],
    en: ['The Sunken Temple, south of the plain. The elders said the master’s gold was kept there.'],
  },
  10: {
    fr: [
      'L’or. Le maître disait qu’il ne se broie pas : il se mérite.',
      'Tu as rendu trois couleurs au monde, petit trait. Regarde le hameau : les toits ont retrouvé leur teinte.',
      'Mais l’orage gronde encore, au loin. Le maître est quelque part là-bas, au cœur de l’encre.',
      'Il reste d’autres couleurs. Repose-toi. Les Rizières t’attendent.',
    ],
    en: [
      'Gold. The master used to say it cannot be ground: it must be earned.',
      'You have given three colours back to the world, little stroke. Look at the hamlet: the roofs have their hue again.',
      'But the storm still rumbles, far away. The master is somewhere out there, at the heart of the ink.',
      'Other colours remain. Rest now. The Rice Terraces are waiting for you.',
    ],
  },
  11: {
    fr: ['Les Rizières t’attendent, au-delà de la plaine. Le chemin s’ouvrira bientôt.'],
    en: ['The Rice Terraces await you, beyond the plain. The way will open soon.'],
  },
};

export const MADDER = {
  noInk: {
    fr: [
      'Je suis Garance. Je teins les étoffes du hameau… enfin, je les teignais. Sans les couleurs du maître, mes cuves sont grises.',
      'Rapporte-moi une couleur, n’importe laquelle, et je t’en préparerai du pigment.',
    ],
    en: [
      'I am Madder. I dye the hamlet’s cloth… well, I used to. Without the master’s colours, my vats are grey.',
      'Bring me back a colour, any colour, and I will prepare pigment for you.',
    ],
  },
  first: {
    fr: [
      'De l’indigo ! Mes cuves en tremblent. Tends ton pinceau.',
      'Écoute bien : les couleurs ne reviennent pas toutes seules, comme ton vermillon. Chaque trait en coûte.',
      'Quand ton pigment s’épuise, repasse me voir. Les sanctuaires en redonnent aussi, et certaines bêtes en laissent tomber.',
    ],
    en: [
      'Indigo! My vats are trembling. Hold out your brush.',
      'Listen well: colours do not flow back on their own, like your vermilion. Every stroke costs some.',
      'When your pigment runs dry, come back to me. Shrines restore it too, and some beasts drop a little.',
    ],
  },
  refill: {
    fr: ['Tends ton pinceau. Voilà : ton pigment est plein.', 'Ménage-le, les couleurs sont rares.'],
    en: ['Hold out your brush. There: your pigment is full.', 'Spare it, colours are rare.'],
  },
};

export const ELM = {
  before: {
    fr: [
      'Halte, petit. Le vieux pont est mangé par les ronces d’encre. J’y ai cassé trois haches.',
      'Elles repoussent dès qu’on les coupe. Il faudrait quelque chose qui les fige.',
    ],
    en: [
      'Halt, little one. The old bridge is eaten by ink brambles. I broke three axes on them.',
      'They grow back as soon as you cut them. You would need something that freezes them.',
    ],
  },
  indigo: {
    fr: ['De l’indigo ? Essaie donc sur les ronces. Si elles gèlent, elles casseront.'],
    en: ['Indigo? Try it on the brambles, then. If they freeze, they will break.'],
  },
  open: {
    fr: ['Le pont est libre ! Mais prends garde : les camps de la plaine sont plus coriaces. Les sanctuaires te serviront de refuge.'],
    en: ['The bridge is clear! But beware: the camps on the plain are tougher. The shrines will shelter you.'],
  },
  ram: {
    fr: ['Le Bélier-Roi est tombé ? On entendait ses sabots jusqu’ici, les nuits d’orage. Le hameau dormira mieux.'],
    en: ['The Ram King has fallen? We could hear his hooves from here, on stormy nights. The hamlet will sleep better.'],
  },
};

export const LINDEN = {
  early: {
    fr: ['Mes pousses ne verdissent plus depuis l’orage. Tout devient gris, petit. Même la boue.'],
    en: ['My shoots stopped turning green after the storm. Everything goes grey, little one. Even the mud.'],
  },
  indigo: {
    fr: ['Tiens… la rivière bleuit un peu, non ? Ou alors mes vieux yeux me jouent des tours.'],
    en: ['Look… the river is turning a little blue, isn’t it? Or my old eyes are playing tricks on me.'],
  },
  late: {
    fr: ['Mes pousses ! Regarde comme elles verdissent ! Tu as rendu les couleurs, petit trait.'],
    en: ['My shoots! Look how green they are! You brought the colours back, little stroke.'],
  },
};

export const PIP: TrList = {
  fr: [
    'Tu savais que la grotte brillait, la nuit ? Des lucioles ! Ou des yeux. Plutôt des lucioles.',
    'Mon cerf-volant est rouge comme ton écharpe. Le maître l’a peint pour moi, je crois.',
    'L’Aïeule dit qu’elle est plus vieille que le saule. Moi je crois qu’elle EST le saule.',
    'Si tu dessines un rond autour des méchants, ils explosent ! Je l’ai vu ! Enfin… je crois.',
    'Il paraît qu’un temple dort sous l’eau, au sud de la plaine. Avec de l’or dedans !',
    'Les stèles, c’est le maître qui les a écrites. Moi je sais pas lire, mais toi oui.',
  ],
  en: [
    'Did you know the cave glows at night? Fireflies! Or eyes. Fireflies, probably.',
    'My kite is red like your scarf. The master painted it for me, I think.',
    'Grandmother says she is older than the willow. I think she IS the willow.',
    'If you draw a circle around the baddies, they explode! I saw it! Well… I think.',
    'They say a temple sleeps under the water, south of the plain. With gold inside!',
    'The steles were written by the master. I can’t read, but you can.',
  ],
};

/** The master's notebook, carved on steles around the world. */
export const STELES: Tr[] = [
  {
    fr: 'Carnet du maître, I.\nJ’ai peint d’abord un saule, puis un toit sous le saule, puis des gens sous le toit. Ils m’ont regardé, et j’ai su que je ne déchirerais jamais cette feuille.',
    en: 'The master’s notebook, I.\nFirst I painted a willow, then a roof under the willow, then people under the roof. They looked at me, and I knew I would never tear up this sheet.',
  },
  {
    fr: 'Carnet du maître, II.\nLe vermillon est la couleur du sceau. Ce que je signe vit. J’ai signé un dernier trait, petit et rouge, et je l’ai gardé pour la fin.',
    en: 'The master’s notebook, II.\nVermilion is the colour of the seal. What I sign, lives. I signed one last stroke, small and red, and kept it for the end.',
  },
  {
    fr: 'Carnet du maître, III.\nL’indigo, je l’ai broyé avec l’eau de la rivière. Il en garde la patience, et le froid.',
    en: 'The master’s notebook, III.\nI ground the indigo with river water. It keeps the river’s patience, and its cold.',
  },
  {
    fr: 'Carnet du maître, IV.\nUn trait refermé sur lui-même, l’ensō, est la seule chose que je n’ai jamais réussie deux fois pareille.',
    en: 'The master’s notebook, IV.\nA stroke closed upon itself, the ensō, is the only thing I never managed to paint the same way twice.',
  },
  {
    fr: 'Carnet du maître, V.\nLes bêtes d’encre ne sont pas méchantes. Ce sont mes ratures. Elles cherchent seulement une forme.',
    en: 'The master’s notebook, V.\nThe ink beasts are not wicked. They are my crossings-out. They are only looking for a shape.',
  },
  {
    fr: 'Carnet du maître, VI.\nL’or ne se broie pas, il se mérite. Je l’ai caché là où l’eau dort.',
    en: 'The master’s notebook, VI.\nGold cannot be ground, it must be earned. I hid it where the water sleeps.',
  },
  {
    fr: 'Carnet du maître, VII.\nCette nuit, j’ai renversé l’encrier. Ce n’était pas un accident.',
    en: 'The master’s notebook, VII.\nTonight I spilled the inkwell. It was no accident.',
  },
  {
    fr: 'Carnet du maître, VIII.\nSi tu lis ceci, petit trait, ne cherche pas à me sauver. Cherche les couleurs. Le reste suivra.',
    en: 'The master’s notebook, VIII.\nIf you read this, little stroke, do not try to save me. Look for the colours. The rest will follow.',
  },
];

/** Murals inside the dungeons. */
export const MURALS: Record<string, Tr> = {
  cave1: {
    fr: 'Des lucioles peintes sur la roche, des centaines. Un enfant a ajouté, au charbon : « On reviendra l’été prochain. »',
    en: 'Fireflies painted on the rock, hundreds of them. A child added, in charcoal: “We’ll come back next summer.”',
  },
  cave2: {
    fr: 'Une grande tache s’étale sur la paroi, et dans la tache, des yeux. Elle a mangé quelque chose de bleu.',
    en: 'A great blot spreads over the wall, and in the blot, eyes. It has eaten something blue.',
  },
  temple1: {
    fr: 'Les prêtres de l’or priaient en silence, les mains ouvertes, pour que la lumière ne s’échappe pas.',
    en: 'The priests of gold prayed in silence, hands open, so the light would not escape.',
  },
  temple2: {
    fr: 'Un gardien de pierre, l’épée basse. Sous ses pieds, gravé : « Fige-moi, et je m’inclinerai. »',
    en: 'A stone warden, sword lowered. Under his feet, carved: “Freeze me, and I shall bow.”',
  },
};

export interface QuestStep {
  title: Tr;
  goal: Tr;
}

/** The main quest of Act I, one step at a time (save.main). */
export const MAIN: QuestStep[] = [
  { title: { fr: 'Le Hameau des Saules', en: 'Willow Hamlet' }, goal: { fr: 'Parle à l’Aïeule Saule', en: 'Talk to Grandmother Willow' } },
  { title: { fr: 'Les Taches du verger', en: 'Blots in the Orchard' }, goal: { fr: 'Purifie les camps du verger', en: 'Cleanse the orchard camps' } },
  { title: { fr: 'Les Taches du verger', en: 'Blots in the Orchard' }, goal: { fr: 'Retourne voir l’Aïeule Saule', en: 'Return to Grandmother Willow' } },
  { title: { fr: 'La Grotte aux lucioles', en: 'The Firefly Cave' }, goal: { fr: 'Trouve la grotte, au nord du hameau', en: 'Find the cave, north of the hamlet' } },
  { title: { fr: 'La Grotte aux lucioles', en: 'The Firefly Cave' }, goal: { fr: 'Descends au fond de la grotte', en: 'Go down to the depths of the cave' } },
  { title: { fr: 'La Grotte aux lucioles', en: 'The Firefly Cave' }, goal: { fr: 'Rapporte l’indigo à l’Aïeule Saule', en: 'Bring the indigo to Grandmother Willow' } },
  { title: { fr: 'Les Ronces d’encre', en: 'The Ink Brambles' }, goal: { fr: 'Brise les ronces du vieux pont avec l’indigo', en: 'Break the brambles on the old bridge with indigo' } },
  { title: { fr: 'La Plaine des pruniers', en: 'The Plum Plain' }, goal: { fr: 'Trouve le Cercle de pierres, à l’est', en: 'Find the Stone Circle, to the east' } },
  { title: { fr: 'Le Temple englouti', en: 'The Sunken Temple' }, goal: { fr: 'Entre dans le temple, au sud de la plaine', en: 'Enter the temple, south of the plain' } },
  { title: { fr: 'Le Temple englouti', en: 'The Sunken Temple' }, goal: { fr: 'Trouve l’or au cœur du temple', en: 'Find the gold at the heart of the temple' } },
  { title: { fr: 'Le Temple englouti', en: 'The Sunken Temple' }, goal: { fr: 'Rapporte l’or à l’Aïeule Saule', en: 'Bring the gold to Grandmother Willow' } },
  { title: { fr: 'Fin de l’Acte I', en: 'End of Act I' }, goal: { fr: 'Les Rizières t’attendent (prochaine étape)', en: 'The Rice Terraces await (next update)' } },
];

export const UI = {
  pigmentOut: { fr: 'Plus de pigment ! Orbes, sanctuaires ou Garance la teinturière', en: 'Out of pigment! Orbs, shrines or Madder the dyer' },
  lantern: { fr: 'Lanterne obtenue', en: 'Lantern obtained' },
  questDone: { fr: 'Quête accomplie', en: 'Quest complete' },
  newQuest: { fr: 'Nouvelle quête', en: 'New quest' },
  bramblesHurt: { fr: 'Les ronces se referment… Il faudrait les figer.', en: 'The brambles close again… They need to be frozen.' },
  bramblesGone: { fr: 'Les ronces gèlent et se brisent. Le pont est libre.', en: 'The brambles freeze and shatter. The bridge is clear.' },
  sealed: { fr: 'L’entrée est sous l’eau. Peut-être qu’un jour, elle se retirera…', en: 'The entrance is under water. Perhaps one day it will recede…' },
  temple: { fr: 'Le Bélier tombé, les eaux du temple se retirent au sud.', en: 'With the Ram fallen, the temple waters recede to the south.' },
  floor: { fr: 'Niveau', en: 'Floor' },
  stairsDown: { fr: 'L’escalier descend dans le noir.', en: 'The stairs go down into the dark.' },
  bossMother: { fr: 'La Mère des Taches', en: 'The Mother of Blots' },
  motherDown: { fr: 'La Mère des Taches se dissout. Au fond de la flaque, quelque chose de bleu.', en: 'The Mother of Blots dissolves. At the bottom of the pool, something blue.' },
  bossWarden: { fr: 'Le Gardien noyé', en: 'The Drowned Warden' },
  wardenDown: { fr: 'Le Gardien s’incline. Derrière lui, l’or.', en: 'The Warden bows. Behind him, the gold.' },
  wardenHint: { fr: 'Sa pierre est trop dure… Fige-le à l’indigo !', en: 'His stone is too hard… Freeze him with indigo!' },
  rift: { fr: 'Une déchirure dans le papier : elle ramène à la surface.', en: 'A tear in the paper: it leads back to the surface.' },
  enterCave: { fr: 'La Grotte aux lucioles', en: 'The Firefly Cave' },
  enterTemple: { fr: 'Le Temple englouti', en: 'The Sunken Temple' },
  tapToContinue: { fr: 'toucher pour continuer', en: 'tap to continue' },
  noLantern: { fr: 'Il fait noir comme dans un encrier. Sans lanterne, impossible d’avancer.', en: 'It is dark as the inside of an inkwell. Without a lantern, there is no going on.' },
  steleRead: { fr: 'Page du carnet', en: 'Notebook page' },
  pigmentFull: { fr: 'Pigment restauré', en: 'Pigment restored' },
};
