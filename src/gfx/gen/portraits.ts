/** One picture per bestiary page: the creature's first frame, painted with the same seed as in the game. */
import type { Frame } from '../sprite';
import { buildBlotFrames, buildWispFrames, buildBruteFrames, buildMiteFrames } from './creatures';
import { buildCrowFrames, buildScarecrowFrames, buildBoarFrames, buildFoxFrames, buildBatFrames, buildGrubFrames, buildSoldierFrames, buildLanternFrames } from './bestiary';
import { getTotemFrames } from '../../game/enemies';
import { buildWardenFrames } from '../../game/bosses/warden';

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
