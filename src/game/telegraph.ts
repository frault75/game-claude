/**
 * Painted telegraphs: an attack paints itself before it strikes.
 * Pale wash (soon) -> dark (now) -> the strike. Shapes are SDFs in one shader.
 * Inverse telegraphs (erasure) render into the red buffer's erase channel instead.
 */
import * as THREE from 'three';
import { LAYER } from '../gfx/sprite';
import type { Renderer } from '../core/renderer';

const vert = /* glsl */ `
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const frag = /* glsl */ `
uniform int kind;      // 0 circle, 1 ring, 2 box (line), 3 cone, 4 arc band
uniform vec4 p;        // shape params
uniform float progress;
uniform float alpha;
uniform float seed;
uniform vec3 channel;  // which pigment channel(s) to write
uniform float strength;
varying vec2 vLocal;
float hash(vec2 q) { q = fract(q * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }
float vnoise(vec2 q) {
  vec2 i = floor(q); vec2 f = fract(q); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float sdBox(vec2 q, vec2 b) { vec2 d = abs(q) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
void main() {
  vec2 q = vLocal;
  float d;
  if (kind == 0) d = length(q) - p.x;
  else if (kind == 1) d = abs(length(q) - (p.x + p.y) * 0.5) - (p.y - p.x) * 0.5;
  else if (kind == 2) {
    // a brush sweep: rounded, slightly tapering towards the far end
    float t = clamp(q.x / max(p.x, 0.001), 0.0, 1.0);
    float hw = p.y * 0.5 * mix(1.0, 0.75, t);
    vec2 c = vec2(clamp(q.x, 0.0, p.x), 0.0);
    d = length(q - c) - hw;
  }
  else if (kind == 3) {
    float a = atan(q.y, q.x);
    float r = length(q);
    float da = abs(a) - p.y;
    d = max(r - p.x, da * r);
  } else {
    float a = atan(q.y, q.x);
    float r = length(q);
    d = max(abs(r - (p.x + p.z) * 0.5) - (p.z - p.x) * 0.5, (abs(a) - p.y) * r);
  }
  // wet, uneven edge
  float n = vnoise(q * 3.0 + seed) * 0.6 + vnoise(q * 9.0 - seed) * 0.4;
  d += (n - 0.5) * 0.18;
  float inside = 1.0 - smoothstep(-0.03, 0.03, d);
  float rim = (1.0 - smoothstep(0.0, 0.14, abs(d + 0.06))) * inside;
  // brush-drag texture: streaks along x (the sweep direction), soft blotches
  float streak = vnoise(vec2(q.x * 1.2, q.y * 9.0) + seed);
  float gran = 0.8 + 0.3 * streak + 0.15 * (vnoise(q * 2.0 - seed) - 0.5);
  // pale -> dark as the strike approaches
  float dens = mix(0.07, 0.42, progress * progress) * gran + rim * mix(0.06, 0.4, progress);
  dens *= inside * alpha * strength;
  gl_FragColor = vec4(channel * dens, 0.0);
}
`;

export type TeleShape =
  | { kind: 'circle'; r: number }
  | { kind: 'ring'; r0: number; r1: number }
  | { kind: 'line'; length: number; width: number }
  | { kind: 'cone'; radius: number; half: number }
  | { kind: 'arc'; r0: number; r1: number; half: number };

export interface Telegraph {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  t: number;
  dur: number;
  hold: number;
  /** World position and rotation (radians) can be updated while it paints. */
  x: number;
  y: number;
  rot: number;
  done: boolean;
  erase: boolean;
  onFire?: () => void;
  fired: boolean;
  fade: number;
}

export class Telegraphs {
  private list: Telegraph[] = [];
  constructor(private r: Renderer) {}

  /**
   * Paint a telegraph: it darkens over `dur` seconds, then fires `onFire` and fades.
   * `hold` keeps it visible (dark) after firing, e.g. while a beam lasts.
   */
  add(shape: TeleShape, x: number, y: number, rot: number, dur: number, opts: { onFire?: () => void; hold?: number; erase?: boolean; strength?: number } = {}): Telegraph {
    let size = 2, kind = 0;
    const p = new THREE.Vector4();
    switch (shape.kind) {
      case 'circle': kind = 0; p.set(shape.r, 0, 0, 0); size = shape.r * 2 + 0.6; break;
      case 'ring': kind = 1; p.set(shape.r0, shape.r1, 0, 0); size = shape.r1 * 2 + 0.6; break;
      case 'line': kind = 2; p.set(shape.length, shape.width, 0, 0); size = (shape.length + shape.width) * 2 + 0.6; break;
      case 'cone': kind = 3; p.set(shape.radius, shape.half, 0, 0); size = shape.radius * 2 + 0.6; break;
      case 'arc': kind = 4; p.set(shape.r0, shape.half, shape.r1, 0); size = shape.r1 * 2 + 0.6; break;
    }
    const erase = !!opts.erase;
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      uniforms: {
        kind: { value: kind },
        p: { value: p },
        progress: { value: 0 },
        alpha: { value: 0 },
        seed: { value: Math.random() * 100 },
        channel: { value: erase ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0) },
        strength: { value: (opts.strength ?? 1) * (erase ? 2.2 : 1) },
      },
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.renderOrder = LAYER.telegraph;
    (erase ? this.r.sceneRed : this.r.scenePig).add(mesh);
    const tg: Telegraph = { mesh, mat, t: 0, dur, hold: opts.hold ?? 0.12, x, y, rot, done: false, erase, onFire: opts.onFire, fired: false, fade: 0.25 };
    this.sync(tg);
    this.list.push(tg);
    return tg;
  }

  private sync(tg: Telegraph): void {
    tg.mesh.position.set(tg.x, tg.y, 0);
    tg.mesh.rotation.z = tg.rot;
  }

  cancel(tg: Telegraph): void {
    tg.fired = true;
    tg.onFire = undefined;
    tg.t = Math.max(tg.t, tg.dur + tg.hold);
  }

  update(dt: number): void {
    for (const tg of this.list) {
      tg.t += dt;
      const u = tg.mat.uniforms;
      if (tg.t < tg.dur) {
        const k = tg.t / tg.dur;
        u.progress.value = k;
        u.alpha.value = Math.min(1, tg.t / 0.15);
      } else {
        if (!tg.fired) {
          tg.fired = true;
          tg.onFire?.();
        }
        u.progress.value = 1;
        const after = tg.t - tg.dur - tg.hold;
        u.alpha.value = after > 0 ? Math.max(0, 1 - after / tg.fade) : 1;
        if (after > tg.fade) tg.done = true;
      }
      this.sync(tg);
    }
    for (const tg of this.list) {
      if (tg.done) {
        tg.mesh.removeFromParent();
        tg.mesh.geometry.dispose();
        tg.mat.dispose();
      }
    }
    this.list = this.list.filter((t) => !t.done);
  }

  clear(): void {
    for (const tg of this.list) {
      tg.mesh.removeFromParent();
      tg.mesh.geometry.dispose();
      tg.mat.dispose();
    }
    this.list = [];
  }
}
