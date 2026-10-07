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
  yu: { fr: 'Maître Yu, l’ermite', en: 'Master Yu, the hermit' },
};

export const HERON: Record<'meet' | 'sluices' | 'toad' | 'toadBack' | 'hermit' | 'jade' | 'after', TrList> = {
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
    fr: [
      'L’eau descend… mais écoute. Ce n’est pas le chant de l’eau. Quelque chose boit tout ce qui coule, en bas, dans le Grand Bassin.',
      'C’est la vieille citerne, au sud des terrasses. Autrefois, nous y portions le crapaud de jade, pour qu’il bénisse les pluies. Il buvait l’eau de trop, et rendait celle qui manquait.',
      'Si l’orage l’a trouvé avant nous… Descends. Et prends garde à l’eau noire : ce qui y plonge en ressort plus fort.',
    ],
    en: [
      'The water flows down… but listen. That is not the song of water. Something is drinking everything that runs, down in the Great Basin.',
      'It is the old cistern, south of the terraces. Long ago we carried the jade toad down there, so he would bless the rains. He drank the water that was too much, and gave back what was missing.',
      'If the storm found him before we did… Go down. And beware the black water: whatever dives into it comes out stronger.',
    ],
  },
  toadBack: {
    fr: [
      'Écoute ! Le lac se remplit. Les hérons pêchent de nouveau. Tu as rendu l’eau aux terrasses, petit trait — le riz te le rendra.',
      'Maintenant, la pagode. Frère Gong en connaît la porte, mais la porte ne s’ouvre qu’aux sept prières, et les moines les ont emportées avec eux.',
      'Une seule personne dehors les connaît encore : Maître Yu. Il a quitté la pagode il y a trente ans pour peindre les bambous plutôt que les réciter. Il vit au fond de la Bambouseraie, à l’est, passé le pont.',
    ],
    en: [
      'Listen! The lake is filling. The herons are fishing again. You gave the water back to the terraces, little stroke — the rice will give it back to you.',
      'Now, the pagoda. Brother Gong knows its door, but the door opens only to the seven prayers, and the monks took them with them.',
      'Only one person outside still knows them: Master Yu. He left the pagoda thirty years ago to paint the bamboo rather than recite it. He lives deep in the Bamboo Grove, to the east, past the bridge.',
    ],
  },
  jade: {
    fr: [
      'Tu l’as. Je le sens d’ici : l’odeur des pousses après la pluie.',
      'Le maître disait que le jade est la couleur de la patience. Il ne tranche pas, il ne gèle pas, il ne foudroie pas. Il fait pousser. Il guérit.',
      'Les terrasses te le rendront, petit trait. Mais écoute-moi bien : le maître a broyé quatre couleurs, et pourtant il en manque une. Le blanc. Celui du papier.',
      'On dit qu’il l’a laissé tout là-haut, au nord, dans les montagnes où il n’y a plus que lui. Si le blanc s’efface, il n’y aura plus de page pour peindre.',
    ],
    en: [
      'You have it. I can smell it from here: the scent of shoots after rain.',
      'The master said jade is the colour of patience. It does not cut, it does not freeze, it does not strike. It makes things grow. It heals.',
      'The terraces will give it back to you, little stroke. But listen well: the master ground four colours, and yet one is missing. White. The white of the paper.',
      'They say he left it high up, to the north, in the mountains where there is nothing but white. If the white fades, there will be no page left to paint on.',
    ],
  },
  after: {
    fr: ['Le riz repousse. Les hérons pêchent. Va, petit trait : le nord t’attend, et la page avec lui.'],
    en: ['The rice grows again. The herons fish. Go, little stroke: the north awaits you, and the page with it.'],
  },
  hermit: {
    fr: ['Maître Yu vit au fond de la Bambouseraie, à l’est, passé le pont. Il est bourru, mais il n’a jamais refusé un thé à personne.'],
    en: ['Master Yu lives deep in the Bamboo Grove, to the east, past the bridge. He is gruff, but he has never refused anyone a cup of tea.'],
  },
};

