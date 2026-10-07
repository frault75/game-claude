/** What to tell the player about the controls, for their device and play style. */
import type { Game } from './game';
import { lang } from '../i18n';
import { t } from '../i18n';

type Tx = { fr: string; en: string };
const tr = (x: Tx) => x[lang];

const MOVE = {
  touch: { fr: 'Pouce gauche : marcher · gros bouton : frapper (maintiens) · Trait : ruée · Ensō : cercle d’encre', en: 'Left thumb: walk · big button: strike (hold) · Stroke: dash · Ensō: ink circle' },
  kbm: { fr: 'ZQSD : marcher · clic gauche : frapper · clic droit ou Espace : Trait · F : Ensō · E : parler', en: 'WASD: walk · left click: strike · right click or Space: Stroke · F: Ensō · E: talk' },
  pad: { fr: 'Stick : marcher · X : frapper · A : Trait (ruée) · Y : Ensō ou parler', en: 'Stick: walk · X: strike · A: Stroke (dash) · Y: Ensō or talk' },
};
const LOOP = {
  touch: { fr: 'Bouton Ensō : un cercle d’encre autour de toi — tout ce qui est dedans explose.', en: 'Ensō button: an ink circle round you — everything inside bursts.' },
  kbm: { fr: 'F ou clic molette : Ensō, un cercle d’encre autour de toi — tout ce qui est dedans explose.', en: 'F or middle click: Ensō, an ink circle round you — everything inside bursts.' },
  pad: { fr: 'Y : Ensō, un cercle d’encre autour de toi — tout ce qui est dedans explose.', en: 'Y: Ensō, an ink circle round you — everything inside bursts.' },
};
const INK = {
  pad: { fr: 'LB / RB : changer d’encre. Le Trait et l’Ensō prennent sa couleur.', en: 'LB / RB: change ink. Stroke and Ensō take its colour.' },
};

export function moveHint(g: Game): string {
  const d = g.input.device;
  if (d === 'pad') return tr(MOVE.pad);
  if (!g.input.actionStyle) return d === 'touch' ? t('owHintMove') : t('owHintMoveKbm');
  return tr(d === 'touch' ? MOVE.touch : MOVE.kbm);
}

export function loopHint(g: Game): string {
  const d = g.input.device;
  if (d === 'pad') return tr(LOOP.pad);
  if (!g.input.actionStyle) return d === 'touch' ? t('owHintDraw') : t('hintEnso');
  return tr(d === 'touch' ? LOOP.touch : LOOP.kbm);
}

export function inkHint(g: Game): string {
  const d = g.input.device;
  if (d === 'pad') return tr(INK.pad);
  return d === 'touch' ? t('inkSwitchTouch') : t('inkSwitchKbm');
}

/** The controls list in the settings sheet. */
export function controlsList(device: 'kbm' | 'touch' | 'pad', action: boolean): string[] {
  if (device === 'pad') {
    return lang === 'fr'
      ? ['Stick gauche : se déplacer · stick droit : viser', 'X : frapper (maintenir : combo)', 'A ou gâchettes : Trait, une ruée qui laisse l’encre', 'Y : Ensō (cercle d’encre), ou parler', 'LB / RB : changer d’encre', 'Croix : compétences (haut, droite, gauche) · bas : gourde', 'B : retour · Start : menu']
      : ['Left stick: move · right stick: aim', 'X: strike (hold: combo)', 'A or triggers: Stroke, a dash that lays ink', 'Y: Ensō (ink circle), or talk', 'LB / RB: change ink', 'D-pad: skills (up, right, left) · down: gourd', 'B: back · Start: menu'];
  }
  if (device === 'touch') {
    return action
      ? (lang === 'fr'
        ? ['Pouce à gauche : un joystick apparaît', 'Gros bouton pinceau : frapper (maintenir : combo)', 'Bouton Trait : ruée qui laisse l’encre (esquive)', 'Bouton Ensō : cercle d’encre autour de toi', 'Touche quelqu’un pour lui parler', 'Pots d’encre : changer de couleur', 'En haut à gauche : sac, arbre, menu']
        : ['Left thumb: a stick appears', 'Big brush button: strike (hold: combo)', 'Stroke button: a dash that lays ink (dodge)', 'Ensō button: an ink circle round you', 'Tap someone to talk', 'Ink pots: change colour', 'Top left: bag, tree, menu'])
      : (lang === 'fr'
        ? ['Pouce à gauche : un joystick apparaît', 'À droite, touche : frapper ou parler', 'À droite, glisse : tracer (boucle = ensō)', 'Boutons : frapper, Trait, Ensō', 'Pots d’encre : changer de couleur', 'En haut à gauche : sac, arbre, menu']
        : ['Left thumb: a stick appears', 'Right side, tap: strike or talk', 'Right side, swipe: draw (a loop = ensō)', 'Buttons: strike, Stroke, Ensō', 'Ink pots: change colour', 'Top left: bag, tree, menu']);
  }
  return action
    ? (lang === 'fr'
      ? ['ZQSD : se déplacer · souris : viser', 'Clic gauche : frapper (maintenir : combo)', 'Clic droit ou Espace : Trait, une ruée qui laisse l’encre', 'Clic molette ou F : Ensō (cercle d’encre)', 'E : parler · 1-4, Q, molette : encre', 'R, T, G : compétences · H : gourde', 'I : sac · C : arbre · M : carte · J : journal', 'Échap : menu']
      : ['WASD: move · mouse: aim', 'Left click: strike (hold: combo)', 'Right click or Space: Stroke, a dash that lays ink', 'Middle click or F: Ensō (ink circle)', 'E: talk · 1-4, Q, wheel: ink', 'R, T, G: skills · H: gourd', 'I: bag · C: tree · M: map · J: journal', 'Esc: menu'])
    : (lang === 'fr'
      ? ['Clic : marcher, frapper, parler', 'Clic droit glissé : tracer (boucle = ensō)', 'Espace : trait droit vers la souris · F : Ensō', 'E : parler · 1-4, Q, molette : encre', 'R, T, G : compétences', 'I : sac · C : arbre · M : carte · J : journal', 'Échap : menu']
      : ['Click: walk, strike, talk', 'Right-drag: draw (a loop = ensō)', 'Space: straight stroke to the mouse · F: Ensō', 'E: talk · 1-4, Q, wheel: ink', 'R, T, G: skills', 'I: bag · C: tree · M: map · J: journal', 'Esc: menu']);
}
