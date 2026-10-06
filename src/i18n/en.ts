import type { fr } from './fr';

export const en: Record<keyof typeof fr, string> = {
  loading: 'Grinding the ink…',
  hintMove: 'WASD or arrows: walk',
  hintStrike: 'Left click: brush strike',
  hintDodge: 'Space: dodge',
  hintCast: 'Right click a red knot: cast the thread',
  hintReel: 'Hold right click: pull',
  hintTie: 'Thread in hand, right click another knot: tie',
  hintRelease: 'F or right click on nothing: let go',
  hintPadMove: 'Left stick: walk',
  hintPadStrike: 'X: brush strike',
  hintPadDodge: 'A: dodge',
  hintPadCast: 'RT: cast the thread · hold: pull',
  hintPadRelease: 'B: let go',
  sandboxTitle: 'The practice ground',
  sandboxNote: 'If it is red, the thread can take it.',
  inkstone: 'Inkstone',
};
