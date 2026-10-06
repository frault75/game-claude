/**
 * Cinematics: painted shots on a full sheet of paper. Each element appears with a brushed reveal,
 * a fade, a pop or a fall; captions are written underneath. Tap / Space: next shot; Esc: skip all.
 */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { Painter, INK, PIG_B, VERMILION, mixPig, pigStyle } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER } from '../gfx/sprite';
import { washPoly, washBlob, noisyOutline, roughen } from '../gfx/wash';
import { stroke, V2 } from '../gfx/brush';
import { brushText } from '../gfx/text';
import { maskSprite } from './mask';
import { lang } from '../i18n';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import type { ChildFrames } from '../gfx/gen/child';
import { INKS, INK_ORDER, InkId } from '../game/inks';

type Scene = 'pig' | 'red' | 'acc';
type Mode = 'reveal' | 'fade' | 'pop' | 'none';

interface El {
  s: Sprite;
  x: number;
  y: number;
  at: number;
  dur: number;
  mode: Mode;
  out?: number;
  scale: number;
  drift: [number, number];
  fn?: (el: El, t: number) => void;
}

export interface Kit {
  /** UI units per design unit (the design box is 1500 × 800). */
  k: number;
  child?: ChildFrames;
  add(src: Frame | Painter, scene: Scene, o: { x?: number; y?: number; at?: number; dur?: number; mode?: Mode; out?: number; scale?: number; drift?: [number, number]; fn?: (el: El, t: number) => void }): El;
  flash(v: number): void;
  /** True the first time it is asked in this shot (sounds, flashes). */
  once(key: string): boolean;
}

export interface Shot {
  dur: number;
  build(kit: Kit): void;
  lines?: { text: string; at: number }[];
  tick?(t: number, kit: Kit): void;
}

const tr = (fr: string, en: string) => (lang === 'fr' ? fr : en);

export class Cinematic {
  active = false;
  private shots: Shot[] = [];
  private i = 0;
  private t = 0;
  private els: El[] = [];
  private caps: { s: Sprite; at: number; paper: Sprite }[] = [];
  private base: Sprite[] = [];
  private skipS: Sprite | null = null;
  private onEnd?: () => void;
  /** Child frames for the last shot of the intro. */
  child?: ChildFrames;
  flashV = 0;
  private fired = new Set<string>();

  constructor(private r: Renderer, private input: Input) {}

  play(shots: Shot[], onEnd?: () => void): void {
    this.stop();
    this.active = true;
    this.shots = shots;
    this.onEnd = onEnd;
    this.i = -1;
    const r = this.r;
    // a full sheet: hides the world, keeps the dark away, hides the world's colours
    const p = new Painter(r.uiW + 200, r.uiH + 200, 0.08, -(r.uiW + 200) / 2, -(r.uiH + 200) / 2);
    p.over();
    p.ctx.fillStyle = pigStyle({}, 1);
    p.ctx.fillRect(-(r.uiW + 200) / 2, -(r.uiH + 200) / 2, r.uiW + 200, r.uiH + 200);
    const paper = new Sprite(p);
    paper.mesh.renderOrder = LAYER.ui + 60;
    r.uiPig.add(paper.mesh);
    this.base.push(paper, maskSprite(r, r.uiW + 400, r.uiH + 400), maskSprite(r, r.uiW + 400, r.uiH + 400, 'cover'));
    const sk = brushText(tr('Passer ›', 'Skip ›'), { size: 26, ppu: 1.5, italic: true });
    this.skipS = new Sprite(sk);
    this.skipS.mesh.renderOrder = LAYER.ui + 90;
    this.skipS.setPos(r.uiW / 2 - 60 - sk.w / 2, -r.uiH / 2 + 50);
    this.skipS.opacity = 0.6;
    r.uiPig.add(this.skipS.mesh);
    this.input.swallow();
    this.next();
  }

  private clearShot(): void {
    for (const e of this.els) e.s.dispose();
    for (const c of this.caps) { c.s.dispose(); c.paper.dispose(); }
    this.els = [];
    this.caps = [];
  }

