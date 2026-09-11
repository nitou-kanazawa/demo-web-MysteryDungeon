import { TileType } from '../map/Tile';

export type DungeonTheme = 'cave' | 'water' | 'ice' | 'volcano' | 'sky' | 'ruins' | 'dark';

/** ライティングの見え方（0..1）。値が大きいほど明るい */
export interface LightingProfile {
  /** 探索済み・視界外の明るさ */
  readonly explored: number;
  /** 視界内のベース明るさ */
  readonly visible: number;
  /** 松明の半径（タイル） */
  readonly torchRadius: number;
  /** 暖色の強さ */
  readonly warm: number;
}

export interface ThemeDef {
  readonly id: DungeonTheme;
  readonly name: string;
  readonly minFloor: number;
  readonly maxFloor: number;
  /** 部屋・通路以外を埋めるタイル */
  readonly solid: TileType;
  readonly description: string;
  readonly lighting: LightingProfile;
  /** 生成レイアウト（省略時は sectors） */
  readonly layout?: 'sectors' | 'town';
  /** 部屋の中でも視界がこの半径まで（暗黒） */
  readonly sightRadius?: number;
  /** 敵の攻撃力への上乗せ */
  readonly monsterAtkBonus?: number;
  /** 同じフロア帯に候補が複数あるとき、先頭以外は乱数で選ばれる */
  readonly alternativeOf?: DungeonTheme;
}

export const THEME_DEFS: readonly ThemeDef[] = [
  {
    id: 'cave',
    name: '石の洞窟',
    minFloor: 1,
    maxFloor: 2,
    solid: TileType.Wall,
    description: '岩壁に囲まれた洞窟。松明の光だけが頼り。',
    lighting: { explored: 0.22, visible: 0.5, torchRadius: 7, warm: 1 },
  },
  {
    id: 'water',
    name: '地底湖',
    minFloor: 3,
    maxFloor: 4,
    solid: TileType.Water,
    description: '部屋は島、通路は橋。水の上を投げ物や魔法弾が飛び越える。潮が満ちると橋が沈む。',
    lighting: { explored: 0.28, visible: 0.6, torchRadius: 8, warm: 0.6 },
  },
  {
    id: 'ice',
    name: '氷の洞窟',
    minFloor: 5,
    maxFloor: 6,
    solid: TileType.Wall,
    description: '床は氷。乗ると止まるまで滑る。炎で溶けた氷は水になる。',
    lighting: { explored: 0.35, visible: 0.7, torchRadius: 8, warm: 0.3 },
  },
  {
    id: 'volcano',
    name: '火山',
    minFloor: 7,
    maxFloor: 8,
    solid: TileType.Wall,
    description: '溶岩が流れる灼熱の洞窟。溶岩の上は歩けるが焼ける。',
    lighting: { explored: 0.2, visible: 0.45, torchRadius: 6, warm: 1.2 },
  },
  {
    id: 'ruins',
    name: '廃墟の街',
    minFloor: 5,
    maxFloor: 6,
    solid: TileType.Wall,
    description: '崩れた家々が並ぶ地下の街。店や鍛冶屋が今も商いを続けている。',
    lighting: { explored: 0.3, visible: 0.6, torchRadius: 7, warm: 0.8 },
    layout: 'town',
    alternativeOf: 'ice',
  },
  {
    id: 'dark',
    name: '暗黒の回廊',
    minFloor: 7,
    maxFloor: 8,
    solid: TileType.Wall,
    description: '光の届かない闇。松明の火だけが頼りで、魔物は闇の中で牙を研ぐ。',
    lighting: { explored: 0.12, visible: 0.3, torchRadius: 3, warm: 1.1 },
    sightRadius: 1,
    monsterAtkBonus: 3,
    alternativeOf: 'volcano',
  },
  {
    id: 'sky',
    name: '天空の浮島',
    minFloor: 9,
    maxFloor: 99,
    solid: TileType.Void,
    description: '雲の上に浮かぶ島々。落としたものは二度と戻らない。歩いた回廊は崩れる。',
    lighting: { explored: 0.55, visible: 0.9, torchRadius: 10, warm: 0.2 },
  },
];

export const THEME_MAP: ReadonlyMap<DungeonTheme, ThemeDef> = new Map(THEME_DEFS.map((t) => [t.id, t]));

/** フロア帯の既定テーマ（帯の先頭。cave/water/ice/volcano/sky） */
export function themeForFloor(floor: number): ThemeDef {
  return THEME_DEFS.find((t) => floor >= t.minFloor && floor <= t.maxFloor && !t.alternativeOf) ?? (THEME_DEFS[0] as ThemeDef);
}

/** フロア帯の候補テーマ（既定＋代替） */
export function themesForFloor(floor: number): ThemeDef[] {
  return THEME_DEFS.filter((t) => floor >= t.minFloor && floor <= t.maxFloor);
}

/** フロア到着時に候補から 1 つ選ぶ。候補が複数あれば乱数で決める */
export function pickTheme(floor: number, pick: <T>(items: readonly T[]) => T): ThemeDef {
  const candidates = themesForFloor(floor);
  if (candidates.length <= 1) return candidates[0] ?? themeForFloor(floor);
  return pick(candidates);
}
