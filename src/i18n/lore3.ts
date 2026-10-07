/** Act III, the White Peaks: who lives up there, what they say, what the snow remembers. */
import type { Tr, TrList } from './lore';

export const NAMES3: Record<string, Tr> = {
  snow: { fr: 'Mère Neige', en: 'Mother Snow' },
  kun: { fr: 'Frère Kun, le bibliothécaire', en: 'Brother Kun, the librarian' },
  jun: { fr: 'Le vieux Jun, gardien de yaks', en: 'Old Jun, the yak herder' },
  suzu: { fr: 'Suzu, la peintre', en: 'Suzu, the painter' },
  pema: { fr: 'Pema, la novice', en: 'Pema, the novice' },
  kaze: { fr: 'Kaze', en: 'Kaze' },
};

export const SNOW: Record<'meet' | 'bells' | 'back' | 'kings' | 'seal' | 'after', TrList> = {
  meet: {
    fr: [
      'Un trait rouge sur la neige. Les cloches me l’avaient dit, avant de se taire.',
      'Je suis Mère Neige. Ce monastère garde le haut du rouleau : ici, le maître ne peignait presque rien. Il laissait le papier. « Le blanc ne se peint pas, disait-il. Il se laisse. »',
      'Au printemps d’avant l’orage, il est monté jusqu’ici, très vieux, très fatigué. Il voulait peindre la neige. Il est parti vers le sommet. Il n’est jamais redescendu.',
      'Depuis, quelque chose efface le papier, depuis le nord. Pas de l’encre : rien. Là où il passe, il ne reste même plus de quoi peindre.',
      'Nos trois cloches tenaient la page tendue, comme la peau d’un tambour. Elles se sont tues. L’une dans la Forêt de givre, gardée par des renards qui mentent. L’une sur le Glacier, au-delà des crevasses. La dernière dans la vallée que l’effacement a déjà mangée.',
      'Fais-les sonner. La page tiendra, assez longtemps pour que tu montes.',
    ],
    en: [
      'A red stroke on the snow. The bells told me, before they fell silent.',
      'I am Mother Snow. This monastery keeps the top of the scroll: up here the master painted almost nothing. He left the paper. “White is not painted,” he used to say. “It is left.”',
      'In the spring before the storm he came up here, very old, very tired. He wanted to paint the snow. He went towards the summit. He never came down.',
      'Since then something has been erasing the paper, from the north. Not ink: nothing. Where it passes, there is not even anything left to paint on.',
      'Our three bells held the page taut, like the skin of a drum. They have fallen silent. One in the Frost Forest, guarded by foxes that lie. One on the Glacier, beyond the crevasses. The last in the valley the erasing has already eaten.',
      'Ring them. The page will hold, long enough for you to climb.',
    ],
  },
  bells: {
    fr: [
      'La cloche de la forêt : les renards savent tout imiter, sauf l’ombre. Une illusion ne pose pas d’ombre sur la neige.',
      'Celle du glacier : les crevasses n’ont pas de fond. Mais une encre fraîche porte un enfant au-dessus du vide — le maître le savait, c’est pour ça qu’il traçait vite.',
      'Celle de la vallée : elle a été effacée. Ce qui est effacé peut être repeint. Entoure-la.',
    ],
    en: [
      'The forest bell: foxes can imitate everything but a shadow. An illusion casts no shadow on the snow.',
      'The glacier bell: the crevasses have no bottom. But fresh ink holds a child above the void — the master knew it, that is why he drew fast.',
      'The valley bell: it has been erased. What is erased can be painted again. Draw around it.',
    ],
  },
  back: {
    fr: [
      'Écoute. La page est tendue de nouveau : on l’entend vibrer sous la neige.',
      'Je dois te dire ce que je n’ai dit à personne. Ce qui efface le papier vient du sommet. Du maître lui-même — ou de ce qu’il en reste.',
      'Il y a une chose que seuls les plus vieux d’entre nous savent : chaque peinture du maître se termine par un trait rouge. Sa signature. Celle de ce rouleau-ci, il ne l’a jamais posée.',
      'Le chemin qui monte au-dessus de la vallée effacée est fermé par son sceau. Avant de monter, il l’a brisé en deux, comme on ferme une porte derrière soi.',
      'Le Roi des Neiges a emporté une moitié dans la Forêt de givre. C’était le plus doux des yétis : il portait le maître sur son dos quand la neige était trop haute. L’autre moitié, le Dragon de papier l’a emportée sur le Glacier — mille grues pliées pour un seul vœu.',
      'Rapporte-moi les deux moitiés. Je les rejoindrai. Alors tu monteras voir ce qui efface le monde.',
    ],
    en: [
      'Listen. The page is taut again: you can hear it hum under the snow.',
      'I must tell you what I have told no one. What erases the paper comes from the summit. From the master himself — or what is left of him.',
      'There is one thing only the oldest of us know: every painting of the master ends with a red stroke. His signature. This scroll’s, he never laid down.',
      'The path that climbs above the erased valley is shut by his seal. Before he went up, he broke it in two, the way one closes a door behind oneself.',
      'The Snow King carried one half into the Frost Forest. He was the gentlest of the yetis: he carried the master on his back when the snow was too deep. The other half the Paper Dragon took onto the Glacier — a thousand cranes folded for a single wish.',
      'Bring me both halves. I will join them. Then you will climb and see what is erasing the world.',
    ],
  },
  kings: {
    fr: [
      'Le Roi des Neiges souffle un givre qui gèle jusqu’au souffle. Rien ne l’arrête, sauf le jade vivant : fais pousser une haie entre lui et toi.',
      'Le Dragon de papier vole trop haut pour ton pinceau. Mais le papier craint la foudre : l’or le jettera sur la glace. Et après chaque plongeon, il doit se replier — c’est là qu’il faut frapper.',
    ],
    en: [
      'The Snow King breathes a frost that freezes breath itself. Nothing stops it but living jade: grow a hedge between him and you.',
      'The Paper Dragon flies too high for your brush. But paper fears lightning: gold will throw it down onto the ice. And after every dive it must fold itself again — that is when to strike.',
    ],
  },
  seal: {
    fr: [
      'Les deux moitiés… Regarde : leurs bords s’emboîtent comme deux mains.',
      'Ce n’est pas son nom qui est gravé là. C’est un seul trait. Rouge. Le même que toi.',
      'Le sceau ouvre le chemin du sommet, au-dessus de la vallée effacée. Va. Et quoi que tu trouves là-haut, souviens-toi : tu es un trait, pas une tache.',
    ],
    en: [
      'Both halves… Look: their edges fit together like two hands.',
      'It is not his name carved there. It is a single stroke. Red. The same as you.',
      'The seal opens the path to the summit, above the erased valley. Go. And whatever you find up there, remember: you are a stroke, not a blot.',
    ],
  },
  after: {
    fr: ['Le chemin du sommet t’attend, au nord de la vallée effacée. La neige retient son souffle.'],
    en: ['The summit path awaits you, north of the erased valley. The snow is holding its breath.'],
  },
};

