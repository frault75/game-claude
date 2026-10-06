/**
 * Washes: diluted ink or pigment laid on wet or dry paper.
 * Wet washes have soft edges; dry washes have crisp edges where pigment pools darker.
 */
import { Painter, Pig, pigStyle } from './paint';
import { noise } from './noise';
import { Rng } from './rng';
import type { V2 } from './brush';

export interface WashOpts {
  pig: Pig;
  /** Density 0..1 */
  density: number;
  /** 0 = crisp edge, 1 = very soft edge */
  soft?: number;
  /** Darker rim where pigment pools (0..1), only meaningful when not too soft. */
  edge?: number;
  /** Outline irregularity (fraction of radius). */
  rough?: number;
  /** Number of blooms (backruns). */
  blooms?: number;
  seed?: number;
}

function blobOutline(cx: number, cy: number, rx: number, ry: number, rough: number, seed: number, rot = 0): V2[] {
  const n = noise(seed % 983);
  const pts: V2[] = [];
  const steps = Math.max(24, Math.min(160, Math.round((rx + ry) * 18)));
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const k = 1 + rough * (n.fbm(ca * 1.1 + seed * 0.01, sa * 1.1, 3) * 1.0 + 0.35 * n.get(ca * 4, sa * 4));
    const x = ca * rx * k, y = sa * ry * k;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return pts;
}

function fillPoly(p: Painter, pts: V2[], scale: number, cx: number, cy: number): void {
  const ctx = p.ctx;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const x = cx + (pts[i][0] - cx) * scale, y = cy + (pts[i][1] - cy) * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function centroid(pts: V2[]): V2 {
  let x = 0, y = 0;
  for (const q of pts) { x += q[0]; y += q[1]; }
  return [x / pts.length, y / pts.length];
}

let scratch: HTMLCanvasElement | null = null;

/**
 * Wet-on-wet: paint the shape small, then enlarge it with smoothing so the edge melts.
 * Cheap and portable (no ctx.filter).
 */
function softFill(p: Painter, pts: V2[], pig: Pig, density: number, soft: number): void {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const q of pts) {
    if (q[0] < minX) minX = q[0];
    if (q[1] < minY) minY = q[1];
    if (q[0] > maxX) maxX = q[0];
    if (q[1] > maxY) maxY = q[1];
  }
  const pad = (maxX - minX + maxY - minY) * 0.12 * soft + 2 / p.ppu;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const wPx = (maxX - minX) * p.ppu, hPx = (maxY - minY) * p.ppu;
  const down = Math.max(2, Math.min(24, Math.round(Math.min(wPx, hPx) * 0.06 * soft + 2)));
  const sw = Math.max(2, Math.ceil(wPx / down)), sh = Math.max(2, Math.ceil(hPx / down));
  if (!scratch) scratch = document.createElement('canvas');
  scratch.width = sw;
  scratch.height = sh;
  const sc = scratch.getContext('2d')!;
  sc.setTransform(sw / (maxX - minX), 0, 0, -sh / (maxY - minY), -minX * sw / (maxX - minX), sh + minY * sh / (maxY - minY));
  sc.clearRect(minX, minY, maxX - minX, maxY - minY);
  sc.fillStyle = pigStyle(pig, density);
  sc.beginPath();
  pts.forEach((q, i) => (i === 0 ? sc.moveTo(q[0], q[1]) : sc.lineTo(q[0], q[1])));
  sc.closePath();
  sc.fill();
  const ctx = p.ctx;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // draw with y flipped back (image space is y-down)
  ctx.translate(minX, maxY);
  ctx.scale(1, -1);
  ctx.drawImage(scratch, 0, 0, sw, sh, 0, 0, maxX - minX, maxY - minY);
  ctx.restore();
}

