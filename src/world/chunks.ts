/** Paints the world around the camera, one 16×16 chunk at a time, and forgets what is far away. */
import type { World } from '../game/world';
import { Painter, INK, PIG_A, PIG_B } from '../gfx/paint';
import { Sprite, LAYER, ySort, makeTexture } from '../gfx/sprite';
import { washBlob, washPoly, noisyOutline } from '../gfx/wash';
import { stroke, dot } from '../gfx/brush';
import { pond, shadow } from '../gfx/gen/ground';
import { StampSet, stampAt } from './stamps';
import { ArtCache, PropArt } from './artCache';
import {
  WORLD, ROAD, PATHS, PONDS, VILLAGE, ARENA, CAMPS, SHRINES, V,
  forestDensity, isClearing, cellRng, regionAt, roadDist,
} from './layout';
import { noise } from '../gfx/noise';

interface PropInst {
  sprites: Sprite[];
  x: number;
  y: number;
  crown?: { x: number; y: number; rx: number; ry: number };
}

interface Chunk {
  key: string;
  cx: number;
  cy: number;
  ground: Sprite;
  props: PropInst[];
}

/** Road polylines resampled into dabs at fixed arc-length positions (seamless across chunks). */
function roadDabs(): { x: number; y: number; w: number; i: number }[] {
  const out: { x: number; y: number; w: number; i: number }[] = [];
  let k = 0;
  const lines: [V[], number][] = [[ROAD, 2.6], ...PATHS.map((p) => [p, 1.7] as [V[], number])];
  for (const [pts, w] of lines) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const L = Math.hypot(bx - ax, by - ay);
      for (let d = 0; d < L; d += 0.55) {
        const t = d / L;
        out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, w, i: k++ });
      }
    }
  }
  return out;
}

export class Chunks {
  private loaded = new Map<string, Chunk>();
  private queue: string[] = [];
  private dabs = roadDabs();
  private fadeList: PropInst[] = [];

  constructor(private w: World, private stamps: StampSet, private art: ArtCache, private ppu: number) {}

  get count(): number {
    return this.loaded.size;
  }

  private keyOf(cx: number, cy: number): string {
    return cx + ',' + cy;
  }

