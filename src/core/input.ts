/**
 * Keyboard (physical key codes, so ZQSD and WASD both work), mouse and gamepad,
 * merged into a small set of actions.
 */
export type Action = 'attack' | 'thread' | 'release' | 'dodge' | 'interact' | 'pause' | 'debug' | 'confirm' | 'back' | 'up' | 'down' | 'left' | 'right';

const KEYMAP: Record<string, Action[]> = {
  KeyW: ['up'], ArrowUp: ['up'],
  KeyS: ['down'], ArrowDown: ['down'],
  KeyA: ['left'], ArrowLeft: ['left'],
  KeyD: ['right'], ArrowRight: ['right'],
  Space: ['dodge'],
  ShiftLeft: ['dodge'],
  KeyE: ['interact'],
  KeyF: ['release'],
  KeyJ: ['attack'],
  KeyK: ['thread'],
  Escape: ['pause', 'back'],
  Enter: ['confirm'],
  F3: ['debug'],
  Backquote: ['debug'],
};

export class Input {
  private held = new Set<Action>();
  private pressedNow = new Set<Action>();
  private keysHeld = new Set<string>();
  private keysPressed = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseMoved = false;
  /** Last used device, to show the right hints and choose aim mode. */
  device: 'kbm' | 'pad' = 'kbm';
  padMove: [number, number] = [0, 0];
  padAim: [number, number] = [0, 0];
  private padPrev: boolean[] = [];
  anyPressed = false;

  constructor(el: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) {
        if (KEYMAP[e.code]) e.preventDefault();
        return;
      }
      this.device = 'kbm';
      this.anyPressed = true;
      this.keysHeld.add(e.code);
      this.keysPressed.add(e.code);
      const acts = KEYMAP[e.code];
      if (acts) {
        e.preventDefault();
        for (const a of acts) this.press(a);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
      const acts = KEYMAP[e.code];
      if (acts) for (const a of acts) this.held.delete(a);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.keysHeld.clear();
    });
    el.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseMoved = true;
      this.device = 'kbm';
    });
    el.addEventListener('mousedown', (e) => {
      this.device = 'kbm';
      this.anyPressed = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (e.button === 0) { this.press('attack'); this.press('confirm'); }
      if (e.button === 2) this.press('thread');
      if (e.button === 1) { e.preventDefault(); this.press('release'); }
    });
    el.addEventListener('mouseup', (e) => {
      if (e.button === 0) { this.held.delete('attack'); this.held.delete('confirm'); }
      if (e.button === 2) this.held.delete('thread');
      if (e.button === 1) this.held.delete('release');
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private press(a: Action): void {
    if (!this.held.has(a)) this.pressedNow.add(a);
    this.held.add(a);
  }

  isDown(a: Action): boolean {
    return this.held.has(a);
  }
  pressed(a: Action): boolean {
    return this.pressedNow.has(a);
  }
  keyPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }
  keyDown(code: string): boolean {
    return this.keysHeld.has(code);
  }

  /** Movement vector, length <= 1. */
  move(): [number, number] {
    let x = 0, y = 0;
    if (this.held.has('left')) x -= 1;
    if (this.held.has('right')) x += 1;
    if (this.held.has('up')) y += 1;
    if (this.held.has('down')) y -= 1;
    const [px, py] = this.padMove;
    if (Math.hypot(px, py) > 0.2) { x = px; y = py; }
    const l = Math.hypot(x, y);
    return l > 1 ? [x / l, y / l] : [x, y];
  }

  /** Poll the gamepad; call once per frame before reading. */
  pollPad(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && Array.from(pads).find((g) => g && g.connected);
    if (!gp) return;
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
    const mx = dz(gp.axes[0] ?? 0), my = -dz(gp.axes[1] ?? 0);
    const ax = dz(gp.axes[2] ?? 0), ay = -dz(gp.axes[3] ?? 0);
    this.padMove = [mx, my];
    this.padAim = [ax, ay];
    if (Math.hypot(mx, my) > 0.3 || Math.hypot(ax, ay) > 0.3) this.device = 'pad';
    const map: [number, Action[]][] = [
      [0, ['dodge', 'confirm']], [1, ['release', 'back']], [2, ['attack']], [3, ['interact']],
      [7, ['thread']], [5, ['thread']], [6, ['dodge']], [9, ['pause']], [8, ['debug']],
      [12, ['up']], [13, ['down']], [14, ['left']], [15, ['right']],
    ];
    for (const [i, acts] of map) {
      const b = gp.buttons[i];
      const down = !!b && (b.pressed || b.value > 0.5);
      const was = this.padPrev[i] ?? false;
      if (down && !was) {
        this.device = 'pad';
        this.anyPressed = true;
        for (const a of acts) this.press(a);
      } else if (!down && was) {
        for (const a of acts) this.held.delete(a);
      }
      this.padPrev[i] = down;
    }
  }

  /** Call at the end of each frame. */
  endFrame(): void {
    this.pressedNow.clear();
    this.keysPressed.clear();
    this.mouseMoved = false;
    this.anyPressed = false;
  }
}
