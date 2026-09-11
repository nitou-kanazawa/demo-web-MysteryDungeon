import { describe, expect, it } from 'vitest';
import { RecipeBook } from '../src/domain/alchemy/RecipeBook';
import { IdGenerator } from '../src/domain/core/Id';
import { SeededRng } from '../src/domain/core/Rng';
import { ITEM_DEFS, ITEM_MAP } from '../src/domain/data/items';
import { RECIPES } from '../src/domain/data/recipes';
import { ItemFactory } from '../src/domain/item/ItemFactory';
import { PotService } from '../src/domain/item/PotService';

function setup() {
  const factory = new ItemFactory(new IdGenerator(), ITEM_MAP);
  const recipes = new RecipeBook(RECIPES);
  const pool = ITEM_DEFS.filter((d) => d.category !== 'pot' && d.category !== 'gold');
  return { factory, recipes, pots: new PotService(factory, recipes, pool), rng: new SeededRng(1) };
}

describe('PotService', () => {
  it('保存の壺: 入れて取り出せる。容量を超えると入らない', () => {
    const { factory, pots, rng } = setup();
    const pot = factory.create('pot_storage');
    for (let i = 0; i < pot.capacity; i++) expect(pots.insert(pot, factory.create('herb'), rng).ok).toBe(true);
    expect(pots.insert(pot, factory.create('herb'), rng).ok).toBe(false);
    const out = pots.takeOut(pot, 0);
    expect(out?.def.id).toBe('herb');
    expect(pot.contents.length).toBe(pot.capacity - 1);
  });

  it('壺を壺に入れることはできない', () => {
    const { factory, pots, rng } = setup();
    const pot = factory.create('pot_storage');
    expect(pots.insert(pot, factory.create('pot_storage'), rng).ok).toBe(false);
  });

  it('錬金の壺: レシピが揃うと調合が始まり、ターン経過で完成品ができる', () => {
    const { factory, pots, rng, recipes } = setup();
    const pot = factory.create('pot_alchemy');
    expect(pots.insert(pot, factory.create('herb'), rng).ok).toBe(true);
    expect(pot.brewing).toBeUndefined();
    const r = pots.insert(pot, factory.create('herb'), rng);
    expect(r.ok).toBe(true);
    expect(r.message).toContain('新しいレシピを発見');
    expect(pot.brewing?.result.id).toBe('good_herb');
    expect(pot.contents.length).toBe(0);
    expect(pots.takeOut(pot, 0)).toBeUndefined();

    let done;
    for (let t = 0; t < 20; t++) done = pots.tick(pot) ?? done;
    expect(done?.def.id).toBe('good_herb');
    expect(pot.brewing).toBeUndefined();
    expect(pot.contents[0]?.def.id).toBe('good_herb');
    expect(recipes.isDiscovered(RECIPES[0]!)).toBe(true);
  });

  it('錬金の壺: どのレシピにも繋がらない組み合わせは拒否される', () => {
    const { factory, pots, rng } = setup();
    const pot = factory.create('pot_alchemy');
    expect(pots.insert(pot, factory.create('bread'), rng).ok).toBe(true);
    expect(pots.insert(pot, factory.create('iron_lump'), rng).ok).toBe(false);
    expect(pot.contents.length).toBe(1);
  });

  it('合成の壺: 同種の装備の修正値を吸収する（+1ボーナス）', () => {
    const { factory, pots, rng } = setup();
    const pot = factory.create('pot_merge');
    const base = factory.create('copper_sword');
    base.plus = 2;
    const other = factory.create('iron_sword');
    other.plus = 3;
    expect(pots.insert(pot, base, rng).ok).toBe(true);
    expect(pots.insert(pot, other, rng).ok).toBe(true);
    expect(pot.contents.length).toBe(1);
    expect(base.plus).toBe(6);
    expect(pots.insert(pot, factory.create('scale_shield'), rng).ok).toBe(false);
    expect(pots.insert(pot, factory.create('herb'), rng).ok).toBe(false);
  });

  it('変化の壺: 入れたアイテムが別の物に変わる', () => {
    const { factory, pots, rng } = setup();
    const pot = factory.create('pot_change');
    const herb = factory.create('herb');
    expect(pots.insert(pot, herb, rng).ok).toBe(true);
    expect(pot.contents[0]).not.toBe(herb);
    expect(pot.contents[0]?.isPot).toBe(false);
  });
});

describe('RecipeBook', () => {
  it('順不同で一致する', () => {
    const book = new RecipeBook(RECIPES);
    expect(book.find(['holy_water', 'monster_fang', 'iron_sword'])?.output).toBe('dragon_killer');
    expect(book.find(['herb'])).toBeUndefined();
    expect(book.isPartialMatch(['iron_sword'])).toBe(true);
    expect(book.isPartialMatch(['iron_sword', 'iron_sword'])).toBe(false);
  });
});
