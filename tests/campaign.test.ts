import { describe, expect, it } from 'vitest';
import { Campaign } from '../src/domain/base/Campaign';
import { HomeBase } from '../src/domain/base/HomeBase';
import { IdGenerator } from '../src/domain/core/Id';
import { ITEM_MAP } from '../src/domain/data/items';
import { ItemFactory } from '../src/domain/item/ItemFactory';
import { GameSession } from '../src/domain/game/GameSession';

describe('ItemSnapshot', () => {
  it('修正値・杖の回数・壺の中身・調合状態が往復する', () => {
    const f = new ItemFactory(new IdGenerator(), ITEM_MAP);
    const pot = f.create('pot_storage');
    const sword = f.create('iron_sword');
    sword.plus = 3;
    const staff = f.create('staff_blow');
    staff.charges = 2;
    pot.contents.push(sword, staff);
    const alchemy = f.create('pot_alchemy');
    alchemy.brewing = { result: f.get('good_herb'), remaining: 7 };

    const r1 = f.restore(ItemFactory.snapshot(pot));
    expect(r1.def.id).toBe('pot_storage');
    expect(r1.contents.map((c) => [c.def.id, c.plus, c.charges])).toEqual([['iron_sword', 3, 0], ['staff_blow', 0, 2]]);
    const r2 = f.restore(ItemFactory.snapshot(alchemy));
    expect(r2.brewing?.result.id).toBe('good_herb');
    expect(r2.brewing?.remaining).toBe(7);
  });
});

describe('HomeBase', () => {
  it('新規作成時は初期装備を持ち、図鑑にも登録される', () => {
    const b = HomeBase.createNew();
    expect(b.inventory.map((i) => i.def.id)).toEqual(['copper_sword', 'bread', 'herb']);
    expect(b.codex.items.has('bread')).toBe(true);
  });

  it('倉庫との出し入れと容量制限', () => {
    const b = HomeBase.createNew({ inventoryCapacity: 3, storageCapacity: 1, initialItems: ['herb', 'bread', 'herb'] });
    expect(b.deposit(0)).toBe(true);
    expect(b.deposit(0)).toBe(false); // 倉庫満杯
    expect(b.storage.length).toBe(1);
    expect(b.inventory.length).toBe(2);
    expect(b.withdraw(0)).toBe(true);
    expect(b.inventory.length).toBe(3);
    expect(b.withdraw(0)).toBe(false);
  });

  it('JSON に保存して復元できる', () => {
    const b = HomeBase.createNew();
    b.inventory[0]!.plus = 2;
    b.deposit(1);
    b.gold = 1234;
    b.codex.seeMonster('slime');
    b.sorties = 3;
    b.bestFloor = 5;
    const json = JSON.parse(JSON.stringify(b.toJSON()));
    const r = HomeBase.fromJSON(json);
    expect(r.inventory.map((i) => [i.def.id, i.plus])).toEqual([['copper_sword', 2], ['herb', 0]]);
    expect(r.storage.map((i) => i.def.id)).toEqual(['bread']);
    expect(r.gold).toBe(1234);
    expect(r.codex.monsters.has('slime')).toBe(true);
    expect(r.sorties).toBe(3);
    expect(r.bestFloor).toBe(5);
  });
});

describe('Campaign', () => {
  it('出撃時に持ち物とゴールドと図鑑が引き継がれ、レベルは 1', () => {
    const b = HomeBase.createNew();
    b.gold = 500;
    b.inventory[0]!.plus = 1;
    const c = new Campaign(b);
    const s = c.startSortie(1);
    expect(s.state.player.level).toBe(1);
    expect(s.state.player.gold).toBe(500);
    expect(s.state.player.inventory.items.map((i) => i.displayName)).toEqual(['どうのつるぎ+1', 'パン', 'やくそう']);
    expect(s.codex).toBe(b.codex);
    expect(b.sorties).toBe(1);
  });

  it('脱出・踏破で帰還すると持ち物とゴールドを持ち帰る', () => {
    const b = HomeBase.createNew();
    const c = new Campaign(b);
    const s = c.startSortie(2);
    s.state.player.gold = 777;
    s.execute({ type: 'use', index: 2 }); // やくそうを食べる
    s.state.status = 'escaped';
    const r = c.endSortie(s);
    expect(r.status).toBe('escaped');
    expect(b.gold).toBe(777);
    expect(b.inventory.map((i) => i.def.id)).toEqual(['copper_sword', 'bread']);
    expect(c.current).toBeUndefined();
  });

  it('死亡すると持ち物とゴールドを失うが、倉庫と図鑑は残る', () => {
    const b = HomeBase.createNew();
    b.deposit(0);
    const c = new Campaign(b);
    const s = c.startSortie(3);
    s.state.player.gold = 999;
    s.state.status = 'dead';
    const r = c.endSortie(s);
    expect(r.status).toBe('dead');
    expect(b.inventory.length).toBe(0);
    expect(b.gold).toBe(0);
    expect(b.storage.map((i) => i.def.id)).toEqual(['copper_sword']);
    expect(b.codex.items.has('copper_sword')).toBe(true);
  });

  it('持ち込み品を含むリプレイが再現できる', () => {
    const b = HomeBase.createNew();
    b.inventory[0]!.plus = 2;
    const c = new Campaign(b);
    const s = c.startSortie(4);
    s.execute({ type: 'equip', index: 0 });
    for (let i = 0; i < 30; i++) s.execute({ type: 'move', dir: 'W' });
    const r = GameSession.replay(s.toReplay());
    expect(r.state.player.atk).toBe(s.state.player.atk);
    expect(r.state.player.pos).toEqual(s.state.player.pos);
    expect(r.log.all).toEqual(s.log.all);
  });
});