/** Lay a wash inside an arbitrary outline (pre-noised or not). */
export function washPoly(p: Painter, pts: V2[], o: WashOpts): void {
  const ctx = p.ctx;
  const soft = o.soft ?? 0.3;
  const edge = o.edge ?? 0.4;
  const [cx, cy] = centroid(pts);
  ctx.save();
  if (soft > 0.45) {
    softFill(p, pts, o.pig, o.density, soft);
  } else if (soft > 0.05) {
    const layers = 7;
    for (let l = 0; l < layers; l++) {
      const s = 1 - soft * 0.45 * (l / (layers - 1));
      ctx.fillStyle = pigStyle(o.pig, o.density / layers * 1.15);
      fillPoly(p, pts, s, cx, cy);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = pigStyle(o.pig, o.density * 0.85);
    fillPoly(p, pts, 1, cx, cy);
    ctx.fill();
  }
  if (edge > 0 && soft < 0.7) {
    // pooled pigment at the rim
    let r = 0;
    for (const q of pts) r += Math.hypot(q[0] - cx, q[1] - cy);
    r /= pts.length;
    ctx.strokeStyle = pigStyle(o.pig, o.density * edge * 0.55 * (1 - soft));
    ctx.lineWidth = Math.max(1.2 / p.ppu, r * 0.035);
    fillPoly(p, pts, 1 - (1.4 / p.ppu) / Math.max(r, 0.01), cx, cy);
    ctx.stroke();
  }
  const blooms = o.blooms ?? 0;
  if (blooms > 0) {
    const rng = new Rng((o.seed ?? 1) + 77);
    let r = 0;
    for (const q of pts) r += Math.hypot(q[0] - cx, q[1] - cy);
    r /= pts.length;
    for (let b = 0; b < blooms; b++) {
      const bx = cx + rng.gauss() * r * 0.5, by = cy + rng.gauss() * r * 0.5;
      const br = r * rng.range(0.12, 0.3);
      const bp = blobOutline(bx, by, br, br * rng.range(0.7, 1), 0.35, rng.int(1, 9999));
      // lift a little pigment, leave a darker cauliflower edge
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${0.35 * o.density})`;
      fillPoly(p, bp, 1, bx, by);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = pigStyle(o.pig, o.density * 0.3);
      ctx.lineWidth = Math.max(1 / p.ppu, br * 0.08);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function washBlob(p: Painter, cx: number, cy: number, rx: number, ry: number, o: WashOpts & { rot?: number }): void {
  const pts = blobOutline(cx, cy, rx, ry, o.rough ?? 0.22, o.seed ?? 1, o.rot ?? 0);
  washPoly(p, pts, o);
}

/** Noisy outline helper for other generators. */
export function noisyOutline(cx: number, cy: number, rx: number, ry: number, rough: number, seed: number, rot = 0): V2[] {
  return blobOutline(cx, cy, rx, ry, rough, seed, rot);
}

/** Displace an arbitrary polygon outline with noise, densifying it first. */
export function roughen(pts: V2[], amount: number, seed: number, step = 0.15): V2[] {
  const n = noise(seed % 977);
  const out: V2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(d / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      out.push([x + amount * n.get(x * 1.7, y * 1.7), y + amount * n.get(x * 1.7 + 40, y * 1.7 - 20)]);
    }
  }
  return out;
}

/** A wide, flat brush sweep: used for ground bands, paths and banks. */
export function sweep(p: Painter, path: V2[], width: number, o: WashOpts): void {
  const ctx = p.ctx;
  const n = noise((o.seed ?? 1) % 971);
  const left: V2[] = [], right: V2[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const ww = width * 0.5 * (1 + (o.rough ?? 0.25) * n.fbm(path[i][0] * 0.5, path[i][1] * 0.5, 3));
    left.push([path[i][0] - dy * ww, path[i][1] + dx * ww]);
    right.push([path[i][0] + dy * ww, path[i][1] - dx * ww]);
  }
  const poly = left.concat(right.reverse());
  ctx.save();
  washPoly(p, poly, o);
  ctx.restore();
}