export const KING_UI = {
  boss: { fr: 'Le Roi des Neiges', en: 'The Snow King' },
  wait: { fr: 'D’énormes traces dans la neige, et un grondement sous les pins. Pas encore.', en: 'Huge tracks in the snow, and a rumbling under the pines. Not yet.' },
  hint: { fr: 'Esquive sa boule de neige : il s’écrasera contre les pins, étourdi.', en: 'Dodge his snowball: he will crash into the pines, dazed.' },
  breath: { fr: 'Son souffle gèle tout… sauf le jade vivant. Fais pousser une haie entre vous.', en: 'His breath freezes everything… except living jade. Grow a hedge between you.' },
  blocked: { fr: 'Le givre se brise sur le bambou !', en: 'The frost shatters on the bamboo!' },
  call: { fr: 'Il appelle ses yétis !', en: 'He calls his yetis!' },
  down: { fr: 'Le Roi des Neiges tombe à genoux. Dans sa fourrure, une moitié de sceau rouge.', en: 'The Snow King falls to his knees. In his fur, half of a red seal.' },
};

export const DRAGON_UI = {
  boss: { fr: 'Le Dragon de papier', en: 'The Paper Dragon' },
  wait: { fr: 'Un nid immense de papier plié. Quelque chose dort dessous. Pas encore.', en: 'A huge nest of folded paper. Something sleeps under it. Not yet.' },
  hint: { fr: 'Il vole trop haut : attends qu’il se pose après son plongeon.', en: 'It flies too high: wait until it lands after its dive.' },
  gold: { fr: 'La foudre d’or le jette sur la glace !', en: 'Gold lightning throws it down onto the ice!' },
  fold: { fr: 'Sa queue se déplie en grues !', en: 'Its tail unfolds into cranes!' },
  down: { fr: 'Le Dragon de papier se déplie une dernière fois. Au creux du dernier pli, l’autre moitié du sceau.', en: 'The Paper Dragon unfolds one last time. In the hollow of the last fold, the other half of the seal.' },
};

