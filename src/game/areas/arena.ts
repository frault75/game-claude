/** Feel prototype: the temple courtyard under the ink storm, five waves. */
import type { RoomDef, RoomBuilder } from '../room';
import { Blot, Wisp, Brute, Mite, Creature } from '../enemies';
import { Storm } from '../weather';
import { washPoly, noisyOutline } from '../../gfx/wash';
import { stroke } from '../../gfx/brush';
import { INK, PIG_A } from '../../gfx/paint';
import { Rng } from '../../gfx/rng';
import { t } from '../../i18n';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';

type Kind = 'blot' | 'wisp' | 'brute' | 'mite';

const WAVES: Kind[][] = [
  ['blot', 'blot', 'blot'],
  ['blot', 'blot', 'wisp', 'wisp', 'blot'],
  ['mite', 'mite', 'mite', 'mite', 'mite', 'mite', 'blot', 'blot'],
  ['brute', 'blot', 'blot', 'wisp'],
  ['brute', 'brute', 'wisp', 'wisp', 'mite', 'mite', 'mite', 'mite', 'blot', 'blot'],
];

function make(kind: Kind, x: number, y: number): Creature {
  switch (kind) {
    case 'blot': return new Blot(x, y);
    case 'wisp': return new Wisp(x, y);
    case 'brute': return new Brute(x, y);
    case 'mite': return new Mite(x, y);
  }
}

function paintCourtyard(b: RoomBuilder): void {
  const g = b.ground;
  const r = new Rng(9);
  const W = b.def.w, H = b.def.h;
  b.base(901, 0.6);
  // a few worn flagstones, mostly suggested: the paper does the rest
  for (let i = 0; i < 46; i++) {
    const x = r.range(1.2, W - 1.2), y = r.range(1.2, H - 1.2);
    const s = r.range(0.35, 0.6);
    const o = noisyOutline(x, y, s, s * 0.65, 0.22, r.int(1, 1e6));
    washPoly(g, o, { pig: INK, density: r.range(0.03, 0.07), soft: 0.1, edge: 0.4, seed: r.int(1, 1e6) });
    const n = o.length;
    const from = r.int(0, n - 1), len = Math.floor(n * r.range(0.25, 0.5));
    const part: [number, number][] = [];
    for (let k = 0; k < len; k += 2) part.push(o[(from + k) % n]);
    if (part.length > 2) stroke(g, part, { width: 0.05, pig: INK, load: r.range(0.25, 0.45), dry: 0.6, seed: r.int(1, 1e6), taperStart: 0.2, taperEnd: 0.5, body: 0.2, press: 0 });
  }
  // puddles catching the storm
  for (let i = 0; i < 6; i++) {
    const x = r.range(3, W - 3), y = r.range(2, H - 2);
    washPoly(g, noisyOutline(x, y, r.range(0.6, 1.3), r.range(0.25, 0.45), 0.3, r.int(1, 1e6)), { pig: PIG_A, density: 0.12, soft: 0.5, seed: r.int(1, 1e6) });
  }
  // cracks
  for (let i = 0; i < 10; i++) {
    const x = r.range(1, W - 1), y = r.range(1, H - 1);
    stroke(g, [[x, y], [x + r.gauss() * 0.5, y + r.gauss() * 0.3], [x + r.gauss() * 0.9, y + r.gauss() * 0.5]], { width: 0.03, pig: INK, load: 0.4, dry: 0.5, seed: r.int(1, 1e6), body: 0.2, press: 0 });
  }
  // a low stone rim around the court
  const rim: [number, number][] = [[0.4, 0.4], [W - 0.4, 0.4], [W - 0.4, H - 0.4], [0.4, H - 0.4], [0.4, 0.4]];
  for (let i = 0; i < 4; i++) {
    stroke(g, [rim[i], rim[i + 1]], { width: 0.22, pig: INK, load: 0.75, dry: 0.6, seed: 950 + i, taperStart: 0.02, taperEnd: 0.05, rough: 0.4 });
  }
  b.grass(70, 902, (x, y) => x > 2.5 && x < W - 2.5 && y > 2.5 && y < H - 2.5);
}

