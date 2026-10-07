/**
 * The Sketch, at the end of the Gallery of the Unfinished: the master's first child, painted all in
 * black and put away with the attempts. It fights like the child: a lunge and a combo of brush blows,
 * a long stroke that leaves a line of black ink behind, and an ensō drawn round the child — get out
 * before it closes (or dash through its line). Closing a circle leaves it out of breath: strike then.
 * Wounded, it has learnt: its lunges leave ink, a second circle follows the first, and it spills blots.
 */
import { Boss } from '../boss';
import type { World } from '../world';
import { Entity, HitInfo } from '../entity';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../../gfx/sprite';
import { buildSketchFrames, buildBlackRing, SKETCH_F } from '../../gfx/gen/sketch';
import { Painter, INK } from '../../gfx/paint';
import { stroke } from '../../gfx/brush';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { Blot, Splitter } from '../enemies';
import type { Telegraph } from '../telegraph';

let frames: Frame[] | null = null;
const rings = new Map<number, Frame[]>();
const RING_N = 12;

function ringFrames(r: number): Frame[] {
  let f = rings.get(r);
  if (!f) { f = buildBlackRing(r, RING_N, 5900 + Math.round(r * 10)); rings.set(r, f); }
  return f;
}

/** A line of black ink on the floor: it burns whoever walks on it, then dries. */
export class InkLine extends Entity {
  private t = 0;
  private s!: Sprite;
  constructor(private ax: number, private ay: number, private bx: number, private by: number, private life: number) {
    super();
    this.x = (ax + bx) / 2; this.y = (ay + by) / 2;
    this.label = 'inkline';
  }
  init(): void {
    const x0 = Math.min(this.ax, this.bx) - 0.5, y0 = Math.min(this.ay, this.by) - 0.5;
    const w = Math.abs(this.bx - this.ax) + 1, h = Math.abs(this.by - this.ay) + 1;
    const p = new Painter(w, h, SPRITE_PPU / 2, x0 - this.x, y0 - this.y);
    p.glaze();
    const mx = (this.ax + this.bx) / 2 - this.x + (Math.random() - 0.5) * 0.2, my = (this.ay + this.by) / 2 - this.y + (Math.random() - 0.5) * 0.2;
    stroke(p, [[this.ax - this.x, this.ay - this.y], [mx, my], [this.bx - this.x, this.by - this.y]], { width: 0.34, load: 1, dry: 0.3, seed: Math.floor(Math.random() * 1e6), taperStart: 0.05, taperEnd: 0.25, press: 0 });
    this.s = this.addSprite(new Sprite(frameFrom(p)));
    this.s.setPos(this.x, this.y);
    this.s.mesh.renderOrder = LAYER.shadow + 1;
    this.s.reveal = 0;
  }
  update(dt: number): void {
    this.t += dt;
    this.s.reveal = Math.min(2, this.t * 8);
    if (this.t > this.life) {
      this.s.opacity = Math.max(0, 1 - (this.t - this.life) / 0.5);
      if (this.t > this.life + 0.5) this.destroy();
      return;
    }
    const p = this.world.player;
    if (this.t < 0.12 || p.state === 'dash') return;
    const dx = this.bx - this.ax, dy = this.by - this.ay, L2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((p.x - this.ax) * dx + (p.y - this.ay) * dy) / L2));
    if (Math.hypot(p.x - (this.ax + dx * k), p.y - (this.ay + dy * k)) < 0.45) p.hurt(1, p.x - dy * 0.1, p.y + dx * 0.1);
  }
}

