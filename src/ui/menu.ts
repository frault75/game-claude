/**
 * The menu: one sheet with tabs — the big map, the journal (quests, bestiary, the master's notebook),
 * the bag, the Tree of Strokes and the settings. Esc, M (map) or J (journal); the world holds still.
 */
import type { Renderer } from '../core/renderer';
import type { Input } from '../core/input';
import { Painter, INK } from '../gfx/paint';
import { Sprite, Frame, frameFrom, makeTexture, LAYER } from '../gfx/sprite';
import { roughen, washPoly } from '../gfx/wash';
import { stroke } from '../gfx/brush';
import { brushText, SERIF } from '../gfx/text';
import { maskSprite } from './mask';
import { MapSource, sheet, seen, drawMark, drawLabel, Mark, MarkKind } from './mapArt';
import { portrait } from '../gfx/gen/portraits';
import { save, resetSave, BAG_SIZE } from '../game/progression';
import { settings, saveSettings } from '../game/settings';
import { MAIN, STELES, MURALS, BESTIARY, REGION_LORE, JOURNAL_UI, L as LT } from '../i18n/lore';
import { CAMPS, SHRINES, REGIONS } from '../world/layout';
import { INK_ORDER } from '../game/inks';
import { lang, setLang } from '../i18n';
import { sfx } from '../audio/sfx';

export type MenuTab = 'map' | 'journal' | 'bag' | 'tree' | 'settings';
type JournalTab = 'quests' | 'beasts' | 'notes';

const T = {
  map: { fr: 'Carte', en: 'Map' },
  journal: { fr: 'Journal', en: 'Journal' },
  bag: { fr: 'Sac', en: 'Bag' },
  tree: { fr: 'Arbre', en: 'Tree' },
  settings: { fr: 'Réglages', en: 'Settings' },
  noMap: { fr: 'Pas de carte pour ce lieu.', en: 'No map for this place.' },
  mapHint: { fr: 'Le brouillard se lève là où tu marches.', en: 'The fog lifts where you walk.' },
  current: { fr: 'En cours', en: 'Current' },
  done: { fr: 'Accomplies', en: 'Done' },
  progress: { fr: 'Progrès', en: 'Progress' },
  level: { fr: 'Niveau', en: 'Level' },
  camps: { fr: 'Camps purifiés', en: 'Camps cleansed' },
  shrines: { fr: 'Sanctuaires', en: 'Shrines' },
  steles: { fr: 'Stèles lues', en: 'Steles read' },
  beasts: { fr: 'Bestiaire', en: 'Bestiary' },
  inks: { fr: 'Couleurs retrouvées', en: 'Colours found' },
  murals: { fr: 'Fresques', en: 'Murals' },
  bagLine: { fr: 'Objets portés', en: 'Items carried' },
  music: { fr: 'Musique', en: 'Music' },
  sfx: { fr: 'Effets sonores', en: 'Sound effects' },
  shake: { fr: 'Secousses de l’écran', en: 'Screen shake' },
  minimap: { fr: 'Mini-carte', en: 'Minimap' },
  language: { fr: 'Langue', en: 'Language' },
  on: { fr: 'Oui', en: 'On' },
  off: { fr: 'Non', en: 'Off' },
  newGame: { fr: 'Nouvelle partie', en: 'New game' },
  sure: { fr: 'Tout effacer ? Touche encore', en: 'Erase everything? Tap again' },
  controls: { fr: 'Commandes', en: 'Controls' },
  mural: { fr: 'Fresque', en: 'Mural' },
  floor: { fr: 'étage', en: 'floor' },
  cave: { fr: 'Grotte', en: 'Cave' },
  temple: { fr: 'Temple', en: 'Temple' },
  legend: { fr: 'sanctuaire · camp · quête · stèle · gardien', en: 'shrine · camp · quest · stele · guardian' },
};
const L = (x: { fr: string; en: string }) => x[lang];

