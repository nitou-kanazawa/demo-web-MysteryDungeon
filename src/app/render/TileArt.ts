import type { DungeonMap } from '../../domain/map/DungeonMap';
import { TileType } from '../../domain/map/Tile';
import { TILE, hash2 } from './RenderConfig';

/**
 * 地形の見た目をオフスクリーンに一度だけ描画してキャッシュする。
 * 手続き的な石畳・レンガ模様で「本家風」の質感を作る。
 */
export class TileArt {
  private cache: HTMLCanvasElement | undefined;
  private cachedMap: DungeonMap | undefined;

  render(map: DungeonMap): HTMLCanvasElement {
    if (this.cache && this.cachedMap === map) return this.cache;
    const c = document.createElement('canvas');
    c.width = map.width * TILE;
    c.height = map.height * TILE;
    const g = c.getContext('2d');
    if (!g) throw new Error('2d context unavailable');
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) this.drawTile(g, map, x, y);
    }
    this.cache = c;
    this.cachedMap = map;
    return c;
  }

  private drawTile(g: CanvasRenderingContext2D, map: DungeonMap, x: number, y: number): void {
    const t = map.get({ x, y });
    const px = x * TILE;
    const py = y * TILE;
    switch (t) {
      case TileType.Wall:
        this.drawWall(g, map, x, y, px, py);
        break;
      case TileType.Floor:
        this.drawFloor(g, x, y, px, py);
        break;
      case TileType.Corridor:
        this.drawCorridor(g, x, y, px, py);
        break;
      case TileType.Stairs:
        this.drawFloor(g, x, y, px, py);
        this.drawStairs(g, px, py);
        break;
    }
  }

  private drawWall(g: CanvasRenderingContext2D, map: DungeonMap, x: number, y: number, px: number, py: number): void {
    const faceBelow = map.isWalkable({ x, y: y + 1 });
    const nearFloor =
      faceBelow ||
      map.isWalkable({ x, y: y - 1 }) ||
      map.isWalkable({ x: x - 1, y }) ||
      map.isWalkable({ x: x + 1, y }) ||
      map.isWalkable({ x: x - 1, y: y - 1 }) ||
      map.isWalkable({ x: x + 1, y: y - 1 }) ||
      map.isWalkable({ x: x - 1, y: y + 1 }) ||
      map.isWalkable({ x: x + 1, y: y + 1 });
    if (!nearFloor) {
      g.fillStyle = '#0d0b14';
      g.fillRect(px, py, TILE, TILE);
      return;
    }
    // 岩肌ベース
    const v = hash2(x, y, 1) * 14 - 7;
    g.fillStyle = `rgb(${58 + v},${52 + v},${74 + v})`;
    g.fillRect(px, py, TILE, TILE);
    // レンガ目地
    g.fillStyle = 'rgba(10,8,20,0.55)';
    g.fillRect(px, py + TILE / 2 - 1, TILE, 2);
    g.fillRect(px, py + TILE - 1, TILE, 1);
    const off = y % 2 === 0 ? TILE / 2 : 0;
    g.fillRect(px + off - 1, py, 2, TILE / 2);
    g.fillRect(px + ((off + TILE / 2) % TILE) - 1, py + TILE / 2, 2, TILE / 2);
    // 上面ハイライト・下面の影
    g.fillStyle = 'rgba(180,170,210,0.10)';
    g.fillRect(px, py, TILE, 3);
    if (faceBelow) {
      const grad = g.createLinearGradient(px, py + TILE * 0.55, px, py + TILE);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.45)');
      g.fillStyle = grad;
      g.fillRect(px, py + TILE * 0.55, TILE, TILE * 0.45);
    }
  }

  private drawFloor(g: CanvasRenderingContext2D, x: number, y: number, px: number, py: number): void {
    const v = hash2(x, y, 2) * 16 - 8;
    g.fillStyle = `rgb(${112 + v},${94 + v},${76 + v})`;
    g.fillRect(px, py, TILE, TILE);
    // 石畳の目地
    g.fillStyle = 'rgba(30,20,15,0.35)';
    g.fillRect(px, py, TILE, 1);
    g.fillRect(px, py, 1, TILE);
    // ハイライト
    g.fillStyle = 'rgba(255,240,220,0.06)';
    g.fillRect(px + 1, py + 1, TILE - 2, 2);
    // 小石
    if (hash2(x, y, 3) < 0.18) {
      g.fillStyle = 'rgba(40,30,25,0.5)';
      const sx = px + 4 + hash2(x, y, 4) * 14;
      const sy = py + 4 + hash2(x, y, 5) * 14;
      g.fillRect(sx, sy, 2, 2);
    }
    // ヒビ
    if (hash2(x, y, 6) < 0.08) {
      g.strokeStyle = 'rgba(30,20,15,0.45)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(px + 3, py + 6 + hash2(x, y, 7) * 10);
      g.lineTo(px + 12, py + 10 + hash2(x, y, 8) * 8);
      g.lineTo(px + 20, py + 4 + hash2(x, y, 9) * 12);
      g.stroke();
    }
  }

  private drawCorridor(g: CanvasRenderingContext2D, x: number, y: number, px: number, py: number): void {
    const v = hash2(x, y, 10) * 14 - 7;
    g.fillStyle = `rgb(${92 + v},${74 + v},${58 + v})`;
    g.fillRect(px, py, TILE, TILE);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = `rgba(20,14,10,${0.25 + hash2(x, y, 11 + i) * 0.3})`;
      g.fillRect(px + hash2(x, y, 20 + i) * 20, py + hash2(x, y, 30 + i) * 20, 3, 2);
    }
  }

  private drawStairs(g: CanvasRenderingContext2D, px: number, py: number): void {
    g.fillStyle = '#17120f';
    g.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    for (let i = 0; i < 4; i++) {
      const shade = 60 + i * 28;
      g.fillStyle = `rgb(${shade},${shade - 8},${shade - 18})`;
      g.fillRect(px + 3 + i * 2, py + 4 + i * 4, TILE - 6 - i * 4, 3);
    }
    g.strokeStyle = 'rgba(255,220,140,0.5)';
    g.lineWidth = 1;
    g.strokeRect(px + 2.5, py + 2.5, TILE - 5, TILE - 5);
  }
}
