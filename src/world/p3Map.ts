/** The White Peaks as a map: the stair, the monastery, the frost forest, the glacier, the erased valley, the summit. */
import type { Game } from '../game/game';
import type { Npc } from '../game/npc';
import { save } from '../game/progression';
import { lang } from '../i18n';
import { MapSource, Mark, blob, polyline } from '../ui/mapArt';
import { P3, P3_NORTH, P3_ROADS, P3_PONDS, P3_FIXED, P3_CAMPS, P3_SHRINES, P3_REGIONS, P3_MONASTERY, P3_SUMMIT, P3_BELLS, P3_CREVASSES, P3_TEARS, P3_KING, P3_DRAGON, P3_GATE, P3_HAND, PEAKS, p3RingArc, p3RegionAt } from './peaks';

export function p3MapSource(g: Game): MapSource {
  return {
    key: 'peaks',
    w: P3.w,
    h: P3.h,
    ppu: 4,
    cell: 4,
    sight: 15,
    paint(ctx) {
      for (let y = 1; y < P3_NORTH; y += 2) {
        for (let x = 1; x < P3.w; x += 2) {
          const reg = p3RegionAt(x, y);
          if (reg === 'glacier') { ctx.fillStyle = 'rgba(150,196,220,0.18)'; ctx.fillRect(x - 1, y - 1, 2, 2); }
          if (reg === 'erased') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 1, y - 1, 2, 2); }
          const d = PEAKS.forestDensity(x, y);
          if (d < 0.3 || PEAKS.isClearing(x, y)) continue;
          ctx.fillStyle = `rgba(60,78,74,${(0.1 + d * 0.16).toFixed(3)})`;
          blob(ctx, x, y, 1.1 + d * 0.9, x * 0.7 + y);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(64,60,66,0.32)';
      ctx.fillRect(0, P3_NORTH, P3.w, P3.h - P3_NORTH);
      for (const p of P3_PONDS) {
        ctx.fillStyle = 'rgba(150,190,214,0.6)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(30,34,44,0.85)';
      for (const c of [...P3_CREVASSES, ...P3_TEARS]) { polyline(ctx, c); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = 'rgba(120,120,130,0.6)';
      ctx.lineWidth = 1.6;
      for (const arc of p3RingArc()) { polyline(ctx, arc); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(146,116,80,0.55)';
      for (const r of P3_ROADS) { ctx.lineWidth = r.w * 0.5; polyline(ctx, r.pts); ctx.stroke(); }
      for (const f of P3_FIXED) {
        if (f.kind === 'house' || f.kind === 'hut') {
          const w = f.kind === 'house' ? 4.4 : 3;
          ctx.fillStyle = 'rgba(48,42,38,0.85)';
          polyline(ctx, [[f.x - w / 2 - 0.5, f.y + 0.6], [f.x, f.y + 2.4], [f.x + w / 2 + 0.5, f.y + 0.6]]);
          ctx.closePath();
          ctx.fill();
        } else if (f.kind === 'templeGate') {
          ctx.fillStyle = 'rgba(160,60,48,0.85)';
          ctx.fillRect(f.x - 3, f.y - 1, 6, 4);
        }
      }
    },
    marks(): Mark[] {
      const out: Mark[] = [];
      for (const s of P3_SHRINES) out.push({ x: s.x, y: s.y, kind: save.shrines.includes(s.id) ? 'shrineOn' : 'shrine' });
      for (const c of P3_CAMPS) if (!save.camps.includes(c.id)) out.push({ x: c.x, y: c.y, kind: 'camp' });
      P3_BELLS.forEach(([x, y], i) => out.push({ x, y, kind: save.perks['bell' + i] ? 'shrineOn' : 'relic' }));
      out.push({ x: P3.w / 2, y: 1, kind: 'door' });
      if (save.main >= 33 && !save.perks.summitOpen) out.push({ x: P3_GATE.x, y: P3_GATE.y, kind: 'door' });
      if (save.main === 33 && !save.bosses.includes('hand')) out.push({ x: P3_HAND.x, y: P3_HAND.y, kind: 'boss' });
      if (save.main >= 31) {
        if (!save.bosses.includes('snowking')) out.push({ x: P3_KING.x, y: P3_KING.y, kind: 'boss' });
        if (!save.bosses.includes('dragon')) out.push({ x: P3_DRAGON.x, y: P3_DRAGON.y, kind: 'boss' });
      }
      for (const e of g.world.entities) {
        if (e.label !== 'npc' || e.dead) continue;
        out.push({ x: e.x, y: e.y, kind: (e as Npc).marker === 'quest' ? 'quest' : 'npc' });
      }
      return out;
    },
    labels() {
      return [
        { x: 100, y: 22, text: P3_REGIONS.stair.name[lang] },
        { x: P3_MONASTERY.x, y: P3_MONASTERY.y - 13, text: P3_REGIONS.monastery.name[lang] },
        { x: 34, y: 76, text: P3_REGIONS.forest.name[lang] },
        { x: 168, y: 70, text: P3_REGIONS.glacier.name[lang] },
        { x: 100, y: 112, text: P3_REGIONS.erased.name[lang] },
        { x: 120, y: 82, text: P3_REGIONS.slopes.name[lang] },
        { x: P3_SUMMIT.x, y: P3_SUMMIT.y - 8, text: P3_REGIONS.summit.name[lang] },
      ];
    },
  };
}
