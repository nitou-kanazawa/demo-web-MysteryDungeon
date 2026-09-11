import type { GameState } from './GameState';

/**
 * 視界半径の上限を求める。暗黒テーマ・霧・松明切れのうち最も厳しいものを採用する。
 * undefined なら制限なし（部屋全体が見える）。
 */
export function effectiveSightRadius(state: GameState): number | undefined {
  const limits: number[] = [];
  if (state.theme.sightRadius !== undefined) limits.push(state.theme.sightRadius);
  if (state.fog) limits.push(2);
  if (state.player.torch <= 0) limits.push(1);
  return limits.length > 0 ? Math.min(...limits) : undefined;
}
