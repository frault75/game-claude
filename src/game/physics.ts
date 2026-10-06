/** Small 2D collision helpers: circles against static circles and segments. */
export type V = [number, number];

export interface CircleCol { kind: 'circle'; x: number; y: number; r: number; blocksThread?: boolean; /** 'thorn': mist passes through. */ tag?: string }
export interface SegCol { kind: 'seg'; ax: number; ay: number; bx: number; by: number; r: number; blocksThread?: boolean; tag?: string }
export type Collider = CircleCol | SegCol;

export function closestOnSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number, number] {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return [ax + dx * t, ay + dy * t, t];
}

export function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const [cx, cy] = closestOnSeg(px, py, ax, ay, bx, by);
  return Math.hypot(px - cx, py - cy);
}

/** Push a circle out of a collider. Returns the corrected position or null if no overlap. */
export function pushOut(x: number, y: number, r: number, c: Collider): V | null {
  if (c.kind === 'circle') {
    const dx = x - c.x, dy = y - c.y;
    const d = Math.hypot(dx, dy);
    const min = r + c.r;
    if (d >= min) return null;
    if (d < 1e-6) return [c.x + min, y];
    return [c.x + (dx / d) * min, c.y + (dy / d) * min];
  }
  const [cx, cy] = closestOnSeg(x, y, c.ax, c.ay, c.bx, c.by);
  const dx = x - cx, dy = y - cy;
  const d = Math.hypot(dx, dy);
  const min = r + c.r;
  if (d >= min) return null;
  if (d < 1e-6) {
    // push along the segment normal
    const sx = c.bx - c.ax, sy = c.by - c.ay;
    const sl = Math.hypot(sx, sy) || 1;
    return [cx - (sy / sl) * min, cy + (sx / sl) * min];
  }
  return [cx + (dx / d) * min, cy + (dy / d) * min];
}

export function pointInPoly(x: number, y: number, poly: V[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polygon's boundary. */
export function distToPoly(x: number, y: number, poly: V[]): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    best = Math.min(best, distToSeg(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  }
  return best;
}

/** Segment-segment intersection: returns t along the first segment, or -1. */
export function segIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): number {
  const rX = bx - ax, rY = by - ay, sX = dx - cx, sY = dy - cy;
  const den = rX * sY - rY * sX;
  if (Math.abs(den) < 1e-9) return -1;
  const t = ((cx - ax) * sY - (cy - ay) * sX) / den;
  const u = ((cx - ax) * rY - (cy - ay) * rX) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return -1;
  return t;
}

/** Which side of a line a point is on (sign of cross product). */
export function side(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  return Math.sign((bx - ax) * (py - ay) - (by - ay) * (px - ax));
}

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
