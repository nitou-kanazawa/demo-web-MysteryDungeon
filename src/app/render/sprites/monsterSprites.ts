import { recolor, type PixelSprite } from './PixelSprite';

const EYES = { W: '#ffffff', B: '#111111' };

const SLIME: PixelSprite = {
  rows: [
    '................',
    '.......##.......',
    '......#oo#......',
    '.....#oooo#.....',
    '....#hooooo#....',
    '...#hooooooo#...',
    '..#oooooooooo#..',
    '..#oooooooooo#..',
    '.#ooWWooooWWoo#.',
    '.#ooWBooooBWoo#.',
    '.#oooooooooooo#.',
    '.#ooooRRRRoooo#.',
    '.#oooooooooooo#.',
    '..#oooooooooo#..',
    '...##oooooo##...',
    '.....######.....',
  ],
  palette: { '#': '#1e3a8a', o: '#4FA7FF', h: '#a5d8ff', R: '#1e3a8a', ...EYES },
};

const DRACKY: PixelSprite = {
  rows: [
    '................',
    '.#............#.',
    '#p#..........#p#',
    '#pp#...##...#pp#',
    '#ppp#.#pp#.#ppp#',
    '#pppp#pppp#pppp#',
    '.#pppppppppppp#.',
    '..#ppWppppWpp#..',
    '..#ppBppppBpp#..',
    '...#pppppppp#...',
    '...#ppFppFpp#...',
    '....#pppppp#....',
    '.....#pppp#.....',
    '......#pp#......',
    '.....#....#.....',
    '................',
  ],
  palette: { '#': '#3b0764', p: '#B08CFF', F: '#ffffff', ...EYES },
};

const HAMMERHOOD: PixelSprite = {
  rows: [
    '..........HH....',
    '.........HHHH...',
    '.........HHHH...',
    '..........hh....',
    '....####..hh....',
    '...#bbbb#.hh....',
    '..#bWbbWb#hh....',
    '..#bBbbBb#h.....',
    '..#bbbbbb#......',
    '..#bbmmbb#......',
    '...#bbbb#.......',
    '..##bbbb##......',
    '.#bbbbbbbb#.....',
    '.#bb#bb#bb#.....',
    '..##.##.##......',
    '................',
  ],
  palette: { '#': '#5a3a1a', b: '#E0B070', H: '#9ca3af', h: '#8b5a2b', m: '#7c2d12', ...EYES },
};

const GHOST: PixelSprite = {
  rows: [
    '................',
    '.....######.....',
    '....#gggggg#....',
    '...#gggggggg#...',
    '..#gggggggggg#..',
    '..#gBBggggBBg#..',
    '..#gBBggggBBg#..',
    '..#gggggggggg#..',
    '..#ggggmmgggg#..',
    '..#gggmmmmggg#..',
    '..#gggggggggg#..',
    '..#gggggggggg#..',
    '..#gg#gg#gg#g#..',
    '..#g#.#g#.#g#...',
    '..##..##..##....',
    '................',
  ],
  palette: { '#': '#93c5fd', g: '#e0f2fe', B: '#1e3a8a', m: '#60a5fa' },
};

const CHIMAERA: PixelSprite = {
  rows: [
    '...#........#...',
    '..#y#......#y#..',
    '.#yyy#....#yyy#.',
    '#yyyyy#..#yyyyy#',
    '#yyyyyy##yyyyyy#',
    '.#yyyy#oo#yyyy#.',
    '..#yy#oooo#yy#..',
    '...#oWooooWo#...',
    '...#oBooooBo#...',
    '...#oooooooo#...',
    '....#ooKKoo#....',
    '....#oooooo#....',
    '.....#oooo#.....',
    '......#oo#......',
    '.....#.##.#.....',
    '................',
  ],
  palette: { '#': '#78350f', y: '#FFD24F', o: '#f59e0b', K: '#ea580c', ...EYES },
};

const GOLEM: PixelSprite = {
  rows: [
    '................',
    '....########....',
    '...#ssssssss#...',
    '...#sRssssRs#...',
    '...#ssssssss#...',
    '.###ssssssss###.',
    '#ss#ssssssss#ss#',
    '#ss#sSSSSSSs#ss#',
    '#ss#ssssssss#ss#',
    '#ss#ssssssss#ss#',
    '.##.#ssssss#.##.',
    '....#ssssss#....',
    '....#ss##ss#....',
    '....#ss#.#ss#...',
    '....###..###....',
    '................',
  ],
  palette: { '#': '#374151', s: '#A0A0A0', S: '#6b7280', R: '#ef4444' },
};

const DRAGON: PixelSprite = {
  rows: [
    '..#..........#..',
    '..#h#......#h#..',
    '...#h#.##.#h#...',
    '....#dddddd#....',
    '...#dddddddd#...',
    '..#ddRddddRdd#..',
    '..#dddddddddd#..',
    '..#dddllllddd#..',
    '.#dddllllllddd#.',
    '.#dddllllllddd#.',
    '.#dddllllllddd#.',
    '..#dddllllddd#..',
    '..#dddddddddd#..',
    '..#dd#dddd#dd#..',
    '..##..####..##..',
    '................',
  ],
  palette: { '#': '#7f1d1d', d: '#FF5533', l: '#fde68a', R: '#fef08a', h: '#fef3c7' },
};

const GARGOYLE: PixelSprite = {
  rows: [
    '................',
    '#..............#',
    '##.....##.....##',
    '#w#...#gg#...#w#',
    '#ww#.#gggg#.#ww#',
    '#www#gRggRg#www#',
    '#wwwwggggggwwww#',
    '.#wwwggggggwww#.',
    '..#wwggggggww#..',
    '...#gggggggg#...',
    '...#gg#gg#gg#...',
    '...#gggggggg#...',
    '....#gggggg#....',
    '....#gg##gg#....',
    '....##....##....',
    '................',
  ],
  palette: { '#': '#1f2937', w: '#4b5563', g: '#8b9bb4', R: '#f87171' },
};

const KING_SLIME: PixelSprite = {
  rows: [
    '....#.#..#.#....',
    '....#C#CC#C#....',
    '....#CCCCCC#....',
    '...##CCCCCC##...',
    '..#oooooooooo#..',
    '.#oooooooooooo#.',
    '.#oooooooooooo#.',
    '#oooWWoooWWoooo#',
    '#oooWBoooBWoooo#',
    '#oooooooooooooo#',
    '#ooooooRRoooooo#',
    '#oooooooooooooo#',
    '.#oooooooooooo#.',
    '.#oooooooooooo#.',
    '..##oooooooo##..',
    '....########....',
  ],
  palette: { '#': '#1e3a8a', o: '#3B82F6', C: '#fbbf24', R: '#1e3a8a', ...EYES },
};

/** 種族ID → スプライト。色違いは recolor で形を共有 */
export const MONSTER_SPRITES: Readonly<Record<string, PixelSprite>> = {
  slime: SLIME,
  shebeth: recolor(SLIME, { '#': '#7f1d1d', o: '#FF7A7A', h: '#ffc9c9', R: '#7f1d1d' }),
  king_slime: KING_SLIME,
  dracky: DRACKY,
  taho_dracky: recolor(DRACKY, { '#': '#831843', p: '#F472B6' }),
  hammerhood: HAMMERHOOD,
  ghost: GHOST,
  chimaera: CHIMAERA,
  golem: GOLEM,
  dragon: DRAGON,
  metal_dragon: recolor(DRAGON, { '#': '#334155', d: '#94A3B8', l: '#e2e8f0', R: '#f87171', h: '#cbd5e1' }),
  gargoyle: GARGOYLE,
};
