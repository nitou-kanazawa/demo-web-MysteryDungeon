import { describe, expect, it } from 'vitest';
import { ALL_MONSTER_DEFS } from '../src/domain/data/monsters';
import { MONSTER_SPRITES } from '../src/app/render/sprites/monsterSprites';
import { HERO_SPRITE } from '../src/app/render/sprites/heroSprite';
import { spriteHeight, spriteWidth, type PixelSprite } from '../src/app/render/sprites/PixelSprite';

function check(name: string, s: PixelSprite): void {
  expect(spriteWidth(s), name).toBe(16);
  expect(spriteHeight(s), name).toBe(16);
  for (const row of s.rows) {
    expect(row.length, `${name}: ${row}`).toBe(16);
    for (const ch of row) {
      if (ch === '.') continue;
      expect(s.palette[ch], `${name}: 未定義の色 '${ch}'`).toBeDefined();
    }
  }
}

describe('ピクセルスプライト', () => {
  it('全種族にスプライトがあり、16×16 でパレットが揃っている', () => {
    for (const def of ALL_MONSTER_DEFS) {
      const s = MONSTER_SPRITES[def.id];
      expect(s, def.id).toBeDefined();
      check(def.id, s!);
    }
    check('hero', HERO_SPRITE);
  });
});
