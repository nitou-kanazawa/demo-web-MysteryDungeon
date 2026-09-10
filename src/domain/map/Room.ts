import type { Vec2 } from '../core/Vec2';

/** 矩形の部屋。(x,y) は左上、w/h は床タイルの幅と高さ */
export class Room {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number,
  ) {}

  get right(): number {
    return this.x + this.w - 1;
  }
  get bottom(): number {
    return this.y + this.h - 1;
  }
  get center(): Vec2 {
    return { x: this.x + Math.floor(this.w / 2), y: this.y + Math.floor(this.h / 2) };
  }

  contains(p: Vec2): boolean {
    return p.x >= this.x && p.x <= this.right && p.y >= this.y && p.y <= this.bottom;
  }

  /** 部屋の外周1マス（壁・出入口）まで含めた範囲に入っているか */
  containsWithBorder(p: Vec2): boolean {
    return p.x >= this.x - 1 && p.x <= this.right + 1 && p.y >= this.y - 1 && p.y <= this.bottom + 1;
  }

  intersects(o: Room, margin = 0): boolean {
    return !(
      this.right + margin < o.x ||
      o.right + margin < this.x ||
      this.bottom + margin < o.y ||
      o.bottom + margin < this.y
    );
  }

  *tiles(): IterableIterator<Vec2> {
    for (let y = this.y; y <= this.bottom; y++) {
      for (let x = this.x; x <= this.right; x++) yield { x, y };
    }
  }
}
