/**
 * The red thread.
 *   1. Cast at a red knot in range; it attaches.
 *   2. Hold to pull: the lighter end goes to the heavier one.
 *   3. Thread in hand, cast at another knot: the thread now ties those two things.
 *   4. A tied thread is taut: ink creatures cannot cross it, drifting things bounce off it.
 *   5. Fire runs along a tied thread.
 *   6. One thread at a time.
 */
import * as THREE from 'three';
import { Entity } from './entity';
import type { World } from './world';
import { LAYER } from '../gfx/sprite';
import { sfx } from '../audio/sfx';
import { angleDiff, V } from './physics';

export const THREAD = {
  range: 7.5,
  castSpeed: 48,
  reelSpeed: 13,
  tieReel: 7,
  maxTie: 14,
  arrive: 0.95,
  aimCone: 0.42,
};

type State = 'idle' | 'casting' | 'held' | 'tied' | 'retract';

const SEG = 40;

const vert = /* glsl */ `
attribute float along;
attribute float across;
varying float vAlong;
varying float vAcross;
void main() {
  vAlong = along;
  vAcross = across;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const frag = /* glsl */ `
uniform float len;
uniform float tail;   // 1 = fade towards the end (idle compass thread)
uniform float alpha;
uniform float seed;
uniform float fire;   // 0..1 fire front position along the thread
uniform float fireOn;
varying float vAlong;
varying float vAcross;
float hash(vec2 q) { q = fract(q * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }
float vnoise(vec2 q) {
  vec2 i = floor(q); vec2 f = fract(q); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  float edge = 1.0 - smoothstep(0.55, 1.0, abs(vAcross));
  float s = vAlong * len;
  float dryN = vnoise(vec2(s * 1.3 + seed, vAcross * 2.0));
  float t = 1.0;
  if (tail > 0.5) {
    t = 1.0 - smoothstep(0.35, 1.0, vAlong);
    edge *= step(0.25 + 0.6 * vAlong, dryN + 0.35);
  }
  float d = edge * (0.85 + 0.25 * dryN) * t * alpha;
  float light = 0.0;
  if (fireOn > 0.5) {
    float f = 1.0 - smoothstep(0.0, 0.12, abs(vAlong - fire));
    light = f * 1.2;
    d = max(d, f * 0.9);
  }
  gl_FragColor = vec4(d, light, 0.0, d);
}
`;

export class Thread {
  state: State = 'idle';
  /** Tip of the thread while casting/retracting. */
  private tip: V = [0, 0];
  private castTarget: Entity | null = null;
  private castFromTie = false;
  /** Held: the far end; the near end is the child's wrist. */
  held: Entity | null = null;
  length = 0;
  /** Tied ends. */
  a: Entity | null = null;
  b: Entity | null = null;
  private tieLen = 0;
  private twang = 0;
  private twangT = 0;
  private reelTickT = 0;
  private lastCastT = -10;
  private fireT = 0;
  private fireFrom: Entity | null = null;
  private mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private pos: Float32Array;
  private time = 0;
  /** Debug text. */
  debug = '';
  /** Called when a tie forms (room scripts listen). */
  onTie?: (a: Entity, b: Entity) => void;

  constructor(private w: World) {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array((SEG + 1) * 2 * 3);
    const along = new Float32Array((SEG + 1) * 2);
    const across = new Float32Array((SEG + 1) * 2);
    const idx: number[] = [];
    for (let i = 0; i <= SEG; i++) {
      along[i * 2] = along[i * 2 + 1] = i / SEG;
      across[i * 2] = -1;
      across[i * 2 + 1] = 1;
      if (i < SEG) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('along', new THREE.BufferAttribute(along, 1));
    geo.setAttribute('across', new THREE.BufferAttribute(across, 1));
    geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: {
        len: { value: 1 }, tail: { value: 1 }, alpha: { value: 1 }, seed: { value: 3.7 }, fire: { value: 0 }, fireOn: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = LAYER.actorsBase + 3995;
    w.r.sceneRed.add(this.mesh);
  }

  castingRecently(): boolean {
    return this.w.time - this.lastCastT < 0.25 || this.state === 'casting';
  }

  /** The tied thread as a segment (both knots). */
  tautSegment(): [number, number, number, number] | null {
    if (this.state !== 'tied' || !this.a || !this.b) return null;
    const [ax, ay] = this.a.knot();
    const [bx, by] = this.b.knot();
    // use ground positions for collisions
    void ax; void ay; void bx; void by;
    return [this.a.x, this.a.y, this.b.x, this.b.y];
  }

  /** Forget an entity that died. */
  forget(e: Entity): void {
    if (this.held === e || this.a === e || this.b === e || this.castTarget === e) this.release(false);
  }

  release(sound = true): void {
    if (this.held) this.held.onRelease();
    if (this.a) this.a.onRelease();
    if (this.b) this.b.onRelease();
    if (sound && this.state !== 'idle') sfx.release();
    const p = this.w.player;
    if (p) p.reeling = false;
    if (this.state === 'held' || this.state === 'tied' || this.state === 'casting') {
      this.state = 'idle';
    }
    this.held = null;
    this.a = null;
    this.b = null;
    this.castTarget = null;
    this.fireFrom = null;
  }

  /** Find the knot the player is aiming at. */
  private pickTarget(aimX: number, aimY: number, exclude: Entity | null): Entity | null {
    const p = this.w.player;
    const [ox, oy] = p.wrist();
    const aimAng = Math.atan2(aimY - oy, aimX - ox);
    let best: Entity | null = null;
    let bestScore = Infinity;
    for (const e of this.w.entities) {
      if (!e.hookable || e.dead || e === exclude || e === p) continue;
      const [kx, ky] = e.knot();
      const d = Math.hypot(kx - ox, ky - oy);
      if (d > THREAD.range + e.radius) continue;
      const nearCursor = Math.hypot(kx - aimX, ky - aimY);
      const ang = Math.abs(angleDiff(Math.atan2(ky - oy, kx - ox), aimAng));
      let score: number;
      if (nearCursor < 0.9) score = nearCursor * 0.5;
      else if (ang < THREAD.aimCone) score = 1 + ang * 4 + d * 0.08;
      else continue;
      if (this.w.lineBlocked(ox, oy, kx, ky)) continue;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  /** Right click / RT. */
  cast(aimX: number, aimY: number): void {
    const p = this.w.player;
    if (p.busy && !p.dodging) return;
    this.lastCastT = this.w.time;
    // If the held end is right beside us, the thread comes with us: fresh cast.
    if (this.state === 'held' && this.held) {
      const d = Math.hypot(this.held.x - p.x, this.held.y - p.y);
      if (d < this.held.radius + 1.3) this.release(false);
    }
    if (this.state === 'tied') {
      // a new thread: the old tie lets go
      this.release(false);
    }
    const exclude = this.state === 'held' ? this.held : null;
    const target = this.pickTarget(aimX, aimY, exclude);
    const [ox, oy] = p.wrist();
    if (!target) {
      if (this.state === 'held') this.release(true);
      this.state = 'retract';
      const ang = Math.atan2(aimY - oy, aimX - ox);
      this.tip = [ox, oy];
      this.castTarget = null;
      this.retractGoal = [ox + Math.cos(ang) * THREAD.range * 0.7, oy + Math.sin(ang) * THREAD.range * 0.7];
      this.retractPhase = 0;
      sfx.miss();
      return;
    }
    this.castFromTie = this.state === 'held';
    this.state = 'casting';
    this.castTarget = target;
    this.tip = [ox, oy];
    sfx.cast();
  }

  private awayT = 0;
  private retractGoal: V = [0, 0];
  private retractPhase = 0;

  private attach(target: Entity): void {
    const p = this.w.player;
    if (this.castFromTie && this.held && this.held !== target) {
      const a = this.held;
      const d = Math.hypot(a.x - target.x, a.y - target.y);
      if (d > THREAD.maxTie) {
        sfx.snap();
        this.release(false);
        return;
      }
      this.state = 'tied';
      this.a = a;
      this.b = target;
      this.held = null;
      this.tieLen = d;
      this.twang = 1;
      this.twangT = 0;
      this.fireT = 0;
      this.fireFrom = null;
      target.onAttach();
      sfx.tie(d);
      this.onTie?.(a, target);
      return;
    }
    this.state = 'held';
    this.held = target;
    this.length = Math.hypot(target.x - p.x, target.y - p.y);
    this.twang = 1;
    this.twangT = 0;
    target.onAttach();
    sfx.attach(this.length);
  }

  update(dt: number): void {
    this.time += dt;
    const w = this.w;
    const p = w.player;
    const inp = w.input;
    if (!p) return;
    // input
    if (!p.locked && inp.pressed('thread')) {
      let ax: number, ay: number;
      if (inp.device === 'pad') {
        const [wx, wy] = p.wrist();
        ax = wx + p.aim[0] * THREAD.range;
        ay = wy + p.aim[1] * THREAD.range;
      } else [ax, ay] = w.mouseWorld();
      this.cast(ax, ay);
    }
    if (!p.locked && inp.pressed('release') && (this.state === 'held' || this.state === 'tied')) this.release(true);

    this.twangT += dt;
    this.twang = Math.max(0, this.twang - dt * 1.8);
    const [wx, wy] = p.wrist();

    switch (this.state) {
      case 'casting': {
        const t = this.castTarget;
        if (!t || t.dead) { this.release(false); break; }
        const [kx, ky] = t.knot();
        const dx = kx - this.tip[0], dy = ky - this.tip[1];
        const d = Math.hypot(dx, dy);
        const step = THREAD.castSpeed * dt;
        if (d <= step) {
          this.tip = [kx, ky];
          this.attach(t);
        } else {
          this.tip[0] += (dx / d) * step;
          this.tip[1] += (dy / d) * step;
        }
        break;
      }
      case 'retract': {
        const goal = this.retractPhase === 0 ? this.retractGoal : [wx, wy];
        const dx = goal[0] - this.tip[0], dy = goal[1] - this.tip[1];
        const d = Math.hypot(dx, dy);
        const step = THREAD.castSpeed * dt * (this.retractPhase === 0 ? 1 : 0.8);
        if (d <= step) {
          if (this.retractPhase === 0) this.retractPhase = 1;
          else this.state = 'idle';
        } else {
          this.tip[0] += (dx / d) * step;
          this.tip[1] += (dy / d) * step;
        }
        break;
      }
      case 'held':
        this.updateHeld(dt);
        break;
      case 'tied':
        this.updateTied(dt);
        break;
      default:
        break;
    }
    if (this.state !== 'held') p.reeling = false;
    this.draw();
    this.debug = `${this.state}${this.held ? ' → ' + this.held.label : ''}${this.a && this.b ? ' ' + this.a.label + '—' + this.b.label : ''}${this.state === 'held' ? ' len ' + this.length.toFixed(1) : ''}`;
  }

  private updateHeld(dt: number): void {
    const w = this.w;
    const p = w.player;
    const h = this.held!;
    if (!h || h.dead || !h.hookable) { this.release(false); return; }
    const dx = h.x - p.x, dy = h.y - p.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    const reelHeld = w.input.isDown('thread') && !p.locked && w.time - this.lastCastT > 0.06;
    const playerMoves = h.weight > p.weight;
    p.reeling = false;
    if (reelHeld) {
      if (playerMoves) {
        if (d > THREAD.arrive + h.radius * 0.5) {
          p.reeling = true;
          p.vx = (dx / d) * THREAD.reelSpeed;
          p.vy = (dy / d) * THREAD.reelSpeed;
          this.length = Math.min(this.length, d);
        } else if (p.reeling) {
          p.vx *= 0.3; p.vy *= 0.3;
        }
      } else if (d > h.radius + 0.8) {
        const sp = THREAD.reelSpeed * Math.min(1, 1.6 / Math.max(0.2, h.weight + 0.6));
        const mvx = (-dx / d) * sp * dt, mvy = (-dy / d) * sp * dt;
        h.airborne = true;
        w.move(h, mvx, mvy);
        h.vx = (-dx / d) * sp;
        h.vy = (-dy / d) * sp;
        h.onPulled(dt);
        this.length = Math.min(this.length, Math.hypot(h.x - p.x, h.y - p.y));
        if (Math.hypot(h.x - p.x, h.y - p.y) <= h.radius + 0.85) {
          h.airborne = false;
          h.onPullArrive();
        }
      }
      this.reelTickT -= dt;
      if (this.reelTickT <= 0) { sfx.reelTick(d); this.reelTickT = 0.07; }
    } else if (h.airborne && !playerMoves) {
      h.airborne = false;
    }
    if (p.reeling) {
      // when the pull ends near the knot, keep a short leash while the button is held
      if (d <= THREAD.arrive + h.radius * 0.5 + 0.05) {
        p.reeling = false;
        this.length = Math.max(d, 0.6);
      }
    }
    // Arrived at a fixed anchor and let go of the button: the thread comes back to the wrist.
    if (!reelHeld && playerMoves && h.weight === Infinity && d <= THREAD.arrive + h.radius * 0.5 + 0.35 && w.time - this.lastCastT > 0.3) {
      this.release(false);
      return;
    }
    // Walking straight away from the anchor for a moment lets go too.
    const [mx, my] = w.input.move();
    if (Math.hypot(mx, my) > 0.5 && (mx * dx + my * dy) / (d * Math.hypot(mx, my)) < -0.75 && Math.hypot(w.wind[0], w.wind[1]) < 0.1) {
      this.awayT += dt;
      if (this.awayT > 0.45) { this.release(true); this.awayT = 0; return; }
    } else this.awayT = 0;
    // Rope constraint: the thread never stretches.
    const slack = 0.1;
    const d2 = Math.hypot(h.x - p.x, h.y - p.y);
    if (d2 > this.length + slack) {
      const ux = (h.x - p.x) / d2, uy = (h.y - p.y) / d2;
      if (playerMoves) {
        // the heavier end holds the child (anchoring, orbiting, being dragged)
        const tx = h.x - ux * (this.length + slack), ty = h.y - uy * (this.length + slack);
        w.move(p, tx - p.x, ty - p.y);
        const vr = p.vx * ux + p.vy * uy;
        if (vr < 0) { p.vx -= vr * ux; p.vy -= vr * uy; }
      } else {
        const tx = p.x + ux * (this.length + slack), ty = p.y + uy * (this.length + slack);
        w.move(h, tx - h.x, ty - h.y);
      }
    }
    if (this.length > THREAD.range * 1.8) { sfx.snap(); this.release(false); }
  }

  private updateTied(dt: number): void {
    const w = this.w;
    const a = this.a!, b = this.b!;
    if (!a || !b || a.dead || b.dead) { this.release(false); return; }
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
    const minD = a.radius + b.radius + 0.25;
    if (a.weight !== b.weight && !(a.weight === Infinity && b.weight === Infinity)) {
      const light = a.weight < b.weight ? a : b;
      const heavy = light === a ? b : a;
      const ux = (heavy.x - light.x) / d, uy = (heavy.y - light.y) / d;
      if (d > minD) {
        const sp = THREAD.tieReel * Math.min(1.4, 2 / Math.max(0.3, light.weight));
        w.move(light, ux * sp * dt, uy * sp * dt);
        light.onPulled(dt);
        this.tieLen = Math.min(this.tieLen, Math.hypot(heavy.x - light.x, heavy.y - light.y));
      }
      const d2 = Math.hypot(heavy.x - light.x, heavy.y - light.y);
      if (d2 > this.tieLen + 0.1) {
        const k = (d2 - this.tieLen) / d2;
        w.move(light, (heavy.x - light.x) * k, (heavy.y - light.y) * k);
      }
    }
    // Conduction: fire runs from a burning end to the other.
    if (!this.fireFrom) {
      if (a.burning && !b.burning) { this.fireFrom = a; this.fireT = 0; }
      else if (b.burning && !a.burning) { this.fireFrom = b; this.fireT = 0; }
    }
    if (this.fireFrom) {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.fireT += (dt * 6) / Math.max(1, len);
      const k = this.fireFrom === a ? this.fireT : 1 - this.fireT;
      const [ax, ay] = a.knot(), [bx, by] = b.knot();
      if (Math.random() < 0.7) w.vfx.flame(ax + (bx - ax) * k, ay + (by - ay) * k - 0.2, 0.6);
      if (this.fireT >= 1) {
        const other = this.fireFrom === a ? b : a;
        if (!other.burning) {
          other.ignite();
          if (other.burning) sfx.fire();
        }
        this.fireFrom = null;
        this.fireT = 0;
      }
    }
    // Bouncy things reflect off the taut thread.
    const ax = a.x, ay = a.y, bx = b.x, by = b.y;
    const sx = bx - ax, sy = by - ay;
    const sl = Math.hypot(sx, sy) || 1;
    const nx = -sy / sl, ny = sx / sl;
    for (const e of w.entities) {
      if (!e.bouncy || e.dead) continue;
      const rel = (e.x - ax) * nx + (e.y - ay) * ny;
      const along = ((e.x - ax) * sx + (e.y - ay) * sy) / (sl * sl);
      if (along < -0.02 || along > 1.02) continue;
      const vn = e.vx * nx + e.vy * ny;
      if (Math.abs(rel) < e.radius + 0.05 && rel * vn < 0) {
        e.vx -= 2 * vn * nx;
        e.vy -= 2 * vn * ny;
        e.x += nx * Math.sign(rel || 1) * 0.05;
        e.y += ny * Math.sign(rel || 1) * 0.05;
        this.twang = Math.max(this.twang, 0.6);
        this.twangT = 0;
        sfx.attach(sl * 0.8);
        e.onTouched(a);
      }
    }
  }

  private draw(): void {
    const w = this.w;
    const p = w.player;
    const u = this.mat.uniforms;
    let ax: number, ay: number, bx: number, by: number;
    let sag = 0;
    let tail = 0;
    u.fireOn.value = 0;
    const [wx, wy] = p.wrist();
    switch (this.state) {
      case 'casting':
      case 'retract':
        ax = wx; ay = wy; bx = this.tip[0]; by = this.tip[1];
        sag = 0.1;
        break;
      case 'held': {
        ax = wx; ay = wy;
        [bx, by] = this.held!.knot();
        const d = Math.hypot(this.held!.x - p.x, this.held!.y - p.y);
        sag = Math.max(0, this.length - d) * 0.35 + 0.02;
        break;
      }
      case 'tied':
        [ax, ay] = this.a!.knot();
        [bx, by] = this.b!.knot();
        sag = 0;
        if (this.fireFrom) {
          u.fireOn.value = 1;
          u.fire.value = this.fireFrom === this.a ? this.fireT : 1 - this.fireT;
        }
        break;
      default: {
        // idle: a short tail drifting towards the painter
        ax = wx; ay = wy;
        const [gx, gy] = w.goalDir;
        const L = 1.7;
        const wave = Math.sin(this.time * 2.1) * 0.25;
        bx = wx + gx * L - gy * wave;
        by = wy + gy * L + gx * wave - 0.15;
        sag = 0.12;
        tail = 1;
        break;
      }
    }
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-4;
    const nx = -dy / len, ny = dx / len;
    const width = 0.045;
    const tw = this.twang * 0.12 * Math.sin(this.twangT * 55) ;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      let x = ax + dx * t, y = ay + dy * t;
      // sag hangs downward on screen (3/4 view gravity)
      const s = Math.sin(Math.PI * t);
      y -= sag * s * Math.min(3, len) * 0.5;
      if (tail) {
        x += nx * Math.sin(t * 5 + this.time * 3) * 0.06 * t;
        y += ny * Math.sin(t * 5 + this.time * 3) * 0.06 * t;
      }
      x += nx * tw * s;
      y += ny * tw * s;
      const wv = width * (0.85 + 0.3 * Math.sin(t * 17.0 + 1.3));
      const k = i * 6;
      this.pos[k] = x + nx * wv;
      this.pos[k + 1] = y + ny * wv;
      this.pos[k + 2] = 0;
      this.pos[k + 3] = x - nx * wv;
      this.pos[k + 4] = y - ny * wv;
      this.pos[k + 5] = 0;
    }
    (this.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.mesh.geometry.computeBoundingSphere();
    u.len.value = len;
    u.tail.value = tail;
    u.alpha.value = p.state === 'dead' || p.state === 'fall' ? 0 : 1;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