  stop(): void {
    this.clearShot();
    for (const s of this.base) s.dispose();
    this.base = [];
    this.skipS?.dispose();
    this.skipS = null;
    this.active = false;
    this.r.post.flash = 0;
  }

  private kit(): Kit {
    const r = this.r;
    const k = Math.min(r.uiW / 1500, r.uiH / 820);
    return {
      k,
      child: this.child,
      add: (src, scene, o) => {
        const s = new Sprite(src instanceof Painter ? frameFrom(src) : src);
        s.mesh.renderOrder = LAYER.ui + 70 + this.els.length;
        (scene === 'pig' ? r.uiPig : scene === 'red' ? r.uiRed : r.uiAcc).add(s.mesh);
        const el: El = { s, x: (o.x ?? 0) * k, y: (o.y ?? 0) * k, at: o.at ?? 0, dur: o.dur ?? 1.2, mode: o.mode ?? 'reveal', out: o.out, scale: (o.scale ?? 1) * k, drift: [(o.drift?.[0] ?? 0) * k, (o.drift?.[1] ?? 0) * k], fn: o.fn };
        s.opacity = 0;
        this.els.push(el);
        return el;
      },
      flash: (v) => { this.flashV = Math.max(this.flashV, v); },
      once: (key) => { if (this.fired.has(key)) return false; this.fired.add(key); return true; },
    };
  }

  private next(): void {
    this.clearShot();
    this.i++;
    this.t = 0;
    this.fired.clear();
    if (this.i >= this.shots.length) { this.finish(); return; }
    const sh = this.shots[this.i];
    sh.build(this.kit());
    for (const ln of sh.lines ?? []) {
      const art = brushText(ln.text, { size: 40, ppu: 1.5, italic: true, maxWidth: Math.min(1300, this.r.uiW * 0.86) });
      const s = new Sprite(art);
      s.mesh.renderOrder = LAYER.ui + 88;
      s.opacity = 0;
      this.r.uiPig.add(s.mesh);
      const paper = maskSprite(this.r, art.w + 220, art.h + 70, 'paper');
      paper.mesh.renderOrder = LAYER.ui + 87;
      paper.opacity = 0;
      this.caps.push({ s, at: ln.at, paper });
    }
  }

  private finish(): void {
    this.stop();
    const cb = this.onEnd;
    this.onEnd = undefined;
    cb?.();
  }

  update(dt: number): void {
    if (!this.active) return;
    const inp = this.input;
    const r = this.r;
    // skip: Esc or the corner label ends it; a tap or Space goes to the next shot
    let skipAll = inp.pressed('back');
    let nextShot = inp.pressed('confirm') || inp.keyPressed('Space');
    for (const [sx, sy] of inp.orderTaps) {
      const [ux, uy] = inp.toUi(sx, sy);
      if (ux > r.uiW / 2 - 260 && uy < -r.uiH / 2 + 110) skipAll = true;
      else nextShot = true;
    }
    if (inp.drawEnd) nextShot = true;
    inp.swallow();
    if (skipAll) { sfx.ui(); this.finish(); return; }
    if (nextShot && this.t > 0.5) { this.next(); if (!this.active) return; }
    this.t += dt;
    const sh = this.shots[this.i];
    const kit = this.kit();
    sh.tick?.(this.t, kit);
    const t = this.t;
    for (const e of this.els) {
      const lt = t - e.at;
      if (lt < 0) { e.s.opacity = 0; continue; }
      const u = Math.min(1, lt / Math.max(0.01, e.dur));
      let op = 1, sc = e.scale;
      if (e.mode === 'reveal') e.s.reveal = u >= 1 ? 1.5 : u;
      else if (e.mode === 'fade') op = u;
      else if (e.mode === 'pop') { const v = u - 1; sc = e.scale * Math.max(0, 1 + 2.70158 * v * v * v + 1.70158 * v * v); }
      if (e.out !== undefined && t > e.out) op *= Math.max(0, 1 - (t - e.out) / 0.7);
      e.s.opacity = op;
      e.s.mesh.scale.set(sc, sc, 1);
      e.s.setPos(e.x + e.drift[0] * t, e.y + e.drift[1] * t);
      e.fn?.(e, lt);
    }
    // captions: written, held, then faded at the end of the shot
    this.caps.forEach((c, i) => {
      const lt = t - c.at;
      const y = -r.uiH / 2 + 140 + (this.caps.length - 1 - i) * 62;
      c.s.setPos(0, y);
      c.paper.setPos(0, y);
      if (lt < 0) { c.s.opacity = 0; c.paper.opacity = 0; return; }
      c.s.reveal = Math.min(1.5, lt / 1.4);
      c.s.opacity = Math.min(1, Math.max(0, (sh.dur - t) / 0.6));
      c.paper.opacity = c.s.opacity * Math.min(1, lt * 3) * 0.9;
    });
    this.flashV = Math.max(0, this.flashV - dt * 2.5);
    r.post.flash = this.flashV;
    if (t >= sh.dur) this.next();
  }
}

