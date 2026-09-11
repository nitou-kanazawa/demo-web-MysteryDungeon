import type { DungeonMap } from '../../domain/map/DungeonMap';
import { TileType } from '../../domain/map/Tile';
import type { Room } from '../../domain/map/Room';
import { TILE, hash2 } from './RenderConfig';
import { paintSprite } from './sprites/PixelSprite';
import { TILE_SPRITES } from './sprites/tileSprites';

/**
 * 地形の見た目をオフスクリーンに一度だけ描画してキャッシュする。
 * すべて 32×32 のピクセルスプライト（tileSprites）で構成する。
 */
export class TileArt {
  private cache: HTMLCanvasElement | undefined;
  private cachedMap: DungeonMap | undefined;

  render(map: DungeonMap, shopRoom?: Room): HTMLCanvasElement {
    if (this.cache && this.cachedMap === map) return this.cache;
    const c = document.createElement('canvas');
    c.width = map.width * TILE;
    c.height = map.height * TILE;
    const g = c.getContext('2d');
    if (!g) throw new Error('2d context unavailable');
    g.imageSmoothingEnabled = false;
    const scale = TILE / 32;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const sprite = this.spriteAt(map, x, y);
        paintSprite(g, sprite, x * TILE, y * TILE, scale);
        if (map.get({ x, y }) === TileType.Wall && map.isWalkable({ x, y: y + 1 })) this.drawWallShadow(g, x, y);
      }
    }
    if (shopRoom) this.drawRug(g, shopRoom);
    this.cache = c;
    this.cachedMap = map;
    return c;
  }

  private spriteAt(map: DungeonMap, x: number, y: number) {
    switch (map.get({ x, y })) {
      case TileType.Wall:
        return this.nearFloor(map, x, y) ? TILE_SPRITES.wall : TILE_SPRITES.rock;
      case TileType.Floor:
        return hash2(x, y, 2) < 0.5 ? TILE_SPRITES.floorA : TILE_SPRITES.floorB;
      case TileType.Corridor:
        return TILE_SPRITES.corridor;
      case TileType.Stairs:
        return TILE_SPRITES.stairs;
    }
  }

  private nearFloor(map: DungeonMap, x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && map.isWalkable({ x: x + dx, y: y + dy })) return true;
      }
    }
    return false;
  }

  /** 床に面した壁の下端に落ちる影 */
  private drawWallShadow(g: CanvasRenderingContext2D, x: number, y: number): void {
    const px = x * TILE;
    const py = (y + 1) * TILE;
    const grad = g.createLinearGradient(px, py, px, py + TILE * 0.4);
    grad.addColorStop(0, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(px, py, TILE, TILE * 0.4);
  }

  /** 店の部屋: 赤い絨毯と金の縁取り */
  private drawRug(g: CanvasRenderingContext2D, room: Room): void {
    const x = room.x * TILE;
    const y = room.y * TILE;
    const w = room.w * TILE;
    const h = room.h * TILE;
    g.fillStyle = 'rgba(120,20,30,0.55)';
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(220,180,80,0.7)';
    g.lineWidth = 2;
    g.strokeRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let ty = room.y; ty <= room.bottom; ty++) {
      for (let tx = room.x; tx <= room.right; tx++) {
        if ((tx + ty) % 2 === 0) g.fillRect(tx * TILE + 8, ty * TILE + 8, TILE - 16, TILE - 16);
      }
    }
  }
}
