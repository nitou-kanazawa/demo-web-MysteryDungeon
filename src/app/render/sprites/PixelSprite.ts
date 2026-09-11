/**
 * 文字で表現したピクセルアート。行ごとに 1 文字 = 1 ピクセル、'.' は透明。
 * palette で文字 → 色を決めるので、同じ形で色違いの種族を作れる。
 */
export interface PixelSprite {
  readonly rows: readonly string[];
  readonly palette: Readonly<Record<string, string>>;
}

/** 本作のスプライトはすべて 32×32 */
export const SPRITE_SIZE = 32;

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
    c.width = Math.max(1, Math.ceil(w * scale));
    c.height = Math.max(1, Math.ceil(h * scale));
    const g = c.getContext('2d');
    if (!g) throw new Error('2d context unavailable');
    paintSprite(g, sprite, 0, 0, scale);
    this.cache.set(k, c);
    return c;
  }
}

/** スプライトを直接描く（キャッシュ不要な一回限りの描画用） */
export function paintSprite(g: CanvasRenderingContext2D, sprite: PixelSprite, ox: number, oy: number, scale: number): void {
  sprite.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] ?? '.';
      if (ch === '.') continue;
      const color = sprite.palette[ch];
      if (!color) continue;
      g.fillStyle = color;
      const x0 = Math.floor(ox + x * scale);
      const y0 = Math.floor(oy + y * scale);
      const x1 = Math.floor(ox + (x + 1) * scale);
      const y1 = Math.floor(oy + (y + 1) * scale);
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  });
}
