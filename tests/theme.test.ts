import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { SeededRng } from '../src/domain/core/Rng';
import { DungeonGenerator } from '../src/domain/map/DungeonGenerator';
import { reachableFrom } from '../src/domain/map/Pathfinding';
import { TileType } from '../src/domain/map/Tile';
import { keyOf, addVec, DIR_VEC } from '../src/domain/core/Vec2';
import { themeForFloor } from '../src/domain/data/themes';
import { Monster } from '../src/domain/entity/Monster';
import { MONSTER_MAP } from '../src/domain/data/monsters';
import { DEFAULT_FLOOR_CONFIG } from '../src/domain/data/spawnTables';

describe('ダンジョンテーマ', () => {
  it('フロア帯でテーマが決まる', () => {
    expect(themeForFloor(1).id).toBe('cave');
    expect(themeForFloor(2).id).toBe('cave');
    expect(themeForFloor(3).id).toBe('water');
    expect(themeForFloor(4).id).toBe('water');
    expect(themeForFloor(5).id).toBe('ice');
    expect(themeForFloor(6).id).toBe('ice');
    expect(themeForFloor(7).id).toBe('volcano');
    expect(themeForFloor(8).id).toBe('volcano');
    expect(themeForFloor(9).id).toBe('sky');
    expect(themeForFloor(10).id).toBe('sky');
  });

  it('水・空を solid にしても全床が連結し、外周は歩けない', () => {
    const gen = new DungeonGenerator();
    for (const solid of [TileType.Water, TileType.Void]) {
      for (let seed = 0; seed < 30; seed++) {
        const map = gen.generate(new SeededRng(seed), solid);
        const walkable = [...map.walkableTiles()];
        const reach = reachableFrom(map, walkable[0]!);
        for (const t of walkable) expect(reach.has(keyOf(t))).toBe(true);
        expect(map.get({ x: 0, y: 0 })).toBe(solid);
        expect(map.isWalkable({ x: 0, y: 0 })).toBe(false);
        expect(map.passesProjectile({ x: 0, y: 0 })).toBe(true);
        expect([...map.walkableTiles()].some((p) => map.get(p) === TileType.Wall)).toBe(false);
      }
    }
  });

  it('3F に降りると地底湖になり、水タイルで構成される', () => {
    const s = new GameSession(50);
    for (let i = 0; i < 2; i++) {
      s.state.player.pos = s.state.map.stairs;
      s.execute({ type: 'descend' });
    }
    expect(s.state.floor).toBe(3);
    expect(s.state.theme.id).toBe('water');
    expect(s.state.map.get({ x: 0, y: 0 })).toBe(TileType.Water);
    expect(s.log.all.some((m) => m.includes('地底湖'))).toBe(true);
  });

  /** プレイヤーの東側に「水 1 マス → 床」の並びを作る */
  function makeGap(s: GameSession) {
    const st = s.state;
    const m = st.map;
    st.monsters = [];
    const room = m.roomAt(st.player.pos)!;
    st.player.pos = { x: room.x, y: room.center.y };
    const gap = addVec(st.player.pos, DIR_VEC.E);
    const beyond = addVec(gap, DIR_VEC.E);
    if (!room.contains(beyond)) return undefined;
    m.set(gap, TileType.Water);
    st.player.facing = 'E';
    return { st, gap, beyond };
  }

  it('投げた物は水を飛び越えて向こう岸の敵に当たる', () => {
    const s = new GameSession(51, { startingItems: ['iron_lump'] });
    const r = makeGap(s);
    if (!r) return;
    const target = new Monster(777, MONSTER_MAP.get('slime')!, r.beyond);
    r.st.monsters.push(target);
    const hp = target.hp;
    s.execute({ type: 'throw', index: 0 });
    expect(target.hp).toBeLessThan(hp);
  });

  it('水の上に落ちた投げ物は失われる', () => {
    // dragon_killer は 1F に自然湧きしないので、床に落ちていれば投げた物と分かる
    const s = new GameSession(52, { startingItems: ['dragon_killer'] });
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    st.player.pos = { x: room.x, y: room.center.y };
    st.player.facing = 'W';
    // 投擲の射程 10 マスぶんを水にする（1F は壁なので、テスト用に水へ変える）
    for (let x = Math.max(0, room.x - 11); x < room.x; x++) st.map.set({ x, y: room.center.y }, TileType.Water);
    s.execute({ type: 'throw', index: 0 });
    expect(st.player.inventory.count).toBe(0);
    expect([...st.groundItems].some(([, it]) => it.def.id === 'dragon_killer')).toBe(false);
    expect(s.log.all.some((m) => m.includes('水に落ちて'))).toBe(true);
  });

  it('杖の魔法弾も水を越える', () => {
    const s = new GameSession(53, { startingItems: ['staff_paralyze'] });
    const r = makeGap(s);
    if (!r) return;
    const target = new Monster(778, MONSTER_MAP.get('slime')!, r.beyond);
    r.st.monsters.push(target);
    s.execute({ type: 'use', index: 0 });
    expect(target.hasStatus('paralysis')).toBe(true);
  });

  it('岩壁は投げ物を止める', () => {
    const s = new GameSession(54, { startingItems: ['herb'] });
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    st.player.pos = { x: room.x, y: room.center.y };
    st.player.facing = 'W';
    s.execute({ type: 'throw', index: 0 });
    expect([...st.groundItems].some(([, it]) => it.def.id === 'herb')).toBe(true);
  });
});