const CONTROLS_KBM = {
  fr: ['Clic : marcher, frapper, parler', 'Clic droit glissé : tracer (boucle = ensō)', 'Espace : trait droit vers la souris', 'E : parler · 1-4, Q, molette : encre', 'R, T, G : compétences', 'I : sac · C : arbre · M : carte · J : journal', 'Échap : menu'],
  en: ['Click: walk, strike, talk', 'Right-drag: draw (a loop = ensō)', 'Space: straight stroke to the mouse', 'E: talk · 1-4, Q, wheel: ink', 'R, T, G: skills', 'I: bag · C: tree · M: map · J: journal', 'Esc: menu'],
};
const CONTROLS_TOUCH = {
  fr: ['Pouce à gauche : un joystick apparaît', 'À droite, touche : frapper ou parler', 'À droite, glisse : tracer (boucle = ensō)', 'Pots en bas à droite : encre', 'Boutons ronds : compétences', 'En haut à gauche : sac, arbre, menu', 'La mini-carte ouvre la carte'],
  en: ['Left thumb: a stick appears', 'Right side, tap: strike or talk', 'Right side, swipe: draw (a loop = ensō)', 'Pots bottom right: ink', 'Round buttons: skills', 'Top left: bag, tree, menu', 'Tap the minimap for the map'],
};

const BEAST_ORDER = ['blot', 'mite', 'wisp', 'crow', 'scarecrow', 'splitter', 'totem', 'boar', 'fox', 'brute', 'bat', 'grub', 'soldier', 'lantern', 'mother', 'ram king', 'warden'];
const FLOOR_IDS = ['cave1', 'cave2', 'temple1', 'temple2'];

export const MENU_TABS: MenuTab[] = ['map', 'journal', 'bag', 'tree', 'settings'];

/** The row of tabs at the top of every sheet (menu, bag, tree); returns where each tab is. */
export function tabStrip(r: Renderer, pw: number, ph: number, active: MenuTab, keep: (s: Sprite) => void): { id: MenuTab; x: number; y: number; w: number; h: number }[] {
  let tx = -pw / 2 + 56;
  const ty = ph / 2 - 50;
  const out: { id: MenuTab; x: number; y: number; w: number; h: number }[] = [];
  for (const id of MENU_TABS) {
    const on = id === active;
    const art = brushText(L(T[id]), { size: 34, ppu: 1.4, weight: on ? 700 : 400, color: on ? [0.76, 0.23, 0.17] : undefined, lineHeight: 1.25 });
    const s = new Sprite(art);
    s.mesh.renderOrder = LAYER.ui + 33;
    (on ? r.uiAcc : r.uiPig).add(s.mesh);
    s.setPos(tx + art.w / 2, ty);
    keep(s);
    out.push({ id, x: tx + art.w / 2, y: ty, w: art.w + 30, h: 70 });
    tx += art.w + 46;
  }
  return out;
}

export interface MapView {
  src: MapSource | null;
  px: number;
  py: number;
  dir: number;
  goal: [number, number] | null;
  place: string;
}

interface Btn { x: number; y: number; w: number; h: number; act: () => void }

export class Menu {
  active = false;
  tab: MenuTab = 'map';
  private jtab: JournalTab = 'quests';
  private sel: string | null = null;
  private sprites: Sprite[] = [];
  private dyn: Sprite[] = [];
  private texs: { dispose(): void }[] = [];
  private buttons: Btn[] = [];
  private pw = 0;
  private ph = 0;
  private btnFrame: Frame | null = null;
  private sure = false;
  onBag?: () => void;
  onTree?: () => void;
  view?: () => MapView;
  /** Side quests: title, current goal, done. */
  sides?: () => { title: string; goal: string; done: boolean }[];
  device: () => 'kbm' | 'touch' | 'pad' = () => 'kbm';

  constructor(private r: Renderer, private input: Input) {}

