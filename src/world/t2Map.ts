/** The Rice Terraces as a map: the pass, the terraced hill, the stream, the village, the lake, the grove, the pagoda. */
import type { Game } from '../game/game';
import type { Npc } from '../game/npc';
import { save } from '../game/progression';
import { lang } from '../i18n';
import { MapSource, Mark, blob, polyline } from '../ui/mapArt';
import { T2, T2_NORTH, T2_ROADS, T2_PONDS, T2_STREAM, T2_STREAM_HALF, T2_BRIDGE, T2_FIXED, T2_CAMPS, T2_SHRINES, T2_SLUICES, T2_REGIONS, T2_VILLAGE, T2_LAKE, T2_HILL, T2_PAGODA, T2_BASIN, T2_QUEEN, T2_STAIR_LAMPS, T2_JETTY, T2_ISLAND, T2_LOTUS, TERRACES } from './terraces';

export function t2MapSource(g: Game): MapSource {
  return {
    key: 'terraces',
    w: T2.w,
    h: T2.h,
    ppu: 4,
    cell: 4,
    sight: 15,
    paint(ctx) {
      for (let y = 1; y < T2_NORTH; y += 2) {
        for (let x = 1; x < T2.w; x += 2) {
          const d = TERRACES.forestDensity(x, y);
          if (d < 0.3 || TERRACES.isClearing(x, y)) continue;
          const bamboo = x > 138 && y > 86;
          ctx.fillStyle = bamboo ? `rgba(74,104,60,${(0.12 + d * 0.16).toFixed(3)})` : `rgba(58,80,60,${(0.1 + d * 0.16).toFixed(3)})`;
          blob(ctx, x, y, 1.1 + d * 0.9, x * 0.7 + y);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(64,60,66,0.32)';
      ctx.fillRect(0, T2_NORTH, T2.w, T2.h - T2_NORTH);
      // the terraced hill: rings of water
      for (let r = 8; r <= 30; r += 3.2) {
        ctx.strokeStyle = 'rgba(96,146,140,0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(T2_HILL.x, T2_HILL.y, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // the Great Basin's stone rim, the queen's clearing
      ctx.fillStyle = 'rgba(92,90,88,0.55)';
      ctx.fillRect(T2_BASIN.x - 3.4, T2_BASIN.y - 2.2, 6.8, 4.4);
      ctx.fillStyle = 'rgba(30,34,40,0.8)';
      ctx.fillRect(T2_BASIN.x - 2.6, T2_BASIN.y - 1.5, 5.2, 3);
      ctx.strokeStyle = 'rgba(80,110,70,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(T2_QUEEN.x, T2_QUEEN.y, T2_QUEEN.r, T2_QUEEN.r * 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const p of T2_PONDS) {
        ctx.fillStyle = 'rgba(64,98,156,0.5)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // the island, and the lotus path once the flute has raised it
      ctx.fillStyle = 'rgba(214,204,176,0.95)';
      ctx.beginPath();
      ctx.ellipse(T2_ISLAND.x, T2_ISLAND.y, T2_ISLAND.rx, T2_ISLAND.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      if (save.perks.lotus) {
        ctx.fillStyle = 'rgba(110,150,96,0.9)';
        const [ax, ay] = T2_LOTUS.a, [bx, by] = T2_LOTUS.b;
        for (let k = 0; k <= 10; k++) { ctx.beginPath(); ctx.arc(ax + ((bx - ax) * k) / 10, ay + ((by - ay) * k) / 10, 0.7, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(200,120,150,0.55)';
      for (let i = 0; i < 24; i++) { const a = i * 0.7; ctx.beginPath(); ctx.arc(T2_LAKE.x + Math.cos(a) * T2_LAKE.rx * 0.75, T2_LAKE.y + Math.sin(a) * T2_LAKE.ry * 0.75, 0.5, 0, Math.PI * 2); ctx.fill(); }
      const stream = T2_STREAM.map((s) => [s.x, s.y] as [number, number]);
      ctx.strokeStyle = 'rgba(72,108,166,0.75)';
      ctx.lineWidth = T2_STREAM_HALF * 2;
      polyline(ctx, stream);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(146,116,80,0.55)';
      for (const r of T2_ROADS) { ctx.lineWidth = r.w * 0.5; polyline(ctx, r.pts); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(104,72,44,0.95)';
      ctx.lineWidth = T2_BRIDGE.half * 2;
      polyline(ctx, [[T2_BRIDGE.x0 + 0.6, T2_BRIDGE.y], [T2_BRIDGE.x1 - 0.6, T2_BRIDGE.y]]);
      ctx.stroke();
      for (const f of T2_FIXED) {
        if (f.kind === 'house' || f.kind === 'hut') {
          const w = f.kind === 'house' ? 4.4 : 3;
          ctx.fillStyle = 'rgba(48,42,38,0.85)';
          polyline(ctx, [[f.x - w / 2 - 0.5, f.y + 0.6], [f.x, f.y + 2.4], [f.x + w / 2 + 0.5, f.y + 0.6]]);
          ctx.closePath();
          ctx.fill();
        } else if (f.kind === 'templeGate') {
          ctx.fillStyle = 'rgba(160,60,48,0.85)';
          ctx.fillRect(f.x - 3, f.y - 1, 6, 4);
        } else if (f.kind === 'pillar' || f.kind === 'broken' || f.kind === 'ruinWall') {
          ctx.fillStyle = 'rgba(92,90,88,0.6)';
          ctx.fillRect(f.x - 0.6, f.y - 0.6, 1.2, 1.2);
        }
      }
    },
    marks(): Mark[] {
      const out: Mark[] = [];
      for (const s of T2_SHRINES) out.push({ x: s.x, y: s.y, kind: save.shrines.includes(s.id) ? 'shrineOn' : 'shrine' });
      for (const c of T2_CAMPS) if (!save.camps.includes(c.id)) out.push({ x: c.x, y: c.y, kind: 'camp' });
      T2_SLUICES.forEach(([x, y], i) => out.push({ x, y, kind: save.sluices.includes(i) ? 'shrineOn' : 'relic' }));
      out.push({ x: T2_PAGODA.x, y: T2_PAGODA.y + 1, kind: 'door' });
      out.push({ x: T2_BASIN.x, y: T2_BASIN.y, kind: save.main >= 15 ? 'down' : 'basin' });
      if (!save.bosses.includes('queen') && save.main >= 19) out.push({ x: T2_QUEEN.x, y: T2_QUEEN.y, kind: 'boss' });
      if (save.quests.lanterns && !save.quests.lanterns.done) for (const [x, y] of T2_STAIR_LAMPS) out.push({ x, y, kind: 'side' });
      if (save.main === 21) out.push({ x: T2_JETTY[0], y: T2_JETTY[1], kind: 'goal' });
      if (save.main >= 22 && !save.bosses.includes('inkheron')) out.push({ x: T2_ISLAND.x, y: T2_ISLAND.y, kind: 'boss' });
      out.push({ x: 1, y: 70, kind: 'door' });
      for (const e of g.world.entities) {
        if (e.label !== 'npc' || e.dead) continue;
        out.push({ x: e.x, y: e.y, kind: (e as Npc).marker === 'quest' ? 'quest' : 'npc' });
      }
      return out;
    },
    labels() {
      return [
        { x: 22, y: 92, text: T2_REGIONS.pass.name[lang] },
        { x: T2_HILL.x, y: T2_HILL.y + 30, text: T2_REGIONS.terraces.name[lang] },
        { x: T2_VILLAGE.x, y: T2_VILLAGE.y - 12, text: T2_REGIONS.reeds.name[lang] },
        { x: T2_LAKE.x, y: T2_LAKE.y - 16, text: T2_REGIONS.lake.name[lang] },
        { x: 168, y: 132, text: T2_REGIONS.bamboo.name[lang] },
        { x: T2_PAGODA.x, y: T2_PAGODA.y - 12, text: T2_REGIONS.pagoda.name[lang] },
      ];
    },
  };
}
