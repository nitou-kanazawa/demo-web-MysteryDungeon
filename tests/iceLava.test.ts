import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { RefreezeEvent } from '../src/domain/game/FloorEvent';
import { TileType } from '../src/domain/map/Tile';
import { DIRECTIONS, DIR_VEC, addVec } from '../src/domain/core/Vec2';
import { DEFAULT_FLOOR_CONFIG } from '../src/domain/data/spawnTables';
import { Monster } from '../src/domain/entity/Monster';
import { MONSTER_MAP } from '../src/domain/data/monsters';
import { MonsterAI } from '../src/domain/ai/MonsterAI';
import { SeededRng } from '../src/domain/core/Rng';

function toFloor(seed: number, floor: number) {
  const s = new GameSession(seed, { floorConfig: { ...DEFAULT_FLOOR_CONFIG, monsterHouseChance: 0, shopChance: 0, guardianChance: 0, blacksmithChance: 0, trapsPerFloor: [0, 0] } });
  for (let i = 1; i < floor; i++) {
    s.state.player.pos = s.state.map.stairs;
    s.execute({ type: 'descend' });
  }
  s.state.monsters = [];
  return s;
}

describe('氷の洞窟', () => {
  it('5F は氷の洞窟で、部屋の床の大半が氷になり、再凍結イベントがある', () => {
    const s = toFloor(300, 5);
    const st = s.state;
    expect(st.theme.id).toBe('ice');
    const roomTiles = st.map.rooms.flatMap((r) => [...r.tiles()]);
    const ice = roomTiles.filter((t) => st.map.get(t) === TileType.Ice).length;
    expect(ice / roomTiles.length).toBeGreaterThan(0.5);
    expect(st.events.some((e) => e instanceof RefreezeEvent)).toBe(true);
  });

  it('氷に乗ると止まるまで滑る', () => {
    const s = new GameSession(301);
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    // 部屋の 1 行をすべて氷にして、左端から右へ 1 歩
    const y = room.center.y;
    for (let x = room.x + 1; x <= room.right; x++) {
      st.map.set({ x, y }, TileType.Ice);
      if (st.itemAt({ x, y })) st.removeItemAt({ x, y });
      st.removeFeatureAt({ x, y });
    }
    st.player.pos = { x: room.x, y };
    s.execute({ type: 'move', dir: 'E' });
    // 氷の端まで滑り、氷でない最初のマス（壁なら手前、出入口なら通路）で止まる
    expect(st.player.pos.x).toBeGreaterThanOrEqual(room.right);
    expect(st.map.get(st.player.pos) === TileType.Ice && st.map.canStep(st.player.pos, 'E')).toBe(false);
    expect(s.log.all.some((m) => m.includes('滑った'))).toBe(true);
  });

  it('滑走は他のアクター・岩の手前で止まる', () => {
    const s = new GameSession(302);
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    const y = room.center.y;
    for (let x = room.x + 1; x <= room.right; x++) {
      st.map.set({ x, y }, TileType.Ice);
      if (st.itemAt({ x, y })) st.removeItemAt({ x, y });
      st.removeFeatureAt({ x, y });
    }
    st.player.pos = { x: room.x, y };
    const wall = { x: room.x + 4, y };
    if (wall.x > room.right) return;
    st.placeFeature(wall, { kind: 'boulder' });
    s.execute({ type: 'move', dir: 'E' });
    expect(st.player.pos).toEqual({ x: room.x + 3, y });
  });

  it('火の息が通った氷は水になり、20 ターン後に再び凍る', () => {
    const s = toFloor(303, 5);
    const st = s.state;
    const room = st.map.roomAt(st.player.pos)!;
    const y = room.center.y;
    st.player.pos = { x: room.x, y };
    for (let x = room.x + 1; x <= Math.min(room.right, room.x + 3); x++) st.map.set({ x, y }, TileType.Ice);
    const target = { x: room.x + 3, y };
    if (target.x > room.right) return;
    // 東 3 マスにキメラ（火の息）を置き、プレイヤーへ吹かせる
    const m = new Monster(950, MONSTER_MAP.get('chimaera')!, target);
    st.monsters.push(m);
    st.player.hp = 999;
    st.player.maxHp = 999;
    s.execute({ type: 'wait' });
    expect(s.log.all.some((x) => x.includes('氷が溶けて'))).toBe(true);
    const melted = { x: room.x + 1, y };
    expect(st.map.get(melted)).toBe(TileType.Water);
    st.monsters = [];
    for (let i = 0; i < 21; i++) s.execute({ type: 'wait' });
    expect(st.map.get(melted)).toBe(TileType.Ice);
  });
});

