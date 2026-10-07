/** Act III's last dungeon: the Heart of the Mountain, under the summit — the master's studio. */
import type { Tr, TrList } from './lore';

export const HEART_UI = {
  name: { fr: 'Le Cœur de la montagne', en: 'The Heart of the Mountain' },
  floors: [
    { fr: 'Les Salles gelées', en: 'The Frozen Halls' },
    { fr: 'La Galerie des inachevés', en: 'The Gallery of the Unfinished' },
    { fr: 'L’Atelier du maître', en: 'The Master’s Studio' },
  ] as Tr[],
  erased: { fr: 'Derrière la porte, plus rien : la main a effacé le chemin du sommet. À côté de la porte, un escalier s’enfonce dans la montagne.', en: 'Beyond the gate, nothing: the hand has wiped the path to the summit away. Beside the gate, a stair goes down into the mountain.' },
  stairs: { fr: 'Un escalier taillé dans la glace descend dans la montagne.', en: 'A stair cut into the ice goes down into the mountain.' },
  goal: { fr: 'Traverse le cœur de la montagne jusqu’au sommet', en: 'Go through the heart of the mountain to the summit' },
  crevasse: { fr: 'Le sol s’est fendu. Un Trait d’encre fraîche te porte au-dessus du vide.', en: 'The floor has split. A Stroke of fresh ink carries you over the void.' },
  icicles: { fr: 'Des stalactites se détachent du plafond : regarde leur ombre.', en: 'Icicles break from the ceiling: watch their shadows.' },
  sealed: { fr: 'La dernière porte est scellée. Trois cercles inachevés sont peints sur cet étage.', en: 'The last door is sealed. Three unfinished circles are painted on this floor.' },
  circle: { fr: 'Un cercle inachevé. Tiens-toi dedans et ferme-le d’un Ensō.', en: 'An unfinished circle. Stand inside it and close it with an Ensō.' },
  closed: { fr: 'Le cercle se ferme ({n}/3).', en: 'The circle closes ({n}/3).' },
  unsealed: { fr: 'Les trois cercles sont fermés : la porte se descelle.', en: 'All three circles are closed: the door unseals.' },
  meet: { fr: 'Quelqu’un t’attend au fond de la galerie. Il te ressemble — tout en noir, sans rouge.', en: 'Someone is waiting at the end of the gallery. It looks like you — all in black, with no red.' },
  boss: { fr: 'L’Esquisse', en: 'The Sketch' },
  enso: { fr: 'Elle trace un cercle autour de toi : sors-en, ou traverse son trait d’une ruée.', en: 'It draws a circle round you: get out, or dash through its line.' },
  learnt: { fr: 'L’Esquisse a appris tes gestes.', en: 'The Sketch has learnt your moves.' },
  down: { fr: 'L’Esquisse se défait, trait par trait. Elle effleure ton écharpe rouge, comme pour savoir ce que ça fait.', en: 'The Sketch comes undone, stroke by stroke. It brushes your red scarf, as if to know how it feels.' },
  brush: { fr: 'Elle te laisse son pinceau. Il n’a jamais touché le rouge.', en: 'It leaves you its brush. It never touched red.' },
  stairDown: { fr: 'Derrière l’Esquisse, l’escalier descend vers l’atelier.', en: 'Behind the Sketch, the stair goes down to the studio.' },
  studio: { fr: 'L’atelier du maître. Rien n’a bougé depuis l’orage. Quatre rouleaux attendent, inachevés.', en: 'The master’s studio. Nothing has moved since the storm. Four scrolls are waiting, unfinished.' },
  awake: { fr: 'Les peintures inachevées se réveillent !', en: 'The unfinished paintings wake up!' },
  wave: { fr: 'Vague {n}/3', en: 'Wave {n}/3' },
  calm: { fr: 'Le silence revient. Au fond de l’atelier, l’escalier du maître monte vers le sommet.', en: 'Silence again. At the back of the studio, the master’s own stair climbs to the summit.' },
  stairUp: { fr: 'L’escalier du maître', en: 'The master’s stair' },
  summit: { fr: 'Le sommet. Derrière toi, le chemin de la porte revient, trait après trait.', en: 'The summit. Behind you, the path to the gate comes back, stroke by stroke.' },
  painting: { fr: 'Rouleau inachevé', en: 'Unfinished scroll' },
};

/** The four unfinished scrolls in the studio (title, then the master's words). */
export const PAINTINGS: TrList[] = [
  {
    fr: ['Une montagne sans sommet.', '« J’ai commencé la montagne par le bas, comme on doit. Arrivé en haut, je n’ai pas osé poser le sommet. Un sommet, c’est une fin. »'],
    en: ['A mountain without a peak.', '“I began the mountain from the bottom, as one should. When I reached the top, I did not dare set down the peak. A peak is an ending.”'],
  },
  {
    fr: ['Un enfant en noir.', '« Mon premier enfant, je l’ai peint tout en noir. Il marchait, il imitait mes gestes, mais il n’avait pas de rouge : il ne savait pas aimer ce qu’il touchait. Je l’ai rangé ici, avec les autres essais. Je n’aurais pas dû. »'],
    en: ['A child in black.', '“My first child I painted all in black. It walked, it copied my moves, but it had no red: it did not know how to love what it touched. I put it away in here with the other attempts. I should not have.”'],
  },
  {
    fr: ['Deux mains.', '« Mes mains tremblent, maintenant. Je peins plus lentement, et j’efface plus vite. J’ai peur qu’un jour, l’effacement gagne. »'],
    en: ['Two hands.', '“My hands tremble now. I paint more slowly, and I erase faster. I am afraid that one day the erasing will win.”'],
  },
  {
    fr: ['Une goutte de vermillon.', '« Je garde le vermillon pour la fin. Une seule goutte, pour signer le grand rouleau, là-haut. Après, je pourrai me reposer. »'],
    en: ['A drop of vermilion.', '“I am keeping the vermilion for the end. A single drop, to sign the great scroll up there. Afterwards, I will be able to rest.”'],
  },
];
