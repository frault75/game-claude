/** Owns the world, player, thread and HUD; loads rooms; handles death and respawn. */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { World } from './world';
import { Player } from './player';
import { Thread } from './thread';
import { Hud } from '../ui/hud';
import { RoomBuilder, RoomDef } from './room';
import { PALETTES } from './palettes';
import { V } from './physics';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export class Game {
  readonly world: World;
  readonly player: Player;
  readonly thread: Thread;
  readonly hud: Hud;
  room: RoomDef | null = null;
  private deathT = -1;
  private fade = 0;
  private fadeTarget = 0;
  private loading = false;

  constructor(readonly r: Renderer, readonly input: Input) {
    this.world = new World(r, input);
    this.player = new Player();
    this.thread = new Thread(this.world);
    this.world.thread = this.thread;
    this.world.player = this.player;
    this.world.add(this.player);
    this.hud = new Hud(r);
    this.player.onDeath = () => { this.deathT = 0; };
  }

  async loadRoom(def: RoomDef, spawn?: V): Promise<void> {
    this.loading = true;
    const w = this.world;
    this.thread.release(false);
    w.clearRoom([this.player]);
    w.bounds = { x: 0, y: 0, w: def.w, h: def.h };
    w.goalDir = def.goal;
    w.roomName = def.id;
    w.areaName = def.area;
    const b = new RoomBuilder(w, def);
    def.build(b);
    await nextFrame();
    b.finish();
    const pal = PALETTES[def.palette];
    this.r.setPalette(pal);
    Object.assign(this.r.post, { washed: 0, night: 0, fog: 0.2, fogScale: 0.12, fogDrift: [0.05, 0.02], vignette: 1 }, def.post ?? {});
    const [sx, sy] = spawn ?? def.spawn;
    this.player.x = sx;
    this.player.y = sy;
    this.player.lastSafe = [sx, sy];
    w.checkpoint = [sx, sy];
    w.camX = sx;
    w.camY = sy;
    w.clampCamera();
    this.room = def;
    this.loading = false;
  }

  update(dt: number): void {
    if (this.loading) return;
    const w = this.world;
    w.update(dt);
    this.hud.setHp(Math.max(0, this.player.hp));
    this.hud.update(dt);
    if (this.deathT >= 0) {
      this.deathT += dt;
      if (this.deathT > 1.3) this.fadeTarget = 1;
      if (this.deathT > 2.0) {
        const [cx, cy] = w.checkpoint;
        this.player.revive(cx, cy);
        this.thread.release(false);
        w.camX = cx; w.camY = cy;
        w.clampCamera();
        this.deathT = -1;
        this.fadeTarget = 0;
      }
    }
    this.fade += (this.fadeTarget - this.fade) * Math.min(1, dt * 5);
    this.r.post.fade = this.fade;
  }
}
