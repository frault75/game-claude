/**
 * Guardian of the Sunken Temple — the Drowned Warden: a stone warrior. Stone shrugs off every blow
 * until indigo freezes it; frozen, it can be broken. Slams, sweeps, water rings, summoned wisps.
 */
import { Boss } from '../boss';
import type { World } from '../world';
import { HitInfo } from '../entity';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../../gfx/sprite';
import { Painter, INK, PIG_A, mixPig } from '../../gfx/paint';
import { stroke, V2 } from '../../gfx/brush';
import { washPoly, roughen, noisyOutline } from '../../gfx/wash';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { Rng } from '../../gfx/rng';
import { sfx } from '../../audio/sfx';
import { Wisp } from '../enemies';

let frames: Frame[] | null = null;
let iceFrame: Frame | null = null;

function getIce(): Frame {
  if (!iceFrame) {
    const p = new Painter(3.4, 4.2, SPRITE_PPU / 3, -1.7, -0.3);
    p.over();
    const o = noisyOutline(0, 1.7, 1.2, 1.9, 0.18, 4499);
    p.ctx.fillStyle = 'rgba(51,84,148,0.45)';
    p.ctx.beginPath();
    o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
    p.ctx.fill();
    p.ctx.strokeStyle = 'rgba(40,66,120,0.9)';
    p.ctx.lineWidth = 0.07;
    p.ctx.stroke();
    iceFrame = frameFrom(p);
  }
  return iceFrame;
}