export const SEAL_UI = {
  half: { fr: 'Moitié du sceau du maître', en: 'Half of the master’s seal' },
  both: { fr: 'Les deux moitiés du sceau. Rapporte-les à Mère Neige.', en: 'Both halves of the seal. Bring them to Mother Snow.' },
  joined: { fr: 'Le sceau du maître, entier. Un seul trait rouge.', en: 'The master’s seal, whole. A single red stroke.' },
  summit: { fr: 'Le chemin du sommet est encore pris dans les nuages… (la suite de l’Acte III arrive)', en: 'The summit path is still lost in the clouds… (the rest of Act III is coming)' },
};

export const IDLE3: Record<string, TrList> = {
  snow: {
    fr: ['La neige ne ment pas : elle garde les pas. Lis-les, si tu cherches quelque chose.'],
    en: ['Snow does not lie: it keeps footprints. Read them, if you are looking for something.'],
  },
  kun: {
    fr: ['Les sutras s’effacent sur les rayonnages, une ligne par nuit. Je les recopie, mais l’encre gèle dans le pinceau.', 'Le maître venait lire ici. Il riait des sutras sur la vacuité : « Ils n’ont jamais vu une page blanche. »'],
    en: ['The sutras fade on the shelves, one line a night. I copy them out, but the ink freezes in the brush.', 'The master came to read here. He laughed at the sutras on emptiness: “They have never seen a blank page.”'],
  },
  jun: {
    fr: ['Mes yaks sentent le blanc qui avance. Ils ne mangent plus. Moi non plus, remarque.', 'Les yétis ? Ils étaient doux, avant. Ils portaient le bois du monastère pour une poignée de sel.'],
    en: ['My yaks can smell the white coming. They do not eat any more. Neither do I, mind you.', 'The yetis? They were gentle, before. They carried the monastery’s wood for a fistful of salt.'],
  },
  suzu: {
    fr: ['Je suis montée ici pour apprendre à peindre la neige. Ça fait trois ans. Je n’ai encore rien posé sur le papier.', 'Tu veux voir ce que j’ai ? Le froid conserve tout, même les bonnes affaires.'],
    en: ['I came up here to learn to paint snow. That was three years ago. I have not put anything on paper yet.', 'Want to see what I have? The cold keeps everything, even a good bargain.'],
  },
  pema: {
    fr: ['Mère Neige dit que je suis trop bruyante pour un monastère. Moi je dis que c’est le monastère qui est trop silencieux.', 'Tu es vraiment un trait de pinceau ? Tu as l’air d’un enfant avec un chapeau.'],
    en: ['Mother Snow says I am too noisy for a monastery. I say the monastery is too quiet.', 'Are you really a brushstroke? You look like a child with a hat.'],
  },
  kaze: {
    fr: ['Même moi, je n’étais jamais monté si haut. Le maître disait que tout en haut, il n’y a plus d’encre — seulement l’envie d’en mettre.'],
    en: ['Even I had never climbed this high. The master said that at the very top there is no ink any more — only the wish to put some.'],
  },
};

