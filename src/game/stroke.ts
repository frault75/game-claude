/**
 * The Trait: every dash lays a vermilion stroke. Fresh strokes are solid ink for a moment
 * (bridges, shields). When a new stroke crosses a fresh one, the loop closes: an ensō.
 */
import * as THREE from 'three';
import type { World } from './world';
import { Ribbon } from '../gfx/ribbon';
import { Painter, INK } from '../gfx/paint';
import { Sprite, LAYER } from '../gfx/sprite';
import { stroke as brushStroke } from '../gfx/brush';
import { dot } from '../gfx/brush';
import { closestOnSeg, distToSeg, pointInPoly, segIntersect, V } from './physics';
import { Rng } from '../gfx/rng';
import { INKS, InkId } from './inks';

export const STROKE = {
  life: 2.4,
  width: 0.2,
  minLoopArea: 1.1,
  snapClose: 0.75,
};

export interface Seg {
  ink: InkId;
  ax: number; ay: number; bx: number; by: number;
  born: number;
  ribbon: Ribbon;
  seed: number;
  live: boolean; // still being drawn (dash in progress)
  /** Part of an ensō painted by the button: only the loop acts, not each piece. */
  quiet?: boolean;
}

export interface Enso {
  ink: InkId;
  poly: V[];
  area: number;
  cx: number;
  cy: number;
}

/** Permanent faint marks left by the fight: coloured traces and black splats (one area of the world). */
class StainLayer {
  readonly red: Painter;
  readonly ink: Painter;
  private redS: Sprite;
  private inkS: Sprite;
  private dirtyT = 0;
  private dirty = false;
  constructor(w: World, x: number, y: number, size: number) {
    const ppu = size > 60 ? 12 : 24;
    this.red = new Painter(size, size, ppu, x, y);
    this.red.over();
    this.ink = new Painter(size, size, ppu, x, y);
    this.ink.glaze();
    this.redS = new Sprite(this.red);
    this.inkS = new Sprite(this.ink);
    this.redS.mesh.renderOrder = LAYER.groundDetail + 1;
    this.inkS.mesh.renderOrder = LAYER.groundDetail + 1;
    w.r.sceneAcc.add(this.redS.mesh);
    w.r.scenePig.add(this.inkS.mesh);
    w.roomSprites.push(this.redS, this.inkS);
  }
  mark(): void {
    this.dirty = true;
  }
  update(dt: number): void {
    this.dirtyT -= dt;
    if (this.dirty && this.dirtyT <= 0) {
      (this.redS.mat.uniforms.map.value as THREE.Texture).needsUpdate = true;
      (this.inkS.mat.uniforms.map.value as THREE.Texture).needsUpdate = true;
      this.dirty = false;
      this.dirtyT = 0.25;
    }
  }
}

