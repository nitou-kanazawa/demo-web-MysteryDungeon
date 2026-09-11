import type { Vec2 } from '../core/Vec2';
import { Actor } from './Actor';
import type { MonsterDef } from './MonsterDef';
import { SKILL_MAP, type SkillDef } from '../data/skills';

export class Monster extends Actor {
  /** プレイヤーを最後に見た位置（追跡用） */
  lastSeenPlayerPos: Vec2 | undefined;
  /** モンスターハウスなどで眠っている（起きるまで行動しない） */
  asleep = false;
  /** 番人（階段の部屋のボス）。HP2倍・経験値2倍・撃破時にアイテムを落とす */
  guardian = false;
  /** 暗黒テーマなどで上乗せされる攻撃力 */
  atkBonus = 0;

  constructor(
    id: number,
    readonly definition: MonsterDef,
    pos: Vec2,
  ) {
    super(id, definition.name, definition.glyph, definition.color, 'enemy', pos, definition.hp);
    this.speed = definition.speed;
  }

  /** 番人にする（生成直後に呼ぶ） */
  makeGuardian(): this {
    this.guardian = true;
    this.maxHp = this.definition.hp * 2;
    this.hp = this.maxHp;
    this.asleep = true;
    return this;
  }

  get displayName(): string {
    return this.guardian ? `番人の${this.definition.name}` : this.definition.name;
  }

  /** 敵は種族の特技をすべて使える */
  get skills(): SkillDef[] {
    return this.definition.skills
      .map((s) => SKILL_MAP.get(s.id))
      .filter((s): s is SkillDef => s !== undefined);
  }

  get atk(): number {
    return this.definition.atk + this.atkBonus;
  }
  get def(): number {
    return this.definition.def;
  }
}
