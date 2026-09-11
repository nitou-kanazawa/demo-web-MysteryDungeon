import type { GameState } from './GameState';

/**
 * 視界半径の上限を求める。暗黒テーマ・霧のうち厳しいほうを採用する。
 * undefined なら制限なし（部屋全体が見える）。
 * 松明切れは視界を狭めない（描画が暗くなるだけ）。
 */
export function effectiveSightRadius(state: GameState): number | undefined {
  const limits: number[] = [];
  if (state.theme.sightRadius !== undefined) limits.push(state.theme.sightRadius);
  if (state.fog) limits.push(2);
  return limits.length > 0 ? Math.min(...limits) : undefined;
}