describe('モンスターハウス', () => {
  function withHouse(seed: number) {
    const s = new GameSession(seed, { floorConfig: { ...DEFAULT_FLOOR_CONFIG, monsterHouseChance: 1, monsterHouseMinFloor: 1 } });
    s.state.player.pos = s.state.map.stairs;
    s.execute({ type: 'descend' });
    return s;
  }

  it('眠った敵とアイテムが詰まった部屋が生成される（30 シード）', () => {
    for (let seed = 100; seed < 130; seed++) {
      const s = withHouse(seed);
      const house = s.state.monsterHouse;
      expect(house).toBeDefined();
      expect(house!.triggered).toBe(false);
      const inside = s.state.monsters.filter((m) => house!.room.contains(m.pos));
      expect(inside.length).toBeGreaterThanOrEqual(4);
      for (const m of inside) expect(m.asleep).toBe(true);
      const items = [...s.state.groundItems].filter(([k]) => {
        const [x, y] = k.split(',').map(Number);
        return house!.room.contains({ x: x!, y: y! });
      });
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(house!.room.contains(s.state.player.pos)).toBe(false);
    }
  });

  it('眠っている敵は動かず、部屋に入ると一斉に起きる', () => {
    const s = withHouse(131);
    const st = s.state;
    const house = st.monsterHouse!;
    const before = st.monsters.filter((m) => house.room.contains(m.pos)).map((m) => ({ m, pos: { ...m.pos } }));
    // 外で 5 ターン待つ → 眠った敵は動かない
    for (let i = 0; i < 5; i++) s.execute({ type: 'wait' });
    for (const { m, pos } of before) expect(m.pos).toEqual(pos);
    // 部屋の中へワープ（移動コマンドで踏み込む）
    const entry = [...house.room.tiles()].find((t) => !st.isOccupied(t))!;
    st.player.pos = entry;
    st.player.hp = 9999;
    st.player.maxHp = 9999;
    // 一歩動いて afterPlayerMoved を通す
    const dir = (['E', 'W', 'N', 'S'] as const).find((d) => st.map.canStep(st.player.pos, d) && !st.isOccupied(addVec(st.player.pos, DIR_VEC[d])) && house.room.contains(addVec(st.player.pos, DIR_VEC[d])));
    if (!dir) return;
    s.execute({ type: 'move', dir });
    expect(house.triggered).toBe(true);
    expect(s.log.all.some((m) => m.includes('モンスターハウスだ'))).toBe(true);
    for (const m of st.monsters) if (house.room.contains(m.pos)) expect(m.asleep).toBe(false);
  });

  it('攻撃されると個別に起きる', () => {
    const s = withHouse(132);
    const st = s.state;
    const m = st.monsters.find((x) => x.asleep)!;
    st.player.pos = st.map.stairs;
    const hp = m.hp;
    // 杖ではなく直接ダメージ処理を通す
    (s as unknown as { actions: { dealDamage: (a: unknown, b: Monster, n: number) => void } }).actions.dealDamage(undefined, m, 1);
    expect(m.asleep).toBe(false);
    expect(m.hp).toBe(hp - 1);
    expect(s.log.all.some((x) => x.includes('目を覚ました'))).toBe(true);
  });
});
