/** Owns the world, player and HUD; loads rooms; exits, death, ensō, combo, music, story. */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { World } from './world';
import { Player } from './player';
import { Hud } from '../ui/hud';
import { Story } from '../ui/story';
import { RoomBuilder, RoomDef } from './room';
import { PALETTES } from './palettes';
import { V, pointInPoly } from './physics';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { progress, saveProgress } from './progress';
import { Enso } from './stroke';
import { Sprite, Frame, LAYER } from '../gfx/sprite';
import { brushText } from '../gfx/text';
import { InkFx } from './inkfx';
import { Numbers } from './numbers';
import { save, xpToNext } from './progression';
import { INKS } from './inks';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export class Game {
  readonly world: World;
  readonly player: Player;
  readonly hud: Hud;
  readonly story: Story;
  readonly inkfx: InkFx;
  readonly numbers: Numbers;
  room: RoomDef | null = null;
  rooms = new Map<string, RoomDef>();
  flags = new Set<string>();
  private deathT = -1;
  private fade = 0;
  private fadeTarget = 0;
  private loading = false;
  private washTarget = 0;
  private washSpeed = 1;
  private timers: { t: number; fn: () => void }[] = [];
  private ensoWord: Frame | null = null;
  private words: { s: Sprite; t: number }[] = [];
  onRoomLoaded?: (def: RoomDef) => void;
  /** Room scripts can reset encounters on respawn. */
  onRespawn?: () => void;
  /** Fired for every ensō (room scripts use it for puzzles). */
  onEnso?: (e: Enso, hits: number) => void;
  ensoCount = 0;

  constructor(readonly r: Renderer, readonly input: Input) {
    this.world = new World(r, input);
    this.player = new Player();
    this.world.player = this.player;
    this.world.add(this.player);
    this.hud = new Hud(r);
    this.story = new Story(r);
    this.numbers = new Numbers(r);
    this.world.numbers = this.numbers;
    this.inkfx = new InkFx(this.world);
    this.inkfx.dmgMul = () => this.player.dmgMul;
    this.inkfx.onLanded = (n) => this.world.addCombo(n);
    this.player.onDeath = () => { this.deathT = 0; };
    this.input.uiRegions = [];
    // ink pots are buttons
    this.input.uiRegions.push({ x: 0, y: 0, r: 0, fn: () => {} });
    this.player.onLanded = (n) => this.world.addCombo(n);
    this.world.strokes.onEnso = (e) => this.enso(e);
  }

  after(seconds: number, fn: () => void): void {
    this.timers.push({ t: seconds, fn });
  }

  wait(seconds: number): Promise<void> {
    return new Promise((res) => this.after(seconds, res));
  }

  register(defs: RoomDef[]): void {
    for (const d of defs) this.rooms.set(d.id, d);
  }

  isRestored(area: string): boolean {
    return !!progress.restored[area];
  }

  restore(area: string, seconds = 5): void {
    progress.restored[area] = true;
    saveProgress();
    this.washTarget = 0;
    this.washSpeed = 1 / seconds;
  }

  /** A closed loop: everything inside bursts. */
  private enso(e: Enso): void {
    const w = this.world;
    const hits = this.inkfx.enso(e);
    void pointInPoly;
    this.ensoCount++;
    w.hitstop = Math.max(w.hitstop, hits ? 0.08 : 0.03);
    if (hits) w.slow(0.4, 0.15);
    w.punch(0.05 + Math.min(0.06, hits * 0.02));
    w.shake(hits ? 0.3 : 0.1, 0.3);
    sfx.enso(hits, e.area);
    if (hits) w.addCombo(hits * 2);
    if (e.ink === 'vermilion') for (let i = 0; i < 3; i++) w.vfx.splat(e.cx, e.cy + 0.3, (i / 3) * Math.PI * 2, 8, 1.2, 'red');
    void INKS;
    if (!this.ensoWord) this.ensoWord = brushText('ensō', { size: 0.9, ppu: 64, italic: true, weight: 700 });
    const s = new Sprite(this.ensoWord);
    s.setPos(e.cx, e.cy + 0.6);
    s.mesh.renderOrder = LAYER.canopy + 50;
    s.reveal = 0;
    this.r.scenePig.add(s.mesh);
    this.words.push({ s, t: 0 });
    this.onEnso?.(e, hits);
  }

  async loadRoom(def: RoomDef | string, spawn?: V): Promise<void> {
    if (typeof def === 'string') {
      const d = this.rooms.get(def);
      if (!d) throw new Error('unknown room ' + def);
      def = d;
    }
    this.loading = true;
    const w = this.world;
    w.clearRoom([this.player]);
    w.bounds = { x: 0, y: 0, w: def.w, h: def.h };
    w.goalDir = def.goal;
    w.roomName = def.id;
    w.areaName = def.area;
    w.bossState = 'none';
    w.combo = 0;
    this.hud.hideBoss();
    this.onRespawn = undefined;
    this.onEnso = undefined;
    for (const wd of this.words) wd.s.dispose();
    this.words = [];
    w.strokes.reset();
    const b = new RoomBuilder(w, def, this);
    def.build(b);
    await nextFrame();
    b.finish();
    this.r.setPalette(PALETTES[def.palette]);
    const washed = this.isRestored(def.area) ? 0 : 1;
    this.washTarget = def.post?.washed ?? washed;
    Object.assign(this.r.post, { washed: this.washTarget, night: 0, fog: 0.2, fogScale: 0.12, fogDrift: [0.05, 0.02], vignette: 1 }, def.post ?? {});
    const [sx, sy] = spawn ?? def.spawn;
    this.player.x = sx;
    this.player.y = sy;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.lastSafe = [sx, sy];
    w.checkpoint = [sx, sy];
    w.camX = sx;
    w.camY = sy;
    w.clampCamera();
    this.room = def;
    progress.room = def.id;
    progress.spawn = [sx, sy];
    saveProgress();
    music.play(def.music ?? def.area);
    music.boss = 0;
    this.loading = false;
    this.onRoomLoaded?.(def);
  }

  async travel(to: string, spawn: V): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.fadeTarget = 1;
    this.player.locked = true;
    await new Promise((r) => setTimeout(r, 450));
    this.timers = [];
    this.story.clear();
    await this.loadRoom(to, spawn);
    this.player.locked = false;
    this.fadeTarget = 0;
  }

  hintOnce(key: string, text: string, dur = 6): void {
    if (this.flags.has(key)) return;
    this.flags.add(key);
    this.hud.showHint(text, dur);
  }

  update(dt: number): void {
    this.story.update(dt);
    if (this.timers.length) {
      for (const tm of this.timers) tm.t -= dt;
      const due = this.timers.filter((tm) => tm.t <= 0);
      this.timers = this.timers.filter((tm) => tm.t > 0);
      for (const tm of due) tm.fn();
    }
    this.fade += (this.fadeTarget - this.fade) * Math.min(1, dt * 6);
    this.r.post.fade = this.fade;
    const p = this.r.post;
    if (p.washed !== this.washTarget) {
      const d = this.washTarget - p.washed;
      const step = this.washSpeed * dt;
      p.washed = Math.abs(d) < step ? this.washTarget : p.washed + Math.sign(d) * step;
    }
    for (const wd of this.words) {
      wd.t += dt;
      wd.s.reveal = Math.min(1.5, wd.t * 4);
      wd.s.setPos(wd.s.mesh.position.x, wd.s.mesh.position.y + dt * 0.4);
      wd.s.opacity = Math.max(0, 1 - Math.max(0, wd.t - 0.7) / 0.5);
      if (wd.t > 1.2) wd.s.dispose();
    }
    this.words = this.words.filter((wd) => wd.t <= 1.2);
    if (this.loading) return;
    const w = this.world;
    w.update(dt);
    this.inkfx.update(dt * w.timeScale);
    this.numbers.update(dt);
    this.r.post.flash = w.flash;
    this.hud.setHp(Math.max(0, this.player.hp), this.player.maxHp);
    this.hud.setXp(save.xp / xpToNext(save.level), save.level);
    this.hud.setInks(save.inks, save.ink);
    // ink pots are touch/click targets
    this.input.uiRegions = this.hud.potRegions.map((p) => ({ x: p.x, y: p.y, r: p.r, fn: () => this.player.selectInk(p.id) }));
    this.hud.setInk(this.player.inkFrac);
    this.hud.setCombo(w.combo, Math.max(0, w.comboT / 2.4));
    this.hud.update(dt);
    if (this.room?.exits && this.player.state !== 'dead') {
      const pl = this.player;
      for (const e of this.room.exits) {
        if (pl.x >= e.x && pl.x <= e.x + e.w && pl.y >= e.y && pl.y <= e.y + e.h && (!e.open || e.open())) {
          void this.travel(e.to, e.spawn);
          break;
        }
      }
    }
    if (this.deathT >= 0) {
      this.deathT += dt;
      if (this.deathT > 1.2) this.fadeTarget = 1;
      if (this.deathT > 1.8) {
        const [cx, cy] = w.checkpoint;
        this.player.revive(cx, cy);
        w.camX = cx; w.camY = cy;
        w.clampCamera();
        this.deathT = -1;
        this.fadeTarget = 0;
        this.onRespawn?.();
      }
    }
  }
}
