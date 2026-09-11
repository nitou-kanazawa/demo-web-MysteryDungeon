import type { Vec2 } from '../core/Vec2';
import { SKILL_MAP, type SkillDef } from '../data/skills';
import { Actor } from './Actor';
import type { AllySnapshot } from './AllySnapshot';
import type { MonsterDef } from './MonsterDef';

export interface AllyBonus {
  hp: number;
  atk: number;
  def: number;
}

/** 仲間モンスター。種族定義＋レベル＋配合ボーナスでステータスが決まる */
export class Ally extends Actor {
  level: number;
  exp: number;
  readonly bonus: AllyBonus;
  /** 牧場の記録ID（ダンジョン内で仲間になった個体は undefined） */
  readonly recordId: string | undefined;
  /** 仲間になったターン（演出用） */
  joinedTurn = -1;

  constructor(
    id: number,
    readonly definition: MonsterDef,
    pos: Vec2,
    init?: Partial<AllySnapshot>,
  ) {
    const level = init?.level ?? 1;
    const bonus = { hp: init?.bonusHp ?? 0, atk: init?.bonusAtk ?? 0, def: init?.bonusDef ?? 0 };
    super(id, definition.name, definition.glyph, definition.color, 'ally', pos, Ally.maxHpFor(definition, level, bonus));
    this.level = level;
    this.exp = init?.exp ?? 0;
    this.bonus = bonus;
    this.recordId = init?.uid;
    this.speed = definition.speed;
  }

  static maxHpFor(def: MonsterDef, level: number, bonus: AllyBonus): number {
    return def.hp + bonus.hp + (level - 1) * 3;
  }

  get atk(): number {
    return this.definition.atk + this.bonus.atk + (this.level - 1) * 2;
  }
  get def(): number {
    return this.definition.def + this.bonus.def + Math.floor((this.level - 1) / 2);
  }

  /** 現在のレベルで使える特技 */
  get skills(): SkillDef[] {
    return this.definition.skills
      .filter((s) => s.level <= this.level)
      .map((s) => SKILL_MAP.get(s.id))
      .filter((s): s is SkillDef => s !== undefined);
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

  /** このレベルで新しく覚えた特技（レベルアップ直後に呼ぶ） */
  skillsLearnedAt(level: number): SkillDef[] {
    return this.definition.skills
      .filter((s) => s.level === level)
      .map((s) => SKILL_MAP.get(s.id))
      .filter((s): s is SkillDef => s !== undefined);
  }

  toSnapshot(): AllySnapshot {
    return {
      ...(this.recordId !== undefined ? { uid: this.recordId } : {}),
      defId: this.definition.id,
      level: this.level,
      exp: this.exp,
      bonusHp: this.bonus.hp,
      bonusAtk: this.bonus.atk,
      bonusDef: this.bonus.def,
    };
  }
}

/** レベル lv → lv+1 に必要な経験値 */
export function expToNextLevel(lv: number): number {
  return Math.floor(8 * Math.pow(1.5, lv - 1));
}
