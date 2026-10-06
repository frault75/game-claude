/** Text written with the brush: a serif face, ink spread, dry-brush speckle. */
import { Frame, makeTexture } from './sprite';
import { Pig, INK, pigStyle } from './paint';
import { Rng } from './rng';

export const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';

export interface TextOpts {
  size: number; // in UI units (1080-tall virtual px) or world units, see ppu
  ppu?: number; // canvas px per unit
  italic?: boolean;
  weight?: number;
  pig?: Pig;
  load?: number;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number; // wrap width in units
  lineHeight?: number;
  seed?: number;
  letterSpacing?: number;
  /** Real colour (CSS) for the gouache buffer instead of pigment densities. */
  color?: [number, number, number];
  /** A soft paper halo around the letters so they read over anything (default on). */
  halo?: boolean;
}

export interface TextArt extends Frame {
  lines: number;
}

let measureCtx: CanvasRenderingContext2D | null = null;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export function brushText(text: string, o: TextOpts): TextArt {
  const ppu = o.ppu ?? 2;
  const px = o.size * ppu;
  const font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${px}px ${SERIF}`;
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')!;
  measureCtx.font = font;
  const lines = o.maxWidth ? wrap(measureCtx, text, o.maxWidth * ppu) : text.split('\n');
  const lh = px * (o.lineHeight ?? 1.35);
  let wMax = 0;
  for (const l of lines) wMax = Math.max(wMax, measureCtx.measureText(l).width);
  const pad = px * 0.4;
  const cw = Math.ceil(wMax + pad * 2), ch = Math.ceil(lh * lines.length + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  const align = o.align ?? 'center';
  ctx.textAlign = align;
  const x0 = align === 'center' ? cw / 2 : align === 'left' ? pad : cw - pad;
  const pig = o.pig ?? INK;
  const load = o.load ?? 1;
  const r = new Rng(o.seed ?? 7);
  const col = o.color;
  const style = (a: number) => (col ? `rgba(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)},${a})` : pigStyle(pig, a));
  // paper halo: zero pigment but full coverage, so whatever lies beneath is hidden around the letters
  if (o.halo !== false && !col) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round';
    lines.forEach((l, i) => {
      const y = pad + lh * (i + 0.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = px * 0.42;
      ctx.strokeText(l, x0, y);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = px * 0.2;
      ctx.strokeText(l, x0, y);
    });
  }
  ctx.globalCompositeOperation = col ? 'source-over' : 'lighter';
  lines.forEach((l, i) => {
    const y = pad + lh * (i + 0.5);
    // ink spread: faint offset passes
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = style(0.1 * load);
      ctx.fillText(l, x0 + r.gauss() * px * 0.025, y + r.gauss() * px * 0.025);
    }
    ctx.fillStyle = style(col ? load : 0.82 * load);
    ctx.fillText(l, x0, y);
  });
  // dry brush: lift tiny specks and a few streaks
  ctx.globalCompositeOperation = 'destination-out';
  const specks = Math.round((cw * ch) / (px * 2.2));
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = `rgba(0,0,0,${r.range(0.2, 0.7)})`;
    const s = r.range(0.4, 1.4) * Math.max(1, px / 40);
    ctx.fillRect(r.range(0, cw), r.range(0, ch), s * r.range(1, 3), s);
  }
  ctx.globalCompositeOperation = 'source-over';
  const w = cw / ppu, h = ch / ppu;
  return { tex: makeTexture(canvas, false), w, h, ox: -w / 2, oy: -h / 2, lines: lines.length };
}
