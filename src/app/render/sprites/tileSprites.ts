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

// ---------------------------------------------------------------- テーマ別タイル

/** 水（2 フレーム。波の位置をずらす） */
function water(frame: 0 | 1): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'w');
  const off = frame === 0 ? 0 : 4;
  for (let y = 3; y < 32; y += 8) {
    c.line((off + 2) % 32, y, (off + 9) % 32, y, 'l');
    c.line((off + 18) % 32, y + 4, (off + 26) % 32, y + 4, 'l');
    c.stamp((off + 13) % 32, y + 1, ['d']);
  }
  c.stamp(6, 14, ['h']).stamp(24, 26, ['h']);
  return c.toSprite({ w: '#1d4e89', l: '#3b82c4', d: '#173f70', h: '#7cc4ff' });
}

/** 空（雲と青）。frame で雲を少しずらす */
function sky(frame: 0 | 1): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 's');
  const off = frame === 0 ? 0 : 1;
  c.ellipse(9 + off, 9, 6, 3, 'c').ellipse(14 + off, 8, 4, 3, 'c');
  c.ellipse(23 + off, 22, 6, 3, 'c').ellipse(19 + off, 24, 4, 2, 'c');
  c.ellipse(9 + off, 11, 6, 2, 'e');
  c.ellipse(23 + off, 24, 6, 2, 'e');
  return c.toSprite({ s: '#7fb4e6', c: '#f4f8ff', e: '#d6e4f5' });
}

/** 砂の島（地底湖の床） */
function sand(variant: 0 | 1): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'a');
  if (variant === 0) c.stamp(5, 6, ['d', '.d']).stamp(20, 20, ['dd']).stamp(12, 26, ['d']);
  else c.stamp(24, 5, ['dd']).stamp(8, 17, ['d', 'd']).stamp(18, 12, ['.d', 'd']);
  c.stamp(27, 27, ['p']).stamp(3, 12, ['p']);
  return c.toSprite({ a: '#c9b27c', d: '#a8925f', p: '#e6d3a0' });
}

/** 草の島（天空の床） */
function grass(variant: 0 | 1): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'g');
  const tufts = variant === 0 ? [[4, 6], [18, 12], [9, 24], [26, 27]] : [[12, 4], [24, 9], [5, 18], [17, 26]];
  for (const [x, y] of tufts) c.stamp(x!, y!, ['.t.t', 'tttt']);
  c.stamp(28, 3, ['f']).stamp(2, 28, ['f']);
  return c.toSprite({ g: '#4f9a4a', t: '#3b7d38', f: '#f7d774' });
}

/** 木の橋（水上の通路） */
function bridge(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'p');
  for (let y = 0; y < 32; y += 4) c.rect(0, y, 32, 1, 'm');
  c.rect(0, 0, 3, 32, 'r').rect(29, 0, 3, 32, 'r');
  c.stamp(10, 6, ['n']).stamp(22, 18, ['n']).stamp(14, 26, ['n']);
  return c.toSprite({ p: '#a0713d', m: '#6b4520', r: '#5b3a1a', n: '#3d2812' });
}

/** 石の空中回廊（天空の通路） */
function walkway(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 's');
  c.rect(0, 0, 32, 1, 'm').rect(0, 0, 1, 32, 'm').rect(0, 16, 32, 1, 'm').rect(16, 0, 1, 16, 'm');
  c.rect(0, 0, 2, 32, 'e').rect(30, 0, 2, 32, 'e');
  c.stamp(8, 8, ['d']).stamp(22, 24, ['d']);
  return c.toSprite({ s: '#9a9aa8', m: '#5c5c6a', e: '#c2c2cc', d: '#7a7a88' });
}

/** 岸辺の縁（水に接した床の辺に重ねる） */
function shoreEdge(): PixelSprite {
  const c = new PixelCanvas();
  c.rect(0, 30, 32, 2, 'f');
  c.stamp(3, 29, ['f']).stamp(13, 29, ['ff']).stamp(24, 29, ['f']);
  return c.toSprite({ f: '#bfe3ff' });
}

/** 崖の面（空に接した床の下に重ねる） */
function cliffFace(): PixelSprite {
  const c = new PixelCanvas();
  c.rect(0, 0, 32, 10, 'r');
  c.rect(0, 0, 32, 1, 'h');
  c.rect(0, 9, 32, 1, 'd');
  c.stamp(4, 3, ['dd', '.d']).stamp(18, 4, ['d', 'dd']).stamp(26, 2, ['d']);
  c.rect(0, 10, 32, 3, 'k');
  return c.toSprite({ r: '#6b5a48', h: '#8a7a64', d: '#4a3d30', k: '#3a2f24' });
}

