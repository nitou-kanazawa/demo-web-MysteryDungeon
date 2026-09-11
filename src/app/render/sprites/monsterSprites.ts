import { EYES, EYE_L, EYE_R, PixelCanvas } from './PixelCanvas';
import { recolor, type PixelSprite } from './PixelSprite';

/** スライム: しずく型 */
const SLIME: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 20, 11, 9, 'o')
  .ellipse(15.5, 13, 6, 7, 'o')
  .stamp(14, 4, ['.oo', 'oooo'])
  .ellipse(10, 13, 2, 3, 'h')
  .shadeBottom('o', 'd', 0.22)
  .stamp(9, 17, EYE_L)
  .stamp(20, 17, EYE_R)
  .stamp(12, 23, ['mmmmmmmm'])
  .outline('#')
  .toSprite({ '#': '#14306e', o: '#4FA7FF', h: '#b9e0ff', d: '#2f7fd6', m: '#14306e', ...EYES });

/** ドラキー: コウモリ */
const DRACKY: PixelSprite = new PixelCanvas()
  .ellipse(5, 15, 5, 5, 'p')
  .ellipse(26, 15, 5, 5, 'p')
  .line(2, 15, 9, 15, 'k')
  .line(22, 15, 29, 15, 'k')
  .ellipse(15.5, 17, 7, 8, 'p')
  .stamp(9, 6, ['p', 'pp', 'ppp', 'pppp'])
  .stamp(19, 6, ['...p', '..pp', '.ppp', 'pppp'])
  .shadeBottom('p', 'q', 0.2)
  .stamp(10, 14, EYE_L)
  .stamp(19, 14, EYE_R)
  .stamp(13, 20, ['W', 'W'])
  .stamp(18, 20, ['W', 'W'])
  .stamp(11, 26, ['pp', '.p'])
  .stamp(19, 26, ['pp', 'p'])
  .outline('#')
  .toSprite({ '#': '#2e0a5e', p: '#B08CFF', q: '#8b63e6', k: '#5b21b6', ...EYES });

/** おおきづち: ハンマーを持った小さな獣 */
const HAMMERHOOD: PixelSprite = new PixelCanvas()
  .rect(23, 10, 2, 17, 'h')
  .rect(19, 4, 10, 7, 'H')
  .rect(19, 4, 10, 1, 'G')
  .rect(19, 10, 10, 1, 'G')
  .ellipse(6, 9, 3, 4, 'b')
  .ellipse(18, 9, 3, 4, 'b')
  .ellipse(12, 19, 9, 9, 'b')
  .ellipse(12, 12, 6, 5, 'b')
  .shadeBottom('b', 'c', 0.2)
  .stamp(7, 11, EYE_L)
  .stamp(14, 11, EYE_R)
  .stamp(10, 16, ['mmmm'])
  .stamp(6, 27, ['bbb', '.bb'])
  .stamp(14, 27, ['bbb', 'bb'])
  .outline('#')
  .toSprite({ '#': '#4a2e12', b: '#E0B070', c: '#c08c4a', m: '#7c2d12', H: '#9ca3af', G: '#4b5563', h: '#8b5a2b', ...EYES });

/** ゴースト */
const GHOST: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 14, 9, 10, 'g')
  .rect(6, 14, 20, 10, 'g')
  .ellipse(9, 25, 3, 3, 'g')
  .ellipse(15.5, 26, 3, 3, 'g')
  .ellipse(22, 25, 3, 3, 'g')
  .ellipse(11, 13, 2, 3, 'B')
  .ellipse(20, 13, 2, 3, 'B')
  .ellipse(15.5, 19, 3, 2, 'm')
  .stamp(9, 8, ['h', 'hh'])
  .outline('#')
  .toSprite({ '#': '#7cb4f0', g: '#e0f2fe', h: '#ffffff', m: '#60a5fa', B: '#1e3a8a' });

/** キメラ: 翼のある鳥 */
const CHIMAERA: PixelSprite = new PixelCanvas()
  .ellipse(5, 13, 5, 7, 'y')
  .ellipse(26, 13, 5, 7, 'y')
  .line(2, 12, 8, 12, 'Y')
  .line(2, 16, 8, 16, 'Y')
  .line(23, 12, 29, 12, 'Y')
  .line(23, 16, 29, 16, 'Y')
  .ellipse(15.5, 22, 7, 7, 'o')
  .ellipse(15.5, 12, 6, 6, 'o')
  .stamp(13, 3, ['.y', 'yy', '.y'])
  .shadeBottom('o', 'r', 0.2)
  .stamp(10, 10, EYE_L)
  .stamp(19, 10, EYE_R)
  .stamp(13, 15, ['KKKKK', '.KKK', '..K'])
  .stamp(9, 28, ['KK', '.K'])
  .stamp(21, 28, ['KK', 'K'])
  .outline('#')
  .toSprite({ '#': '#6b3a0b', y: '#FFD24F', Y: '#d99a1a', o: '#f59e0b', r: '#c2700a', K: '#ea580c', ...EYES });