export const REGION_LORE3: Record<string, Tr> = {
  stair: {
    fr: 'Mille marches taillées dans la montagne, et les nuages en dessous. Les moines disent qu’on monte ici pour oublier ce qu’on a peint.',
    en: 'A thousand steps cut into the mountain, and the clouds below. The monks say one climbs here to forget what one has painted.',
  },
  slopes: {
    fr: 'Le vent écrit sur la neige et efface aussitôt. Le maître appelait ces pentes « le brouillon ».',
    en: 'The wind writes on the snow and erases it at once. The master called these slopes “the rough draft”.',
  },
  monastery: {
    fr: 'Accroché à la falaise comme un sceau au bas d’une page. Ses cloches tenaient la page tendue. Elles se sont tues.',
    en: 'Clinging to the cliff like a seal at the bottom of a page. Its bells held the page taut. They have fallen silent.',
  },
  forest: {
    fr: 'Des pins sous le givre, et des renards blancs qu’on ne voit qu’à leurs yeux. Ici, rien n’est tout à fait ce qu’il paraît.',
    en: 'Pines under frost, and white foxes you only see by their eyes. Here nothing is quite what it seems.',
  },
  glacier: {
    fr: 'La glace craque comme un papier trop sec. Les crevasses descendent plus bas que le rouleau. Les grues de papier y nichent.',
    en: 'The ice cracks like paper too dry. The crevasses go down further than the scroll. The paper cranes nest there.',
  },
  erased: {
    fr: 'Ici, il n’y a plus rien — pas même du blanc. Le papier est déchiré, et par les trous on voit le dessous du monde : rien du tout.',
    en: 'Here there is nothing left — not even white. The paper is torn, and through the holes you see the underside of the world: nothing at all.',
  },
  summit: {
    fr: 'Une hutte, un pinceau planté dans la neige, et le silence.',
    en: 'A hut, a brush planted in the snow, and silence.',
  },
};

export const ACT3_TITLE = {
  act: { fr: 'Acte III', en: 'Act III' },
  name: { fr: 'Les Cimes blanches', en: 'The White Peaks' },
  line: { fr: 'Là-haut, le maître ne peignait presque rien. Il laissait le papier.', en: 'Up there the master painted almost nothing. He left the paper.' },
};

export const BELL3_UI = {
  names: [
    { fr: 'La cloche de la forêt', en: 'The forest bell' },
    { fr: 'La cloche du glacier', en: 'The glacier bell' },
    { fr: 'La cloche de la vallée', en: 'The valley bell' },
  ] as Tr[],
  rings: { fr: 'sonne. La page se tend.', en: 'rings. The page grows taut.' },
  fake: { fr: 'Une illusion ! Elle n’avait pas d’ombre…', en: 'An illusion! It had no shadow…' },
  erased: { fr: 'La cloche est effacée : il n’en reste qu’un contour. Repeins-la : trace une boucle autour.', en: 'The bell has been erased: only an outline is left. Paint it again: draw a loop around it.' },
  repainted: { fr: 'La cloche revient sous l’encre.', en: 'The bell comes back under the ink.' },
  silent: { fr: 'Une cloche muette, couverte de givre.', en: 'A silent bell, covered in frost.' },
  stair: { fr: 'L’escalier se perd dans les nuages. Pas encore.', en: 'The stair vanishes into the clouds. Not yet.' },
  crevasse: { fr: 'Pas de fond. Mais une encre fraîche porte au-dessus du vide…', en: 'No bottom. But fresh ink holds you above the void…' },
};
