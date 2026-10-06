/**
 * A land: everything the chunk painter and the map need to know about an open world
 * (Act I's valley, Act II's terraces…). Painting and props are generic; a land adds its own
 * features through the `ground` and `props` hooks.
 */
import type { Painter, Pig } from '../gfx/paint';
import type { Rng } from '../gfx/rng';
import type { StampSet } from './stamps';
import type { ArtCache, PropArt } from './artCache';
import type { World } from '../game/world';

export type V = [number, number];

export interface PondDef { x: number; y: number; rx: number; ry: number; seed: number }
export interface ShrineDef { id: number; x: number; y: number }
export interface Region { id: string; name: { fr: string; en: string }; palette: string; music: string }

export interface PropHost {
  add(art: PropArt, x: number, y: number, flip: boolean, shadowR: number, solid?: boolean): void;
  collider(c: { kind: 'circle'; x: number; y: number; r: number } | { kind: 'seg'; ax: number; ay: number; bx: number; by: number; r: number }): void;
  inChunk(x: number, y: number): boolean;
  world: World;
}

export interface Land {
  id: string;
  w: number;
  h: number;
  chunk: number;
  /** Roads and paths: polylines with a width. */
  roads: { pts: V[]; w: number }[];
  ponds: PondDef[];
  paddies: { x: number; y: number; w: number; h: number }[];
  river: { samples: { x: number; y: number; nx: number; ny: number }[]; half: (i: number) => number } | null;
  bridge: { x: number; y: number; x0: number; x1: number; half: number } | null;
  camps: { id: number; x: number; y: number; r: number }[];
  shrines: ShrineDef[];
  regions: Record<string, Region>;
  forestDensity(x: number, y: number): number;
  isClearing(x: number, y: number): boolean;
  regionAt(x: number, y: number): string;
  roadDist(x: number, y: number): number;
  /** Which trees grow here (default: pine, bamboo, willow or plum by noise). */
  species?(x: number, y: number, n: number, r: Rng, A: ArtCache): PropArt[];
  /** Pigment of the quiet washes on the ground. */
  washPig?(region: string, r: Rng): Pig;
  /** No flowers in this region (a stone circle…). */
  bare?(region: string): boolean;
  /** Extra ground for a chunk (x0, y0: corner; S: size). */
  ground?(g: Painter, x0: number, y0: number, S: number, st: StampSet): void;
  /** Hand-placed props of the land for a chunk. */
  props?(host: PropHost, A: ArtCache): void;
}
