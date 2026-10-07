/**
 * The Ink Heron, on the island of the Lotus Lake: she stabs with her beak, beats her wings in a gust
 * that throws the child back, rains ink feathers. Her gaze burns along a line that follows the
 * child — a fresh stroke between the two of you stops it, and if she stares into your ink long
 * enough she is dazzled. Wounded, she takes to the air and dives, and calls the frogs of the lake.
 */
import { Boss } from '../boss';
import type { World } from '../world';
import { HitInfo } from '../entity';
import { Sprite, ySort, LAYER } from '../../gfx/sprite';
import { buildHeronFrames, Layered } from '../../gfx/gen/bestiary3';
import { Painter } from '../../gfx/paint';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { Frog } from '../beasts2';
import type { Telegraph } from '../telegraph';

let frames: Layered | null = null;

type Attack = 'stab' | 'gust' | 'feathers' | 'gaze' | 'dive' | 'call';

export class InkHeron extends Boss {
  private body!: Sprite;
  private redS!: Sprite;
  private shadowS!: Sprite;
  private face = 1;
  private queue: Attack[] = [];
  private tg: Telegraph | null = null;
  private aimA = 0;
  private dmgMul = 1;
  private beamA = 0;
  private beamTick = 0;
  private blockedT = 0;
  private dazeT = 0;
  frozen = 0;
  /** The room shows hints: the first gaze, the first time it is blocked. */
  onGaze?: () => void;
  onDazzled?: () => void;
  constructor(x: number, y: number, private isle: { x: number; y: number; rx: number; ry: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 2200;
    this.hp = 2200;
    this.radius = 1.0;
    this.solid = false;
    this.name = 'Ink Heron';
    this.label = 'inkheron';
    this.vulnerable = true;
  }

  init(w: World): void {
    if (!frames) frames = buildHeronFrames(5301);
    const sp = new Painter(5, 2, SPRITE_PPU / 2, -2.5, -1);
    sp.glaze();
    shadow(sp, 0, 0, 1.7, 0.6, 0.4);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames.pig[3]));
    this.redS = this.addSprite(new Sprite(frames.red[3]), true);
    this.z = 7;
    this.setState('intro');
  }

  freeze(t: number): void {
    if (this.defeated || this.state === 'aloft' || this.state === 'rise') return;
    this.frozen = Math.max(this.frozen, t * 0.4);
    if (this.tg) { this.world.tele.cancel(this.tg); this.tg = null; }
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated || this.state === 'intro' || this.state === 'rise' || this.state === 'aloft') return false;
    const dmg = Math.round(h.dmg * this.dmgMul);
    this.vulnerable = true;
    const r = super.onHit({ ...h, dmg });
    if (r) this.world.numbers?.pop(this.x, this.y + 5.6, String(dmg), { size: dmg >= 40 ? 0.7 : 0.5, red: this.dmgMul > 1 });
    return r;
  }

  enterPhase2(): void {
    this.queue = [];
    sfx.stagger();
  }

  private next(): Attack {
    if (!this.queue.length) this.queue = this.phase === 1 ? ['stab', 'feathers', 'gaze', 'stab', 'gust'] : ['dive', 'gaze', 'stab', 'feathers', 'dive', 'call', 'gust'];
    return this.queue.shift()!;
  }

  private keepIn(): void {
    const I = this.isle;
    const dx = (this.x - I.x) / (I.rx - 1.6), dy = (this.y - I.y) / (I.ry - 1.2);
    const d = Math.hypot(dx, dy);
    if (d > 1) { this.x = I.x + (dx / d) * (I.rx - 1.6); this.y = I.y + (dy / d) * (I.ry - 1.2); }
  }

  /** The eye, in world space (where the gaze starts). */
  private eye(): [number, number] {
    return [this.x + this.face * 0.9, this.y + 0.3];
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world, p = w.player;
    let fi = 0;
    if (this.frozen > 0 && !this.defeated) {
      this.frozen -= dt;
      this.place(0);
      return;
    }
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    switch (this.state) {
      case 'intro':
        fi = 3;
        this.z = Math.max(0, 7 - this.stateT * 5);
        if (this.z <= 0) { this.z = 0; w.shake(0.25, 0.3); w.vfx.ripple(this.x, this.y, 3); sfx.splash(); this.setState('idle'); }
        break;
      case 'idle': {
        this.dmgMul = 1;
        this.face = dx < 0 ? -1 : 1;
        // she keeps her distance, stepping like a wader
        const want = d < 3.5 ? -1 : d > 6.5 ? 1 : 0;
        const step = Math.sin(this.stateT * 5) > 0 ? 1 : 0.2;
        w.move(this, (dx / d) * want * 2.2 * step * dt, (dy / d) * want * 2.2 * step * dt);
        this.keepIn();
        if (this.stateT > (this.phase === 1 ? 1.1 : 0.8)) {
          const a = this.next();
          if (a === 'stab') {
            this.aimA = Math.atan2(dy, dx);
            this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
            this.tg = w.tele.add({ kind: 'line', length: 6, width: 1.0 }, this.x, this.y + 0.2, this.aimA, 0.45, { hold: 0.05 });
            sfx.telegraph('high', 0.45);
            this.setState('stabPrep');
          } else if (a === 'gust') {
            this.aimA = Math.atan2(dy, dx);
            this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
            const ang = this.aimA;
            w.tele.add({ kind: 'cone', radius: 6.5, half: 0.75 }, this.x, this.y + 0.3, ang, 0.65, {
              hold: 0.1,
              onFire: () => {
                const dd = Math.hypot(p.x - this.x, p.y - this.y);
                let da = Math.atan2(p.y - this.y, p.x - this.x) - ang;
                da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
                if (dd < 6.7 && da < 0.8) {
                  p.hurt(1, this.x, this.y);
                  for (let k = 0; k < 10; k++) w.move(p, Math.cos(ang) * 0.35, Math.sin(ang) * 0.35);
                }
                for (let k = 0; k < 6; k++) w.vfx.dust(this.x + Math.cos(ang) * k, this.y + Math.sin(ang) * k, 2);
                sfx.dodge();
              },
            });
            sfx.telegraph('mid', 0.65);
            this.setState('gust');
          } else if (a === 'feathers') {
            const n = this.phase === 1 ? 6 : 9;
            for (let k = 0; k < n; k++) {
              const a2 = Math.random() * Math.PI * 2, r = k === 0 ? 0 : 1 + Math.random() * 3.5;
              const fx = p.x + Math.cos(a2) * r, fy = p.y + Math.sin(a2) * r * 0.8;
              w.tele.add({ kind: 'circle', r: 1.1 }, fx, fy, 0, 0.8 + k * 0.08, {
                hold: 0.05,
                onFire: () => {
                  if (Math.hypot(p.x - fx, p.y - fy) < 1.1 + p.radius) p.hurt(1, fx, fy);
                  w.vfx.splat(fx, fy + 0.2, Math.random() * 6, 5, 0.6);
                },
              });
            }
            sfx.telegraph('high', 0.8);
            this.setState('feathers');
          } else if (a === 'gaze') {
            this.beamA = Math.atan2(dy, dx);
            this.beamTick = 0.5;
            this.blockedT = 0;
            this.tg = w.tele.add({ kind: 'line', length: 13, width: 0.7 }, this.eye()[0], this.eye()[1], this.beamA, 0.7, { hold: 2.2 });
            sfx.telegraph('high', 0.7);
            this.onGaze?.();
            this.setState('gaze');
          } else if (a === 'dive') { this.setState('rise'); sfx.dodge(); }
          else this.setState('call');
        }
        break;
      }
      case 'stabPrep':
        fi = 0;
        if (this.stateT > 0.45) {
          this.tg = null;
          const ax = Math.cos(this.aimA), ay = Math.sin(this.aimA);
          const along = (p.x - this.x) * ax + (p.y - this.y) * ay, across = Math.abs(-(p.x - this.x) * ay + (p.y - this.y) * ax);
          if (along > 0 && along < 6.2 && across < 0.65) p.hurt(2, this.x, this.y);
          w.vfx.strikeArc(this.x + ax * 2, this.y + ay * 2 + 0.4, this.aimA, 0);
          sfx.cut();
          this.setState('stab');
        }
        break;
      case 'stab':
        fi = 1;
        if (this.stateT > 0.35) this.setState('recover');
        break;
      case 'gust':
        fi = 2;
        if (this.stateT > 0.9) this.setState('recover');
        break;
      case 'feathers':
        fi = 2;
        if (this.stateT > 1.4) this.setState('recover');
        break;
      case 'gaze': {
        fi = 4;
        const [ex, ey] = this.eye();
        if (this.tg) { this.tg.x = ex; this.tg.y = ey; }
        if (this.stateT < 0.7) break;
        // the beam turns slowly after the child
        const want = Math.atan2(p.y - ey, p.x - ex);
        let da = want - this.beamA;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        this.beamA += Math.max(-1.1 * dt, Math.min(1.1 * dt, da));
        if (this.tg) this.tg.rot = this.beamA;
        this.face = Math.cos(this.beamA) < 0 ? -1 : 1;
        const bx = Math.cos(this.beamA), by = Math.sin(this.beamA);
        // where does it stop: fresh ink, or 13 units away
        let reach = 13;
        for (let s = 0.6; s < 13; s += 0.35) if (w.strokes.absorbs(ex + bx * s, ey + by * s, 0.15)) { reach = s; break; }
        for (let s = 0.8; s < reach; s += 1.6) w.vfx.glowAt(ex + bx * s, ey + by * s, 0.9, 0.06);
        if (reach < 13) {
          this.blockedT += dt;
          if (Math.random() < dt * 12) w.vfx.splat(ex + bx * reach, ey + by * reach + 0.2, this.beamA + Math.PI, 2, 0.5, 'red');
          if (this.blockedT > 1.1) {
            // she stared into the ink too long: dazzled
            w.tele.cancel(this.tg!);
            this.tg = null;
            this.dmgMul = 1.6;
            this.dazeT = 2.6;
            sfx.stagger();
            w.vfx.glowAt(ex, ey, 3, 0.5);
            this.onDazzled?.();
            this.setState('dazed');
            break;
          }
        }
        this.beamTick -= dt;
        if (this.beamTick <= 0) {
          this.beamTick = 0.45;
          const along = (p.x - ex) * bx + (p.y - ey) * by, across = Math.abs(-(p.x - ex) * by + (p.y - ey) * bx);
          if (along > 0 && along < reach && across < 0.55) p.hurt(1, ex, ey);
        }
        if (this.stateT > 2.9) { this.tg = null; this.setState('recover'); }
        break;
      }
      case 'rise':
        fi = 3;
        this.z = Math.min(8, this.stateT * 12);
        if (this.stateT > 0.6) {
          this.tg = w.tele.add({ kind: 'circle', r: 2.3 }, p.x, p.y, 0, 1.1, { hold: 0.05 });
          sfx.telegraph('low', 1.1);
          this.setState('aloft');
        }
        break;
      case 'aloft': {
        fi = 3;
        // she follows the child from the sky, then drops
        if (this.tg && this.stateT < 0.75) {
          this.tg.x += (p.x - this.tg.x) * Math.min(1, dt * 3);
          this.tg.y += (p.y - this.tg.y) * Math.min(1, dt * 3);
        }
        if (this.tg) { this.x = this.tg.x; this.y = this.tg.y; }
        this.keepIn();
        if (this.tg) { this.tg.x = this.x; this.tg.y = this.y; }
        if (this.stateT > 1.1) {
          this.tg = null;
          this.z = 0;
          if (Math.hypot(p.x - this.x, p.y - this.y) < 2.3 + p.radius) p.hurt(2, this.x, this.y);
          w.shake(0.35, 0.3);
          sfx.impact(true);
          sfx.splash();
          w.vfx.ripple(this.x, this.y, 2.5);
          w.vfx.splat(this.x, this.y + 0.3, Math.random() * 6, 14, 1.2);
          const r0 = 2.5, r1 = 4;
          w.tele.add({ kind: 'ring', r0, r1 }, this.x, this.y, 0, 0.35, {
            hold: 0.08,
            onFire: () => { const dd = Math.hypot(p.x - this.x, p.y - this.y); if (dd > r0 - 0.3 && dd < r1 + 0.3) p.hurt(1, this.x, this.y); },
          });
          this.setState('recover');
        }
        break;
      }
      case 'call':
        fi = 2;
        if (this.stateT > 0.6 && this.stateT - dt <= 0.6) {
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2 + Math.random();
            const f = new Frog(this.isle.x + Math.cos(a) * (this.isle.rx - 1.4), this.isle.y + Math.sin(a) * (this.isle.ry - 1)).setup(4, false);
            f.aggro = true;
            f.emerge = 0.6;
            w.add(f);
          }
          sfx.spawn();
        }
        if (this.stateT > 1.3) this.setState('idle');
        break;
      case 'recover':
        fi = 0;
        if (this.stateT > (this.phase === 1 ? 0.7 : 0.5)) this.setState('idle');
        break;
      case 'dazed':
        fi = 5;
        if (Math.random() < dt * 4) w.vfx.glowAt(this.x, this.y + 5, 0.6, 0.2);
        if (this.stateT > this.dazeT) { this.dmgMul = 1; this.setState('idle'); }
        break;
      case 'defeated':
        fi = 5;
        break;
    }
    this.place(fi);
  }

  private place(fi: number): void {
    const f = frames!;
    this.body.setTexture(f.pig[fi].tex);
    this.redS.setTexture(f.red[fi].tex);
    for (const s of [this.body, this.redS]) {
      s.setPos(this.x, this.y + this.z);
      s.mesh.scale.set(this.face, 1, 1);
      s.mesh.renderOrder = ySort(this.y);
    }
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    this.shadowS.setPos(this.x, this.y);
    const k = 1 - Math.min(0.6, this.z * 0.08);
    this.shadowS.mesh.scale.set(k, k, 1);
    if (this.state === 'defeated') {
      const t = Math.min(1, this.stateT / 2);
      this.body.dissolve = t;
      this.redS.dissolve = t;
      this.shadowS.opacity = 1 - t;
    }
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
