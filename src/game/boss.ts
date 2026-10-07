/** Shared guardian behaviour: health, phases, a named state machine, defeat. */
import { Entity, HitInfo } from './entity';
import { sfx } from '../audio/sfx';

export abstract class Boss extends Entity {
  maxHp = 14;
  phase = 1;
  state = 'intro';
  stateT = 0;
  /** Only takes brush damage while vulnerable (staggered, unveiled...). */
  vulnerable = false;
  defeated = false;
  flash = 0;
  name = '';
  onDefeat?: () => void;
  onPhase?: (phase: number) => void;
  /** HUD reads this. */
  get frac(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  constructor() {
    super();
    this.team = 'enemy';
    this.camFocus = true;
  }

  setState(s: string): void {
    this.state = s;
    this.stateT = 0;
  }

  onHit(h: HitInfo): boolean {
    if (this.defeated) return false;
    if (!this.vulnerable && h.kind === 'brush') {
      this.deflect(h);
      return false;
    }
    this.hp -= h.dmg;
    this.flash = 0.12;
    sfx.bossHit();
    this.world.vfx.splat(this.x, this.y + 0.8 + this.z, Math.atan2(this.y - h.fromY, this.x - h.fromX), 9, 1.1);
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2;
      this.onPhase?.(2);
      this.enterPhase2();
    }
    if (this.hp <= 0) {
      this.defeated = true;
      this.vulnerable = false;
      this.setState('defeated');
      this.world.tele.clear();
      this.onDefeat?.();
    }
    return true;
  }

  /** Brush blocked: override for feedback (clink, whiff). */
  deflect(_h: HitInfo): void {}
  enterPhase2(): void {}

  update(dt: number): void {
    this.stateT += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.world.bossState = `${this.name} · phase ${this.phase} · ${this.state} · hp ${Math.max(0, this.hp)}/${this.maxHp}${this.vulnerable ? ' · OPEN' : ''}`;
  }
}
