/**
 * The title: over the living world, a brush draws an ensō, the name is written inside, the seal is
 * stamped, then three choices: continue, new game, language.
 */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { Painter, VERMILION } from '../gfx/paint';
import { Sprite, frameFrom, LAYER } from '../gfx/sprite';
import { washPoly, roughen } from '../gfx/wash';
import { stroke } from '../gfx/brush';
import { brushText } from '../gfx/text';
import { Ribbon } from '../gfx/ribbon';
import { maskSprite } from './mask';
import { lang, setLang } from '../i18n';
import { sfx } from '../audio/sfx';

type Choice = 'continue' | 'new' | 'lang';
const tr = (fr: string, en: string) => (lang === 'fr' ? fr : en);

export class Title {
  active = false;
  private t = 0;
  private sprites: Sprite[] = [];
  private enso: Ribbon | null = null;
  private name: Sprite | null = null;
  private sub: Sprite | null = null;
  private seal: Sprite | null = null;
  private mark: Sprite | null = null;
  private items: { id: Choice; s: Sprite; y: number; w: number }[] = [];
  private sel = 0;
  private sure = false;
  private hasSave = false;
  private leaving = -1;
  private choice: Choice | null = null;
  private lastMouse = [0, 0];
  onChoose?: (c: 'continue' | 'new') => void;

  constructor(private r: Renderer, private input: Input) {}

  private k(): number {
    return Math.min(this.r.uiW / 1500, this.r.uiH / 820);
  }

  /** The choices' scale: on a tall phone the title shrinks to the width, but the choices must
   *  stay big enough for a thumb. */
  private ki(): number {
    return Math.max(this.k(), Math.min(this.r.uiW / 900, this.r.uiH / 1100));
  }

  private itemY(i: number): number {
    return -80 * this.k() - (110 + i * 74) * this.ki();
  }

  open(hasSave: boolean): void {
    this.active = true;
    this.hasSave = hasSave;
    this.t = 0;
    this.sel = 0;
    this.sure = false;
    this.leaving = -1;
    const r = this.r, k = this.k(), ki = this.ki();
    // the sheet reaches down under the last choice (on a phone held upright they sit lower)
    const low = this.itemY(hasSave ? 2 : 1) - 50 * ki;
    const sheet = (w: number, h: number, kind?: 'paper' | 'cover') => {
      const top = 20 * k + h / 2, bottom = Math.min(20 * k - h / 2, low + (1000 * k - h) / 2);
      const s = maskSprite(r, w, top - bottom, kind);
      s.setPos(0, (top + bottom) / 2);
      return s;
    };
    this.sprites.push(sheet(1350 * k, 940 * k, 'paper'), sheet(1500 * k, 1000 * k), sheet(1250 * k, 860 * k, 'cover'));
    this.enso = new Ribbon(64, r.uiPig, { density: 0.95, dry: 0.45, taper: 0.55, order: LAYER.ui + 40 });
    const name = brushText('Trait', { size: 170 * k, ppu: 1.2, weight: 700, halo: false });
    this.name = new Sprite(name);
    this.name.mesh.renderOrder = LAYER.ui + 41;
    this.name.setPos(0, 170 * k);
    this.name.reveal = 0;
    r.uiPig.add(this.name.mesh);
    const sp = new Painter(130, 130, 1, -65, -65);
    sp.glaze();
    washPoly(sp, roughen([[-48, -48], [48, -48], [48, 48], [-48, 48]], 2, 131, 8), { pig: VERMILION, density: 0.95, soft: 0.05, edge: 0.4, seed: 131 });
    sp.lift();
    stroke(sp, [[-26, 26], [26, 26]], { width: 8, load: 1, seed: 132 });
    stroke(sp, [[0, 32], [0, -32]], { width: 8, load: 1, seed: 133 });
    stroke(sp, [[-28, -6], [28, -14]], { width: 7, load: 1, seed: 134 });
    sp.glaze();
    this.seal = new Sprite(frameFrom(sp));
    this.seal.mesh.renderOrder = LAYER.ui + 42;
    this.seal.opacity = 0;
    r.uiRed.add(this.seal.mesh);
    const sub = brushText(tr('Le dernier trait du maître', 'The master’s last stroke'), { size: 40 * k, ppu: 1.4, italic: true, halo: false });
    this.sub = new Sprite(sub);
    this.sub.mesh.renderOrder = LAYER.ui + 41;
    this.sub.setPos(0, -80 * k);
    this.sub.reveal = 0;
    r.uiPig.add(this.sub.mesh);
    const mp = new Painter(60, 40, 1, -30, -20);
    mp.glaze();
    stroke(mp, [[-18, 8], [4, 0], [-18, -8]], { width: 7, pig: VERMILION, load: 1, dry: 0.3, seed: 135, taperStart: 0.05, taperEnd: 0.3 });
    this.mark = new Sprite(frameFrom(mp));
    this.mark.mesh.renderOrder = LAYER.ui + 42;
    this.mark.opacity = 0;
    r.uiRed.add(this.mark.mesh);
    this.buildItems();
    this.input.swallow();
  }

