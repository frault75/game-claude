/** Ink effects: strike arcs, splatters, stains, dodge streaks, flames. Frames painted once, pooled sprites. */
import { Painter, INK, VERMILION, LIGHT, PIG_A, Pig } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { stroke, dot, V2 } from '../gfx/brush';
import { Rng } from '../gfx/rng';
import { SPRITE_PPU } from '../gfx/gen/flora';
import type { Renderer } from '../core/renderer';

interface P {
  s: Sprite;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  rot: number; vr: number;
  life: number; max: number;
  scale: number; grow: number;
  alpha: number;
  gravity: number;
  drag: number;
  order: number;
  stainOnLand?: boolean;
  red: boolean;
}

export class Vfx {
  private arcs: Frame[] = [];
  private drops: Frame[] = [];
  private stains: Frame[] = [];
  private streaks: Frame[] = [];
  private flames: Frame[] = [];
  private glow!: Frame;
  private petals: Frame[] = [];
  private ring!: Frame;
  private live: P[] = [];
  private pool = new Map<Frame, Sprite[]>();
  private rng = new Rng(99);

  constructor(private r: Renderer) {
    // strike arcs: a crescent painted with one confident sweep
    for (let i = 0; i < 3; i++) {
      const p = new Painter(3.2, 3.2, SPRITE_PPU, -1.6, -1.6);
      p.glaze();
      const pts: V2[] = [];
      const a0 = -1.0, a1 = 1.0;
      for (let k = 0; k <= 8; k++) {
        const a = a0 + (a1 - a0) * (k / 8);
        const rr = 1.15 + Math.sin((k / 8) * Math.PI) * 0.12;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      if (i === 1) pts.reverse();
      stroke(p, pts, { width: 0.32, load: 0.95, dry: 0.75, taperStart: 0.05, taperEnd: 0.7, seed: 500 + i, rough: 0.3, body: 0.5, press: 0.6, splatter: 6 });
      this.arcs.push(frameFrom(p));
    }
    for (let i = 0; i < 5; i++) {
      const p = new Painter(0.5, 0.5, SPRITE_PPU, -0.25, -0.25);
      p.glaze();
      dot(p, 0, 0, 0.06 + i * 0.025, INK, 1, 600 + i);
      this.drops.push(frameFrom(p));
    }
    for (let i = 0; i < 4; i++) {
      const p = new Painter(1.6, 1.6, SPRITE_PPU, -0.8, -0.8);
      p.glaze();
      const rg = new Rng(700 + i);
      dot(p, 0, 0, 0.22 + rg.range(0, 0.12), INK, 0.9, 700 + i);
      for (let k = 0; k < 9; k++) {
        const a = rg.range(0, Math.PI * 2), d = rg.range(0.25, 0.7);
        dot(p, Math.cos(a) * d, Math.sin(a) * d * 0.6, rg.range(0.03, 0.09), INK, rg.range(0.6, 1), rg.int(1, 1e6));
      }
      this.stains.push(frameFrom(p));
    }
    for (let i = 0; i < 2; i++) {
      const p = new Painter(3.4, 0.8, SPRITE_PPU, -3.2, -0.4);
      p.glaze();
      stroke(p, [[0, 0], [-1.5, 0.03], [-3.0, -0.02]], { width: 0.5, load: 0.6, dry: 0.95, taperStart: 0.02, taperEnd: 0.6, seed: 800 + i, body: 0.15, press: 0 });
      this.streaks.push(frameFrom(p));
    }
    for (let i = 0; i < 4; i++) {
      const p = new Painter(0.8, 1.0, SPRITE_PPU, -0.4, -0.2);
      p.glaze();
      const rg = new Rng(900 + i);
      stroke(p, [[0, 0], [rg.gauss() * 0.08, 0.3], [rg.gauss() * 0.12, 0.6]], { width: 0.28, pig: VERMILION, load: 0.9, dry: 0.4, taperStart: 0.3, taperEnd: 0.9, seed: 900 + i, body: 0.8, press: 0.2 });
      this.flames.push(frameFrom(p));
    }
    {
      const p = new Painter(4, 4, SPRITE_PPU / 2, -2, -2);
      p.glaze();
      p.dab(0, 0, 1.9, LIGHT, 1, 0);
      this.glow = frameFrom(p);
    }
    for (let i = 0; i < 3; i++) {
      const p = new Painter(0.3, 0.3, SPRITE_PPU, -0.15, -0.15);
      p.glaze();
      p.dab(0, 0, 0.08 + i * 0.012, PIG_A, 0.95, 0.5);
      this.petals.push(frameFrom(p));
    }
    {
      const p = new Painter(2.4, 2.4, SPRITE_PPU, -1.2, -1.2);
      p.glaze();
      const pts: V2[] = [];
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2.1;
        pts.push([Math.cos(a) * 1, Math.sin(a) * 0.6]);
      }
      stroke(p, pts, { width: 0.08, load: 0.6, dry: 0.6, seed: 950, taperStart: 0.1, taperEnd: 0.4, body: 0.3, press: 0 });
      this.ring = frameFrom(p);
    }
  }