/** The black ensō being drawn round a spot, arc by arc. */
class InkRing extends Entity {
  private t = 0;
  private parts: Sprite[] = [];
  closed = false;
  constructor(x: number, y: number, private r: number, private dur: number) {
    super();
    this.x = x; this.y = y;
    this.label = 'inkring';
  }
  init(): void {
    for (const f of ringFrames(this.r)) {
      const s = this.addSprite(new Sprite(f));
      s.setPos(this.x, this.y);
      s.mesh.renderOrder = LAYER.shadow + 2;
      s.opacity = 0;
      this.parts.push(s);
    }
  }
  update(dt: number): void {
    this.t += dt;
    const k = Math.min(RING_N, Math.floor((this.t / this.dur) * RING_N + 1));
    for (let i = 0; i < this.parts.length; i++) if (i < k && this.parts[i].opacity === 0) {
      this.parts[i].opacity = 1;
      const a = -Math.PI / 2 + ((i + 0.5) / RING_N) * Math.PI * 2;
      this.world.vfx.dust(this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r, 2, INK);
    }
    if (this.t >= this.dur) this.closed = true;
    if (this.t > this.dur + 0.35) {
      const f = Math.max(0, 1 - (this.t - this.dur - 0.35) / 0.4);
      for (const s of this.parts) s.opacity = f;
      if (f <= 0) this.destroy();
    }
  }
}

type Attack = 'lunge' | 'stroke' | 'enso' | 'call';

