import * as THREE from 'three';
import { Painter } from './paint';

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const frag = /* glsl */ `
uniform sampler2D map;
uniform float opacity;
uniform float pale;
uniform float dissolve;
uniform float dissolveSeed;
uniform vec3 gain;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec4 c = texture2D(map, vUv);
  c.rgb *= gain;
  c.rgb *= 1.0 - pale;
  if (dissolve > 0.0) {
    float n = vnoise(vUv * 9.0 + dissolveSeed) * 0.7 + vnoise(vUv * 31.0 - dissolveSeed) * 0.3;
    float k = smoothstep(dissolve - 0.08, dissolve + 0.08, n);
    c *= k;
  }
  gl_FragColor = c * opacity;
}
`;

export type BlendMode = 'over' | 'glaze';

export function makeTexture(canvas: HTMLCanvasElement, mip = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.premultiplyAlpha = true;
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = mip;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 1;
  t.needsUpdate = true;
  return t;
}

export function makeMaterial(tex: THREE.Texture, blend: BlendMode = 'over'): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: blend === 'over' ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      map: { value: tex },
      opacity: { value: 1 },
      pale: { value: 0 },
      dissolve: { value: 0 },
      dissolveSeed: { value: Math.random() * 50 },
      gain: { value: new THREE.Vector3(1, 1, 1) },
    },
  });
}

/** A painted plane. Geometry is built so the painter's world rect is reproduced around the mesh origin. */
export class Sprite {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  private tex: THREE.Texture;
  private owned: boolean;

  constructor(source: Painter | { tex: THREE.Texture; w: number; h: number; ox: number; oy: number }, blend: BlendMode = 'over') {
    let w: number, h: number, ox: number, oy: number;
    if (source instanceof Painter) {
      this.tex = makeTexture(source.canvas);
      this.owned = true;
      w = source.w; h = source.h; ox = source.originX; oy = source.originY;
    } else {
      this.tex = source.tex;
      this.owned = false;
      w = source.w; h = source.h; ox = source.ox; oy = source.oy;
    }
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(ox + w / 2, oy + h / 2, 0);
    this.mat = makeMaterial(this.tex, blend);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = true;
    this.mesh.matrixAutoUpdate = true;
  }

  setTexture(tex: THREE.Texture): void {
    this.mat.uniforms.map.value = tex;
  }

  set opacity(v: number) { this.mat.uniforms.opacity.value = v; }
  get opacity(): number { return this.mat.uniforms.opacity.value; }
  set pale(v: number) { this.mat.uniforms.pale.value = v; }
  set dissolve(v: number) { this.mat.uniforms.dissolve.value = v; }

  setPos(x: number, y: number): void {
    this.mesh.position.x = x;
    this.mesh.position.y = y;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mat.dispose();
    if (this.owned) this.tex.dispose();
  }
}

/** Shared texture handle for animation frames painted once and reused. */
export interface Frame {
  tex: THREE.Texture;
  w: number;
  h: number;
  ox: number;
  oy: number;
}

export function frameFrom(p: Painter): Frame {
  return { tex: makeTexture(p.canvas), w: p.w, h: p.h, ox: p.originX, oy: p.originY };
}

/** Render order bands. Actors are y-sorted inside their band. */
export const LAYER = {
  ground: 0,
  groundDetail: 100,
  shadow: 200,
  telegraph: 300,
  actorsBase: 1000,
  canopy: 5000,
  weather: 6000,
  ui: 9000,
} as const;

export function ySort(y: number): number {
  return LAYER.actorsBase + 2000 - y * 10;
}
