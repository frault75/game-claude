/**
 * The Faceless Monk, at the top of the Sky Pagoda: the abbot whose face the storm erased and sealed
 * in red. He paints lines across the hall that stay wet and burn, strikes with an open palm, vanishes
 * and comes back behind the child, and erases the page under their feet (ink and pigment with it).
 * Wounded, he splits into shadows of ink — while they stand he is shielded — and goes to drink from
 * the jade jar to heal: strike him hard or freeze him and he chokes.
 */
import { Boss } from '../boss';
import type { World } from '../world';
import { Entity, HitInfo } from '../entity';
import { Creature } from '../enemies';
import { Sprite, Frame, ySort, LAYER } from '../../gfx/sprite';
import { buildFacelessFrames, buildJarFrames, Layered } from '../../gfx/gen/bestiary3';
import { Painter } from '../../gfx/paint';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { distToSeg } from '../physics';
import { sfx } from '../../audio/sfx';

let frames: Layered | null = null;
let jarFrames: Frame[] | null = null;

type Room = { x: number; y: number; w: number; h: number };
type Attack = 'paint' | 'palm' | 'blink' | 'erase' | 'copies' | 'drink';

/** The jade jar at the top of the pagoda. */
export class JadeJar extends Entity {
  private s!: Sprite;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.8;
    this.solid = true;
    this.weight = Infinity;
    this.label = 'jar';
  }
  init(): void {
    jarFrames ??= buildJarFrames(5501);
    this.s = this.addSprite(new Sprite(jarFrames[0]));
    this.s.setPos(this.x, this.y);
    this.s.mesh.renderOrder = ySort(this.y);
  }
  open(): void {
    this.s.setTexture(jarFrames![1].tex);
  }
  update(dt: number): void {
    if (Math.random() < dt * 1.5) this.world.vfx.glowAt(this.x, this.y + 1, 1.6, 0.25);
  }
}

/** A shadow of the Faceless Monk: ink without a seal. While any stand, the monk is shielded. */
export class ShadowMonk extends Creature {
  private t = Math.random() * 3;
  private mode: 'walk' | 'raise' | 'strike' = 'walk';
  private modeT = 0;
  private aimA = 0;
  private faceX = 1;
  constructor(x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.6;
    this.hp = 60;
    this.maxHp = 60;
    this.xp = 0;
    this.knockback = 0.6;
    this.aggro = true;
    this.label = 'shadowmonk';
  }
  init(w: World): void {
    frames ??= buildFacelessFrames(5401);
    this.body = this.addSprite(new Sprite(frames.pig[0]));
    this.initCommon(w, 0.8);
    this.body.opacity = 0.6;
  }
  update(dt: number): void {
    if (!this.baseUpdate(dt)) return;
    const w = this.world, p = w.player, f = frames!;
    this.t += dt;
    this.modeT += dt;
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let fi = 0;
    if (this.mode === 'walk') {
      this.faceX = dx;
      w.move(this, (dx / d) * 2.2 * dt, (dy / d) * 2.2 * dt);
      if (d < 3.2 && this.modeT > 1.2) {
        this.aimA = Math.atan2(dy, dx);
        w.tele.add({ kind: 'cone', radius: 3.2, half: 0.85 }, this.x, this.y + 0.3, this.aimA, 0.6, {
          hold: 0.05,
          onFire: () => {
            if (this.dead) return;
            let da = Math.atan2(p.y - this.y, p.x - this.x) - this.aimA;
            da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
            if (Math.hypot(p.x - this.x, p.y - this.y) < 3.4 && da < 0.9) p.hurt(1, this.x, this.y);
            sfx.cut();
          },
        });
        sfx.telegraph('mid', 0.6);
        this.mode = 'raise';
        this.modeT = 0;
      }
    } else if (this.mode === 'raise') {
      fi = 1;
      if (this.modeT > 0.6) { this.mode = 'strike'; this.modeT = 0; }
    } else {
      fi = 1;
      if (this.modeT > 0.4) { this.mode = 'walk'; this.modeT = 0; }
    }
    this.body.setTexture(f.pig[fi].tex);
    this.body.setPos(this.x, this.y);
    this.body.mesh.scale.set((this.faceX < 0 ? -1 : 1) * 0.85, 0.85, 1);
    this.body.mesh.renderOrder = ySort(this.y);
    this.body.pale = this.flash > 0 ? 0.7 : 0;
    this.body.opacity = 0.55 + Math.sin(this.t * 3) * 0.1;
    this.shadowS?.setPos(this.x, this.y);
  }
}

