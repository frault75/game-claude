/**
 * The Snow King, in the heart of the Frost Forest, who keeps one half of the master's seal: a yeti
 * twice as tall, crowned with icicles. He slams the snow, curls into a great snowball and rolls
 * (dodge, and he crashes into the pines, dazed), brings an avalanche down from the branches, and
 * breathes a frost that only a hedge of jade bamboo stops. Wounded, he calls his yetis. His own
 * frost does not freeze him; his fur turns the brush, unless he is dazed.
 */
import { Boss } from '../boss';
import type { World } from '../world';
import { HitInfo } from '../entity';
import { Sprite, ySort, LAYER } from '../../gfx/sprite';
import { buildSnowKingFrames, Layered4 } from '../../gfx/gen/bestiary4';
import { Painter, PIG_A, PIG_B } from '../../gfx/paint';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { Yeti } from '../beasts4';
import type { Telegraph } from '../telegraph';

let frames: Layered4 | null = null;

type Attack = 'slam' | 'roll' | 'avalanche' | 'breath' | 'call';
/** Frame indices: [idle, raise, slam, roll, breath, dazed]. */
const F = { idle: 0, raise: 1, slam: 2, roll: 3, breath: 4, dazed: 5 };

export class SnowKing extends Boss {
  private body!: Sprite;
  private redS!: Sprite;
  private shadowS!: Sprite;
  private face = 1;
  private queue: Attack[] = [];
  private tg: Telegraph | null = null;
  private aimA = 0;
  private rollLeft = 0;
  private rolls = 0;
  private spin = 0;
  private dmgMul = 1;
  private breathT = 0;
  /** Told the child about the jade, once. */
  onBreath?: (blocked: boolean) => void;
  constructor(x: number, y: number, private arena: { x: number; y: number; r: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 3200;
    this.hp = 3200;
    this.radius = 1.5;
    this.solid = false;
    this.name = 'Snow King';
    this.label = 'snowking';
    this.vulnerable = true;
  }

  init(w: World): void {
    if (!frames) frames = buildSnowKingFrames(5501);
    const sp = new Painter(6, 2.4, SPRITE_PPU / 2, -3, -1.2);
    sp.glaze();
    shadow(sp, 0, 0, 2.6, 0.9, 0.4);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames.pig[F.raise]));
    this.redS = this.addSprite(new Sprite(frames.red[F.raise]), true);
    this.setState('intro');
  }

  /** His own frost: indigo does not hold him. */
  freeze(_t: number): void {
    if (this.defeated) return;
    this.world.numbers?.pop(this.x, this.y + 6, '❄', { size: 0.5 });
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated) return false;
    let mul = this.dmgMul;
    // thick fur: the brush only grazes him unless he is dazed
    if (h.kind === 'brush' && this.state !== 'dazed') mul *= 0.7;
    const dmg = Math.max(1, Math.round(h.dmg * mul));
    const r = super.onHit({ ...h, dmg });
    if (r) this.world.numbers?.pop(this.x, this.y + 5.6, String(dmg), { size: dmg >= 50 ? 0.75 : 0.55, red: mul > 1 });
    return r;
  }

  enterPhase2(): void {
    this.queue = [];
    sfx.stagger();
    this.world.shake(0.4, 0.5);
  }

  private next(): Attack {
    if (!this.queue.length) {
      this.queue = this.phase === 1
        ? ['slam', 'roll', 'breath', 'slam', 'avalanche', 'roll']
        : ['call', 'roll', 'breath', 'avalanche', 'slam', 'roll', 'breath', 'slam'];
    }
    return this.queue.shift()!;
  }

  /** A hedge of jade between him and the child stops the frost. */
  private shielded(px: number, py: number): boolean {
    const w = this.world;
    const ax = this.x + this.face * 1.2, ay = this.y + 0.4;
    const dx = px - ax, dy = py - ay, L = Math.hypot(dx, dy) || 1;
    for (const e of w.entities) {
      if (e.label !== 'bamboo' || e.dead) continue;
      const t = ((e.x - ax) * dx + (e.y - ay) * dy) / (L * L);
      if (t < 0 || t > 1) continue;
      const cx = ax + dx * t, cy = ay + dy * t;
      if (Math.hypot(e.x - cx, e.y - cy) < 0.75) return true;
    }
    return false;
  }

  private slam(): void {
    const w = this.world, p = w.player;
    const a = Math.atan2(p.y - this.y, p.x - this.x);
    this.face = Math.cos(a) < 0 ? -1 : 1;
    const cx = this.x + Math.cos(a) * 2.2, cy = this.y + Math.sin(a) * 1.8;
    const warn = this.phase === 1 ? 0.8 : 0.6;
    sfx.telegraph('low', warn);
    this.tg = w.tele.add({ kind: 'circle', r: 3.2 }, cx, cy, 0, warn, {
      hold: 0.1,
      onFire: () => {
        if (Math.hypot(p.x - cx, p.y - cy) < 3.4) p.hurt(2, cx, cy);
        sfx.impact(true);
        w.shake(0.35, 0.3);
        w.vfx.ripple(cx, cy, 3);
        w.vfx.dust(cx, cy, 18, PIG_B);
        // wounded, the blow runs on through the snow
        if (this.phase === 2) {
          for (let i = 0; i < 2; i++) {
            const r0 = 4 + i * 2.4, r1 = r0 + 1.4;
            w.tele.add({ kind: 'ring', r0, r1 }, cx, cy, 0, 0.45 + i * 0.3, {
              hold: 0.08,
              onFire: () => {
                const d = Math.hypot(p.x - cx, p.y - cy);
                if (d > r0 - 0.3 && d < r1 + 0.3) p.hurt(1, cx, cy);
                w.vfx.ripple(cx, cy, (r0 + r1) / 2);
                sfx.impact(false);
              },
            });
          }
        }
      },
    });
    this.setState('raise');
  }

  private startRoll(warn: number): void {
    const w = this.world, p = w.player;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    this.aimA = Math.atan2(dy, dx);
    this.face = dx < 0 ? -1 : 1;
    this.rollLeft = this.arena.r * 2.2;
    this.tg = w.tele.add({ kind: 'line', length: Math.min(this.rollLeft, d + 6), width: 3.2 }, this.x, this.y, this.aimA, warn, { hold: 0.1 });
    sfx.telegraph('low', warn);
    this.setState('curl');
  }

  private avalanche(): void {
    const w = this.world, p = w.player;
    const n = this.phase === 1 ? 5 : 8;
    sfx.telegraph('mid', 1);
    w.shake(0.25, 0.8);
    for (let i = 0; i < n; i++) {
      // the first falls where the child stands; the others around, inside the clearing
      let x = p.x, y = p.y;
      if (i > 0) {
        const a = Math.random() * Math.PI * 2, r = 1.8 + Math.random() * 4;
        x = p.x + Math.cos(a) * r;
        y = p.y + Math.sin(a) * r * 0.8;
        const k = Math.hypot(x - this.arena.x, y - this.arena.y), max = this.arena.r - 1;
        if (k > max) { x = this.arena.x + ((x - this.arena.x) / k) * max; y = this.arena.y + ((y - this.arena.y) / k) * max; }
      }
      w.tele.add({ kind: 'circle', r: 1.5 }, x, y, 0, 0.95 + i * 0.16, {
        hold: 0.05,
        onFire: () => {
          if (Math.hypot(p.x - x, p.y - y) < 1.6 && p.hurt(1, x, y + 1)) p.slowT = Math.max(p.slowT, 2);
          w.vfx.dust(x, y, 14, PIG_B);
          w.vfx.ripple(x, y, 1.4);
          sfx.impact(false);
        },
      });
    }
    this.setState('roar');
  }

  private breath(): void {
    const w = this.world, p = w.player;
    this.aimA = Math.atan2(p.y - this.y - 0.4, p.x - this.x);
    this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
    const warn = this.phase === 1 ? 0.9 : 0.7;
    this.tg = w.tele.add({ kind: 'cone', radius: 8, half: 0.42 }, this.x + this.face * 1.2, this.y + 0.4, this.aimA, warn, { hold: 1.3 });
    sfx.telegraph('high', warn);
    this.breathT = 0;
    this.setState('inhale');
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world, p = w.player;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let fi = F.idle;
    let bob = 0;
    switch (this.state) {
      case 'intro':
        // he rises out of the drift he slept in
        fi = F.raise;
        bob = -Math.max(0, 1 - this.stateT / 1.2) * 2.5;
        if (Math.random() < dt * 30) w.vfx.dust(this.x + (Math.random() - 0.5) * 3, this.y, 3, PIG_B);
        if (this.stateT > 1.2 && this.stateT - dt <= 1.2) { w.shake(0.4, 0.5); sfx.impact(true); sfx.stagger(); }
        if (this.stateT > 2.1) this.setState('idle');
        break;
      case 'idle':
        this.dmgMul = 1;
        fi = F.idle;
        bob = Math.abs(Math.sin(this.stateT * 4)) * 0.08;
        this.face = dx < 0 ? -1 : 1;
        if (d > 3.2) w.move(this, (dx / d) * 2.4 * dt, (dy / d) * 2.4 * dt);
        this.keepIn();
        if (this.stateT > (this.phase === 1 ? 1.2 : 0.85)) {
          const a = this.next();
          if (a === 'slam') this.slam();
          else if (a === 'roll') { this.rolls = this.phase === 1 ? 1 : 2; this.startRoll(0.85); }
          else if (a === 'avalanche') this.avalanche();
          else if (a === 'breath') this.breath();
          else this.setState('call');
        }
        break;
      case 'raise':
        fi = F.raise;
        if (this.tg?.fired || this.stateT > 1.2) { this.tg = null; this.setState('slam'); }
        break;
      case 'slam':
        fi = F.slam;
        if (this.stateT > 0.7) this.setState('idle');
        break;
      case 'curl':
        fi = F.roll;
        this.spin += dt * 4;
        if (this.tg) this.tg.x = this.x;
        if (this.tg?.fired || this.stateT > 1.2) { this.tg = null; this.setState('roll'); w.shake(0.15, 0.2); }
        break;
      case 'roll': {
        fi = F.roll;
        const step = 17 * dt;
        this.spin += step * 0.9 * this.face;
        const ox = this.x, oy = this.y;
        w.move(this, Math.cos(this.aimA) * step, Math.sin(this.aimA) * step);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        this.rollLeft -= moved;
        if (Math.random() < 0.8) w.vfx.dust(this.x - Math.cos(this.aimA) * 1.5, this.y, 2, PIG_B);
        if (Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.3) p.hurt(2, this.x, this.y);
        const out = Math.hypot(this.x - this.arena.x, this.y - this.arena.y) > this.arena.r - 1.4;
        if (out || moved < step * 0.4) {
          this.keepIn();
          this.rolls--;
          w.shake(0.4, 0.35);
          sfx.impact(true);
          // snow falls from the pines he hit
          for (let i = 0; i < 3; i++) w.vfx.dust(this.x + (Math.random() - 0.5) * 3, this.y + 1.5, 10, PIG_B);
          if (this.rolls > 0) this.startRoll(0.5);
          else { sfx.stagger(); this.dmgMul = 1.6; this.setState('dazed'); }
        } else if (this.rollLeft <= 0) {
          this.rolls = 0;
          this.setState('recover');
        }
        break;
      }
      case 'dazed':
        fi = F.dazed;
        if (Math.random() < dt * 4) w.vfx.glowAt(this.x, this.y + 5.4, 0.6, 0.2);
        if (this.stateT > 2.6) { this.dmgMul = 1; this.setState('idle'); }
        break;
      case 'roar':
        fi = F.raise;
        bob = Math.sin(this.stateT * 30) * 0.04;
        if (this.stateT > 1.6) this.setState('idle');
        break;
      case 'inhale':
        fi = F.raise;
        if (this.tg?.fired) this.setState('breath');
        else if (this.stateT > 1.5) { this.tg = null; this.setState('idle'); }
        break;
      case 'breath': {
        fi = F.breath;
        const a = this.aimA, ox = this.x + this.face * 1.2, oy = this.y + 0.4;
        // the frost, in puffs along the cone
        if (Math.random() < dt * 40) {
          const r = Math.random() * 7.5, s = (Math.random() - 0.5) * 0.7;
          w.vfx.dust(ox + Math.cos(a + s) * r, oy + Math.sin(a + s) * r, 1, PIG_A);
        }
        this.breathT -= dt;
        if (this.breathT <= 0) {
          this.breathT = 0.22;
          const pd = Math.hypot(p.x - ox, p.y - oy);
          let da = Math.atan2(p.y - oy, p.x - ox) - a;
          da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
          if (pd < 8.2 && da < 0.48) {
            const blocked = this.shielded(p.x, p.y);
            this.onBreath?.(blocked);
            if (blocked) {
              for (const e of w.entities) if (e.label === 'bamboo' && !e.dead && Math.hypot(e.x - ox, e.y - oy) < pd) w.vfx.glowAt(e.x, e.y + 1, 0.5, 0.15);
            } else if (p.hurt(1, ox, oy)) p.slowT = Math.max(p.slowT, 2.5);
          }
        }
        if (this.stateT > 1.3) { this.tg = null; this.setState('recover'); }
        break;
      }
      case 'call':
        fi = F.raise;
        if (this.stateT > 0.6 && this.stateT - dt <= 0.6) {
          const alive = w.entities.filter((e) => e.label === 'yeti' && !e.dead).length;
          for (let k = alive; k < 2; k++) {
            const a = Math.random() * Math.PI * 2;
            const y = new Yeti(this.arena.x + Math.cos(a) * (this.arena.r - 2), this.arena.y + Math.sin(a) * (this.arena.r - 2)).setup(5, false);
            y.aggro = true;
            y.emerge = 0.6;
            w.add(y);
          }
          sfx.spawn();
          w.shake(0.3, 0.4);
        }
        if (this.stateT > 1.4) this.setState('idle');
        break;
      case 'recover':
        fi = F.idle;
        if (this.stateT > (this.phase === 1 ? 0.8 : 0.55)) this.setState('idle');
        break;
      case 'defeated':
        fi = F.dazed;
        break;
    }
    this.place(fi, bob);
  }

  private keepIn(): void {
    const dx = this.x - this.arena.x, dy = this.y - this.arena.y;
    const d = Math.hypot(dx, dy);
    const max = this.arena.r - 1.4;
    if (d > max) { this.x = this.arena.x + (dx / d) * max; this.y = this.arena.y + (dy / d) * max; }
  }

  private place(fi: number, bob: number): void {
    const f = frames!;
    const rolling = fi === F.roll;
    this.body.setTexture(f.pig[fi].tex);
    this.redS.setTexture(f.red[fi].tex);
    for (const s of [this.body, this.redS]) {
      s.setPos(this.x, this.y + bob + (rolling ? Math.abs(Math.sin(this.spin)) * 0.18 : 0));
      s.mesh.scale.set(this.face, 1, 1);
      s.mesh.renderOrder = ySort(this.y);
    }
    // a child standing behind him still shows through
    const p = this.world.player;
    const behind = p.y > this.y + 0.3 && p.y - this.y < 5.5 && Math.abs(p.x - this.x) < 2.4;
    this.body.opacity = behind ? 0.5 : 1;
    this.redS.opacity = rolling ? 0 : behind ? 0.6 : 1;
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    this.shadowS.setPos(this.x, this.y);
    if (this.state === 'defeated') {
      const k = Math.min(1, this.stateT / 1.8);
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
