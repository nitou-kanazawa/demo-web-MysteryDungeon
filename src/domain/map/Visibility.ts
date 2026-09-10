import type { Vec2 } from '../core/Vec2';
import type { DungeonMap } from './DungeonMap';

/**
 * 視界の管理。部屋にいれば部屋全体（外周含む）、通路なら周囲1マスが見える。
 * explored は一度でも見えたマスを記憶する（ミニマップ／暗転表示用）。
 */
export class Visibility {
  private readonly visible: boolean[];
  private readonly explored: boolean[];

  constructor(private readonly map: DungeonMap) {
    const n = map.width * map.height;
    this.visible = new Array<boolean>(n).fill(false);
    this.explored = new Array<boolean>(n).fill(false);
  }

  isVisible(p: Vec2): boolean {
    return this.map.inBounds(p) && (this.visible[this.map.index(p)] ?? false);
  }

  isExplored(p: Vec2): boolean {
    return this.map.inBounds(p) && (this.explored[this.map.index(p)] ?? false);
  }

  /** 観測者位置から視界を再計算する */
  update(observer: Vec2): void {
    this.visible.fill(false);
    const room = this.map.roomAt(observer);
    if (room) {
      for (let y = room.y - 1; y <= room.bottom + 1; y++) {
        for (let x = room.x - 1; x <= room.right + 1; x++) this.mark({ x, y });
      }
    } else {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) this.mark({ x: observer.x + dx, y: observer.y + dy });
      }
    }
  }

  /** あかりの巻物などでフロア全体を既知にする */
  revealAll(): void {
    this.explored.fill(true);
  }

  private mark(p: Vec2): void {
    if (!this.map.inBounds(p)) return;
    const i = this.map.index(p);
    this.visible[i] = true;
    this.explored[i] = true;
  }
}