export const arena: RoomDef = {
  id: 'arena',
  area: 'storm',
  w: 26,
  h: 15,
  palette: 'storm',
  spawn: [13, 6],
  goal: [0, 1],
  music: 'storm',
  post: { washed: 0, night: 0.16, fog: 0.14, fogScale: 0.14, fogDrift: [0.12, 0.03] },
  build(b) {
    const g = b.game;
    const w = b.world;
    paintCourtyard(b);
    b.lamp(1.6, 13.2, 911, true);
    b.lamp(24.4, 13.2, 912, true);
    b.lamp(1.6, 1.4, 913, true);
    b.lamp(24.4, 1.4, 914, true);
    b.tree(6, 14.6, 915, 'pine', 0.9);
    b.tree(20, 14.6, 916, 'pine', 0.9);
    // light pools under the lamps (the court is dark)
    for (const [x, y] of [[1.6, 13.2], [24.4, 13.2], [1.6, 1.4], [24.4, 1.4]]) {
      w.scripts.push(() => w.vfx.glowAt(x, y + 1.2, 3.2, 0.03));
    }
    const storm = new Storm(w, 150);
    w.scripts.push((dt) => storm.update(dt));
    // keep the centre bright enough to read
    w.scripts.push(() => w.vfx.glowAt(w.player.x, w.player.y + 0.5, 4.5, 0.03));

    // --- waves ---
    let wave = -1;
    let state: 'intro' | 'spawn' | 'fight' | 'between' | 'victory' = 'intro';
    let stateT = 0;
    let pending = 0;
    let alive: Creature[] = [];
    const rng = new Rng(Date.now() & 0xffff);
    const startWave = (n: number) => {
      wave = n;
      state = 'spawn';
      stateT = 0;
      alive = [];
      const kinds = WAVES[n];
      pending = kinds.length;
      void g.story.show([`${t('wave')} ${n + 1} / ${WAVES.length}`], { size: 44, y: 300, hold: 1.0, italic: false });
      sfx.wave();
      kinds.forEach((k, i) => {
        g.after(0.5 + i * 0.35, () => {
          let x = 0, y = 0;
          for (let tries = 0; tries < 20; tries++) {
            x = rng.range(2.5, b.def.w - 2.5);
            y = rng.range(2.2, b.def.h - 2.5);
            if (Math.hypot(x - w.player.x, y - w.player.y) > 5) break;
          }
          w.tele.add({ kind: 'circle', r: k === 'brute' ? 1.0 : 0.6 }, x, y, 0, 0.9, {
            onFire: () => {
              const e = make(k, x, y);
              e.emerge = 0.6;
              w.add(e);
              alive.push(e);
              pending--;
              sfx.spawn();
              if (k === 'brute') g.hintOnce('brute', t('hintBrute'), 7);
            },
          });
        });
      });
    };
    const clearWave = () => {
      for (const e of alive) if (!e.dead) e.destroy();
      alive = [];
      w.tele.clear();
    };
    g.onRespawn = () => {
      // the wave starts again
      clearWave();
      void g.story.show([t('died')], { size: 40, y: 200, hold: 1.2 });
      g.after(1.6, () => startWave(Math.max(0, wave)));
    };
    g.onEnso = (_e, hits) => {
      if (hits > 0 && !g.flags.has('ensoDone')) g.flags.add('ensoDone');
    };
    let dashedOnce = false;
    w.scripts.push((dt) => {
      stateT += dt;
      const p = w.player;
      if (!dashedOnce && p.charges < 3) {
        dashedOnce = true;
        g.after(1.2, () => g.hintOnce('cut', t('hintTraitCut'), 5));
        g.after(7, () => g.hintOnce('enso', t('hintEnso'), 7));
      }
      const fighting = alive.some((e) => !e.dead);
      music.boss = fighting || state === 'spawn' ? Math.min(1, 0.45 + w.combo * 0.035) : 0.1;
      switch (state) {
        case 'intro':
          if (stateT > 0.1 && stateT - dt <= 0.1) {
            void g.story.show([t('arenaTitle'), t('arenaSub')], { size: 50, y: 250, hold: 2.2, italic: false, stagger: 0.8 });
            g.hintOnce('trait', g.input.device === 'pad' ? t('hintPadTrait') : t('hintTrait'), 8);
          }
          if (stateT > 4.5) startWave(0);
          break;
        case 'spawn':
          if (pending <= 0) { state = 'fight'; stateT = 0; }
          break;
        case 'fight':
          alive = alive.filter((e) => !e.dead);
          if (alive.length === 0) {
            state = 'between';
            stateT = 0;
          }
          break;
        case 'between':
          if (stateT > 2.2) {
            if (wave + 1 < WAVES.length) startWave(wave + 1);
            else {
              state = 'victory';
              stateT = 0;
              music.boss = 0;
              w.flash = 0.6;
              void g.story.show([t('victory1'), `${t('bestCombo')} : ${w.bestCombo}   ·   ${t('ensos')} : ${g.ensoCount}`], { size: 44, y: 220, hold: 4, italic: false, stagger: 1 });
              music.motif(false, 'flute', 1);
            }
          }
          break;
        case 'victory':
          if (stateT > 5) {
            g.hintOnce('again' + Math.floor(w.time), g.input.device === 'pad' ? t('againPad') : t('again'), 999);
            state = 'victory';
            stateT = -1e9;
          }
          if (stateT < -1e8 && g.input.pressed('attack')) {
            g.ensoCount = 0;
            w.bestCombo = 0;
            void g.travel('arena', [13, 6]);
          }
          break;
      }
      w.bossState = `wave ${wave + 1}/${WAVES.length} · ${state} · alive ${alive.filter((e) => !e.dead).length} · combo ${w.combo} (best ${w.bestCombo}) · ensō ${g.ensoCount}`;
    });
  },
};
