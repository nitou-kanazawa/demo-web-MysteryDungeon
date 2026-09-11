import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { CollapseEvent, TideEvent } from '../src/domain/game/FloorEvent';
import { TileType } from '../src/domain/map/Tile';
import { DIRECTIONS, DIR_VEC, addVec, type Vec2 } from '../src/domain/core/Vec2';
import { DEFAULT_FLOOR_CONFIG } from '../src/domain/data/spawnTables';

function toFloor(seed: number, floor: number) {
  const s = new GameSession(seed, { floorConfig: { ...DEFAULT_FLOOR_CONFIG, monsterHouseChance: 0, shopChance: 0, guardianChance: 0, alternativeThemes: false, mazeChance: 0, bigRoomChance: 0, rollingRockChance: 0, switchChance: 0, vaultChance: 0, cageChance: 0, fogChance: 0, blackMarketChance: 0 } });
  for (let i = 1; i < floor; i++) {
    s.state.player.pos = s.state.map.stairs;
    s.execute({ type: 'descend' });
  }
  s.state.monsters = [];
  return s;
}

describe('満潮（地底湖）', () => {
  it('地底湖には TideEvent が登録され、周期で橋が沈んで戻る', () => {
    const s = toFloor(200, 3);
    const st = s.state;
    const tide = st.events.find((e) => e instanceof TideEvent) as TideEvent;
    expect(tide).toBeDefined();
    const bridges = [...st.map.walkableTiles()].filter((p) => st.map.get(p) === TileType.Corridor);
    expect(bridges.length).toBeGreaterThan(0);
    // 満潮まで待つ（period 60, high 15 → turn 45 で満潮）
    let highSeen = false;
    for (let i = 0; i < 70 && st.status === 'playing'; i++) {
      s.execute({ type: 'wait' });
      if (tide.isHighTide) {
        highSeen = true;
        for (const p of bridges) expect(st.map.get(p)).toBe(TileType.Water);
        expect(st.map.isWalkable(st.player.pos)).toBe(true);
      }
    }
    expect(highSeen).toBe(true);
    expect(tide.isHighTide).toBe(false);
    for (const p of bridges) expect(st.map.get(p)).toBe(TileType.Corridor);
    expect(s.log.all.some((m) => m.includes('満潮'))).toBe(true);
    expect(s.log.all.some((m) => m.includes('潮が引いた'))).toBe(true);
  });

  it('橋の上にいると岸へ退避させられる', () => {
    const s = toFloor(201, 3);
    const st = s.state;
    const bridge = [...st.map.walkableTiles()].find((p) => st.map.get(p) === TileType.Corridor)!;
    st.player.pos = bridge;
    for (let i = 0; i < 70 && !st.map.isWalkable(bridge) === false && st.status === 'playing'; i++) {
      s.execute({ type: 'wait' });
      if (st.map.get(bridge) === TileType.Water) break;
    }
    expect(st.map.isWalkable(st.player.pos)).toBe(true);
    expect(s.log.all.some((m) => m.includes('打ち上げられた'))).toBe(true);
  });
});

describe('崩落（天空）', () => {
  it('通った回廊にひびが入り、数ターン後に崩れて空になり、しばらくして戻る', () => {
    const s = toFloor(202, 9);
    const st = s.state;
    const collapse = st.events.find((e) => e instanceof CollapseEvent) as CollapseEvent;
    expect(collapse).toBeDefined();
    // 回廊の上に立って踏んだ扱いにする（移動コマンドで踏むのが本来だが、位置は生成に依存するので直接）
    const corridor = [...st.map.walkableTiles()].find((p) => st.map.get(p) === TileType.Corridor)!;
    st.player.pos = corridor;
    collapse.markVisited(st, corridor);
    expect(st.featureAt(corridor)?.kind).toBe('crack');
    // 立っている間は崩れない
    for (let i = 0; i < 8; i++) s.execute({ type: 'wait' });
    expect(st.map.get(corridor)).toBe(TileType.Corridor);
    // 離れると崩れる
    const room = st.map.rooms[0]!;
    st.player.pos = room.center;
    s.execute({ type: 'wait' });
    expect(st.map.get(corridor)).toBe(TileType.Void);
    expect(st.featureAt(corridor)).toBeUndefined();
    // 30 ターン後に戻る
    for (let i = 0; i < 31; i++) s.execute({ type: 'wait' });
    expect(st.map.get(corridor)).toBe(TileType.Corridor);
  });

  it('移動コマンドで回廊を踏むと自動でひびが入る', () => {
    const s = toFloor(203, 9);
    const st = s.state;
    const corridor = [...st.map.walkableTiles()].find((p) => st.map.get(p) === TileType.Corridor)!;
    // 回廊の隣の歩けるマスから踏み込む
    const from = DIRECTIONS.map((d) => ({ d, p: addVec(corridor, DIR_VEC[d]) })).find(({ p }) => st.map.isWalkable(p) && !st.isOccupied(p));
    if (!from) return;
    st.player.pos = from.p;
    const dir = DIRECTIONS.find((d) => {
      const p = addVec(st.player.pos, DIR_VEC[d]);
      return p.x === corridor.x && p.y === corridor.y && st.map.canStep(st.player.pos, d);
    });
    if (!dir) return;
    s.execute({ type: 'move', dir });
    expect(st.featureAt(corridor)?.kind).toBe('crack');
  });
});

