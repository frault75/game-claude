/**
 * Maps: a painted sheet of each place (terrain once, in real colour), hidden under a fog that lifts
 * where the child has walked, with marks drawn on top (shrines, camps, doors, people, the goal).
 * Used by the minimap (HUD) and the big map (menu).
 */
import { save, writeSave } from '../game/progression';
import { SERIF } from '../gfx/text';

export type MarkKind =
  | 'player' | 'goal' | 'shrine' | 'shrineOn' | 'camp' | 'door' | 'arena' | 'npc' | 'quest'
  | 'stele' | 'steleRead' | 'up' | 'down' | 'basin' | 'boss' | 'relic' | 'side';

export interface Mark { x: number; y: number; kind: MarkKind; dir?: number }

export interface MapSource {
  /** Fog key in the save. */
  key: string;
  w: number;
  h: number;
  /** Pixels per world unit of the terrain sheet. */
  ppu: number;
  /** Fog cell size (world units) and how far the child sees. */
  cell: number;
  sight: number;
  /** World units from the centre to the minimap's rim. */
  view?: number;
  /** Paint the terrain (world units, y up, transparent paper). */
  paint(ctx: CanvasRenderingContext2D): void;
  marks(): Mark[];
  labels?(): { x: number; y: number; text: string }[];
}

// ---------- fog ----------

interface Fog { cw: number; ch: number; bits: Uint8Array; dirty: boolean; version: number }
const fogs = new Map<string, Fog>();
let fogOwner: unknown = null;

export function fogOf(src: MapSource): Fog {
  if (fogOwner !== save.fog) { fogs.clear(); fogOwner = save.fog; }
  let f = fogs.get(src.key);
  const cw = Math.ceil(src.w / src.cell), ch = Math.ceil(src.h / src.cell);
  if (!f || f.cw !== cw || f.ch !== ch) {
    const bits = new Uint8Array(cw * ch);
    const s = save.fog[src.key];
    if (s) for (let i = 0; i < bits.length; i++) {
      const v = parseInt(s[i >> 2] ?? '0', 16);
      bits[i] = (v >> (i & 3)) & 1;
    }
    f = { cw, ch, bits, dirty: false, version: 1 };
    fogs.set(src.key, f);
  }
  return f;
}

/** Lift the fog around a point; true if anything new was seen. */
export function reveal(src: MapSource, x: number, y: number): boolean {
  const f = fogOf(src);
  const r = src.sight, c = src.cell;
  let changed = false;
  for (let iy = Math.max(0, Math.floor((y - r) / c)); iy <= Math.min(f.ch - 1, Math.floor((y + r) / c)); iy++) {
    for (let ix = Math.max(0, Math.floor((x - r) / c)); ix <= Math.min(f.cw - 1, Math.floor((x + r) / c)); ix++) {
      const k = iy * f.cw + ix;
      if (f.bits[k]) continue;
      if (Math.hypot((ix + 0.5) * c - x, (iy + 0.5) * c - y) > r) continue;
      f.bits[k] = 1;
      changed = true;
    }
  }
  if (changed) { f.dirty = true; f.version++; }
  return changed;
}

export function seen(src: MapSource, x: number, y: number): boolean {
  const f = fogOf(src);
  const ix = Math.floor(x / src.cell), iy = Math.floor(y / src.cell);
  return ix >= 0 && iy >= 0 && ix < f.cw && iy < f.ch && f.bits[iy * f.cw + ix] === 1;
}

/** Write the fog into the save (call now and then). */
export function flushFog(): void {
  let any = false;
  for (const [key, f] of fogs) {
    if (!f.dirty) continue;
    let s = '';
    for (let i = 0; i < f.bits.length; i += 4) s += ((f.bits[i] | (f.bits[i + 1] << 1) | (f.bits[i + 2] << 2) | (f.bits[i + 3] << 3)) & 15).toString(16);
    save.fog[key] = s;
    f.dirty = false;
    any = true;
  }
  if (any) writeSave();
}

// ---------- sheets ----------

const terrains = new Map<string, HTMLCanvasElement>();
const composed = new Map<string, { c: HTMLCanvasElement; version: number }>();

