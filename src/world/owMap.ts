/** The open world as a map: river, woods, roads, the hamlet, ruins and mountains; marks from the save. */
import type { Game } from '../game/game';
import type { Npc } from '../game/npc';
import { save } from '../game/progression';
import { lang } from '../i18n';
import { MapSource, Mark, blob, polyline } from '../ui/mapArt';
import {
  WORLD, NORTH_WALL, RIVER_SAMPLES, RIVER_HALF, ROAD, PATHS, PONDS, PADDIES, FIXED, BRIDGE, ARENA, CAVE, TEMPLE,
  SHRINES, CAMPS, STELE_SPOTS, REGIONS, VILLAGE, CHESTS, GLADES, ISLETS, forestDensity, isClearing,
} from './layout';

export function owMapSource(g: Game): MapSource {
  return {
    key: 'overworld',
    w: WORLD.w,
    h: WORLD.h,
    ppu: 4,
    cell: 4,
    sight: 15,
    paint(ctx) {
      // woods
      for (let y = 1; y < NORTH_WALL; y += 2) {
        for (let x = 1; x < WORLD.w; x += 2) {
          const d = forestDensity(x, y);
          if (d < 0.3 || isClearing(x, y)) continue;
          ctx.fillStyle = `rgba(58,80,60,${(0.1 + d * 0.16).toFixed(3)})`;
          blob(ctx, x, y, 1.1 + d * 0.9, x * 0.7 + y);
          ctx.fill();
        }
      }
      // mountains closing the north
      ctx.fillStyle = 'rgba(64,60,66,0.32)';
      ctx.fillRect(0, NORTH_WALL, WORLD.w, WORLD.h - NORTH_WALL);
      ctx.strokeStyle = 'rgba(40,38,42,0.8)';
      ctx.lineWidth = 0.45;
      for (let x = -2; x < WORLD.w; x += 7) {
        const hgt = 4 + ((x * 37) % 5);
        polyline(ctx, [[x, NORTH_WALL + 0.5], [x + 3.5, NORTH_WALL + hgt], [x + 7.5, NORTH_WALL + 0.5]]);
        ctx.stroke();
      }
      // flooded paddies
      for (const p of PADDIES) {
        ctx.fillStyle = 'rgba(104,150,148,0.38)';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.strokeStyle = 'rgba(70,96,90,0.6)';
        ctx.lineWidth = 0.2;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
      // ponds
      for (const p of PONDS) {
        ctx.fillStyle = 'rgba(64,98,156,0.5)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // the river
      const river = RIVER_SAMPLES.map((s) => [s.x, s.y] as [number, number]);
      ctx.strokeStyle = 'rgba(40,64,112,0.55)';
      ctx.lineWidth = RIVER_HALF * 2 + 0.7;
      polyline(ctx, river);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(72,108,166,0.75)';
      ctx.lineWidth = RIVER_HALF * 2 - 0.3;
      polyline(ctx, river);
      ctx.stroke();
      // roads and paths
      ctx.strokeStyle = 'rgba(146,116,80,0.55)';
      ctx.lineWidth = 1.3;
      polyline(ctx, ROAD);
      ctx.stroke();
      ctx.lineWidth = 0.8;
      for (const p of PATHS) { polyline(ctx, p); ctx.stroke(); }
      // the old bridge
      ctx.strokeStyle = 'rgba(104,72,44,0.95)';
      ctx.lineWidth = BRIDGE.half * 2;
      polyline(ctx, [[BRIDGE.x0 + 0.6, BRIDGE.y], [BRIDGE.x1 - 0.6, BRIDGE.y]]);
      ctx.stroke();
      // glades: a ring of thorns, bamboo or stones
      for (const gl of GLADES) {
        ctx.strokeStyle = gl.gate === 'thorn' ? 'rgba(40,36,40,0.75)' : gl.gate === 'thicket' ? 'rgba(58,90,60,0.75)' : 'rgba(90,88,86,0.8)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(gl.x, gl.y, gl.r, gl.r * 0.85, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // the stone circle
      ctx.strokeStyle = 'rgba(60,58,56,0.7)';
      ctx.lineWidth = 0.7;
      ctx.setLineDash([1.2, 1.4]);
      ctx.beginPath();
      ctx.arc(ARENA.x, ARENA.y, ARENA.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // the temple pool
      if (!save.bosses.includes('ramking')) {
        ctx.fillStyle = 'rgba(64,98,156,0.5)';
        ctx.beginPath();
        ctx.ellipse(TEMPLE.x, TEMPLE.y - 0.6, 7.5, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // buildings and ruins
      for (const f of FIXED) {
        switch (f.kind) {
          case 'house':
          case 'hut': {
            const w = f.kind === 'house' ? 4.4 : 3;
            ctx.fillStyle = 'rgba(48,42,38,0.85)';
            polyline(ctx, [[f.x - w / 2 - 0.5, f.y + 0.6], [f.x, f.y + 2.4], [f.x + w / 2 + 0.5, f.y + 0.6]]);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(120,100,80,0.6)';
            ctx.fillRect(f.x - w / 2, f.y - 0.6, w, 1.2);
            break;
          }
          case 'stallDyer':
          case 'stallFood':
          case 'stallPots':
            ctx.fillStyle = f.kind === 'stallDyer' ? 'rgba(194,59,43,0.8)' : 'rgba(110,90,70,0.7)';
            ctx.fillRect(f.x - 1.4, f.y - 0.6, 2.8, 1.2);
            break;
          case 'well':
            ctx.strokeStyle = 'rgba(48,42,38,0.85)';
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 0.8, 0, Math.PI * 2);
            ctx.stroke();
            break;
          case 'bigWillow':
            ctx.fillStyle = 'rgba(70,96,64,0.6)';
            blob(ctx, f.x, f.y + 1, 3, 4);
            ctx.fill();
            break;
          case 'fence':
            ctx.strokeStyle = 'rgba(80,66,50,0.6)';
            ctx.lineWidth = 0.25;
            polyline(ctx, [[f.x - 1.6, f.y], [f.x + 1.6, f.y]]);
            ctx.stroke();
            break;
          case 'pillar':
          case 'broken':
          case 'ruinWall':
            ctx.fillStyle = 'rgba(92,90,88,0.6)';
            ctx.fillRect(f.x - (f.kind === 'ruinWall' ? 1.6 : 0.6), f.y - 0.6, f.kind === 'ruinWall' ? 3.2 : 1.2, 1.2);
            break;
          case 'cave':
            ctx.fillStyle = 'rgba(30,28,28,0.9)';
            blob(ctx, f.x, f.y + 1, 1.8, 7);
            ctx.fill();
            break;
          case 'templeGate':
            ctx.fillStyle = 'rgba(120,96,50,0.8)';
            ctx.fillRect(f.x - 3, f.y - 1, 6, 3.5);
            break;
          default:
            break;
        }
      }
    },
    marks(): Mark[] {
      const out: Mark[] = [];
      for (const s of SHRINES) out.push({ x: s.x, y: s.y, kind: save.shrines.includes(s.id) ? 'shrineOn' : 'shrine' });
      for (const c of CAMPS) if (!save.camps.includes(c.id)) out.push({ x: c.x, y: c.y, kind: 'camp' });
      STELE_SPOTS.forEach(([x, y], i) => out.push({ x, y, kind: save.steles.includes(i) ? 'steleRead' : 'stele' }));
      for (const c of CHESTS) if (!save.chests.includes(c.id)) out.push({ x: c.x, y: c.y, kind: 'chest' });
      for (const gl of GLADES) if (!save.chests.includes(gl.chest.id)) out.push({ x: gl.x, y: gl.y, kind: 'chest' });
      for (const is of ISLETS) if (!save.chests.includes(is.chest.id)) out.push({ x: PONDS[is.pond].x, y: PONDS[is.pond].y, kind: 'chest' });
      out.push({ x: CAVE.x, y: CAVE.y, kind: 'door' }, { x: TEMPLE.x, y: TEMPLE.y + 1, kind: 'door' });
      out.push({ x: ARENA.x, y: ARENA.y, kind: save.bosses.includes('ramking') ? 'arena' : 'boss' });
      for (const e of g.world.entities) {
        if (e.label !== 'npc' || e.dead) continue;
        out.push({ x: e.x, y: e.y, kind: (e as Npc).marker === 'quest' ? 'quest' : 'npc' });
      }
      return out;
    },
    labels() {
      return [
        { x: VILLAGE.x, y: VILLAGE.y + 13, text: REGIONS.village.name[lang] },
        { x: 46, y: 84, text: REGIONS.orchard.name[lang] },
        { x: 118, y: 58, text: REGIONS.plain.name[lang] },
        { x: ARENA.x, y: ARENA.y + ARENA.r + 3, text: REGIONS.arena.name[lang] },
        { x: CAVE.x, y: CAVE.y - 5, text: REGIONS.cave.name[lang] },
        { x: TEMPLE.x, y: TEMPLE.y + 8, text: REGIONS.temple.name[lang] },
      ];
    },
  };
}
