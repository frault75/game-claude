import { uiSize } from './renderer';
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
  KeyK: ['dodge'],
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
  device: 'kbm' | 'pad' | 'touch' = 'kbm';
  /** Touch: virtual stick (CSS px) and the brush button (UI units, 1080 tall). */
  stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  stickVec: [number, number] = [0, 0];
  private buttonId = -1;
  readonly button = { x: 0, y: 0, r: 105 };
  /** Last touch that asked for a Trait (CSS px). */
  tapX = 0;
  tapY = 0;
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
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.mouseMoved = true;
        this.device = 'kbm';
        return;
      }
      if (e.pointerId === this.stick.id) {
        this.stick.x = e.clientX;
        this.stick.y = e.clientY;
        this.updateStick();
      }
    });
    el.addEventListener('pointerdown', (e) => {
      this.anyPressed = true;
      if (e.pointerType === 'mouse') {
        this.device = 'kbm';
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        if (e.button === 0) { this.press('attack'); this.press('confirm'); }
        if (e.button === 2) this.press('dodge');
        if (e.button === 1) { e.preventDefault(); this.press('release'); }
        return;
      }
      e.preventDefault();
      this.device = 'touch';
      const w = window.innerWidth, h = window.innerHeight;
      const [ux, uy] = this.toUi(e.clientX, e.clientY);
      this.layoutButton();
      if (Math.hypot(ux - this.button.x, uy - this.button.y) < this.button.r * 1.15 && this.buttonId < 0) {
        this.buttonId = e.pointerId;
        this.press('attack');
        this.press('confirm');
      } else if (e.clientX < w * 0.42 && this.stick.id < 0 && e.clientY > h * 0.18) {
        this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
        this.updateStick();
      } else {
        // a tap anywhere else: Trait towards that point
        this.mouseX = this.tapX = e.clientX;
        this.mouseY = this.tapY = e.clientY;
        this.press('dodge');
        this.press('confirm');
        this.held.delete('dodge');
        this.held.delete('confirm');
      }
    });
    const up = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) { this.held.delete('attack'); this.held.delete('confirm'); }
        if (e.button === 2) this.held.delete('dodge');
        if (e.button === 1) this.held.delete('release');
        return;
      }
      if (e.pointerId === this.stick.id) {
        this.stick.id = -1;
        this.stickVec = [0, 0];
      }
      if (e.pointerId === this.buttonId) {
        this.buttonId = -1;
        this.held.delete('attack');
        this.held.delete('confirm');
      }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** CSS px to UI units (1080 tall, origin at centre). */
  toUi(x: number, y: number): [number, number] {
    const w = window.innerWidth, h = window.innerHeight;
    const ui = uiSize(w, h);
    return [(x / w - 0.5) * ui.w, (0.5 - y / h) * ui.h];
  }

  /** Where the brush button sits (UI units). */
  layoutButton(): void {
    const w = window.innerWidth, h = window.innerHeight;
    const ui = uiSize(w, h);
    this.button.r = 105;
    this.button.x = ui.w / 2 - this.button.r - 60;
    this.button.y = -ui.h / 2 + this.button.r + 60;
  }

  private updateStick(): void {
    const s = this.stick;
    const R = Math.min(window.innerWidth, window.innerHeight) * 0.12;
    let dx = (s.x - s.ox) / R, dy = -(s.y - s.oy) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) {
      // the stick base follows the thumb when dragged far
      s.ox = s.x - (dx / l) * R;
      s.oy = s.y + (dy / l) * R;
      dx /= l; dy /= l;
    }
    this.stickVec = l < 0.15 ? [0, 0] : [dx, dy];
  }

  private press(a: Action): void {
    if (!this.held.has(a)) this.pressedNow.add(a);
    this.held.add(a);
  }

  /** Debug/testing: drive an action as if a button were pressed or released. */
  simulate(a: Action, down: boolean, asPress = true): void {
    if (down) {
      if (asPress) this.press(a);
      else this.held.add(a);
    } else this.held.delete(a);
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
    const [tx, ty] = this.stickVec;
    if (Math.hypot(tx, ty) > 0.1) { x = tx; y = ty; }
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
      [7, ['dodge']], [5, ['dodge']], [6, ['dodge']], [9, ['pause']], [8, ['debug']],
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