  private add(s: Sprite, scene: 'pig' | 'red' | 'acc', order = LAYER.ui + 31): Sprite {
    s.mesh.renderOrder = order;
    (scene === 'pig' ? this.r.uiPig : scene === 'red' ? this.r.uiRed : this.r.uiAcc).add(s.mesh);
    return s;
  }

  private text(str: string, size: number, o: { bold?: boolean; italic?: boolean; maxWidth?: number; align?: 'left' | 'center'; color?: [number, number, number] } = {}): { s: Sprite; w: number; h: number } {
    const art = brushText(str, { size, ppu: 1.4, weight: o.bold ? 700 : 400, italic: o.italic, maxWidth: o.maxWidth, align: o.align ?? 'left', lineHeight: 1.25, color: o.color });
    const s = this.add(new Sprite(art), o.color ? 'acc' : 'pig', LAYER.ui + 33);
    this.dyn.push(s);
    return { s, w: art.w, h: art.h };
  }

  /** Text whose left edge is at x and top at y; returns its height. */
  private put(str: string, x: number, y: number, size: number, o: Parameters<Menu['text']>[2] = {}): { w: number; h: number } {
    const t = this.text(str, size, o);
    t.s.setPos(x + t.w / 2, y - t.h / 2);
    return t;
  }

  open(tab?: MenuTab): void {
    if (tab === 'bag') { this.onBag?.(); return; }
    if (tab === 'tree') { this.onTree?.(); return; }
    if (tab) this.tab = tab;
    if (this.active) { this.refresh(); return; }
    this.active = true;
    this.sure = false;
    this.build();
    this.input.swallow();
    sfx.ui();
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    for (const s of [...this.sprites, ...this.dyn]) s.dispose();
    for (const t of this.texs) t.dispose();
    this.sprites = [];
    this.dyn = [];
    this.texs = [];
    this.buttons = [];
    this.input.swallow();
    sfx.ui();
  }

  private build(): void {
    const r = this.r;
    const pw = Math.min(1560, r.uiW - 40), ph = Math.min(860, r.uiH - 40);
    this.pw = pw;
    this.ph = ph;
    const p = new Painter(pw + 40, ph + 40, 0.5, -(pw + 40) / 2, -(ph + 40) / 2);
    const edge = roughen([[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, ph / 2], [-pw / 2, ph / 2]], 8, 171, 20);
    p.reserve(() => edge.forEach((q, i) => (i === 0 ? p.ctx.moveTo(q[0], q[1]) : p.ctx.lineTo(q[0], q[1]))), 0.97);
    p.glaze();
    washPoly(p, edge, { pig: INK, density: 0.03, soft: 0.6, seed: 172 });
    stroke(p, [[-pw / 2 + 20, ph / 2 - 8], [pw / 2 - 20, ph / 2 - 12]], { width: 8, load: 0.85, dry: 0.5, seed: 173, taperStart: 0.03, taperEnd: 0.12 });
    stroke(p, [[-pw / 2 + 30, ph / 2 - 92], [pw / 2 - 30, ph / 2 - 95]], { width: 3, load: 0.35, dry: 0.7, seed: 174, taperStart: 0.1, taperEnd: 0.2 });
    stroke(p, [[-pw / 2 + 30, -ph / 2 + 8], [pw / 2 - 30, -ph / 2 + 6]], { width: 5, load: 0.5, dry: 0.7, seed: 175, taperStart: 0.1, taperEnd: 0.2 });
    this.sprites.push(this.add(new Sprite(frameFrom(p)), 'pig', LAYER.ui + 30));
    const m = maskSprite(r, pw + 160, ph + 160);
    m.mesh.renderOrder = LAYER.ui + 30;
    this.sprites.push(m, maskSprite(r, pw + 30, ph + 30, 'cover'));
    const x = new Painter(80, 80, 1, -40, -40);
    x.glaze();
    stroke(x, [[-22, -22], [22, 22]], { width: 7, load: 1, dry: 0.4, seed: 56 });
    stroke(x, [[22, -22], [-22, 22]], { width: 7, load: 1, dry: 0.4, seed: 57 });
    const xs = this.add(new Sprite(frameFrom(x)), 'pig', LAYER.ui + 33);
    xs.setPos(pw / 2 - 52, ph / 2 - 50);
    this.sprites.push(xs);
    this.refresh();
  }

