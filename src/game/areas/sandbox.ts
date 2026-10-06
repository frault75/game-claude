/** Milestone (b): the practice ground, one corner per thread rule. */
import type { RoomDef } from '../room';
import { Pot, Boulder, Brazier, Lantern, Inkstone } from '../objects';
import { Blot, Wisp } from '../enemies';
import { t } from '../../i18n';

export const sandbox: RoomDef = {
  id: 'sandbox',
  area: 'practice',
  w: 48,
  h: 26,
  palette: 'orchard',
  spawn: [4, 13],
  goal: [1, 0],
  post: { fog: 0.18 },
  build(b) {
    const w = b.world;
    b.base(5, 0.8);
    // 1. Pull yourself across a ravine
    b.chasm([[11, 2], [13.5, 2.5], [13.8, 9], [13.2, 16], [13.6, 24], [11.2, 24], [11.6, 16], [10.8, 9]], 9);
    b.post(10, 12, 11);
    b.post(15, 12.5, 12);
    b.post(15, 18, 13);
    b.text(5.5, 18.5, t('hintCast'), 0.38);
    b.text(5.5, 17.6, t('hintReel'), 0.38);
    b.text(5.5, 9, t('sandboxNote'), 0.42);
    // 2. Light comes to you, heavy stays: tie heavy to a post
    b.add(new Pot(19, 20));
    b.add(new Pot(21, 21.5));
    b.add(new Boulder(24, 19, 21));
    b.post(29, 21, 14);
    b.text(23, 23.5, t('hintTie'), 0.36);
    // 3. A taut thread is a wall: wisps cannot cross it
    b.post(19, 6, 15);
    b.post(25, 6, 16);
    b.add(new Wisp(22, 2.5));
    b.add(new Blot(20, 10));
    b.add(new Blot(26, 11));
    b.text(22, 8.3, t('hintRelease'), 0.36);
    // 4. Fire runs along the thread; lanterns bounce off it
    const lit = b.add(new Brazier(34, 18, true));
    b.add(new Brazier(39, 20, false));
    b.add(new Brazier(43, 16, false));
    void lit;
    b.post(36, 9, 17);
    b.post(41, 7, 18);
    let lanternT = 2;
    w.scripts.push((dt) => {
      lanternT -= dt;
      if (lanternT <= 0) {
        lanternT = 4.5;
        w.add(new Lantern(46, 2, -1.6, 1.3));
      }
    });
    b.add(new Inkstone(6, 15));
    b.tree(3, 22, 301, 'plum');
    b.tree(8, 3, 302, 'plum');
    b.tree(31, 2, 303, 'pine', 1.1);
    b.tree(46, 23, 304, 'willow');
    b.bamboo(1.5, 5, 305);
    b.rock(17, 15, 306, 1.2);
    b.rock(32, 13, 307, 0.9);
    b.grass(260, 7);
    b.petals(120, 8);
  },
};
