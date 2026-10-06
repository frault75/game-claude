/** A dynamic brushed line (strings, tails, veils) drawn into the pigment or red buffer. */
import * as THREE from 'three';

const vert = /* glsl */ `
attribute float along;
attribute float across;
varying float vAlong;
varying float vAcross;
void main() {
  vAlong = along; vAcross = across;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const frag = /* glsl */ `
uniform vec3 channel;
uniform float density;
uniform float dry;
uniform float seed;
uniform float taper;
varying float vAlong;
varying float vAcross;
float hash(vec2 q) { q = fract(q * vec2(123.34, 456.21)); q += dot(q, q + 45.32); return fract(q.x * q.y); }
float vnoise(vec2 q) {
  vec2 i = floor(q); vec2 f = fract(q); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  float w = mix(1.0, 1.0 - taper, vAlong);
  float edge = 1.0 - smoothstep(0.5 * w, 1.0 * w, abs(vAcross));
  float n = vnoise(vec2(vAlong * 30.0 + seed, vAcross * 2.0));
  float gap = step(dry * vAlong, n + 0.15);
  float d = edge * gap * density * (0.8 + 0.3 * n);
  gl_FragColor = vec4(channel * d, d);
}
`;

export class Ribbon {
  readonly mesh: THREE.Mesh;
  private pos: Float32Array;
  readonly mat: THREE.ShaderMaterial;
  constructor(readonly n: number, scene: THREE.Scene, opts: { red?: boolean; density?: number; dry?: number; taper?: number; order?: number } = {}) {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3);
    const along = new Float32Array(n * 2);
    const across = new Float32Array(n * 2);
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
      along[i * 2] = along[i * 2 + 1] = i / (n - 1);
      across[i * 2] = -1;
      across[i * 2 + 1] = 1;
      if (i < n - 1) {
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
        channel: { value: new THREE.Vector3(1, 0, 0) },
        density: { value: opts.density ?? 0.9 },
        dry: { value: opts.dry ?? 0.3 },
        seed: { value: Math.random() * 20 },
        taper: { value: opts.taper ?? 0.5 },
      },
    });
    void opts.red;
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.order ?? 4000;
    scene.add(this.mesh);
  }

  /** Points along the line and the half-width at each point. */
  set(pts: [number, number][], width: number | ((t: number) => number)): void {
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const p = pts[Math.min(pts.length - 1, i)];
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const w = typeof width === 'number' ? width : width(i / (n - 1));
      const k = i * 6;
      this.pos[k] = p[0] - dy * w;
      this.pos[k + 1] = p[1] + dx * w;
      this.pos[k + 2] = 0;
      this.pos[k + 3] = p[0] + dy * w;
      this.pos[k + 4] = p[1] - dx * w;
      this.pos[k + 5] = 0;
    }
    (this.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  set visible(v: boolean) { this.mesh.visible = v; }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
