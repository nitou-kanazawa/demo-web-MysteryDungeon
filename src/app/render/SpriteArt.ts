import type { Actor } from '../../domain/entity/Actor';
import type { ItemDef } from '../../domain/item/ItemDef';
import type { ItemInstance } from '../../domain/item/ItemInstance';
import { FONT, TILE } from './RenderConfig';
import { renderSettings } from './RenderSettings';
import { HERO_SPRITE } from './sprites/heroSprite';
import { itemSprite } from './sprites/itemSprites';
import { MONSTER_GIRL_SPRITES } from './sprites/monsterGirlSprites';
import { MONSTER_SPRITES } from './sprites/monsterSprites';
import { SpriteCache, spriteHeight, spriteWidth, type PixelSprite } from './sprites/PixelSprite';

/** 種族の見た目を引くための最小情報（Actor でも MonsterDef でもよい） */
export interface CreatureLook {
  readonly id: string;
  readonly glyph: string;
  readonly color: string;
}

/** アクター・アイテムをピクセルスプライトで描く */
export class SpriteArt {
  private readonly cache = new SpriteCache();

  /** 種族IDに対応するスプライト（現在のスキン）。無ければ undefined */
  spriteFor(defId: string): PixelSprite | undefined {
    const table = renderSettings.skin === 'girl' ? MONSTER_GIRL_SPRITES : MONSTER_SPRITES;
    return table[defId] ?? MONSTER_SPRITES[defId];
  }

  private spriteKey(defId: string): string {
    return `${renderSettings.skin}:${defId}`;
  }

  /**
   * ピクセルスプライトを中心 (cx, cy) に描く。scale はピクセル倍率。
   * squash: 縦のつぶれ（呼吸アニメ）
   */
  drawSprite(g: CanvasRenderingContext2D, key: string, sprite: PixelSprite, cx: number, cy: number, scale: number, squash = 1): void {
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

  /** 拠点・図鑑などで種族の見た目だけを描く。(cx, cy) は絵の中心、scale はタイル倍率（1 = 32px） */
  drawCreature(g: CanvasRenderingContext2D, look: CreatureLook, cx: number, cy: number, t: number, scale: number): void {
    const sprite = this.spriteFor(look.id);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.ellipse(cx, cy + TILE * 0.46 * scale, TILE * 0.36 * scale, TILE * 0.1 * scale, 0, 0, Math.PI * 2);
    g.fill();
    if (sprite) {
      const squash = 1 + Math.sin(t / 320) * 0.03;
      this.drawSprite(g, this.spriteKey(look.id), sprite, cx, cy, (TILE / 32) * scale, squash);
      return;
    }
    this.drawFallback(g, look, cx, cy, TILE * 0.4 * scale);
  }

  drawActor(g: CanvasRenderingContext2D, a: Actor, px: number, py: number, t: number, highlight = false): void {
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    g.ellipse(cx, py + TILE - 3, TILE * 0.34, TILE * 0.1, 0, 0, Math.PI * 2);
    g.fill();

    if (a.faction === 'player') {
      const bob = Math.sin(t / 260) > 0 ? 1 : 0;
      this.drawSprite(g, 'hero', HERO_SPRITE, cx, cy - 1 + bob, TILE / 32);
    } else {
      const defId = (a as { definition?: { id: string } }).definition?.id;
      const sprite = defId ? this.spriteFor(defId) : undefined;
      if (sprite && defId) {
        const squash = 1 + Math.sin(t / 280 + a.id) * 0.04;
        this.drawSprite(g, this.spriteKey(defId), sprite, cx, cy - 1, TILE / 32, squash);
      } else {
        this.drawFallback(g, { id: String(a.id), glyph: a.glyph, color: a.color }, cx, cy, TILE * 0.38);
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
      const w = TILE - 8;
      const ratio = a.hp / a.maxHp;
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(px + 4, py + 1, w, 3);
      g.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#ef4444';
      g.fillRect(px + 4, py + 1, w * ratio, 3);
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
    else if ((a as { asleep?: boolean }).asleep) this.drawStatusMark(g, px, py, Math.floor(t / 500) % 2 === 0 ? 'z' : 'Z', '#93c5fd');
  }

  /** 拠点画面などで任意の位置・倍率で主人公を描く（x0, y0 は左上、scale はピクセル倍率） */
  drawHeroAt(g: CanvasRenderingContext2D, x0: number, y0: number, t: number, scale: number): void {
    const bob = Math.sin(t / 260) > 0 ? scale : 0;
    this.drawSprite(g, 'hero', HERO_SPRITE, x0 + 16 * scale, y0 + 16 * scale + bob, scale);
  }

  /** 床上のアイテム（タイル左上指定） */
  drawItem(g: CanvasRenderingContext2D, item: ItemInstance, px: number, py: number): void {
    this.drawItemDef(g, item.def, px + TILE / 2, py + TILE / 2, TILE / 32);
  }

  /** アイテム定義のアイコンを中心指定・ピクセル倍率で描く（図鑑・メニュー用） */
  drawItemDef(g: CanvasRenderingContext2D, def: ItemDef, cx: number, cy: number, scale: number): void {
    this.drawSprite(g, `item:${def.id}`, itemSprite(def), cx, cy, scale);
  }

  /** スプライトが無い種族のための簡易表示（丸に文字） */
  private drawFallback(g: CanvasRenderingContext2D, look: CreatureLook, cx: number, cy: number, r: number): void {
    g.fillStyle = look.color;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = 1.5;
    g.stroke();
    g.font = `bold ${Math.round(r)}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(look.glyph, cx, cy + 1);
  }

  private drawStatusMark(g: CanvasRenderingContext2D, px: number, py: number, mark: string, color: string): void {
    g.font = `bold 11px ${FONT}`;
    g.textAlign = 'right';
    g.textBaseline = 'top';
    g.fillStyle = color;
    g.fillText(mark, px + TILE - 1, py + 1);
  }
}
