export enum TileType {
  Wall = 0,
  Floor = 1,
  Corridor = 2,
  Stairs = 3,
}

export const isWalkableTile = (t: TileType): boolean => t !== TileType.Wall;
