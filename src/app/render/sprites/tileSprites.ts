import { PixelCanvas } from './PixelCanvas';
import type { PixelSprite } from './PixelSprite';

/** 石壁（レンガ）。s: 石、m: 目地、h: ハイライト */
function brickWall(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 's');
  // 目地（横）
  for (const y of [7, 15, 23, 31]) c.rect(0, y, 32, 1, 'm');
  // 目地（縦、段ごとにずらす）
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 8;
    for (let x = off; x < 32; x += 16) c.rect(x, row * 8, 1, 7, 'm');
  }
  // 各レンガの上辺ハイライト
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 8;
    for (let x = off; x < 32; x += 16) c.rect(x + 1, row * 8, 14, 1, 'h');
  }
  // 欠け
  c.stamp(4, 3, ['d', 'dd']).stamp(21, 18, ['dd', '.d']);
  return c.toSprite({ s: '#4a4460', m: '#1c1828', h: '#6b6486', d: '#332e46' });
}

/** 奥の岩（床に接していない壁） */
function rock(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'r');
  c.stamp(3, 5, ['dd', '.d']).stamp(18, 12, ['d']).stamp(9, 24, ['dd']).stamp(25, 27, ['d', 'd']);
  return c.toSprite({ r: '#0e0c15', d: '#141120' });
}

/** 石畳（2 パターン） */
function flagstone(variant: 0 | 1): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'f');
  c.rect(0, 0, 32, 1, 'm').rect(0, 0, 1, 32, 'm');
  c.rect(1, 1, 30, 1, 'h');
  if (variant === 0) {
    c.rect(0, 16, 32, 1, 'm').rect(16, 0, 1, 16, 'm');
    c.stamp(6, 20, ['d', '.d', '..dd']).stamp(20, 6, ['dd']);
  } else {
    c.rect(11, 0, 1, 32, 'm').rect(11, 20, 21, 1, 'm');
    c.stamp(3, 8, ['dd', 'd']).stamp(22, 26, ['.d', 'dd']);
  }
  c.stamp(26, 2, ['g']).stamp(4, 28, ['g']);
  return c.toSprite({ f: '#6f5c4b', m: '#3a2d22', h: '#83705d', d: '#5a4a3b', g: '#7d6a56' });
}

/** 通路（土） */
function earth(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'e');
  c.stamp(4, 5, ['dd', '.d']).stamp(20, 9, ['ddd']).stamp(10, 19, ['d', 'dd']).stamp(24, 24, ['dd']).stamp(2, 27, ['d']);
  c.stamp(14, 3, ['l']).stamp(27, 16, ['l']).stamp(7, 13, ['l']);
  return c.toSprite({ e: '#5c4a3a', d: '#3e3126', l: '#6e5a48' });
}

/** 下り階段 */
function stairs(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'f');
  c.rect(0, 0, 32, 1, 'm').rect(0, 0, 1, 32, 'm');
  c.rect(3, 3, 26, 26, 'k');
  const shades = ['a', 'b', 'c', 'd', 'e'] as const;
  for (let i = 0; i < 5; i++) c.rect(4 + i * 2, 5 + i * 5, 24 - i * 4, 4, shades[i] ?? 'e');
  c.rect(3, 3, 26, 1, 'g').rect(3, 3, 1, 26, 'g').rect(3, 28, 26, 1, 'g').rect(28, 3, 1, 26, 'g');
  return c.toSprite({
    f: '#6f5c4b',
    m: '#3a2d22',
    k: '#17120f',
    a: '#9a8a70',
    b: '#7f7058',
    c: '#655843',
    d: '#4d4232',
    e: '#352d22',
    g: '#c9a961',
  });
}

export const TILE_SPRITES = {
  wall: brickWall(),
  rock: rock(),
  floorA: flagstone(0),
  floorB: flagstone(1),
  corridor: earth(),
  stairs: stairs(),
} as const;
