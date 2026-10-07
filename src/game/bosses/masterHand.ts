/**
 * The master's hand, at the summit: what is left of him, still trying to wipe the blot off his
 * last painting, and wiping the world with it. It sweeps strips of the page into nothing (fresh ink
 * carries the child over them), slams its palm, flicks ink. Wounded, it grasps at the child and
 * wipes their ink away, and paints erasers. Near the end it doubts: it trembles, and after every
 * blow it hangs open. Beaten, it does not die: it opens, and lets go of the brush.
 */
import { Boss } from '../boss';
import type { World, Hazard } from '../world';
import { HitInfo } from '../entity';
import { Sprite, ySort, LAYER } from '../../gfx/sprite';
import { buildHandFrames, erasedStrip, HandFrames, HAND } from '../../gfx/gen/bestiary5';
import { Painter, PIG_B } from '../../gfx/paint';
import { shadow } from '../../gfx/gen/ground';
import { SPRITE_PPU } from '../../gfx/gen/flora';
import { sfx } from '../../audio/sfx';
import { InkDrop } from '../enemies';
import { Eraser } from '../beasts4';
import { pointInPoly } from '../physics';
import type { Telegraph } from '../telegraph';

let frames: HandFrames | null = null;

interface Strip { hz: Hazard; s: Sprite; t: number; life: number }

export class MasterHand extends Boss {
  private body!: Sprite;
  private redS!: Sprite;
  private shadowS!: Sprite;
  private queue: string[] = [];
  private tg: Telegraph | null = null;
  private aimA = 0;
  private from: [number, number] = [0, 0];
  private lineLeft = 0;
  private sweeps = 0;
  private strips: Strip[] = [];
  private dmgMul = 1;
  private bob = 0;
  /** The area speaks when the hand does something new. */
  onEvent?: (what: 'strip' | 'grasp' | 'doubt' | 'paint') => void;
  constructor(x: number, y: number, private arena: { x: number; y: number; r: number }) {
    super();
    this.x = x; this.y = y;
    this.maxHp = 4200;
    this.hp = 4200;
    this.radius = 1.6;
    this.solid = false;
    this.name = 'Master’s Hand';
    this.label = 'hand';
    this.vulnerable = true;
    this.z = 6;
  }

  init(w: World): void {
    if (!frames) frames = buildHandFrames(5701);
    const sp = new Painter(6, 2.6, SPRITE_PPU / 2, -3, -1.3);
    sp.glaze();
    shadow(sp, 0, 0, 2.4, 0.9, 0.35);
    this.shadowS = new Sprite(sp);
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    w.r.scenePig.add(this.shadowS.mesh);
    this.body = this.addSprite(new Sprite(frames.pig[HAND.open]));
    this.redS = this.addSprite(new Sprite(frames.red[HAND.open]), true);
    this.setState('intro');
  }

