/**
 * The Paper Dragon, on the Glacier, who keeps the other half of the master's seal: a thousand
 * folded wishes become one long body. It flies out of reach of the brush, swoops along a line (then
 * lies on the ice to fold itself again: strike then), sheds paper blades from every fold, coils
 * around the child to crush them (find the gap, or dash through). Gold lightning strikes it out of
 * the sky. Wounded, its tail unfolds into a flight of cranes and the rest of it grows faster.
 */
import { Boss } from '../boss';
import { Entity, HitInfo } from '../entity';
import type { World } from '../world';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../../gfx/sprite';
import { buildDragonFrames } from '../../gfx/gen/bestiary4';
import { Painter, PIG_A, PIG_B } from '../../gfx/paint';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { PaperCrane } from '../beasts4';
import type { Telegraph } from '../telegraph';

type Art = ReturnType<typeof buildDragonFrames>;
let art: Art | null = null;
let shadowArt: Frame | null = null;

const SPACING = 0.95;
const FLY_Z = 3.2;

/** One fold of the body: it can be struck, and the blow goes to the dragon. */
export class DragonSeg extends Entity {
  s!: Sprite;
  sh!: Sprite;
  angle = 0;
  constructor(private owner: PaperDragon, private tail: boolean) {
    super();
    this.team = 'enemy';
    this.radius = 0.6;
    this.label = 'dragonseg';
    this.airborne = true;
  }
  init(w: World): void {
    this.s = this.addSprite(new Sprite(this.tail ? art!.tail : art!.seg));
    this.sh = new Sprite(shadowArt!);
    this.sh.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.sh.mesh);
  }
  onHit(h: HitInfo): boolean {
    return this.owner.hitFrom(h, this.z);
  }
  place(pale: boolean, alpha: number): void {
    this.s.setPos(this.x, this.y + this.z);
    this.s.mesh.rotation.z = this.angle;
    this.s.mesh.renderOrder = ySort(this.y - 0.2);
    this.s.pale = pale ? 0.6 : 0;
    this.s.opacity = alpha;
    this.sh.setPos(this.x, this.y);
    this.sh.opacity = alpha * Math.max(0.25, 1 - this.z / 5);
    const k = 1 - Math.min(0.5, this.z / 8);
    this.sh.mesh.scale.set(k, k, 1);
  }
  dispose(): void {
    super.dispose();
    this.sh.dispose();
  }
}

