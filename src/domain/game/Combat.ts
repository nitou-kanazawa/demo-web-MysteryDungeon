import type { IRng } from '../core/Rng';

/**
 * ダメージ計算: (攻撃力 - 防御力/2) に ±12.5% の揺らぎ。最低 1。
 */
export function calcDamage(atk: number, def: number, rng: IRng): number {
  const base = atk - def * 0.5;
  const variance = 0.875 + rng.next() * 0.25;
  return Math.max(1, Math.floor(base * variance));
}

/** 命中率（プレイヤー・モンスター共通） */
export const HIT_CHANCE = 0.9;
