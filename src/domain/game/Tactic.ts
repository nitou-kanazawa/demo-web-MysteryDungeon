/** 仲間への作戦（パーティ共通） */
export type Tactic = 'aggressive' | 'defensive' | 'follow';

export const TACTICS: readonly Tactic[] = ['aggressive', 'defensive', 'follow'];

export const TACTIC_LABEL: Readonly<Record<Tactic, string>> = {
  aggressive: 'ガンガンいこうぜ',
  defensive: 'いのちだいじに',
  follow: 'ついてこい',
};

export const TACTIC_DESCRIPTION: Readonly<Record<Tactic, string>> = {
  aggressive: '見つけた敵に積極的に向かい、攻撃特技を惜しまない',
  defensive: 'HPが減ったら下がって回復を優先。深追いしない',
  follow: '主人公のそばを離れず、隣接した敵だけ攻撃する',
};