// ---------- paintings ----------

function ridge(seed: number, base: number, top: number, w: number): V2[] {
  const pts: V2[] = [[-w / 2, base]];
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = -w / 2 + u * w;
    // peaks fade into the paper at both ends: no cut edges
    const ends = Math.min(1, Math.min(u, 1 - u) / 0.14);
    const h = (top * (0.55 + 0.45 * Math.sin(i * 0.7 + seed) * Math.sin(i * 0.29 + seed * 2)) + 26 * Math.sin(i * 1.9 + seed)) * ends * ends;
    pts.push([x, base + Math.max(4, h)]);
  }
  pts.push([w / 2, base]);
  return pts;
}

const cache = new Map<string, Frame>();
function painted(key: string, make: () => Painter): Frame {
  let f = cache.get(key);
  if (!f) { f = frameFrom(make()); cache.set(key, f); }
  return f;
}

function landscape(): { far: Frame; near: Frame; river: Frame; willow: Frame; roofs: Frame; seal: Frame } {
  const far = painted('far', () => {
    const p = new Painter(1500, 500, 0.6, -750, -150);
    p.glaze();
    washPoly(p, roughen(ridge(1, -40, 260, 1500), 6, 11, 20), { pig: mixPig(INK, PIG_B, 0.4), density: 0.16, soft: 0.5, seed: 12 });
    return p;
  });
  const near = painted('near', () => {
    const p = new Painter(1500, 420, 0.6, -750, -260);
    p.glaze();
    washPoly(p, roughen(ridge(4, -200, 170, 1500), 6, 13, 20), { pig: INK, density: 0.34, soft: 0.25, edge: 0.7, seed: 14, blooms: 2 });
    return p;
  });
  const river = painted('river', () => {
    const p = new Painter(700, 470, 0.6, -350, -430);
    p.glaze();
    // wide at our feet, a thread in the distance
    const left: V2[] = [[-280, -425], [-150, -320], [-60, -230], [-90, -140], [10, -60], [20, 10]];
    const right: V2[] = [[60, 10], [70, -60], [10, -140], [60, -230], [40, -320], [150, -425]];
    washPoly(p, roughen([...left, ...right], 3, 15, 12), { pig: mixPig(INK, PIG_B, 0.65), density: 0.2, soft: 0.35, edge: 0.6, seed: 15 });
    for (let i = 0; i < 9; i++) {
      const y = -400 + i * 45, w = 90 - i * 9, x = -40 + Math.sin(i * 1.7) * 30;
      stroke(p, [[x - w / 2, y], [x, y + 3], [x + w / 2, y - 1]], { width: 3, load: 0.45, dry: 0.7, seed: 16 + i, taperStart: 0.4, taperEnd: 0.4 });
    }
    return p;
  });
  const willow = painted('willow', () => {
    const p = new Painter(560, 640, 0.6, -280, -420);
    p.glaze();
    washBlob(p, 20, 80, 230, 120, { pig: mixPig(INK, PIG_B, 0.5), density: 0.07, soft: 0.8, seed: 19 });
    stroke(p, [[-10, -410], [10, -260], [-20, -100], [10, 40], [40, 110]], { width: 34, load: 1, dry: 0.45, seed: 17, taperStart: 0.02, taperEnd: 0.7, rough: 0.3 });
    stroke(p, [[0, 20], [-90, 110], [-200, 130]], { width: 11, load: 0.95, dry: 0.4, seed: 20, taperEnd: 0.8 });
    stroke(p, [[20, 60], [120, 140], [230, 120]], { width: 10, load: 0.95, dry: 0.4, seed: 21, taperEnd: 0.8 });
    // long hanging twigs from the crown
    for (let i = 0; i < 30; i++) {
      const u = i / 29;
      const x = -220 + u * 450, y0 = 110 + Math.sin(u * Math.PI) * 50;
      const len = 170 + ((i * 53) % 150);
      const sway = (u - 0.5) * 30;
      stroke(p, [[x, y0], [x + sway * 0.3, y0 - len * 0.4], [x + sway, y0 - len]], { width: 3.2, load: 0.55, dry: 0.55, seed: 22 + i, taperStart: 0.05, taperEnd: 0.95, body: 0.3 });
    }
    return p;
  });
  const roofs = painted('roofs', () => {
    const p = new Painter(560, 280, 0.6, -280, -140);
    p.glaze();
    for (let i = 0; i < 3; i++) {
      const cx = -175 + i * 175, cy = -50 + (i % 2) * 34, w = 70 - i * 6;
      // walls, posts and a dark door
      washPoly(p, roughen([[cx - w, cy - 70], [cx + w, cy - 70], [cx + w, cy], [cx - w, cy]], 2, 30 + i, 10), { pig: mixPig(INK, PIG_B, 0.3), density: 0.12, soft: 0.1, seed: 30 + i });
      stroke(p, [[cx - w, cy], [cx - w, cy - 72]], { width: 4, load: 0.8, seed: 33 + i });
      stroke(p, [[cx + w, cy], [cx + w, cy - 72]], { width: 4, load: 0.8, seed: 36 + i });
      washPoly(p, [[cx - 12, cy - 70], [cx + 12, cy - 70], [cx + 12, cy - 30], [cx - 12, cy - 30]], { pig: INK, density: 0.7, soft: 0.05, seed: 39 + i });
      // a curved roof with lifted eaves
      const roof: V2[] = [[cx - w - 30, cy + 16], [cx - w - 10, cy + 6], [cx - w * 0.4, cy + 2], [cx + w * 0.4, cy + 2], [cx + w + 10, cy + 6], [cx + w + 30, cy + 16], [cx + w * 0.55, cy + 54], [cx - w * 0.55, cy + 54]];
      washPoly(p, roughen(roof, 2, 42 + i, 8), { pig: INK, density: 0.75, soft: 0.05, edge: 0.6, seed: 42 + i });
      stroke(p, [[cx - w * 0.6, cy + 56], [cx + w * 0.6, cy + 56]], { width: 6, load: 1, seed: 45 + i });
    }
    return p;
  });
  const seal = painted('seal', () => {
    const p = new Painter(110, 110, 1, -55, -55);
    p.glaze();
    washPoly(p, roughen([[-40, -40], [40, -40], [40, 40], [-40, 40]], 2, 31, 8), { pig: VERMILION, density: 0.95, soft: 0.05, edge: 0.4, seed: 31 });
    p.lift();
    stroke(p, [[-20, 22], [20, 22]], { width: 7, load: 1, seed: 32 });
    stroke(p, [[0, 26], [0, -26]], { width: 7, load: 1, seed: 33 });
    stroke(p, [[-22, -8], [22, -14]], { width: 6, load: 1, seed: 34 });
    p.glaze();
    return p;
  });
  return { far, near, river, willow, roofs, seal };
}

