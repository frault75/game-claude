/** Act II, the Rice Terraces: who lives there, what they say, what the places remember. */
import type { Tr, TrList } from './lore';

export const NAMES2: Record<string, Tr> = {
  heron: { fr: 'La Dame Héron-Blanc', en: 'Lady White Heron' },
  cheng: { fr: 'Le vieux Cheng', en: 'Old Cheng' },
  tao: { fr: 'Tao, le maître de thé', en: 'Tao, the tea master' },
  mina: { fr: 'Mina, la pêcheuse', en: 'Mina, the fisher girl' },
  gong: { fr: 'Frère Gong', en: 'Brother Gong' },
  lin: { fr: 'Lin, la marchande', en: 'Lin, the merchant' },
  kaze: { fr: 'Kaze', en: 'Kaze' },
};

export const HERON: Record<'meet' | 'sluices' | 'toad', TrList> = {
  meet: {
    fr: [
      'Un trait rouge… Alors le maître a tenu parole. Il disait qu’il enverrait quelqu’un si l’encre débordait.',
      'Je suis la Dame Héron-Blanc. Mon village garde les rizières depuis que le maître a peint la première pousse. Et depuis l’orage, l’eau des terrasses est devenue noire.',
      'Le jade ? Il me l’avait confié, dans une jarre scellée au cœur de la pagode. La nuit de l’orage, les moines se sont enfermés là-haut. Personne n’en est redescendu.',
      'Avant la pagode, il faut sauver le riz. Les trois vannes des terrasses sont bouchées d’encre. Rouvre-les, et l’eau claire redescendra peut-être.',
    ],
    en: [
      'A red stroke… So the master kept his word. He said he would send someone if the ink overflowed.',
      'I am Lady White Heron. My village has kept the paddies since the master painted the first shoot. And since the storm, the terraces’ water has turned black.',
      'The jade? He entrusted it to me, in a sealed jar at the heart of the pagoda. On the night of the storm the monks shut themselves in up there. No one has come down since.',
      'Before the pagoda, we must save the rice. The three sluices of the terraces are clogged with ink. Reopen them, and clear water may come down again.',
    ],
  },
  sluices: {
    fr: ['Trois vannes : l’une au bout du chemin du sud-ouest, l’une à l’est des terrasses, la dernière au nord, près du vieux Cheng. Il connaît chaque goutte de ces collines.'],
    en: ['Three sluices: one at the end of the south-west path, one east of the terraces, the last to the north, near Old Cheng. He knows every drop of these hills.'],
  },
  toad: {
    fr: ['L’eau descend… mais écoute. Ce n’est pas le chant de l’eau. Quelque chose a bu tout ce qui coulait, en bas, dans le grand bassin.', 'Repose-toi, petit trait. Les moines disaient que la patience est la moitié du chemin.'],
    en: ['The water is flowing down… but listen. That is not the song of water. Something has been drinking everything that ran, down in the great basin.', 'Rest, little stroke. The monks said patience is half the road.'],
  },
};

