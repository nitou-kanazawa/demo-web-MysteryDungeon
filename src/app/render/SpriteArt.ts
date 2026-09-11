import type { Actor } from '../../domain/entity/Actor';
import type { ItemInstance } from '../../domain/item/ItemInstance';
import { FONT, TILE } from './RenderConfig';
import { HERO_SPRITE } from './sprites/heroSprite';
import { MONSTER_SPRITES } from './sprites/monsterSprites';
import { SpriteCache, spriteHeight, spriteWidth, type PixelSprite } from './sprites/PixelSprite';

/** 種族の見た目を引くための最小情報（Actor でも MonsterDef でもよい） */
export interface CreatureLook {
  readonly id: string;
  readonly glyph: string;
  readonly color: string;
}

/** アクター・アイテムをプリミティブで描く（アセット不要の簡易スプライト） */
export class SpriteArt {
  private readonly cache = new SpriteCache();

  /** 種族IDに対応するスプライト（無ければ undefined → 旧来の丸い図案にフォールバック） */
  spriteFor(defId: string): PixelSprite | undefined {
    return MONSTER_SPRITES[defId];
  }

  /**
   * ピクセルスプライトを中心 (cx, cy) に描く。scale はピクセル倍率。
   * bob: 上下の揺れ、squash: 縦のつぶれ（呼吸アニメ）
   */
  drawSprite(
    g: CanvasRenderingContext2D,
    key: string,
    sprite: PixelSprite,
    cx: number,
    cy: number,
    scale: number,
    squash = 1,
  ): void {
    const img = this.cache.get(key, sprite, scale);
    const w = spriteWidth(sprite) * scale;
    const h = spriteHeight(sprite) * scale;
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(cx, cy + h / 2);
    g.scale(1 / squash, squash);
    g.drawImage(img, -w / 2, -h, w, h);
    g.restore();
  }

  /** 拠点・図鑑などで種族の見た目だけを描く。(cx, cy) は絵の中心、scale はタイル倍率（1 = 24px） */
  drawCreature(g: CanvasRenderingContext2D, look: CreatureLook, cx: number, cy: number, t: number, scale: number): void {
    const sprite = this.spriteFor(look.id);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.ellipse(cx, cy + TILE * 0.46 * scale, TILE * 0.36 * scale, TILE * 0.12 * scale, 0, 0, Math.PI * 2);
    g.fill();
    if (sprite) {
      const squash = 1 + Math.sin(t / 320) * 0.03;
      this.drawSprite(g, look.id, sprite, cx, cy, (TILE / 16) * scale, squash);
      return;
    }
    g.save();
    g.translate(cx, cy);
    g.scale(scale, scale);
    this.drawMonster(g, { id: 0, glyph: look.glyph, color: look.color } as Actor, 0, 0, t);
    g.restore();
  }

  drawActor(g: CanvasRenderingContext2D, a: Actor, px: number, py: number, t: number, highlight = false): void {
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;
    // 足元の影
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    g.ellipse(cx, py + TILE - 3, TILE * 0.36, TILE * 0.14, 0, 0, Math.PI * 2);
    g.fill();

    if (a.faction === 'player') {
      this.drawHero(g, px, py, t);
    } else {
      const defId = (a as { definition?: { id: string } }).definition?.id;
      const sprite = defId ? this.spriteFor(defId) : undefined;
      if (sprite && defId) {
        const squash = 1 + Math.sin(t / 280 + a.id) * 0.04;
        this.drawSprite(g, defId, sprite, cx, py + TILE / 2 - 1, TILE / 16, squash);
      } else {
        if (a.faction === 'neutral' || a.name === 'ガーゴイル') this.drawWings(g, cx, cy);
        this.drawMonster(g, a, cx, cy, t);
      }
    }

    if (a.faction === 'ally') {
      g.strokeStyle = '#7CFC00';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, TILE * 0.47, 0, Math.PI * 2);
      g.stroke();
    }