  private refresh(): void {
    for (const s of this.dyn) s.dispose();
    for (const t of this.texs) t.dispose();
    this.dyn = [];
    this.texs = [];
    this.buttons = [];
    const pw = this.pw, ph = this.ph;
    // tabs
    for (const tb of tabStrip(this.r, pw, ph, this.tab, (sp) => this.dyn.push(sp))) {
      this.buttons.push({ ...tb, act: () => { sfx.ui(); this.open(tb.id); } });
    }
    if (this.tab === 'map') this.mapTab();
    else if (this.tab === 'journal') this.journalTab();
    else this.settingsTab();
  }

  // ---------- the big map ----------

  private mapTab(): void {
    const pw = this.pw, ph = this.ph;
    const v = this.view?.();
    const top = ph / 2 - 108, bottom = -ph / 2 + 64;
    if (v?.place) this.put(v.place, pw / 2 - 60 - Math.min(600, pw * 0.4), ph / 2 - 36, 26, { italic: true, maxWidth: Math.min(600, pw * 0.4) });
    if (!v?.src) {
      this.put(L(T.noMap), -pw / 2 + 70, top - 20, 30, { italic: true });
      return;
    }
    const src = v.src;
    const aw = pw - 120, ah = top - bottom;
    const k = Math.min(aw / src.w, ah / src.h);
    const w = src.w * k, h = src.h * k;
    const cx = 0, cy = (top + bottom) / 2;
    const tex = makeTexture(sheet(src));
    this.texs.push(tex);
    const ms = this.add(new Sprite({ tex, w, h, ox: -w / 2, oy: -h / 2 }), 'acc', LAYER.ui + 32);
    ms.setPos(cx, cy);
    this.dyn.push(ms);
    // marks and names on a sheet of the same size
    const S = 1.25;
    const oc = document.createElement('canvas');
    oc.width = Math.ceil(w * S);
    oc.height = Math.ceil(h * S);
    const c = oc.getContext('2d')!;
    const at = (x: number, y: number): [number, number] => [x * k * S, (src.h - y) * k * S];
    // the edges of the sheet, even where nothing is known yet
    c.strokeStyle = 'rgba(70,58,46,0.35)';
    c.lineWidth = 2;
    c.setLineDash([7, 9]);
    c.strokeRect(2, 2, oc.width - 4, oc.height - 4);
    c.setLineDash([]);
    for (const lb of src.labels?.() ?? []) if (seen(src, lb.x, lb.y)) { const [x, y] = at(lb.x, lb.y); drawLabel(c, lb.text, x, y, 22 * S); }
    for (const mk of src.marks()) {
      if (mk.kind !== 'quest' && !seen(src, mk.x, mk.y)) continue;
      const [x, y] = at(mk.x, mk.y);
      drawMark(c, mk, x, y, 11 * S);
    }
    if (v.goal) { const [x, y] = at(v.goal[0], v.goal[1]); drawMark(c, { x: 0, y: 0, kind: 'goal' }, x, y, 13 * S); }
    { const [x, y] = at(v.px, v.py); drawMark(c, { x: 0, y: 0, kind: 'player', dir: v.dir }, x, y, 14 * S); }
    const otex = makeTexture(oc);
    this.texs.push(otex);
    const os = this.add(new Sprite({ tex: otex, w, h, ox: -w / 2, oy: -h / 2 }), 'acc', LAYER.ui + 33);
    os.setPos(cx, cy);
    this.dyn.push(os);
    // legend
    const lc = document.createElement('canvas');
    lc.width = 900;
    lc.height = 44;
    const lx = lc.getContext('2d')!;
    const kinds: MarkKind[] = ['shrineOn', 'camp', 'quest', 'stele', 'boss'];
    const names = L(T.legend).split(' · ');
    let x0 = 20;
    kinds.forEach((kind, i) => {
      drawMark(lx, { x: 0, y: 0, kind } as Mark, x0, 22, 11);
      lx.font = `italic 22px ${SERIF}`;
      lx.fillStyle = 'rgba(40,36,32,0.9)';
      lx.textBaseline = 'middle';
      lx.fillText(names[i] ?? '', x0 + 18, 23);
      x0 += 40 + lx.measureText(names[i] ?? '').width;
    });
    const ltex = makeTexture(lc);
    this.texs.push(ltex);
    const ls = this.add(new Sprite({ tex: ltex, w: 900, h: 44, ox: -450, oy: -22 }), 'acc', LAYER.ui + 33);
    ls.setPos(-pw / 2 + 60 + 450, -ph / 2 + 36);
    this.dyn.push(ls);
    const hint = this.text(L(T.mapHint), 22, { italic: true });
    hint.s.setPos(pw / 2 - 60 - hint.w / 2, -ph / 2 + 36);
  }

