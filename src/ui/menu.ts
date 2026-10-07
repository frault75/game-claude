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
import { brushText, textWidth, SERIF } from '../gfx/text';
import { maskSprite } from './mask';
import { MapSource, sheet, seen, drawMark, drawLabel, Mark, MarkKind } from './mapArt';
import { portrait } from '../gfx/gen/portraits';
import { save, resetSave, BAG_SIZE } from '../game/progression';
import { settings, saveSettings } from '../game/settings';
import { controlsList } from '../game/controls';
import { MAIN, STELES, MURALS, BESTIARY, REGION_LORE, JOURNAL_UI, L as LT } from '../i18n/lore';
import { REGION_LORE2 } from '../i18n/lore2';
import { REGION_LORE3 } from '../i18n/lore3';
import { T2_REGIONS } from '../world/terraces';
import { P3_REGIONS } from '../world/peaks';
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
  style: { fr: 'Style de jeu', en: 'Play style' },
  styleAction: { fr: 'Action', en: 'Action' },
  styleBrush: { fr: 'Pinceau', en: 'Brush' },
  language: { fr: 'Langue', en: 'Language' },
  on: { fr: 'Oui', en: 'On' },
  off: { fr: 'Non', en: 'Off' },
  newGame: { fr: 'Nouvelle partie', en: 'New game' },
  sure: { fr: 'Tout effacer ? Touche encore', en: 'Erase everything? Tap again' },
  controls: { fr: 'Commandes', en: 'Controls' },
  mural: { fr: 'Fresque', en: 'Mural' },
  cave: { fr: 'Grotte', en: 'Cave' },
  temple: { fr: 'Temple', en: 'Temple' },
  basin: { fr: 'Grand Bassin', en: 'Great Basin' },
  pagoda: { fr: 'Pagode céleste', en: 'Sky Pagoda' },
  heart: { fr: 'Cœur de la montagne', en: 'Heart of the Mountain' },
  legend: { fr: 'sanctuaire · camp · quête · stèle · gardien', en: 'shrine · camp · quest · stele · guardian' },
};
const L = (x: { fr: string; en: string }) => x[lang];


/** The bestiary in the order the journey meets it (anything left out comes last). */
const BEAST_ORDER = (() => {
  const order = [
    'blot', 'mite', 'wisp', 'crow', 'scarecrow', 'splitter', 'totem', 'moth', 'boar', 'fox', 'brute', 'eel', 'crab', 'stag', 'bat', 'grub', 'soldier', 'lantern', 'mother', 'ram king', 'warden',
    'frog', 'goat', 'wraith', 'mantis', 'tadpole', 'kappa', 'tanuki', 'monk', 'bell', 'toad', 'queen', 'inkheron', 'faceless',
    'yeti', 'snowfox', 'crane', 'eraser', 'snowking', 'dragon', 'sketch', 'hand',
  ].filter((k) => BESTIARY[k]);
  return [...order, ...Object.keys(BESTIARY).filter((k) => !order.includes(k))];
})();
/** Dungeon floors with a mural, in the order the dungeons save them (save.steles holds 100 + index). */
const FLOOR_IDS = ['cave1', 'cave2', 'temple1', 'temple2', 'basin1', 'basin2', 'pagoda1', 'pagoda2', 'pagoda3', 'heart1', 'heart2', 'heart3'];
const RED: [number, number, number] = [0.76, 0.23, 0.17];

export const MENU_TABS: MenuTab[] = ['map', 'journal', 'bag', 'tree', 'settings'];

/** How big a sheet (menu, bag, tree, stall) is: wide on a landscape screen, tall on an upright phone. */
export function sheetSize(r: Renderer): { pw: number; ph: number; tall: boolean } {
  const tall = r.uiH > r.uiW * 1.2;
  if (tall) return { pw: r.uiW - 30, ph: Math.min(1500, r.uiH - 190), tall };
  return { pw: Math.min(1560, r.uiW - 40), ph: Math.min(860, r.uiH - 40), tall };
}

