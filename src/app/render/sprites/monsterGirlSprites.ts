import { PixelCanvas } from './PixelCanvas';
import type { PixelSprite } from './PixelSprite';

/**
 * モンスター娘スキン。共通の少女ベース（髪・顔・ワンピース）に
 * 種族ごとの髪色・衣装色・アクセサリ（耳・翼・角・王冠など）を重ねる。
 * 内部の種族ID・ステータスには一切影響しない、見た目だけの差し替え。
 */
interface GirlSpec {
  readonly hair: string;
  readonly hairShade: string;
  readonly dress: string;
  readonly dressShade: string;
  readonly accent: string;
  readonly skin?: string;
  readonly eye?: string;
  /** 体を描く前（背面の翼など） */
  readonly behind?: (c: PixelCanvas) => void;
  /** 体を描いた後（頭の飾りなど） */
  readonly front?: (c: PixelCanvas) => void;
  /** 足を描かない（浮遊） */
  readonly floating?: boolean;
}

const PALETTE_KEYS = {
  H: 'hair',
  I: 'hairShade',
  D: 'dress',
  E: 'dressShade',
  A: 'accent',
} as const;

function girl(spec: GirlSpec): PixelSprite {
  const c = new PixelCanvas();
  spec.behind?.(c);
  // 後ろ髪
  c.ellipse(15.5, 13, 8, 9, 'H');
  c.rect(7, 13, 18, 8, 'H');
  // 顔
  c.ellipse(15.5, 13, 6, 6, 'f');
  c.rect(10, 12, 12, 5, 'f');
  // 前髪
  c.rect(9, 6, 14, 4, 'H');
  c.stamp(9, 10, ['HH..H....H..HH']);
  c.stamp(9, 8, ['I', 'I']).stamp(22, 8, ['I', 'I']);
  // 目・頬・口
  c.stamp(11, 12, ['B', 'B', 'B']).stamp(12, 12, ['e', 'B', 'B']);
  c.stamp(19, 12, ['e', 'B', 'B']).stamp(20, 12, ['B', 'B', 'B']);
  c.stamp(9, 15, ['p']).stamp(22, 15, ['p']);
  c.stamp(15, 17, ['mm']);
  // 首・ワンピース
  c.rect(14, 19, 4, 2, 'f');
  c.trapezoid(15.5, 20, 9, 8, 18, 'D');
  c.rect(7, 26, 18, 3, 'D');
  c.rect(7, 28, 18, 1, 'E');
  c.stamp(14, 21, ['AA', 'AA']);
  // 腕
  c.rect(6, 21, 3, 6, 'f').rect(23, 21, 3, 6, 'f');
  c.rect(6, 21, 3, 2, 'D').rect(23, 21, 3, 2, 'D');
  // 足
  if (!spec.floating) {
    c.rect(11, 29, 3, 2, 'f').rect(18, 29, 3, 2, 'f');
    c.rect(11, 30, 3, 2, 'k').rect(18, 30, 3, 2, 'k');
  }
  spec.front?.(c);
  c.outline('#');
  const palette: Record<string, string> = {
    '#': '#2a1a2e',
    f: spec.skin ?? '#f8dcc4',
    p: '#f9a8b8',
    m: '#c2410c',
    B: spec.eye ?? '#1f2937',
    e: '#ffffff',
    k: '#3b2412',
    W: '#ffffff',
    w: '#cbd5e1',
    S: '#94a3b8',
  };
  for (const [ch, key] of Object.entries(PALETTE_KEYS)) palette[ch] = spec[key];
  return { rows: c.toSprite({}).rows, palette };
}