  private buildItems(): void {
    for (const it of this.items) it.s.dispose();
    this.items = [];
    const ki = this.ki();
    const list: { id: Choice; label: string }[] = [];
    if (this.hasSave) list.push({ id: 'continue', label: tr('Continuer', 'Continue') });
    list.push({ id: 'new', label: this.sure ? tr('Tout effacer et recommencer ?', 'Erase everything and start again?') : tr('Nouvelle partie', 'New game') });
    list.push({ id: 'lang', label: lang === 'fr' ? 'Français · English' : 'English · Français' });
    list.forEach((c, i) => {
      const opts = (size: number) => ({ size, ppu: 1.4, italic: c.id === 'lang', weight: c.id === 'lang' ? 400 : 600, halo: false });
      const size = (c.id === 'lang' ? 30 : 44) * ki;
      let a = brushText(c.label, opts(size));
      // a long line on a narrow phone shrinks to fit, the red mark included
      const room = this.r.uiW * 0.86 - 110 * ki;
      if (a.w > room) a = brushText(c.label, opts(size * room / a.w));
      const s = new Sprite(a);
      s.mesh.renderOrder = LAYER.ui + 41;
      const y = this.itemY(i);
      s.setPos(0, y);
      s.opacity = 0;
      this.r.uiPig.add(s.mesh);
      this.items.push({ id: c.id, s, y, w: a.w });
    });
  }

  close(): void {
    for (const s of this.sprites) s.dispose();
    for (const it of this.items) it.s.dispose();
    this.enso?.dispose();
    this.name?.dispose();
    this.sub?.dispose();
    this.seal?.dispose();
    this.mark?.dispose();
    this.sprites = [];
    this.items = [];
    this.enso = this.name = this.sub = this.seal = this.mark = null;
    this.active = false;
  }

  private activate(i: number): void {
    const it = this.items[i];
    if (!it) return;
    sfx.ui();
    if (it.id === 'lang') { setLang(lang === 'fr' ? 'en' : 'fr'); location.reload(); return; }
    if (it.id === 'new' && this.hasSave && !this.sure) { this.sure = true; this.buildItems(); this.sel = i; return; }
    this.choice = it.id;
    this.leaving = 0;
    sfx.uiConfirm();
  }