  // ---------- the journal ----------

  private journalTab(): void {
    const pw = this.pw, ph = this.ph;
    let sx = -pw / 2 + 64;
    const sy = ph / 2 - 124;
    for (const id of ['quests', 'beasts', 'notes'] as JournalTab[]) {
      const on = id === this.jtab;
      const label = id === 'quests' ? LT(JOURNAL_UI.quests) : id === 'beasts' ? LT(JOURNAL_UI.beasts) : LT(JOURNAL_UI.pages);
      const t = this.text(label, 28, { italic: true, bold: on, color: on ? [0.76, 0.23, 0.17] : undefined });
      t.s.setPos(sx + t.w / 2, sy);
      this.buttons.push({ x: sx + t.w / 2, y: sy, w: t.w + 24, h: 54, act: () => { this.jtab = id; this.sel = null; sfx.ui(); this.refresh(); } });
      sx += t.w + 40;
    }
    const top = ph / 2 - 168;
    if (this.jtab === 'quests') this.questsPage(top);
    else if (this.jtab === 'beasts') this.beastsPage(top);
    else this.notesPage(top);
  }

  private questsPage(top: number): void {
    const pw = this.pw, ph = this.ph;
    const x0 = -pw / 2 + 70, colW = pw * 0.48;
    const groups: { title: string; goal: string; done: boolean }[] = [];
    const last = Math.min(save.main, MAIN.length - 1);
    for (let i = 0; i <= last; i++) {
      const title = LT(MAIN[i].title);
      const g = groups[groups.length - 1];
      if (g && g.title === title) { g.goal = LT(MAIN[i].goal); g.done = i < save.main; }
      else groups.push({ title, goal: LT(MAIN[i].goal), done: i < save.main });
    }
    let y = top;
    const sides = this.sides?.() ?? [];
    const cur = groups.filter((g) => !g.done);
    const done = [...sides.filter((q) => q.done), ...groups.filter((g) => g.done).reverse()];
    y -= this.put(L(T.current), x0, y, 24, { italic: true }).h + 4;
    for (const g of cur) {
      y -= this.put(g.title, x0, y, 32, { bold: true, color: [0.76, 0.23, 0.17], maxWidth: colW }).h;
      y -= this.put(g.goal, x0 + 16, y, 25, { italic: true, maxWidth: colW - 16 }).h + 14;
    }
    for (const q of sides.filter((o) => !o.done)) {
      if (y < -ph / 2 + 120) break;
      y -= this.put(`◆ ${q.title}`, x0, y, 27, { bold: true, maxWidth: colW }).h;
      y -= this.put(q.goal, x0 + 26, y, 23, { italic: true, maxWidth: colW - 26 }).h + 10;
    }
    y -= 10;
    if (done.length) y -= this.put(L(T.done), x0, y, 24, { italic: true }).h + 4;
    for (const g of done) {
      if (y < -ph / 2 + 70) break;
      const t = this.put(`${g.title} — ${LT(JOURNAL_UI.done)}`, x0, y, 26, { maxWidth: colW });
      const s = this.dyn[this.dyn.length - 1];
      s.opacity = 0.55;
      y -= t.h + 6;
    }
    // progress
    const x1 = 40;
    let yy = top;
    const steles = save.steles.filter((i) => i < 100).length;
    const murals = FLOOR_IDS.filter((_, i) => save.steles.includes(100 + i)).length;
    const lines: [string, string][] = [
      [L(T.level), String(save.level)],
      [L(T.camps), `${save.camps.length} / ${CAMPS.length}`],
      [L(T.shrines), `${save.shrines.length} / ${SHRINES.length}`],
      [L(T.steles), `${steles} / ${STELES.length}`],
      [L(T.murals), `${murals} / ${FLOOR_IDS.length}`],
      [L(T.beasts), `${save.bestiary.length} / ${BEAST_ORDER.length}`],
      [L(T.inks), `${save.inks.length} / ${INK_ORDER.length}`],
      [L(T.bagLine), `${save.bag.length} / ${BAG_SIZE}`],
    ];
    yy -= this.put(L(T.progress), x1, yy, 30, { bold: true }).h + 10;
    for (const [a, b] of lines) {
      const t = this.put(a, x1, yy, 26);
      this.put(b, x1 + 380, yy, 26, { bold: true });
      yy -= t.h + 8;
    }
  }

