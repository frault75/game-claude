/**
 * The Jade Mantis Queen, in the heart of the Bamboo Grove: sweeping slashes, a lunge across the
 * clearing (dodge it, and she crashes into the bamboo, dazed), a fan of jade blades. Wounded, she
 * melts into the bamboo — only the rustling gives her away — and strikes from behind; she calls
 * her brood.
 */
import { Boss } from '../boss';
import type { World } from '../world';
import { HitInfo } from '../entity';
import { Sprite, ySort, LAYER } from '../../gfx/sprite';
import { buildQueenFrames, Layered } from '../../gfx/gen/bestiary3';
import { Painter, PIG_A } from '../../gfx/paint';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { InkDrop } from '../enemies';
import { JadeMantis } from '../beasts2';
import type { Telegraph } from '../telegraph';

let frames: Layered | null = null;

type Attack = 'slash' | 'lunge' | 'blades' | 'vanish' | 'brood';

export class MantisQueen extends Boss {
  private body!: Sprite;
  private redS!: Sprite;
  private shadowS!: Sprite;
  private face = 1;
  private queue: Attack[] = [];
  private tg: Telegraph | null = null;
  private aimA = 0;
  private slashes = 0;
  private hideAt: [number, number] = [0, 0];
  private dmgMul = 1;
  frozen = 0;
  constructor(x: number, y: number, private arena: { x: number; y: number; r: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 1500;
    this.hp = 1500;
    this.radius = 1.0;
    this.solid = false;
    this.name = 'Mantis Queen';
    this.label = 'queen';
    this.vulnerable = true;
  }

  init(w: World): void {
    if (!frames) frames = buildQueenFrames(5201);
    const sp = new Painter(5, 2, SPRITE_PPU / 2, -2.5, -1);
    sp.glaze();
    shadow(sp, 0, 0, 2.1, 0.7, 0.35);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames.pig[4]));
    this.redS = this.addSprite(new Sprite(frames.red[4]), true);
    this.setState('intro');
  }

  freeze(t: number): void {
    if (this.defeated || this.state === 'hidden') return;
    this.frozen = Math.max(this.frozen, t * 0.4);
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated || this.state === 'hidden' || (this.state === 'fade' && this.stateT > 0.25)) return false;
    const dmg = Math.round(h.dmg * this.dmgMul);
    this.vulnerable = true;
    const r = super.onHit({ ...h, dmg });
    if (r) this.world.numbers?.pop(this.x, this.y + 3.2, String(dmg), { size: dmg >= 40 ? 0.7 : 0.5, red: this.dmgMul > 1 });
    return r;
  }

  enterPhase2(): void {
    this.queue = [];
    sfx.stagger();
  }

  private next(): Attack {
    if (!this.queue.length) this.queue = this.phase === 1 ? ['slash', 'lunge', 'blades', 'slash', 'lunge'] : ['vanish', 'slash', 'blades', 'vanish', 'lunge', 'brood'];
    return this.queue.shift()!;
  }

  private slash(): void {
    const w = this.world, p = w.player;
    this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
    this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
    const warn = this.slashes > 1 ? 0.4 : 0.55;
    const a = this.aimA;
    this.tg = w.tele.add({ kind: 'cone', radius: 4.2, half: 1.0 }, this.x, this.y + 0.3, a, warn, {
      hold: 0.06,
      onFire: () => {
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        let da = Math.atan2(p.y - this.y, p.x - this.x) - a;
        da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
        if (d < 4.4 && da < 1.05) p.hurt(2, this.x, this.y);
        for (let k = -2; k <= 2; k++) w.vfx.strikeArc(this.x, this.y + 0.6, a + k * 0.3, k & 1);
        sfx.cut();
      },
    });
    sfx.telegraph('mid', warn);
    this.setState('raise');
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world, p = w.player;
    let fi = 0;
    if (this.frozen > 0 && !this.defeated) {
      this.frozen -= dt;
      this.place(0, 1);
      return;
    }
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let alpha = 1;
    switch (this.state) {
      case 'intro':
        fi = 4;
        this.z = Math.max(0, 2.5 - this.stateT * 2);
        if (this.stateT > 1.4) { this.z = 0; this.setState('idle'); w.shake(0.2, 0.2); }
        break;
      case 'idle':
        this.dmgMul = 1;
        fi = 3;
        this.face = dx < 0 ? -1 : 1;
        if (d > 3) w.move(this, (dx / d) * 3.4 * dt, (dy / d) * 3.4 * dt);
        this.keepIn();
        if (this.stateT > (this.phase === 1 ? 1.0 : 0.7)) {
          const a = this.next();
          if (a === 'slash') { this.slashes = this.phase === 1 ? 1 : 2; this.slash(); }
          else if (a === 'lunge') {
            this.aimA = Math.atan2(dy, dx);
            this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
            this.tg = w.tele.add({ kind: 'line', length: 12, width: 1.4 }, this.x, this.y, this.aimA, 0.6, { hold: 0.05 });
            sfx.telegraph('high', 0.6);
            this.setState('lungePrep');
          } else if (a === 'blades') { this.setState('blades'); sfx.telegraph('high', 0.5); }
          else if (a === 'vanish') this.setState('fade');
          else this.setState('brood');
        }
        break;
      case 'raise':
        fi = 1;
        if (this.tg?.fired || this.stateT > 1) {
          this.tg = null;
          this.slashes--;
          this.setState('slash');
        }
        break;
      case 'slash':
        fi = 2;
        if (this.stateT > 0.3) {
          if (this.slashes > 0) this.slash();
          else this.setState('recover');
        }
        break;
      case 'lungePrep':
        fi = 1;
        if (this.stateT > 0.6) { this.tg = null; this.setState('lunge'); }
        break;
      case 'lunge': {
        fi = 2;
        const step = 22 * dt;
        const ox = this.x, oy = this.y;
        w.move(this, Math.cos(this.aimA) * step, Math.sin(this.aimA) * step);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.2) p.hurt(2, this.x, this.y);
        if (Math.random() < 0.6) w.vfx.dust(this.x, this.y, 2, PIG_A);
        const out = Math.hypot(this.x - this.arena.x, this.y - this.arena.y) > this.arena.r - 0.8;
        const moved = Math.hypot(this.x - ox, this.y - oy);
        if (out || moved < step * 0.4) {
          // into the bamboo: dazed
          this.keepIn();
          w.shake(0.3, 0.3);
          sfx.impact(true);
          sfx.stagger();
          w.vfx.splat(this.x, this.y + 1, this.aimA + Math.PI, 12, 1.2);
          this.dmgMul = 1.6;
          this.setState('dazed');
        } else if (this.stateT > 0.55) this.setState('recover');
        break;
      }
      case 'blades':
        fi = this.stateT < 0.5 ? 1 : 2;
        if (this.stateT > 0.5 && this.stateT - dt <= 0.5) {
          const n = this.phase === 1 ? 3 : 5;
          const base = Math.atan2(dy, dx);
          for (let k = 0; k < n; k++) {
            const a = base + (k - (n - 1) / 2) * 0.28;
            w.add(new InkDrop(this.x + Math.cos(base), this.y + 1.2, Math.cos(a) * 6.2, Math.sin(a) * 6.2, this));
          }
          sfx.cut();
        }
        if (this.stateT > 0.9) this.setState('recover');
        break;
      case 'fade':
        fi = 4;
        alpha = Math.max(0, 1 - this.stateT * 2.5);
        if (this.stateT > 0.45) {
          // somewhere behind the child
          const a = Math.atan2(dy, dx);
          const hx = p.x + Math.cos(a) * 3, hy = p.y + Math.sin(a) * 3;
          const k = Math.hypot(hx - this.arena.x, hy - this.arena.y);
          const max = this.arena.r - 1.5;
          this.hideAt = k > max ? [this.arena.x + ((hx - this.arena.x) / k) * max, this.arena.y + ((hy - this.arena.y) / k) * max] : [hx, hy];
          this.setState('hidden');
        }
        break;
      case 'hidden': {
        alpha = 0;
        const tx = this.hideAt[0] - this.x, ty = this.hideAt[1] - this.y, td = Math.hypot(tx, ty) || 1;
        w.move(this, (tx / td) * Math.min(td, 9 * dt), (ty / td) * Math.min(td, 9 * dt));
        // the bamboo rustles where she passes
        if (Math.random() < dt * 10) w.vfx.dust(this.x + (Math.random() - 0.5), this.y, 2, PIG_A);
        if (this.stateT > 1.5) {
          this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
          this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
          this.slashes = 1;
          sfx.telegraph('high', 0.5);
          const a = this.aimA;
          this.tg = w.tele.add({ kind: 'cone', radius: 4, half: 1.1 }, this.x, this.y + 0.3, a, 0.5, {
            hold: 0.05,
            onFire: () => {
              const dd = Math.hypot(p.x - this.x, p.y - this.y);
              let da = Math.atan2(p.y - this.y, p.x - this.x) - a;
              da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
              if (dd < 4.2 && da < 1.15) p.hurt(2, this.x, this.y);
              for (let k = -2; k <= 2; k++) w.vfx.strikeArc(this.x, this.y + 0.6, a + k * 0.3, k & 1);
              sfx.cut();
            },
          });
          this.setState('ambush');
        }
        break;
      }
      case 'ambush':
        fi = 1;
        alpha = Math.min(1, this.stateT * 3);
        if (this.stateT > 0.5) { this.tg = null; this.slashes = 0; this.setState('slash'); }
        break;
      case 'brood':
        fi = 4;
        if (this.stateT > 0.5 && this.stateT - dt <= 0.5) {
          for (let k = 0; k < 2; k++) {
            const a = Math.random() * Math.PI * 2;
            const m = new JadeMantis(this.arena.x + Math.cos(a) * (this.arena.r - 2), this.arena.y + Math.sin(a) * (this.arena.r - 2)).setup(4, false);
            m.aggro = true;
            m.emerge = 0.6;
            w.add(m);
          }
          sfx.spawn();
        }
        if (this.stateT > 1.2) this.setState('idle');
        break;
      case 'recover':
        fi = 0;
        if (this.stateT > (this.phase === 1 ? 0.7 : 0.5)) this.setState('idle');
        break;
      case 'dazed':
        fi = 0;
        if (Math.random() < dt * 4) w.vfx.glowAt(this.x, this.y + 2.8, 0.6, 0.2);
        if (this.stateT > 2.2) { this.dmgMul = 1; this.setState('idle'); }
        break;
      case 'defeated':
        fi = 0;
        break;
    }
    this.place(fi, alpha);
  }

  private keepIn(): void {
    const dx = this.x - this.arena.x, dy = this.y - this.arena.y;
    const d = Math.hypot(dx, dy);
    const max = this.arena.r - 1.2;
    if (d > max) { this.x = this.arena.x + (dx / d) * max; this.y = this.arena.y + (dy / d) * max; }
  }

  private place(fi: number, alpha: number): void {
    const f = frames!;
    this.body.setTexture(f.pig[fi].tex);
    this.redS.setTexture(f.red[fi].tex);
    for (const s of [this.body, this.redS]) {
      s.setPos(this.x, this.y + this.z);
      s.mesh.scale.set(this.face * 1.25, 1.25, 1);
      s.mesh.renderOrder = ySort(this.y);
      s.opacity = alpha;
    }
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    this.shadowS.setPos(this.x, this.y);
    this.shadowS.opacity = alpha;
    if (this.state === 'defeated') {
      const k = Math.min(1, this.stateT / 1.6);
      this.body.dissolve = k;
      this.redS.dissolve = k;
      this.shadowS.opacity = 1 - k;
    }
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
