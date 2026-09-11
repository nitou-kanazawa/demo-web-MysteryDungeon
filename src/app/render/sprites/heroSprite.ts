import { PixelCanvas, EYES } from './PixelCanvas';
import type { PixelSprite } from './PixelSprite';

/** 主人公: 赤いバンダナの盗賊風（32×32） */
export const HERO_SPRITE: PixelSprite = new PixelCanvas()
  // 髪・バンダナ
  .ellipse(15.5, 9, 8, 6, 'r')
  .rect(6, 8, 20, 3, 'r')
  .stamp(23, 6, ['RR', 'RRR', '.RRR', '..RR'])
  // 顔
  .ellipse(15.5, 13, 7, 5, 'f')
  .rect(9, 11, 14, 5, 'f')
  .stamp(10, 12, ['BB', 'BB'])
  .stamp(20, 12, ['BB', 'BB'])
  .stamp(14, 16, ['mmmm'])
  // 体（緑の上着）
  .trapezoid(15.5, 18, 8, 12, 16, 'g')
  .rect(14, 20, 4, 5, 'G')
  // 腕
  .rect(6, 19, 3, 6, 'g')
  .rect(23, 19, 3, 6, 'g')
  .rect(6, 25, 3, 2, 'f')
  .rect(23, 25, 3, 2, 'f')
  // 剣
  .rect(27, 14, 2, 12, 'S')
  .rect(25, 25, 6, 2, 'b')
  // 足
  .rect(10, 26, 5, 4, 'b')
  .rect(17, 26, 5, 4, 'b')
  .rect(9, 29, 6, 2, 'k')
  .rect(17, 29, 6, 2, 'k')
  .outline('#')
  .toSprite({
    '#': '#2a1a0e',
    r: '#c0392b',
    R: '#e74c3c',
    f: '#f1c27d',
    m: '#b45309',
    g: '#2e8b57',
    G: '#1f6b42',
    S: '#e5e7eb',
    b: '#8b5a2b',
    k: '#3b2412',
    ...EYES,
  });
