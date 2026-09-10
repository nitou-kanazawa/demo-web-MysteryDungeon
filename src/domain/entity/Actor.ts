import type { Vec2 } from '../core/Vec2';
import type { StatusKind } from './StatusEffect';

export type Faction = 'player' | 'ally' | 'enemy';

/** 盤上で行動する存在の基底クラス。攻撃力・防御力の算出は派生クラスに委ねる */
export abstract class Actor {
  hp: number;
  /** 1ターンに行動できる回数 */
  speed = 1;
  private readonly statuses = new Map<StatusKind, number>();

  protected constructor(
    readonly id: number,
    readonly name: string,
    readonly glyph: string,
    readonly color: string,
    readonly faction: Faction,
    public pos: Vec2,
    public maxHp: number,
  ) {
    this.hp = maxHp;
  }

  abstract get atk(): number;
  abstract get def(): number;

  get isAlive(): boolean {
    return this.hp > 0;
  }

  /** 実際に減った HP を返す */
  takeDamage(amount: number): number {
    const dealt = Math.min(this.hp, Math.max(0, amount));
    this.hp -= dealt;
    return dealt;
  }

  /** 実際に回復した HP を返す */
  heal(amount: number): number {
    const healed = Math.min(this.maxHp - this.hp, Math.max(0, amount));
    this.hp += healed;
    return healed;
  }

  hasStatus(kind: StatusKind): boolean {
    return this.statuses.has(kind);
  }

  addStatus(kind: StatusKind, turns: number): void {
    const cur = this.statuses.get(kind) ?? 0;
    this.statuses.set(kind, Math.max(cur, turns));
  }

  removeStatus(kind: StatusKind): void {
    this.statuses.delete(kind);
  }

  get activeStatuses(): StatusKind[] {
    return [...this.statuses.keys()];
  }

  /** 残りターンを1減らし、解除された状態異常の一覧を返す */
  tickStatuses(): StatusKind[] {
    const expired: StatusKind[] = [];
    for (const [kind, turns] of this.statuses) {
      if (turns <= 1) {
        this.statuses.delete(kind);
        expired.push(kind);
      } else {
        this.statuses.set(kind, turns - 1);
      }
    }
    return expired;
  }

  /** 行動可能か（かなしばり中は不可） */
  get canAct(): boolean {
    return this.isAlive && !this.hasStatus('paralysis');
  }
}
