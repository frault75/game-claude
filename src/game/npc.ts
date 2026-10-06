/** Villagers and readable things: tap them (or press F nearby) to talk or read. */
import { Entity } from './entity';
import type { World } from './world';
import { Sprite, Frame, frameFrom, ySort, LAYER } from '../gfx/sprite';
import { Painter, INK, VERMILION, mixPig, PIG_B } from '../gfx/paint';
import { shadow } from '../gfx/gen/ground';
import { SPRITE_PPU } from '../gfx/gen/flora';
import { buildVillagerFrames, VillagerFrames, VillagerLook } from '../gfx/gen/villager';
import { brushText } from '../gfx/text';
import { stroke } from '../gfx/brush';
import { washPoly, roughen, noisyOutline } from '../gfx/wash';
import { Rng } from '../gfx/rng';

const lookCache = new Map<number, VillagerFrames>();
let markerFrames: { quest: Frame; talk: Frame } | null = null;
let shadowFrame: Frame | null = null;

function markers(): { quest: Frame; talk: Frame } {
  if (markerFrames) return markerFrames;
  // a vermilion seal with a white stroke: something to say about the quest
  const q = new Painter(0.7, 0.9, SPRITE_PPU, -0.35, -0.1);
  q.glaze();
  washPoly(q, roughen([[-0.2, 0.2], [0.2, 0.2], [0.2, 0.62], [-0.2, 0.62]], 0.02, 11, 0.05), { pig: VERMILION, density: 0.95, soft: 0.05, edge: 0.5, seed: 11 });
  q.lift();
  stroke(q, [[0, 0.56], [0.01, 0.36]], { width: 0.07, load: 1, seed: 12, taperStart: 0.05, taperEnd: 0.4 });
  q.circle(0.01, 0.27, 0.04, VERMILION, 1);
  q.glaze();
  // a small ink drop: just a chat
  const t = new Painter(0.7, 0.9, SPRITE_PPU, -0.35, -0.1);
  t.glaze();
  stroke(t, [[-0.12, 0.35], [0, 0.3], [0.12, 0.35]], { width: 0.05, load: 0.7, dry: 0.4, seed: 13 });
  markerFrames = { quest: frameFrom(q), talk: frameFrom(t) };
  return markerFrames;
}

export class Npc extends Entity {
  frames!: VillagerFrames;
  private pig!: Sprite;
  private red!: Sprite;
  private shadowS!: Sprite;
  private nameS: Sprite | null = null;
  private markS: Sprite;
  private markRed: Sprite;
  private animT = Math.random() * 3;
  private wanderT = 0;
  private goal: [number, number] | null = null;
  private home: [number, number];
  private side = false;
  private flipX = 1;
  /** 'quest' shows the vermilion seal above the head. */
  marker: 'none' | 'quest' = 'none';
  onTalk?: () => void;

  constructor(readonly id: string, readonly displayName: string, readonly look: VillagerLook, x: number, y: number, private wander = 0) {
    super();
    this.x = x; this.y = y;
    this.home = [x, y];
    this.radius = 0.35;
    this.solid = true;
    this.weight = Infinity;
    this.interactive = true;
    this.label = 'npc';
    const m = markers();
    this.markS = new Sprite(m.talk);
    this.markRed = new Sprite(m.quest);
  }

  init(w: World): void {
    let f = lookCache.get(this.look.seed);
    if (!f) { f = buildVillagerFrames(this.look); lookCache.set(this.look.seed, f); }
    this.frames = f;
    this.pig = this.addSprite(new Sprite(f.down[0].pig));
    this.red = this.addSprite(new Sprite(f.down[0].red), true);
    if (!shadowFrame) {
      const sp = new Painter(1.4, 0.7, SPRITE_PPU, -0.7, -0.35);
      sp.glaze();
      shadow(sp, 0, 0, 0.5, 0.18, 0.32);
      shadowFrame = frameFrom(sp);
    }
    this.shadowS = this.addSprite(new Sprite(shadowFrame));
    this.shadowS.mesh.renderOrder = LAYER.shadow;
    // above the rain and the tree crowns
    this.markS.mesh.renderOrder = LAYER.weather + 20;
    this.markRed.mesh.renderOrder = LAYER.weather + 20;
    w.r.scenePig.add(this.markS.mesh);
    w.r.sceneRed.add(this.markRed.mesh);
    this.sprites.push(this.markS, this.markRed);
  }

  interact(): void {
    const p = this.world.player;
    this.side = Math.abs(p.x - this.x) > Math.abs(p.y - this.y);
    this.flipX = p.x < this.x ? -1 : 1;
    this.goal = null;
    this.wanderT = 3;
    this.onTalk?.();
  }

  /** Portrait for the dialogue panel. */
  portrait(): { pig: Frame; red: Frame; scale: number } {
    return { pig: this.frames.down[0].pig, red: this.frames.down[0].red, scale: 112 * this.look.scale };
  }

