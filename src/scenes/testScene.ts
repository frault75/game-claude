/** Milestone (a): a quiet corner of the orchard to judge the rendering pipeline. */
import * as THREE from 'three';
import { Renderer } from '../core/renderer';
import { Input } from '../core/input';
import { Painter, INK, PIG_A } from '../gfx/paint';
import { Sprite, Frame, frameFrom, LAYER, ySort } from '../gfx/sprite';
import { stroke } from '../gfx/brush';
import { drawTree, drawBamboo, SPRITE_PPU } from '../gfx/gen/flora';
import { drawRock, flatStone } from '../gfx/gen/stone';
import { drawPost, drawStoneLamp, drawHut } from '../gfx/gen/props';
import { buildChildFrames, ChildFrames, Facing } from '../gfx/gen/child';
import { GROUND_PPU, groundBase, grassField, scatterPetals, earthPath, pond, shadow } from '../gfx/gen/ground';
import { Rng } from '../gfx/rng';
import { PALETTES } from '../game/palettes';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

interface Particle { s: Sprite; x: number; y: number; vx: number; vy: number; life: number; max: number }

export class TestScene {
  camX = 0;
  camY = 0;
  private child!: { pig: Sprite; red: Sprite; frames: ChildFrames; facing: Facing; t: number; x: number; y: number; moving: boolean };
  private rain: Particle[] = [];
  private petals: Particle[] = [];
  private trees: { s: Sprite; x: number; y: number; crown: { x: number; y: number; rx: number; ry: number } }[] = [];
  private rng = new Rng(7);
  paletteName = 'orchard';

  constructor(private r: Renderer, private input: Input) {}

