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
    fr: [
      'Quand tu as rapporté l’or, j’ai senti le col de l’est respirer. L’encre a reculé des montagnes.',
      'Passe à l’est du Cercle de pierres : le sentier monte dans la brume jusqu’aux Rizières en terrasses.',
      'Là-bas vit la Dame Héron-Blanc, au Village des Roseaux. Elle gardait le jade du maître. Si quelqu’un sait où il est passé, c’est elle.',
    ],
    en: [
      'When you brought back the gold, I felt the eastern pass breathe. The ink drew back from the mountains.',
      'Go east of the Stone Circle: the path climbs into the mist up to the Rice Terraces.',
      'There lives Lady White Heron, in the Reed Village. She kept the master’s jade. If anyone knows where it went, it is she.',
    ],
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
  {
    fr: 'Carnet du maître, IX (page cachée).\nAvant les couleurs, il y avait une cinquième encre. Je ne l’ai jamais broyée. Elle se broyait toute seule, la nuit, dans le fond de l’encrier.',
    en: 'The master’s notebook, IX (hidden page).\nBefore the colours there was a fifth ink. I never ground it. It ground itself, at night, at the bottom of the inkwell.',
  },
  {
    fr: 'Carnet du maître, X (page cachée).\nKaze avait raison sur un point : j’ai peur de finir. Un tableau fini ne bouge plus. Alors j’ai laissé un trait ouvert, quelque part.',
    en: 'The master’s notebook, X (hidden page).\nKaze was right about one thing: I am afraid of finishing. A finished painting no longer moves. So I left one stroke open, somewhere.',
  },
  {
    fr: 'Carnet du maître, XI (page cachée).\nAu-delà des rizières, il y a une montagne que je n’ai jamais peinte. Les nuages s’y posent comme des oiseaux fatigués. C’est là que l’encre dort.',
    en: 'The master’s notebook, XI (hidden page).\nBeyond the rice terraces there is a mountain I never painted. Clouds settle on it like tired birds. That is where the ink sleeps.',
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
  basin1: {
    fr: 'Une fresque à demi effacée : des paysans portent une statue de crapaud de jade jusqu’au bassin, en chantant. Sous la fresque, gravé : « Il boit la pluie de trop, il rend la pluie qui manque. »',
    en: 'A half-faded fresco: farmers carry a jade toad statue down to the basin, singing. Beneath it, carved: “He drinks the rain that is too much, he gives back the rain that is missing.”',
  },
  basin2: {
    fr: 'Les marques de l’eau sur les murs, année après année. La dernière est noire, et beaucoup trop haute. Quelqu’un a écrit dessous : « Il ne rend plus rien. »',
    en: 'Water marks on the walls, year after year. The last one is black, and far too high. Someone wrote beneath it: “He gives nothing back now.”',
  },
  pagoda1: {
    fr: 'Une fresque de sept moines, chacun devant une porte. Le premier respire, les yeux fermés. Sous ses pieds : « L’eau monte, l’eau se retire. »',
    en: 'A fresco of seven monks, each before a door. The first one breathes, eyes closed. Beneath his feet: “Water rises, water recedes.”',
  },
  pagoda2: {
    fr: 'Des pages de prières déchirées, collées au mur par l’encre. Toutes les lignes ont été effacées, sauf une : « Ne réveillez pas l’abbé. »',
    en: 'Torn prayer pages, stuck to the wall by ink. Every line has been erased but one: “Do not wake the abbot.”',
  },
  pagoda3: {
    fr: 'Le portrait de l’abbé. Son visage a été gratté jusqu’au mur, puis scellé d’un sceau rouge. Quelqu’un a écrit à côté, d’une main tremblante : « Il a bu dans la jarre. »',
    en: 'The abbot’s portrait. His face has been scraped down to the wall, then sealed with a red seal. Someone wrote beside it, with a trembling hand: “He drank from the jar.”',
  },
  temple1: {
    fr: 'Les prêtres de l’or priaient en silence, les mains ouvertes, pour que la lumière ne s’échappe pas.',
    en: 'The priests of gold prayed in silence, hands open, so the light would not escape.',
  },
  temple2: {
    fr: 'Un gardien de pierre, l’épée basse. Sous ses pieds, gravé : « Fige-moi, et je m’inclinerai. »',
    en: 'A stone warden, sword lowered. Under his feet, carved: “Freeze me, and I shall bow.”',
  },
  heart1: {
    fr: 'Sous la neige, la montagne est creuse comme un bol. Le maître descendait ici pour peindre au frais ce que le soleil aurait séché trop vite.',
    en: 'Under the snow, the mountain is hollow like a bowl. The master came down here to paint, in the cool, what the sun would have dried too fast.',
  },
  heart2: {
    fr: 'Ici pendent les rouleaux qu’il n’a jamais finis : un fleuve sans mer, un oiseau sans ciel, un visage sans yeux. Ils attendent. Les choses inachevées attendent toujours.',
    en: 'Here hang the scrolls he never finished: a river with no sea, a bird with no sky, a face with no eyes. They wait. Unfinished things always wait.',
  },
  heart3: {
    fr: 'Une natte, une pierre à encre usée jusqu’au creux, des centaines de pinceaux. Sur le mur, de sa main : « Finir, c’est accepter de lâcher. »',
    en: 'A mat, an ink stone worn hollow, hundreds of brushes. On the wall, in his hand: “To finish is to agree to let go.”',
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
  { title: { fr: 'Le col de l’Est', en: 'The Eastern Pass' }, goal: { fr: 'Franchis le col, à l’est du Cercle de pierres', en: 'Cross the pass, east of the Stone Circle' } },
  // Act II
  { title: { fr: 'Les Rizières en terrasses', en: 'The Rice Terraces' }, goal: { fr: 'Suis la route jusqu’au Village des Roseaux', en: 'Follow the road to the Reed Village' } },
  { title: { fr: 'La Dame Héron-Blanc', en: 'Lady White Heron' }, goal: { fr: 'Parle à la Dame Héron-Blanc, au village', en: 'Speak to Lady White Heron, in the village' } },
  { title: { fr: 'Les trois vannes', en: 'The Three Sluices' }, goal: { fr: 'Rouvre les trois vannes des terrasses', en: 'Reopen the three sluices of the terraces' } },
  { title: { fr: 'Le Grand Bassin', en: 'The Great Basin' }, goal: { fr: 'Descends dans le Grand Bassin, au sud des terrasses', en: 'Go down into the Great Basin, south of the terraces' } },
  { title: { fr: 'Le Grand Bassin', en: 'The Great Basin' }, goal: { fr: 'Trouve ce qui boit l’eau, au fond du Bassin', en: 'Find what drinks the water, at the bottom of the Basin' } },
  { title: { fr: 'Le Roi Crapaud', en: 'The Toad King' }, goal: { fr: 'Retourne voir la Dame Héron-Blanc', en: 'Return to Lady White Heron' } },
  { title: { fr: 'L’ermite des bambous', en: 'The Hermit of the Bamboo' }, goal: { fr: 'Trouve Maître Yu, au fond de la Bambouseraie (est)', en: 'Find Master Yu, deep in the Bamboo Grove (east)' } },
  { title: { fr: 'La Reine des mantes', en: 'The Mantis Queen' }, goal: { fr: 'Abats la Reine des mantes, au cœur de la Bambouseraie', en: 'Slay the Mantis Queen, in the heart of the Bamboo Grove' } },
  { title: { fr: 'La Reine des mantes', en: 'The Mantis Queen' }, goal: { fr: 'Retourne voir Maître Yu', en: 'Return to Master Yu' } },
  { title: { fr: 'La flûte de roseau', en: 'The Reed Flute' }, goal: { fr: 'Joue de la flûte sur le ponton, à l’ouest du lac', en: 'Play the flute on the jetty, west of the lake' } },
  { title: { fr: 'Le Héron d’encre', en: 'The Ink Heron' }, goal: { fr: 'Suis le chemin de lotus jusqu’à l’île du Héron d’encre', en: 'Follow the lotus path to the Ink Heron’s island' } },
  { title: { fr: 'La prière du lac', en: 'The Prayer of the Lake' }, goal: { fr: 'Porte la prière du lac à Frère Gong, devant la pagode', en: 'Bring the Prayer of the Lake to Brother Gong, before the pagoda' } },
  { title: { fr: 'La Pagode du Ciel', en: 'The Sky Pagoda' }, goal: { fr: 'Monte jusqu’au sommet de la Pagode du Ciel', en: 'Climb to the top of the Sky Pagoda' } },
  { title: { fr: 'Le jade', en: 'The Jade' }, goal: { fr: 'Rapporte le jade à la Dame Héron-Blanc', en: 'Bring the jade to Lady White Heron' } },
  { title: { fr: 'Les Cimes blanches', en: 'The White Peaks' }, goal: { fr: 'Monte l’Escalier des nuages, au nord-ouest de la pagode', en: 'Climb the Cloud Stair, north-west of the pagoda' } },
  // Act III
  { title: { fr: 'L’Escalier des nuages', en: 'The Cloud Stair' }, goal: { fr: 'Rejoins le Monastère suspendu, en haut de l’escalier', en: 'Reach the Hanging Monastery, at the top of the stair' } },
  { title: { fr: 'Mère Neige', en: 'Mother Snow' }, goal: { fr: 'Parle à Mère Neige, au monastère', en: 'Speak to Mother Snow, at the monastery' } },
  { title: { fr: 'Les trois cloches', en: 'The Three Bells' }, goal: { fr: 'Fais sonner les trois cloches des cimes', en: 'Ring the three bells of the peaks' } },
  { title: { fr: 'La page tendue', en: 'The Taut Page' }, goal: { fr: 'Retourne voir Mère Neige', en: 'Return to Mother Snow' } },
  { title: { fr: 'Le sceau brisé', en: 'The Broken Seal' }, goal: { fr: 'Reprends les moitiés du sceau : forêt et glacier', en: 'Win back the seal’s halves: forest and glacier' } },
  { title: { fr: 'Le sceau brisé', en: 'The Broken Seal' }, goal: { fr: 'Rapporte le sceau à Mère Neige', en: 'Bring the seal to Mother Snow' } },
  { title: { fr: 'Le sommet du maître', en: 'The Master’s Summit' }, goal: { fr: 'Monte au sommet, au nord de la vallée effacée', en: 'Climb to the summit, north of the erased valley' } },
  { title: { fr: 'Épilogue', en: 'Epilogue' }, goal: { fr: 'Le monde est à toi', en: 'The world is yours' } },
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
  urnHint: { fr: 'Plus de pigment ? Brise les urnes d’argile aux coins de la salle.', en: 'Out of pigment? Break the clay urns in the corners of the hall.' },
  indigoHint: { fr: 'Prends l’indigo (2, ou touche la goutte bleue) pour le figer.', en: 'Take the indigo (2, or tap the blue drop) to freeze him.' },
  doorsShut: { fr: 'Les ronces se referment derrière toi : vaincs le gardien pour rouvrir la salle.', en: 'Brambles close behind you: defeat the guardian to open the hall again.' },
  rift: { fr: 'Une déchirure dans le papier : elle ramène à la surface.', en: 'A tear in the paper: it leads back to the surface.' },
  enterCave: { fr: 'La Grotte aux lucioles', en: 'The Firefly Cave' },
  enterTemple: { fr: 'Le Temple englouti', en: 'The Sunken Temple' },
  tapToContinue: { fr: 'toucher pour continuer', en: 'tap to continue' },
  noLantern: { fr: 'Il fait noir comme dans un encrier. Sans lanterne, impossible d’avancer.', en: 'It is dark as the inside of an inkwell. Without a lantern, there is no going on.' },
  steleRead: { fr: 'Page du carnet', en: 'Notebook page' },
  pigmentFull: { fr: 'Pigment restauré', en: 'Pigment restored' },
};

export interface BeastLore { name: Tr; where: Tr; text: Tr }

/** The bestiary: one page per creature, written when the first one falls. */
export const BESTIARY: Record<string, BeastLore> = {
  blot: {
    name: { fr: 'Tache', en: 'Blot' }, where: { fr: 'Partout où l’encre a coulé', en: 'Wherever ink has run' },
    text: {
      fr: 'La première rature du maître. Une goutte trop lourde qui a appris à ramper, et qui se ramasse avant de bondir vers tout ce qui brille encore.',
      en: 'The master’s first crossing-out. A drop too heavy that learnt to crawl, and gathers itself before it leaps at whatever still shines.',
    },
  },
  mite: {
    name: { fr: 'Moucheron d’encre', en: 'Ink Mite' }, where: { fr: 'Le verger, la grotte', en: 'The orchard, the cave' },
    text: {
      fr: 'Des éclaboussures si petites qu’elles ont oublié d’où elles tombaient. Elles volent en essaim et piquent comme une plume trop sèche.',
      en: 'Splashes so small they forgot where they fell from. They fly in swarms and sting like a pen gone dry.',
    },
  },
  wisp: {
    name: { fr: 'Feu follet', en: 'Wisp' }, where: { fr: 'Les lieux humides', en: 'Damp places' },
    text: {
      fr: 'Une fumée d’encre qui garde un œil de papier. On dit que ce sont les brouillons que le maître a brûlés ; ils crachent ce qui leur reste.',
      en: 'A smoke of ink that keeps one paper eye. They say these are the drafts the master burnt; they spit out what is left of them.',
    },
  },
  brute: {
    name: { fr: 'Bélier', en: 'Ram' }, where: { fr: 'La Plaine des pruniers', en: 'The Plum Plain' },
    text: {
      fr: 'Le maître dessinait les béliers d’un seul trait, le front d’abord. Ceux-ci n’ont gardé que le front : de face, rien ne passe.',
      en: 'The master drew rams in a single stroke, forehead first. These kept only the forehead: from the front, nothing gets through.',
    },
  },
  splitter: {
    name: { fr: 'Tache-mère', en: 'Mother-blot' }, where: { fr: 'Là où l’encre s’accumule', en: 'Where ink pools' },
    text: {
      fr: 'Trop d’encre au même endroit. Quand on la crève, elle se répand en trois petites taches affamées.',
      en: 'Too much ink in one place. Burst it and it spills into three small, hungry blots.',
    },
  },
  totem: {
    name: { fr: 'Puits d’encre', en: 'Ink Well' }, where: { fr: 'Au cœur des camps', en: 'At the heart of camps' },
    text: {
      fr: 'Un encrier fêlé tombé de l’orage. Tant qu’il n’est pas brisé, il continue d’écrire des taches.',
      en: 'A cracked inkwell fallen from the storm. Until it is broken, it keeps writing blots.',
    },
  },
  crow: {
    name: { fr: 'Corbeau d’encre', en: 'Ink Crow' }, where: { fr: 'Le Verger', en: 'The Orchard' },
    text: {
      fr: 'Les corbeaux du verger ont bu la pluie noire. Ils tournent au-dessus des pruniers et fondent sur ce qui bouge. Leur piqué se lit d’avance : un trait sur le sol.',
      en: 'The orchard crows drank the black rain. They wheel over the plum trees and drop on anything that moves. Their dive can be read ahead: a stroke on the ground.',
    },
  },
  scarecrow: {
    name: { fr: 'Épouvantail', en: 'Scarecrow' }, where: { fr: 'Les champs du Verger', en: 'The orchard fields' },
    text: {
      fr: 'Il gardait les pruniers du vieux Tilleul. L’orage lui a donné des bras qui tournent, et une voix que les corbeaux écoutent. Tant qu’il tient debout, ils reviennent.',
      en: 'It guarded Old Linden’s plum trees. The storm gave it arms that spin, and a voice the crows obey. As long as it stands, they keep coming.',
    },
  },
  boar: {
    name: { fr: 'Sanglier d’encre', en: 'Ink Boar' }, where: { fr: 'La Plaine des pruniers', en: 'The Plum Plain' },
    text: {
      fr: 'Il fonce, il rate, il refonce. Un trait lourd qui ne sait pas finir proprement. Contre une pierre, il reste sonné : c’est le moment.',
      en: 'It charges, misses, charges again. A heavy stroke that never ends cleanly. Against a stone it stays dazed: that is the moment.',
    },
  },
  fox: {
    name: { fr: 'Renard-fumée', en: 'Smoke Fox' }, where: { fr: 'La Plaine des pruniers', en: 'The Plum Plain' },
    text: {
      fr: 'Un renard peint à l’encre trop diluée. Il passe à travers sa propre forme et réapparaît là où l’on ne regarde pas. Quand il disparaît, retourne-toi.',
      en: 'A fox painted with ink too watered down. It slips through its own shape and reappears where you are not looking. When it vanishes, turn around.',
    },
  },
  bat: {
    name: { fr: 'Chauve-souris d’encre', en: 'Ink Bat' }, where: { fr: 'La Grotte aux lucioles', en: 'The Firefly Cave' },
    text: {
      fr: 'Elles dormaient dans les fissures, entre les lucioles. Maintenant, elles chassent les lucioles. Une boucle les attrape toutes d’un coup.',
      en: 'They slept in the cracks, among the fireflies. Now they hunt the fireflies. One loop catches them all at once.',
    },
  },
  grub: {
    name: { fr: 'Larve', en: 'Grub' }, where: { fr: 'La Grotte aux lucioles', en: 'The Firefly Cave' },
    text: {
      fr: 'Elle creuse sous les pieds, en silence. Le sol se ride juste avant qu’elle ne morde. Sous terre, rien ne l’atteint ; dehors, elle est molle.',
      en: 'It digs under your feet, in silence. The ground ripples just before it bites. Underground nothing reaches it; outside, it is soft.',
    },
  },
  soldier: {
    name: { fr: 'Soldat d’argile', en: 'Clay Soldier' }, where: { fr: 'Le Temple englouti', en: 'The Sunken Temple' },
    text: {
      fr: 'Les prêtres de l’or modelaient des gardiens d’argile. L’eau du temple les a réveillés. Leur bouclier se moque du pinceau — mais pas du gel, ni d’un coup dans le dos.',
      en: 'The priests of gold shaped guardians of clay. The temple’s water woke them. Their shield laughs at the brush — but not at frost, nor at a blow from behind.',
    },
  },
  lantern: {
    name: { fr: 'Lanterne errante', en: 'Wandering Lantern' }, where: { fr: 'Le Temple englouti', en: 'The Sunken Temple' },
    text: {
      fr: 'On les allumait pour guider les morts sur l’eau. Celles-ci ont perdu leur chemin. Quand elles s’embrasent, éloigne-toi : elles brûlent tout autour.',
      en: 'They were lit to guide the dead across the water. These have lost their way. When they flare up, step back: they burn everything around.',
    },
  },
  mother: {
    name: { fr: 'La Mère des Taches', en: 'The Mother of Blots' }, where: { fr: 'Au fond de la grotte', en: 'Deep in the cave' },
    text: {
      fr: 'Elle est née de la première goutte d’orage tombée dans la grotte, et elle a avalé l’indigo pour ne plus jamais avoir froid. Elle plonge dans sa propre flaque et ressort sous tes pieds.',
      en: 'She was born of the first storm drop that fell into the cave, and swallowed the indigo so she would never be cold again. She dives into her own pool and comes up under your feet.',
    },
  },
  'ram king': {
    name: { fr: 'Le Bélier-Roi', en: 'The Ram King' }, where: { fr: 'Le Cercle de pierres', en: 'The Stone Circle' },
    text: {
      fr: 'Le maître l’avait peint pour garder la plaine. L’orage lui a laissé le devoir, et retiré la raison. Ses cornes ne cèdent pas ; les pierres levées, si.',
      en: 'The master painted him to guard the plain. The storm left him the duty and took away his reason. His horns do not yield; the standing stones do.',
    },
  },
  warden: {
    name: { fr: 'Le Gardien noyé', en: 'The Drowned Warden' }, where: { fr: 'Au cœur du temple', en: 'At the heart of the temple' },
    text: {
      fr: 'La statue qui veillait sur l’or depuis que l’eau a recouvert le temple. Elle n’obéit qu’à une seule règle, gravée à ses pieds : « Fige-moi, et je m’inclinerai. »',
      en: 'The statue that has watched over the gold since the water covered the temple. It obeys one rule, carved at its feet: “Freeze me, and I shall bow.”',
    },
  },
  frog: {
    name: { fr: 'Grenouille d’encre', en: 'Ink Frog' }, where: { fr: 'Les terrasses inondées', en: 'The flooded terraces' },
    text: {
      fr: 'Née d’une goutte tombée dans l’eau des rizières. Elle s’accroupit, et le cercle qu’elle va écraser se peint sur le sol avant elle. Qui reste dans le cercle n’a jamais lu ce qui était écrit.',
      en: 'Born of a drop fallen into the paddies. It crouches, and the circle it will crush paints itself on the ground ahead. Whoever stays in the circle never read what was written.',
    },
  },
  goat: {
    name: { fr: 'Chèvre de brume', en: 'Mist Goat' }, where: { fr: 'Le Col des Brumes', en: 'The Misty Pass' },
    text: {
      fr: 'Les bergers du col disent qu’elles étaient blanches avant l’orage. Elles chargent en zigzag, comme le sentier, et se cognent aux rochers qu’elles ont oubliés.',
      en: 'The pass herders say they were white before the storm. They charge in zig-zags, like the path, and crash into rocks they have forgotten.',
    },
  },
  wraith: {
    name: { fr: 'Spectre de brume', en: 'Mist Wraith' }, where: { fr: 'Le col, la nuit des rizières', en: 'The pass, the night of the paddies' },
    text: {
      fr: 'Un voile qui se souvient d’avoir été quelqu’un. Quand il devient brume, rien ne le touche ; quand il revient, il crache ce qu’il a avalé.',
      en: 'A veil that remembers being someone. When it turns to mist, nothing touches it; when it returns, it spits out what it swallowed.',
    },
  },
  mantis: {
    name: { fr: 'Mante de jade', en: 'Jade Mantis' }, where: { fr: 'La Bambouseraie', en: 'The Bamboo Grove' },
    text: {
      fr: 'Le maître la peignait pour les élèves impatients : « Elle attend, elle attend, puis c’est fini. » L’encre lui a laissé l’attente et a pris la patience.',
      en: 'The master painted it for impatient pupils: “It waits, it waits, then it is over.” The ink left it the waiting and took the patience.',
    },
  },
  moth: {
    name: { fr: 'Phalène de papier', en: 'Paper Moth' }, where: { fr: 'Le Verger, la Lande', en: 'The Orchard, the Heath' },
    text: {
      fr: 'Les esquisses que le maître jetait au vent, pliées par l’orage en papillons de nuit. Elles tournent autour de toi, plongent, et éclatent en une poussière qui alourdit les jambes. Les traits du maître se voient encore sur leurs ailes : de vieux croquis de pruniers, ratés, puis oubliés.',
      en: 'The sketches the master threw to the wind, folded by the storm into night moths. They circle you, dive, and burst into a dust that makes your legs heavy. The master’s strokes still show on their wings: old sketches of plum trees, failed, then forgotten.',
    },
  },
  eel: {
    name: { fr: 'Anguille d’encre', en: 'Ink Eel' }, where: { fr: 'Les Marais aux lucioles, les berges', en: 'The Firefly Marshes, the riverbanks' },
    text: {
      fr: 'Elle nage dans l’encre répandue comme dans de l’eau, et le sol n’a pour elle aucun fond. On ne voit que ses rides ; elle jaillit, mord, puis reste un instant à découvert, étonnée d’avoir de l’air autour d’elle. C’est le moment.',
      en: 'It swims in spilled ink as in water, and for it the ground has no bottom. You see only its ripples; it leaps out, bites, then lies exposed a moment, surprised to have air around it. That is the moment.',
    },
  },
  crab: {
    name: { fr: 'Crabe-encrier', en: 'Inkpot Crab' }, where: { fr: 'Les berges de la rivière', en: 'The riverbanks' },
    text: {
      fr: 'Il porte sur le dos une pierre à encre, et dans le creux de la pierre, l’encre de l’orage. Il marche de côté, pince deux fois, et se cache dans sa carapace dès qu’on le frappe fort : patience, il en ressort toujours pour cracher.',
      en: 'It carries an inkstone on its back, and in the hollow of the stone, the storm’s ink. It walks sideways, pinches twice, and hides in its shell as soon as it is struck hard: patience, it always comes out again to spit.',
    },
  },
  stag: {
    name: { fr: 'Cerf d’encre', en: 'Ink Stag' }, where: { fr: 'Les Collines rouges', en: 'The Red Hills' },
    text: {
      fr: 'Ses bois sont des branches de prunier, et quand il les plante en terre, des racines d’épines jaillissent en ligne droite jusqu’à toi. Il garde ses distances : c’est un seigneur, il ne se bat pas de près. Quand ses bois sont en terre, il est sans défense.',
      en: 'Its antlers are plum branches, and when it plants them in the earth, thorny roots burst out in a straight line all the way to you. It keeps its distance: it is a lord, it does not fight up close. While its antlers are in the earth, it is defenceless.',
    },
  },
  yeti: {
    name: { fr: 'Yéti', en: 'Yeti' }, where: { fr: 'L’Escalier des nuages, la Forêt de givre', en: 'The Cloud Stair, the Frost Forest' },
    text: {
      fr: 'Ils portaient le bois du monastère pour une poignée de sel. Le maître ne les a jamais peints : ils sont faits du blanc qu’il laissait, et de l’encre qu’on a mis dedans depuis. Ils lèvent les deux poings avant de frapper la neige, et leurs boules de neige engourdissent les jambes.',
      en: 'They carried the monastery’s wood for a fistful of salt. The master never painted them: they are made of the white he left, and of the ink put into them since. They raise both fists before striking the snow, and their snowballs numb the legs.',
    },
  },
  snowfox: {
    name: { fr: 'Renard des neiges', en: 'Snow Fox' }, where: { fr: 'La Forêt de givre', en: 'The Frost Forest' },
    text: {
      fr: 'Trois queues, comme trois pointes de pinceau. Il tourne autour de toi, mord, crache des feux follets, puis se dédouble : ses illusions se brisent d’un coup, et n’ont pas d’ombre. La vraie bête, si.',
      en: 'Three tails, like three brush tips. It circles you, bites, spits fox-fire, then splits in two: its illusions break at one blow, and cast no shadow. The real beast does.',
    },
  },
  crane: {
    name: { fr: 'Grue de papier', en: 'Paper Crane' }, where: { fr: 'Le Glacier, les pentes', en: 'The Glacier, the slopes' },
    text: {
      fr: 'Les moines en pliaient mille pour un vœu. L’orage a exaucé le mauvais. Elle plane hors d’atteinte, plonge en ligne droite, puis reste pliée sur la neige, étourdie : c’est là qu’on la déplie pour de bon. Une boucle tracée sous elle l’attrape même en vol.',
      en: 'The monks folded a thousand of them for a wish. The storm granted the wrong one. It glides out of reach, dives in a straight line, then lies folded on the snow, stunned: that is when you unfold it for good. A loop drawn under it catches it even in flight.',
    },
  },
  eraser: {
    name: { fr: 'Effaceur', en: 'Eraser' }, where: { fr: 'La Vallée effacée', en: 'The Erased Valley' },
    text: {
      fr: 'Ce n’est pas une créature : c’est un endroit où le papier s’est oublié. Il avale chaque trait qu’il touche, et l’encre de celui qu’il touche. Les traits lancés vers lui disparaissent dans sa bouche ; le pinceau, lui, le blesse.',
      en: 'It is not a creature: it is a place where the paper forgot itself. It swallows every stroke it touches, and the ink of whoever it touches. Strokes thrown at it vanish into its mouth; the brush, though, wounds it.',
    },
  },
  tadpole: {
    name: { fr: 'Têtard', en: 'Tadpole' }, where: { fr: 'Le Grand Bassin', en: 'The Great Basin' },
    text: {
      fr: 'Une virgule d’encre qui a appris à nager. Seul, il fait rire ; par dizaines, il fait reculer. Le Roi Crapaud les appelle d’un coassement.',
      en: 'A comma of ink that learned to swim. Alone, it is laughable; by the dozen, it makes you step back. The Toad King calls them with a croak.',
    },
  },
  kappa: {
    name: { fr: 'Kappa', en: 'Kappa' }, where: { fr: 'Les berges, les citernes', en: 'Riverbanks, cisterns' },
    text: {
      fr: 'Un diablotin des eaux à carapace. De face, la carapace détourne le pinceau ; une boucle l’enserre, un coup dans le dos le surprend. Et après chaque assaut, il s’incline — l’eau de sa coupelle se renverse, et il est sans défense.',
      en: 'A shelled water imp. From the front, its shell turns the brush aside; a loop closes around it, a blow in the back surprises it. And after each lunge it bows — the water spills from its dish, and it is defenceless.',
    },
  },
  tanuki: {
    name: { fr: 'Tanuki farceur', en: 'Trickster Tanuki' }, where: { fr: 'Partout où il y a des lanternes', en: 'Wherever there are lanterns' },
    text: {
      fr: 'Il se fait lanterne de pierre et attend. La feuille posée sur son toit le trahit toujours. Il vole les bourses et s’enfuit en riant ; rattrape-le, et il rend tout, avec les intérêts.',
      en: 'It turns itself into a stone lantern and waits. The leaf on its roof always gives it away. It steals purses and runs off laughing; catch it, and it gives everything back, with interest.',
    },
  },
  toad: {
    name: { fr: 'Le Roi Crapaud', en: 'The Toad King' }, where: { fr: 'Au fond du Grand Bassin', en: 'At the bottom of the Great Basin' },
    text: {
      fr: 'Autrefois, un crapaud de jade à trois pattes : il buvait la pluie de trop et rendait celle qui manquait. L’orage l’a rempli d’encre, et il n’a plus jamais voulu rendre. Dans l’eau, il guérit ; l’or l’en chasse, l’indigo l’y enferme.',
      en: 'Once a three-legged jade toad: he drank the rain that was too much and gave back what was missing. The storm filled him with ink, and he never wanted to give back again. In the water he heals; gold drives him out, indigo locks him in.',
    },
  },
  monk: {
    name: { fr: 'Moine d’encre', en: 'Ink Monk' }, where: { fr: 'La Pagode du Ciel', en: 'The Sky Pagoda' },
    text: {
      fr: 'Les moines qui se sont enfermés la nuit de l’orage. Ils prient encore, mais pour l’encre. Quand un frère est blessé, ils s’arrêtent pour prier, et les plaies se referment : frappe celui qui prie d’abord.',
      en: 'The monks who shut themselves in on the night of the storm. They still pray, but for the ink. When a brother is hurt they stop to pray, and wounds close: strike the one praying first.',
    },
  },
  bell: {
    name: { fr: 'Cloche hantée', en: 'Haunted Bell' }, where: { fr: 'La Pagode du Ciel', en: 'The Sky Pagoda' },
    text: {
      fr: 'Elle sonnait l’heure des prières. Maintenant elle sonne d’elle-même, et le son sort en anneaux qui brisent les os. Elle ne bouge pas : c’est déjà ça.',
      en: 'It rang the hour of prayer. Now it rings by itself, and the sound comes out in rings that break bones. It does not move: that is something.',
    },
  },
  faceless: {
    name: { fr: 'Le Moine sans visage', en: 'The Faceless Monk' }, where: { fr: 'Au sommet de la Pagode du Ciel', en: 'At the top of the Sky Pagoda' },
    text: {
      fr: 'L’abbé de la pagode. La nuit de l’orage, il a bu dans la jarre de jade pour la protéger, et l’encre lui a effacé le visage, puis l’a scellé de rouge. Il peint des lignes qui brûlent en séchant, il efface la page, et ses ombres le protègent. Quand il boit encore à la jarre, frappe fort ou fige-le : il s’étrangle.',
      en: 'The abbot of the pagoda. On the night of the storm he drank from the jade jar to protect it, and the ink erased his face, then sealed it in red. He paints lines that burn as they dry, he erases the page, and his shadows protect him. When he drinks from the jar again, strike hard or freeze him: he chokes.',
    },
  },
  inkheron: {
    name: { fr: 'Le Héron d’encre', en: 'The Ink Heron' }, where: { fr: 'L’île du Lac aux Lotus', en: 'The island of the Lotus Lake' },
    text: {
      fr: 'Les moines lui avaient confié la prière du lac : un héron blanc, qui pêchait les reflets plutôt que les poissons. L’orage l’a noircie jusqu’aux yeux. Son regard brûle en ligne droite ; un trait d’encre frais l’arrête, et si elle fixe trop longtemps ta propre encre, elle en est éblouie.',
      en: 'The monks entrusted her with the prayer of the lake: a white heron, who fished for reflections rather than fish. The storm blackened her to the eyes. Her gaze burns in a straight line; a fresh stroke of ink stops it, and if she stares too long into your own ink, she is dazzled.',
    },
  },
  snowking: {
    name: { fr: 'Le Roi des Neiges', en: 'The Snow King' }, where: { fr: 'Le cœur de la Forêt de givre', en: 'The heart of the Frost Forest' },
    text: {
      fr: 'Le plus doux des yétis : il portait le maître sur son dos quand la neige était trop haute, et le maître lui a laissé une couronne de glaçons. L’orage l’a rendu énorme. Il roule en boule de neige — esquive-le, il s’écrase contre les pins. Son souffle gèle tout, sauf le jade vivant. Son propre givre ne le fige pas, et sa fourrure détourne le pinceau tant qu’il tient debout.',
      en: 'The gentlest of the yetis: he carried the master on his back when the snow was too deep, and the master left him a crown of icicles. The storm made him huge. He rolls into a snowball — dodge him, and he crashes into the pines. His breath freezes everything but living jade. His own frost does not freeze him, and his fur turns the brush aside as long as he stands.',
    },
  },
  dragon: {
    name: { fr: 'Le Dragon de papier', en: 'The Paper Dragon' }, where: { fr: 'Le nid du Glacier', en: 'The nest on the Glacier' },
    text: {
      fr: 'Les moines pliaient mille grues pour un vœu. Un hiver, ils en ont plié dix mille, pour que le maître redescende. Le vœu s’est plié sur lui-même et il est devenu un dragon. Il vole hors d’atteinte, plonge, puis se replie sur la glace : c’est là qu’on le frappe. L’or le foudroie et le jette au sol. Blessé, sa queue se déplie en grues.',
      en: 'The monks folded a thousand cranes for a wish. One winter they folded ten thousand, so that the master would come down. The wish folded in on itself and became a dragon. It flies out of reach, dives, then folds itself again on the ice: that is when you strike it. Gold strikes it and throws it down. Wounded, its tail unfolds into cranes.',
    },
  },
  hand: {
    name: { fr: 'La Main du maître', en: 'The Master’s Hand' }, where: { fr: 'Le sommet', en: 'The summit' },
    text: {
      fr: 'Ce qui restait du maître : sa main, qui voulait effacer la tache de son dernier tableau, et qui effaçait le monde avec. Elle ne savait plus s’arrêter. Une encre fraîche porte au-dessus de ce qu’elle efface. À la fin, elle a douté — et elle a lâché le pinceau.',
      en: 'What was left of the master: his hand, which wanted to wipe the blot off his last painting, and wiped the world along with it. It no longer knew how to stop. Fresh ink carries you over what it wipes away. In the end it doubted — and let go of the brush.',
    },
  },
  sketch: {
    name: { fr: 'L’Esquisse', en: 'The Sketch' }, where: { fr: 'La Galerie des inachevés, sous le sommet', en: 'The Gallery of the Unfinished, under the summit' },
    text: {
      fr: 'Le premier enfant du maître, peint tout en noir et rangé avec les essais. Il imitait chaque geste : la ruée, le coup de pinceau, le cercle. Il ne lui manquait que le rouge. Sors de ses cercles avant qu’ils se ferment ; frappe-le quand il reprend son souffle.',
      en: 'The master’s first child, painted all in black and put away with the attempts. It copied every move: the dash, the brush stroke, the circle. All it lacked was red. Get out of its circles before they close; strike it while it catches its breath.',
    },
  },
  queen: {
    name: { fr: 'La Reine des mantes', en: 'The Mantis Queen' }, where: { fr: 'Le cœur de la Bambouseraie', en: 'The heart of the Bamboo Grove' },
    text: {
      fr: 'Elle a coupé le jardin de Maître Yu pour y faire son nid. Elle se fond dans les bambous ; seul le bruissement des feuilles la trahit. Esquive sa charge : elle s’écrase contre les tiges.',
      en: 'She cut down Master Yu’s garden to make her nest. She melts into the bamboo; only the rustle of leaves gives her away. Dodge her charge: she crashes into the stalks.',
    },
  },
};

/** Said once, the first time the child enters each region. */
export const REGION_LORE: Record<string, Tr> = {
  village: {
    fr: 'Le maître a peint ce hameau en premier. Les toits gardent encore la forme de son pinceau.',
    en: 'The master painted this hamlet first. The roofs still keep the shape of his brush.',
  },
  orchard: {
    fr: 'Ici, les pruniers fleurissaient pour lui chaque printemps. Les taches boivent maintenant leur sève.',
    en: 'Here the plum trees bloomed for him every spring. Now the blots drink their sap.',
  },
  plain: {
    fr: 'La plaine était le grand blanc du rouleau : il la laissait vide, pour que la peinture respire.',
    en: 'The plain was the great white of the scroll: he left it empty, so the painting could breathe.',
  },
  marsh: {
    fr: 'Les lucioles venaient de la grotte boire aux marais. Depuis l’orage, l’eau est d’encre, et quelque chose y nage — on voit les rides, jamais le dos.',
    en: 'The fireflies came down from the cave to drink in the marshes. Since the storm the water is ink, and something swims in it — you see the ripples, never the back.',
  },
  hills: {
    fr: 'Le maître broyait ici l’ocre de ses collines. Les cerfs qui les gardaient portaient sur la tête des branches de ses pruniers ; l’encre les a rendus jaloux de leurs bois.',
    en: 'The master ground the ochre of his hills here. The stags that kept them wore branches of his plum trees on their heads; the ink made them jealous of their antlers.',
  },
  heath: {
    fr: 'Une lande où rien ne pousse que la bruyère et les épouvantails. Les corbeaux y comptent les passants. Personne ne sait ce qu’ils font des nombres.',
    en: 'A heath where nothing grows but heather and scarecrows. The crows count the passers-by there. No one knows what they do with the numbers.',
  },
  arena: {
    fr: 'Des pierres levées en cercle, comme un ensō de granit. Quelque chose piétine en son centre.',
    en: 'Standing stones in a circle, like an ensō of granite. Something stamps at its centre.',
  },
  cave: {
    fr: 'Les enfants venaient voir les lucioles. Leurs dessins au charbon sont encore sur la roche.',
    en: 'Children came to watch the fireflies. Their charcoal drawings are still on the rock.',
  },
  temple: {
    fr: 'Un temple à l’or, que l’eau a pris une nuit sans lune. Les prêtres priaient les mains ouvertes.',
    en: 'A temple to gold, taken by the water one moonless night. Its priests prayed with open hands.',
  },
};

export const JOURNAL_UI = {
  title: { fr: 'Carnet', en: 'Journal' },
  beasts: { fr: 'Bestiaire', en: 'Bestiary' },
  pages: { fr: 'Carnet du maître', en: 'Master’s notebook' },
  quests: { fr: 'Quêtes', en: 'Quests' },
  unknown: { fr: '? ? ?', en: '? ? ?' },
  unknownText: { fr: 'Pas encore rencontré. Une page s’écrira à la première victoire.', en: 'Not met yet. A page will be written at the first victory.' },
  noPage: { fr: 'Page non trouvée. Cherche les stèles.', en: 'Page not found. Look for the steles.' },
  newPage: { fr: 'Nouvelle page du bestiaire', en: 'New bestiary page' },
  done: { fr: 'accomplie', en: 'done' },
  now: { fr: 'en cours', en: 'current' },
  where: { fr: 'Lieu', en: 'Where' },
};

/** What people say when they have nothing more for you. */
export const IDLE: Record<'prune' | 'ghost' | 'lotus' | 'kaze' | 'lun', TrList> = {
  lun: {
    fr: ['Lun, colporteur ! Des gourdes, du pigment, des pinceaux qui ont vu du pays… et des cartes que personne d’autre ne vend.', 'Les pièces de cuivre ? Les taches en avalent. Elles les recrachent quand on les crève. Ne me demande pas pourquoi.'],
    en: ['Lun, peddler! Gourds, pigment, brushes that have seen the world… and maps nobody else sells.', 'Copper coins? The blots swallow them. They spit them out when you burst them. Don’t ask me why.'],
  },
  prune: {
    fr: ['Assieds-toi un peu, petit trait. À mon âge, on a le temps de regarder les nuages.', 'Le maître venait boire le thé ici, autrefois. Il peignait les toits pendant que l’eau chauffait.'],
    en: ['Sit a while, little stroke. At my age, there is time to watch the clouds.', 'The master used to come here for tea. He painted the roofs while the water heated.'],
  },
  ghost: {
    fr: ['… La meule… tourne… tourne…'],
    en: ['… The millstone… turns… turns…'],
  },
  lotus: {
    fr: ['Que la flamme te garde sur la route.', 'Les taches craignent la lumière. Pas parce qu’elle brûle : parce qu’elle montre ce qu’elles ont pris.'],
    en: ['May the flame keep you on the road.', 'The blots fear light. Not because it burns: because it shows what they have taken.'],
  },
  kaze: {
    fr: ['Tu es encore là ? Le maître ne t’attendra pas éternellement.'],
    en: ['Still here? The master won’t wait for you forever.'],
  },
};