export const IDLE2: Record<string, TrList> = {
  heron: {
    fr: ['Les hérons du lac ne pêchent plus. Ils regardent l’eau noire comme on regarde une lettre qu’on n’ose pas ouvrir.'],
    en: ['The herons of the lake no longer fish. They look at the black water the way one looks at a letter one dare not open.'],
  },
  cheng: {
    fr: ['Les vannes, c’est moi qui les tournais. Quatre-vingts ans. Depuis l’orage, elles crachent de l’encre et des grenouilles grosses comme des chats.', 'Touche la roue d’une vanne : si l’encre en sort, frappe tout ce qui en sort. Quand le bassin est propre, elle tourne toute seule.'],
    en: ['I turned those sluices. Eighty years. Since the storm they spit ink and frogs as big as cats.', 'Touch a sluice’s wheel: if ink comes out, strike whatever comes out with it. When the basin is clean, it turns on its own.'],
  },
  tao: {
    fr: ['Assieds-toi. Le thé ne se boit pas pressé. Ni l’encre, d’ailleurs.'],
    en: ['Sit down. Tea is not drunk in a hurry. Nor is ink, for that matter.'],
  },
  mina: {
    fr: ['Grand-mère dit que les carpes dorées du lac exaucent les vœux. Moi, je veux juste qu’elles reviennent.'],
    en: ['Grandmother says the golden carp of the lake grant wishes. I just want them to come back.'],
  },
  gong: {
    fr: ['Sept étages, sept prières. Je les connais toutes. Il ne me manque que la force de les dire.'],
    en: ['Seven floors, seven prayers. I know them all. I only lack the strength to say them.'],
  },
  lin: {
    fr: ['Mon cousin Lun te vend des babioles ? Moi, je te vends ce qui sert. Regarde.'],
    en: ['My cousin Lun sells you trinkets? I sell you what is useful. Have a look.'],
  },
  kaze: {
    fr: ['Je t’attendais. Le brouillard du col cache des choses que même le maître n’a pas peintes. Avance prudemment.', 'Le jade est la couleur de la patience. Ce n’est pas un hasard s’il l’a confié à ces gens-là.'],
    en: ['I was waiting for you. The pass’s fog hides things even the master never painted. Tread carefully.', 'Jade is the colour of patience. It is no accident he entrusted it to these people.'],
  },
};

export const REGION_LORE2: Record<string, Tr> = {
  pass: {
    fr: 'Les bergers montaient leurs chèvres ici l’été. Le brouillard ne se lève jamais tout à fait : on dit qu’il garde le col.',
    en: 'Herders brought their goats up here in summer. The fog never quite lifts: they say it guards the pass.',
  },
  terraces: {
    fr: 'Mille marches d’eau, peintes une à une. Le maître disait que chaque terrasse était un vers du même poème.',
    en: 'A thousand steps of water, painted one by one. The master said each terrace was a line of the same poem.',
  },
  reeds: {
    fr: 'Les maisons ont les pieds dans l’eau, comme les hérons. On y fait le meilleur thé de l’est, et les pires plaisanteries.',
    en: 'The houses stand with their feet in the water, like herons. The best tea of the east is made here, and the worst jokes.',
  },
  lake: {
    fr: 'Le lac reflétait le ciel si bien que les oiseaux s’y trompaient. Aujourd’hui, il reflète surtout l’encre.',
    en: 'The lake mirrored the sky so well that birds were fooled. Today it mostly mirrors the ink.',
  },
  bamboo: {
    fr: 'Le vent dans les bambous fait un bruit de pages qu’on tourne. C’est ici que le maître venait lire.',
    en: 'The wind in the bamboo sounds like turning pages. This is where the master came to read.',
  },
  pagoda: {
    fr: 'Sept étages, sept prières. La porte ne s’ouvre que de l’intérieur — ou pour qui connaît la prière.',
    en: 'Seven floors, seven prayers. The door opens only from within — or for one who knows the prayer.',
  },
};

export const ACT2_TITLE = {
  act: { fr: 'Acte II', en: 'Act II' },
  name: { fr: 'Les Rizières en terrasses', en: 'The Rice Terraces' },
  line: { fr: 'Au-delà du col, l’eau des terrasses était devenue noire.', en: 'Beyond the pass, the water of the terraces had turned black.' },
};

export const SLUICE_UI = {
  clogged: { fr: 'Le bassin de la vanne est bouché d’encre… Quelque chose remue dedans !', en: 'The sluice basin is clogged with ink… Something stirs inside!' },
  open: { fr: 'La roue tourne : l’eau claire redescend les terrasses.', en: 'The wheel turns: clear water flows down the terraces.' },
  wait: { fr: 'L’encre ne s’écoulera pas tant qu’il reste quelque chose dans le bassin.', en: 'The ink will not drain while anything remains in the basin.' },
  name: { fr: 'Vanne', en: 'Sluice' },
};
