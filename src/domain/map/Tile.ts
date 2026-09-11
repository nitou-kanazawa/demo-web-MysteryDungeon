export enum TileType {
  /** 岩壁: 歩けない・投擲物も通さない */
  Wall = 0,
  Floor = 1,
  Corridor = 2,
  Stairs = 3,
  /** 水: 歩けないが投擲物・魔法弾・ブレスは通る */
  Water = 4,
  /** 空（奈落）: 歩けないが投擲物などは通る */
  Void = 5,
  /** 氷: 歩けるが止まるまで滑る。炎で溶けて水になる */
  Ice = 6,
  /** 溶岩: 歩けるがターン終了時にダメージ。投げ物は燃える */
  Lava = 7,
}

export const isWalkableTile = (t: TileType): boolean =>
  t === TileType.Floor || t === TileType.Corridor || t === TileType.Stairs || t === TileType.Ice || t === TileType.Lava;

/** 部屋の床として扱うタイル（罠や物を置ける） */
export const isRoomFloor = (t: TileType): boolean => t === TileType.Floor || t === TileType.Ice;

/** 投擲物・魔法弾・ブレスを遮るか */
export const blocksProjectile = (t: TileType): boolean => t === TileType.Wall;

/** 部屋・通路の外側を埋めるタイル（壁／水／空） */
export const isSolidTile = (t: TileType): boolean => t === TileType.Wall || t === TileType.Water || t === TileType.Void;
