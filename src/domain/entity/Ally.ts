import type { Vec2 } from '../core/Vec2';
import { Actor } from './Actor';
import type { MonsterDef } from './MonsterDef';

/** 仲間モンスター。元モンスターの定義を引き継ぎ、レベルアップで少しずつ強くなる */
export class Ally extends Actor {
  level = 1;
  exp = 0;

  constructor(
    id: number,
    readonly definition: MonsterDef,
    pos: Vec2,
  ) {
    super(id, definition.name, definition.glyph, definition.color, 'ally', pos, definition.hp);
    this.speed = definition.speed;
  }

  get atk(): number {
    return this.definition.atk + (this.level - 1) * 2;
  }
  get def(): number {
    return this.definition.def + Math.floor((this.level - 1) / 2);
  }

  /** 経験値を得てレベルアップした回数を返す */
  gainExp(amount: number): number {
    this.exp += amount;
    let ups = 0;
    while (this.exp >= expToNextLevel(this.level)) {
      this.exp -= expToNextLevel(this.level);
      this.level++;
      this.maxHp += 3;
      this.hp = Math.min(this.maxHp, this.hp + 3);
      ups++;
    }
    return ups;
  }
}

/** レベル lv → lv+1 に必要な経験値 */
export function expToNextLevel(lv: number): number {
  return Math.floor(8 * Math.pow(1.5, lv - 1));
}
