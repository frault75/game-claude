/** One picture per bestiary page: the creature's first frame, painted with the same seed as in the game. */
import type { Frame } from '../sprite';
import { buildBlotFrames, buildWispFrames, buildBruteFrames, buildMiteFrames } from './creatures';
import { buildCrowFrames, buildScarecrowFrames, buildBoarFrames, buildFoxFrames, buildBatFrames, buildGrubFrames, buildSoldierFrames, buildLanternFrames } from './bestiary';
import { getTotemFrames } from '../../game/enemies';
import { buildFrogFrames, buildGoatFrames, buildWraithFrames, buildMantisFrames } from './bestiary2';
import { buildWardenFrames } from '../../game/bosses/warden';
import { buildMothFrames, buildEelFrames, buildCrabFrames, buildStagFrames } from './bestiary1b';
import { buildTadpoleFrames, buildKappaFrames, buildTanukiFrames, buildToadKingFrames, buildQueenFrames, buildHeronFrames, buildMonkFrames, buildBellFrames, buildFacelessFrames } from './bestiary3';

const MAKERS: Record<string, () => Frame> = {
  blot: () => buildBlotFrames(1201)[0],
  mite: () => buildMiteFrames(1601)[0],
  wisp: () => buildWispFrames(1401)[0],
  brute: () => buildBruteFrames(1501)[0],
  splitter: () => buildBlotFrames(1201)[0],
  totem: () => getTotemFrames()[0],
  crow: () => buildCrowFrames(2101)[0],
  scarecrow: () => buildScarecrowFrames(2201)[0],
  boar: () => buildBoarFrames(2301)[0],
  fox: () => buildFoxFrames(2401)[0],
  bat: () => buildBatFrames(2501)[0],
  grub: () => buildGrubFrames(2601)[0],
  soldier: () => buildSoldierFrames(2701)[0],
  lantern: () => buildLanternFrames(2801).pig[0],
  mother: () => buildBlotFrames(3301, 1)[0],
  'ram king': () => buildBruteFrames(2501)[0],
  warden: () => buildWardenFrames(4401)[0],
  moth: () => buildMothFrames(1701)[0],
  eel: () => buildEelFrames(1801)[2],
  crab: () => buildCrabFrames(1901)[2],
  stag: () => buildStagFrames(2001)[0],
  frog: () => buildFrogFrames(3101)[0],
  goat: () => buildGoatFrames(3201)[0],
  wraith: () => buildWraithFrames(3301)[0],
  mantis: () => buildMantisFrames(3401)[0],
  tadpole: () => buildTadpoleFrames(3501)[0],
  kappa: () => buildKappaFrames(3601)[0],
  tanuki: () => buildTanukiFrames(3701)[1],
  toad: () => buildToadKingFrames(5001).pig[0],
  queen: () => buildQueenFrames(5201).pig[1],
  inkheron: () => buildHeronFrames(5301).pig[0],
  monk: () => buildMonkFrames(3901)[3],
  bell: () => buildBellFrames(4001)[0],
  faceless: () => buildFacelessFrames(5401).pig[0],
};

const cache = new Map<string, Frame>();

export function portrait(key: string): Frame | null {
  let f = cache.get(key);
  if (!f) {
    const make = MAKERS[key];
    if (!make) return null;
    f = make();
    cache.set(key, f);
  }
  return f;
}