function terrainOf(src: MapSource): HTMLCanvasElement {
  let c = terrains.get(src.key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil(src.w * src.ppu);
    c.height = Math.ceil(src.h * src.ppu);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(src.ppu, 0, 0, -src.ppu, 0, c.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // walked ground is faintly warmer than the blank sheet
    ctx.fillStyle = 'rgba(150,128,96,0.13)';
    ctx.fillRect(0, 0, src.w, src.h);
    src.paint(ctx);
    terrains.set(src.key, c);
  }
  return c;
}

/** The terrain where it has been seen, fading softly into the fog. */
export function sheet(src: MapSource): HTMLCanvasElement {
  const f = fogOf(src);
  const hit = composed.get(src.key);
  if (hit && hit.version === f.version) return hit.c;
  const t = terrainOf(src);
  const c = hit?.c ?? document.createElement('canvas');
  c.width = t.width;
  c.height = t.height;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(t, 0, 0);
  // fog mask: one pixel per cell, stretched smoothly
  const m = document.createElement('canvas');
  m.width = f.cw + 2;
  m.height = f.ch + 2;
  const mc = m.getContext('2d')!;
  const img = mc.createImageData(m.width, m.height);
  for (let iy = 0; iy < f.ch; iy++) for (let ix = 0; ix < f.cw; ix++) {
    if (!f.bits[iy * f.cw + ix]) continue;
    const k = ((m.height - 2 - iy) * m.width + ix + 1) * 4;
    img.data[k + 3] = 255;
  }
  mc.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.imageSmoothingEnabled = true;
  const cpx = src.cell * src.ppu;
  // anchored at the bottom row (world y = 0)
  ctx.drawImage(m, -cpx, c.height - (m.height - 1) * cpx, m.width * cpx, m.height * cpx);
  ctx.globalCompositeOperation = 'source-over';
  composed.set(src.key, { c, version: f.version });
  return c;
}

// ---------- marks ----------

const VERM = 'rgba(194,59,43,1)';
const INKC = 'rgba(34,32,30,0.9)';

/** Draw one mark centred on (x, y) in pixels; s = size in px. */
export function drawMark(ctx: CanvasRenderingContext2D, m: Mark, x: number, y: number, s: number, t = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (m.kind) {
    case 'player': {
      ctx.rotate(-(m.dir ?? Math.PI / 2) + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.1);
      ctx.lineTo(s * 0.75, s * 0.75);
      ctx.lineTo(0, s * 0.35);
      ctx.lineTo(-s * 0.75, s * 0.75);
      ctx.closePath();
      ctx.fillStyle = VERM;
      ctx.strokeStyle = 'rgba(245,238,222,0.95)';
      ctx.lineWidth = s * 0.28;
      ctx.stroke();
      ctx.fill();
      break;
    }
    case 'goal': {
      const k = 1 + Math.sin(t * 4) * 0.15;
      ctx.strokeStyle = VERM;
      ctx.lineWidth = s * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9 * k, 0.3, Math.PI * 2 - 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = VERM;
      ctx.fill();
      break;
    }
    case 'shrine':
    case 'shrineOn': {
      ctx.strokeStyle = INKC;
      ctx.lineWidth = s * 0.22;
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s * 0.5); ctx.lineTo(s * 0.7, -s * 0.5);
      ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(-s * 0.5, s * 0.6);
      ctx.moveTo(s * 0.5, -s * 0.5); ctx.lineTo(s * 0.5, s * 0.6);
      ctx.moveTo(-s * 0.8, -s * 0.15); ctx.lineTo(s * 0.8, -s * 0.15);
      ctx.stroke();
      if (m.kind === 'shrineOn') {
        ctx.beginPath();
        ctx.arc(0, s * 0.25, s * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = VERM;
        ctx.fill();
      }
      break;
    }
    case 'camp': {
      ctx.fillStyle = INKC;
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const r = s * (0.55 + 0.18 * Math.sin(a * 3 + 1));
        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.fill();
      break;
    }
    case 'door': {
      ctx.strokeStyle = INKC;
      ctx.lineWidth = s * 0.3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, s * 0.6);
      ctx.lineTo(-s * 0.6, -s * 0.1);
      ctx.arc(0, -s * 0.1, s * 0.6, Math.PI, 0);
      ctx.lineTo(s * 0.6, s * 0.6);
      ctx.stroke();
      break;
    }
    case 'arena': {
      ctx.fillStyle = INKC;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8, s * 0.17, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'npc': {
      ctx.fillStyle = INKC;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'quest':
    case 'boss':
    case 'relic': {
      ctx.fillStyle = m.kind === 'relic' ? 'rgba(219,168,51,1)' : VERM;
      const k = m.kind === 'boss' ? 0.75 : 0.55;
      ctx.fillRect(-s * k, -s * k, s * k * 2, s * k * 2);
      ctx.fillStyle = 'rgba(245,238,222,0.95)';
      ctx.fillRect(-s * 0.08, -s * k * 0.6, s * 0.16, s * k * 1.2);
      break;
    }
    case 'stele':
    case 'steleRead': {
      ctx.fillStyle = m.kind === 'stele' ? INKC : 'rgba(34,32,30,0.35)';
      ctx.fillRect(-s * 0.22, -s * 0.6, s * 0.44, s * 1.2);
      break;
    }
    case 'up':
    case 'down': {
      ctx.strokeStyle = INKC;
      ctx.lineWidth = s * 0.2;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) { const yy = -s * 0.5 + k * s * 0.5; const ww = s * (0.4 + k * 0.2) * (m.kind === 'up' ? 1 : 1.6 - k * 0.4); ctx.moveTo(-ww, yy); ctx.lineTo(ww, yy); }
      ctx.stroke();
      break;
    }
    case 'side': {
      // a side quest: a hollow vermilion diamond
      ctx.strokeStyle = VERM;
      ctx.lineWidth = s * 0.26;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s * 0.85); ctx.lineTo(-s * 0.7, 0); ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = VERM;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'basin': {
      ctx.fillStyle = 'rgba(58,92,150,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/** Region names in brush italics, centred at (x, y) px. */
export function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number): void {
  ctx.save();
  ctx.font = `italic 600 ${px}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = px * 0.3;
  ctx.strokeStyle = 'rgba(244,237,221,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = 'rgba(40,36,32,0.95)';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------- painting helpers (world units) ----------

export function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number): void {
  ctx.beginPath();
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const rr = r * (0.8 + 0.25 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 5 + seed * 1.7));
    if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function polyline(ctx: CanvasRenderingContext2D, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
}
