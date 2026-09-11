import { PixelCanvas } from './PixelCanvas';
import type { PixelSprite } from './PixelSprite';
import type { TileFeature, TrapKind } from '../../../domain/game/TileFeature';

/** 落とし穴 */
const PITFALL: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 16, 10, 7, 'k')
  .ellipse(15.5, 15, 8, 5, 'K')
  .outline('#')
  .toSprite({ '#': '#3a2d22', k: '#0b0907', K: '#1c1612' });

/** 地雷 */
const MINE: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 17, 8, 6, 'm')
  .rect(14, 8, 4, 4, 'r')
  .stamp(12, 6, ['s...s', '.s.s', '..s'])
  .outline('#')
  .toSprite({ '#': '#1c1917', m: '#4b5563', r: '#ef4444', s: '#fbbf24' });

/** 睡眠ガス */
const GAS: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 18, 8, 4, 'v')
  .ellipse(10, 12, 3, 3, 'g').ellipse(17, 9, 3, 3, 'g').ellipse(22, 13, 2, 2, 'g')
  .outline('#')
  .toSprite({ '#': '#4c1d95', v: '#7c3aed', g: '#c4b5fd' });

/** ワープ */
const WARP: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 16, 9, 9, 'b')
  .ellipse(15.5, 16, 6, 6, 'c')
  .ellipse(15.5, 16, 3, 3, 'b')
  .outline('#')
  .toSprite({ '#': '#1e3a8a', b: '#3b82f6', c: '#bfdbfe' });

/** 錆び */
const RUST: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 17, 8, 5, 'r')
  .stamp(9, 12, ['.o', 'oo']).stamp(18, 10, ['o', 'oo']).stamp(14, 20, ['oo'])
  .outline('#')
  .toSprite({ '#': '#431407', r: '#b45309', o: '#78350f' });

/** 召喚 */
const SUMMON: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 16, 9, 9, 'p')
  .line(15, 7, 24, 22, 'l').line(24, 22, 7, 22, 'l').line(7, 22, 15, 7, 'l')
  .outline('#')
  .toSprite({ '#': '#3b0764', p: '#581c87', l: '#f0abfc' });

/** 跳ね床 */
const SPRING: PixelSprite = new PixelCanvas()
  .rect(6, 20, 20, 6, 'w')
  .stamp(12, 8, ['...a', '..aaa', '.aaaaa', 'aaaaaaa', '...a', '...a', '...a'])
  .outline('#')
  .toSprite({ '#': '#3a2d22', w: '#a16207', a: '#fbbf24' });

/** 泉 */
const FOUNTAIN_HEAL: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 18, 11, 6, 's')
  .ellipse(15.5, 17, 8, 4, 'w')
  .stamp(14, 8, ['.w', 'ww', '.w'])
  .outline('#')
  .toSprite({ '#': '#374151', s: '#9ca3af', w: '#7dd3fc' });

const FOUNTAIN_CURSE: PixelSprite = { rows: FOUNTAIN_HEAL.rows, palette: { '#': '#374151', s: '#6b7280', w: '#a855f7' } };

/** 石碑 */
const SIGN: PixelSprite = new PixelCanvas()
  .rect(9, 4, 14, 22, 's')
  .rect(7, 25, 18, 4, 'b')
  .rect(11, 8, 10, 1, 'i').rect(11, 12, 10, 1, 'i').rect(11, 16, 8, 1, 'i')
  .outline('#')
  .toSprite({ '#': '#1f2937', s: '#9ca3af', b: '#6b7280', i: '#374151' });

/** 押せる岩 */
const BOULDER: PixelSprite = new PixelCanvas()
  .ellipse(15.5, 17, 11, 10, 'r')
  .ellipse(11, 13, 4, 3, 'h')
  .stamp(18, 18, ['d', 'dd']).stamp(8, 21, ['dd'])
  .outline('#')
  .toSprite({ '#': '#292524', r: '#78716c', h: '#a8a29e', d: '#57534e' });

/** 崩落予告のひび */
const CRACK: PixelSprite = new PixelCanvas()
  .line(4, 6, 14, 14, 'c').line(14, 14, 10, 24, 'c').line(14, 14, 26, 10, 'c').line(20, 12, 24, 26, 'c')
  .toSprite({ c: '#1f2937' });

const TRAP_SPRITES: Readonly<Record<TrapKind, PixelSprite>> = {
  pitfall: PITFALL,
  mine: MINE,
  sleepGas: GAS,
  warp: WARP,
  rust: RUST,
  summon: SUMMON,
};

/** 描画用スプライト。隠し罠は undefined */
export function featureSprite(f: TileFeature): PixelSprite | undefined {
  switch (f.kind) {
    case 'trap':
      return f.hidden ? undefined : TRAP_SPRITES[f.trap];
    case 'spring':
      return SPRING;
    case 'fountain':
      return f.effect === 'heal' ? FOUNTAIN_HEAL : FOUNTAIN_CURSE;
    case 'sign':
      return SIGN;
    case 'boulder':
      return BOULDER;
    case 'crack':
      return CRACK;
  }
}

export const ALL_FEATURE_SPRITES: Readonly<Record<string, PixelSprite>> = {
  ...TRAP_SPRITES,
  spring: SPRING,
  fountain_heal: FOUNTAIN_HEAL,
  fountain_curse: FOUNTAIN_CURSE,
  sign: SIGN,
  boulder: BOULDER,
  crack: CRACK,
};

/** 鍛冶屋のドワーフ（スキンに関係なく共通） */
export const BLACKSMITH_SPRITE: PixelSprite = new PixelCanvas()
  .rect(9, 4, 14, 5, 'h')
  .ellipse(15.5, 12, 6, 5, 'f')
  .rect(10, 14, 12, 6, 'b')
  .rect(9, 19, 14, 8, 'a')
  .rect(6, 19, 3, 6, 'f').rect(23, 19, 3, 6, 'f')
  .rect(10, 27, 4, 4, 'k').rect(18, 27, 4, 4, 'k')
  .stamp(11, 10, ['B']).stamp(19, 10, ['B'])
  .rect(26, 8, 2, 12, 'w').rect(24, 4, 7, 5, 's')
  .outline('#')
  .toSprite({ '#': '#2a1a0e', h: '#d97706', f: '#f1c27d', b: '#e5e7eb', a: '#78350f', k: '#3b2412', B: '#111', w: '#8b5a2b', s: '#9ca3af' });
