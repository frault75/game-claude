/** Plain HTML debug overlay (F3 or `): FPS, area, boss state, player, thread. */
export class DebugOverlay {
  private el: HTMLDivElement;
  visible = false;
  private frames = 0;
  private acc = 0;
  private fps = 0;
  private ms = 0;
  private lines: Record<string, string> = {};

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', left: '8px', top: '8px', padding: '8px 10px', whiteSpace: 'pre',
      font: '12px/1.35 ui-monospace, Menlo, Consolas, monospace', color: '#f4efe2',
      background: 'rgba(20,18,16,0.78)', borderRadius: '4px', pointerEvents: 'none', zIndex: '10', display: 'none',
    } as CSSStyleDeclaration);
    document.body.appendChild(this.el);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
  }

  set(key: string, value: string | number): void {
    this.lines[key] = typeof value === 'number' ? value.toFixed(2) : value;
  }

  frame(dt: number): void {
    this.frames++;
    this.acc += dt;
    if (this.acc >= 0.5) {
      this.fps = this.frames / this.acc;
      this.ms = (this.acc / this.frames) * 1000;
      this.frames = 0;
      this.acc = 0;
      if (this.visible) this.draw();
    }
  }

  private draw(): void {
    const out = [`FPS   ${this.fps.toFixed(0)}  (${this.ms.toFixed(1)} ms)`];
    for (const [k, v] of Object.entries(this.lines)) out.push(`${k.padEnd(6)}${v}`);
    this.el.textContent = out.join('\n');
  }
}
