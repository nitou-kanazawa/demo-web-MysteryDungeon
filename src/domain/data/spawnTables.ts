/** アイテム出現テーブル。weight は相対確率 */
export interface ItemSpawnEntry {
  readonly defId: string;
  readonly weight: number;
  readonly minFloor: number;
  readonly maxFloor: number;
}

export const ITEM_SPAWN_TABLE: readonly ItemSpawnEntry[] = [
  { defId: 'copper_sword', weight: 6, minFloor: 1, maxFloor: 6 },
  { defId: 'iron_sword', weight: 2, minFloor: 4, maxFloor: 10 },
  { defId: 'scale_shield', weight: 6, minFloor: 1, maxFloor: 6 },
  { defId: 'iron_shield', weight: 2, minFloor: 4, maxFloor: 10 },
  { defId: 'bread', weight: 12, minFloor: 1, maxFloor: 10 },
  { defId: 'big_bread', weight: 3, minFloor: 3, maxFloor: 10 },
  { defId: 'herb', weight: 16, minFloor: 1, maxFloor: 10 },
  { defId: 'good_herb', weight: 5, minFloor: 3, maxFloor: 10 },
  { defId: 'power_seed', weight: 2, minFloor: 2, maxFloor: 10 },
  { defId: 'guard_seed', weight: 2, minFloor: 2, maxFloor: 10 },
  { defId: 'scroll_light', weight: 5, minFloor: 1, maxFloor: 10 },
  { defId: 'scroll_warp', weight: 4, minFloor: 1, maxFloor: 10 },
  { defId: 'scroll_confuse', weight: 4, minFloor: 2, maxFloor: 10 },
  { defId: 'scroll_escape', weight: 3, minFloor: 1, maxFloor: 10 },
  { defId: 'scroll_search', weight: 4, minFloor: 2, maxFloor: 10 },
  { defId: 'staff_trap', weight: 2, minFloor: 3, maxFloor: 10 },
  { defId: 'staff_paralyze', weight: 3, minFloor: 2, maxFloor: 10 },
  { defId: 'staff_blow', weight: 3, minFloor: 2, maxFloor: 10 },
  { defId: 'staff_thunder', weight: 2, minFloor: 4, maxFloor: 10 },
  { defId: 'pot_storage', weight: 4, minFloor: 1, maxFloor: 10 },
  { defId: 'pot_alchemy', weight: 4, minFloor: 1, maxFloor: 10 },
  { defId: 'pot_merge', weight: 2, minFloor: 3, maxFloor: 10 },
  { defId: 'pot_change', weight: 2, minFloor: 3, maxFloor: 10 },
  { defId: 'iron_lump', weight: 5, minFloor: 2, maxFloor: 10 },
  { defId: 'holy_water', weight: 5, minFloor: 1, maxFloor: 10 },
  { defId: 'monster_fang', weight: 3, minFloor: 5, maxFloor: 10 },
  { defId: 'torch', weight: 5, minFloor: 1, maxFloor: 10 },
  { defId: 'gold', weight: 10, minFloor: 1, maxFloor: 10 },
];

export interface FloorConfig {
  readonly maxFloor: number;
  readonly monstersPerFloor: readonly [number, number];
  readonly itemsPerFloor: readonly [number, number];
  /** 満腹度が1減るターン間隔 */
  readonly hungerInterval: number;
  /** 自然回復の間隔（ターン） */
  readonly regenInterval: number;
  /** 仲間の最大数 */
  readonly maxAllies: number;
  /** モンスターの追加湧き間隔（ターン） */
  readonly respawnInterval: number;
  /** 店が生成される確率（2F 以降） */
  readonly shopChance: number;
  /** 店の商品数 */
  readonly shopItems: readonly [number, number];
  /** モンスターハウスの生成確率 */
  readonly monsterHouseChance: number;
  /** モンスターハウスが出る最初の階 */
  readonly monsterHouseMinFloor: number;
  /** 罠の数（2F 以降） */
  readonly trapsPerFloor: readonly [number, number];
  /** 鍛冶屋が現れる確率（2F 以降） */
  readonly blacksmithChance: number;
  /** 番人が階段の部屋に現れる確率（4F 以降） */
  readonly guardianChance: number;
  /** 宝物庫（鍵と扉）の確率（2F 以降） */
  readonly vaultChance: number;
  /** 囚われた仲間（檻）の確率（2F 以降） */
  readonly cageChance: number;
  /** 反射壁（鏡）の確率（壁テーマの 2F 以降） */
  readonly mirrorChance: number;
  /** スイッチの確率（2F 以降） */
  readonly switchChance: number;
  /** 霧の確率（3F 以降） */
  readonly fogChance: number;
  /** 転がる岩の確率（3F 以降） */
  readonly rollingRockChance: number;
  /** 闇市の確率（4F 以降、店が無いとき） */
  readonly blackMarketChance: number;
  /** 迷路フロアの確率（3F 以降） */
  readonly mazeChance: number;
  /** 大部屋フロアの確率（3F 以降） */
  readonly bigRoomChance: number;
  /** フロア帯の代替テーマ（廃墟・暗黒）を抽選するか */
  readonly alternativeThemes: boolean;
}

export const DEFAULT_FLOOR_CONFIG: FloorConfig = {
  maxFloor: 10,
  monstersPerFloor: [4, 7],
  itemsPerFloor: [5, 8],
  hungerInterval: 10,
  regenInterval: 6,
  maxAllies: 3,
  respawnInterval: 40,
  shopChance: 0.35,
  shopItems: [3, 6],
  monsterHouseChance: 0.2,
  monsterHouseMinFloor: 3,
  trapsPerFloor: [2, 5],
  blacksmithChance: 0.25,
  guardianChance: 0.25,
  vaultChance: 0.25,
  cageChance: 0.2,
  mirrorChance: 0.4,
  switchChance: 0.35,
  fogChance: 0.15,
  rollingRockChance: 0.3,
  blackMarketChance: 0.15,
  mazeChance: 0.1,
  bigRoomChance: 0.1,
  alternativeThemes: true,
};