export class Strokes {
  segs: Seg[] = [];
  private fills: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; rgb: [number, number, number] }[] = [];
  private stains: StainLayer | null = null;
  private rng = new Rng(77);
  private seedN = 1;
  onEnso?: (e: Enso) => void;

  constructor(private w: World) {}

  onSegment?: (s: Seg) => void;
  private stainCenter: V = [0, 0];
  private stainSize = 0;

  /** Call after a room is built (bounds known). Open worlds keep stains near the child only. */
  reset(): void {
    for (const s of this.segs) s.ribbon.dispose();
    this.segs = [];
    for (const f of this.fills) { f.mesh.removeFromParent(); f.mesh.geometry.dispose(); f.mat.dispose(); }
    this.fills = [];
    const b = this.w.bounds;
    if (b.w <= 60 && b.h <= 60) {
      this.stains = new StainLayer(this.w, b.x, b.y, Math.max(b.w, b.h));
      this.stainSize = 0;
    } else {
      this.stains = null;
      this.stainSize = 48;
    }
  }

  /** Open world: a stain sheet follows the child, re-centred when it walks off its middle. */
  private ensureStains(x: number, y: number): void {
    if (!this.stainSize) return;
    const s = this.stainSize;
    if (this.stains && Math.abs(x - this.stainCenter[0]) < s * 0.3 && Math.abs(y - this.stainCenter[1]) < s * 0.3) return;
    if (this.stains) {
      (this.stains as unknown as { redS: Sprite; inkS: Sprite }).redS.dispose();
      (this.stains as unknown as { redS: Sprite; inkS: Sprite }).inkS.dispose();
    }
    this.stainCenter = [x, y];
    this.stains = new StainLayer(this.w, x - s / 2, y - s / 2, s);
  }

  /** Start a stroke; extend it with `extend` while drawing. */
  begin(x: number, y: number, ink: InkId = 'vermilion'): Seg {
    this.ensureStains(x, y);
    const seg: Seg = {
      ink,
      ax: x, ay: y, bx: x, by: y, born: this.w.time,
      ribbon: new Ribbon(14, this.w.r.sceneAcc, { density: 1, dry: 0.15, taper: 0.55, order: LAYER.groundDetail + 20, color: INKS[ink].rgb }),
      seed: this.seedN++,
      live: true,
    };
    this.segs.push(seg);
    this.drawSeg(seg, 0);
    return seg;
  }

  extend(seg: Seg, x: number, y: number): void {
    seg.bx = x;
    seg.by = y;
    seg.born = this.w.time;
  }

  /** The dash ended: look for a closed loop. */
  finish(seg: Seg): Enso | null {
    seg.live = false;
    if (Math.hypot(seg.bx - seg.ax, seg.by - seg.ay) < 0.3) {
      this.remove(seg);
      return null;
    }
    if (!seg.quiet) this.onSegment?.(seg);
    const n = this.segs.indexOf(seg);
    const A: V = [seg.ax, seg.ay], B: V = [seg.bx, seg.by];
    // newest-first: the loop the player just drew (only strokes of the same ink close it)
    for (let k = n - 1; k >= 0; k--) {
      const s = this.segs[k];
      if (s.ink !== seg.ink) continue;
      const t = segIntersect(A[0], A[1], B[0], B[1], s.ax, s.ay, s.bx, s.by);
      let X: V | null = null;
      let fromK = k;
      if (t > 0.04) {
        X = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
      } else if (k <= n - 2) {
        // generous closure: ending near an older stroke closes the loop
        const [cx, cy] = closestOnSeg(B[0], B[1], s.ax, s.ay, s.bx, s.by);
        if (Math.hypot(cx - B[0], cy - B[1]) < STROKE.snapClose) {
          X = [cx, cy];
          fromK = k;
        }
      }
      if (!X) continue;
      const poly: V[] = [X, [this.segs[fromK].bx, this.segs[fromK].by]];
      for (let j = fromK + 1; j < n; j++) {
        if (this.segs[j].ink !== seg.ink) continue;
        poly.push([this.segs[j].ax, this.segs[j].ay], [this.segs[j].bx, this.segs[j].by]);
      }
      poly.push(A);
      if (t <= 0.04) poly.push(B);
      const clean = dedupe(poly);
      const area = Math.abs(shoelace(clean));
      if (clean.length < 3 || area < STROKE.minLoopArea) continue;
      let cx = 0, cy = 0;
      for (const q of clean) { cx += q[0]; cy += q[1]; }
      cx /= clean.length; cy /= clean.length;
      const enso: Enso = { ink: seg.ink, poly: clean, area, cx, cy };
      // the loop's strokes are consumed by the ensō
      for (const s2 of this.segs.slice(fromK, n + 1)) if (s2.ink === seg.ink) this.remove(s2);
      this.fill(enso);
      this.onEnso?.(enso);
      return enso;
    }
    return null;
  }

  private remove(seg: Seg): void {
    seg.ribbon.dispose();
    this.segs = this.segs.filter((s) => s !== seg);
  }

  /** Erase the finished strokes near a point (erasers swallow lines). Returns how many went. */
  eraseNear(x: number, y: number, r: number): number {
    const gone = this.segs.filter((s) => !s.live && distToSeg(x, y, s.ax, s.ay, s.bx, s.by) < r);
    for (const s of gone) this.remove(s);
    return gone.length;
  }

  /** Fresh ink under a point: a bridge over the void. */
  bridgeAt(x: number, y: number, r = 0.45): boolean {
    for (const s of this.segs) if (distToSeg(x, y, s.ax, s.ay, s.bx, s.by) < r) return true;
    return false;
  }

  /** Fresh ink absorbs a projectile. */
  absorbs(x: number, y: number, r: number): boolean {
    for (const s of this.segs) if (!s.live && distToSeg(x, y, s.ax, s.ay, s.bx, s.by) < r + STROKE.width * 0.6) return true;
    return false;
  }

  inside(poly: V[], x: number, y: number): boolean {
    return pointInPoly(x, y, poly);
  }

  private fill(e: Enso): void {
    const shape = new THREE.Shape(e.poly.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(...INKS[e.ink].rgb),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = LAYER.groundDetail + 25;
    this.w.r.sceneAcc.add(mesh);
    this.fills.push({ mesh, mat, t: 0, rgb: INKS[e.ink].rgb });
    // the circle stays on the paper
    const st = this.stains;
    if (st) {
      const pts = [...e.poly, e.poly[0]];
      const [r, g, b] = INKS[e.ink].rgb;
      brushStroke(st.red, pts, { width: 0.24, pig: { ink: r, a: g, b }, load: 0.4, dry: 0.5, seed: this.rng.int(1, 1e6), taperStart: 0.02, taperEnd: 0.2, body: 0.4, press: 0 });
      st.mark();
    }
  }

  /** Black splat stamped on the ground where something was defeated. */
  splat(x: number, y: number, size = 1): void {
    this.ensureStains(x, y);
    const st = this.stains;
    if (!st) return;
    dot(st.ink, x, y, 0.28 * size, INK, 0.45, this.rng.int(1, 1e6));
    for (let i = 0; i < 7; i++) {
      const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(0.3, 0.9) * size;
      dot(st.ink, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, this.rng.range(0.04, 0.1) * size, INK, 0.5, this.rng.int(1, 1e6));
    }
    st.mark();
  }

  private drawSeg(s: Seg, age: number): void {
    const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
    const dx = (s.bx - s.ax) / (len || 1), dy = (s.by - s.ay) / (len || 1);
    const pts: [number, number][] = [];
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const wob = Math.sin(t * 6 + s.seed) * 0.04 * len * 0.2;
      pts.push([s.ax + (s.bx - s.ax) * t - dy * wob, s.ay + (s.by - s.ay) * t + dx * wob]);
    }
    const k = age / STROKE.life;
    // long single strokes keep a brush shape; short chained pieces stay even so a drawing reads as one line
    const long = len > 2;
    s.ribbon.mat.uniforms.taper.value = long ? 0.55 : 0.05;
    s.ribbon.set(pts, (t) => STROKE.width * (long ? 0.75 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.4)) : 1.05) * (1 - k * 0.3));
    s.ribbon.mat.uniforms.density.value = 1 - Math.pow(k, 2) * 0.85;
    s.ribbon.mat.uniforms.dry.value = 0.1 + k * 1.1;
  }

  /** Segments of one ink near a point, for effects. */
  segsOf(ink: InkId): Seg[] {
    return this.segs.filter((s) => s.ink === ink);
  }

  update(_dt: number): void {
    const now = this.w.time;
    for (const s of this.segs) {
      const age = s.live ? 0 : now - s.born;
      this.drawSeg(s, age);
    }
    const expired = this.segs.filter((s) => !s.live && now - s.born > STROKE.life);
    for (const s of expired) {
      const st = this.stains;
      if (st) {
        const [r, g, b] = INKS[s.ink].rgb;
        brushStroke(st.red, [[s.ax, s.ay], [s.bx, s.by]], { width: 0.12, pig: { ink: r, a: g, b }, load: 0.25, dry: 0.7, seed: s.seed, body: 0.2, press: 0, taperEnd: 0.5 });
        st.mark();
      }
      this.remove(s);
    }
    for (const f of this.fills) {
      f.t += _dt;
      const k = f.t / 0.55;
      const a = k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.85);
      f.mat.color.setRGB(f.rgb[0] * a * 0.85, f.rgb[1] * a * 0.85, f.rgb[2] * a * 0.85);
      f.mat.opacity = 1;
      // premultiplied: color carries density, opacity carries coverage
      (f.mat as unknown as { opacity: number }).opacity = a * 0.85;
    }
    for (const f of this.fills) if (f.t > 0.55) { f.mesh.removeFromParent(); f.mesh.geometry.dispose(); f.mat.dispose(); }
    this.fills = this.fills.filter((f) => f.t <= 0.55);
    this.stains?.update(_dt);
  }
}

function shoelace(p: V[]): number {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]);
  return a / 2;
}

function dedupe(p: V[]): V[] {
  const out: V[] = [];
  for (const q of p) {
    const l = out[out.length - 1];
    if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 0.05) out.push(q);
  }
  if (out.length > 2) {
    const f = out[0], l = out[out.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 0.05) out.pop();
  }
  return out;
}