  private spawn(f: Frame, red: boolean, o: Partial<P> & { x: number; y: number }): P {
    const free = this.pool.get(f);
    let s = free && free.pop();
    if (!s) {
      s = new Sprite(f, 'over');
      (s as unknown as { frame: Frame }).frame = f;
    }
    s.mesh.visible = true;
    s.reveal = 2;
    s.dissolve = 0;
    s.mesh.scale.set(1, 1, 1);
    s.mesh.rotation.z = 0;
    (red ? this.r.sceneRed : this.r.scenePig).add(s.mesh);
    const p: P = {
      s, x: o.x, y: o.y, z: o.z ?? 0, vx: o.vx ?? 0, vy: o.vy ?? 0, vz: o.vz ?? 0,
      rot: o.rot ?? 0, vr: o.vr ?? 0, life: 0, max: o.max ?? 0.5, scale: o.scale ?? 1, grow: o.grow ?? 0,
      alpha: o.alpha ?? 1, gravity: o.gravity ?? 0, drag: o.drag ?? 0, order: o.order ?? LAYER.weather - 10,
      stainOnLand: o.stainOnLand, red,
    };
    s.mesh.renderOrder = p.order;
    this.live.push(p);
    return p;
  }

  strikeArc(x: number, y: number, angle: number, combo: number): void {
    const f = this.arcs[combo % 2 === 0 ? 0 : 1];
    const flip = combo % 2 === 0 ? 1 : -1;
    const p = this.spawn(f, false, { x, y, rot: angle, max: 0.26, scale: 0.85, grow: 0.8, order: LAYER.actorsBase + 4000 });
    p.s.mesh.scale.y = flip;
    p.s.reveal = 0;
  }

  splat(x: number, y: number, angle: number, n = 8, power = 1, pig: 'ink' | 'red' = 'ink'): void {
    for (let i = 0; i < n; i++) {
      const a = angle + this.rng.gauss() * 1.1;
      const sp = this.rng.range(2, 7) * power;
      this.spawn(this.drops[this.rng.int(0, this.drops.length - 1)], pig === 'red', {
        x, y, z: 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: this.rng.range(1, 4),
        gravity: 14, drag: 2, max: 1.2, scale: this.rng.range(0.6, 1.3), stainOnLand: pig === 'ink' && this.rng.chance(0.4),
      });
    }
  }

  stain(x: number, y: number, size = 1, life = 6): void {
    this.spawn(this.stains[this.rng.int(0, this.stains.length - 1)], false, {
      x, y, rot: this.rng.range(0, 6.28), max: life, scale: size, alpha: 0.7, order: LAYER.groundDetail + 5,
    });
  }

  streak(x: number, y: number, angle: number): void {
    this.spawn(this.streaks[this.rng.int(0, 1)], false, { x, y: y + 0.3, rot: angle, max: 0.35, scale: 0.9, alpha: 0.8, order: LAYER.shadow + 5 });
  }

  flame(x: number, y: number, size = 1): void {
    this.spawn(this.flames[this.rng.int(0, this.flames.length - 1)], true, {
      x: x + this.rng.gauss() * 0.15 * size, y, vy: this.rng.range(0.6, 1.4), max: this.rng.range(0.25, 0.5), scale: size * this.rng.range(0.6, 1.1),
      grow: -1, order: LAYER.actorsBase + 3990,
    });
  }

  glowAt(x: number, y: number, size = 1, life = 0.1): void {
    this.spawn(this.glow, true, { x, y, max: life, scale: size, alpha: 0.6, order: LAYER.ground + 5 });
  }

  ripple(x: number, y: number, size = 1): void {
    this.spawn(this.ring, false, { x, y, max: 0.9, scale: 0.3 * size, grow: 1.6 * size, alpha: 0.6, order: LAYER.groundDetail + 6 });
  }

  petal(x: number, y: number, vx: number, vy: number): void {
    this.spawn(this.petals[this.rng.int(0, 2)], false, { x, y, vx, vy, vr: this.rng.range(-4, 4), max: this.rng.range(1.5, 3), order: LAYER.weather });
  }

  dust(x: number, y: number, n = 4, pig: Pig = INK): void {
    void pig;
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      this.spawn(this.drops[0], false, { x, y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 0.8, max: 0.4, scale: 1.2, grow: 2, alpha: 0.35, drag: 4 });
    }
  }

  update(dt: number): void {
    for (const p of this.live) {
      p.life += dt;
      const dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr;
      p.vy *= dr;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) {
        p.vz -= p.gravity * dt;
        p.z += p.vz * dt;
        if (p.z <= 0) {
          p.z = 0;
          if (p.stainOnLand) this.stain(p.x, p.y, 0.25 * p.scale, 4);
          p.life = p.max;
        }
      }
      p.rot += p.vr * dt;
      p.scale = Math.max(0.01, p.scale + p.grow * dt);
      const k = p.life / p.max;
      p.s.setPos(p.x, p.y + p.z);
      p.s.mesh.rotation.z = p.rot;
      const sy = Math.sign(p.s.mesh.scale.y) || 1;
      p.s.mesh.scale.set(p.scale, p.scale * sy, 1);
      p.s.opacity = p.alpha * Math.min(1, (1 - k) * 3);
      if (p.s.mat.uniforms.reveal.value < 1.5) p.s.reveal = Math.min(1.5, k * 5);
    }
    for (const p of this.live) if (p.life >= p.max) this.recycle(p.s);
    this.live = this.live.filter((p) => p.life < p.max);
  }

  private recycle(s: Sprite): void {
    s.mesh.visible = false;
    s.mesh.removeFromParent();
    const f = (s as unknown as { frame: Frame }).frame;
    let list = this.pool.get(f);
    if (!list) { list = []; this.pool.set(f, list); }
    if (list.length < 80) list.push(s);
    else s.dispose();
  }

  clear(): void {
    for (const p of this.live) this.recycle(p.s);
    this.live = [];
  }
}
