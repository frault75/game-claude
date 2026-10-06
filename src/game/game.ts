/** Owns the world, player and HUD; loads rooms; exits, death, ensō, combo, music, story. */
import type { Renderer } from '../core/renderer';
import { Title } from '../ui/title';
import { Cinematic } from '../ui/cinematic';
import { Menu, MenuTab } from '../ui/menu';
import { settings } from './settings';
import { REGIONS, regionAt } from '../world/layout';
import { MapSource, reveal, flushFog } from '../ui/mapArt';
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
import { save, xpToNext, gear } from './progression';
import { INKS } from './inks';
import { Dialog, Speaker } from '../ui/dialog';
import { Inventory } from '../ui/inventory';
import { eff, rank, pointsLeft, cooldownOf, SkillId } from './skills';
import { Tree } from '../ui/tree';
import { useSkill } from './actives';
import { questLine } from './quests';
import { L, UI } from '../i18n/lore';
import { lang } from '../i18n';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export class Game {
  readonly world: World;
  readonly player: Player;
  readonly hud: Hud;
  readonly story: Story;
  readonly inkfx: InkFx;
  readonly numbers: Numbers;
  readonly dialog: Dialog;
  readonly inventory: Inventory;
  readonly tree: Tree;
  readonly menu: Menu;
  readonly title: Title;
  readonly cine: Cinematic;
  private titleT = 0;
  private titleCam: V = [0, 0];
  /** Radius of the child's lamp in dark places. */
  lampRadius = 6.5;
  private pigmentHintT = 0;
  room: RoomDef | null = null;
  rooms = new Map<string, RoomDef>();
  flags = new Set<string>();
  private deathT = -1;
  private fade = 0;
  private fadeTarget = 0;
  private loading = false;
  /** Exits wake up only once the child has stepped away from where they arrived (no stair ping-pong). */
  private exitsArmed = true;
  /** Where the story wants the child to go (world units), if anywhere. */
  objective: V | null = null;
  /** The current place as a map, and when its fog was last saved. */
  mapSrc: MapSource | null = null;
  private fogT = 0;
  private fogSaveT = 0;
  /** "E" over whoever can be talked to, on a keyboard. */
  private keyPrompt: Sprite | null = null;
  private arrivedAt: V = [0, 0];
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
    this.dialog = new Dialog(r, input);
    this.inventory = new Inventory(r, input);
    this.inventory.onChange = () => {
      const p = this.player;
      p.hp = Math.min(p.hp, p.maxHp);
      p.ink = Math.min(p.ink, p.inkMax);
      p.pigment = Math.min(p.pigment, p.pigmentMax);
    };
    this.tree = new Tree(r, input);
    this.tree.onChange = () => this.inventory.onChange?.();
    this.title = new Title(r, input);
    this.cine = new Cinematic(r, input);
    this.menu = new Menu(r, input);
    this.menu.onBag = () => { this.menu.close(); this.inventory.open(); };
    this.menu.onTree = () => { this.menu.close(); this.tree.open(); };
    this.menu.device = () => this.input.device;
    const toTab = (id: MenuTab) => (id === 'bag' ? this.inventory.open() : id === 'tree' ? this.tree.open() : this.menu.open(id));
    this.inventory.onTab = toTab;
    this.tree.onTab = toTab;
    this.menu.view = () => ({ src: this.mapSrc, px: this.player.x, py: this.player.y, dir: Math.atan2(this.player.aim[1], this.player.aim[0]), goal: this.objective, place: this.placeName() });
    this.inventory.onGrind = (pig, name) => {
      const p = this.player;
      p.pigment = Math.min(p.pigmentMax, p.pigment + pig);
      this.hud.showHint(`${name} — ${lang === 'fr' ? 'broyé en pigment' : 'ground into pigment'} (+${pig})`, 2.5);
    };
    this.player.pigment = save.pigment;
    this.player.onNoPigment = () => {
      if (this.pigmentHintT > 0) return;
      this.pigmentHintT = 8;
      this.hud.showHint(L(UI.pigmentOut), 4);
    };
    this.world.numbers = this.numbers;
    this.inkfx = new InkFx(this.world);
    this.inkfx.roll = (base) => this.player.roll(base);
    this.inkfx.ensoMul = () => 1 + gear().enso / 100;
    this.inkfx.redMul = () => 1 + eff('redEnso') / 100;
    this.inkfx.frostMul = () => 1 + eff('frost') / 100;
    this.inkfx.chain = () => rank('chain');
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
    Object.assign(this.r.post, { washed: this.washTarget, night: 0, fog: 0.2, fogScale: 0.12, fogDrift: [0.05, 0.02], vignette: 1, gloom: 0 }, def.post ?? {});
    const [sx, sy] = spawn ?? def.spawn;
    this.player.x = sx;
    this.player.y = sy;
    this.player.vx = 0;
    this.player.vy = 0;
    // orders given in the previous room mean nothing here
    this.player.moveTarget = null;
    this.player.attackTarget = null;
    this.player.talkTarget = null;
    this.player.lastSafe = [sx, sy];
    this.exitsArmed = false;
    this.arrivedAt = [sx, sy];
    this.input.newPlace();
    this.player.dropBrush();
    w.checkpoint = [sx, sy];
    w.camX = sx;
    w.camY = sy;
    w.clampCamera();
    this.room = def;
    this.objective = null;
    flushFog();
    this.mapSrc = def.map?.(this) ?? null;
    if (this.mapSrc) reveal(this.mapSrc, sx, sy);
    progress.room = def.id;
    progress.spawn = [sx, sy];
    saveProgress();
    music.play(def.music ?? def.area);
    music.boss = 0;
    this.loading = false;
    this.onRoomLoaded?.(def);
  }

  /** Use the active skill in a slot, if it is ready. */
  useSlot(k: number): void {
    const id = save.slots[k] as SkillId | null;
    if (!id || this.dialog.active || this.inventory.active || this.tree.active || this.menu.active) return;
    const p = this.player;
    if ((p.cool[id] ?? 0) > 0) { sfx.empty(); return; }
    if (useSkill(this, id)) p.cool[id] = cooldownOf(id);
  }

  /** What the map calls the current place. */
  placeName(): string {
    const id = this.room?.id ?? '';
    const m = /^(cave|temple)(\d)$/.exec(id);
    if (m) return `${L(m[1] === 'cave' ? UI.enterCave : UI.enterTemple)} · ${L(UI.floor)} ${m[2]}`;
    if (id === 'overworld') return REGIONS[regionAt(this.player.x, this.player.y)]?.name[lang] ?? '';
    return '';
  }

  /** On a keyboard, a small "E" floats over whoever is close enough to talk to. */
  private showKeyPrompt(): void {
    const pl = this.player;
    const near = this.input.device !== 'touch' && pl.state !== 'dead' && !pl.busy ? pl.nearestTalkable() : null;
    if (!near) {
      if (this.keyPrompt) this.keyPrompt.opacity = 0;
      return;
    }
    if (!this.keyPrompt) {
      this.keyPrompt = new Sprite(brushText('E', { size: 0.46, ppu: 90, weight: 700 }));
      this.keyPrompt.mesh.renderOrder = LAYER.weather + 22;
    }
    if (!this.keyPrompt.mesh.parent) this.r.scenePig.add(this.keyPrompt.mesh);
    this.keyPrompt.setPos(near.x, near.y + near.promptH + Math.sin(this.world.time * 4) * 0.05);
    this.keyPrompt.opacity = 1;
  }

  /** Draw the thumb stick where the thumb is. */
  private showStick(): void {
    const st = this.input.stick;
    if (!st || !st.live) { this.hud.setStick(null); return; }
    const [bx, by] = this.input.toUi(st.ox, st.oy);
    const [kx0, ky0] = this.input.toUi(st.x, st.y);
    const r = (this.r.uiH / window.innerHeight) * 56;
    const dx = kx0 - bx, dy = ky0 - by, d = Math.hypot(dx, dy);
    const k = d > r ? r / d : 1;
    this.hud.setStick({ bx, by, kx: bx + dx * k, ky: by + dy * k, r });
  }

  /** Open a dialogue; the world holds still until it closes. */
  talk(speaker: Speaker, pages: string[], onClose?: () => void): void {
    this.player.attackTarget = null;
    this.player.moveTarget = null;
    this.player.vx = 0;
    this.player.vy = 0;
    this.dialog.open(speaker, pages, onClose);
  }

  async travel(to: string, spawn?: V): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.fadeTarget = 1;
    this.player.locked = true;
    await new Promise((r) => setTimeout(r, 450));
    this.timers = [];
    this.story.clear();
    this.dialog.close(false);
    this.inventory.close();
    this.tree.close();
    this.menu.close();
    await this.loadRoom(to, spawn);
    this.player.locked = false;
    this.fadeTarget = 0;
  }

  hintOnce(key: string, text: string, dur = 6): void {
    if (this.flags.has(key)) return;
    this.flags.add(key);
    this.hud.showHint(text, dur);
  }

  /** Show the title over the living world (the child waits, hidden). */
  showTitle(hasSave: boolean): void {
    this.title.open(hasSave);
    this.titleT = 0;
    this.titleCam = [this.player.x, this.player.y];
    this.player.hidden = true;
    this.player.locked = true;
  }

  /** Back to play after the title or the intro. */
  endTitle(): void {
    if (this.title.active) this.title.close();
    this.player.hidden = false;
    this.player.locked = false;
    this.input.swallow();
  }

  update(dt: number): void {
    // the title and cinematics take the whole screen
    if (this.title.active || this.cine.active) {
      this.player.locked = true;
      this.player.hidden = true;
      this.hud.visible = false;
      this.hud.panelOpen = true;
      this.story.hidden = true;
      this.input.uiMode = true;
      this.input.uiRegions = [];
      this.hud.setMinimap(null, false, 0, 0, 0, null, dt);
      if (this.cine.active) this.cine.update(dt);
      else if (!this.loading) {
        const w = this.world;
        w.update(dt);
        this.titleT += dt;
        w.camX = this.titleCam[0] + Math.sin(this.titleT * 0.05) * 16;
        w.camY = this.titleCam[1] + 4 + Math.sin(this.titleT * 0.037) * 6;
        w.clampCamera();
        this.title.update(dt);
      } else this.title.update(dt);
      this.hud.update(dt);
      return;
    }
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
    this.dialog.update(dt);
    const invWas = this.inventory.active, treeWas = this.tree.active, menuWas = this.menu.active;
    this.inventory.update(dt);
    this.tree.update();
    this.menu.update();
    if (this.loading) return;
    const free = !this.dialog.active && !invWas && !treeWas && !menuWas && this.player.state !== 'dead';
    if (free && this.input.keyPressed('KeyI')) this.inventory.open();
    if (free && this.input.keyPressed('KeyC')) this.tree.open();
    if (free && this.input.keyPressed('KeyM')) this.menu.open('map');
    if (free && this.input.keyPressed('KeyJ')) this.menu.open('journal');
    if (free && this.input.pressed('back') && !this.inventory.active && !this.tree.active && !this.menu.active) this.menu.open();
    if (free && !this.inventory.active && !this.tree.active && !this.menu.active) {
      (['KeyR', 'KeyT', 'KeyG'] as const).forEach((k, i) => { if (this.input.keyPressed(k)) this.useSlot(i); });
    }
    const w = this.world;
    this.pigmentHintT -= dt;
    save.pigment = this.player.pigment;
    this.r.post.lamp = [this.player.x, this.player.y + 0.5, this.lampRadius];
    this.hud.setQuest(...questLine());
    // the music hears how close the child is to falling
    const pl = this.player;
    music.danger = pl.state === 'dead' ? 0 : pl.hp <= 1 ? 1 : pl.hp / pl.maxHp <= 0.34 ? 0.6 : 0;
    this.hud.backdrop = this.story.backdrop = Math.min(1, this.r.post.gloom * 1.5);
    this.hud.bagNew = save.newItems;
    this.hud.treeNew = pointsLeft() > 0;
    this.hud.setSkills(save.slots, save.slots.map((id) => (id ? (this.player.cool[id as SkillId] ?? 0) / Math.max(0.1, cooldownOf(id as SkillId)) : 0)), this.input.device !== 'touch');
    const sheetOpen = this.inventory.active || this.tree.active || this.menu.active;
    this.input.uiMode = this.dialog.active || sheetOpen;
    // coloured HUD pieces would show through a panel: step aside
    this.hud.visible = !sheetOpen;
    this.story.hidden = sheetOpen;
    this.hud.panelOpen = this.dialog.active || sheetOpen;
    this.hud.setMinimap(this.mapSrc, settings.minimap, this.player.x, this.player.y, Math.atan2(this.player.aim[1], this.player.aim[0]), this.objective, dt);
    if (this.dialog.active || sheetOpen) {
      this.input.uiRegions = [];
      if (this.keyPrompt) this.keyPrompt.opacity = 0;
      // the world holds its breath while someone speaks
      w.updateCamera(dt);
      this.hud.update(dt);
      return;
    }
    w.update(dt);
    this.showKeyPrompt();
    // the fog lifts where the child walks
    if (this.mapSrc && (this.fogT -= dt) <= 0) {
      this.fogT = 0.25;
      reveal(this.mapSrc, this.player.x, this.player.y);
    }
    if ((this.fogSaveT -= dt) <= 0) { this.fogSaveT = 4; flushFog(); }
    this.inkfx.update(dt * w.timeScale);
    this.numbers.update(dt);
    this.r.post.flash = w.flash;
    this.hud.setHp(Math.max(0, this.player.hp), this.player.maxHp);
    this.hud.setXp(save.xp / xpToNext(save.level), save.level);
    this.hud.setInks(save.inks, save.ink);
    // ink pots are touch/click targets
    this.input.uiRegions = this.hud.potRegions.map((p) => ({ x: p.x, y: p.y, r: p.r, fn: () => this.player.selectInk(p.id) }));
    const bg = this.hud.bagRegion;
    if (bg.r > 0) this.input.uiRegions.push({ x: bg.x, y: bg.y, r: bg.r, fn: () => this.inventory.open() });
    const tr = this.hud.treeRegion;
    if (tr.r > 0) this.input.uiRegions.push({ x: tr.x, y: tr.y, r: tr.r, fn: () => this.tree.open() });
    const mn = this.hud.menuRegion;
    if (mn.r > 0) this.input.uiRegions.push({ x: mn.x, y: mn.y, r: mn.r, fn: () => this.menu.open() });
    const mm = this.hud.miniRegion;
    if (mm.r > 0) this.input.uiRegions.push({ x: mm.x, y: mm.y, r: mm.r, fn: () => this.menu.open('map') });
    for (const sk of this.hud.skillRegions) this.input.uiRegions.push({ x: sk.x, y: sk.y, r: sk.r, fn: () => this.useSlot(sk.slot) });
    this.hud.setInk(INKS[save.ink].runs ? this.player.inkFrac : this.player.pigmentFrac);
    this.showStick();
    this.hud.setCombo(w.combo, Math.max(0, w.comboT / 2.4));
    this.hud.update(dt);
    if (this.room?.exits && this.player.state !== 'dead') {
      const pl = this.player;
      const inside = this.room.exits.find((e) => pl.x >= e.x && pl.x <= e.x + e.w && pl.y >= e.y && pl.y <= e.y + e.h);
      if (!this.exitsArmed) {
        const [mx, my] = this.input.move();
        const away = Math.hypot(pl.x - this.arrivedAt[0], pl.y - this.arrivedAt[1]) > 2.5;
        if (!inside && (away || (mx === 0 && my === 0 && !pl.moveTarget))) this.exitsArmed = true;
      } else if (inside && (!inside.open || inside.open())) void this.travel(inside.to, inside.spawn);
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
