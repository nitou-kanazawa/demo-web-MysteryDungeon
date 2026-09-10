import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { SeededRng } from '../src/domain/core/Rng';
import { DEFAULT_FLOOR_CONFIG, ITEM_SPAWN_TABLE } from '../src/domain/data/spawnTables';
import { DIRECTIONS, DIR_VEC, addVec } from '../src/domain/core/Vec2';
import { findFreeTileNear } from '../src/domain/game/Placement';
import { ShopService } from '../src/domain/game/ShopService';

/** プレイヤーのいる部屋を店にし、店主を隣に立たせる */
function makeShopAroundPlayer(s: GameSession) {
  const st = s.state;
  st.monsters = [];
  const room = st.map.roomAt(st.player.pos)!;
  s.shops.setup(st, room, ITEM_SPAWN_TABLE, 3, new SeededRng(1));
  const keeper = st.shop!.keeper!;
  const adj = findFreeTileNear(st, addVec(st.player.pos, DIR_VEC.E))!;
  keeper.pos = adj;
  const dir = DIRECTIONS.find((d) => {
    const p = addVec(st.player.pos, DIR_VEC[d]);
    return p.x === adj.x && p.y === adj.y && st.map.canStep(st.player.pos, d);
  })!;
  return { st, room, keeper, dir };
}

describe('ガーゴイルの店', () => {
  it('店の商品には値札が付き、拾うと未払いになる。店主にぶつかると支払う', () => {
    const s = new GameSession(21);
    const { st, room, dir } = makeShopAroundPlayer(s);
    const goods = [...st.groundItems].filter(([, it]) => it.price !== undefined);
    expect(goods.length).toBe(3);
    for (const [key] of goods) {
      const [x, y] = key.split(',').map(Number);
      expect(room.contains({ x: x!, y: y! })).toBe(true);
    }

    const [, item] = goods[0]!;
    st.player.inventory.add(item);
    expect(s.shops.debtOf(st.player)).toBe(item.price);

    st.player.gold = 0;
    let r = s.execute({ type: 'move', dir });
    expect(r.consumedTurn).toBe(true);
    expect(s.log.all.at(-1)).toContain('足りない');
    expect(s.shops.debtOf(st.player)).toBe(item.price);

    st.player.gold = item.price! + 10;
    r = s.execute({ type: 'move', dir });
    expect(st.player.gold).toBe(10);
    expect(s.shops.debtOf(st.player)).toBe(0);
    expect(item.price).toBeUndefined();
  });

  it('未払いのまま店を出るとどろぼう: 店主がガーゴイル（敵）になる', () => {
    const s = new GameSession(22, { startingItems: ['herb'] });
    const { st, room, keeper } = makeShopAroundPlayer(s);
    const herb = st.player.inventory.at(0)!;
    herb.price = 50;
    const inside = st.player.pos;
    const outside = [...st.map.walkableTiles()].find((t) => !room.contains(t))!;
    st.player.pos = outside;
    s.shops.onPlayerMoved(st, inside);
    expect(st.shop!.keeper).toBeUndefined();
    expect(st.monsters.some((m) => m.definition.id === 'gargoyle')).toBe(true);
    expect(herb.price).toBeUndefined();
    expect(st.actorAt(keeper.pos)?.faction).toBe('enemy');
    expect(s.log.all.some((m) => m.includes('どろぼう'))).toBe(true);
  });

  it('店内では売れる: 売値は買値の半分、売った品は値札付きで店に並ぶ', () => {
    const s = new GameSession(23, { startingItems: ['iron_sword'] });
    const { st } = makeShopAroundPlayer(s);
    const sword = st.player.inventory.at(0)!;
    sword.plus = 2;
    const expectedGain = ShopService.sellPrice(sword);
    const r = s.execute({ type: 'sell', index: 0 });
    expect(r.consumedTurn).toBe(true);
    expect(st.player.gold).toBe(expectedGain);
    expect(st.player.inventory.count).toBe(0);
    const placed = [...st.groundItems].find(([, it]) => it === sword);
    expect(placed).toBeDefined();
    expect(sword.price).toBe(ShopService.buyPrice(sword));
  });

  it('店の外では売れない', () => {
    const s = new GameSession(24, { startingItems: ['herb'] });
    const r = s.execute({ type: 'sell', index: 0 });
    expect(r.consumedTurn).toBe(false);
    expect(s.state.player.inventory.count).toBe(1);
  });

  it('店主を攻撃すると敵化する', () => {
    const s = new GameSession(25, { startingItems: ['staff_thunder'] });
    const { st, dir } = makeShopAroundPlayer(s);
    st.player.facing = dir;
    s.execute({ type: 'use', index: 0 });
    expect(st.shop!.keeper).toBeUndefined();
    expect(st.monsters.some((m) => m.definition.id === 'gargoyle')).toBe(true);
  });

  it('店には敵が湧かず、階段の部屋は店にならない（100 シード）', () => {
    for (let seed = 0; seed < 100; seed++) {
      const s = new GameSession(seed, { floorConfig: { ...DEFAULT_FLOOR_CONFIG, shopChance: 1 } });
      s.state.player.pos = s.state.map.stairs;
      s.execute({ type: 'descend' });
      const shop = s.state.shop;
      expect(shop).toBeDefined();
      expect(shop!.room.contains(s.state.map.stairs)).toBe(false);
      for (const m of s.state.monsters) expect(shop!.room.contains(m.pos)).toBe(false);
      expect(shop!.room.contains(s.state.player.pos)).toBe(false);
    }
  });
});

describe('リレミトの巻物', () => {
  it('読むと脱出状態になり、以後コマンドを受け付けない', () => {
    const s = new GameSession(26, { startingItems: ['scroll_escape'] });
    s.execute({ type: 'use', index: 0 });
    expect(s.state.status).toBe('escaped');
    expect(s.execute({ type: 'wait' }).consumedTurn).toBe(false);
  });
});

describe('図鑑', () => {
  it('初期所持品・拾った物・見た敵・発見レシピが登録される', () => {
    const s = new GameSession(27, { startingItems: ['pot_alchemy', 'herb', 'herb'] });
    expect(s.codex.items.has('herb')).toBe(true);
    expect(s.codex.items.has('pot_alchemy')).toBe(true);
    s.execute({ type: 'potInsert', potIndex: 0, itemIndex: 1 });
    s.execute({ type: 'potInsert', potIndex: 0, itemIndex: 1 });
    expect(s.codex.recipes.has('good_herb')).toBe(true);
    // 視界内の敵
    const st = s.state;
    const m = st.monsters[0]!;
    const near = findFreeTileNear(st, addVec(st.player.pos, DIR_VEC.W))!;
    m.pos = near;
    s.execute({ type: 'wait' });
    expect(s.codex.monsters.has(m.definition.id)).toBe(true);
  });
});
