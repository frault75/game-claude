import type { World } from './world';
import { Sprite } from '../gfx/sprite';

export type Team = 'player' | 'enemy' | 'neutral';

export interface HitInfo {
  dmg: number;
  fromX: number;
  fromY: number;
  kind: 'brush' | 'cut' | 'enso' | 'ink' | 'fire' | 'lantern' | 'crash' | 'reflect' | 'whirl';
  /** A critical blow (shown bigger). */
  crit?: boolean;
}

/** Anything that lives in a room. */
export class Entity {
  world!: World;
  x = 0;
  y = 0;
  /** Height above the ground, for things that fly or bob. */
  z = 0;
  vx = 0;
  vy = 0;
  radius = 0.35;
  /** Thread weight: lighter is pulled to heavier. Infinity = fixed. The child weighs 1. */
  weight = 1;
  hookable = false;
  /** Height of the knot above the feet (where the thread attaches). */
  knotY = 0.5;
  /** Blocks movement as a circle. */
  solid = false;
  team: Team = 'neutral';
  dead = false;
  hp = 1;
  /** Ink creatures cannot cross a taut thread. */
  inky = false;
  /** Fire, for conduction along the thread. */
  burning = false;
  flammable = false;
  /** Projectiles that bounce off taut threads. */
  bouncy = false;
  /** Flies over water and gaps. */
  airborne = false;
  /** A guardian: while it fights near the child, the camera leans towards it. */
  camFocus = false;
  sprites: Sprite[] = [];
  /** Shown in the debug overlay. */
  label = 'entity';
  /** Can be talked to or read (tap or click on it, or E nearby). */
  interactive = false;
  /** Height of the key prompt above it. */
  promptH = 2.3;
  interact(): void {}

  init(_w: World): void {}
  update(_dt: number): void {}
  /** Return true if the hit landed. */
  onHit(_h: HitInfo): boolean {
    return false;
  }
  /** Thread events. */
  onAttach(): void {}
  onRelease(): void {}
  /** Pulled by the thread this frame (lighter end). */
  onPulled(_dt: number): void {}
  /** Arrived at the other end after a pull. */
  onPullArrive(): void {}
  ignite(): void {
    if (this.flammable) this.burning = true;
  }
  /** Called when a bouncy thing hits this entity. */
  onTouched(_by: Entity): void {}

  knot(): [number, number] {
    return [this.x, this.y + this.knotY + this.z];
  }

  addSprite(s: Sprite, red = false): Sprite {
    this.sprites.push(s);
    (red ? this.world.r.sceneRed : this.world.r.scenePig).add(s.mesh);
    return s;
  }

  destroy(): void {
    this.dead = true;
  }

  dispose(): void {
    for (const s of this.sprites) s.dispose();
    this.sprites = [];
  }
}