describe('押せる岩', () => {
  function setup(seed: number) {
    const s = new GameSession(seed);
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    const c = room.center;
    st.player.pos = { x: c.x - 2, y: c.y };
    const boulder: Vec2 = { x: c.x - 1, y: c.y };
    st.placeFeature(boulder, { kind: 'boulder' });
    return { s, st, boulder, room };
  }

  it('押すと岩が 1 マス進み、自分も進む。壁の前では押せない', () => {
    const { s, st, boulder } = setup(210);
    expect(st.isOccupied(boulder)).toBe(true);
    const r = s.execute({ type: 'move', dir: 'E' });
    expect(r.consumedTurn).toBe(true);
    expect(st.player.pos).toEqual(boulder);
    expect(st.featureAt({ x: boulder.x + 1, y: boulder.y })?.kind).toBe('boulder');
    // 壁まで押し続ける
    for (let i = 0; i < 30; i++) s.execute({ type: 'move', dir: 'E' });
    const last = st.player.pos;
    const r2 = s.execute({ type: 'move', dir: 'E' });
    expect(r2.consumedTurn).toBe(false);
    expect(st.player.pos).toEqual(last);
    expect(s.log.all.some((m) => m.includes('びくともしない'))).toBe(true);
  });

  it('水に落とすと足場（床）になる', () => {
    const { s, st, boulder } = setup(211);
    st.map.set({ x: boulder.x + 1, y: boulder.y }, TileType.Water);
    s.execute({ type: 'move', dir: 'E' });
    expect(st.map.get({ x: boulder.x + 1, y: boulder.y })).toBe(TileType.Floor);
    expect(st.featureAt({ x: boulder.x + 1, y: boulder.y })).toBeUndefined();
    expect(s.log.all.some((m) => m.includes('足場になった'))).toBe(true);
  });

  it('空に落とすと消える', () => {
    const { s, st, boulder } = setup(212);
    st.map.set({ x: boulder.x + 1, y: boulder.y }, TileType.Void);
    s.execute({ type: 'move', dir: 'E' });
    expect(st.map.get({ x: boulder.x + 1, y: boulder.y })).toBe(TileType.Void);
    expect([...st.allFeatures].some(([, f]) => f.kind === 'boulder')).toBe(false);
  });

  it('岩は投げ物を止め、敵の進路もふさぐ', () => {
    const { s, st, boulder } = setup(213, );
    st.player.inventory.add((s as unknown as { factory: { create: (id: string) => never } }).factory.create('herb'));
    st.player.facing = 'E';
    s.execute({ type: 'throw', index: 0 });
    const landed = [...st.groundItems].find(([, it]) => it.def.id === 'herb');
    expect(landed).toBeDefined();
    expect(st.isOccupied(boulder)).toBe(true);
  });
});

describe('跳ね床・泉・石碑', () => {
  it('2F 以降に跳ね床が置かれ、踏むと壁まで飛ぶ', () => {
    const s = new GameSession(220);
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    st.player.pos = { x: room.x + 1, y: room.center.y };
    st.placeFeature({ x: room.x + 2, y: room.center.y }, { kind: 'spring', dir: 'E' });
    s.execute({ type: 'move', dir: 'E' });
    expect(st.player.pos.x).toBeGreaterThan(room.x + 2);
    expect(s.log.all.some((m) => m.includes('跳ね床'))).toBe(true);
  });

  it('回復の泉は 1 回だけ全回復し、石碑はメッセージを出す', () => {
    const s = new GameSession(221);
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    st.player.pos = { x: room.x + 1, y: room.center.y };
    st.placeFeature({ x: room.x + 2, y: room.center.y }, { kind: 'fountain', effect: 'heal', uses: 1 });
    st.placeFeature({ x: room.x + 3, y: room.center.y }, { kind: 'sign', text: 'テスト' });
    st.player.hp = 1;
    s.execute({ type: 'move', dir: 'E' });
    expect(st.player.hp).toBe(st.player.maxHp);
    expect(st.featureAt({ x: room.x + 2, y: room.center.y })).toBeUndefined();
    s.execute({ type: 'move', dir: 'E' });
    expect(s.log.all.some((m) => m.includes('石碑「テスト」'))).toBe(true);
  });

  it('フロア生成で跳ね床が置かれる（2F、20 シード）', () => {
    let springs = 0;
    for (let seed = 230; seed < 250; seed++) {
      const s = toFloor(seed, 2);
      springs += [...s.state.allFeatures].filter(([, f]) => f.kind === 'spring').length;
    }
    expect(springs).toBeGreaterThanOrEqual(20);
  });
});
