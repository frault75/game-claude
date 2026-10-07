/**
 * Side quests: offered by people, followed step by step (talk, find, defeat, prove), sometimes with
 * a choice that changes how they end. Progress lives in the save; things to find appear in the world
 * only while a quest looks for them.
 */
import type { Game } from './game';
import type { Tr, TrList } from '../i18n/lore';
import { save, writeSave } from './progression';
import { questItem, Rarity, makeItem } from './items';
import { ItemDrop, takeItem } from './loot';
import { sfx } from '../audio/sfx';
import { giveXp } from './rewards';
import { lang } from '../i18n';
import { QuestThing, ThingId } from './questThing';
import type { Mark } from '../ui/mapArt';
import type { Choice } from '../ui/dialog';

export type { ThingId };
export type QState = Save['quests'][string];
type Save = typeof save;

export interface Where {
  room: string;
  x?: number;
  y?: number;
  /** A named place the room knows how to find (dungeon floors are generated). */
  spot?: string;
}

export interface Stage {
  goal: Tr;
  kind: 'talk' | 'find' | 'kill' | 'event';
  npc?: string | string[];
  /** What is said when this step is done (by whoever was talked to). */
  say?: TrList | ((npc: string, q: QState) => TrList);
  choices?: { label: Tr; c: string }[];
  thing?: ThingId;
  /** Read when the thing is picked up (a letter, a carving…). */
  read?: { name: Tr; text: TrList };
  at?: Where;
  label?: string;
  count?: number;
  event?: string;
  /** Count distinct values (shrines visited…) instead of occurrences. */
  distinct?: boolean;
  /** Which step comes next (default: the following one; 'end' finishes the quest). */
  next?: (q: QState, npc?: string) => number | 'end';
}

export interface Reward {
  xp: number;
  item?: string;
  rarity?: Rarity;
  perk?: [string, number, Tr];
}

export interface QuestDef {
  id: string;
  title: Tr;
  giver: string;
  available: () => boolean;
  offer: TrList;
  accept: Tr;
  later: Tr;
  stages: Stage[];
  reward: (q: QState) => Reward;
}

const tr = (x: Tr) => x[lang];
const trl = (x: TrList) => x[lang];
const UI = {
  newQ: { fr: 'Nouvelle quête', en: 'New quest' },
  upd: { fr: 'Quête', en: 'Quest' },
  done: { fr: 'Quête accomplie', en: 'Quest complete' },
  got: { fr: 'Reçu', en: 'Received' },
};

export class Questbook {
  private defs: QuestDef[] = [];
  private things: QuestThing[] = [];

  constructor(private g: Game) {}

  register(defs: QuestDef[]): void {
    this.defs.push(...defs);
  }

  all(): QuestDef[] {
    return this.defs;
  }

  state(id: string): QState | undefined {
    return save.quests[id];
  }

  active(): { def: QuestDef; q: QState; st: Stage }[] {
    const out: { def: QuestDef; q: QState; st: Stage }[] = [];
    for (const def of this.defs) {
      const q = save.quests[def.id];
      if (q && !q.done) out.push({ def, q, st: def.stages[q.s] });
    }
    return out;
  }

  private matches(st: Stage, npc: string): boolean {
    return st.kind === 'talk' && (Array.isArray(st.npc) ? st.npc.includes(npc) : st.npc === npc);
  }

  /** Someone has something to say about a quest (the seal over their head). */
  wants(npc: string): boolean {
    if (this.active().some((a) => this.matches(a.st, npc))) return true;
    return this.defs.some((d) => d.giver === npc && !save.quests[d.id] && d.available());
  }

  /** Talking to someone: a quest step or an offer first; false if they have nothing quest-related. */
  talk(npc: string, speak: (pages: string[], after?: () => void, choices?: Choice[]) => void): boolean {
    for (const a of this.active()) {
      if (!this.matches(a.st, npc)) continue;
      const pages = a.st.say ? trl(typeof a.st.say === 'function' ? a.st.say(npc, a.q) : a.st.say) : [];
      if (a.st.choices?.length) {
        speak(pages.length ? pages : ['…'], undefined, a.st.choices.map((c) => ({ label: tr(c.label), act: () => { a.q.c = c.c; this.advance(a.def, a.q, npc); } })));
      } else speak(pages.length ? pages : ['…'], () => this.advance(a.def, a.q, npc));
      return true;
    }
    for (const def of this.defs) {
      if (def.giver !== npc || save.quests[def.id] || !def.available()) continue;
      speak(trl(def.offer), undefined, [
        { label: tr(def.accept), act: () => this.start(def) },
        { label: tr(def.later), act: () => {} },
      ]);
      return true;
    }
    return false;
  }

  private start(def: QuestDef): void {
    save.quests[def.id] = { s: 0, n: 0 };
    writeSave();
    sfx.uiConfirm();
    this.g.hud.showHint(`${tr(UI.newQ)} : ${tr(def.title)}`, 3.5);
    this.populate();
  }