/** [idle, raised sword, slammed, sweep]. */
function buildWardenFrames(seed: number): Frame[] {
  const out: Frame[] = [];
  const poses: { sword: number; lean: number }[] = [{ sword: 0, lean: 0 }, { sword: 1, lean: -0.05 }, { sword: 2, lean: 0.12 }, { sword: 3, lean: 0.05 }];
  poses.forEach((ps, i) => {
    const r = new Rng(seed + i);
    const W = 4, H = 4.6;
    const p = new Painter(W, H, SPRITE_PPU * 0.75, -W / 2, -0.4);
    const solid = (pts: V2[], d: number, s: number) => {
      const rp = roughen(pts, 0.02, s, 0.1);
      p.reserve(() => rp.forEach((q, k) => (k === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
      p.glaze();
      washPoly(p, rp, { pig: mixPig(INK, PIG_A, 0.3), density: d, soft: 0.05, edge: 0.8, seed: s, blooms: 1 });
      return rp;
    };
    const L = ps.lean;
    // plinth
    solid([[-0.9, 0], [0.9, 0], [0.8, 0.3], [-0.8, 0.3]], 0.5, seed + 1);
    // robe and armour
    const robe = solid([[-0.55 + L, 1.9], [0.55 + L, 1.9], [0.75, 0.3], [-0.75, 0.3]], 0.42, seed + 2);
    stroke(p, robe, { width: 0.07, load: 1, dry: 0.4, seed: seed + 3 });
    for (let k = 0; k < 4; k++) stroke(p, [[-0.5 + L * (1 - k * 0.2), 1.7 - k * 0.32], [0.5 + L * (1 - k * 0.2), 1.68 - k * 0.32]], { width: 0.035, load: 0.6, dry: 0.6, seed: r.int(1, 1e6) });
    // shoulders, head with helmet
    solid([[-0.85 + L, 1.85], [0.85 + L, 1.85], [0.65 + L, 2.15], [-0.65 + L, 2.15]], 0.55, seed + 4);
    const hx = L * 1.4;
    solid(noisyOutline(hx, 2.45, 0.28, 0.3, 0.06, seed + 5), 0.4, seed + 5);
    solid([[hx - 0.36, 2.55], [hx + 0.36, 2.55], [hx, 3.05]], 0.7, seed + 6);
    // eyes: paper slits
    p.lift();
    for (const ex of [-0.1, 0.1]) { p.ctx.fillStyle = 'rgba(0,0,0,1)'; p.ctx.fillRect(hx + ex - 0.05, 2.42, 0.1, 0.03); }
    p.glaze();
    // sword
    const hand: V2 = [0.75 + L, 1.25];
    let tip: V2;
    if (ps.sword === 0) tip = [0.85, 0.15];
    else if (ps.sword === 1) tip = [0.4 + L, 3.9];
    else if (ps.sword === 2) tip = [1.8, 0.2];
    else tip = [-1.7, 1.0];
    const grip: V2 = ps.sword === 1 ? [0.55 + L, 2.3] : hand;
    stroke(p, [grip, tip], { width: 0.16, load: 1, dry: 0.3, seed: seed + 7, taperStart: 0.02, taperEnd: 0.6 });
    stroke(p, [[grip[0] - 0.2, grip[1] + 0.05], [grip[0] + 0.2, grip[1] - 0.05]], { width: 0.08, load: 1, seed: seed + 8 });
    // weeds and water marks
    for (let k = 0; k < 6; k++) {
      const x = r.range(-0.6, 0.6), y = r.range(0.5, 2.0);
      stroke(p, [[x, y], [x + r.gauss() * 0.1, y - r.range(0.2, 0.5)]], { width: 0.03, pig: mixPig(INK, PIG_A, 0.6), load: 0.7, seed: r.int(1, 1e6), taperEnd: 0.9 });
    }
    out.push(frameFrom(p));
  });
  return out;
}

type Attack = 'slam' | 'sweep' | 'wave' | 'summon';

export class DrownedWarden extends Boss {
  private body!: Sprite;
  private shadowS!: Sprite;
  private ice!: Sprite;
  private queue: Attack[] = [];
  private animT = 0;
  private face = 1;
  private dir: [number, number] = [0, -1];
  private slams = 0;
  frozen = 0;
  private hintCool = 0;
  onArmour?: () => void;

  constructor(x: number, y: number, private room: { x: number; y: number; w: number; h: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 1200;
    this.hp = 1200;
    this.radius = 0.9;
    this.name = 'Drowned Warden';
    this.label = 'warden';
  }

  init(w: World): void {
    if (!frames) frames = buildWardenFrames(4401);
    const sp = new Painter(4, 2, SPRITE_PPU / 2, -2, -1);
    sp.glaze();
    shadow(sp, 0, 0, 1.4, 0.5, 0.4);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames[0]));
    this.ice = new Sprite(getIce());
    this.ice.mesh.renderOrder = LAYER.actorsBase + 3990;
    this.ice.opacity = 0;
    w.r.sceneAcc.add(this.ice.mesh);
    this.sprites.push(this.ice);
    this.setState('intro');
  }

  /** Indigo freezes the stone: only then can it be hurt. */
  freeze(t: number): void {
    if (this.defeated) return;
    const before = this.frozen;
    this.frozen = Math.max(this.frozen, t > 3 ? 4.5 : 3.0);
    if (before <= 0) {
      sfx.clink();
      this.world.vfx.ripple(this.x, this.y, 1.5);
      // a frozen warden drops what it was doing
      this.world.tele.clear();
      if (this.state !== 'intro') this.setState('idle');
    }
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated) return false;
    if (this.frozen <= 0) {
      sfx.clink();
      this.world.numbers?.pop(this.x, this.y + 3.4, '0', { size: 0.45 });
      if (this.hintCool <= 0) { this.onArmour?.(); this.hintCool = 6; }
      return false;
    }
    this.vulnerable = true;
    const dmg = Math.round(h.dmg * 1.5);
    const r = super.onHit({ ...h, dmg });
    if (r) this.world.numbers?.pop(this.x, this.y + 3.6, String(dmg), { size: dmg >= 40 ? 0.7 : 0.5 });
    return r;
  }

  enterPhase2(): void {
    this.queue = [];
    sfx.stagger();
  }

  private next(): Attack {
    if (!this.queue.length) this.queue = this.phase === 1 ? ['slam', 'wave', 'sweep', 'summon'] : ['slam', 'sweep', 'wave', 'slam', 'summon', 'wave'];
    return this.queue.shift()!;
  }

  private startSlam(warn: number): void {
    const w = this.world;
    const p = w.player;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.dir = [dx / d, dy / d];
    const ang = Math.atan2(this.dir[1], this.dir[0]);
    sfx.telegraph('low', warn);
    w.tele.add({ kind: 'line', length: 8, width: 1.7 }, this.x, this.y, ang, warn, {
      hold: 0.15,
      onFire: () => {
        // is the child inside the strip?
        const px = p.x - this.x, py = p.y - this.y;
        const along = px * this.dir[0] + py * this.dir[1];
        const across = Math.abs(-px * this.dir[1] + py * this.dir[0]);
        if (along > -0.5 && along < 8.3 && across < 1.1) p.hurt(3, this.x, this.y);
        w.shake(0.3, 0.3);
        sfx.impact(true);
        for (let k = 1; k < 8; k += 1.5) w.vfx.splat(this.x + this.dir[0] * k, this.y + this.dir[1] * k + 0.2, ang, 3, 0.8);
      },
    });
    this.setState('slam');
  }

  private wave(): void {
    const w = this.world;
    const rings = this.phase === 1 ? 2 : 3;
    sfx.telegraph('low', 1);
    for (let i = 0; i < rings; i++) {
      const r0 = 1.6 + i * 3.0, r1 = r0 + 1.5;
      w.tele.add({ kind: 'ring', r0, r1 }, this.x, this.y, 0, 1.0 + i * 0.4, {
        hold: 0.1,
        onFire: () => {
          const p = w.player;
          const d = Math.hypot(p.x - this.x, p.y - this.y);
          if (d > r0 - 0.3 && d < r1 + 0.3) p.hurt(2, this.x, this.y);
          sfx.splash();
          w.vfx.ripple(this.x, this.y, (r0 + r1) * 0.5);
        },
      });
    }
  }

  private sweep(): void {
    const w = this.world;
    const p = w.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    sfx.telegraph('mid', 0.8);
    w.tele.add({ kind: 'cone', radius: 3.8, half: 1.2 }, this.x, this.y, ang, 0.8, {
      hold: 0.1,
      onFire: () => {
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        let da = Math.atan2(p.y - this.y, p.x - this.x) - ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (d < 4 && Math.abs(da) < 1.25) p.hurt(2, this.x, this.y);
        sfx.cut();
        w.shake(0.15, 0.2);
      },
    });
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world;
    const p = w.player;
    const f = frames!;
    this.animT += dt;
    this.hintCool -= dt;
    let frame = f[0];
    if (this.frozen > 0 && !this.defeated) {
      this.frozen -= dt;
      this.vulnerable = true;
      this.place(f[0]);
      return;
    }
    this.vulnerable = false;
    switch (this.state) {
      case 'intro':
        if (this.stateT > 1.8) this.setState('idle');
        break;
      case 'idle': {
        const dx = p.x - this.x, dy = p.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        this.face = dx < 0 ? -1 : 1;
        if (d > 3) w.move(this, (dx / d) * (this.phase === 1 ? 1.3 : 1.9) * dt, (dy / d) * (this.phase === 1 ? 1.3 : 1.9) * dt);
        this.keepIn();
        if (this.stateT > (this.phase === 1 ? 1.4 : 0.9)) {
          const a = this.next();
          if (a === 'slam') { this.slams = this.phase === 1 ? 1 : 2; this.startSlam(0.95); }
          else if (a === 'wave') { this.setState('wave'); this.wave(); }
          else if (a === 'sweep') { this.setState('sweep'); this.sweep(); }
          else this.setState('summon');
        }
        break;
      }
      case 'slam':
        frame = this.stateT < 0.9 ? f[1] : f[2];
        if (this.stateT > 1.4) {
          this.slams--;
          if (this.slams > 0) this.startSlam(0.7);
          else this.setState('idle');
        }
        break;
      case 'wave':
        frame = this.stateT < 0.5 ? f[1] : f[2];
        if (this.stateT > 2.0 + (this.phase - 1) * 0.4) this.setState('idle');
        break;
      case 'sweep':
        frame = this.stateT < 0.75 ? f[0] : f[3];
        if (this.stateT > 1.3) this.setState('idle');
        break;
      case 'summon':
        frame = f[1];
        if (this.stateT > 0.5 && this.stateT - dt <= 0.5) {
          const n = this.phase === 1 ? 2 : 3;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const wsp = new Wisp(this.x + Math.cos(a) * 2.5, this.y + Math.sin(a) * 2).setup(3, false);
            wsp.aggro = true;
            wsp.emerge = 0.5;
            w.add(wsp);
          }
          sfx.spawn();
        }
        if (this.stateT > 1.4) this.setState('idle');
        break;
      case 'defeated':
        frame = f[0];
        break;
    }
    if (this.state !== 'defeated' && Math.hypot(p.x - this.x, p.y - this.y) < this.radius + p.radius) p.hurt(1, this.x, this.y);
    this.place(frame);
  }

  private keepIn(): void {
    const m = 1.6;
    this.x = Math.max(this.room.x + m, Math.min(this.room.x + this.room.w - m, this.x));
    this.y = Math.max(this.room.y + m, Math.min(this.room.y + this.room.h - m, this.y));
  }

  private place(frame: Frame): void {
    this.body.setTexture(frame.tex);
    this.body.setPos(this.x, this.y);
    this.body.mesh.scale.set(this.face * 1.35, 1.35, 1);
    this.body.mesh.renderOrder = ySort(this.y);
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    this.ice.setPos(this.x, this.y);
    this.ice.opacity = this.frozen > 0 && !this.defeated ? Math.min(1, this.frozen * 2) : 0;
    this.shadowS.setPos(this.x, this.y);
    if (this.state === 'defeated') {
      // it kneels, then crumbles
      const k = Math.min(1, this.stateT / 2);
      this.body.mesh.scale.y = 1.35 * (1 - k * 0.3);
      this.body.dissolve = Math.max(0, (this.stateT - 1) / 1.5);
      this.shadowS.opacity = 1 - k;
    }
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
