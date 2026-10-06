import { Renderer, IS_MOBILE } from './core/renderer';
import { loadSettings } from './game/settings';
import { Input } from './core/input';
import { DebugOverlay } from './ui/debug';
import { Game } from './game/game';
import { arena } from './game/areas/arena';
import { overworld, prepareOverworld, shrineSpawn } from './game/areas/overworld';
import { dungeonRooms } from './game/areas/dungeons';
import { loadSave, resetSave, save, gainXp } from './game/progression';
import { SHRINES, ARENA } from './world/layout';
import { music } from './audio/music';
import { audio } from './audio/engine';
import { Ambience } from './audio/sfx';
import { t } from './i18n';
import { PALETTES } from './game/palettes';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const loading = document.getElementById('loading') as HTMLDivElement;
const loadingBar = document.getElementById('loading-bar') as HTMLElement;
const loadingText = document.getElementById('loading-text') as HTMLElement;
loadingText.textContent = t('loading');

const renderer = new Renderer(canvas);
const input = new Input(canvas);
const debug = new DebugOverlay();
window.addEventListener('resize', () => renderer.resize());
const params = new URLSearchParams(location.search);
const debugMode = params.has('debug');

const game = new Game(renderer, input);
const ambience = new Ambience();
let started = false;

if (IS_MOBILE) input.device = 'touch';
loadSettings();

function startAudio() {
  if (started) return;
  started = true;
  if (IS_MOBILE) {
    // landscape fullscreen where the browser allows it (not on iPhone Safari)
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
      const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
      const p = req?.() as Promise<void> | undefined;
      p?.then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {})).catch(() => {});
    } catch {
      /* not allowed */
    }
  }
  audio.start();
  ambience.rain(0.18);
  ambience.wind(0.14, 500);
  music.resume();
}
window.addEventListener('pointerdown', startAudio, { once: false });
window.addEventListener('keydown', startAudio, { once: false });

if (debugMode) (window as unknown as Record<string, unknown>).__v = { game, input, renderer };

async function start() {
  if (params.has('reset')) resetSave();
  else loadSave();
  // the child was made before the save was read
  game.player.hp = game.player.maxHp;
  game.player.ink = game.player.inkMax;
  game.player.pigment = Math.min(game.player.pigmentMax, save.pigment);
  await prepareOverworld((k) => (loadingBar.style.width = `${Math.round(k * 90)}%`));
  game.register([arena, overworld, ...dungeonRooms()]);
  const startRoom = params.get('room') ?? 'overworld';
  if (startRoom === 'overworld') await game.loadRoom(overworld, shrineSpawn(save.shrine));
  else await game.loadRoom(game.rooms.has(startRoom) ? startRoom : 'overworld');
  loadingBar.style.width = '100%';
  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 900);
  let last = performance.now();
  let time = 0;
  // adaptive resolution: if frames are slow, paint fewer pixels
  let perfT = 0, perfFrames = 0, perfSettle = 3;
  const frame = (now: number) => {
    // RAF timestamps can be slightly older than performance.now(): never let time run backwards.
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    time += dt;
    input.pollPad();
    input.tick();
    perfT += dt; perfFrames++;
    if (perfT > 2) {
      const avg = perfT / perfFrames;
      perfSettle--;
      if (perfSettle <= 0 && avg > 1 / 48 && renderer.renderScale > 0.5) {
        renderer.renderScale = Math.max(0.5, renderer.renderScale - 0.15);
        renderer.resize();
      }
      perfT = 0; perfFrames = 0;
    }
    if (input.pressed('debug')) debug.toggle();
    if (debugMode) {
      if (input.keyPressed('KeyH')) { game.player.hp = 5; game.player.invuln = 99999; }
      if (input.keyPressed('KeyB')) renderer.boilEnabled = !renderer.boilEnabled;
      if (input.keyPressed('KeyP')) {
        // teleport: shrines in turn, then the stone circle
        const spots = [...SHRINES.map((sh) => [sh.x, sh.y - 1.6]), [ARENA.x - ARENA.r + 2, ARENA.y]];
        const i = ((game as unknown as { _tp?: number })._tp ?? -1) + 1;
        (game as unknown as { _tp?: number })._tp = i % spots.length;
        const [x, y] = spots[i % spots.length];
        game.player.x = x; game.player.y = y; game.world.camX = x; game.world.camY = y;
      }
      if (input.keyPressed('KeyL')) gainXp(200);
      if (input.keyPressed('KeyU')) { for (const id of ['indigo', 'gold'] as const) if (!save.inks.includes(id)) save.inks.push(id); }
      if (input.keyPressed('KeyK')) {
        for (const e of game.world.entities) if ('maxHp' in e) { (e as unknown as { hp: number }).hp = 1; (e as unknown as { vulnerable: boolean }).vulnerable = true; }
      }
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
    if (!(window as unknown as { __pause?: boolean }).__pause) for (let i = 0; i < steps; i++) game.update(dt / steps);
    const [cx, cy] = game.world.cameraWithShake();
    renderer.render(time, cx, cy);
    const w = game.world;
    const p = game.player;
    debug.set('area', `${w.areaName} / ${w.roomName}`);
    debug.set('boss', w.bossState);
    debug.set('child', `${p.x.toFixed(1)}, ${p.y.toFixed(1)}  hp ${p.hp}  ${p.state}${p.reeling ? ' (reeling)' : ''}`);
    debug.set('ink', `${p.ink.toFixed(1)} ink · combo ${w.combo}${input.drawing ? ' · drawing' : ''}`);
    debug.set('ents', `${w.entities.length}  calls ${renderer.gl.info.render.calls}`);
    debug.set('res', `${renderer.pxW}x${renderer.pxH} scale ${renderer.renderScale.toFixed(2)}${IS_MOBILE ? ' mobile' : ''} · ${input.device}`);
    debug.frame(dt);
    input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

void PALETTES;
start().catch((e) => {
  loadingText.textContent = String(e);
  console.error(e);
});