  private advance(def: QuestDef, q: QState, npc?: string): void {
    const st = def.stages[q.s];
    const nx = st.next ? st.next(q, npc) : q.s + 1;
    if (nx === 'end' || nx >= def.stages.length) { this.complete(def, q); return; }
    q.s = nx;
    q.n = 0;
    q.seen = [];
    writeSave();
    sfx.ui();
    this.g.hud.showHint(`${tr(UI.upd)} — ${tr(def.title)} : ${tr(def.stages[nx].goal)}`, 4);
    this.populate();
  }

  private complete(def: QuestDef, q: QState): void {
    q.done = true;
    writeSave();
    const g = this.g;
    const rw = def.reward(q);
    sfx.uiConfirm();
    g.hud.showHint(`${tr(UI.done)} : ${tr(def.title)}  +${rw.xp}`, 4);
    giveXp(g, rw.xp);
    const p = g.player;
    const it = rw.item ? questItem(rw.item, Math.max(2, Math.min(10, save.level))) : rw.rarity ? makeItem(Math.max(2, Math.min(10, save.level)), rw.rarity) : null;
    if (it && !takeItem(g, it)) {
      const d = g.world.add(new ItemDrop(p.x, p.y, it));
      d.onTake = (item) => takeItem(g, item);
    }
    if (rw.perk) {
      const [k, v, text] = rw.perk;
      if (k === 'coins') save.coins += v;
      else save.perks[k] = (save.perks[k] ?? 0) + v;
      if (k === 'gourd') { save.gourdMax += v; save.gourd += v; }
      writeSave();
      g.after(1.6, () => g.hud.showHint(tr(text), 4));
    }
    this.populate();
  }

  /** A creature fell. */
  onKill(label: string): void {
    for (const a of this.active()) {
      if (a.st.kind !== 'kill' || (a.st.label !== label && !(a.st.label === 'blot' && label === 'blotlet'))) continue;
      a.q.n++;
      writeSave();
      if (a.q.n >= (a.st.count ?? 1)) this.advance(a.def, a.q);
      else this.g.hud.showHint(`${tr(a.def.title)} : ${a.q.n}/${a.st.count ?? 1}`, 1.6);
    }
  }

  /** Something happened (an ensō around many foes, a shrine touched, a long combo…). */
  event(key: string, value = 0): void {
    for (const a of this.active()) {
      if (a.st.kind !== 'event' || a.st.event !== key) continue;
      if (a.st.distinct) {
        a.q.seen = a.q.seen ?? [];
        if (a.q.seen.includes(value)) continue;
        a.q.seen.push(value);
        a.q.n = a.q.seen.length;
      } else a.q.n++;
      writeSave();
      if (a.q.n >= (a.st.count ?? 1)) this.advance(a.def, a.q);
      else this.g.hud.showHint(`${tr(a.def.title)} : ${a.q.n}/${a.st.count ?? 1}`, 1.6);
    }
  }

  /** A thing was picked up. */
  found(thing: ThingId): void {
    for (const a of this.active()) {
      if (a.st.kind !== 'find' || a.st.thing !== thing) continue;
      sfx.inkstone();
      const go = () => this.advance(a.def, a.q);
      if (a.st.read) this.g.talk({ name: tr(a.st.read.name) }, trl(a.st.read.text), go);
      else go();
      return;
    }
  }

  private where(w: Where): [number, number] | null {
    if (w.x !== undefined && w.y !== undefined) return [w.x, w.y];
    if (w.spot) return this.g.roomSpot?.(w.spot) ?? null;
    return null;
  }

  /** Put in the world what the current steps look for (call after a room is built). */
  populate(): void {
    const g = this.g;
    const room = g.room?.id;
    for (const t of this.things) if (!t.dead) t.destroy();
    this.things = [];
    if (!room) return;
    for (const a of this.active()) {
      if (a.st.kind !== 'find' || !a.st.thing || a.st.at?.room !== room) continue;
      const at = this.where(a.st.at);
      if (!at) continue;
      const t = g.world.add(new QuestThing(a.st.thing, at[0], at[1]));
      t.onTake = (id) => this.found(id);
      this.things.push(t);
    }
  }

  /** Marks for the maps: where the current steps lead, in this room. */
  marks(): Mark[] {
    const g = this.g;
    const room = g.room?.id;
    const out: Mark[] = [];
    for (const a of this.active()) {
      if (a.st.kind === 'find' && a.st.at && a.st.at.room === room) {
        const at = this.where(a.st.at);
        if (at) out.push({ x: at[0], y: at[1], kind: 'side' });
      } else if (a.st.kind === 'talk') {
        for (const e of g.world.entities) {
          const id = (e as unknown as { id?: string }).id;
          if (e.label === 'npc' && id && this.matches(a.st, id)) out.push({ x: e.x, y: e.y, kind: 'side' });
        }
      }
    }
    return out;
  }
}