  async build(progress: (t: number) => void): Promise<void> {
    const R = this.r;
    const W = 44, H = 28, X0 = -22, Y0 = -14;
    const ground = new Painter(W, H, GROUND_PPU, X0, Y0);
    ground.glaze();
    const rect = { x: X0, y: Y0, w: W, h: H };
    groundBase(ground, rect, 11);
    progress(0.1); await nextFrame();
    const pondO = pond(ground, 8, -5, 4.2, 2.2, 21);
    const inPond = (x: number, y: number) => ((x - 8) / 4.8) ** 2 + ((y + 5) / 2.8) ** 2 < 1;
    const pathPts: [number, number][] = [[-22, -2], [-14, -1], [-7, 1.5], [0, 0.5], [6, 2.5], [14, 3], [22, 1]];
    earthPath(ground, pathPts, 2.2, 31);
    const onPath = (x: number, y: number) => {
      for (let i = 0; i < pathPts.length - 1; i++) {
        const [ax, ay] = pathPts[i], [bx, by] = pathPts[i + 1];
        const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
        if (Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)) < 1.6) return true;
      }
      return false;
    };
    progress(0.2); await nextFrame();
    grassField(ground, rect, 420, 41, (x, y) => inPond(x, y) || onPath(x, y));
    scatterPetals(ground, rect, 260, 51);
    for (let i = 0; i < 5; i++) flatStone(ground, 2.5 + i * 1.1, -1.4 - (i % 2) * 0.5, 0.42, 60 + i);
    void pondO;
    progress(0.4); await nextFrame();

    // Upright things
    const place: { x: number; y: number; kind: string; seed: number }[] = [
      { x: -12, y: 5, kind: 'plum', seed: 101 }, { x: -6, y: 7, kind: 'plum', seed: 102 }, { x: 2, y: 8, kind: 'plum', seed: 103 },
      { x: -15, y: -6, kind: 'plum', seed: 104 }, { x: -3, y: -7, kind: 'plum', seed: 105 }, { x: 15, y: 7, kind: 'willow', seed: 106 },
      { x: 13, y: -8, kind: 'pine', seed: 107 }, { x: -18, y: 9, kind: 'bamboo', seed: 108 }, { x: 19, y: -2, kind: 'bamboo', seed: 109 },
      { x: -9, y: -3, kind: 'rock', seed: 201 }, { x: 4, y: -9, kind: 'rock', seed: 202 }, { x: 11, y: -2.2, kind: 'rock', seed: 203 },
      { x: -4, y: 3.5, kind: 'post', seed: 301 }, { x: 4, y: 4.5, kind: 'post', seed: 302 }, { x: 9, y: 5, kind: 'lamp', seed: 401 },
      { x: -10, y: 11, kind: 'hut', seed: 501 },
    ];
    let k = 0;
    for (const it of place) {
      let pig: Painter, red: Painter | undefined;
      let crown: { x: number; y: number; rx: number; ry: number } | undefined;
      if (it.kind === 'plum' || it.kind === 'willow' || it.kind === 'pine') {
        const t = drawTree(it.seed, it.kind, it.kind === 'pine' ? 1.1 : 1);
        pig = t.painter; crown = t.crown;
        shadow(ground, it.x + 0.4, it.y - 0.1, 1.8, 0.7, 0.18);
      } else if (it.kind === 'bamboo') {
        pig = drawBamboo(it.seed);
        shadow(ground, it.x + 0.3, it.y, 1.3, 0.5, 0.15);
      } else if (it.kind === 'rock') {
        pig = drawRock(it.seed, new Rng(it.seed).range(0.9, 1.5));
        shadow(ground, it.x + 0.3, it.y, 1.2, 0.45, 0.2);
      } else if (it.kind === 'post') {
        const a = drawPost(it.seed); pig = a.pig; red = a.red;
        shadow(ground, it.x + 0.1, it.y, 0.35, 0.14, 0.25);
      } else if (it.kind === 'lamp') {
        const a = drawStoneLamp(it.seed, true); pig = a.pig; red = a.red;
        shadow(ground, it.x + 0.2, it.y, 0.6, 0.22, 0.25);
      } else {
        const a = drawHut(it.seed); pig = a.pig;
        shadow(ground, it.x + 0.3, it.y + 0.2, 3.2, 0.8, 0.2);
      }
      const s = new Sprite(pig);
      s.setPos(it.x, it.y);
      s.mesh.renderOrder = ySort(it.y);
      R.scenePig.add(s.mesh);
      if (crown) this.trees.push({ s, x: it.x, y: it.y, crown });
      if (red) {
        const rs = new Sprite(red);
        rs.setPos(it.x, it.y);
        rs.mesh.renderOrder = ySort(it.y);
        R.sceneRed.add(rs.mesh);
      }
      progress(0.4 + 0.4 * (++k / place.length));
      if (k % 3 === 0) await nextFrame();
    }

    const gs = new Sprite(ground);
    gs.mesh.renderOrder = LAYER.ground;
    R.scenePig.add(gs.mesh);

    // The child
    const frames = buildChildFrames();
    const f0 = frames.pig.down.idle[0];
    const childPig = new Sprite(f0);
    const childRed = new Sprite(frames.red.down.idle[0]);
    R.scenePig.add(childPig.mesh);
    R.sceneRed.add(childRed.mesh);
    const cs = new Painter(1.2, 0.6, SPRITE_PPU, -0.6, -0.3);
    cs.glaze();
    shadow(cs, 0, 0, 0.42, 0.16, 0.35);
    const childShadow = new Sprite(cs);
    childShadow.mesh.renderOrder = LAYER.shadow;
    R.scenePig.add(childShadow.mesh);
    this.child = { pig: childPig, red: childRed, frames, facing: 'down', t: 0, x: -1, y: 1, moving: false };
    (this.child as unknown as { shadow: Sprite }).shadow = childShadow;

    // Thread trailing from the wrist
    const thread = new Painter(10, 2, SPRITE_PPU, -10, -1);
    thread.glaze();
    stroke(thread, [[-0.05, 0.42], [-1.5, 0.25], [-3.5, 0.32], [-6, 0.2], [-10, 0.35]], {
      width: 0.045, pig: INK, load: 1, dry: 0.15, taperStart: 0.02, taperEnd: 0.02, seed: 9, body: 1, press: 0,
    });
    const ts = new Sprite(thread);
    ts.mesh.renderOrder = LAYER.groundDetail;
    R.sceneRed.add(ts.mesh);
    (this.child as unknown as { thread: Sprite }).thread = ts;

    // Weather
    const drop = new Painter(0.3, 0.9, SPRITE_PPU, -0.15, -0.45);
    drop.glaze();
    stroke(drop, [[0.1, 0.4], [-0.1, -0.4]], { width: 0.018, load: 0.28, dry: 0.5, seed: 3, body: 0.3, taperStart: 0.4, taperEnd: 0.6, press: 0 });
    const dropF: Frame = frameFrom(drop);
    for (let i = 0; i < 90; i++) {
      const s = new Sprite(dropF, 'glaze');
      s.mesh.renderOrder = LAYER.weather;
      R.scenePig.add(s.mesh);
      this.rain.push({ s, x: 0, y: 0, vx: -2, vy: -14, life: 0, max: 1 });
      this.respawnDrop(this.rain[i], true);
    }
    const petalFrames: Frame[] = [];
    for (let i = 0; i < 4; i++) {
      const pp = new Painter(0.3, 0.3, SPRITE_PPU, -0.15, -0.15);
      pp.glaze();
      pp.dab(0, 0, 0.08 + i * 0.01, PIG_A, 0.9, 0.5);
      pp.circle(0.02, 0.01, 0.015, INK, 0.5);
      petalFrames.push(frameFrom(pp));
    }
    for (let i = 0; i < 40; i++) {
      const s = new Sprite(petalFrames[i % 4]);
      s.mesh.renderOrder = LAYER.weather;
      R.scenePig.add(s.mesh);
      const p = { s, x: 0, y: 0, vx: 1.5, vy: -0.4, life: 0, max: 1 };
      this.petals.push(p);
      this.respawnPetal(p, true);
    }
    R.setPalette(PALETTES.orchard);
    R.post.fog = 0.28;
    progress(1);
  }

  private respawnDrop(p: Particle, anywhere: boolean): void {
    const vw = this.r.viewW + 4, vh = this.r.viewH + 4;
    p.x = this.camX + this.rng.range(-vw / 2, vw / 2);
    p.y = this.camY + (anywhere ? this.rng.range(-vh / 2, vh / 2) : vh / 2);
    p.vx = -3.5;
    p.vy = -13;
    p.max = this.rng.range(0.3, 1.1);
    p.life = anywhere ? this.rng.range(0, p.max) : 0;
  }

  private respawnPetal(p: Particle, anywhere: boolean): void {
    const vw = this.r.viewW + 4, vh = this.r.viewH + 4;
    p.x = this.camX + (anywhere ? this.rng.range(-vw / 2, vw / 2) : -vw / 2);
    p.y = this.camY + this.rng.range(-vh / 2, vh / 2);
    p.vx = this.rng.range(1.2, 2.4);
    p.vy = this.rng.range(-0.6, 0.2);
    p.max = this.rng.range(6, 12);
    p.life = 0;
  }

  update(dt: number, time: number): void {
    const inp = this.input;
    const [mx, my] = inp.move();
    const c = this.child;
    c.moving = Math.hypot(mx, my) > 0.1;
    if (c.moving) {
      c.x += mx * 4.2 * dt;
      c.y += my * 4.2 * dt;
      if (Math.abs(mx) > Math.abs(my)) c.facing = 'side';
      else c.facing = my > 0 ? 'up' : 'down';
      const flip = mx < -0.1 ? -1 : mx > 0.1 ? 1 : c.pig.mesh.scale.x;
      c.pig.mesh.scale.x = c.facing === 'side' ? flip : 1;
      c.red.mesh.scale.x = c.pig.mesh.scale.x;
    }
    c.t += dt;
    const set = c.moving ? 'walk' : 'idle';
    const fr = c.frames.pig[c.facing][set];
    const idx = Math.floor(c.t * (c.moving ? 9 : 4)) % fr.length;
    c.pig.setTexture(fr[idx].tex);
    c.red.setTexture(c.frames.red[c.facing][set][idx].tex);
    c.pig.setPos(c.x, c.y);
    c.red.setPos(c.x, c.y);
    c.pig.mesh.renderOrder = ySort(c.y);
    c.red.mesh.renderOrder = ySort(c.y);
    const sh = (c as unknown as { shadow: Sprite }).shadow;
    sh.setPos(c.x, c.y);
    const th = (c as unknown as { thread: Sprite }).thread;
    th.setPos(c.x + (c.pig.mesh.scale.x < 0 ? -0.15 : 0.15), c.y);

    // camera follows
    this.camX += (c.x - this.camX) * Math.min(1, dt * 3);
    this.camY += (c.y - this.camY) * Math.min(1, dt * 3);

    // trees fade when the child is behind them
    for (const t of this.trees) {
      const dx = (c.x - (t.x + t.crown.x)) / t.crown.rx, dy = (c.y + 0.6 - (t.y + t.crown.y)) / t.crown.ry;
      const behind = c.y > t.y && dx * dx + dy * dy < 1.2;
      t.s.opacity += ((behind ? 0.45 : 1) - t.s.opacity) * Math.min(1, dt * 6);
    }

    for (const p of this.rain) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life > p.max) this.respawnDrop(p, false);
      p.s.setPos(p.x, p.y);
      p.s.opacity = Math.min(1, (p.max - p.life) * 4) * 0.7;
    }
    const gust = 0.7 + 0.6 * Math.sin(time * 0.5);
    for (const p of this.petals) {
      p.life += dt;
      p.x += p.vx * gust * dt;
      p.y += (p.vy + Math.sin(time * 2 + p.max) * 0.5) * dt;
      if (p.life > p.max || p.x > this.camX + this.r.viewW / 2 + 3) this.respawnPetal(p, false);
      p.s.setPos(p.x, p.y);
      p.s.mesh.rotation.z = time * 2 + p.max;
    }
    void THREE;
  }
}