export const THEME_TILES = {
  water: { solid: [water(0), water(1)], floor: [sand(0), sand(1)], corridor: bridge(), edge: shoreEdge() },
  sky: { solid: [sky(0), sky(1)], floor: [grass(0), grass(1)], corridor: walkway(), edge: cliffFace() },
} as const;

// ---------------------------------------------------------------- 氷・火山

/** 氷の床（滑る） */
function ice(variant: 0 | 1): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'i');
  c.rect(0, 0, 32, 1, 'm').rect(0, 0, 1, 32, 'm');
  if (variant === 0) c.line(4, 20, 14, 8, 'k').line(14, 8, 20, 12, 'k').stamp(24, 22, ['h', 'h']);
  else c.line(18, 26, 26, 6, 'k').stamp(5, 5, ['hh', 'h']).stamp(9, 18, ['k', '.k']);
  c.stamp(2, 26, ['hhh']).stamp(26, 3, ['hh']);
  return c.toSprite({ i: '#a5d8ff', m: '#6fb3e8', k: '#e0f2fe', h: '#ffffff' });
}

/** 氷の壁 */
function iceWall(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'w');
  for (const y of [7, 15, 23, 31]) c.rect(0, y, 32, 1, 'm');
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 8;
    for (let x = off; x < 32; x += 16) c.rect(x, row * 8, 1, 7, 'm').rect(x + 1, row * 8, 14, 1, 'h');
  }
  c.stamp(6, 4, ['h']).stamp(20, 19, ['h', 'h']);
  return c.toSprite({ w: '#5b8fc9', m: '#2f5b8f', h: '#9ec9f0' });
}

/** 雪の通路 */
function snowPath(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 's');
  c.stamp(5, 6, ['d', '.d']).stamp(18, 11, ['dd']).stamp(9, 22, ['d']).stamp(24, 25, ['d', 'd']);
  c.stamp(14, 3, ['w']).stamp(27, 16, ['w']).stamp(3, 27, ['w']);
  return c.toSprite({ s: '#d9e8f5', d: '#b7cbe0', w: '#ffffff' });
}

/** 溶岩（2 フレーム） */
function lava(frame: 0 | 1): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'l');
  const off = frame === 0 ? 0 : 5;
  for (let y = 2; y < 32; y += 8) {
    c.ellipse((10 + off) % 32, y + 2, 5, 2, 'b');
    c.ellipse((24 + off) % 32, y + 5, 4, 2, 'b');
    c.stamp((16 + off) % 32, y, ['d']);
  }
  c.stamp(6, 14, ['y']).stamp(22, 27, ['y']).stamp(28, 9, ['y']);
  return c.toSprite({ l: '#d9480f', b: '#f97316', d: '#7c2d12', y: '#fde68a' });
}

/** 火山の床（黒い玄武岩） */
function basalt(variant: 0 | 1): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'b');
  c.rect(0, 0, 32, 1, 'm').rect(0, 0, 1, 32, 'm');
  if (variant === 0) c.rect(0, 16, 32, 1, 'm').rect(16, 0, 1, 16, 'm').stamp(6, 20, ['r', '.r']);
  else c.rect(11, 0, 1, 32, 'm').rect(11, 20, 21, 1, 'm').stamp(22, 6, ['rr']);
  c.stamp(26, 26, ['g']).stamp(3, 8, ['g']);
  return c.toSprite({ b: '#3b3030', m: '#1c1414', r: '#7c2d12', g: '#4a3c3c' });
}

/** 火山の壁（赤黒い岩） */
function volcanoWall(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'w');
  for (const y of [7, 15, 23, 31]) c.rect(0, y, 32, 1, 'm');
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 8;
    for (let x = off; x < 32; x += 16) c.rect(x, row * 8, 1, 7, 'm').rect(x + 1, row * 8, 14, 1, 'h');
  }
  c.stamp(5, 3, ['r']).stamp(21, 18, ['r', 'r']);
  return c.toSprite({ w: '#5a3232', m: '#2a1414', h: '#7a4848', r: '#b91c1c' });
}

/** 火山の通路 */
function ashPath(): PixelSprite {
  const c = new PixelCanvas().rect(0, 0, 32, 32, 'a');
  c.stamp(4, 5, ['dd', '.d']).stamp(20, 9, ['ddd']).stamp(10, 19, ['d', 'dd']).stamp(24, 24, ['dd']);
  c.stamp(14, 3, ['r']).stamp(27, 16, ['r']);
  return c.toSprite({ a: '#4a3a34', d: '#2e2320', r: '#9a3412' });
}

export const THEME_TILES_EXTRA = {
  ice: { wall: iceWall(), rock: rock(), floor: [ice(0), ice(1)], corridor: snowPath(), ice: [ice(0), ice(1)] },
  volcano: { wall: volcanoWall(), rock: rock(), floor: [basalt(0), basalt(1)], corridor: ashPath(), lava: [lava(0), lava(1)] },
} as const;
