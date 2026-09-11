/** 拠点の村（横スクロール）の配置。座標はワールドピクセル */
export type BuildingId = 'house' | 'weapon_shop' | 'ranch' | 'breeding' | 'library' | 'dungeon';

export interface Building {
  readonly id: BuildingId;
  readonly name: string;
  /** 建物の左端 x */
  readonly x: number;
  readonly width: number;
  /** 入口の中心 x（この前に立つと入れる） */
  readonly doorX: number;
  readonly prompt: string;
}

export const WORLD_WIDTH = 2600;
export const GROUND_Y_RATIO = 0.66;
export const HERO_SPEED = 0.28; // px/ms
export const DOOR_RANGE = 40;

export const BUILDINGS: readonly Building[] = [
  { id: 'house', name: 'ヤンガスの家', x: 120, width: 260, doorX: 250, prompt: '倉庫・設定' },
  { id: 'weapon_shop', name: '武器屋', x: 520, width: 240, doorX: 640, prompt: '買う・売る' },
  { id: 'ranch', name: '牧場', x: 900, width: 340, doorX: 1070, prompt: '仲間を見る' },
  { id: 'breeding', name: '配合所', x: 1380, width: 240, doorX: 1500, prompt: '配合する' },
  { id: 'library', name: '図書館', x: 1760, width: 220, doorX: 1870, prompt: '図鑑を見る' },
  { id: 'dungeon', name: 'ダンジョン入り口', x: 2180, width: 260, doorX: 2310, prompt: '出撃する' },
];

export const HERO_START_X = 400;

export function buildingAt(x: number): Building | undefined {
  return BUILDINGS.find((b) => Math.abs(x - b.doorX) <= DOOR_RANGE);
}

export function clampHeroX(x: number): number {
  return Math.max(40, Math.min(WORLD_WIDTH - 40, x));
}
