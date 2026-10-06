/** Ink brambles choking the old bridge: the brush bounces off; indigo freezes them until they shatter. */
import { Entity, HitInfo } from './entity';
import type { World } from './world';
import { Sprite, ySort, LAYER } from '../gfx/sprite';
import type { PropArt } from '../world/artCache';
import { sfx } from '../audio/sfx';

export class Brambles extends Entity {
  private body!: Sprite;
  private frost = 0;
  private shatterT = -1;
  private hintCool = 0;
  onShatter?: () => void;
  onRebuff?: () => void;

  constructor(private art: PropArt, x: number, y: number, private half: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 1.6;
    this.team = 'enemy';
    this.weight = Infinity;
    this.label = 'brambles';
    this.hp = 1;
  }

  init(w: World): void {
    this.body = this.addSprite(new Sprite(this.art.pig));
    this.body.setPos(this.x, this.y - this.half + 0.1);
    this.body.mesh.renderOrder = ySort(this.y - this.half + 0.1);
    w.addCollider({ kind: 'seg', ax: this.x, ay: this.y - this.half - 0.3, bx: this.x, by: this.y + this.half + 0.3, r: 0.9 }, 'brambles');
  }

  onHit(h: HitInfo): boolean {
    if (this.shatterT >= 0) return false;
    if (h.kind !== 'ink') {
      sfx.clink();
      this.world.numbers?.pop(this.x, this.y + 1.8, '0', { size: 0.45 });
      this.world.vfx.splat(this.x, this.y + 0.6, Math.atan2(this.y - h.fromY, this.x - h.fromX), 5, 0.8);
      if (this.hintCool <= 0) { this.onRebuff?.(); this.hintCool = 5; }
    }
    return false;
  }

  /** Called by indigo strokes and loops. */
  freeze(t: number): void {
    if (this.shatterT >= 0) return;
    this.frost += t > 3 ? 3 : 1;
    this.world.vfx.ripple(this.x, this.y, 0.6 + this.frost * 0.2);
    sfx.clink();
    if (this.frost >= 4) {
      this.shatterT = 0;
      this.world.removeColliders('brambles');
      this.world.shake(0.3, 0.4);
      this.world.flash = Math.max(this.world.flash, 0.25);
      sfx.enso(4, 6);
      for (let i = 0; i < 10; i++) this.world.vfx.splat(this.x + (Math.random() - 0.5) * 3, this.y + 0.5, (i / 10) * Math.PI * 2, 8, 1.2);
      this.onShatter?.();
    }
  }

  update(dt: number): void {
    this.hintCool -= dt;
    this.frost = Math.max(0, this.frost - dt * 0.15);
    this.body.pale = Math.min(0.6, this.frost * 0.15);
    if (this.shatterT >= 0) {
      this.shatterT += dt;
      this.body.dissolve = Math.min(1, this.shatterT / 0.9);
      if (this.shatterT > 1) this.destroy();
    } else this.body.mesh.position.x = this.x + Math.sin(this.world.time * 2) * 0.02;
    void LAYER;
  }
}
