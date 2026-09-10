import type { ItemDef } from './ItemDef';

/** 錬金の壺の調合状態 */
export interface Brewing {
  readonly result: ItemDef;
  remaining: number;
}

/** アイテムの実体。同じ定義でも修正値・残回数・中身が個別に異なる */
export class ItemInstance {
  /** 武器・盾の修正値 */
  plus = 0;
  /** 杖の残り回数 */
  charges: number;
  /** 壺の中身 */
  readonly contents: ItemInstance[] = [];
  brewing: Brewing | undefined;

  constructor(
    readonly uid: number,
    readonly def: ItemDef,
  ) {
    this.charges = def.charges ?? 0;
  }

  get isPot(): boolean {
    return this.def.category === 'pot';
  }

  get capacity(): number {
    return this.def.capacity ?? 0;
  }

  get displayName(): string {
    switch (this.def.category) {
      case 'weapon':
      case 'shield':
        return this.plus !== 0 ? `${this.def.name}${this.plus > 0 ? '+' : ''}${this.plus}` : this.def.name;
      case 'staff':
        return `${this.def.name}[${this.charges}]`;
      case 'pot':
        if (this.brewing) return `${this.def.name}[調合中${this.brewing.remaining}]`;
        return `${this.def.name}[${this.contents.length}/${this.capacity}]`;
      default:
        return this.def.name;
    }
  }
}
