import { Renderer } from './core/renderer';
import { Input } from './core/input';
import { DebugOverlay } from './ui/debug';
import { TestScene } from './scenes/testScene';
import { PALETTES } from './game/palettes';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const loading = document.getElementById('loading') as HTMLDivElement;
const loadingBar = document.getElementById('loading-bar') as HTMLElement;
const loadingText = document.getElementById('loading-text') as HTMLElement;
const fr = (navigator.language || 'fr').toLowerCase().startsWith('fr');
loadingText.textContent = fr ? 'On broie l’encre…' : 'Grinding the ink…';

const renderer = new Renderer(canvas);
const input = new Input(canvas);
const debug = new DebugOverlay();
window.addEventListener('resize', () => renderer.resize());

const scene = new TestScene(renderer, input);
const paletteKeys: Record<string, string> = { Digit1: 'orchard', Digit2: 'river', Digit3: 'hills', Digit4: 'studio', Digit5: 'blank' };

async function start() {
  await scene.build((t) => (loadingBar.style.width = `${Math.round(t * 100)}%`));
  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 900);
  let last = performance.now();
  let time = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    input.pollPad();
    if (input.pressed('debug')) debug.toggle();
    for (const [code, name] of Object.entries(paletteKeys)) {
      if (input.keyPressed(code)) {
        scene.paletteName = name;
        renderer.setPalette(PALETTES[name]);
        renderer.post.night = name === 'hills' ? 0.35 : 0;
      }
    }
    if (input.keyPressed('KeyB')) renderer.boilEnabled = !renderer.boilEnabled;
    if (input.keyPressed('KeyG')) renderer.post.washed = renderer.post.washed > 0.5 ? 0 : 1;
    const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
    for (let i = 0; i < steps; i++) scene.update(dt / steps, time);
    renderer.render(time, scene.camX, scene.camY);
    debug.set('area', `test scene — palette ${scene.paletteName}`);
    debug.set('boss', 'none');
    debug.set('calls', `${renderer.gl.info.render.calls}`);
    debug.set('res', `${renderer.pxW}x${renderer.pxH}`);
    debug.set('keys', '1-5 palette · B boil · G washed');
    debug.frame(dt);
    input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start().catch((e) => {
  loadingText.textContent = String(e);
  console.error(e);
});