function drop(): Frame {
  return painted('drop', () => {
    const p = new Painter(60, 90, 1, -30, -30);
    p.glaze();
    const pts: V2[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rr = 18 * (1 - 0.55 * Math.max(0, Math.sin(a)) ** 3);
      pts.push([Math.cos(a) * rr * 0.8, Math.sin(a) * rr * 1.1 + (Math.sin(a) > 0 ? Math.sin(a) ** 4 * 16 : 0)]);
    }
    washPoly(p, pts, { pig: INK, density: 0.95, soft: 0.05, edge: 0.7, seed: 41 });
    return p;
  });
}

function splash(): Frame {
  return painted('splash', () => {
    const p = new Painter(400, 260, 0.8, -200, -130);
    p.glaze();
    washBlob(p, 0, 0, 130, 70, { pig: INK, density: 0.35, soft: 0.6, seed: 42, rough: 0.5 });
    washBlob(p, 0, 0, 60, 34, { pig: INK, density: 0.6, soft: 0.3, seed: 43, rough: 0.4 });
    for (let i = 0; i < 8; i++) { const a = i * 0.8; p.circle(Math.cos(a) * 160, Math.sin(a) * 90, 4 + (i % 3) * 3, INK, 0.7); }
    return p;
  });
}

function blot(): Frame {
  return painted('blot', () => {
    const p = new Painter(600, 600, 0.5, -300, -300);
    p.glaze();
    for (let i = 0; i < 4; i++) washBlob(p, (i - 1.5) * 40, (i % 2) * 30, 230 - i * 30, 200 - i * 20, { pig: INK, density: 0.5, soft: 0.4, seed: 50 + i, rough: 0.5 });
    return p;
  });
}

