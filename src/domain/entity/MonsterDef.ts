/** 系統（配合の組み合わせに使う） */
export type MonsterFamily = 'slime' | 'bird' | 'material' | 'dragon' | 'zombie' | 'beast' | 'devil';

export const FAMILY_LABEL: Readonly<Record<MonsterFamily, string>> = {
  slime: 'スライム系',
  bird: '鳥系',
  material: '物質系',
  dragon: 'ドラゴン系',
  zombie: 'ゾンビ系',
  beast: '獣系',
  devil: '悪魔系',
};

/** モンスターの静的定義（データテーブル） */
export interface MonsterDef {
  readonly id: string;
  readonly name: string;
  readonly family: MonsterFamily;
  readonly glyph: string;
  readonly color: string;
  readonly hp: number;
  readonly atk: number;
  readonly def: number;
  readonly exp: number;
  /** 出現階層（両端含む） */
  readonly minFloor: number;
  readonly maxFloor: number;
  /** 1ターンの行動回数 */
  readonly speed: number;
  /** 倒したときに仲間になる確率 (0 なら仲間にならない) */
  readonly recruitChance: number;
  /** 習得する特技（level に達すると使える） */
  readonly skills: readonly SkillLearn[];
  /** 種族の強さの目安（配合のフォールバックや図鑑の並びに使う） */
  readonly rank: number;
}

export interface SkillLearn {
  readonly id: string;
  readonly level: number;
}
