/** Room definitions and the builder that paints the ground and places everything. */
import type { World } from './world';
import type { MapSource } from '../ui/mapArt';
import { Entity } from './entity';
import { Painter, INK } from '../gfx/paint';
import { Sprite, LAYER } from '../gfx/sprite';
import { GROUND_PPU, groundBase, shadow, chasm, waterPoly, grassField, earthPath, scatterPetals, pond } from '../gfx/gen/ground';
import { makeTree, makeRock, makeBamboo, makeLamp, Post, KnotTree, Prop } from './objects';
import { drawHut } from '../gfx/gen/props';
import { TreeSpecies } from '../gfx/gen/flora';
import { brushText } from '../gfx/text';
import { V } from './physics';
import type { V2 } from '../gfx/brush';
import type { PostParams } from '../core/renderer';
import type { Game } from './game';

export interface Exit {
  x: number;
  y: number;
  w: number;
  h: number;
  to: string;
  /** Where to appear in the next room (its own spawn point if omitted). */
  spawn?: V;
  /** Closed exits do nothing (e.g. until the guardian is restored). */
  open?: () => boolean;
}

export interface RoomDef {
  id: string;
  /** Area key: palette, music and restoration are per area. */
  area: string;
  w: number;
  h: number;
  palette: string;
  spawn: V;
  goal: V;
  music?: string;
  post?: Partial<PostParams>;
  exits?: Exit[];
  /** The place as a map (minimap, big map); none for small rooms. */
  map?: (g: Game) => MapSource;
  build(b: RoomBuilder): void;
}

export class RoomBuilder {
  private _ground: Painter | null = null;
  private texts: { x: number; y: number; str: string; size: number; load: number }[] = [];

  constructor(readonly world: World, readonly def: RoomDef, readonly game: Game) {}

  /** The room's ground canvas, created on first use (open worlds paint chunks instead). */
  get ground(): Painter {
    if (!this._ground) {
      this._ground = new Painter(this.def.w, this.def.h, GROUND_PPU, 0, 0);
      this._ground.glaze();
    }
    return this._ground;
  }

  get rect() {
    return { x: 0, y: 0, w: this.def.w, h: this.def.h };
  }

  base(seed: number, amount = 1): void {
    groundBase(this.ground, this.rect, seed, undefined, amount);
  }

  grass(count: number, seed: number, avoid?: (x: number, y: number) => boolean): void {
    const hz = this.world.hazards;
    grassField(this.ground, this.rect, count, seed, (x, y) => (avoid ? avoid(x, y) : false) || hz.some((h) => pointInPolyLoose(x, y, h.poly)));
  }

  petals(count: number, seed: number): void {
    scatterPetals(this.ground, this.rect, count, seed);
  }

  path(pts: V2[], width: number, seed: number): void {
    earthPath(this.ground, pts, width, seed);
  }

  add<T extends Entity>(e: T): T {
    return this.world.add(e);
  }

  tree(x: number, y: number, seed: number, species: TreeSpecies = 'plum', scale = 1): Prop {
    shadow(this.ground, x + 0.4, y - 0.1, 1.8 * scale, 0.7 * scale, 0.18);
    return this.add(makeTree(x, y, seed, species, scale));
  }

  knotTree(x: number, y: number, seed: number, species: TreeSpecies = 'plum', knotY = 1.2): KnotTree {
    shadow(this.ground, x + 0.4, y - 0.1, 1.8, 0.7, 0.18);
    return this.add(new KnotTree(x, y, seed, species, knotY));
  }

  bamboo(x: number, y: number, seed: number): Prop {
    shadow(this.ground, x + 0.3, y, 1.3, 0.5, 0.15);
    return this.add(makeBamboo(x, y, seed));
  }

  rock(x: number, y: number, seed: number, size = 1): Prop {
    shadow(this.ground, x + 0.3, y, 1.2 * size, 0.45 * size, 0.2);
    return this.add(makeRock(x, y, seed, size));
  }

  post(x: number, y: number, seed: number, height = 1.4): Post {
    shadow(this.ground, x + 0.1, y, 0.35, 0.14, 0.25);
    return this.add(new Post(x, y, seed, height));
  }

  lamp(x: number, y: number, seed: number, lit = true): Prop {
    shadow(this.ground, x + 0.2, y, 0.6, 0.22, 0.25);
    return this.add(makeLamp(x, y, seed, lit));
  }

  hut(x: number, y: number, seed: number): Prop {
    shadow(this.ground, x + 0.3, y + 0.2, 3.2, 0.8, 0.2);
    const p = this.add(new Prop(() => drawHut(seed), x, y, 0.1, false));
    // walls as a box collider
    this.wall([[x - 1.95, y], [x + 1.95, y], [x + 1.95, y + 1.2], [x - 1.95, y + 1.2], [x - 1.95, y]], false);
    return p;
  }

  /** Invisible wall chain. */
  wall(pts: V[], blocksThread = false, r = 0.15): void {
    for (let i = 0; i < pts.length - 1; i++) {
      this.world.colliders.push({ kind: 'seg', ax: pts[i][0], ay: pts[i][1], bx: pts[i + 1][0], by: pts[i + 1][1], r, blocksThread });
    }
  }

  /** Circle collider without art. */
  block(x: number, y: number, r: number): void {
    this.world.colliders.push({ kind: 'circle', x, y, r });
  }

  chasm(poly: V2[], seed: number): void {
    chasm(this.ground, poly, seed);
    this.world.hazards.push({ kind: 'void', poly: poly as V[] });
  }

  water(poly: V2[], seed: number, flow: [number, number] = [1, 0], density = 0.2): void {
    waterPoly(this.ground, poly, seed, flow, density);
    this.world.hazards.push({ kind: 'water', poly: poly as V[] });
  }

  pond(cx: number, cy: number, rx: number, ry: number, seed: number, deadly = true): void {
    const o = pond(this.ground, cx, cy, rx, ry, seed);
    if (deadly) this.world.hazards.push({ kind: 'water', poly: o.map((q) => [cx + (q[0] - cx) * 0.92, cy + (q[1] - cy) * 0.92]) as V[] });
  }

  /** Faint calligraphy on the ground. */
  text(x: number, y: number, str: string, size = 0.42, load = 0.55): void {
    this.texts.push({ x, y, str, size, load });
  }

  finish(): void {
    if (this._ground) {
      const g = new Sprite(this._ground);
      g.mesh.renderOrder = LAYER.ground;
      this.world.r.scenePig.add(g.mesh);
      this.world.roomSprites.push(g);
    }
    for (const t of this.texts) {
      const art = brushText(t.str, { size: t.size, ppu: 64, italic: true, pig: INK, load: t.load, maxWidth: 9, halo: false });
      const s = new Sprite(art);
      s.setPos(t.x, t.y);
      s.mesh.renderOrder = LAYER.groundDetail;
      this.world.r.scenePig.add(s.mesh);
      this.world.roomSprites.push(s);
    }
  }
}

function pointInPolyLoose(x: number, y: number, poly: V[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) inside = !inside;
  }
  return inside;
}
