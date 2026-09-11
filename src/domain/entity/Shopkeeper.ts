import type { Vec2 } from '../core/Vec2';
import type { MonsterDef } from './MonsterDef';
import { Npc } from './Npc';

/** 店主（ガーゴイル）。どろぼうされると Monster に置き換わる */
export class Shopkeeper extends Npc {
  constructor(id: number, definition: MonsterDef, pos: Vec2) {
    super(id, 'shopkeeper', definition, pos);
  }
}