export const YU: Record<'meet' | 'queen' | 'back' | 'after', TrList> = {
  meet: {
    fr: [
      'Hm. Un trait rouge dans mes bambous. La Dame t’envoie, je parie.',
      'Les sept prières ? Ce ne sont pas des mots, petit. Ce sont des souffles. Les moines les récitaient sans respirer ; c’est pour ça que je suis parti.',
      'Je peux t’apprendre la première, celle du lac. Mais pas tant que la Reine des mantes coupe mon jardin pour y faire son nid. Elle est dans la clairière, à l’ouest d’ici.',
      'Tue-la. Ensuite on parlera de souffles.',
    ],
    en: [
      'Hm. A red stroke in my bamboo. The Lady sent you, I bet.',
      'The seven prayers? They are not words, child. They are breaths. The monks recited them without breathing; that is why I left.',
      'I can teach you the first one, the lake’s. But not while the Mantis Queen is cutting down my garden to make her nest. She is in the clearing, west of here.',
      'Kill her. Then we will talk about breaths.',
    ],
  },
  queen: {
    fr: ['Elle se cache dans les bambous. Écoute les feuilles : quand elles bruissent sans vent, c’est elle.', 'Et quand elle charge, écarte-toi. Le bambou est plus dur que son orgueil.'],
    en: ['She hides in the bamboo. Listen to the leaves: when they rustle without wind, it is her.', 'And when she charges, step aside. Bamboo is harder than her pride.'],
  },
  back: {
    fr: [
      'Le calme est revenu. Écoute : c’est la bambouseraie qui respire.',
      'Tiens. Une flûte de roseau, taillée dans une tige qu’elle avait épargnée. La première prière est un chant ; les lotus du lac s’en souviennent, ils s’ouvrent pour lui.',
      'Joue-la sur le ponton, à l’ouest du lac. Au-delà des lotus, sur l’île, le Héron d’encre garde ce que les moines ont caché. Ne le regarde pas dans les yeux trop longtemps.',
    ],
    en: [
      'Quiet again. Listen: that is the grove breathing.',
      'Here. A reed flute, cut from a stalk she spared. The first prayer is a song; the lotus of the lake remember it, they open for it.',
      'Play it on the jetty, on the lake’s west shore. Beyond the lotus, on the island, the Ink Heron guards what the monks hid. Do not look it in the eye too long.',
    ],
  },
  after: {
    fr: ['Peins lentement. Le bambou pousse un nœud à la fois.', 'Tu veux du thé ? Non ? Tant pis. Le thé, lui, attendra.'],
    en: ['Paint slowly. Bamboo grows one knot at a time.', 'You want tea? No? Too bad. The tea will wait.'],
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
  yu: {
    fr: ['Peins lentement. Le bambou pousse un nœud à la fois.'],
    en: ['Paint slowly. Bamboo grows one knot at a time.'],
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

export const BASIN_UI = {
  name: { fr: 'Le Grand Bassin', en: 'The Great Basin' },
  flooded: { fr: 'La vieille citerne est noyée d’encre. Il faudrait que l’eau des terrasses redescende…', en: 'The old cistern is drowned in ink. The terraces’ water would have to come down first…' },
  drained: { fr: 'L’eau noire s’est retirée du Grand Bassin : un escalier descend dans l’ombre.', en: 'The black water has drained from the Great Basin: a stair goes down into the dark.' },
  bossToad: { fr: 'Le Roi Crapaud', en: 'The Toad King' },
  diveHint: { fr: 'Il plonge pour boire et guérir ! L’or frappé dans son bassin l’en chasse ; l’indigo l’y enferme.', en: 'He dives to drink and heal! Gold struck into his pool drives him out; indigo locks him in.' },
  frozenHint: { fr: 'Tous les bassins sont gelés : il ne peut plus plonger.', en: 'Every pool is frozen: he can no longer dive.' },
  bellyHint: { fr: 'Son ventre gonfle… Frappe fort avant qu’il ne crache !', en: 'His belly swells… Strike hard before he spits!' },
  toadDown: { fr: 'Le Roi Crapaud recrache toute l’eau qu’il avait bue. Là-haut, le lac se remplit.', en: 'The Toad King spits out all the water he drank. Up above, the lake is filling.' },
};

export const QUEEN_UI = {
  boss: { fr: 'La Reine des mantes', en: 'The Mantis Queen' },
  hint: { fr: 'Écarte-toi de sa charge : elle s’écrasera contre les bambous.', en: 'Step aside from her charge: she will crash into the bamboo.' },
  rustle: { fr: 'Les bambous bruissent sans vent…', en: 'The bamboo rustles without wind…' },
  down: { fr: 'La Reine des mantes s’effondre. Le vent revient dans la Bambouseraie.', en: 'The Mantis Queen collapses. The wind returns to the Bamboo Grove.' },
  wait: { fr: 'Une clairière de bambous coupés. Quelque chose y a fait son nid.', en: 'A clearing of cut bamboo. Something has made its nest here.' },
};

export const LAMP_UI = {
  lit: { fr: 'La lanterne s’allume.', en: 'The lantern lights up.' },
  cold: { fr: 'Une lanterne de pierre, froide. Il faudrait la foudre pour l’allumer.', en: 'A stone lantern, cold. It would take lightning to light it.' },
};

export const LOTUS_UI = {
  jetty: { fr: 'Un vieux ponton. Sous l’eau noire, quelque chose de vert attend.', en: 'An old jetty. Under the black water, something green is waiting.' },
  play: { fr: 'Jouer de la flûte', en: 'Play the flute' },
  open: { fr: 'Les lotus se souviennent du chant. Un chemin de feuilles s’ouvre jusqu’à l’île.', en: 'The lotus remember the song. A path of leaves opens to the island.' },
  boss: { fr: 'Le Héron d’encre', en: 'The Ink Heron' },
  gazeHint: { fr: 'Son regard brûle ! Un trait frais entre elle et toi l’arrête : un Trait en travers de son regard.', en: 'Her gaze burns! A fresh stroke between her and you stops it: a Stroke across her gaze.' },
  dazzled: { fr: 'Elle a fixé ton encre trop longtemps : éblouie !', en: 'She stared into your ink too long: dazzled!' },
  down: { fr: 'Le Héron d’encre s’effondre dans les roseaux. Dans son nid, un rouleau scellé de rouge.', en: 'The Ink Heron collapses into the reeds. In her nest, a scroll sealed in red.' },
  scroll: { fr: 'La prière du lac', en: 'The Prayer of the Lake' },
  scrollText: {
    fr: 'Le rouleau est vide. Seulement, quand on le tient, on a envie de respirer lentement — inspirer comme l’eau qui monte, expirer comme l’eau qui se retire. C’est peut-être ça, la prière.',
    en: 'The scroll is blank. Only, holding it, you want to breathe slowly — in like water rising, out like water receding. Perhaps that is the prayer.',
  },
};

export const GONG_PRAYER: TrList = {
  fr: [
    'La prière du lac… Le rouleau est vide, bien sûr. Maître Yu avait raison : ce ne sont pas des mots.',
    'Respire avec moi. Inspire comme l’eau qui monte… expire comme l’eau qui se retire.',
    'Écoute. Les verrous. Trente ans que je n’avais pas entendu ce bruit.',
  ],
  en: [
    'The prayer of the lake… The scroll is blank, of course. Master Yu was right: they are not words.',
    'Breathe with me. In like water rising… out like water receding.',
    'Listen. The bolts. Thirty years since I heard that sound.',
  ],
};

export const PAGODA_UI = {
  opened: { fr: 'Les portes de la Pagode du Ciel s’ouvrent dans un souffle de poussière et d’encens.', en: 'The doors of the Sky Pagoda open in a breath of dust and incense.' },
  soon: { fr: 'Les portes sont ouvertes. Un escalier monte dans l’ombre… (l’ascension arrive bientôt)', en: 'The doors stand open. A stair climbs into the dark… (the climb is coming soon)' },
  shut: { fr: 'Les portes de la pagode sont scellées de l’intérieur.', en: 'The pagoda doors are sealed from within.' },
};

export const SUMMIT_UI = {
  name: { fr: 'La Pagode du Ciel', en: 'The Sky Pagoda' },
  boss: { fr: 'Le Moine sans visage', en: 'The Faceless Monk' },
  erased: { fr: 'La page s’efface sous tes pieds : plus d’encre, plus de pigment !', en: 'The page is erased under your feet: no ink, no pigment left!' },
  shield: { fr: 'Ses ombres le protègent : détruis-les d’abord !', en: 'His shadows protect him: destroy them first!' },
  drink: { fr: 'Il boit à la jarre de jade ! Frappe fort ou fige-le !', en: 'He drinks from the jade jar! Strike hard or freeze him!' },
  choke: { fr: 'Il s’étrangle !', en: 'He chokes!' },
  down: { fr: 'Le sceau rouge s’efface. Un visage revient, paisible : « Merci, petit trait. Prends le jade : il a assez attendu. »', en: 'The red seal fades. A face comes back, peaceful: “Thank you, little stroke. Take the jade: it has waited long enough.”' },
};

export const ACT2_END = {
  lines: {
    fr: [
      'Le jade revint aux terrasses, et le vert remonta les marches d’eau une à une, comme un poème qu’on récite.',
      'Les hérons revinrent pêcher les reflets.',
      'Et le riz, qui avait tant attendu, se remit à pousser.',
      'Mais loin au nord, sur des montagnes que personne n’avait peintes, le blanc s’effaçait.',
    ],
    en: [
      'The jade returned to the terraces, and green climbed back up the steps of water one by one, like a poem recited.',
      'The herons came back to fish for reflections.',
      'And the rice, which had waited so long, began to grow again.',
      'But far to the north, on mountains no one had painted, the white was fading.',
    ],
  },
  end: { fr: 'Fin de l’Acte II', en: 'End of Act II' },
  next: { fr: 'Acte III', en: 'Act III' },
  nextName: { fr: 'Les Cimes blanches', en: 'The White Peaks' },
};
