import { describe, expect, it } from 'vitest';
import { ALL_MONSTER_DEFS } from '../src/domain/data/monsters';
import { ITEM_DEFS } from '../src/domain/data/items';
import { MONSTER_SPRITES } from '../src/app/render/sprites/monsterSprites';
import { MONSTER_GIRL_SPRITES } from '../src/app/render/sprites/monsterGirlSprites';
import { HERO_SPRITE } from '../src/app/render/sprites/heroSprite';
import { TILE_SPRITES } from '../src/app/render/sprites/tileSprites';
import { itemSprite } from '../src/app/render/sprites/itemSprites';
import { SPRITE_SIZE, spriteHeight, spriteWidth, type PixelSprite } from '../src/app/render/sprites/PixelSprite';
import { PixelCanvas } from '../src/app/render/sprites/PixelCanvas';

function check(name: string, s: PixelSprite): void {
  expect(spriteWidth(s), name).toBe(SPRITE_SIZE);
  expect(spriteHeight(s), name).toBe(SPRITE_SIZE);
  let ink = 0;
  for (const row of s.rows) {
    expect(row.length, `${name}: ${row}`).toBe(SPRITE_SIZE);
    for (const ch of row) {
      if (ch === '.') continue;
      ink++;
      expect(s.palette[ch], `${name}: 未定義の色 '${ch}'`).toBeDefined();
    }
  }
  expect(ink, `${name}: 何も描かれていない`).toBeGreaterThan(40);
}

describe('ピクセルスプライト（32×32）', () => {
  it('クラシック／モンスター娘の両スキンに全種族のスプライトがある', () => {
    for (const def of ALL_MONSTER_DEFS) {
      expect(MONSTER_SPRITES[def.id], `classic:${def.id}`).toBeDefined();
      expect(MONSTER_GIRL_SPRITES[def.id], `girl:${def.id}`).toBeDefined();
      check(`classic:${def.id}`, MONSTER_SPRITES[def.id]!);
      check(`girl:${def.id}`, MONSTER_GIRL_SPRITES[def.id]!);
    }
  });

  it('主人公・地形・全アイテムのスプライトが揃っている', () => {
    check('hero', HERO_SPRITE);
    for (const [k, s] of Object.entries(TILE_SPRITES)) check(`tile:${k}`, s);
    for (const def of ITEM_DEFS) check(`item:${def.id}`, itemSprite(def));
  });

  it('PixelCanvas: 左右対称・縁取り・スタンプが期待どおり', () => {
    const c = new PixelCanvas(8).rect(1, 1, 2, 2, 'a').mirror();
    expect(c.get(5, 1)).toBe('a');
    expect(c.get(6, 1)).toBe('a');
    c.outline('#');
    expect(c.get(0, 1)).toBe('#');
    expect(c.get(3, 1)).toBe('#');
    expect(c.get(4, 1)).toBe('#');
    c.stamp(0, 6, ['xy', '.z']);
    expect(c.get(0, 6)).toBe('x');
    expect(c.get(0, 7)).toBe('.');
    expect(c.get(1, 7)).toBe('z');
    const s = c.toSprite({ a: '#000', '#': '#111', x: '#222', y: '#333', z: '#444' });
    expect(s.rows.length).toBe(8);
  });
});