    if (a.hp < a.maxHp) {
      const w = TILE - 6;
      const ratio = a.hp / a.maxHp;
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(px + 3, py + 1, w, 3);
      g.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#ef4444';
      g.fillRect(px + 3, py + 1, w * ratio, 3);
    }
    if (highlight) {
      g.fillStyle = '#fde68a';
      for (let i = 0; i < 4; i++) {
        const ang = t / 200 + (i * Math.PI) / 2;
        const r = TILE * 0.55;
        g.beginPath();
        g.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (a.hasStatus('paralysis')) this.drawStatusMark(g, px, py, '縛', '#c084fc');
    else if (a.hasStatus('confusion')) this.drawStatusMark(g, px, py, '？', '#facc15');
  }

  /** 主人公（タイル内） */
  private drawHero(g: CanvasRenderingContext2D, px: number, py: number, t: number): void {
    const bob = Math.sin(t / 260) > 0 ? 1 : 0;
    this.drawSprite(g, 'hero', HERO_SPRITE, px + TILE / 2, py + TILE / 2 - 1 + bob, TILE / 16);
  }

  /** 拠点画面などで任意の位置・倍率で主人公を描く（x0, y0 は左上、scale はピクセル倍率） */
  drawHeroAt(g: CanvasRenderingContext2D, x0: number, y0: number, t: number, scale: number): void {
    const bob = Math.sin(t / 260) > 0 ? scale : 0;
    this.drawSprite(g, 'hero', HERO_SPRITE, x0 + 8 * scale, y0 + 8 * scale + bob, scale);
  }

  /** 図鑑などでアイテムのアイコンを拡大して描く（中心指定） */
  drawItemIcon(g: CanvasRenderingContext2D, item: ItemInstance, cx: number, cy: number, scale: number): void {
    g.save();
    g.translate(cx, cy);
    g.scale(scale, scale);
    this.drawItem(g, item, -TILE / 2, -TILE / 2);
    g.restore();
  }

  private drawMonster(g: CanvasRenderingContext2D, a: Actor, cx: number, cy: number, t: number): void {
    const r = TILE * 0.38;
    const pulse = 1 + Math.sin(t / 300 + a.id) * 0.04;
    const grad = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
    grad.addColorStop(0, lighten(a.color, 0.35));
    grad.addColorStop(1, darken(a.color, 0.35));
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, cy + 1, r * pulse, r * 0.92 * pulse, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = 1.5;
    g.stroke();
    // 目
    g.fillStyle = '#fff';
    g.fillRect(cx - 5, cy - 2, 3, 3);
    g.fillRect(cx + 2, cy - 2, 3, 3);
    g.fillStyle = '#111';
    g.fillRect(cx - 4, cy - 1, 2, 2);
    g.fillRect(cx + 3, cy - 1, 2, 2);
    // 種別の文字
    g.font = `bold 9px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText(a.glyph, cx, cy + 6);
  }

  /** ガーゴイルの石の翼 */
  private drawWings(g: CanvasRenderingContext2D, cx: number, cy: number): void {
    g.fillStyle = '#5b6478';
    g.beginPath();
    g.moveTo(cx - 6, cy);
    g.lineTo(cx - 14, cy - 10);
    g.lineTo(cx - 12, cy + 4);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(cx + 6, cy);
    g.lineTo(cx + 14, cy - 10);
    g.lineTo(cx + 12, cy + 4);
    g.closePath();
    g.fill();
  }

  private drawStatusMark(g: CanvasRenderingContext2D, px: number, py: number, mark: string, color: string): void {
    g.font = `bold 10px ${FONT}`;
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillStyle = color;
    g.fillText(mark, px + TILE - 1, py + 1);
  }

  drawItem(g: CanvasRenderingContext2D, item: ItemInstance, px: number, py: number): void {
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;
    g.lineWidth = 1.5;
    switch (item.def.category) {
      case 'weapon':
        g.strokeStyle = '#e5e7eb';
        g.beginPath();
        g.moveTo(cx - 6, cy + 6);
        g.lineTo(cx + 5, cy - 5);
        g.stroke();
        g.strokeStyle = '#b8860b';
        g.beginPath();
        g.moveTo(cx - 7, cy + 2);
        g.lineTo(cx - 2, cy + 7);
        g.stroke();
        break;
      case 'shield':
        g.fillStyle = '#9ca3af';
        g.beginPath();
        g.moveTo(cx - 6, cy - 6);
        g.lineTo(cx + 6, cy - 6);
        g.lineTo(cx + 6, cy + 1);
        g.quadraticCurveTo(cx + 6, cy + 6, cx, cy + 8);
        g.quadraticCurveTo(cx - 6, cy + 6, cx - 6, cy + 1);
        g.closePath();
        g.fill();
        g.strokeStyle = '#374151';
        g.stroke();
        g.fillStyle = '#b91c1c';
        g.fillRect(cx - 1, cy - 4, 2, 8);
        break;
      case 'food':
        g.fillStyle = '#d4a056';
        g.beginPath();
        g.ellipse(cx, cy, 8, 5.5, -0.3, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#8b5a2b';
        g.stroke();
        break;
      case 'herb':
        g.fillStyle = '#22c55e';
        g.beginPath();
        g.moveTo(cx, cy + 7);
        g.quadraticCurveTo(cx - 9, cy, cx - 2, cy - 7);
        g.quadraticCurveTo(cx + 8, cy - 2, cx, cy + 7);
        g.fill();
        g.strokeStyle = '#14532d';
        g.beginPath();
        g.moveTo(cx, cy + 7);
        g.lineTo(cx - 1, cy - 4);
        g.stroke();
        break;
      case 'seed':
        g.fillStyle = '#f97316';
        for (const [dx, dy] of [[-4, 2], [3, 3], [0, -4]] as const) {
          g.beginPath();
          g.ellipse(cx + dx, cy + dy, 3, 2.2, 0.5, 0, Math.PI * 2);
          g.fill();
        }
        break;
      case 'scroll':
        g.fillStyle = '#f5e6c8';
        g.fillRect(cx - 6, cy - 7, 12, 14);
        g.strokeStyle = '#8b6b3b';
        g.strokeRect(cx - 6, cy - 7, 12, 14);
        g.fillStyle = '#8b6b3b';
        g.fillRect(cx - 4, cy - 4, 8, 1);
        g.fillRect(cx - 4, cy - 1, 8, 1);
        g.fillRect(cx - 4, cy + 2, 6, 1);
        break;
      case 'staff':
        g.strokeStyle = '#a16207';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(cx - 5, cy + 8);
        g.lineTo(cx + 3, cy - 4);
        g.stroke();
        g.fillStyle = '#60a5fa';
        g.beginPath();
        g.arc(cx + 4, cy - 6, 3.5, 0, Math.PI * 2);
        g.fill();
        break;
      case 'pot': {
        g.fillStyle = '#b45309';
        g.beginPath();
        g.moveTo(cx - 4, cy - 8);
        g.lineTo(cx + 4, cy - 8);
        g.lineTo(cx + 3, cy - 5);
        g.quadraticCurveTo(cx + 9, cy, cx + 5, cy + 8);
        g.lineTo(cx - 5, cy + 8);
        g.quadraticCurveTo(cx - 9, cy, cx - 3, cy - 5);
        g.closePath();
        g.fill();
        g.strokeStyle = '#451a03';
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(cx - 4, cy - 2, 2, 6);
        break;
      }
      case 'material':
        g.fillStyle = '#94a3b8';
        g.beginPath();
        g.moveTo(cx, cy - 8);
        g.lineTo(cx + 7, cy);
        g.lineTo(cx, cy + 8);
        g.lineTo(cx - 7, cy);
        g.closePath();
        g.fill();
        g.strokeStyle = '#334155';
        g.stroke();
        break;
      case 'gold':
        g.fillStyle = '#fbbf24';
        g.beginPath();
        g.arc(cx, cy, 6.5, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#92400e';
        g.stroke();
        g.fillStyle = '#92400e';
        g.font = `bold 9px ${FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('G', cx, cy + 0.5);
        break;
    }
  }
}

function parseHex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten(c: string, k: number): string {
  const [r, g, b] = parseHex(c);
  return `rgb(${r + (255 - r) * k},${g + (255 - g) * k},${b + (255 - b) * k})`;
}
function darken(c: string, k: number): string {
  const [r, g, b] = parseHex(c);
  return `rgb(${r * (1 - k)},${g * (1 - k)},${b * (1 - k)})`;
}