export class Sketch extends Boss {
  private body!: Sprite;
  private shadowS!: Sprite;
  private face = 1;
  private queue: Attack[] = [];
  private tg: Telegraph | null = null;
  private aimA = 0;
  private dashLeft = 0;
  private dashSpeed = 24;
  private dashFrom: [number, number] = [0, 0];
  private trail = false;
  private hitThisDash = false;
  private dmgMul = 1;
  private strafe = 1;
  private combo = 0;
  private ring: InkRing | null = null;
  /** The HUD hears about the first circle and the second phase. */
  onEvent?: (what: 'enso' | 'learnt') => void;
  constructor(x: number, y: number, private arena: { x: number; y: number; w: number; h: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 1900;
    this.hp = 1900;
    this.radius = 0.7;
    this.solid = false;
    this.name = 'Sketch';
    this.label = 'sketch';
    this.vulnerable = true;
  }

  init(w: World): void {
    if (!frames) frames = buildSketchFrames(5801);
    const sp = new Painter(3, 1.4, SPRITE_PPU / 2, -1.5, -0.7);
    sp.glaze();
    shadow(sp, 0, 0, 1.1, 0.4, 0.45);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames[SKETCH_F.kneel]));
    this.setState('intro');
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated || this.state === 'intro') return false;
    const dmg = Math.max(1, Math.round(h.dmg * this.dmgMul));
    const r = super.onHit({ ...h, dmg });
    if (r) this.world.numbers?.pop(this.x, this.y + 3.6, String(dmg), { size: dmg >= 50 ? 0.7 : 0.5, red: this.dmgMul > 1 });
    return r;
  }

  enterPhase2(): void {
    this.queue = ['call'];
    sfx.stagger();
    this.world.shake(0.35, 0.45);
    this.onEvent?.('learnt');
  }

  private next(): Attack {
    if (!this.queue.length) {
      this.queue = this.phase === 1
        ? ['lunge', 'enso', 'stroke', 'lunge', 'stroke', 'enso']
        : ['lunge', 'stroke', 'enso', 'lunge', 'call', 'stroke', 'enso', 'lunge', 'enso'];
    }
    return this.queue.shift()!;
  }

  private dashAt(len: number, width: number, warn: number, speed: number, trail: boolean, then: 'combo' | 'recover'): void {
    const w = this.world, p = w.player;
    this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
    this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
    this.dashLeft = len;
    this.dashSpeed = speed;
    this.trail = trail;
    this.combo = then === 'combo' ? 0 : -1;
    this.tg = w.tele.add({ kind: 'line', length: len, width }, this.x, this.y, this.aimA, warn, { hold: 0.08 });
    sfx.telegraph('mid', warn);
    this.setState('windup');
  }

  private strike(): void {
    const w = this.world, p = w.player;
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    this.face = Math.cos(a) < 0 ? -1 : 1;
    const warn = this.phase === 1 ? 0.34 : 0.26;
    const x = this.x, y = this.y;
    this.tg = w.tele.add({ kind: 'cone', radius: 2.5, half: 0.85 }, x, y, a, warn, {
      hold: 0.06,
      onFire: () => {
        const d = Math.hypot(p.x - x, p.y - y);
        let da = Math.atan2(p.y - y, p.x - x) - a;
        da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
        if (d < 2.6 && da < 0.95) p.hurt(2, x, y);
        w.vfx.strikeArc(x, y + 0.6, a, this.combo);
        sfx.impact(false);
      },
    });
    this.setState('strike');
  }

  private enso(): void {
    const w = this.world, p = w.player;
    const cx = p.x, cy = p.y;
    const dur = this.phase === 1 ? 1.5 : 1.15;
    this.ring = w.add(new InkRing(cx, cy, 3, dur));
    this.face = cx < this.x ? -1 : 1;
    sfx.telegraph('high', dur);
    this.onEvent?.('enso');
    w.tele.add({ kind: 'circle', r: 2.9 }, cx, cy, 0, dur, {
      hold: 0.1,
      onFire: () => {
        if (Math.hypot(p.x - cx, p.y - cy) < 2.95 && p.state !== 'dash') p.hurt(3, cx, cy);
        w.vfx.ripple(cx, cy, 3);
        w.shake(0.25, 0.25);
        sfx.impact(true);
        if (this.phase === 2) {
          // and a wider one at once: back into the middle
          w.add(new InkRing(cx, cy, 4.6, 0.7));
          w.tele.add({ kind: 'ring', r0: 3.3, r1: 5 }, cx, cy, 0, 0.7, {
            hold: 0.08,
            onFire: () => {
              const d = Math.hypot(p.x - cx, p.y - cy);
              if (d > 3.1 && d < 5.2 && p.state !== 'dash') p.hurt(2, cx, cy);
              w.vfx.ripple(cx, cy, 4.6);
              sfx.impact(false);
            },
          });
        }
      },
    });
    this.setState('cast');
  }

  private call(): void {
    const w = this.world;
    const A = this.arena;
    // never more than three of its blots at once
    const alive = w.entities.filter((e) => (e.label === 'blot' || e.label === 'splitter') && !e.dead && !(e as unknown as { home: unknown }).home).length;
    for (let i = alive; i < 3; i++) {
      const x = A.x + 2 + Math.random() * (A.w - 4), y = A.y + 2 + Math.random() * (A.h - 4);
      const c = (i === 2 ? new Splitter(x, y) : new Blot(x, y)).setup(5, false);
      c.aggro = true;
      c.emerge = 0.6;
      w.add(c);
    }
    sfx.spawn();
    this.setState('summon');
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world, p = w.player;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let fi = SKETCH_F.idle;
    switch (this.state) {
      case 'intro': {
        // it rises out of a pool of ink, the way the child once rose off the scroll
        fi = this.stateT < 1.1 ? SKETCH_F.kneel : SKETCH_F.idle;
        this.body.dissolve = Math.max(0, 1 - this.stateT / 1.3);
        if (Math.random() < dt * 20) w.vfx.dust(this.x + (Math.random() - 0.5) * 1.6, this.y, 2, INK);
        if (this.stateT > 2) this.setState('idle');
        break;
      }
      case 'idle': {
        this.dmgMul = 1;
        fi = Math.floor(this.stateT * 3) % 2 ? SKETCH_F.idle2 : SKETCH_F.idle;
        this.face = dx < 0 ? -1 : 1;
        // keep its distance and circle, like a fencer
        const want = 4.2, sp = this.phase === 1 ? 3.4 : 4.3;
        const radial = Math.max(-1, Math.min(1, (d - want) * 0.8));
        const mx = (dx / d) * radial + (-dy / d) * this.strafe * 0.8, my = (dy / d) * radial + (dx / d) * this.strafe * 0.8;
        const ml = Math.hypot(mx, my) || 1;
        const ox = this.x, oy = this.y;
        w.move(this, (mx / ml) * sp * dt, (my / ml) * sp * dt);
        if (Math.hypot(this.x - ox, this.y - oy) < sp * dt * 0.3) this.strafe = -this.strafe;
        this.keepIn();
        if (this.stateT > (this.phase === 1 ? 0.95 : 0.6)) {
          if (Math.random() < 0.3) this.strafe = -this.strafe;
          const a = this.next();
          if (a === 'lunge') this.dashAt(Math.max(4, Math.min(9, d + 1.4)), 1.3, this.phase === 1 ? 0.55 : 0.42, 24, this.phase === 2, 'combo');
          else if (a === 'stroke') this.dashAt(Math.max(8, Math.min(15, d + 5)), 1.0, this.phase === 1 ? 0.75 : 0.58, 30, true, 'recover');
          else if (a === 'enso') this.enso();
          else this.call();
        }
        break;
      }
      case 'windup':
        fi = SKETCH_F.windup;
        if (this.tg?.fired || this.stateT > 1.2) {
          this.tg = null;
          this.dashFrom = [this.x, this.y];
          this.hitThisDash = false;
          sfx.dodge();
          this.setState('dash');
        }
        break;
      case 'dash': {
        fi = SKETCH_F.dash;
        const step = Math.min(this.dashLeft, this.dashSpeed * dt);
        const ox = this.x, oy = this.y;
        w.move(this, Math.cos(this.aimA) * step, Math.sin(this.aimA) * step);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        this.dashLeft -= step;
        if (Math.random() < 0.7) w.vfx.dust(this.x, this.y + 0.3, 1, INK);
        if (!this.hitThisDash && Math.hypot(p.x - this.x, p.y - this.y) < 0.95 && p.state !== 'dash') {
          if (p.hurt(3, this.x, this.y)) this.hitThisDash = true;
        }
        if (this.dashLeft <= 0.01 || moved < step * 0.3) {
          this.keepIn();
          if (this.trail && Math.hypot(this.x - this.dashFrom[0], this.y - this.dashFrom[1]) > 1.2) {
            w.add(new InkLine(this.dashFrom[0], this.dashFrom[1], this.x, this.y, this.phase === 1 ? 2.6 : 3.2));
          }
          if (this.combo >= 0) this.strike();
          else this.setState('recover');
        }
        break;
      }
      case 'strike':
        fi = this.stateT < 0.3 ? SKETCH_F.windup : SKETCH_F.strike;
        if (this.stateT > (this.phase === 1 ? 0.55 : 0.45)) {
          this.combo++;
          if (this.combo < 2) this.strike();
          else this.setState('recover');
        }
        break;
      case 'cast':
        fi = SKETCH_F.cast;
        if (this.ring?.closed) {
          this.ring = null;
          // drawing a whole circle takes its breath away
          this.dmgMul = 1.5;
          sfx.stagger();
          this.setState('breathless');
        } else if (this.stateT > 2.5) { this.ring = null; this.setState('recover'); }
        break;
      case 'breathless':
        fi = SKETCH_F.breathless;
        if (Math.random() < dt * 5) w.vfx.glowAt(this.x, this.y + 2.4, 0.5, 0.2);
        if (this.stateT > (this.phase === 1 ? 2.4 : 1.8)) { this.dmgMul = 1; this.setState('idle'); }
        break;
      case 'summon':
        fi = SKETCH_F.cast;
        if (this.stateT > 1.1) this.setState('idle');
        break;
      case 'recover':
        fi = SKETCH_F.idle;
        if (this.stateT > (this.phase === 1 ? 0.55 : 0.4)) this.setState('idle');
        break;
      case 'defeated':
        fi = SKETCH_F.kneel;
        break;
    }
    this.place(fi);
  }

  private keepIn(): void {
    const A = this.arena, m = 1.3;
    this.x = Math.max(A.x + m, Math.min(A.x + A.w - m, this.x));
    this.y = Math.max(A.y + m, Math.min(A.y + A.h - m, this.y));
  }

  private place(fi: number): void {
    const f = frames!;
    this.body.setTexture(f[fi].tex);
    // a head taller than the child
    const sx = this.face * (this.state === 'dash' ? 1.5 : 1.25), sy = this.state === 'dash' ? 1.05 : 1.25;
    this.body.mesh.scale.set(sx, sy, 1);
    this.body.setPos(this.x, this.y);
    this.body.mesh.renderOrder = ySort(this.y);
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    this.shadowS.setPos(this.x, this.y);
    if (this.state === 'defeated') {
      const k = Math.min(1, this.stateT / 2.6);
      this.body.dissolve = k;
      this.shadowS.opacity = 1 - k;
      if (Math.random() < 0.5 && k < 1) this.world.vfx.dust(this.x + (Math.random() - 0.5), this.y + Math.random() * 2.4, 1, INK);
    } else if (this.state !== 'intro') this.body.dissolve = 0;
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
