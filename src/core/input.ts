import { uiSize } from './renderer';
/**
 * Keyboard, mouse, touch and gamepad merged into actions and "orders":
 *   - touch, left part of the screen: a floating stick appears under the thumb and steers the child
 *   - tap / left click on the ground: go there; on a foe: attack it; on someone: talk
 *   - hold (left button, or a still finger on the right): keep walking towards the pointer
 *   - drag (finger on the right) / right-button drag: draw a stroke with the current ink
 *   - right click: a straight stroke towards the cursor
 */
export type Action = 'attack' | 'release' | 'dodge' | 'interact' | 'pause' | 'debug' | 'confirm' | 'back' | 'up' | 'down' | 'left' | 'right';

const KEYMAP: Record<string, Action[]> = {
  KeyW: ['up'], ArrowUp: ['up'],
  KeyS: ['down'], ArrowDown: ['down'],
  KeyA: ['left'], ArrowLeft: ['left'],
  KeyD: ['right'], ArrowRight: ['right'],
  Space: ['dodge'],
  ShiftLeft: ['dodge'],
  KeyE: ['interact'], KeyF: ['interact'],
  KeyJ: ['attack'],
  KeyK: ['dodge'],
  Escape: ['pause', 'back'],
  Enter: ['confirm'],
  F3: ['debug'],
  Backquote: ['debug'],
};

const DRAG_PX = 14;
const HOLD_MS = 260;
/** Touches starting left of this fraction of the screen width drive the stick. */
const STICK_ZONE = 0.42;
/** Stick travel in CSS px for full speed. */
const STICK_R = 56;

interface Gesture {
  id: number;
  button: 'touch' | 'right';
  sx: number;
  sy: number;
  x: number;
  y: number;
  lx: number;
  ly: number;
  t0: number;
  /** 'dead': begun in another place; ignored until the finger lifts. */
  mode: 'pending' | 'draw' | 'hold' | 'dead';
}

export interface UiRegion {
  x: number;
  y: number;
  r: number;
  fn: () => void;
}

export class Input {
  private held = new Set<Action>();
  private pressedNow = new Set<Action>();
  private keysHeld = new Set<string>();
  private keysPressed = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseMoved = false;
  device: 'kbm' | 'pad' | 'touch' = 'kbm';
  padMove: [number, number] = [0, 0];
  padAim: [number, number] = [0, 0];
  private padPrev: boolean[] = [];
  anyPressed = false;

  private gesture: Gesture | null = null;
  /** A panel (dialogue, bag) is open: every touch is a tap or a drag, no stick. */
  uiMode = false;
  /** The floating stick: where the thumb landed and where it is now (CSS px). */
  stick: { id: number; ox: number; oy: number; x: number; y: number; t0: number; live: boolean } | null = null;
  private leftHeld = false;
  private leftT0 = 0;
  /** Orders for this frame (CSS px). */
  orderTaps: [number, number][] = [];
  strokeTaps: [number, number][] = [];
  holdPoint: [number, number] | null = null;
  drawStart: [number, number] | null = null;
  drawPoints: [number, number][] = [];
  drawEnd = false;
  inkSelect: number | null = null;
  inkCycle = 0;
  /** Clickable HUD buttons (UI units). */
  uiRegions: UiRegion[] = [];

