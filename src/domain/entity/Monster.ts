import type { Vec2 } from '../core/Vec2';
import { Actor } from './Actor';
import type { MonsterDef } from './MonsterDef';

export class Monster extends Actor {
  /** プレイヤーを最後に見た位置（追跡用） */
  lastSeenPlayerPos: Vec2 | undefined;

  constructor(
    id: number,
    readonly definition: MonsterDef,
    pos: Vec2,
  ) {
    super(id, definition.name, definition.glyph, definition.color, 'enemy', pos, definition.hp);
    this.speed = definition.speed;
  }

  get atk(): number {
    return this.definition.atk;
  }
  get def(): number {
    return this.definition.def;
  }
}