export class PaperDragon extends Boss {
  private head!: Sprite;
  private headRed!: Sprite;
  private shadowS!: Sprite;
  private segs: DragonSeg[] = [];
  private trail: [number, number, number][] = [];
  private hd = 0;
  private spd = 0;
  private targetZ = 0;
  private theta = 0;
  private orbit = 1;
  private queue: string[] = [];
  private tg: Telegraph | null = null;
  private aimA = 0;
  private lineLeft = 0;
  private swoops = 0;
  private coil: { cx: number; cy: number; phi: number; locked: boolean } | null = null;
  private dmgMul = 1;
  private clock = 0;
  private lastHit: Record<string, number> = {};
  private hitCd = 0;
  /** A gold bolt struck it out of the sky (the area tells the child, once). */
  onDowned?: () => void;
  constructor(x: number, y: number, private arena: { x: number; y: number; r: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 3000;
    this.hp = 3000;
    this.radius = 1.0;
    this.solid = false;
    this.airborne = true;
    this.name = 'Paper Dragon';
    this.label = 'dragon';
    this.vulnerable = true;
  }

  init(w: World): void {
    if (!art) art = buildDragonFrames(5601);
    if (!shadowArt) {
      const sp = new Painter(2.4, 1.2, SPRITE_PPU / 2, -1.2, -0.6);
      sp.glaze();
      shadow(sp, 0, 0, 0.9, 0.4, 0.3);
      shadowArt = frameFrom(sp);
    }
    const sp = new Painter(3.6, 1.6, SPRITE_PPU / 2, -1.8, -0.8);
    sp.glaze();
    shadow(sp, 0, 0, 1.4, 0.55, 0.35);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.head = this.addSprite(new Sprite(art.head[1]));
    this.headRed = this.addSprite(new Sprite(art.headRed[1]), true);
    // folded flat on the ice, a long sheet: the body lies behind the head
    for (let i = 0; i < 12; i++) this.segs.push(w.add(new DragonSeg(this, i === 11)));
    for (let i = 0; i < 40; i++) this.trail.push([this.x - i * 0.3, this.y, 0]);
    this.hd = 0;
    w.onBolt.push((x, y, r) => this.bolt(x, y, r));
    this.setState('intro');
  }

  /** Any blow to the head or to a fold. One blow of a kind at a time (a loop over the body counts once). */
  hitFrom(h: HitInfo, z: number): boolean {
    if (this.defeated || this.state === 'intro' || this.state === 'fold') return false;
    // out of reach in the sky; a loop drawn under it, or ink, still reaches
    if (z > 1.6 && h.kind !== 'enso' && h.kind !== 'ink') return false;
    if (this.clock - (this.lastHit[h.kind] ?? -1) < 0.09) return false;
    this.lastHit[h.kind] = this.clock;
    const dmg = Math.max(1, Math.round(h.dmg * this.dmgMul));
    const r = super.onHit({ ...h, dmg });
    if (r) this.world.numbers?.pop(this.x, this.y + this.z + 1.8, String(dmg), { size: dmg >= 50 ? 0.7 : 0.5, red: this.dmgMul > 1 });
    return r;
  }

  onHit(h: HitInfo): boolean {
    return this.hitFrom(h, this.z);
  }

  /** Gold lightning: it is struck, and if it was flying, it falls. */
  private bolt(x: number, y: number, r: number): void {
    if (this.dead || this.defeated || this.state === 'intro' || this.state === 'fold') return;
    const near = [this as Entity, ...this.segs].some((e) => Math.hypot(e.x - x, e.y - y) < r + 1.1);
    if (!near) return;
    const flying = this.z > 1.2;
    this.lastHit.ink = -1;
    this.hitFrom({ dmg: flying ? 70 : 45, fromX: x, fromY: y, kind: 'ink' }, 0);
    if (flying && !this.defeated) {
      this.world.tele.clear();
      this.tg = null;
      this.coil = null;
      sfx.stagger();
      this.setState('downed');
      this.onDowned?.();
    }
  }

  freeze(t: number): void {
    // paper stiffens with frost: a moment's pause, no more
    if (this.defeated || this.z > 1.2) return;
    this.spd *= 0.3;
    this.world.numbers?.pop(this.x, this.y + 2, '❄', { size: 0.4 });
    void t;
  }

  enterPhase2(): void {
    this.queue = [];
    this.world.tele.clear();
    this.tg = null;
    this.coil = null;
    this.setState('fold');
  }

  private next(): string {
    if (!this.queue.length) this.queue = this.phase === 1 ? ['swoop', 'blades', 'swoop', 'coil'] : ['swoop', 'coil', 'blades', 'swoop', 'blades', 'coil'];
    return this.queue.shift()!;
  }

  private steer(tx: number, ty: number, speed: number, turn: number, dt: number): number {
    const want = Math.atan2(ty - this.y, tx - this.x);
    let da = want - this.hd;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    this.hd += Math.max(-turn * dt, Math.min(turn * dt, da));
    this.spd += (speed - this.spd) * Math.min(1, dt * 3);
    this.x += Math.cos(this.hd) * this.spd * dt;
    this.y += Math.sin(this.hd) * this.spd * dt;
    return Math.hypot(tx - this.x, ty - this.y);
  }

  private orbitPoint(r: number): [number, number] {
    return [this.arena.x + Math.cos(this.theta) * r, this.arena.y + Math.sin(this.theta) * r * 0.75];
  }

  private blades(): void {
    const w = this.world, p = w.player;
    sfx.telegraph('high', 0.7);
    const parts = [this as Entity, ...this.segs];
    parts.forEach((e, i) => {
      if (i % (this.phase === 1 ? 2 : 1) !== 0) return;
      const x = e.x, y = e.y;
      w.tele.add({ kind: 'circle', r: 0.95 }, x, y, 0, 0.7 + i * 0.05, {
        hold: 0.04,
        onFire: () => {
          if (Math.hypot(p.x - x, p.y - y) < 1.05) p.hurt(1, x, y + 1);
          w.vfx.strikeArc(x, y + 0.3, Math.random() * Math.PI * 2, i & 1);
          if (i % 3 === 0) sfx.cut();
        },
      });
    });
    // and a fan of blades at the child
    for (let k = -1; k <= 1; k++) {
      const a = Math.atan2(p.y - this.y, p.x - this.x) + k * 0.5;
      const x = p.x + Math.cos(a) * 1.4 * Math.abs(k), y = p.y + Math.sin(a) * 1.2 * Math.abs(k);
      w.tele.add({ kind: 'circle', r: 1.0 }, x, y, 0, 1.05, {
        hold: 0.04,
        onFire: () => { if (Math.hypot(p.x - x, p.y - y) < 1.1) p.hurt(1, x, y + 1); w.vfx.dust(x, y, 6, PIG_A); },
      });
    }
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world, p = w.player;
    this.clock += dt;
    this.hitCd = Math.max(0, this.hitCd - dt);
    const fast = this.phase === 2 ? 1.25 : 1;
    let open = false;
    switch (this.state) {
      case 'intro': {
        // the sheet unfolds, then rises in a spiral
        this.targetZ = this.stateT < 1 ? 0 : FLY_Z;
        if (this.stateT < 1) { if (Math.random() < dt * 20) w.vfx.dust(this.x + (Math.random() - 0.5) * 4, this.y, 2, PIG_B); }
        else { this.theta += dt * 1.2; this.steer(...this.orbitPoint(4), 6, 3, dt); }
        if (this.stateT > 1 && this.stateT - dt <= 1) { sfx.wave(); w.shake(0.2, 0.3); }
        if (this.stateT > 3) this.setState('circle');
        break;
      }
      case 'circle': {
        this.dmgMul = 1;
        this.targetZ = FLY_Z;
        this.theta += dt * 0.9 * this.orbit * fast;
        this.steer(...this.orbitPoint(this.arena.r - 1.5), 8 * fast, 3.2, dt);
        if (this.stateT > (this.phase === 1 ? 2.4 : 1.6)) {
          const a = this.next();
          if (a === 'swoop') { this.swoops = this.phase === 1 ? 1 : 2; this.setState('aim'); }
          else if (a === 'blades') { this.blades(); this.setState('shed'); }
          else { const c = { cx: p.x, cy: p.y, phi: Math.atan2(this.y - p.y, this.x - p.x), locked: false }; this.coil = c; this.setState('coil'); }
        }
        break;
      }
      case 'aim': {
        // hover, turned towards the child, then mark the line
        this.targetZ = FLY_Z;
        this.spd *= Math.max(0, 1 - dt * 4);
        this.x += Math.cos(this.hd) * this.spd * dt;
        this.y += Math.sin(this.hd) * this.spd * dt;
        const want = Math.atan2(p.y - this.y, p.x - this.x);
        let da = want - this.hd;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        this.hd += Math.max(-5 * dt, Math.min(5 * dt, da));
        if (this.stateT > 0.35 && !this.tg) {
          this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
          // across the whole field, from where it hangs
          this.lineLeft = Math.hypot(p.x - this.x, p.y - this.y) + 7;
          const warn = this.swoops > 1 && this.phase === 2 ? 0.6 : 0.85;
          this.tg = w.tele.add({ kind: 'line', length: this.lineLeft, width: 1.8 }, this.x, this.y, this.aimA, warn, { hold: 0.1 });
          sfx.telegraph('high', warn);
        }
        if (this.tg?.fired) { this.tg = null; this.hd = this.aimA; this.setState('swoop'); sfx.dodge(); }
        break;
      }
      case 'swoop': {
        this.targetZ = 0.5;
        const step = 21 * fast * dt;
        this.x += Math.cos(this.aimA) * step;
        this.y += Math.sin(this.aimA) * step;
        this.spd = 21 * fast;
        this.lineLeft -= step;
        if (Math.random() < 0.6) w.vfx.dust(this.x, this.y, 1, PIG_A);
        open = true;
        if (this.lineLeft <= 0) {
          this.swoops--;
          if (this.swoops > 0) this.setState('aim');
          else { this.setState('landed'); w.vfx.dust(this.x, this.y, 14, PIG_B); sfx.impact(false); }
        }
        break;
      }
      case 'landed':
      case 'downed': {
        // flat on the ice, refolding itself: now the brush can reach it
        this.targetZ = 0;
        this.spd *= Math.max(0, 1 - dt * 6);
        this.x += Math.cos(this.hd) * this.spd * dt;
        this.y += Math.sin(this.hd) * this.spd * dt;
        this.dmgMul = this.state === 'downed' ? 1.5 : 1.3;
        if (this.state === 'downed' && Math.random() < dt * 4) w.vfx.glowAt(this.x, this.y + 1.2, 0.5, 0.2);
        const hold = this.state === 'downed' ? 3.2 : this.phase === 1 ? 2.4 : 1.7;
        if (this.stateT > hold) { this.dmgMul = 1; this.orbit *= -1; this.setState('rise'); }
        break;
      }
      case 'rise':
        this.targetZ = FLY_Z;
        this.theta = Math.atan2((this.y - this.arena.y) / 0.75, this.x - this.arena.x);
        this.steer(...this.orbitPoint(this.arena.r - 1.5), 6, 2.5, dt);
        if (this.stateT > 1) this.setState('circle');
        break;
      case 'shed':
        this.targetZ = FLY_Z;
        this.theta += dt * 0.9 * this.orbit;
        this.steer(...this.orbitPoint(this.arena.r - 2), 7, 3, dt);
        if (this.stateT > 1.6) this.setState('circle');
        break;
      case 'coil': {
        const c = this.coil!;
        const R = 2.4;
        if (!c.locked) {
          this.targetZ = 0.5;
          const tx = c.cx + Math.cos(c.phi) * R, ty = c.cy + Math.sin(c.phi) * R * 0.8;
          if (this.steer(tx, ty, 14 * fast, 6, dt) < 1 || this.stateT > 2.5) {
            c.locked = true;
            this.stateT = 0;
            this.tg = w.tele.add({ kind: 'circle', r: R - 0.3 }, c.cx, c.cy, 0, 1.5, {
              hold: 0.1,
              onFire: () => {
                if (Math.hypot(p.x - c.cx, p.y - c.cy) < R - 0.1) p.hurt(3, c.cx, c.cy);
                w.shake(0.3, 0.3);
                sfx.impact(true);
                w.vfx.ripple(c.cx, c.cy, R);
              },
            });
            sfx.telegraph('mid', 1.5);
          }
        } else {
          // round and round the child, the body closing like a fist
          c.phi += dt * (8 / R) * this.orbit;
          this.x = c.cx + Math.cos(c.phi) * R;
          this.y = c.cy + Math.sin(c.phi) * R * 0.8;
          this.hd = c.phi + (Math.PI / 2) * this.orbit;
          this.spd = 8;
          open = true;
          if (this.tg?.fired || this.stateT > 1.8) { this.tg = null; this.coil = null; this.setState('rise'); }
        }
        break;
      }
      case 'fold': {
        // its tail unfolds into cranes
        this.targetZ = 1.6;
        this.spd *= Math.max(0, 1 - dt * 3);
        if (this.stateT > 0.6 && this.stateT - dt <= 0.6) {
          const shed = this.segs.splice(6, this.segs.length - 7);
          for (const s of shed) {
            const cr = new PaperCrane(s.x, s.y).setup(5, false);
            cr.aggro = true;
            cr.emerge = 0.4;
            w.add(cr);
            w.vfx.dust(s.x, s.y + s.z, 8, PIG_B);
            s.destroy();
          }
          sfx.spawn();
          sfx.wave();
        }
        if (this.stateT > 1.6) this.setState('rise');
        break;
      }
      case 'defeated':
        this.targetZ = 0;
        this.spd *= Math.max(0, 1 - dt * 3);
        break;
    }
    this.z += (this.targetZ - this.z) * Math.min(1, dt * (this.state === 'downed' ? 8 : 3));
    // the body follows the head's path
    const last = this.trail[0];
    if (!last || Math.hypot(this.x - last[0], this.y - last[1]) > 0.2 || Math.abs(this.z - last[2]) > 0.2) {
      this.trail.unshift([this.x, this.y, this.z]);
      if (this.trail.length > 120) this.trail.length = 120;
    }
    this.layBody(open);
    this.place();
  }

  /** Each fold sits at its distance along the path; low folds bruise the child. */
  private layBody(open: boolean): void {
    const p = this.world.player;
    let want = SPACING * 1.1, acc = 0, i = 0;
    let prev: [number, number, number] = [this.x, this.y, this.z];
    for (const s of this.segs) {
      while (i < this.trail.length) {
        const q = this.trail[i];
        const l = Math.hypot(q[0] - prev[0], q[1] - prev[1]);
        if (acc + l >= want) {
          const t = (want - acc) / (l || 1);
          prev = [prev[0] + (q[0] - prev[0]) * t, prev[1] + (q[1] - prev[1]) * t, prev[2] + (q[2] - prev[2]) * t];
          acc = 0;
          break;
        }
        acc += l;
        prev = q;
        i++;
      }
      const ox = s.x, oy = s.y + s.z;
      s.x = prev[0]; s.y = prev[1]; s.z = prev[2];
      if (Math.hypot(s.x - ox, s.y + s.z - oy) > 0.01) s.angle = Math.atan2(oy - (s.y + s.z), ox - s.x);
      want = SPACING;
      s.place(this.flash > 0, this.state === 'defeated' ? 1 - Math.min(1, this.stateT / 1.6) : 1);
      if (open && s.z < 0.9 && this.hitCd <= 0 && Math.hypot(p.x - s.x, p.y - s.y) < s.radius + p.radius + 0.1) {
        if (p.hurt(this.state === 'coil' ? 1 : 2, s.x, s.y)) this.hitCd = 0.5;
      }
    }
    if (open && this.z < 0.9 && this.hitCd <= 0 && Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius + 0.2) {
      if (p.hurt(2, this.x, this.y)) this.hitCd = 0.5;
    }
  }

  private place(): void {
    const a = art!;
    const shut = this.state === 'landed' || this.state === 'downed' || this.state === 'defeated' || (this.state === 'intro' && this.stateT < 1);
    const face = Math.cos(this.hd) < 0 ? -1 : 1;
    this.head.setTexture(a.head[shut ? 1 : 0].tex);
    this.headRed.setTexture(a.headRed[shut ? 1 : 0].tex);
    const tilt = Math.max(-0.5, Math.min(0.5, Math.sin(this.hd) * 0.5)) * face;
    for (const s of [this.head, this.headRed]) {
      s.setPos(this.x, this.y + this.z);
      s.mesh.scale.set(face, 1, 1);
      s.mesh.rotation.z = tilt;
      s.mesh.renderOrder = ySort(this.y - 0.3);
    }
    this.head.pale = this.flash > 0 ? 0.6 : 0;
    this.shadowS.setPos(this.x, this.y);
    this.shadowS.opacity = Math.max(0.25, 1 - this.z / 5);
    if (this.state === 'defeated') {
      const k = Math.min(1, this.stateT / 1.6);
      this.head.dissolve = k;
      this.headRed.dissolve = k;
      this.shadowS.opacity = 1 - k;
    }
  }

  destroy(): void {
    for (const s of this.segs) s.destroy();
    this.segs = [];
    super.destroy();
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