  get drawing(): boolean {
    return this.gesture?.mode === 'draw';
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
      const m = /^Digit([1-4])$/.exec(e.code);
      if (m) this.inkSelect = Number(m[1]) - 1;
      if (e.code === 'KeyQ') this.inkCycle = 1;
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
      this.stick = null;
      this.held.clear();
      this.keysHeld.clear();
      this.leftHeld = false;
      this.holdPoint = null;
      this.endGesture(true);
    });
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.inkCycle = e.deltaY > 0 ? 1 : -1;
    }, { passive: false });

    el.addEventListener('pointerdown', (e) => {
      this.anyPressed = true;
      if (e.pointerType !== 'mouse') {
        e.preventDefault();
        this.device = 'touch';
      } else this.device = 'kbm';
      this.press('confirm');
      this.held.delete('confirm');
      if ((e.pointerType !== 'mouse' || e.button === 0) && this.hitUi(e.clientX, e.clientY)) return;
      if (e.pointerType === 'mouse') {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        if (e.button === 0) {
          this.leftHeld = true;
          this.leftT0 = performance.now();
          this.orderTaps.push([e.clientX, e.clientY]);
        }
        if (e.button === 2) this.beginGesture(e, 'right');
        if (e.button === 1) { e.preventDefault(); this.press('attack'); }
        return;
      }
      if (!this.uiMode && !this.stick && e.clientX < window.innerWidth * STICK_ZONE) {
        // a stick only once the thumb moves or rests; a quick tap stays a tap
        this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), live: false };
        return;
      }
      if (this.gesture) this.endGesture(false);
      else this.beginGesture(e, 'touch');
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.mouseMoved = true;
        // a button released elsewhere (outside the window, during a loading screen): let go here too
        if (this.leftHeld && !(e.buttons & 1)) { this.leftHeld = false; this.holdPoint = null; }
        if (this.gesture && this.gesture.button === 'right' && !(e.buttons & 2)) this.endGesture(false);
        if (this.leftHeld && this.holdPoint) this.holdPoint = [e.clientX, e.clientY];
      }
      const st = this.stick;
      if (st && e.pointerId === st.id) {
        st.x = e.clientX;
        st.y = e.clientY;
        if (!st.live && Math.hypot(st.x - st.ox, st.y - st.oy) > DRAG_PX) st.live = true;
        // the base follows a thumb that wanders too far
        const dx = st.x - st.ox, dy = st.y - st.oy, d = Math.hypot(dx, dy);
        if (d > STICK_R * 1.6) {
          st.ox = st.x - (dx / d) * STICK_R * 1.6;
          st.oy = st.y - (dy / d) * STICK_R * 1.6;
        }
        return;
      }
      const g = this.gesture;
      if (!g || e.pointerId !== g.id) return;
      const evs = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      for (const ev of evs.length ? evs : [e]) this.moveGesture(ev.clientX, ev.clientY);
    });
    const up = (e: PointerEvent) => {
      if (this.stick && e.pointerId === this.stick.id) {
        const st = this.stick;
        this.stick = null;
        if (!st.live) this.orderTaps.push([st.ox, st.oy]);
        return;
      }
      if (e.pointerType === 'mouse') {
        if (e.button === 0) { this.leftHeld = false; this.holdPoint = null; }
        if (e.button === 1) this.held.delete('attack');
      }
      if (this.gesture && e.pointerId === this.gesture.id) this.endGesture(false);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', (e) => {
      if (this.stick && e.pointerId === this.stick.id) this.stick = null;
      if (this.gesture && e.pointerId === this.gesture.id) this.endGesture(true);
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private hitUi(x: number, y: number): boolean {
    const [ux, uy] = this.toUi(x, y);
    for (const r of this.uiRegions) {
      if (Math.hypot(ux - r.x, uy - r.y) < r.r) {
        r.fn();
        return true;
      }
    }
    return false;
  }

  private beginGesture(e: PointerEvent, button: 'touch' | 'right'): void {
    this.gesture = { id: e.pointerId, button, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t0: performance.now(), mode: 'pending' };
  }

  private moveGesture(x: number, y: number): void {
    const g = this.gesture!;
    if (g.mode === 'dead') return;
    g.x = x;
    g.y = y;
    if (g.mode === 'hold') {
      this.holdPoint = [x, y];
      return;
    }
    if (g.mode === 'pending') {
      if (Math.hypot(x - g.sx, y - g.sy) < DRAG_PX) return;
      // a moving finger on the right always draws (the stick is for walking)
      g.mode = 'draw';
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
    if (g.mode === 'dead') return;
    if (g.mode === 'draw') this.drawEnd = true;
    else if (g.mode === 'hold') this.holdPoint = null;
    else if (!cancel) {
      if (g.button === 'touch') this.orderTaps.push([g.sx, g.sy]);
      else this.strokeTaps.push([g.sx, g.sy]);
    }
  }

  /** Call once per frame: promotes a still finger to "hold", and a held left button to "hold". */
  tick(): void {
    const now = performance.now();
    const g = this.gesture;
    if (g && g.mode === 'pending' && g.button === 'touch' && now - g.t0 > HOLD_MS) {
      g.mode = 'hold';
      this.holdPoint = [g.x, g.y];
    }
    if (this.leftHeld && !this.holdPoint && now - this.leftT0 > 150) this.holdPoint = [this.mouseX, this.mouseY];
    if (this.stick && !this.stick.live && now - this.stick.t0 > 200) this.stick.live = true;
  }

  toUi(x: number, y: number): [number, number] {
    const w = window.innerWidth, h = window.innerHeight;
    const ui = uiSize(w, h);
    return [(x / w - 0.5) * ui.w, (0.5 - y / h) * ui.h];
  }

  private press(a: Action): void {
    if (!this.held.has(a)) this.pressedNow.add(a);
    this.held.add(a);
  }

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

  move(): [number, number] {
    let x = 0, y = 0;
    if (this.held.has('left')) x -= 1;
    if (this.held.has('right')) x += 1;
    if (this.held.has('up')) y += 1;
    if (this.held.has('down')) y -= 1;
    const [px, py] = this.padMove;
    if (Math.hypot(px, py) > 0.2) { x = px; y = py; }
    const [sx, sy] = this.stickMove();
    if (Math.hypot(sx, sy) > 0) { x = sx; y = sy; }
    const l = Math.hypot(x, y);
    return l > 1 ? [x / l, y / l] : [x, y];
  }

  /** Stick deflection, -1..1 (y up), with a dead zone. */
  stickMove(): [number, number] {
    const st = this.stick;
    if (!st || !st.live) return [0, 0];
    const dx = (st.x - st.ox) / STICK_R, dy = -(st.y - st.oy) / STICK_R;
    const d = Math.hypot(dx, dy);
    if (d < 0.18) return [0, 0];
    const k = Math.min(1, (d - 0.18) / 0.82 + 0.35) / d;
    return [dx * k, dy * k];
  }

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
    const map: [number, Action[] | 'inkPrev' | 'inkNext'][] = [
      [0, ['dodge', 'confirm']], [1, ['back']], [2, ['attack']], [3, ['interact']],
      [7, ['dodge']], [6, ['dodge']], [4, 'inkPrev'], [5, 'inkNext'], [9, ['pause']], [8, ['debug']],
      [12, ['up']], [13, ['down']], [14, ['left']], [15, ['right']],
    ];
    for (const [i, acts] of map) {
      const b = gp.buttons[i];
      const down = !!b && (b.pressed || b.value > 0.5);
      const was = this.padPrev[i] ?? false;
      if (down && !was) {
        this.device = 'pad';
        this.anyPressed = true;
        if (acts === 'inkPrev') this.inkCycle = -1;
        else if (acts === 'inkNext') this.inkCycle = 1;
        else for (const a of acts) this.press(a);
      } else if (!down && was && Array.isArray(acts)) {
        for (const a of acts) this.held.delete(a);
      }
      this.padPrev[i] = down;
    }
  }

  endFrame(): void {
    this.pressedNow.clear();
    this.keysPressed.clear();
    this.mouseMoved = false;
    this.anyPressed = false;
    this.orderTaps = [];
    this.strokeTaps = [];
    this.drawStart = null;
    this.drawPoints = [];
    this.drawEnd = false;
    this.inkSelect = null;
    this.inkCycle = 0;
  }

  /** A new place: the thumb stays down but the stick starts again from where it rests;
   *  a stroke or a held button from the last place is over until the finger lifts. */
  newPlace(): void {
    const st = this.stick;
    if (st) { st.ox = st.x; st.oy = st.y; }
    if (this.gesture) this.gesture.mode = 'dead';
    this.orderTaps = [];
    this.strokeTaps = [];
    this.drawStart = null;
    this.drawPoints = [];
    this.drawEnd = false;
    this.holdPoint = null;
    this.leftHeld = false;
  }

  /** Forget the current gesture and this frame's orders (dialogue opened or closed). */
  swallow(): void {
    this.stick = null;
    // the frame may be split into several game steps: what was read now must not be read again
    this.pressedNow.clear();
    this.keysPressed.clear();
    this.inkSelect = null;
    this.inkCycle = 0;
    this.orderTaps = [];
    this.strokeTaps = [];
    this.drawStart = null;
    this.drawPoints = [];
    this.drawEnd = false;
    this.holdPoint = null;
    this.leftHeld = false;
    this.gesture = null;
  }

  /** Testing helpers (CSS px). */
  testTap(x: number, y: number): void {
    this.orderTaps.push([x, y]);
  }
  testDraw(points: [number, number][]): void {
    this.drawStart = points[0];
    this.drawPoints = points.slice(1);
    this.drawEnd = true;
  }
}