  /** Chunks needed around a point (view half-sizes in world units). */
  private wanted(x: number, y: number, hw: number, hh: number, margin: number): string[] {
    const S = WORLD.chunk;
    const out: { k: string; d: number }[] = [];
    const x0 = Math.max(0, Math.floor((x - hw - margin) / S)), x1 = Math.min(Math.ceil(WORLD.w / S) - 1, Math.floor((x + hw + margin) / S));
    const y0 = Math.max(0, Math.floor((y - hh - margin) / S)), y1 = Math.min(Math.ceil(WORLD.h / S) - 1, Math.floor((y + hh + margin) / S));
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const d = Math.hypot((cx + 0.5) * S - x, (cy + 0.5) * S - y);
        out.push({ k: this.keyOf(cx, cy), d });
      }
    }
    out.sort((a, b) => a.d - b.d);
    return out.map((o) => o.k);
  }

  /** Build everything around a point now (start, respawn, teleport). */
  buildAround(x: number, y: number, hw: number, hh: number): void {
    for (const k of this.wanted(x, y, hw, hh, 6)) if (!this.loaded.has(k)) this.build(k);
  }

  update(dt: number, x: number, y: number, hw: number, hh: number): void {
    void dt;
    const need = this.wanted(x, y, hw, hh, 7);
    const needSet = new Set(need);
    this.queue = need.filter((k) => !this.loaded.has(k));
    // one chunk per frame keeps the frame time smooth
    if (this.queue.length) this.build(this.queue[0]);
    // forget chunks well outside the view
    const keep = new Set(this.wanted(x, y, hw, hh, 22));
    for (const [k, c] of this.loaded) if (!keep.has(k) && !needSet.has(k)) this.unload(c);
    // tree crowns fade when the child walks behind them
    const p = this.w.player;
    for (const pr of this.fadeList) {
      if (!pr.crown) continue;
      const dx = (p.x - (pr.x + pr.crown.x)) / pr.crown.rx, dy = (p.y + 0.6 - (pr.y + pr.crown.y)) / pr.crown.ry;
      const behind = p.y > pr.y && dx * dx + dy * dy < 1.15;
      const s = pr.sprites[0];
      s.opacity += ((behind ? 0.4 : 1) - s.opacity) * Math.min(1, dt * 6);
    }
  }

  private unload(c: Chunk): void {
    c.ground.dispose();
    for (const p of c.props) for (const s of p.sprites) s.dispose();
    this.w.removeColliders('chunk:' + c.key);
    this.fadeList = this.fadeList.filter((p) => !c.props.includes(p));
    this.loaded.delete(c.key);
  }

  clear(): void {
    for (const c of [...this.loaded.values()]) this.unload(c);
  }

  private build(key: string): void {
    const [cx, cy] = key.split(',').map(Number);
    const S = WORLD.chunk;
    const x0 = cx * S, y0 = cy * S;
    const g = new Painter(S, S, this.ppu, x0, y0);
    g.glaze();
    const props: PropInst[] = [];
    this.paintGround(g, x0, y0);
    this.placeProps(g, x0, y0, props, key);
    const tex = makeTexture(g.canvas, false);
    const ground = new Sprite({ tex, w: S, h: S, ox: x0, oy: y0 });
    (ground as unknown as { owned: boolean }).owned = true;
    ground.mesh.renderOrder = LAYER.ground;
    this.w.r.scenePig.add(ground.mesh);
    const chunk: Chunk = { key, cx, cy, ground, props };
    this.loaded.set(key, chunk);
    for (const p of props) if (p.crown) this.fadeList.push(p);
  }

  private paintGround(g: Painter, x0: number, y0: number): void {
    const S = WORLD.chunk;
    const st = this.stamps;
    const M = 4; // margin: features from neighbouring cells overlap this chunk
    // 1. quiet washes on an 8-unit grid
    for (let ix = Math.floor((x0 - M) / 8); ix <= Math.floor((x0 + S + M) / 8); ix++) {
      for (let iy = Math.floor((y0 - M) / 8); iy <= Math.floor((y0 + S + M) / 8); iy++) {
        const r = cellRng(ix, iy, 1);
        const n = r.int(1, 2);
        for (let k = 0; k < n; k++) {
          const x = ix * 8 + r.range(0, 8), y = iy * 8 + r.range(0, 8);
          const s = r.range(3, 6);
          const reg = regionAt(x, y);
          const pig = reg === 'arena' ? INK : r.chance(0.7) ? PIG_B : INK;
          washBlob(g, x, y, s, s * r.range(0.35, 0.6), { pig, density: r.chance(0.7) ? r.range(0.05, 0.11) : r.range(0.02, 0.04), soft: 0.9, seed: r.int(1, 1e6), rot: r.gauss() * 0.25, rough: 0.35 });
        }
      }
    }
    // 2. roads: soft dabs along the network + pebbles and edge grass
    for (const d of this.dabs) {
      if (d.x < x0 - M || d.x > x0 + S + M || d.y < y0 - M || d.y > y0 + S + M) continue;
      g.dab(d.x, d.y, d.w * 0.62, INK, 0.05, 0.25);
      const r = cellRng(d.i, 7, 3);
      if (r.chance(0.12)) stampAt(g, st.pebbles[r.int(0, st.pebbles.length - 1)], d.x + r.gauss() * d.w * 0.25, d.y + r.gauss() * 0.3, r.chance(0.5), 0.9);
      if (r.chance(0.35)) {
        const side = r.chance(0.5) ? 1 : -1;
        stampAt(g, st.tufts[r.int(0, st.tufts.length - 1)], d.x + r.gauss() * 0.2, d.y + side * d.w * 0.55, r.chance(0.5));
      }
    }
    // 3. ponds
    for (const p of PONDS) {
      if (p.x + p.rx + 2 < x0 || p.x - p.rx - 2 > x0 + S || p.y + p.ry + 2 < y0 || p.y - p.ry - 2 > y0 + S) continue;
      pond(g, p.x, p.y, p.rx, p.ry, p.seed);
    }
    // 4. village plaza and the stone circle
    if (Math.hypot(VILLAGE.x - (x0 + S / 2), VILLAGE.y - (y0 + S / 2)) < VILLAGE.r + S) {
      const r = cellRng(1, 2, 99);
      for (let i = 0; i < 60; i++) {
        const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * 6;
        const x = VILLAGE.x + Math.cos(a) * d, y = VILLAGE.y + Math.sin(a) * d * 0.8;
        if (x < x0 - 1 || x > x0 + S + 1 || y < y0 - 1 || y > y0 + S + 1) continue;
        stampAt(g, st.stones[r.int(0, st.stones.length - 1)], x, y, r.chance(0.5), 0.8);
      }
    }
    if (Math.hypot(ARENA.x - (x0 + S / 2), ARENA.y - (y0 + S / 2)) < ARENA.r + S) {
      washPoly(g, noisyOutline(ARENA.x, ARENA.y, ARENA.r, ARENA.r * 0.82, 0.08, 4242), { pig: INK, density: 0.08, soft: 0.6, seed: 4242 });
      const ring: [number, number][] = [];
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        ring.push([ARENA.x + Math.cos(a) * ARENA.r, ARENA.y + Math.sin(a) * ARENA.r * 0.82]);
      }
      stroke(g, ring, { width: 0.18, load: 0.5, dry: 0.7, seed: 4243, taperStart: 0.01, taperEnd: 0.02, body: 0.3, press: 0 });
    }
    // 5. camps: ink seeping into the ground
    for (const c of CAMPS) {
      if (Math.hypot(c.x - (x0 + S / 2), c.y - (y0 + S / 2)) > c.r + S) continue;
      washBlob(g, c.x, c.y, c.r * 0.8, c.r * 0.5, { pig: INK, density: 0.1, soft: 0.8, seed: 500 + c.id });
      const r = cellRng(c.id, 0, 55);
      for (let i = 0; i < 6; i++) dot(g, c.x + r.gauss() * c.r * 0.6, c.y + r.gauss() * c.r * 0.4, r.range(0.1, 0.3), INK, 0.5, r.int(1, 1e6));
    }
    // 6. grass, stones and flowers on a 2-unit grid
    const n = noise(77);
    for (let ix = Math.floor((x0 - 1) / 2); ix <= Math.floor((x0 + S + 1) / 2); ix++) {
      for (let iy = Math.floor((y0 - 1) / 2); iy <= Math.floor((y0 + S + 1) / 2); iy++) {
        const r = cellRng(ix, iy, 2);
        const x = ix * 2 + r.range(0, 2), y = iy * 2 + r.range(0, 2);
        if (roadDist(x, y) < 1.4) continue;
        const lush = n.fbm(x * 0.08, y * 0.08, 2) * 0.5 + 0.5 + forestDensity(x, y) * 0.4;
        const roll = r.next();
        if (roll < lush * 0.42) stampAt(g, st.grass[r.int(0, st.grass.length - 1)], x, y, r.chance(0.5));
        else if (roll < lush * 0.42 + 0.05) stampAt(g, st.stones[r.int(0, st.stones.length - 1)], x, y, r.chance(0.5), 0.8);
        else if (roll < lush * 0.42 + 0.1 && regionAt(x, y) !== 'arena') stampAt(g, st.flowers[r.int(0, st.flowers.length - 1)], x, y, r.chance(0.5));
        else if (roll < lush * 0.42 + 0.16) stampAt(g, st.tufts[r.int(0, st.tufts.length - 1)], x, y, r.chance(0.5));
      }
    }
  }

  private addProp(art: PropArt, x: number, y: number, flip: boolean, props: PropInst[], key: string, g: Painter, shadowR: number, solid = true): void {
    const sprites: Sprite[] = [];
    const s = new Sprite(art.pig);
    s.setPos(x, y);
    s.mesh.scale.x = flip ? -1 : 1;
    s.mesh.renderOrder = ySort(y);
    this.w.r.scenePig.add(s.mesh);
    sprites.push(s);
    if (art.red) {
      const rs = new Sprite(art.red);
      rs.setPos(x, y);
      rs.mesh.renderOrder = ySort(y);
      this.w.r.sceneRed.add(rs.mesh);
      sprites.push(rs);
    }
    if (shadowR > 0) shadow(g, x + 0.3, y - 0.05, shadowR, shadowR * 0.38, 0.18);
    if (solid && art.radius > 0.05) this.w.addCollider({ kind: 'circle', x, y, r: art.radius }, 'chunk:' + key);
    props.push({ sprites, x, y, crown: art.crown });
  }

  private placeProps(g: Painter, x0: number, y0: number, props: PropInst[], key: string): void {
    const S = WORLD.chunk;
    const A = this.art;
    const species = noise(93);
    for (let ix = x0 / 3; ix < (x0 + S) / 3; ix++) {
      for (let iy = y0 / 3; iy < (y0 + S) / 3; iy++) {
        const r = cellRng(ix, iy, 5);
        const x = ix * 3 + r.range(0.3, 2.7), y = iy * 3 + r.range(0.3, 2.7);
        if (x < 1 || y < 1 || x > WORLD.w - 1 || y > WORLD.h - 1) continue;
        if (isClearing(x, y)) continue;
        const dens = forestDensity(x, y);
        const roll = r.next();
        if (roll < dens * 0.7) {
          const sp = species.get(x * 0.03, y * 0.03);
          const list = sp > 0.25 ? A.pine : sp < -0.35 ? A.bamboo : r.chance(0.15) ? A.willow : A.plum;
          const art = list[r.int(0, list.length - 1)];
          this.addProp(art, x, y, r.chance(0.5), props, key, g, 1.6);
        } else if (roll < dens * 0.7 + 0.035) {
          this.addProp(A.rock[r.int(0, A.rock.length - 1)], x, y, r.chance(0.5), props, key, g, 1.0);
        } else if (roll < dens * 0.7 + 0.05 && dens < 0.2) {
          this.addProp(A.plum[r.int(0, A.plum.length - 1)], x, y, r.chance(0.5), props, key, g, 1.6);
        }
      }
    }
    // fixed props: village huts and lamps, the stone circle, shrine lamps
    const inChunk = (x: number, y: number) => x >= x0 && x < x0 + S && y >= y0 && y < y0 + S;
    const huts: V[] = [[14, 70], [30, 71], [16, 53], [31, 54]];
    huts.forEach(([x, y], i) => {
      if (!inChunk(x, y)) return;
      this.addProp(A.hut[i % A.hut.length], x, y, i % 2 === 1, props, key, g, 3.0, false);
      const ow = 'chunk:' + key;
      this.w.addCollider({ kind: 'seg', ax: x - 1.95, ay: y + 0.2, bx: x + 1.95, by: y + 0.2, r: 0.25 }, ow);
      this.w.addCollider({ kind: 'seg', ax: x - 1.95, ay: y + 1.2, bx: x + 1.95, by: y + 1.2, r: 0.25 }, ow);
    });
    const lamps: V[] = [[18, 67], [30, 57]];
    for (const [x, y] of lamps) if (inChunk(x, y)) this.addProp(A.lamp[0], x, y, false, props, key, g, 0.6);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      if (Math.abs(Math.cos(a) + 1) < 0.25) continue; // gap facing west: the way in
      const x = ARENA.x + Math.cos(a) * (ARENA.r + 1.2), y = ARENA.y + Math.sin(a) * (ARENA.r + 1.2) * 0.82;
      if (inChunk(x, y)) this.addProp(A.bigRock[k % A.bigRock.length], x, y, k % 2 === 0, props, key, g, 1.4);
    }
    for (const s of SHRINES) {
      for (const [dx, dy] of [[-1.6, 0.6], [1.6, 0.6]] as V[]) {
        const x = s.x + dx, y = s.y + dy;
        if (inChunk(x, y)) this.addProp(A.lamp[0], x, y, false, props, key, g, 0.6);
      }
    }
    void PIG_A;
  }
}
