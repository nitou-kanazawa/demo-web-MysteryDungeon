/** 仲間の永続化・リプレイ用データ。牧場と出撃の間を行き来する */
export interface AllySnapshot {
  /** 牧場での記録ID。ダンジョン内で仲間になった直後は未設定 */
  readonly uid?: string;
  readonly defId: string;
  readonly level: number;
  readonly exp: number;
  /** 配合で受け継いだボーナス */
  readonly bonusHp: number;
  readonly bonusAtk: number;
  readonly bonusDef: number;
}
