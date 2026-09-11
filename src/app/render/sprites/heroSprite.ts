import type { PixelSprite } from './PixelSprite';

/** 主人公: 赤いバンダナの盗賊風 */
export const HERO_SPRITE: PixelSprite = {
  rows: [
    '................',
    '....########....',
    '...#rrrrrrrr#...',
    '..#rrrrrrrrrr#R.',
    '..#rrrrrrrrrr#RR',
    '..#ffffffffff#..',
    '..#fBffffffBf#..',
    '..#ffffffffff#..',
    '...#ffmmmmff#...',
    '....#ffffff#....',
    '..###gggggg###..',
    '.#f#gggggggg#f#.',
    '.#f#gggSgggg#f#.',
    '....#bb##bb#....',
    '....#bb#.#bb#...',
    '....###..###....',
  ],
  palette: {
    '#': '#3b2412',
    r: '#c0392b',
    R: '#e74c3c',
    f: '#f1c27d',
    B: '#3b2412',
    m: '#b45309',
    g: '#2e8b57',
    S: '#d9d9d9',
    b: '#8b5a2b',
  },
};
