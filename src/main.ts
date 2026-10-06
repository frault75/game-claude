import { Renderer } from './core/renderer';
import { Input } from './core/input';
import { DebugOverlay } from './ui/debug';
import { Game } from './game/game';
import { sandbox } from './game/areas/sandbox';
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

function startAudio() {
  if (started) return;
  started = true;
  audio.start();
  ambience.rain(0.2);
  ambience.wind(0.12, 600);
}
window.addEventListener('pointerdown', startAudio, { once: false });
window.addEventListener('keydown', startAudio, { once: false });

if (debugMode) (window as unknown as Record<string, unknown>).__v = { game, input, renderer };

async function start() {
  loadingBar.style.width = '30%';
  await game.loadRoom(sandbox);
  loadingBar.style.width = '100%';
  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 900);
  game.hud.showHint(input.device === 'pad' ? t('hintPadMove') : `${t('hintMove')} · ${t('hintStrike')} · ${t('hintDodge')}`, 8);
  let last = performance.now();
  let time = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    input.pollPad();
    if (input.pressed('debug')) debug.toggle();
    if (debugMode) {
      if (input.keyPressed('KeyH')) { game.player.hp = 5; game.player.invuln = 99999; }
      if (input.keyPressed('KeyB')) renderer.boilEnabled = !renderer.boilEnabled;
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
    debug.set('thread', game.thread.debug);
    debug.set('ents', `${w.entities.length}  calls ${renderer.gl.info.render.calls}`);
    debug.set('res', `${renderer.pxW}x${renderer.pxH}`);
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
