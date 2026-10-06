import { uiSize } from './renderer';
/**
 * Keyboard (physical key codes, so ZQSD and WASD both work), mouse, touch and gamepad,
 * merged into a small set of actions plus "brush gestures":
 *   - a tap (touch, or right click) asks for a Trait towards a point;
 *   - a drag (finger, or right button held) draws a path Shu follows.
 */
export type Action = 'attack' | 'release' | 'dodge' | 'interact' | 'pause' | 'debug' | 'confirm' | 'back' | 'up' | 'down' | 'left' | 'right';

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

/** Below this many CSS pixels of travel, a press is a tap, not a drawing. */
const DRAG_PX = 14;
const TAP_MS = 320;

interface Gesture {
  id: number;
  sx: number;
  sy: number;
  lx: number;
  ly: number;
  t0: number;
  drawing: boolean;
}

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
  padMove: [number, number] = [0, 0];
  padAim: [number, number] = [0, 0];
  private padPrev: boolean[] = [];
  anyPressed = false;

  private gesture: Gesture | null = null;
  /** Gesture events for this frame (CSS px). */
  taps: [number, number][] = [];
  drawStart: [number, number] | null = null;
  drawPoints: [number, number][] = [];
  drawEnd = false;
  /** True while a finger or the right button is drawing. */
  get drawing(): boolean {
    return !!this.gesture?.drawing;
  }

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
      this.endGesture(true);
    });

    el.addEventListener('pointerdown', (e) => {
      this.anyPressed = true;
      if (e.pointerType === 'mouse') {
        this.device = 'kbm';
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        if (e.button === 0) { this.press('attack'); this.press('confirm'); }
        if (e.button === 2) this.beginGesture(e);
        if (e.button === 1) { e.preventDefault(); this.press('release'); }
        return;
      }
      e.preventDefault();
      this.device = 'touch';
      this.press('confirm');
      this.held.delete('confirm');
      // one finger draws; a second finger simply ends the drawing
      if (this.gesture) this.endGesture(false);
      else this.beginGesture(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.mouseMoved = true;
        if (this.device !== 'kbm') this.device = 'kbm';
      }
      const g = this.gesture;
      if (!g || e.pointerId !== g.id) return;
      // coalesced events give smoother drawings where supported
      const evs = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      for (const ev of evs.length ? evs : [e]) this.moveGesture(ev.clientX, ev.clientY);
    });
    const up = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) { this.held.delete('attack'); this.held.delete('confirm'); }
        if (e.button === 1) this.held.delete('release');
      }
      if (this.gesture && e.pointerId === this.gesture.id) this.endGesture(false);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', (e) => {
      if (this.gesture && e.pointerId === this.gesture.id) this.endGesture(true);
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private beginGesture(e: PointerEvent): void {
    this.gesture = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, t0: performance.now(), drawing: false };
  }

  private moveGesture(x: number, y: number): void {
    const g = this.gesture!;
    if (!g.drawing) {
      if (Math.hypot(x - g.sx, y - g.sy) < DRAG_PX) return;
      g.drawing = true;
      this.drawStart = [g.sx, g.sy];
      g.lx = g.sx;
      g.ly = g.sy;
    }
    if (Math.hypot(x - g.lx, y - g.ly) >= 3) {
      this.drawPoints.push([x, y]);
      g.lx = x;
      g.ly = y;
    }
  }

  private endGesture(cancel: boolean): void {
    const g = this.gesture;
    if (!g) return;
    this.gesture = null;
    if (g.drawing) this.drawEnd = true;
    else if (!cancel && performance.now() - g.t0 < TAP_MS * 3) this.taps.push([g.sx, g.sy]);
  }

  /** CSS px to UI units (origin at centre). */
  toUi(x: number, y: number): [number, number] {
    const w = window.innerWidth, h = window.innerHeight;
    const ui = uiSize(w, h);
    return [(x / w - 0.5) * ui.w, (0.5 - y / h) * ui.h];
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
    this.taps = [];
    this.drawStart = null;
    this.drawPoints = [];
    this.drawEnd = false;
  }

  /** Testing helpers: feed gestures directly (CSS px). */
  testTap(x: number, y: number): void {
    this.taps.push([x, y]);
  }
  testDraw(points: [number, number][]): void {
    this.drawStart = points[0];
    this.drawPoints = points.slice(1);
    this.drawEnd = true;
  }
}