  private beastsPage(top: number): void {
    const pw = this.pw, ph = this.ph;
    const x0 = -pw / 2 + 70;
    const rowH = Math.min(44, (top - (-ph / 2 + 50)) / 9);
    BEAST_ORDER.forEach((key, i) => {
      const known = save.bestiary.includes(key);
      const col = Math.floor(i / 9), row = i % 9;
      const x = x0 + col * 250, y = top - row * rowH;
      const name = known ? LT(BESTIARY[key].name) : LT(JOURNAL_UI.unknown);
      const on = this.sel === key;
      const t = this.put(name, x, y, 24, { bold: on, color: on ? [0.76, 0.23, 0.17] : undefined });
      if (!known) this.dyn[this.dyn.length - 1].opacity = 0.5;
      this.buttons.push({ x: x + 110, y: y - t.h / 2, w: 230, h: rowH, act: () => { this.sel = key; sfx.ui(); this.refresh(); } });
    });
    const key = this.sel ?? save.bestiary[save.bestiary.length - 1] ?? null;
    const cx = -pw / 2 + 600, cw = pw / 2 - 60 - cx;
    if (!key) {
      this.put(LT(JOURNAL_UI.unknownText), cx, top, 26, { italic: true, maxWidth: cw });
      return;
    }
    const known = save.bestiary.includes(key);
    const b = BESTIARY[key];
    let y = top;
    if (known) {
      const f = portrait(key);
      if (f) {
        const k = Math.min(200 / f.h, 240 / f.w);
        const s = this.add(new Sprite(f), 'pig', LAYER.ui + 33);
        s.mesh.scale.set(k, k, 1);
        s.setPos(cx + 120 - (f.ox + f.w / 2) * k, y - 110 - (f.oy + f.h / 2) * k);
        this.dyn.push(s);
      }
      const tx = cx + 270;
      let ty = y - 20;
      ty -= this.put(LT(b.name), tx, ty, 38, { bold: true, maxWidth: cw - 270 }).h + 4;
      this.put(`${LT(JOURNAL_UI.where)}${lang === 'fr' ? ' : ' : ': '}${LT(b.where)}`, tx, ty, 24, { italic: true, maxWidth: cw - 270 });
      y -= 240;
      this.put(LT(b.text), cx, y, 27, { maxWidth: cw });
    } else {
      y -= this.put(LT(JOURNAL_UI.unknown), cx, y, 38, { bold: true }).h + 10;
      this.put(LT(JOURNAL_UI.unknownText), cx, y, 26, { italic: true, maxWidth: cw });
    }
  }