  update(dt: number): void {
    const w = this.world;
    const p = w.player;
    this.animT += dt;
    const near = Math.hypot(p.x - this.x, p.y - this.y);
    // wanderers stroll around home; everyone stops to look at the child when it comes close
    let moving = false;
    if (this.wander > 0 && near > 3) {
      this.wanderT -= dt;
      if (!this.goal && this.wanderT <= 0) {
        const r = new Rng(Math.floor(w.time * 10) + this.look.seed);
        const a = r.range(0, Math.PI * 2), d = r.range(0.5, this.wander);
        this.goal = [this.home[0] + Math.cos(a) * d, this.home[1] + Math.sin(a) * d * 0.7];
      }
      if (this.goal) {
        const dx = this.goal[0] - this.x, dy = this.goal[1] - this.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.15) { this.goal = null; this.wanderT = 1.5 + Math.random() * 3; }
        else {
          const sp = this.look.scale < 1 ? 3.2 : 1.4;
          const ox = this.x, oy = this.y;
          w.move(this, (dx / d) * sp * dt, (dy / d) * sp * dt);
          if (Math.hypot(this.x - ox, this.y - oy) < sp * dt * 0.2) { this.goal = null; this.wanderT = 1; }
          moving = true;
          this.side = true;
          this.flipX = dx < 0 ? -1 : 1;
        }
      }
    } else if (near < 3) {
      this.goal = null;
      this.side = Math.abs(p.x - this.x) > Math.abs(p.y - this.y) * 1.2;
      this.flipX = p.x < this.x ? -1 : 1;
    }
    let fr: { pig: Frame; red: Frame };
    if (this.side) {
      const set = this.frames.side;
      fr = moving ? set[Math.floor(this.animT * 7) % set.length] : set[1];
    } else fr = this.frames.down[Math.floor(this.animT * 1.6) % 2];
    this.pig.setTexture(fr.pig.tex);
    this.red.setTexture(fr.red.tex);
    const sc = this.look.scale;
    for (const s of [this.pig, this.red]) {
      s.setPos(this.x, this.y);
      s.mesh.scale.set((this.side ? this.flipX : 1) * sc, sc, 1);
      s.mesh.renderOrder = ySort(this.y);
    }
    this.shadowS.setPos(this.x, this.y);
    this.shadowS.mesh.scale.set(sc, sc, 1);
    // name when close, quest seal above the head
    const top = this.y + this.frames.height + 0.2;
    if (near < 5.5 && !this.nameS) {
      this.nameS = new Sprite(brushText(this.displayName, { size: 0.32, ppu: 90, italic: true, weight: 600 }));
      this.nameS.mesh.renderOrder = LAYER.weather + 21;
      w.r.scenePig.add(this.nameS.mesh);
    }
    if (this.nameS) {
      const a = Math.max(0, Math.min(1, (5.5 - near) / 1.5));
      this.nameS.opacity = a;
      this.nameS.setPos(this.x, top + (this.marker === 'quest' ? 0.85 : 0.25));
      if (a <= 0) { this.nameS.dispose(); this.nameS = null; }
    }
    const bob = Math.sin(this.animT * 3) * 0.06;
    this.markRed.setPos(this.x, top + bob);
    this.markRed.opacity = this.marker === 'quest' ? 1 : 0;
    this.markS.setPos(this.x, top + bob);
    this.markS.opacity = this.marker === 'none' && near < 5.5 ? 0.5 : 0;
  }

  dispose(): void {
    super.dispose();
    this.nameS?.dispose();
    this.nameS = null;
  }
}

let steleArt: Frame[] = [];

/** A carved stone with a page of the master's notebook. */
export class Stele extends Entity {
  onRead?: () => void;
  read = false;
  private glow = 0;
  constructor(readonly index: number, x: number, y: number) {
    super();
    this.x = x; this.y = y;
    this.radius = 0.45;
    this.solid = true;
    this.weight = Infinity;
    this.interactive = true;
    this.label = 'stele';
  }
  init(_w: World): void {
    if (!steleArt.length) {
      for (let k = 0; k < 3; k++) {
        const p = new Painter(1.6, 2.6, SPRITE_PPU, -0.8, -0.3);
        const r = new Rng(900 + k);
        const body: [number, number][] = [[-0.32, 0], [0.32, 0], [0.3, 1.5 + k * 0.1], [0.12, 1.72 + k * 0.1], [-0.14, 1.7 + k * 0.1], [-0.3, 1.48 + k * 0.1]];
        const rb = roughen(body, 0.025, 900 + k, 0.08);
        p.reserve(() => rb.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 1);
        p.glaze();
        washPoly(p, rb, { pig: mixPig(INK, PIG_B, 0.25), density: 0.24, soft: 0.05, edge: 0.8, seed: 901 + k, blooms: 1 });
        stroke(p, rb.slice(0, Math.floor(rb.length * 0.55)), { width: 0.05, load: 0.9, dry: 0.5, seed: 902 + k, taperStart: 0.05, taperEnd: 0.2 });
        // carved columns of characters
        for (let c = 0; c < 3; c++) {
          const cx = -0.14 + c * 0.14;
          for (let j = 0; j < 6; j++) {
            const y = 1.35 - j * 0.2;
            stroke(p, [[cx - 0.04, y], [cx + r.gauss() * 0.03, y - 0.06], [cx + 0.04, y - 0.1]], { width: 0.025, load: r.range(0.5, 0.9), dry: 0.4, seed: r.int(1, 1e6), body: 0.3 });
          }
        }
        washPoly(p, noisyOutline(0, 0.02, 0.5, 0.12, 0.2, 905 + k), { pig: INK, density: 0.12, soft: 0.4, seed: 905 + k });
        steleArt.push(frameFrom(p));
      }
    }
    const s = this.addSprite(new Sprite(steleArt[this.index % steleArt.length]));
    s.setPos(this.x, this.y);
    s.mesh.renderOrder = ySort(this.y);
  }
  interact(): void {
    this.onRead?.();
  }
  update(dt: number): void {
    // unread steles shimmer faintly
    this.glow += dt;
    if (!this.read && Math.sin(this.glow * 2) > 0.6) this.world.vfx.glowAt(this.x, this.y + 1, 1.2, 0.25);
  }
}

export { INK };
