import type { DungeonMap } from '../../domain/map/DungeonMap';
import { TileType, isSolidTile } from '../../domain/map/Tile';
import type { Room } from '../../domain/map/Room';
import type { DungeonTheme } from '../../domain/data/themes';
import { TILE, hash2 } from './RenderConfig';
import { paintSprite, type PixelSprite } from './sprites/PixelSprite';
import { THEME_TILES, TILE_SPRITES } from './sprites/tileSprites';

/**
 * 地形の見た目をオフスクリーンに描画してキャッシュする。
 * テーマ（洞窟／地底湖／天空）でタイルセットが変わり、水・空は 2 フレームでアニメする。
 */
export class TileArt {
  private readonly frames: HTMLCanvasElement[] = [];
  private cachedMap: DungeonMap | undefined;

  /** frame: 0 か 1（水・雲のアニメ） */
  render(map: DungeonMap, theme: DungeonTheme, shopRoom: Room | undefined, frame: 0 | 1): HTMLCanvasElement {
    if (this.cachedMap !== map) {
      this.frames.length = 0;
      this.cachedMap = map;
    }
    const hit = this.frames[frame];
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = map.width * TILE;
    c.height = map.height * TILE;
    const g = c.getContext('2d');
    if (!g) throw new Error('2d context unavailable');
    g.imageSmoothingEnabled = false;
    const scale = TILE / 32;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        paintSprite(g, this.spriteAt(map, theme, x, y, frame), x * TILE, y * TILE, scale);
      }
    }
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) this.drawEdge(g, map, theme, x, y, scale);
    }
    if (shopRoom) this.drawRug(g, shopRoom);
    this.frames[frame] = c;
    return c;
  }

  private spriteAt(map: DungeonMap, theme: DungeonTheme, x: number, y: number, frame: 0 | 1): PixelSprite {
    const t = map.get({ x, y });
    const set = theme === 'cave' ? undefined : THEME_TILES[theme];
    const variant = hash2(x, y, 2) < 0.5 ? 0 : 1;
    switch (t) {
      case TileType.Wall:
        return this.nearFloor(map, x, y) ? TILE_SPRITES.wall : TILE_SPRITES.rock;
      case TileType.Water:
      case TileType.Void:
        return set ? set.solid[frame] : TILE_SPRITES.rock;
      case TileType.Floor:
        return set ? set.floor[variant] : variant === 0 ? TILE_SPRITES.floorA : TILE_SPRITES.floorB;
      case TileType.Corridor:
        return set ? set.corridor : TILE_SPRITES.corridor;
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

  /** テーマごとの縁: 洞窟は壁の影、地底湖は岸辺、天空は崖の面 */
  private drawEdge(g: CanvasRenderingContext2D, map: DungeonMap, theme: DungeonTheme, x: number, y: number, scale: number): void {
    const t = map.get({ x, y });
    const below = map.get({ x, y: y + 1 });
    if (theme === 'cave') {
      if (t === TileType.Wall && map.isWalkable({ x, y: y + 1 })) {
        const px = x * TILE;
        const py = (y + 1) * TILE;
        const grad = g.createLinearGradient(px, py, px, py + TILE * 0.4);
        grad.addColorStop(0, 'rgba(0,0,0,0.45)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(px, py, TILE, TILE * 0.4);
      }
      return;
    }
    if (theme === 'water') {
      if (map.isWalkable({ x, y }) && below === TileType.Water) paintSprite(g, THEME_TILES.water.edge, x * TILE, y * TILE, scale);
      return;
    }
    if (map.isWalkable({ x, y }) && isSolidTile(below) && below === TileType.Void) {
      paintSprite(g, THEME_TILES.sky.edge, x * TILE, (y + 1) * TILE, scale);
    }
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