/** コウモリ翼（背面） */
const batWings = (c: PixelCanvas): void => {
  c.ellipse(4, 20, 5, 5, 'A').ellipse(27, 20, 5, 5, 'A');
  c.stamp(1, 16, ['A', 'AA']).stamp(29, 16, ['.A', 'AA']);
};
/** 羽根の翼（背面） */
const featherWings = (c: PixelCanvas): void => {
  c.ellipse(4, 19, 5, 7, 'A').ellipse(27, 19, 5, 7, 'A');
  c.line(1, 18, 7, 18, 'E').line(1, 22, 7, 22, 'E').line(24, 18, 30, 18, 'E').line(24, 22, 30, 22, 'E');
};
/** 石の翼（背面） */
const stoneWings = (c: PixelCanvas): void => {
  c.stamp(0, 12, ['......A', '....AAA', '..AAAAA', 'AAAAAAA', '..AAAAA', '....AAA']);
  c.stamp(25, 12, ['A', 'AAA', 'AAAAA', 'AAAAAAA', 'AAAAA', 'AAA']);
};
/** ゼリーの帽子（スライム系） */
const gelHat = (c: PixelCanvas): void => {
  c.ellipse(15.5, 5, 8, 4, 'A');
  c.stamp(14, 1, ['.A', 'AA']);
  c.stamp(20, 7, ['A', 'A']);
};
/** 角 */
const horns = (c: PixelCanvas): void => {
  c.stamp(7, 2, ['A', 'A', 'AA', '.AA']).stamp(23, 2, ['.A', '.A', 'AA', 'AA']);
};
/** 王冠 */
const crown = (c: PixelCanvas): void => {
  c.rect(10, 3, 12, 4, 'A');
  c.stamp(10, 0, ['A....A....A', 'A...AA...AA', 'AAAAAAAAAAA']);
};
/** 丸い耳 */
const roundEars = (c: PixelCanvas): void => {
  c.ellipse(7, 7, 3, 3, 'H').ellipse(24, 7, 3, 3, 'H');
  c.ellipse(7, 7, 1, 1, 'A').ellipse(24, 7, 1, 1, 'A');
};
/** 尖った耳 */
const pointyEars = (c: PixelCanvas): void => {
  c.stamp(5, 5, ['..H', '.HH', 'HHH']).stamp(24, 5, ['H', 'HH', 'HHH']);
};
/** ハンマー（右手） */
const hammer = (c: PixelCanvas): void => {
  c.rect(27, 12, 2, 15, 'S').rect(24, 6, 8, 6, 'A').rect(24, 6, 8, 1, 'w');
};
/** 尻尾 */
const tail = (c: PixelCanvas): void => {
  c.line(25, 27, 30, 23, 'A', 2).stamp(29, 21, ['AA', 'A']);
};
/** 肩当て（石） */
const pauldrons = (c: PixelCanvas): void => {
  c.rect(4, 19, 6, 4, 'A').rect(22, 19, 6, 4, 'A').rect(4, 19, 6, 1, 'w').rect(22, 19, 6, 1, 'w');
};
/** 幽霊の裾（浮遊） */
const ghostHem = (c: PixelCanvas): void => {
  c.ellipse(9, 29, 3, 2, 'D').ellipse(15.5, 30, 3, 2, 'D').ellipse(22, 29, 3, 2, 'D');
  c.stamp(4, 10, ['A', 'AA']);
};

export const MONSTER_GIRL_SPRITES: Readonly<Record<string, PixelSprite>> = {
  slime: girl({ hair: '#5eb3ff', hairShade: '#2f7fd6', dress: '#bfe3ff', dressShade: '#7fc2ff', accent: '#4FA7FF', front: gelHat }),
  shebeth: girl({ hair: '#ff8f8f', hairShade: '#e05252', dress: '#ffd6d6', dressShade: '#ffb0b0', accent: '#FF7A7A', front: gelHat }),
  king_slime: girl({ hair: '#3B82F6', hairShade: '#2563eb', dress: '#dbeafe', dressShade: '#93c5fd', accent: '#fbbf24', front: crown }),
  dracky: girl({ hair: '#7c3aed', hairShade: '#5b21b6', dress: '#4c1d95', dressShade: '#3b0764', accent: '#B08CFF', behind: batWings, front: pointyEars }),
  taho_dracky: girl({ hair: '#ec4899', hairShade: '#be185d', dress: '#831843', dressShade: '#500724', accent: '#F472B6', behind: batWings, front: pointyEars }),
  hammerhood: girl({ hair: '#c98a3f', hairShade: '#9a6524', dress: '#E0B070', dressShade: '#c08c4a', accent: '#9ca3af', front: (c) => { roundEars(c); hammer(c); } }),
  ghost: girl({ hair: '#e0f2fe', hairShade: '#bae6fd', dress: '#f0f9ff', dressShade: '#bae6fd', accent: '#93c5fd', skin: '#fdf4ff', eye: '#1e3a8a', floating: true, front: ghostHem }),
  chimaera: girl({ hair: '#f59e0b', hairShade: '#b45309', dress: '#fde68a', dressShade: '#f59e0b', accent: '#FFD24F', behind: featherWings }),
  golem: girl({ hair: '#9ca3af', hairShade: '#6b7280', dress: '#4b5563', dressShade: '#374151', accent: '#A0A0A0', eye: '#ef4444', front: pauldrons }),
  dragon: girl({ hair: '#ef4444', hairShade: '#b91c1c', dress: '#7f1d1d', dressShade: '#450a0a', accent: '#fde68a', behind: (c) => { batWings(c); tail(c); }, front: horns }),
  metal_dragon: girl({ hair: '#cbd5e1', hairShade: '#94a3b8', dress: '#475569', dressShade: '#1e293b', accent: '#e2e8f0', eye: '#f87171', behind: (c) => { batWings(c); tail(c); }, front: horns }),
  gargoyle: girl({ hair: '#64748b', hairShade: '#475569', dress: '#1f2937', dressShade: '#111827', accent: '#8b9bb4', eye: '#f87171', behind: stoneWings, front: horns }),
};
