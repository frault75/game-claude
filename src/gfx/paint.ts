/**
 * The pigment model.
 *
 * Nothing is painted in final colours. Every canvas stores pigment *densities*:
 *   R = ink, G = pigment A, B = pigment B   (red-layer canvases: R = vermilion, G = light, B = erase)
 * and alpha = coverage (how much of what lies underneath is hidden).
 * The composite shader turns densities into the current area's palette.
 *
 * Canvases are drawn in world units with y pointing up (see Painter).
 */
export interface Pig {
  ink?: number;
  a?: number;
  b?: number;
}

export const INK: Pig = { ink: 1 };
export const PIG_A: Pig = { a: 1 };
export const PIG_B: Pig = { b: 1 };
/** Red layer channels. */
export const VERMILION: Pig = { ink: 1 };
export const LIGHT: Pig = { a: 1 };
export const ERASE: Pig = { b: 1 };

const c255 = (v: number | undefined) => Math.max(0, Math.min(255, Math.round((v ?? 0) * 255)));

/** CSS colour for a pigment mix at a given alpha (coverage). Density painted = channel * alpha. */
export function pigStyle(p: Pig, alpha = 1): string {
  return `rgba(${c255(p.ink)},${c255(p.a)},${c255(p.b)},${Math.max(0, Math.min(1, alpha))})`;
}

/** Mix of two pigments. */
export function mixPig(p: Pig, q: Pig, t: number): Pig {
  return {
    ink: (p.ink ?? 0) * (1 - t) + (q.ink ?? 0) * t,
    a: (p.a ?? 0) * (1 - t) + (q.a ?? 0) * t,
    b: (p.b ?? 0) * (1 - t) + (q.b ?? 0) * t,
  };
}

/**
 * A canvas addressed in world units, y up.
 * World point (originX, originY) maps to the canvas bottom-left corner.
 */
export class Painter {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly pxW: number;
  readonly pxH: number;

  constructor(
    readonly w: number,
    readonly h: number,
    readonly ppu: number,
    readonly originX = 0,
    readonly originY = 0,
  ) {
    this.pxW = Math.max(1, Math.ceil(w * ppu));
    this.pxH = Math.max(1, Math.ceil(h * ppu));
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.pxW;
    this.canvas.height = this.pxH;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.resetTransform();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  resetTransform(): void {
    this.ctx.setTransform(this.ppu, 0, 0, -this.ppu, -this.originX * this.ppu, this.pxH + this.originY * this.ppu);
  }

  /** Paint mode: densities add like glazes. */
  glaze(): void {
    this.ctx.globalCompositeOperation = 'lighter';
  }
  /** Occluding mode: what is drawn hides what is below. */
  over(): void {
    this.ctx.globalCompositeOperation = 'source-over';
  }
  /** Remove paint (back to bare paper and zero coverage). */
  lift(): void {
    this.ctx.globalCompositeOperation = 'destination-out';
  }

  /** Reserve: hide what lies below this sprite inside a path, without adding pigment. */
  reserve(path: () => void, alpha = 1): void {
    const ctx = this.ctx;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    path();
    ctx.fill();
    ctx.globalCompositeOperation = prev;
  }

  circle(x: number, y: number, r: number, p: Pig, alpha: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = pigStyle(p, alpha);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Soft radial dab. */
  dab(x: number, y: number, r: number, p: Pig, alpha: number, hardness = 0.3): void {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, r * hardness, x, y, r);
    g.addColorStop(0, pigStyle(p, alpha));
    g.addColorStop(1, pigStyle(p, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
