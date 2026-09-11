import type { MonsterDef } from '../entity/MonsterDef';

/** 鍛冶屋のドワーフ。怒ると敵になる */
export const BLACKSMITH_DEF: MonsterDef = {
  id: 'blacksmith',
  name: '鍛冶屋のドワーフ',
  family: 'beast',
  glyph: '鍛',
  color: '#d97706',
  hp: 90,
  atk: 28,
  def: 15,
  exp: 150,
  minFloor: 0,
  maxFloor: 0,
  speed: 1,
  recruitChance: 0,
  rank: 6,
  skills: [{ id: 'smash', level: 1 }],
};

/** 鍛冶の料金: 300 + 150 × 現在の修正値 */
export const smithCost = (plus: number): number => 300 + 150 * Math.max(0, plus);
