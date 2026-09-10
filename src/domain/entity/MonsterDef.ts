/** モンスターの静的定義（データテーブル） */
export interface MonsterDef {
  readonly id: string;
  readonly name: string;
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
}
