export const TILE = 32;
export const HUD_HEIGHT = 40;
export const LOG_LINES = 4;
export const LOG_HEIGHT = 20 * LOG_LINES + 12;
export const FONT = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, system-ui, sans-serif';
export const MONO = 'Menlo, Consolas, "Courier New", monospace';

/** 座標とサイズから決定論的な擬似乱数 [0,1) を返す（タイル模様用） */
export function hash2(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