  update(dt: number): void {
    if (!this.active) return;
    const inp = this.input, r = this.r, k = this.k(), ki = this.ki();
    this.t += dt;
    const t = this.t;
    const ready = t > 3.1;
    // ensō: the brush goes round once
    if (this.enso) {
      const u = Math.max(0, Math.min(1, (t - 0.3) / 1.3));
      const ease = 1 - (1 - u) * (1 - u);
      const pts: [number, number][] = [];
      const a0 = 2.2, span = Math.PI * 1.88 * Math.max(0.02, ease);
      for (let i = 0; i < 64; i++) {
        const a = a0 - (i / 63) * span;
        const rr = 250 * k * (1 + 0.03 * Math.sin(a * 3));
        pts.push([Math.cos(a) * rr * 1.18, 150 * k + Math.sin(a) * rr * 0.95]);
      }
      this.enso.set(pts, (q) => 16 * k * (1.2 - q * 0.7));
      this.enso.visible = t > 0.3;
    }
    if (this.name) this.name.reveal = Math.max(0, Math.min(1.5, (t - 1.3) / 0.9));
    if (this.seal) {
      const u = Math.max(0, Math.min(1, (t - 2.2) / 0.35));
      const s = k * (1 + (1 - u) * 1.2);
      this.seal.mesh.scale.set(s, s, 1);
      this.seal.setPos(300 * k, 70 * k);
      this.seal.opacity = u > 0 ? 1 : 0;
      if (t > 2.2 && t - dt <= 2.2) sfx.impact(false);
    }
    if (this.sub) this.sub.reveal = Math.max(0, Math.min(1.5, (t - 2.4) / 1));
    const fadeOut = this.leaving >= 0 ? Math.max(0, 1 - this.leaving / 0.8) : 1;
    this.items.forEach((it, i) => {
      it.s.opacity = Math.max(0, Math.min(1, (t - 3.1 - i * 0.12) / 0.5)) * fadeOut * (i === this.sel ? 1 : 0.6);
    });
    for (const s of [this.name, this.sub, this.seal]) if (s && this.leaving >= 0) s.opacity = fadeOut;
    for (const s of this.sprites) s.opacity = fadeOut;
    if (this.enso) this.enso.mat.uniforms.density.value = 0.95 * fadeOut;
    const cur = this.items[this.sel];
    if (this.mark && cur) {
      this.mark.setPos(-cur.w / 2 - 40 * ki, cur.y);
      this.mark.mesh.scale.set(ki, ki, 1);
      this.mark.opacity = ready ? fadeOut : 0;
    }
    if (this.leaving >= 0) {
      this.leaving += dt;
      if (this.leaving > 0.8) {
        const c = this.choice;
        this.close();
        if (c === 'continue' || c === 'new') this.onChoose?.(c);
      }
      inp.consume();
      return;
    }
    // input: anything skips the painting; then choose. A row answers anywhere across the sheet,
    // and up to halfway to its neighbours, so that a thumb cannot miss it.
    const hit = (ux: number, uy: number) => this.items.findIndex((it) => Math.abs(uy - it.y) < 37 * ki && Math.abs(ux) < Math.max(330 * ki, it.w / 2 + 60 * ki));
    if (!ready) {
      if (inp.orderTaps.length || inp.pressed('confirm') || inp.keyPressed('Space') || inp.keyPressed('Enter')) {
        this.t = 3.1;
        // the finger that skipped must not also choose when it lifts
        inp.swallow();
      } else inp.consume();
      return;
    }
    if (inp.pressed('up')) { this.sel = (this.sel + this.items.length - 1) % this.items.length; sfx.ui(); }
    if (inp.pressed('down')) { this.sel = (this.sel + 1) % this.items.length; sfx.ui(); }
    if (inp.device === 'kbm' && (inp.mouseX !== this.lastMouse[0] || inp.mouseY !== this.lastMouse[1])) {
      this.lastMouse = [inp.mouseX, inp.mouseY];
      const [ux, uy] = inp.toUi(inp.mouseX, inp.mouseY);
      const i = hit(ux, uy);
      if (i >= 0 && i !== this.sel) this.sel = i;
    }
    let act = -1;
    if (inp.keyPressed('Enter') || inp.keyPressed('Space') || inp.keyPressed('KeyE')) act = this.sel;
    for (const [sx, sy] of inp.orderTaps) {
      const [ux, uy] = inp.toUi(sx, sy);
      const i = hit(ux, uy);
      if (i >= 0) { this.sel = i; act = i; }
    }
    inp.consume();
    if (act >= 0) this.activate(act);
    void r;
  }
}