/** The row of tabs at the top of every sheet (menu, bag, tree); returns where each tab is. */
export function tabStrip(r: Renderer, pw: number, ph: number, active: MenuTab, keep: (s: Sprite) => void): { id: MenuTab; x: number; y: number; w: number; h: number }[] {
  // the tabs shrink until they fit beside the close mark
  let size = 34, gap = 46;
  const width = () => MENU_TABS.reduce((n, id) => n + textWidth(L(T[id]), size, id === active ? 700 : 400), 0) + gap * (MENU_TABS.length - 1);
  while (size > 20 && width() > pw - 170) { size -= 3; gap = Math.max(12, gap - 12); }
  let tx = -pw / 2 + (size < 34 ? 36 : 56);
  const ty = ph / 2 - 50;
  const out: { id: MenuTab; x: number; y: number; w: number; h: number }[] = [];
  for (const id of MENU_TABS) {
    const on = id === active;
    const art = brushText(L(T[id]), { size, ppu: 1.4, weight: on ? 700 : 400, color: on ? RED : undefined, lineHeight: 1.25 });
    const s = new Sprite(art);
    s.mesh.renderOrder = LAYER.ui + 33;
    (on ? r.uiAcc : r.uiPig).add(s.mesh);
    s.setPos(tx + art.w / 2, ty);
    keep(s);
    out.push({ id, x: tx + art.w / 2, y: ty, w: art.w + Math.min(30, gap), h: 70 });
    tx += art.w + gap;
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
  /** An upright phone: one column, the details under the lists. */
  private tall = false;
  /** Which page of a long list (bestiary, notebook). */
  private page = 0;
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
    const { pw, ph, tall } = sheetSize(r);
    this.pw = pw;
    this.ph = ph;
    this.tall = tall;
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
    this.sprites.push(m, maskSprite(r, tall ? r.uiW + 240 : pw + 30, ph + 30, 'cover'));
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
    const pw = this.pw, ph = this.ph, tall = this.tall;
    const v = this.view?.();
    // an upright phone: the place gets its own line under the tabs, the legend two lines at the bottom
    const top = tall ? ph / 2 - 160 : ph / 2 - 108, bottom = tall ? -ph / 2 + 180 : -ph / 2 + 64;
    if (v?.place) {
      if (tall) this.put(v.place, -pw / 2 + 50, ph / 2 - 104, 26, { italic: true, maxWidth: pw - 100 });
      else this.put(v.place, pw / 2 - 60 - Math.min(600, pw * 0.4), ph / 2 - 36, 26, { italic: true, maxWidth: Math.min(600, pw * 0.4) });
    }
    if (!v?.src) {
      this.put(L(T.noMap), -pw / 2 + 70, top - 20, 30, { italic: true, maxWidth: pw - 140 });
      return;
    }
    const src = v.src;
    const aw = pw - (tall ? 60 : 120), ah = top - bottom;
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
      if (mk.kind !== 'quest' && !mk.always && !seen(src, mk.x, mk.y)) continue;
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
    // legend (wrapping onto a second line on a narrow sheet)
    const lc = document.createElement('canvas');
    const lx = lc.getContext('2d')!;
    const kinds: MarkKind[] = ['shrineOn', 'camp', 'quest', 'stele', 'boss'];
    const names = L(T.legend).split(' · ');
    const font = `italic 22px ${SERIF}`;
    const lw = Math.min(900, pw - 80);
    lx.font = font;
    const spots: [number, number][] = [];
    let x0 = 20, row = 0;
    kinds.forEach((_, i) => {
      const w = 40 + lx.measureText(names[i] ?? '').width;
      if (x0 > 20 && x0 + w - 20 > lw) { x0 = 20; row++; }
      spots.push([x0, 22 + row * 44]);
      x0 += w;
    });
    lc.width = lw;
    lc.height = 44 * (row + 1);
    kinds.forEach((kind, i) => {
      const [lx0, ly] = spots[i];
      drawMark(lx, { x: 0, y: 0, kind } as Mark, lx0, ly, 11);
      lx.font = font;
      lx.fillStyle = 'rgba(40,36,32,0.9)';
      lx.textBaseline = 'middle';
      lx.fillText(names[i] ?? '', lx0 + 18, ly + 1);
    });
    const ltex = makeTexture(lc);
    this.texs.push(ltex);
    const lh = lc.height;
    const ls = this.add(new Sprite({ tex: ltex, w: lw, h: lh, ox: -lw / 2, oy: -lh / 2 }), 'acc', LAYER.ui + 33);
    ls.setPos(tall ? 0 : -pw / 2 + 60 + lw / 2, tall ? -ph / 2 + 76 + lh / 2 : -ph / 2 + 36);
    this.dyn.push(ls);
    const hint = this.text(L(T.mapHint), 22, { italic: true, maxWidth: pw - 80 });
    hint.s.setPos(tall ? 0 : pw / 2 - 60 - hint.w / 2, -ph / 2 + 36);
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
      this.buttons.push({ x: sx + t.w / 2, y: sy, w: t.w + 24, h: 54, act: () => { this.jtab = id; this.sel = null; this.page = 0; sfx.ui(); this.refresh(); } });
      sx += t.w + 40;
    }
    const top = ph / 2 - 168;
    if (this.jtab === 'quests') this.questsPage(top);
    else if (this.jtab === 'beasts') this.beastsPage(top);
    else this.notesPage(top);
  }

  private questsPage(top: number): void {
    const pw = this.pw, ph = this.ph, tall = this.tall;
    const x0 = -pw / 2 + (tall ? 40 : 70), colW = tall ? pw - 80 : pw * 0.48;
    const steles = save.steles.filter((i) => i < 100).length;
    const murals = FLOOR_IDS.filter((_, i) => save.steles.includes(100 + i)).length;
    const lines: [string, string][] = [
      [L(T.level), String(save.level)],
      [L(T.camps), `${save.camps.length} / ${CAMPS.length}`],
      [L(T.shrines), `${save.shrines.length} / ${SHRINES.length}`],
      [L(T.steles), `${steles} / ${STELES.length}`],
      [L(T.murals), `${murals} / ${FLOOR_IDS.length}`],
      [L(T.beasts), `${save.bestiary.filter((k) => BESTIARY[k]).length} / ${BEAST_ORDER.length}`],
      [L(T.inks), `${save.inks.length} / ${INK_ORDER.length}`],
      [L(T.bagLine), `${save.bag.length} / ${BAG_SIZE}`],
    ];
    // progress: a column on the right, or a block at the bottom of an upright phone
    const short = tall || ph < 800;
    const ps = short ? 23 : 26, step = ps * 1.25 + (short ? 6 : 14);
    const progTop = tall ? -ph / 2 + 50 + lines.length * step + 56 : top;
    const floor = tall ? progTop + 24 : -ph / 2 + 70;
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
      y -= this.put(g.title, x0, y, 32, { bold: true, color: RED, maxWidth: colW }).h;
      y -= this.put(g.goal, x0 + 16, y, 25, { italic: true, maxWidth: colW - 16 }).h + 14;
    }
    for (const q of sides.filter((o) => !o.done)) {
      if (y < floor + 50) break;
      y -= this.put(`◆ ${q.title}`, x0, y, 27, { bold: true, maxWidth: colW }).h;
      y -= this.put(q.goal, x0 + 26, y, 23, { italic: true, maxWidth: colW - 26 }).h + 10;
    }
    y -= 10;
    if (done.length && y > floor + 40) y -= this.put(L(T.done), x0, y, 24, { italic: true }).h + 4;
    for (const g of done) {
      if (y < floor) break;
      const t = this.put(`${g.title} — ${LT(JOURNAL_UI.done)}`, x0, y, 26, { maxWidth: colW });
      const s = this.dyn[this.dyn.length - 1];
      s.opacity = 0.55;
      y -= t.h + 6;
    }
    const x1 = tall ? x0 : 40, xv = tall ? pw / 2 - 150 : x1 + 380;
    let yy = progTop;
    yy -= this.put(L(T.progress), x1, yy, 30, { bold: true }).h + (tall ? -6 : 10);
    for (const [a, b] of lines) {
      this.put(a, x1, yy, ps);
      this.put(b, xv, yy, ps, { bold: true });
      yy -= step;
    }
  }

  /** Names in columns, a page at a time (◂ n / m ▸ under them when they run over); tapping one picks it. */
  private listPage(items: { id: string; label: string; known: boolean }[], x0: number, top: number, bottom: number, cols: number, colW: number, size: number): void {
    const rowH = 44;
    let rows = Math.max(1, Math.min(Math.floor((top - bottom) / rowH), Math.ceil(items.length / cols)));
    if (items.length > rows * cols) rows = Math.max(1, Math.floor((top - bottom - 70) / rowH));
    const per = rows * cols, pages = Math.max(1, Math.ceil(items.length / per));
    this.page = Math.max(0, Math.min(this.page, pages - 1));
    items.slice(this.page * per, (this.page + 1) * per).forEach((it, k) => {
      const x = x0 + Math.floor(k / rows) * colW, y = top - (k % rows) * rowH;
      const on = this.sel === it.id;
      // one line each: a long name is written smaller
      const label = it.known ? it.label : LT(JOURNAL_UI.unknown);
      let sz = size;
      while (sz > 16 && textWidth(label, sz, on ? 700 : 400) > colW - 16) sz--;
      const t = this.put(label, x, y, sz, { bold: on, color: on ? RED : undefined });
      if (!it.known) this.dyn[this.dyn.length - 1].opacity = 0.5;
      this.buttons.push({ x: x + (colW - 16) / 2, y: y - t.h / 2, w: colW - 16, h: rowH, act: () => { this.sel = it.id; sfx.ui(); this.refresh(); } });
    });
    if (pages < 2) return;
    const py = top - rows * rowH - 34, mid = x0 + (cols * colW) / 2 - 20;
    const turn = (d: number) => () => { this.page = (this.page + d + pages) % pages; sfx.ui(); this.refresh(); };
    this.button('◂', mid - 110, py, turn(-1), 90);
    this.button('▸', mid + 110, py, turn(1), 90);
    const t = this.text(`${this.page + 1} / ${pages}`, 24, { italic: true, align: 'center' });
    t.s.setPos(mid, py);
  }

  private beastsPage(top: number): void {
    const pw = this.pw, ph = this.ph, tall = this.tall;
    const x0 = -pw / 2 + (tall ? 40 : 70);
    // the list on the left (on top of an upright phone), the page on the right (under it)
    const listBottom = tall ? top - 570 : -ph / 2 + 50;
    this.listPage(BEAST_ORDER.map((k) => ({ id: k, label: LT(BESTIARY[k].name), known: save.bestiary.includes(k) })), x0, top, listBottom, 2, tall ? (pw - 80) / 2 : 250, 24);
    const key = this.sel ?? [...save.bestiary].reverse().find((k) => BESTIARY[k]) ?? null;
    const cx = tall ? x0 : -pw / 2 + 600, cw = tall ? pw - 80 : pw / 2 - 60 - cx;
    let y = tall ? listBottom - 10 : top;
    if (!key) {
      this.put(LT(JOURNAL_UI.unknownText), cx, y, 26, { italic: true, maxWidth: cw });
      return;
    }
    const known = save.bestiary.includes(key);
    const b = BESTIARY[key];
    if (known) {
      const f = portrait(key);
      const pwid = tall ? 200 : 240, phei = tall ? 170 : 200;
      if (f) {
        const k = Math.min(phei / f.h, pwid / f.w);
        const s = this.add(new Sprite(f), 'pig', LAYER.ui + 33);
        s.mesh.scale.set(k, k, 1);
        s.setPos(cx + pwid / 2 - (f.ox + f.w / 2) * k, y - phei / 2 - 10 - (f.oy + f.h / 2) * k);
        this.dyn.push(s);
      }
      const tx = cx + pwid + 30;
      let ty = y - 20;
      ty -= this.put(LT(b.name), tx, ty, tall ? 32 : 38, { bold: true, maxWidth: cw - pwid - 30 }).h + 4;
      this.put(`${LT(JOURNAL_UI.where)}${lang === 'fr' ? ' : ' : ': '}${LT(b.where)}`, tx, ty, 24, { italic: true, maxWidth: cw - pwid - 30 });
      y -= phei + 40;
      this.put(LT(b.text), cx, y, tall ? 25 : 27, { maxWidth: cw });
    } else {
      y -= this.put(LT(JOURNAL_UI.unknown), cx, y, 38, { bold: true }).h + 10;
      this.put(LT(JOURNAL_UI.unknownText), cx, y, 26, { italic: true, maxWidth: cw });
    }
  }

  private notesPage(top: number): void {
    const pw = this.pw, ph = this.ph, tall = this.tall;
    const x0 = -pw / 2 + (tall ? 40 : 70);
    type Note = { id: string; label: string; text: string; known: boolean };
    const notes: Note[] = [];
    STELES.forEach((st, i) => {
      const [title, ...rest] = LT(st).split('\n');
      notes.push({ id: 's' + i, label: title, text: rest.join('\n'), known: save.steles.includes(i) });
    });
    FLOOR_IDS.forEach((id, i) => {
      const kind = id.replace(/\d+$/, '') as 'cave' | 'temple' | 'basin' | 'pagoda' | 'heart';
      notes.push({ id: 'm' + i, label: `${L(T.mural)} · ${L(T[kind])} ${id.slice(-1)}`, text: MURALS[id] ? LT(MURALS[id]) : '', known: save.steles.includes(100 + i) });
    });
    for (const reg of Object.keys(REGION_LORE)) notes.push({ id: 'r' + reg, label: REGIONS[reg]?.name[lang] ?? reg, text: LT(REGION_LORE[reg]), known: save.regions.includes(reg) });
    for (const reg of Object.keys(REGION_LORE2)) notes.push({ id: 'r2' + reg, label: T2_REGIONS[reg]?.name[lang] ?? reg, text: LT(REGION_LORE2[reg]), known: save.regions.includes('t2' + reg) });
    for (const reg of Object.keys(REGION_LORE3)) notes.push({ id: 'r3' + reg, label: P3_REGIONS[reg]?.name[lang] ?? reg, text: LT(REGION_LORE3[reg]), known: save.regions.includes('p3' + reg) });
    const listBottom = tall ? top - 520 : -ph / 2 + 50;
    this.listPage(notes, x0, top, listBottom, 2, tall ? (pw - 80) / 2 : 280, 22);
    const cx = tall ? x0 : -pw / 2 + 660, cw = tall ? pw - 80 : pw / 2 - 60 - cx;
    let y = tall ? listBottom - 10 : top;
    const n = notes.find((q) => q.id === this.sel) ?? notes.find((q) => q.known);
    if (!n || !n.known) {
      this.put(LT(JOURNAL_UI.noPage), cx, y, 26, { italic: true, maxWidth: cw });
      return;
    }
    y -= this.put(n.label, cx, y, tall ? 30 : 34, { bold: true, maxWidth: cw }).h + (tall ? 4 : 14);
    this.put(n.text, cx, y, tall ? 25 : 28, { italic: true, maxWidth: cw });
  }

  // ---------- settings ----------

  private settingsTab(): void {
    const pw = this.pw, ph = this.ph, tall = this.tall;
    // an upright phone: narrower controls beside the labels, and the list of keys under the rows
    const x0 = -pw / 2 + (tall ? 40 : 70), xc = tall ? -10 : x0 + 360;
    let y = ph / 2 - 150;
    const rowH = tall ? 76 : Math.min(92, (ph - 230) / 7);
    const [bw, b1, b2] = tall ? [150, 80, 240] : [200, 110, 330];
    const slider = (label: string, get: () => number, set: (v: number) => void) => {
      this.put(label, x0, y + 18, 28);
      const v = Math.round(get() * 10);
      this.button('−', xc + (tall ? 30 : 40), y, () => { set(Math.max(0, (v - 1) / 10)); saveSettings(); sfx.ui(); this.refresh(); }, 70);
      this.put('●'.repeat(v) + '○'.repeat(10 - v), xc + (tall ? 70 : 90), y + 18, tall ? 24 : 26, { color: RED });
      this.button('+', xc + (tall ? 290 : 400), y, () => { set(Math.min(1, (v + 1) / 10)); saveSettings(); sfx.ui(); this.refresh(); }, 70);
      y -= rowH;
    };
    const toggle = (label: string, get: () => boolean, set: (v: boolean) => void) => {
      this.put(label, x0, y + 18, 28, { maxWidth: xc - x0 - 10 });
      this.button(get() ? L(T.on) : L(T.off), xc + b1, y, () => { set(!get()); saveSettings(); sfx.ui(); this.refresh(); }, bw);
      y -= rowH;
    };
    slider(L(T.music), () => settings.music, (v) => (settings.music = v));
    slider(L(T.sfx), () => settings.sfx, (v) => (settings.sfx = v));
    toggle(L(T.shake), () => settings.shake, (v) => (settings.shake = v));
    toggle(L(T.minimap), () => settings.minimap, (v) => (settings.minimap = v));
    // move + buttons, or strokes drawn freely
    this.put(L(T.style), x0, y + 18, 28);
    const pick = (st: 'action' | 'brush') => () => { if (settings.style !== st) { settings.style = st; saveSettings(); sfx.ui(); this.refresh(); } };
    this.button(settings.style === 'action' ? `${L(T.styleAction)} ●` : L(T.styleAction), xc + b1, y, pick('action'), bw);
    this.button(settings.style === 'brush' ? `${L(T.styleBrush)} ●` : L(T.styleBrush), xc + b2, y, pick('brush'), bw);
    y -= rowH;
    this.put(L(T.language), x0, y + 18, 28);
    this.button(lang === 'fr' ? 'Français ●' : 'Français', xc + b1, y, () => { if (lang !== 'fr') { setLang('fr'); location.reload(); } }, bw);
    this.button(lang === 'en' ? 'English ●' : 'English', xc + b2, y, () => { if (lang !== 'en') { setLang('en'); location.reload(); } }, bw);
    y -= rowH;
    this.button(this.sure ? L(T.sure) : L(T.newGame), tall ? 0 : xc + (this.sure ? 230 : 110), y, () => {
      if (!this.sure) { this.sure = true; sfx.ui(); this.refresh(); return; }
      resetSave();
      try { localStorage.removeItem('trait.progress.v1'); } catch { /* ignore */ }
      location.reload();
    }, this.sure ? 440 : tall ? 300 : 260);
    // controls
    const cx = tall ? x0 : 160, size = tall ? 22 : 24;
    let cy = tall ? y - 56 : ph / 2 - 140;
    cy -= this.put(L(T.controls), cx, cy, 30, { bold: true }).h + (tall ? -4 : 10);
    for (const line of controlsList(this.device(), settings.style === 'action')) {
      const t = this.put(line, cx, cy, size, { italic: true, maxWidth: pw / 2 - 50 - cx });
      cy -= tall ? t.h - size * 0.8 + 6 : t.h + 6;
    }
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
    inp.consume();
  }

  private tap(x: number, y: number): void {
    const pw = this.pw, ph = this.ph;
    if (Math.abs(x) > pw / 2 || Math.abs(y) > ph / 2 || Math.hypot(x - (pw / 2 - 52), y - (ph / 2 - 50)) < 50) { this.close(); return; }
    for (const b of this.buttons) {
      if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2) { b.act(); return; }
    }
  }
}
