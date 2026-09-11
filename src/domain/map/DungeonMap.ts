import { DIR_VEC, isDiagonal, type Direction, type Vec2, addVec } from '../core/Vec2';
import { Room } from './Room';
import { TileType, blocksProjectile, isWalkableTile } from './Tile';
import type { CorridorInfo } from './DungeonGenerator';

/** ダンジョン1フロアの地形。地形以外（アクター・アイテム）は持たない */
export class DungeonMap {
  private readonly tiles: TileType[];
  readonly rooms: Room[] = [];
  /** 掘った通路の記録（生成器が登録） */
  readonly corridors: CorridorInfo[] = [];
  /** 掘らなかった接続の経路（スイッチで架かる橋の候補） */
  readonly unusedPaths: Vec2[][] = [];
  private stairsPos: Vec2 | undefined;
  /** タイルが書き換わるたびに増える（描画キャッシュの無効化用） */
  version = 0;

  constructor(
    readonly width: number,
    readonly height: number,
    /** 部屋・通路以外を埋めるタイル（壁／水／空） */
    readonly solid: TileType = TileType.Wall,
  ) {
    this.tiles = new Array<TileType>(width * height).fill(solid);
  }

  inBounds(p: Vec2): boolean {
    return p.x >= 0 && p.y >= 0 && p.x < this.width && p.y < this.height;
  }

  index(p: Vec2): number {
    return p.y * this.width + p.x;
  }

  get(p: Vec2): TileType {
    if (!this.inBounds(p)) return TileType.Wall;
    return this.tiles[this.index(p)] ?? this.solid;
  }

  /** 投擲物・魔法弾・ブレスが p を通過できるか（水・空は通る） */
  passesProjectile(p: Vec2): boolean {
    return this.inBounds(p) && !blocksProjectile(this.get(p));
  }

  set(p: Vec2, t: TileType): void {
    if (!this.inBounds(p)) return;
    this.tiles[this.index(p)] = t;
    this.version++;
    if (t === TileType.Stairs) this.stairsPos = p;
  }

  get stairs(): Vec2 {
    if (!this.stairsPos) throw new Error('stairs not placed');
    return this.stairsPos;
  }

  isWalkable(p: Vec2): boolean {
    return isWalkableTile(this.get(p));
  }

  /** p にいる部屋。通路上なら undefined */
  roomAt(p: Vec2): Room | undefined {
    return this.rooms.find((r) => r.contains(p));
  }

  /**
   * from から dir 方向へ「地形的に」移動できるか。
   * 斜め移動は角を挟む2つの直交マスがどちらも壁でない場合のみ許可（角抜け禁止）。
   */
  canStep(from: Vec2, dir: Direction): boolean {
    const to = addVec(from, DIR_VEC[dir]);
    if (!this.isWalkable(to)) return false;
    if (isDiagonal(dir)) {
      const v = DIR_VEC[dir];
      if (!this.isWalkable({ x: from.x + v.x, y: from.y })) return false;
      if (!this.isWalkable({ x: from.x, y: from.y + v.y })) return false;
    }
    return true;
  }

  *walkableTiles(): IterableIterator<Vec2> {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const p = { x, y };
        if (this.isWalkable(p)) yield p;
      }
    }
  }
}