describe('火山', () => {
  it('7F は火山で、部屋に溶岩があり、開始位置は溶岩ではない', () => {
    for (let seed = 310; seed < 316; seed++) {
      const s = toFloor(seed, 7);
      const st = s.state;
      expect(st.theme.id).toBe('volcano');
      const lava = [...st.map.walkableTiles()].filter((t) => st.map.get(t) === TileType.Lava);
      expect(lava.length).toBeGreaterThan(0);
      expect(st.map.get(st.player.pos)).not.toBe(TileType.Lava);
      expect(st.map.get(st.map.stairs)).toBe(TileType.Stairs);
    }
  });

  it('溶岩の上にいるとターン終了時に 5 ダメージ', () => {
    const s = new GameSession(320);
    const st = s.state;
    st.monsters = [];
    st.map.set(st.player.pos, TileType.Lava);
    const hp = st.player.hp;
    s.execute({ type: 'wait' });
    expect(st.player.hp).toBe(hp - 5);
    expect(s.log.all.some((m) => m.includes('溶岩で焼けた'))).toBe(true);
  });

  it('敵 AI は溶岩を避けて進む', () => {
    const s = new GameSession(321);
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    const c = room.center;
    st.player.pos = { x: c.x - 3, y: c.y };
    // 敵と自分の間を溶岩で塞ぐ（縦一列）
    for (let y = room.y; y <= room.bottom; y++) st.map.set({ x: c.x - 1, y }, TileType.Lava);
    const m = new Monster(951, MONSTER_MAP.get('slime')!, { x: c.x + 1, y: c.y });
    st.monsters.push(m);
    const act = new MonsterAI().decide(m, st, new SeededRng(1));
    if (act.type === 'move') {
      const next = addVec(m.pos, DIR_VEC[act.dir]);
      expect(st.map.get(next)).not.toBe(TileType.Lava);
    }
  });

  it('投げ物は溶岩で燃え尽き、岩を落とすと冷えて床になる', () => {
    const s = new GameSession(322, { startingItems: ['dragon_killer'] });
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    st.player.pos = { x: room.x, y: room.center.y };
    // 射程 10 マスぶん（出入口の通路も含めて）を溶岩にする
    for (let x = room.x + 1; x <= room.x + 11; x++) {
      const p = { x, y: room.center.y };
      if (!st.map.isWalkable(p)) continue;
      st.map.set(p, TileType.Lava);
      if (st.itemAt(p)) st.removeItemAt(p);
      st.removeFeatureAt(p);
    }
    st.player.facing = 'E';
    s.execute({ type: 'throw', index: 0 });
    expect([...st.groundItems].some(([, it]) => it.def.id === 'dragon_killer')).toBe(false);
    expect(s.log.all.some((m) => m.includes('燃え尽きた'))).toBe(true);
    st.map.set({ x: room.x + 1, y: room.center.y }, TileType.Floor);
    st.placeFeature({ x: room.x + 1, y: room.center.y }, { kind: 'boulder' });
    s.execute({ type: 'move', dir: 'E' });
    expect(st.map.get({ x: room.x + 2, y: room.center.y })).toBe(TileType.Floor);
  });
});