  /** The third movement, below a quarter: doubt. */
  get doubting(): boolean {
    return this.hp <= this.maxHp * 0.25;
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated || this.state === 'intro') return false;
    const wasDoubt = this.doubting;
    const dmg = Math.max(1, Math.round(h.dmg * this.dmgMul));
    const r = super.onHit({ ...h, dmg });
    if (r) this.world.numbers?.pop(this.x, this.y + this.z + 2.5, String(dmg), { size: dmg >= 50 ? 0.75 : 0.55, red: this.dmgMul > 1 });
    if (r && !wasDoubt && this.doubting && !this.defeated) { this.queue = []; this.onEvent?.('doubt'); }
    return r;
  }

  freeze(t: number): void {
    // even the master's hand stiffens with cold, a little
    if (this.defeated || this.state === 'intro') return;
    if (this.state === 'idle') this.stateT = Math.max(0, this.stateT - t * 0.3);
  }

  enterPhase2(): void {
    this.queue = [];
    sfx.stagger();
  }

  private next(): string {
    if (!this.queue.length) {
      if (this.doubting) this.queue = ['sweep', 'stamp', 'cross', 'flick', 'grasp', 'stamp'];
      else if (this.phase === 1) this.queue = ['sweep', 'stamp', 'flick', 'sweep', 'stamp'];
      else this.queue = ['grasp', 'sweep', 'paint', 'stamp', 'flick', 'grasp', 'sweep'];
    }
    return this.queue.shift()!;
  }

  /** A strip of the page wiped into nothing for a while. Never under where the child would come back. */
  private wipe(x0: number, y0: number, a: number, len: number, width: number): void {
    const w = this.world, p = w.player;
    const c = Math.cos(a), s = Math.sin(a), nx = -s * width / 2, ny = c * width / 2;
    const x1 = x0 + c * len, y1 = y0 + s * len;
    const poly: [number, number][] = [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]];
    const hz: Hazard = { kind: 'void', poly };
    w.hazards.push(hz);
    const sp = new Sprite(erasedStrip(len, width, Math.floor(Math.random() * 1e6)));
    sp.setPos(x0, y0);
    sp.mesh.rotation.z = a;
    sp.mesh.renderOrder = LAYER.shadow - 1;
    w.r.scenePig.add(sp.mesh);
    this.strips.push({ hz, s: sp, t: 0, life: this.phase === 1 ? 6 : 8 });
    // the child comes back to safe ground, never into a hole
    if (w.hazards.some((h) => pointInPoly(p.lastSafe[0], p.lastSafe[1], h.poly))) {
      for (let k = 0; k < 24; k++) {
        const ang = (k / 24) * Math.PI * 2, rr = 2 + (k % 3) * 2;
        const qx = this.arena.x + Math.cos(ang) * rr, qy = this.arena.y + Math.sin(ang) * rr * 0.8;
        if (!w.nearHazard(qx, qy, 0.8)) { p.lastSafe = [qx, qy]; break; }
      }
    }
    this.onEvent?.('strip');
  }

  private startSweep(): void {
    const w = this.world, p = w.player;
    // across the clearing, through the child
    this.aimA = Math.atan2(p.y - this.y, p.x - this.x) + (Math.random() - 0.5) * 0.3;
    const back = this.arena.r * 0.9;
    this.from = [p.x - Math.cos(this.aimA) * back, p.y - Math.sin(this.aimA) * back];
    this.lineLeft = back * 2;
    const warn = this.doubting ? 0.75 : 0.95;
    this.tg = w.tele.add({ kind: 'line', length: this.lineLeft, width: 2.2 }, this.from[0], this.from[1], this.aimA, warn, {
      hold: 0.1,
      onFire: () => {
        const dx = p.x - this.from[0], dy = p.y - this.from[1];
        const along = dx * Math.cos(this.aimA) + dy * Math.sin(this.aimA);
        const side = Math.abs(-dx * Math.sin(this.aimA) + dy * Math.cos(this.aimA));
        if (along > 0 && along < this.lineLeft && side < 1.2) p.hurt(3, p.x - Math.cos(this.aimA), p.y - Math.sin(this.aimA));
        this.wipe(this.from[0], this.from[1], this.aimA, this.lineLeft, 1.8);
        sfx.cut();
        w.shake(0.2, 0.3);
      },
    });
    sfx.telegraph('high', warn);
    this.setState('reach');
  }

  private stamp(): void {
    const w = this.world, p = w.player;
    const cx = p.x, cy = p.y;
    const warn = this.doubting ? 0.65 : 0.8;
    this.tg = w.tele.add({ kind: 'circle', r: 2.8 }, cx, cy, 0, warn, {
      hold: 0.1,
      onFire: () => {
        if (Math.hypot(p.x - cx, p.y - cy) < 3) p.hurt(3, cx, cy);
        sfx.impact(true);
        w.shake(0.4, 0.35);
        w.vfx.ripple(cx, cy, 2.8);
        w.vfx.splat(cx, cy + 0.2, Math.random() * 6, 12, 1.2);
      },
    });
    sfx.telegraph('low', warn);
    this.from = [cx, cy];
    this.setState('lift');
  }

  private graspAt(): void {
    const w = this.world, p = w.player;
    const cx = p.x, cy = p.y;
    this.tg = w.tele.add({ kind: 'circle', r: 1.8 }, cx, cy, 0, 0.75, {
      hold: 0.1,
      onFire: () => {
        if (Math.hypot(p.x - cx, p.y - cy) < 1.9 && p.hurt(2, cx, cy)) {
          // it wipes the child's ink off them
          p.ink = 0;
          this.onEvent?.('grasp');
        }
        sfx.impact(false);
        w.shake(0.25, 0.25);
      },
    });
    sfx.telegraph('mid', 0.75);
    this.from = [cx, cy];
    this.setState('grasp');
  }

  update(dt: number): void {
    super.update(dt);
    const w = this.world, p = w.player;
    this.bob += dt;
    // the strips close again, slowly
    for (const st of this.strips) {
      st.t += dt;
      st.s.opacity = Math.min(1, st.t * 4) * Math.max(0, Math.min(1, (st.life - st.t) / 0.8));
      if (st.t >= st.life) {
        const k = w.hazards.indexOf(st.hz);
        if (k >= 0) w.hazards.splice(k, 1);
        st.s.dispose();
      }
    }
    this.strips = this.strips.filter((st) => st.t < st.life);
    let fi: number = HAND.open;
    let zT = 1.6 + Math.sin(this.bob * 1.3) * 0.25;
    const speed = this.doubting ? 0.8 : 1;
    switch (this.state) {
      case 'intro':
        // down out of the sky, slowly
        fi = HAND.open;
        zT = 2.2;
        this.z += (zT - this.z) * Math.min(1, dt * 1.2);
        if (this.stateT > 3) this.setState('idle');
        this.place(fi);
        return;
      case 'idle': {
        this.dmgMul = 1;
        fi = HAND.open;
        // hover above the child, a little behind
        const tx = p.x + Math.sin(this.bob * 0.7) * 2, ty = p.y + 1.8;
        this.x += (tx - this.x) * Math.min(1, dt * 1.6 * speed);
        this.y += (ty - this.y) * Math.min(1, dt * 1.6 * speed);
        this.keepIn();
        if (this.stateT > (this.phase === 1 ? 1.3 : 0.95) / speed) {
          const a = this.next();
          if (a === 'sweep') { this.sweeps = this.doubting ? 2 : 1; this.startSweep(); }
          else if (a === 'cross') { this.sweeps = 3; this.startSweep(); }
          else if (a === 'stamp') this.stamp();
          else if (a === 'flick') this.setState('flick');
          else if (a === 'grasp') this.graspAt();
          else this.setState('paint');
        }
        break;
      }
      case 'reach':
        // to the start of the line, flat, low
        fi = HAND.slam;
        zT = 0.8;
        this.x += (this.from[0] - this.x) * Math.min(1, dt * 6);
        this.y += (this.from[1] - this.y) * Math.min(1, dt * 6);
        if (this.tg?.fired) { this.tg = null; this.setState('wipe'); }
        break;
      case 'wipe': {
        fi = HAND.slam;
        zT = 0.4;
        const step = 24 * dt;
        this.x += Math.cos(this.aimA) * step;
        this.y += Math.sin(this.aimA) * step;
        this.lineLeft -= step;
        if (Math.random() < 0.8) w.vfx.dust(this.x, this.y, 2, PIG_B);
        if (this.lineLeft <= 0) {
          this.sweeps--;
          if (this.sweeps > 0) this.startSweep();
          else this.after();
        }
        break;
      }
      case 'lift':
        fi = this.tg && !this.tg.fired ? HAND.open : HAND.slam;
        zT = this.tg && !this.tg.fired ? 3.4 : 0.2;
        this.x += (this.from[0] - this.x) * Math.min(1, dt * 5);
        this.y += (this.from[1] + 0.4 - this.y) * Math.min(1, dt * 5);
        if (this.tg?.fired) { this.tg = null; this.stateT = 0; this.setState('pressed'); }
        break;
      case 'pressed':
        fi = HAND.slam;
        zT = 0.2;
        if (this.stateT > 0.6) this.after();
        break;
      case 'grasp':
        fi = this.tg && !this.tg.fired ? HAND.open : HAND.fist;
        zT = this.tg && !this.tg.fired ? 2.4 : 0.5;
        this.x += (this.from[0] - this.x) * Math.min(1, dt * 7);
        this.y += (this.from[1] + 0.3 - this.y) * Math.min(1, dt * 7);
        if (this.tg?.fired) { this.tg = null; this.setState('pressed'); }
        break;
      case 'flick':
        fi = this.stateT < 0.45 ? HAND.fist : HAND.open;
        if (this.stateT > 0.45 && this.stateT - dt <= 0.45) {
          const n = this.phase === 1 ? 5 : 7;
          const base = Math.atan2(p.y - this.y, p.x - this.x);
          for (let k = 0; k < n; k++) {
            const a = base + (k - (n - 1) / 2) * 0.24;
            w.add(new InkDrop(this.x, this.y + 0.5, Math.cos(a) * 6.5, Math.sin(a) * 6.5, this));
          }
          sfx.cut();
        }
        if (this.stateT > 1) this.after();
        break;
      case 'paint':
        fi = HAND.point;
        if (this.stateT > 0.8 && this.stateT - dt <= 0.8) {
          const alive = w.entities.filter((e) => e.label === 'eraser' && !e.dead).length;
          for (let k = alive; k < 2; k++) {
            const a = Math.random() * Math.PI * 2;
            const e = new Eraser(this.arena.x + Math.cos(a) * (this.arena.r - 2.5), this.arena.y + Math.sin(a) * (this.arena.r - 2.5) * 0.8).setup(5, false);
            e.aggro = true;
            e.emerge = 0.6;
            w.add(e);
          }
          sfx.spawn();
          this.onEvent?.('paint');
        }
        if (this.stateT > 1.6) this.setState('idle');
        break;
      case 'tremble':
        // doubt: it hangs there, open, shaking
        fi = HAND.tremble;
        zT = 1.2;
        this.dmgMul = 1.5;
        this.x += Math.sin(this.stateT * 50) * 0.02;
        if (Math.random() < dt * 3) w.vfx.glowAt(this.x, this.y + this.z + 2, 0.6, 0.2);
        if (this.stateT > 1.9) { this.dmgMul = 1; this.setState('idle'); }
        break;
      case 'recover':
        fi = HAND.open;
        if (this.stateT > (this.phase === 1 ? 0.7 : 0.5)) this.setState('idle');
        break;
      case 'defeated':
        // it opens, comes down, and lets go
        fi = this.stateT < 1.2 ? HAND.tremble : HAND.open;
        zT = 0.3;
        break;
    }
    this.z += (zT - this.z) * Math.min(1, dt * 4);
    this.place(fi);
  }

  /** After a blow: doubt makes it hang open; otherwise a short breath. */
  private after(): void {
    if (this.doubting) this.setState('tremble');
    else this.setState('recover');
  }

  private keepIn(): void {
    const dx = this.x - this.arena.x, dy = this.y - this.arena.y;
    const d = Math.hypot(dx, dy);
    const max = this.arena.r - 1;
    if (d > max) { this.x = this.arena.x + (dx / d) * max; this.y = this.arena.y + (dy / d) * max; }
  }

  private place(fi: number): void {
    const f = frames!;
    this.body.setTexture(f.pig[fi].tex);
    this.redS.setTexture(f.red[fi].tex);
    for (const s of [this.body, this.redS]) {
      s.setPos(this.x, this.y + this.z);
      s.mesh.scale.set(1.2, 1.2, 1);
      s.mesh.renderOrder = ySort(this.y - 1.5);
    }
    this.body.pale = this.flash > 0 ? 0.6 : 0;
    // a child under the hand still shows through it
    const p = this.world.player;
    const over = Math.abs(p.x - this.x) < 2.2 && p.y > this.y - 0.5 && p.y < this.y + this.z + 6;
    this.body.opacity = over ? 0.6 : 1;
    this.shadowS.setPos(this.x, this.y);
    this.shadowS.opacity = Math.max(0.25, 1 - this.z / 6);
    const k = 1 - Math.min(0.4, this.z / 10);
    this.shadowS.mesh.scale.set(k, k, 1);
  }

  /** The strips heal at once when the hand is gone. */
  clearStrips(): void {
    for (const st of this.strips) {
      const k = this.world.hazards.indexOf(st.hz);
      if (k >= 0) this.world.hazards.splice(k, 1);
      st.s.dispose();
    }
    this.strips = [];
  }

  destroy(): void {
    this.clearStrips();
    super.destroy();
  }

  dispose(): void {
    super.dispose();
    this.shadowS.dispose();
  }
}
