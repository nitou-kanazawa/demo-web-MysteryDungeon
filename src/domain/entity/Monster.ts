import type { Vec2 } from '../core/Vec2';
import { Actor } from './Actor';
import type { MonsterDef } from './MonsterDef';
import { SKILL_MAP, type SkillDef } from '../data/skills';

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

  /** 敵は種族の特技をすべて使える */
  get skills(): SkillDef[] {
    return this.definition.skills
      .map((s) => SKILL_MAP.get(s.id))
      .filter((s): s is SkillDef => s !== undefined);
  }

  get atk(): number {
    return this.definition.atk;
  }
  get def(): number {
    return this.definition.def;
  }
}
