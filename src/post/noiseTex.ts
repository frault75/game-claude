/** A tiling noise texture so the paint shader samples noise instead of computing it (mobile GPUs). */
import * as THREE from 'three';

function hash(i: number, j: number, s: number): number {
  let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Periodic value noise: x, y in [0,1), px/py cells across the tile. */
function pnoise(x: number, y: number, px: number, py: number, s: number): number {
  const fx = x * px, fy = y * py;
  const xi = Math.floor(fx), yi = Math.floor(fy);
  const tx = fx - xi, ty = fy - yi;
  const ux = tx * tx * (3 - 2 * tx), uy = ty * ty * (3 - 2 * ty);
  const x0 = ((xi % px) + px) % px, y0 = ((yi % py) + py) % py;
  const x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
  const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function makeNoiseTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = i / size, y = j / size;
      // R: paper fibres (streaks both ways + pulp)
      const r = 0.45 * pnoise(x, y, 16, 128, 1) + 0.35 * pnoise(x, y, 128, 24, 2) + 0.2 * pnoise(x, y, 128, 128, 3);
      // G: soft low-frequency fbm (tone, mist)
      const g = 0.5 * pnoise(x, y, 4, 4, 4) + 0.3 * pnoise(x, y, 8, 8, 5) + 0.2 * pnoise(x, y, 16, 16, 6);
      // B: mid-frequency noise (line boil)
      const b = 0.7 * pnoise(x, y, 32, 32, 7) + 0.3 * pnoise(x, y, 64, 64, 8);
      // A: second fbm (darkness, boil second axis)
      const a = 0.5 * pnoise(x, y, 4, 4, 9) + 0.3 * pnoise(x, y, 32, 32, 10) + 0.2 * pnoise(x, y, 64, 64, 11);
      const k = (j * size + i) * 4;
      data[k] = r * 255;
      data[k + 1] = g * 255;
      data[k + 2] = b * 255;
      data[k + 3] = a * 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