  private notesPage(top: number): void {
    const pw = this.pw, ph = this.ph;
    const x0 = -pw / 2 + 70;
    type Note = { id: string; title: string; text: string; known: boolean };
    const notes: Note[] = [];
    STELES.forEach((st, i) => {
      const [title, ...rest] = LT(st).split('\n');
      notes.push({ id: 's' + i, title, text: rest.join('\n'), known: save.steles.includes(i) });
    });
    FLOOR_IDS.forEach((id, i) => {
      const place = id.startsWith('cave') ? L(T.cave) : L(T.temple);
      notes.push({ id: 'm' + i, title: `${L(T.mural)} · ${place}, ${L(T.floor)} ${id.endsWith('1') ? 1 : 2}`, text: MURALS[id] ? LT(MURALS[id]) : '', known: save.steles.includes(100 + i) });
    });
    for (const reg of Object.keys(REGION_LORE)) {
      notes.push({ id: 'r' + reg, title: REGIONS[reg]?.name[lang] ?? reg, text: LT(REGION_LORE[reg]), known: save.regions.includes(reg) });
    }
    const rows = Math.ceil(notes.length / 2);
    const rowH = Math.min(44, (top - (-ph / 2 + 50)) / rows);
    notes.forEach((n, i) => {
      const col = Math.floor(i / rows), row = i % rows;
      const x = x0 + col * 280, y = top - row * rowH;
      const on = this.sel === n.id;
      const t = this.put(n.known ? n.title : LT(JOURNAL_UI.unknown), x, y, 22, { bold: on, color: on ? [0.76, 0.23, 0.17] : undefined, maxWidth: 270 });
      if (!n.known) this.dyn[this.dyn.length - 1].opacity = 0.5;
      this.buttons.push({ x: x + 130, y: y - t.h / 2, w: 270, h: rowH, act: () => { this.sel = n.id; sfx.ui(); this.refresh(); } });
    });
    const cx = -pw / 2 + 660, cw = pw / 2 - 60 - cx;
    const n = notes.find((q) => q.id === this.sel) ?? notes.find((q) => q.known);
    if (!n || !n.known) {
      this.put(LT(JOURNAL_UI.noPage), cx, top, 26, { italic: true, maxWidth: cw });
      return;
    }
    let y = top;
    y -= this.put(n.title, cx, y, 34, { bold: true, maxWidth: cw }).h + 14;
    this.put(n.text, cx, y, 28, { italic: true, maxWidth: cw });
  }

  // ---------- settings ----------