/** ゴーレム */
const GOLEM: PixelSprite = new PixelCanvas()
  .rect(10, 2, 12, 9, 's')
  .rect(7, 10, 18, 16, 's')
  .rect(2, 11, 5, 13, 'S')
  .rect(25, 11, 5, 13, 'S')
  .rect(8, 26, 6, 5, 's')
  .rect(18, 26, 6, 5, 's')
  .rect(7, 16, 18, 2, 'S')
  .stamp(12, 5, ['RR', 'RR'])
  .stamp(18, 5, ['RR', 'RR'])
  .stamp(11, 20, ['c', '.c', '..c'])
  .stamp(20, 12, ['c', 'c'])
  .stamp(3, 18, ['c'])
  .outline('#')
  .toSprite({ '#': '#24272e', s: '#A0A0A0', S: '#6b7280', c: '#4b5563', R: '#ef4444' });

/** ドラゴン */
const DRAGON: PixelSprite = new PixelCanvas()
  .ellipse(3, 17, 4, 7, 'w')
  .ellipse(28, 17, 4, 7, 'w')
  .ellipse(15.5, 22, 10, 8, 'd')
  .ellipse(15.5, 11, 8, 7, 'd')
  .stamp(6, 2, ['h', 'hh', 'hhh', '.hh'])
  .stamp(22, 2, ['..h', '.hh', 'hhh', 'hh'])
  .ellipse(15.5, 24, 6, 5, 'l')
  .shadeBottom('d', 'e', 0.18)
  .stamp(9, 9, ['RR', 'RB'])
  .stamp(20, 9, ['RR', 'BR'])
  .stamp(12, 14, ['W.....W'])
  .stamp(8, 29, ['ddd', 'd.d'])
  .stamp(21, 29, ['ddd', 'd.d'])
  .outline('#')
  .toSprite({ '#': '#6b1010', d: '#FF5533', e: '#d63a1f', l: '#fde68a', w: '#b91c1c', h: '#fef3c7', R: '#fef08a', ...EYES });

/** ガーゴイル: 石の翼をもつ番人 */
const GARGOYLE: PixelSprite = new PixelCanvas()
  .stamp(0, 6, ['.......w', '.....www', '...wwwww', '.wwwwwww', 'wwwwwwww', '.wwwwwww', '...wwwww', '.....www', '.......w'])
  .ellipse(15.5, 9, 5, 5, 'g')
  .stamp(9, 3, ['h', 'h', 'hh'])
  .rect(10, 14, 12, 11, 'g')
  .rect(6, 15, 4, 8, 'G')
  .rect(10, 25, 4, 5, 'g')
  .stamp(11, 7, ['RR'])
  .stamp(19, 7, ['RR'])
  .stamp(13, 11, ['mmmmm'])
  .rect(12, 18, 8, 2, 'G')
  .mirror()
  .outline('#')
  .toSprite({ '#': '#111827', w: '#4b5563', g: '#8b9bb4', G: '#64748b', h: '#cbd5e1', m: '#1f2937', R: '#f87171' });

/** キングスライム: 大きなスライムに王冠 */
const KING_SLIME: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 20, 14, 10, 'o')
  .ellipse(15.5, 13, 8, 8, 'o')
  .rect(9, 4, 14, 5, 'C')
  .stamp(9, 1, ['C...C...C...C', 'C..CC..CC..CC', 'CCCCCCCCCCCCC'])
  .stamp(11, 5, ['J']).stamp(15, 5, ['J']).stamp(19, 5, ['J'])
  .ellipse(8, 14, 2, 3, 'h')
  .shadeBottom('o', 'd', 0.2)
  .stamp(8, 16, EYE_L)
  .stamp(21, 16, EYE_R)
  .stamp(11, 23, ['mmmmmmmmmm'])
  .outline('#')
  .toSprite({ '#': '#14306e', o: '#3B82F6', h: '#bfdbfe', d: '#2563eb', C: '#fbbf24', J: '#ef4444', m: '#14306e', ...EYES });

/** 種族ID → スプライト。色違いは recolor で形を共有 */
export const MONSTER_SPRITES: Readonly<Record<string, PixelSprite>> = {
  slime: SLIME,
  shebeth: recolor(SLIME, { '#': '#6e1414', o: '#FF7A7A', h: '#ffd6d6', d: '#e05252', m: '#6e1414' }),
  king_slime: KING_SLIME,
  dracky: DRACKY,
  taho_dracky: recolor(DRACKY, { '#': '#6b1040', p: '#F472B6', q: '#db2777', k: '#9d174d' }),
  hammerhood: HAMMERHOOD,
  ghost: GHOST,
  chimaera: CHIMAERA,
  golem: GOLEM,
  dragon: DRAGON,
  metal_dragon: recolor(DRAGON, { '#': '#1e293b', d: '#94A3B8', e: '#64748b', l: '#e2e8f0', w: '#475569', h: '#f1f5f9', R: '#f87171' }),
  gargoyle: GARGOYLE,
};