function rain(): Frame {
  return painted('rain', () => {
    const p = new Painter(1600, 900, 0.4, -800, -450);
    p.glaze();
    for (let i = 0; i < 90; i++) {
      const x = -800 + ((i * 173) % 1600), y = -450 + ((i * 97) % 900);
      stroke(p, [[x, y], [x - 30, y - 110]], { width: 2.5, load: 0.4, dry: 0.6, seed: 60 + i, taperStart: 0.4, taperEnd: 0.4 });
    }
    return p;
  });
}

function master(): Frame {
  return painted('master', () => {
    const p = new Painter(420, 620, 0.7, -210, -320);
    p.glaze();
    washPoly(p, roughen([[-130, -300], [130, -300], [70, 120], [-70, 120]], 4, 71, 14), { pig: INK, density: 0.5, soft: 0.1, edge: 0.8, seed: 71, blooms: 2 });
    stroke(p, [[-70, 110], [-150, 0], [-190, -60]], { width: 34, load: 0.7, dry: 0.4, seed: 72 });
    stroke(p, [[70, 110], [160, 40], [200, 90]], { width: 30, load: 0.7, dry: 0.4, seed: 73 });
    p.circle(0, 170, 42, INK, 0.85);
    washPoly(p, roughen([[-120, 190], [120, 190], [0, 270]], 3, 74, 10), { pig: INK, density: 0.85, soft: 0.05, edge: 0.5, seed: 74 });
    for (let i = 0; i < 5; i++) stroke(p, [[-16 + i * 8, 140], [-20 + i * 9, 40 - i * 6]], { width: 3, load: 0.6, dry: 0.6, seed: 75 + i });
    // the brush
    stroke(p, [[200, 90], [220, 200]], { width: 8, load: 1, seed: 80 });
    return p;
  });
}

function redStroke(): Frame {
  return painted('redStroke', () => {
    const p = new Painter(120, 160, 1, -60, -80);
    p.glaze();
    stroke(p, [[-10, 60], [8, 10], [-4, -40], [10, -66]], { width: 16, pig: VERMILION, load: 1, dry: 0.3, seed: 90, taperStart: 0.1, taperEnd: 0.5 });
    return p;
  });
}

