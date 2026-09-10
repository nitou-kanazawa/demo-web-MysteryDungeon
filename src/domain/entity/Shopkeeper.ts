import type { Vec2 } from '../core/Vec2';
import { Actor } from './Actor';
import type { MonsterDef } from './MonsterDef';

/** 店主（ガーゴイル）。中立で行動しない。どろぼうされると Monster に置き換わる */
export class Shopkeeper extends Actor {
  constructor(
    id: number,
    readonly definition: MonsterDef,
    pos: Vec2,
  ) {
    super(id, definition.name, definition.glyph, definition.color, 'neutral', pos, definition.hp);
  }

  get atk(): number {
    return this.definition.atk;
  }
  get def(): number {
    return this.definition.def;
  }
}