interface WetLine { ax: number; ay: number; bx: number; by: number; t: number; tick: number }

export class FacelessMonk extends Boss {
  private body!: Sprite;
  private redS!: Sprite;
  private shadowS!: Sprite;
  private face = 1;
  private queue: Attack[] = [];
  private aimA = 0;
  private dmgMul = 1;
  private dazeT = 0;
  private wet: WetLine[] = [];
  private copies: ShadowMonk[] = [];
  private drinkHurt = 0;
  private hideAt: [number, number] = [0, 0];
  frozen = 0;
  onErase?: () => void;
  onShield?: () => void;
  onDrink?: () => void;
  onChoke?: () => void;

  constructor(x: number, y: number, private room: Room, private jar: JadeJar) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 2800;
    this.hp = 2800;
    this.radius = 1.0;
    this.solid = false;
    this.name = 'Faceless Monk';
    this.label = 'faceless';
    this.vulnerable = true;
  }

  init(w: World): void {
    frames ??= buildFacelessFrames(5401);
    const sp = new Painter(5, 2, SPRITE_PPU / 2, -2.5, -1);
    sp.glaze();
    shadow(sp, 0, 0, 1.8, 0.6, 0.4);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames.pig[3]));
    this.redS = this.addSprite(new Sprite(frames.red[3]), true);
    this.setState('intro');
  }

  freeze(t: number): void {
    if (this.defeated || this.state === 'hidden') return;
    if (this.state === 'drink') { this.choke(); return; }
    this.frozen = Math.max(this.frozen, t * 0.4);
  }

  private get shielded(): boolean {
    return this.copies.some((c) => !c.dead);
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated || this.state === 'intro' || this.state === 'hidden' || (this.state === 'fade' && this.stateT > 0.25)) return false;
    let dmg = h.dmg * this.dmgMul;
    if (this.shielded) { dmg *= 0.25; this.onShield?.(); }
    this.vulnerable = true;
    const r = super.onHit({ ...h, dmg: Math.round(dmg) });
    if (r) this.world.numbers?.pop(this.x, this.y + 4.8, String(Math.round(dmg)), { size: dmg >= 40 ? 0.7 : 0.5, red: this.dmgMul > 1 });
    if (r && this.state === 'drink') {
      this.drinkHurt += dmg;
      if (this.drinkHurt > 160) this.choke();
    }
    return r;
  }

  private choke(): void {
    this.world.tele.clear();
    sfx.stagger();
    this.world.shake(0.3, 0.3);
    this.world.vfx.splat(this.x, this.y + 3, 0, 14, 1.3);
    this.dmgMul = 1.6;
    this.dazeT = 2.6;
    this.onChoke?.();
    this.setState('dazed');
  }

  enterPhase2(): void {
    this.queue = ['copies'];
    sfx.stagger();
  }

  private next(): Attack {
    if (!this.queue.length) this.queue = this.phase === 1 ? ['paint', 'palm', 'erase', 'blink', 'paint', 'palm'] : ['copies', 'paint', 'drink', 'blink', 'erase', 'paint', 'palm', 'drink'];
    let a = this.queue.shift()!;
    if (a === 'copies' && this.shielded) a = 'paint';
    if (a === 'drink' && this.hp > this.maxHp * 0.8) a = 'palm';
    return a;
  }

  private keepIn(): void {
    const m = 1.8, R = this.room;
    this.x = Math.max(R.x + m, Math.min(R.x + R.w - m, this.x));
    this.y = Math.max(R.y + m, Math.min(R.y + R.h - m, this.y));
  }

  /** Three wet lines across the hall: they burn as they dry. */
  private paint(): void {
    const w = this.world, p = w.player, R = this.room;
    const n = this.phase === 1 ? 3 : 4;
    const base = Math.random() < 0.5 ? 0 : Math.PI / 2;
    for (let k = 0; k < n; k++) {
      const a = base + (k % 2 ? 0.35 : -0.35) * (k > 1 ? -1 : 1) + (Math.random() - 0.5) * 0.3;
      // through the child, or near them
      const ox = p.x + (Math.random() - 0.5) * 6, oy = p.y + (Math.random() - 0.5) * 5;
      const L = Math.max(R.w, R.h) * 1.2;
      const ax = ox - Math.cos(a) * L / 2, ay = oy - Math.sin(a) * L / 2;
      const bx = ox + Math.cos(a) * L / 2, by = oy + Math.sin(a) * L / 2;
      w.tele.add({ kind: 'line', length: L, width: 1.0 }, ax, ay, a, 1.0 + k * 0.25, {
        hold: 0.05,
        onFire: () => {
          if (distToSeg(p.x, p.y, ax, ay, bx, by) < 0.6 + p.radius) p.hurt(2, ox, oy);
          this.wet.push({ ax, ay, bx, by, t: 3.2, tick: 0.5 });
          for (let s = 0; s < L; s += 1.2) w.vfx.splat(ax + Math.cos(a) * s, ay + Math.sin(a) * s + 0.1, a, 1, 0.4);
          sfx.cut();
        },
      });
    }
    sfx.telegraph('mid', 1);
  }

  private palm(): void {
    const w = this.world, p = w.player;
    this.aimA = Math.atan2(p.y - this.y, p.x - this.x);
    this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
    const a = this.aimA;
    w.tele.add({ kind: 'cone', radius: 4, half: 0.9 }, this.x, this.y + 0.3, a, 0.5, {
      hold: 0.06,
      onFire: () => {
        let da = Math.atan2(p.y - this.y, p.x - this.x) - a;
        da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
        if (Math.hypot(p.x - this.x, p.y - this.y) < 4.2 && da < 0.95) {
          p.hurt(2, this.x, this.y);
          for (let k = 0; k < 8; k++) w.move(p, Math.cos(a) * 0.3, Math.sin(a) * 0.3);
        }
        w.shake(0.2, 0.2);
        sfx.impact(false);
      },
    });
    sfx.telegraph('mid', 0.5);
    this.setState('palm');
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world, p = w.player;
    // wet lines burn as they dry
    for (const l of this.wet) {
      l.t -= dt;
      l.tick -= dt;
      if (Math.random() < dt * 3) { const u = Math.random(); w.vfx.splat(l.ax + (l.bx - l.ax) * u, l.ay + (l.by - l.ay) * u + 0.1, 0, 1, 0.3); }
      if (l.tick <= 0) {
        l.tick = 0.5;
        if (distToSeg(p.x, p.y, l.ax, l.ay, l.bx, l.by) < 0.45 + p.radius) p.hurt(1, p.x, p.y - 1);
      }
    }
    this.wet = this.wet.filter((l) => l.t > 0);
    this.copies = this.copies.filter((c) => !c.dead);
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
        fi = 3;
        alpha = Math.min(1, this.stateT);
        if (this.stateT > 1.8) this.setState('idle');
        break;
      case 'idle':
        this.dmgMul = 1;
        this.face = dx < 0 ? -1 : 1;
        if (d > 4) w.move(this, (dx / d) * 1.5 * dt, (dy / d) * 1.5 * dt);
        this.keepIn();
        if (this.stateT > (this.phase === 1 ? 1.0 : 0.75)) {
          const a = this.next();
          if (a === 'paint') { this.paint(); this.setState('paint'); }
          else if (a === 'palm') this.palm();
          else if (a === 'blink') this.setState('fade');
          else if (a === 'erase') {
            const ex = p.x, ey = p.y;
            w.tele.add({ kind: 'circle', r: 3.2 }, ex, ey, 0, 1.15, {
              hold: 0.05,
              onFire: () => {
                if (Math.hypot(p.x - ex, p.y - ey) < 3.2 + p.radius * 0.5) {
                  p.hurt(1, ex, ey);
                  p.ink = Math.min(p.ink, p.inkMax * 0.3);
                  p.pigment = 0;
                  this.onErase?.();
                }
                w.vfx.ripple(ex, ey, 3.2);
                w.flash = Math.max(w.flash, 0.2);
              },
            });
            sfx.telegraph('low', 1.15);
            this.setState('cast');
          } else if (a === 'copies') {
            const R = this.room;
            for (let k = 0; k < 2; k++) {
              const c = new ShadowMonk(R.x + R.w * (k ? 0.75 : 0.25), R.y + R.h * 0.5);
              c.emerge = 0.6;
              w.add(c);
              this.copies.push(c);
            }
            sfx.spawn();
            this.setState('cast');
          } else {
            this.drinkHurt = 0;
            this.setState('toJar');
            this.onDrink?.();
          }
        }
        break;
      case 'paint':
        fi = 2;
        if (this.stateT > 1.3) this.setState('recover');
        break;
      case 'palm':
        fi = this.stateT > 0.5 ? 1 : 3;
        if (this.stateT > 0.85) this.setState('recover');
        break;
      case 'cast':
        fi = 3;
        if (this.stateT > 1.2) this.setState('recover');
        break;
      case 'fade':
        fi = 3;
        alpha = Math.max(0, 1 - this.stateT * 2.5);
        if (this.stateT > 0.45) {
          const a = Math.atan2(dy, dx);
          this.hideAt = [p.x + Math.cos(a) * 2.6, p.y + Math.sin(a) * 2.6];
          this.setState('hidden');
        }
        break;
      case 'hidden': {
        alpha = 0;
        this.x = this.hideAt[0];
        this.y = this.hideAt[1];
        this.keepIn();
        if (Math.random() < dt * 8) w.vfx.splat(this.x, this.y + 0.2, Math.random() * 6, 1, 0.3);
        if (this.stateT > 0.9) this.palm();
        break;
      }
      case 'toJar': {
        fi = 0;
        const tx = this.jar.x + 1.6, ty = this.jar.y - 0.4;
        const jx = tx - this.x, jy = ty - this.y, jd = Math.hypot(jx, jy);
        this.face = jx < 0 ? -1 : 1;
        if (jd > 0.3) w.move(this, (jx / jd) * Math.min(jd, 5 * dt), (jy / jd) * Math.min(jd, 5 * dt));
        if (jd < 0.4 || this.stateT > 2.5) { this.face = -1; this.setState('drink'); sfx.telegraph('low', 3); }
        break;
      }
      case 'drink':
        fi = 4;
        // the jade heals him, a little at a time
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.04 * dt);
        if (Math.random() < dt * 6) w.vfx.glowAt(this.jar.x, this.jar.y + 1.2, 1.2, 0.2);
        if (this.stateT > 3) this.setState('recover');
        break;
      case 'recover':
        fi = 0;
        if (this.stateT > (this.phase === 1 ? 0.7 : 0.5)) this.setState('idle');
        break;
      case 'dazed':
        fi = 4;
        if (Math.random() < dt * 4) w.vfx.glowAt(this.x, this.y + 4.4, 0.6, 0.2);
        if (this.stateT > this.dazeT) { this.dmgMul = 1; this.setState('idle'); }
        break;
      case 'defeated':
        fi = 5;
        break;
    }
    this.place(fi, alpha);
  }

  private place(fi: number, alpha: number): void {
    const f = frames!;
    this.body.setTexture(f.pig[fi].tex);
    this.redS.setTexture(f.red[fi].tex);
    for (const s of [this.body, this.redS]) {
      s.setPos(this.x, this.y + this.z);
      s.mesh.scale.set(this.face, 1, 1);
      s.mesh.renderOrder = ySort(this.y);
      s.opacity = alpha;
    }
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    this.shadowS.setPos(this.x, this.y);
    this.shadowS.opacity = alpha;
    // the shield of his shadows: a darker ink around him
    if (this.shielded && Math.random() < 0.3) this.world.vfx.splat(this.x + (Math.random() - 0.5) * 1.6, this.y + 1 + Math.random() * 2.5, Math.random() * 6, 1, 0.3);
    if (this.state === 'defeated') {
      // his face comes back; then he fades like a breath
      const t = Math.max(0, this.stateT - 1.6) / 2;
      this.body.dissolve = Math.min(1, t);
      this.redS.dissolve = 1;
      this.shadowS.opacity = 1 - Math.min(1, t);
    }
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