function pot(id: InkId): Frame {
  return painted('pot' + id, () => {
    const [cr, cg, cb] = INKS[id].rgb;
    const p = new Painter(220, 220, 0.8, -110, -110);
    p.over();
    const o = noisyOutline(0, 0, 80, 80, 0.14, 100 + INK_ORDER.indexOf(id));
    p.ctx.fillStyle = `rgba(${Math.round(cr * 255)},${Math.round(cg * 255)},${Math.round(cb * 255)},1)`;
    p.ctx.beginPath();
    o.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1])));
    p.ctx.fill();
    return p;
  });
}

function text(str: string, size: number, o: { bold?: boolean; italic?: boolean; color?: [number, number, number] } = {}): Frame {
  return brushText(str, { size, ppu: 1.4, weight: o.bold ? 700 : 400, italic: o.italic, color: o.color, halo: false });
}

// ---------- the intro ----------

export function introShots(): Shot[] {
  return [
    {
      dur: 6.5,
      lines: [{ text: tr('Au commencement, il n’y avait que le papier.', 'In the beginning, there was only paper.'), at: 0.4 }],
      build(kit) {
        kit.add(drop(), 'pig', { x: 0, y: 360, at: 1.6, dur: 1.2, mode: 'none', fn: (el, t) => {
          const u = Math.min(1, t / 1.1);
          el.s.setPos(0, (360 - 400 * u * u) * kit.k);
          el.s.opacity = u < 1 ? 1 : Math.max(0, 1 - (t - 1.1) * 4);
          if (u >= 1 && kit.once('splash')) sfx.splash();
        } });
        kit.add(splash(), 'pig', { x: 0, y: -40, at: 2.7, dur: 1.4, mode: 'none', fn: (el, t) => {
          const u = Math.min(1, t / 1.4);
          const s = kit.k * (0.2 + 0.8 * (1 - (1 - u) * (1 - u)));
          el.s.mesh.scale.set(s, s, 1);
          el.s.opacity = 1;
        } });
      },
    },
    {
      dur: 9,
      lines: [{ text: tr('Puis vint le maître. Il trempa son pinceau, et le monde se mit à exister.', 'Then came the master. He dipped his brush, and the world began to be.'), at: 0.3 }],
      build(kit) {
        const L = landscape();
        kit.add(L.far, 'pig', { y: 120, at: 0.4, dur: 2.2, drift: [-4, 0] });
        kit.add(L.near, 'pig', { y: 40, at: 1.8, dur: 2 });
        kit.add(L.river, 'pig', { x: 40, y: 40, at: 3.2, dur: 1.6 });
        kit.add(L.willow, 'pig', { x: -480, y: 20, at: 4.2, dur: 1.4 });
        kit.add(L.roofs, 'pig', { x: 400, y: -250, at: 5.2, dur: 1.4 });
        kit.add(L.seal, 'red', { x: 640, y: 300, at: 6.6, dur: 0.5, mode: 'pop' });
      },
      tick(t, kit) { if (t > 6.6 && kit.once('seal')) sfx.impact(false); },
    },
    {
      dur: 8,
      lines: [{ text: tr('Il broya quatre couleurs pour lui donner vie : le vermillon, l’indigo, l’or et le jade.', 'He ground four colours to give it life: vermilion, indigo, gold and jade.'), at: 0.3 }],
      build(kit) {
        INK_ORDER.forEach((id, i) => {
          const x = -480 + i * 320;
          kit.add(pot(id), 'acc', { x, y: 90, at: 1 + i * 0.8, dur: 0.5, mode: 'pop' });
          kit.add(text(INKS[id].name[lang], 40, { italic: true }), 'pig', { x, y: -60, at: 1.3 + i * 0.8, dur: 0.8, mode: 'reveal' });
        });
      },
      tick(t, kit) { for (let i = 0; i < 4; i++) if (t > 1 + i * 0.8 && kit.once('pot' + i)) sfx.charge(i + 1); },
    },
    {
      dur: 9,
      lines: [
        { text: tr('Mais une nuit d’orage, l’encre déborda.', 'But one stormy night, the ink overflowed.'), at: 0.4 },
        { text: tr('Une tache sans fond avala les couleurs, une à une.', 'A bottomless blot swallowed the colours, one by one.'), at: 3.2 },
      ],
      build(kit) {
        const L = landscape();
        kit.add(L.far, 'pig', { y: 120, mode: 'none' });
        kit.add(L.near, 'pig', { y: 40, mode: 'none' });
        kit.add(L.river, 'pig', { x: 40, y: 40, mode: 'none' });
        kit.add(L.willow, 'pig', { x: -480, y: 20, mode: 'none' });
        kit.add(L.roofs, 'pig', { x: 400, y: -250, mode: 'none' });
        kit.add(rain(), 'pig', { at: 0.6, dur: 1.5, mode: 'fade', drift: [-20, -60] });
        kit.add(blot(), 'pig', { x: -60, y: 60, at: 2.6, dur: 5, mode: 'none', fn: (el, t) => {
          const u = Math.min(1, t / 5);
          const s = kit.k * (0.05 + 3.1 * u * u);
          el.s.mesh.scale.set(s, s * 0.9, 1);
          el.s.opacity = 1;
        } });
      },
      tick(t, kit) {
        for (const at of [1.4, 2.5, 5.2]) if (t > at && kit.once('bolt' + at)) { kit.flash(0.7); sfx.thunder(); }
      },
    },
    {
      dur: 10,
      lines: [{ text: tr('Le maître s’y jeta pour les reprendre. Il ne revint pas.', 'The master threw himself in to take them back. He did not return.'), at: 0.4 }],
      build(kit) {
        kit.add(master(), 'pig', { x: -40, y: 60, at: 0.2, dur: 1.4, mode: 'fade', fn: (el, t) => { el.s.dissolve = Math.max(0, Math.min(1, (t - 4.2) / 2.8)); } });
        kit.add(redStroke(), 'red', { x: 180, y: 200, at: 4.8, dur: 0.4, mode: 'fade', fn: (el, t) => {
          const u = Math.min(1, Math.max(0, (t - 0.6) / 2.4));
          el.s.setPos(180 * kit.k * (1 - u * 0.9), (200 - 420 * u * u) * kit.k);
          el.s.mesh.rotation.z = u * 1.2;
        } });
      },
    },
    {
      dur: 8,
      lines: [
        { text: tr('De lui, il ne resta qu’un trait : petit, rouge, vivant.', 'Of him, only a stroke remained: small, red, alive.'), at: 0.4 },
        { text: tr('Toi.', 'You.'), at: 4 },
      ],
      build(kit) {
        kit.add(redStroke(), 'red', { x: 0, y: 40, mode: 'none', out: 2.6 });
        const ch = kit.child;
        if (ch) {
          const f = ch.pig.down.idle[0], fr = ch.red.down.idle[0];
          const sc = 230 / f.h;
          const place = (el: El) => el.s.setPos(-(f.ox + f.w / 2) * sc * kit.k, (40 - (f.oy + f.h / 2) * sc) * kit.k);
          kit.add(f, 'pig', { at: 2.4, dur: 1.4, mode: 'fade', scale: sc, fn: (el) => place(el) });
          kit.add(fr, 'red', { at: 2.4, dur: 1.4, mode: 'fade', scale: sc, fn: (el) => place(el) });
        }
      },
      tick(t, kit) { if (t > 4 && kit.once('you')) music.motif(true, 'bell', 1); },
    },
  ];
}

/** A colour comes back: a short sheet with its bloom, its name and what it does. */
export function inkShots(id: InkId): Shot[] {
  const d = INKS[id];
  return [{
    dur: 5.5,
    lines: [{ text: d.verb[lang], at: 2 }],
    build(kit) {
      kit.add(pot(id), 'acc', { y: 120, at: 0.2, dur: 0.7, mode: 'pop', scale: 1.6 });
      kit.add(text(d.name[lang], 96, { bold: true, color: d.rgb }), 'acc', { y: -110, at: 0.9, dur: 1, mode: 'reveal' });
    },
    tick(t, kit) { if (t > 0.2 && kit.once('bloom')) { sfx.uiConfirm(); music.motif(false, 'bell', 1); } },
  }];
}
