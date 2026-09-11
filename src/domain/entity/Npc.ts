import type { Vec2 } from '../core/Vec2';
import { Actor } from './Actor';
import type { MonsterDef } from './MonsterDef';

export type NpcRole = 'shopkeeper' | 'blacksmith';

/** 中立の NPC。行動せず、ぶつかると会話する。攻撃されると敵になる */
export class Npc extends Actor {
  constructor(
    id: number,
    readonly role: NpcRole,
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
