import { SPRITE_SIZE, type PixelSprite } from './PixelSprite';

/**
 * 32×32 の文字グリッドに図形を描いて PixelSprite を作るビルダー。
 * 手描き（stamp）と図形（ellipse/rect/line）を組み合わせ、最後に outline で縁取りする。
 * 座標は左上原点、ピクセル中心で判定する。
 */
export class PixelCanvas {
  private readonly grid: string[][];

  constructor(readonly size = SPRITE_SIZE) {
    this.grid = Array.from({ length: size }, () => new Array<string>(size).fill('.'));
  }

  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return '.';
    return this.grid[y]?.[x] ?? '.';
  }

  set(x: number, y: number, ch: string): this {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return this;
    const row = this.grid[y];
    if (row) row[Math.floor(x)] = ch;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, ch);
    return this;
  }

  /** 中心 (cx, cy)・半径 (rx, ry) の塗り楕円。cx=15.5 で左右対称になる */
  ellipse(cx: number, cy: number, rx: number, ry: number, ch: string): this {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const dx = (x - cx) / (rx + 0.5);
        const dy = (y - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1) this.set(x, y, ch);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, ch: string, thickness = 1): this {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      for (let t = 0; t < thickness; t++) this.set(x + t, y, ch);
    }
    return this;
  }

  /** 台形（上辺 topW、下辺 bottomW、中心 cx、y から h 行） */
  trapezoid(cx: number, y: number, h: number, topW: number, bottomW: number, ch: string): this {
    for (let i = 0; i < h; i++) {
      const w = topW + ((bottomW - topW) * i) / Math.max(1, h - 1);
      const x0 = Math.round(cx - w / 2 + 0.5);
      for (let x = x0; x < x0 + Math.round(w); x++) this.set(x, y + i, ch);
    }
    return this;
  }

  /** 手描きの断片を貼る。'.' と ' ' は透明 */
  stamp(x: number, y: number, rows: readonly string[]): this {
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const ch = row[dx] ?? '.';
        if (ch !== '.' && ch !== ' ') this.set(x + dx, y + dy, ch);
      }
    });
    return this;
  }

  /** 左半分を右へ鏡写し（対称キャラ用） */
  mirror(): this {
    const half = this.size / 2;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < half; x++) this.set(this.size - 1 - x, y, this.get(x, y));
    }
    return this;
  }

  /** 塗られたピクセルに 4 近傍で接する透明ピクセルを ch にする（縁取り） */
  outline(ch = '#'): this {
    const add: Array<[number, number]> = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.get(x, y) !== '.') continue;
        const near =
          this.isInk(x - 1, y) || this.isInk(x + 1, y) || this.isInk(x, y - 1) || this.isInk(x, y + 1);
        if (near) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.set(x, y, ch);
    return this;
  }

  /** 塗られている領域の下側 rows 行を影色に置き換える（簡易シェーディング） */
  shadeBottom(from: string, to: string, fraction = 0.3): this {
    let minY = this.size;
    let maxY = -1;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.get(x, y) === from) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxY < 0) return this;
    const startY = Math.round(maxY - (maxY - minY) * fraction);
    for (let y = startY; y <= maxY; y++) {
      for (let x = 0; x < this.size; x++) if (this.get(x, y) === from) this.set(x, y, to);
    }
    return this;
  }

  private isInk(x: number, y: number): boolean {
    const c = this.get(x, y);
    return c !== '.' && c !== '#';
  }

  toSprite(palette: Readonly<Record<string, string>>): PixelSprite {
    return { rows: this.grid.map((r) => r.join('')), palette };
  }
}

/** 目の共通スタンプ（白目 W・黒目 B） */
export const EYE_L: readonly string[] = ['WWW', 'WBB', 'WBB'];
export const EYE_R: readonly string[] = ['WWW', 'BBW', 'BBW'];
export const EYES = { W: '#ffffff', B: '#111111' } as const;
