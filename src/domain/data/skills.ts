export type SkillKind = 'heal' | 'breath' | 'drain' | 'smash';

/** 特技のマスター定義 */
export interface SkillDef {
  readonly id: string;
  readonly name: string;
  readonly kind: SkillKind;
  /** heal: 回復量 / breath: ダメージ / drain・smash: 倍率(%) */
  readonly power: number;
  /** 射程（マス） */
  readonly range: number;
  /** 再使用までのターン数 */
  readonly cooldown: number;
  readonly description: string;
}

export const SKILL_DEFS: readonly SkillDef[] = [
  { id: 'hoimi', name: 'ホイミ', kind: 'heal', power: 20, range: 2, cooldown: 4, description: '近くの傷ついた味方のHPを20回復する。' },
  { id: 'behoimi', name: 'ベホイミ', kind: 'heal', power: 50, range: 2, cooldown: 6, description: '近くの傷ついた味方のHPを50回復する。' },
  { id: 'fire_breath', name: '火の息', kind: 'breath', power: 14, range: 3, cooldown: 3, description: '直線上の敵すべてに14ダメージ。' },
  { id: 'big_fire', name: '激しい炎', kind: 'breath', power: 30, range: 3, cooldown: 4, description: '直線上の敵すべてに30ダメージ。' },
  { id: 'drain', name: 'すいとる', kind: 'drain', power: 100, range: 1, cooldown: 3, description: '攻撃して与えたダメージの半分だけ自分が回復する。' },
  { id: 'smash', name: '痛恨の一撃', kind: 'smash', power: 180, range: 1, cooldown: 4, description: '通常の1.8倍のダメージを与える。' },
];

export const SKILL_MAP: ReadonlyMap<string, SkillDef> = new Map(SKILL_DEFS.map((s) => [s.id, s]));
