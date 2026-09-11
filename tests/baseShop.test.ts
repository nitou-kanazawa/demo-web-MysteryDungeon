import { describe, expect, it } from 'vitest';
import { BaseShop } from '../src/domain/base/BaseShop';
import { HomeBase } from '../src/domain/base/HomeBase';
import { Campaign } from '../src/domain/base/Campaign';
import { ITEM_MAP } from '../src/domain/data/items';

describe('武器屋（拠点）', () => {
  it('品揃えはシードで決まり、武器1・盾1・雑貨5の7品', () => {
    const a = BaseShop.generateStock(3);
    const b = BaseShop.generateStock(3);
    expect(a).toEqual(b);
    expect(a.length).toBe(7);
    expect(ITEM_MAP.get(a[0]!)?.category).toBe('weapon');
    expect(ITEM_MAP.get(a[1]!)?.category).toBe('shield');
    expect(BaseShop.generateStock(4)).not.toEqual(a);
  });

  it('買うとゴールドが減り、品物が持ち物に入り、棚から消える。足りなければ買えない', () => {
    const b = HomeBase.createNew();
    b.shopStock = ['herb', 'iron_sword'];
    b.gold = 60;
    const r = b.buy(0);
    expect(r.ok).toBe(true);
    expect(b.gold).toBe(10);
    expect(b.inventory.at(-1)?.def.id).toBe('herb');
    expect(b.shopStock).toEqual(['iron_sword']);
    const r2 = b.buy(0);
    expect(r2.ok).toBe(false);
    expect(r2.message).toContain('足りない');
    expect(b.shopStock).toEqual(['iron_sword']);
  });

  it('売ると半額（修正値分も加味）を受け取り、中身入りの壺は売れない', () => {
    const b = HomeBase.createNew();
    b.inventory[0]!.plus = 2; // どうのつるぎ+2 (300 + 2*60 = 420 → 210)
    const gold = b.gold;
    const r = b.sell(0);
    expect(r.ok).toBe(true);
    expect(b.gold).toBe(gold + 210);
    expect(b.inventory.some((i) => i.def.id === 'copper_sword')).toBe(false);
    b.inventory.push((b as unknown as { factory: { create: (id: string) => never } }).factory.create('pot_storage'));
    const pot = b.inventory.at(-1)! as unknown as { contents: unknown[] };
    pot.contents.push({});
    expect(b.sell(b.inventory.length - 1).ok).toBe(false);
  });

  it('出撃すると品揃えが入れ替わり、JSON に保存される', () => {
    const b = HomeBase.createNew();
    const before = [...b.shopStock];
    const c = new Campaign(b);
    c.startSortie(1);
    expect(b.shopStock).not.toEqual(before);
    const r = HomeBase.fromJSON(JSON.parse(JSON.stringify(b.toJSON())));
    expect(r.shopStock).toEqual(b.shopStock);
  });
});
