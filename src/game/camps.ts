/** Camps in an open world: they wake when the child comes near, are cleansed when every member falls. */
import type { Game } from './game';
import type { RoomBuilder } from './room';
import type { Creature } from './enemies';
import type { CampDef, EnemyKind } from '../world/layout';
import { save, writeSave } from './progression';
import { giveXp } from './rewards';
import { dropLoot } from './loot';
import { sfx } from '../audio/sfx';
import { t } from '../i18n';

interface CampState { def: CampDef; state: 'dormant' | 'active' | 'cleared'; members: Creature[] }

export function runCamps(g: Game, b: RoomBuilder, defs: CampDef[], make: (k: EnemyKind, x: number, y: number) => Creature, onCleared?: (c: CampDef) => void): void {
  const w = g.world;
  const camps: CampState[] = defs.map((def) => ({ def, state: save.camps.includes(def.id) ? 'cleared' : 'dormant', members: [] }));
  const spawn = (c: CampState) => {
    c.state = 'active';
    let elites = c.def.elites;
    c.def.members.forEach((kind, i) => {
      const a = (i / c.def.members.length) * Math.PI * 2 + c.def.id;
      const rr = kind === 'totem' ? 0 : c.def.r * (0.4 + 0.5 * ((i * 37) % 10) / 10);
      const e = make(kind, c.def.x + Math.cos(a) * rr, c.def.y + Math.sin(a) * rr * 0.8);
      const elite = elites > 0 && kind !== 'mite' && kind !== 'totem';
      if (elite) elites--;
      e.setup(c.def.tier, elite);
      e.home = [c.def.x, c.def.y];
      b.add(e);
      c.members.push(e);
    });
  };
  w.scripts.push(() => {
    const p = w.player;
    for (const c of camps) {
      if (c.state === 'cleared') continue;
      const d = Math.hypot(p.x - c.def.x, p.y - c.def.y);
      if (c.state === 'dormant' && d < 20) spawn(c);
      else if (c.state === 'active') {
        c.members = c.members.filter((e) => !e.dead);
        if (!c.members.length) {
          c.state = 'cleared';
          save.camps.push(c.def.id);
          writeSave();
          const bonus = 15 * c.def.tier;
          g.hud.showHint(`${t('campCleared')}  +${bonus}`, 2.5);
          giveXp(g, bonus);
          if (Math.random() < 0.3) dropLoot(g, c.def.x, c.def.y, 'normal', c.def.tier * 2);
          sfx.wave();
          w.vfx.ripple(c.def.x, c.def.y, 3);
          onCleared?.(c.def);
        } else if (d > 38 || p.state === 'dead') {
          for (const e of c.members) e.destroy();
          c.members = [];
          c.state = 'dormant';
        }
      }
    }
  });
}
