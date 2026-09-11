/**
 * 文字で表現したピクセルアート。行ごとに 1 文字 = 1 ピクセル、'.' は透明。
 * palette で文字 → 色を決めるので、同じ形で色違いの種族を作れる。
 */
export interface PixelSprite {
  readonly rows: readonly string[];
  readonly palette: Readonly<Record<string, string>>;
}

export const spriteWidth = (s: PixelSprite): number => s.rows[0]?.length ?? 0;
export const spriteHeight = (s: PixelSprite): number => s.rows.length;

/** 形（rows）を共有してパレットだけ差し替える */
export function recolor(base: PixelSprite, palette: Readonly<Record<string, string>>): PixelSprite {
  return { rows: base.rows, palette: { ...base.palette, ...palette } };
}

/** スプライトをオフスクリーンに焼いてキャッシュする（拡大は最近傍） */
export class SpriteCache {
  private readonly cache = new Map<string, HTMLCanvasElement>();

  get(key: string, sprite: PixelSprite, scale: number): HTMLCanvasElement {
    const k = `${key}@${scale}`;
    const hit = this.cache.get(k);
    if (hit) return hit;
    const w = spriteWidth(sprite);
    const h = spriteHeight(sprite);
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * scale);
    c.height = Math.ceil(h * scale);
    const g = c.getContext('2d');
    if (!g) throw new Error('2d context unavailable');
    sprite.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x] ?? '.';
        if (ch === '.') continue;
        const color = sprite.palette[ch];
        if (!color) continue;
        g.fillStyle = color;
        // 端の隙間を防ぐため床関数で境界を揃える
        const x0 = Math.floor(x * scale);
        const y0 = Math.floor(y * scale);
        const x1 = Math.floor((x + 1) * scale);
        const y1 = Math.floor((y + 1) * scale);
        g.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    });
    this.cache.set(k, c);
    return c;
  }
}
