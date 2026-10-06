/**
 * The brush: the one primitive everything is drawn with.
 * A stroke is a smoothed path with a pressure profile, a wet body and individual
 * bristle tracks that break up as the brush runs dry.
 */
import { Painter, Pig, INK, pigStyle } from './paint';
import { noise } from './noise';
import { Rng } from './rng';

export type V2 = [number, number];

export interface StrokeOpts {
  /** Maximum width in world units. */
  width: number;
  pig?: Pig;
  /** Ink load 0..1 (overall density). */
  load?: number;
  /** Fraction of the length used to swell in / taper out. */
  taperStart?: number;
  taperEnd?: number;
  /** 0 = wet, 1 = very dry: bristles break into streaks towards the end. */
  dry?: number;
  bristles?: number;
  seed?: number;
  /** Wobble of the edges, as a fraction of width. */
  rough?: number;
  /** Strength of the wet body under the bristles (0..1). */
  body?: number;
  /** Extra darkness where the brush first touches. */
  press?: number;
  splatter?: number;
  /** Custom pressure profile (overrides tapers). */
  pressure?: (t: number) => number;
}

/** Catmull-Rom through points, resampled at roughly `step` spacing. */
export function smoothPath(pts: V2[], step: number): V2[] {
  if (pts.length < 2) return pts.slice();
  const dense: V2[] = [];
  const P = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(segLen / (step * 0.5)));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(pts[pts.length - 1]);
  // resample by arc length
  const out: V2[] = [dense[0]];
  let acc = 0;
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1], b = dense[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    acc += d;
    if (acc >= step) {
      out.push(b);
      acc = 0;
    }
  }
  const last = dense[dense.length - 1];
  const tail = out[out.length - 1];
  if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
  return out;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function stroke(p: Painter, pts: V2[], o: StrokeOpts): void {
  if (pts.length < 2) return;
  const ctx = p.ctx;
  const pig = o.pig ?? INK;
  const load = o.load ?? 1;
  const dry = o.dry ?? 0.3;
  const seed = o.seed ?? 1;
  const rough = o.rough ?? 0.15;
  const body = o.body ?? 0.6;
  const n = noise(seed % 997);
  const rng = new Rng(seed);
  const px = 1 / p.ppu;
  const step = Math.max(px * 1.5, o.width * 0.12);
  const path = smoothPath(pts, step);
  const N = path.length;
  if (N < 2) return;

  // cumulative length
  const len: number[] = [0];
  for (let i = 1; i < N; i++) len.push(len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = len[N - 1] || 1e-6;
  const ts = (o.taperStart ?? 0.12);
  const te = (o.taperEnd ?? 0.3);
  const pressure = o.pressure ?? ((t: number) => smooth(0, ts, t) * (1 - smooth(1 - te, 1, t) * 0.92) + 0.04);

  // normals and widths
  const nx: number[] = [], ny: number[] = [], w: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(N - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    nx.push(-dy); ny.push(dx);
    const t = len[i] / total;
    const jitter = 1 + rough * n.get(len[i] / (o.width * 1.5) + seed * 0.37, 3.1);
    w.push(Math.max(px * 0.8, o.width * pressure(t) * jitter));
  }

  ctx.save();
  // --- wet body ---
  if (body > 0) {
    const segs = Math.max(1, Math.ceil(N / 10));
    for (let s = 0; s < segs; s++) {
      const i0 = Math.floor((s * (N - 1)) / segs);
      const i1 = Math.min(N - 1, Math.floor(((s + 1) * (N - 1)) / segs) + 1);
      const tMid = len[Math.floor((i0 + i1) / 2)] / total;
      const a = load * body * (1 - dry * smooth(0.2, 1, tMid) * 0.85);
      if (a <= 0.01) continue;
      ctx.fillStyle = pigStyle(pig, a);
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const e = 0.5 + 0.08 * n.get(i * 0.7, seed);
        ctx.lineTo(path[i][0] + nx[i] * w[i] * e, path[i][1] + ny[i] * w[i] * e);
      }
      for (let i = i1; i >= i0; i--) {
        const e = 0.5 + 0.08 * n.get(i * 0.7, seed + 9);
        ctx.lineTo(path[i][0] - nx[i] * w[i] * e, path[i][1] - ny[i] * w[i] * e);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- bristles ---
  const maxWpx = o.width * p.ppu;
  const K = o.bristles ?? Math.max(3, Math.min(22, Math.round(maxWpx / 1.8)));
  const bw = Math.max(px * 0.9, (o.width / K) * 1.5);
  ctx.lineCap = 'round';
  ctx.lineWidth = bw;
  for (let k = 0; k < K; k++) {
    const off = K === 1 ? 0 : (k / (K - 1) - 0.5) * 0.92 + rng.gauss() * 0.04;
    const inkK = 0.55 + 0.45 * rng.next();
    const gapSeed = rng.next() * 100;
    let drawing = false;
    let runAlpha = 0;
    let runCount = 0;
    const flush = () => {
      if (drawing && runCount > 0) {
        ctx.strokeStyle = pigStyle(pig, Math.min(1, runAlpha / runCount));
        ctx.stroke();
      }
      drawing = false;
      runAlpha = 0;
      runCount = 0;
    };
    for (let i = 0; i < N; i++) {
      const t = len[i] / total;
      const g = n.get(len[i] / Math.max(o.width * 3.5, px * 14) + gapSeed, k * 0.97 + gapSeed) * 0.8 + 0.2 * n.get(len[i] / Math.max(o.width, px * 5), k * 3.1);
      const thresh = -1.15 + dry * 2.3 * Math.pow(smooth(0.05, 1, t), 1.3) + Math.abs(off) * dry * 0.8;
      const alive = g > thresh;
      if (!alive) {
        flush();
        continue;
      }
      const x = path[i][0] + nx[i] * w[i] * off;
      const y = path[i][1] + ny[i] * w[i] * off;
      if (!drawing) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        drawing = true;
      } else {
        ctx.lineTo(x, y);
      }
      const a = load * inkK * (0.5 + 0.35 * (1 - t * dry));
      runAlpha += a;
      runCount++;
      if (runCount > 8) {
        flush();
        ctx.beginPath();
        ctx.moveTo(x, y);
        drawing = true;
      }
    }
    flush();
  }

  // --- press: brush touching down ---
  const press = o.press ?? 0.35;
  if (press > 0) {
    p.dab(path[0][0], path[0][1], w[Math.min(2, N - 1)] * 0.65 + px, pig, load * press, 0.5);
  }

  // --- splatter ---
  const spl = o.splatter ?? 0;
  for (let s = 0; s < spl; s++) {
    const i = rng.chance(0.5) ? rng.int(0, Math.min(3, N - 1)) : rng.int(Math.max(0, N - 4), N - 1);
    const r = o.width * rng.range(0.04, 0.16);
    const d = o.width * rng.range(0.6, 2.2);
    const ang = rng.range(0, Math.PI * 2);
    p.circle(path[i][0] + Math.cos(ang) * d, path[i][1] + Math.sin(ang) * d, r, pig, load * rng.range(0.4, 0.9));
  }
  ctx.restore();
}

/** A quick dot of the brush tip (leaves, blossoms, moss). */
export function dot(p: Painter, x: number, y: number, r: number, pig: Pig, load: number, seed: number): void {
  const rng = new Rng(seed);
  const ang = rng.range(0, Math.PI);
  const ctx = p.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(1, rng.range(0.6, 0.95));
  ctx.fillStyle = pigStyle(pig, load * 0.55);
  ctx.beginPath();
  const n = noise(seed % 991);
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * (1 + 0.18 * n.get(Math.cos(a) * 1.3, Math.sin(a) * 1.3));
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.fill();
  // darker rim where pigment pools
  ctx.strokeStyle = pigStyle(pig, load * 0.35);
  ctx.lineWidth = r * 0.22;
  ctx.stroke();
  ctx.restore();
}

/** Quick line helper: a stroke between two points with a slight natural bow. */
export function line(p: Painter, a: V2, b: V2, o: StrokeOpts, bow = 0.08): void {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const r = new Rng(o.seed ?? 3);
  const k = bow * r.gauss();
  stroke(p, [a, [mx - dy * k, my + dx * k], b], o);
}