  private settingsTab(): void {
    const pw = this.pw, ph = this.ph;
    const x0 = -pw / 2 + 70, xc = x0 + 360;
    let y = ph / 2 - 150;
    const rowH = Math.min(92, (ph - 230) / 6);
    const slider = (label: string, get: () => number, set: (v: number) => void) => {
      this.put(label, x0, y + 18, 28);
      const v = Math.round(get() * 10);
      this.button('−', xc + 40, y, () => { set(Math.max(0, (v - 1) / 10)); saveSettings(); sfx.ui(); this.refresh(); }, 70);
      this.put('●'.repeat(v) + '○'.repeat(10 - v), xc + 90, y + 18, 26, { color: [0.76, 0.23, 0.17] });
      this.button('+', xc + 400, y, () => { set(Math.min(1, (v + 1) / 10)); saveSettings(); sfx.ui(); this.refresh(); }, 70);
      y -= rowH;
    };
    const toggle = (label: string, get: () => boolean, set: (v: boolean) => void) => {
      this.put(label, x0, y + 18, 28);
      this.button(get() ? L(T.on) : L(T.off), xc + 110, y, () => { set(!get()); saveSettings(); sfx.ui(); this.refresh(); }, 200);
      y -= rowH;
    };
    slider(L(T.music), () => settings.music, (v) => (settings.music = v));
    slider(L(T.sfx), () => settings.sfx, (v) => (settings.sfx = v));
    toggle(L(T.shake), () => settings.shake, (v) => (settings.shake = v));
    toggle(L(T.minimap), () => settings.minimap, (v) => (settings.minimap = v));
    this.put(L(T.language), x0, y + 18, 28);
    this.button(lang === 'fr' ? 'Français ●' : 'Français', xc + 110, y, () => { if (lang !== 'fr') { setLang('fr'); location.reload(); } }, 200);
    this.button(lang === 'en' ? 'English ●' : 'English', xc + 330, y, () => { if (lang !== 'en') { setLang('en'); location.reload(); } }, 200);
    y -= rowH;
    this.button(this.sure ? L(T.sure) : L(T.newGame), xc + (this.sure ? 230 : 110), y, () => {
      if (!this.sure) { this.sure = true; sfx.ui(); this.refresh(); return; }
      resetSave();
      try { localStorage.removeItem('trait.progress.v1'); } catch { /* ignore */ }
      location.reload();
    }, this.sure ? 440 : 260);
    // controls
    const cx = 160;
    let cy = ph / 2 - 140;
    cy -= this.put(L(T.controls), cx, cy, 30, { bold: true }).h + 10;
    const list = this.device() === 'touch' ? CONTROLS_TOUCH : CONTROLS_KBM;
    for (const line of list[lang]) cy -= this.put(line, cx, cy, 24, { italic: true, maxWidth: pw / 2 - 60 - cx }).h + 6;
  }

  private button(label: string, x: number, y: number, act: () => void, width = 240): void {
    if (!this.btnFrame) {
      const p = new Painter(280, 100, 1, -140, -50);
      p.glaze();
      washPoly(p, roughen([[-120, -34], [120, -34], [120, 34], [-120, 34]], 4, 59, 12), { pig: INK, density: 0.1, soft: 0.2, edge: 0.6, seed: 59 });
      stroke(p, [[-118, -30], [0, -34], [118, -28]], { width: 5, load: 0.8, dry: 0.5, seed: 60 });
      this.btnFrame = frameFrom(p);
    }
    const bg = this.add(new Sprite(this.btnFrame), 'pig', LAYER.ui + 32);
    bg.setPos(x, y);
    bg.mesh.scale.set(width / 240, 0.85, 1);
    this.dyn.push(bg);
    const t = this.text(label, 26, { bold: true, align: 'center' });
    t.s.setPos(x, y + 2);
    this.buttons.push({ x, y, w: width, h: 66, act });
  }

  update(): void {
    if (!this.active) return;
    const inp = this.input;
    if (inp.pressed('back') || (inp.keyPressed('KeyM') && this.tab === 'map') || (inp.keyPressed('KeyJ') && this.tab === 'journal')) { this.close(); return; }
    if (inp.keyPressed('KeyM')) { this.open('map'); inp.swallow(); return; }
    if (inp.keyPressed('KeyJ')) { this.open('journal'); inp.swallow(); return; }
    if (inp.keyPressed('KeyI')) { this.close(); this.onBag?.(); return; }
    if (inp.keyPressed('KeyC')) { this.close(); this.onTree?.(); return; }
    if (inp.keyPressed('Tab')) {
      const order: MenuTab[] = ['map', 'journal', 'settings'];
      this.open(order[(order.indexOf(this.tab) + 1) % order.length]);
      inp.swallow();
      return;
    }
    for (const [sx, sy] of inp.orderTaps) {
      const [ux, uy] = inp.toUi(sx, sy);
      this.tap(ux, uy);
      if (!this.active) break;
    }
    inp.swallow();
  }

  private tap(x: number, y: number): void {
    const pw = this.pw, ph = this.ph;
    if (Math.abs(x) > pw / 2 || Math.abs(y) > ph / 2 || Math.hypot(x - (pw / 2 - 52), y - (ph / 2 - 50)) < 50) { this.close(); return; }
    for (const b of this.buttons) {
      if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2) { b.act(); return; }
    }
  }
}
