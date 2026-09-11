import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { SeededRng } from '../src/domain/core/Rng';
import { DEFAULT_FLOOR_CONFIG, type FloorConfig } from '../src/domain/data/spawnTables';
import { DIRECTIONS, DIR_VEC, addVec, chebyshev, keyOf, type Vec2 } from '../src/domain/core/Vec2';
import { TileType } from '../src/domain/map/Tile';
import { DungeonGenerator } from '../src/domain/map/DungeonGenerator';
import { reachableFrom } from '../src/domain/map/Pathfinding';
import { RollingRockEvent } from '../src/domain/game/FloorEvent';
import { effectiveSightRadius } from '../src/domain/game/Sight';
import { traceProjectile } from '../src/domain/game/Projectile';
import { themeForFloor, themesForFloor } from '../src/domain/data/themes';
import { Monster } from '../src/domain/entity/Monster';
import { MONSTER_MAP } from '../src/domain/data/monsters';
import { SKILL_MAP } from '../src/domain/data/skills';
import type { AllySnapshot } from '../src/domain/entity/AllySnapshot';

/** ギミックを個別に検証するための、抽選をすべて切った設定 */
const PLAIN: FloorConfig = {
  ...DEFAULT_FLOOR_CONFIG,
  monsterHouseChance: 0,
  shopChance: 0,
  guardianChance: 0,
  blacksmithChance: 0,
  trapsPerFloor: [0, 0],
  alternativeThemes: false,
  mazeChance: 0,
  bigRoomChance: 0,
  rollingRockChance: 0,
  switchChance: 0,
  vaultChance: 0,
  cageChance: 0,
  fogChance: 0,
  blackMarketChance: 0,
  mirrorChance: 0,
};

function toFloor(seed: number, floor: number, config: FloorConfig = PLAIN, items: string[] = []) {
  const s = new GameSession(seed, { floorConfig: config, startingItems: items });
  for (let i = 1; i < floor; i++) {
    s.state.player.pos = s.state.map.stairs;
    s.execute({ type: 'descend' });
  }
  return s;
}

/** プレイヤーの隣で、部屋の中の空いている床と方向 */
function neighbor(s: GameSession) {
  const st = s.state;
  for (const d of DIRECTIONS) {
    const p = addVec(st.player.pos, DIR_VEC[d]);
    if (st.map.canStep(st.player.pos, d) && !st.isOccupied(p) && !st.itemAt(p) && !st.featureAt(p) && st.map.get(p) === TileType.Floor) return { p, d };
  }
  throw new Error('no neighbor');
}

const parse = (k: string): Vec2 => {
  const [x, y] = k.split(',').map(Number);
  return { x: x ?? 0, y: y ?? 0 };
};

describe('反射壁（鏡）', () => {
  it('東の鏡に向けて杖を振ると魔法弾が自分に返ってくる', () => {
    const s = new GameSession(900, { floorConfig: PLAIN, startingItems: ['staff_paralyze'] });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s);
    st.map.set(n.p, TileType.Mirror);
    st.player.facing = n.d;
    s.execute({ type: 'use', index: 0 });
    expect(st.player.hasStatus('paralysis')).toBe(true);
    expect(s.log.all.some((m) => m.includes('鏡に反射'))).toBe(true);
  });

  it('経路は鏡で折れ、区間が 2 つになる', () => {
    const s = new GameSession(901, { floorConfig: PLAIN });
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    st.player.pos = { x: room.x, y: room.center.y };
    st.map.set({ x: room.right + 1, y: room.center.y }, TileType.Mirror);
    const trace = traceProjectile(st, st.player.pos, 'E', 20);
    expect(trace.reflected).toBe(true);
    expect(trace.segments.length).toBe(2);
    expect(trace.hit).toBe(st.player);
    expect(trace.dir).toBe('W');
  });

  it('敵のブレスも反射して敵自身に当たる', () => {
    const s = new GameSession(902, { floorConfig: PLAIN });
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    if (room.w < 4) return;
    // 敵を西端、鏡をその東隣、プレイヤーは遠くに（ブレスの向きは target で決まる）
    const dragon = new Monster(9000, MONSTER_MAP.get('dragon')!, { x: room.x, y: room.y });
    st.monsters.push(dragon);
    st.player.pos = { x: room.right, y: room.y };
    st.map.set({ x: room.x + 1, y: room.y }, TileType.Mirror);
    const breath = SKILL_MAP.get('fire_breath') ?? [...SKILL_MAP.values()].find((k) => k.kind === 'breath');
    if (!breath) return;
    const hp = dragon.hp;
    (s as unknown as { skills: { use: (u: Monster, k: typeof breath, t: unknown) => void } }).skills.use(dragon, breath, st.player);
    expect(dragon.hp).toBeLessThan(hp);
  });
});

describe('鍵と扉・宝物庫', () => {
  it('カギが無いと扉は開かず、ターンも消費しない', () => {
    const s = new GameSession(910, { floorConfig: PLAIN });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s);
    st.placeFeature(n.p, { kind: 'door' });
    const r = s.execute({ type: 'move', dir: n.d });
    expect(r.consumedTurn).toBe(false);
    expect(st.featureAt(n.p)?.kind).toBe('door');
    expect(s.log.all.some((m) => m.includes('鍵がかかっている'))).toBe(true);
  });

  it('カギがあれば消費して開く', () => {
    const s = new GameSession(911, { floorConfig: PLAIN, startingItems: ['key'] });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s);
    st.placeFeature(n.p, { kind: 'door' });
    const r = s.execute({ type: 'move', dir: n.d });
    expect(r.consumedTurn).toBe(true);
    expect(st.featureAt(n.p)).toBeUndefined();
    expect(st.player.inventory.items.some((i) => i.def.id === 'key')).toBe(false);
  });

  it('宝物庫は扉で閉じられ、カギはフロアのどこかにあり、中に品物がある', () => {
    let built = 0;
    for (let seed = 920; seed < 950; seed++) {
      const s = toFloor(seed, 2, { ...PLAIN, vaultChance: 1 });
      const st = s.state;
      if (st.lockedTiles.size === 0) continue;
      built++;
      const door = [...st.allFeatures].find(([, f]) => f.kind === 'door');
      expect(door).toBeDefined();
      const doorPos = parse(door![0]);
      expect([...st.groundItems].some(([, it]) => it.def.id === 'key')).toBe(true);
      const inside = [...st.groundItems].filter(([k]) => st.lockedTiles.has(k) && k !== keyOf(doorPos));
      expect(inside.length).toBeGreaterThanOrEqual(1);
      // 扉を閉じたままでは中に入れない
      const reach = reachableFrom(st.map, st.player.pos, (p) => keyOf(p) === keyOf(doorPos));
      for (const k of st.lockedTiles) if (k !== keyOf(doorPos)) expect(reach.has(k)).toBe(false);
      // 扉を開ければ入れる
      const open = reachableFrom(st.map, st.player.pos);
      for (const k of st.lockedTiles) expect(open.has(k)).toBe(true);
      // 敵は中に湧かない
      for (const m of st.monsters) expect(st.lockedTiles.has(keyOf(m.pos))).toBe(false);
    }
    expect(built).toBeGreaterThan(0);
  });
});

describe('囚われた仲間（檻）', () => {
  it('カギで開けると仲間になる', () => {
    const s = new GameSession(930, { floorConfig: PLAIN, startingItems: ['key'] });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s);
    st.placeFeature(n.p, { kind: 'cage', defId: 'slime' });
    s.execute({ type: 'move', dir: n.d });
    expect(st.allies.length).toBe(1);
    expect(st.allies[0]!.definition.id).toBe('slime');
    expect(st.featureAt(n.p)).toBeUndefined();
    expect(st.player.inventory.count).toBe(0);
  });

  it('カギが無いと開かない。仲間が 3 体いると加入せずカギも減らない', () => {
    const s = new GameSession(931, { floorConfig: PLAIN });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s);
    st.placeFeature(n.p, { kind: 'cage', defId: 'slime' });
    s.execute({ type: 'move', dir: n.d });
    expect(st.allies.length).toBe(0);
    expect(s.log.all.some((m) => m.includes('助けを求めている'))).toBe(true);

    const snap = (defId: string): AllySnapshot => ({ defId, level: 1, exp: 0, bonusHp: 0, bonusAtk: 0, bonusDef: 0 });
    const full = new GameSession(932, { floorConfig: PLAIN, startingItems: ['key'], startingAllies: [snap('slime'), snap('dracky'), snap('slime')] });
    const fst = full.state;
    fst.monsters = [];
    const m = neighbor(full);
    fst.placeFeature(m.p, { kind: 'cage', defId: 'dracky' });
    full.execute({ type: 'move', dir: m.d });
    expect(fst.allies.length).toBe(3);
    expect(fst.player.inventory.items.some((i) => i.def.id === 'key')).toBe(true);
    expect(fst.featureAt(m.p)?.kind).toBe('cage');
  });

  it('檻が生成されるとカギも別に置かれる', () => {
    let built = 0;
    for (let seed = 940; seed < 960; seed++) {
      const s = toFloor(seed, 2, { ...PLAIN, cageChance: 1 });
      const cage = [...s.state.allFeatures].find(([, f]) => f.kind === 'cage');
      if (!cage) continue;
      built++;
      expect([...s.state.groundItems].some(([, it]) => it.def.id === 'key')).toBe(true);
    }
    expect(built).toBeGreaterThan(0);
  });
});

describe('スイッチ', () => {
  it('橋モード: 踏むと targets が通路になる', () => {
    const s = new GameSession(950, { floorConfig: PLAIN });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s);
    const room = st.map.roomAt(st.player.pos)!;
    // 部屋の外の壁 3 マスを橋の候補にする
    const targets = [0, 1, 2].map((i) => ({ x: room.x + i, y: room.bottom + 2 })).filter((t) => st.map.get(t) === TileType.Wall);
    st.placeFeature(n.p, { kind: 'switch', targets, mode: 'bridge', active: false });
    s.execute({ type: 'move', dir: n.d });
    for (const t of targets) expect(st.map.get(t)).toBe(TileType.Corridor);
    const f = st.featureAt(n.p);
    expect(f?.kind === 'switch' && f.active).toBe(true);
  });

  it('格子モード: 踏むと格子が消える', () => {
    const s = new GameSession(951, { floorConfig: PLAIN });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s);
    const gatePos = { x: n.p.x + 2, y: n.p.y };
    st.placeFeature(gatePos, { kind: 'gate' });
    st.placeFeature(n.p, { kind: 'switch', targets: [gatePos], mode: 'gate', active: false });
    expect(st.isOccupied(gatePos)).toBe(true);
    s.execute({ type: 'move', dir: n.d });
    expect(st.featureAt(gatePos)).toBeUndefined();
  });

  it('地底湖では橋スイッチ、洞窟では格子スイッチが生成され、格子があっても全床は連結', () => {
    let bridges = 0;
    let gates = 0;
    for (let seed = 960; seed < 985; seed++) {
      const water = toFloor(seed, 3, { ...PLAIN, switchChance: 1 });
      const sw = [...water.state.allFeatures].find(([, f]) => f.kind === 'switch')?.[1];
      if (sw && sw.kind === 'switch') {
        expect(sw.mode).toBe('bridge');
        for (const t of sw.targets) expect(water.state.map.get(t)).toBe(TileType.Water);
        bridges++;
      }
      const cave = toFloor(seed, 2, { ...PLAIN, switchChance: 1 });
      const st = cave.state;
      const gw = [...st.allFeatures].find(([, f]) => f.kind === 'switch')?.[1];
      if (gw && gw.kind === 'switch') {
        expect(gw.mode).toBe('gate');
        for (const t of gw.targets) expect(st.featureAt(t)?.kind).toBe('gate');
        // 格子で塞いだ通路（余分な接続）自身を除き、全床に到達できる
        const gated = new Set(st.map.corridors.filter((c) => c.extra).flatMap((c) => c.tiles.map(keyOf)));
        const reach = reachableFrom(st.map, st.player.pos, (p) => st.featureAt(p)?.kind === 'gate');
        for (const t of st.map.walkableTiles()) {
          if (gated.has(keyOf(t))) continue;
          expect(reach.has(keyOf(t))).toBe(true);
        }
        gates++;
      }
    }
    expect(bridges).toBeGreaterThan(0);
    expect(gates).toBeGreaterThan(0);
  });
});

describe('霧と松明', () => {
  it('霧では部屋の中でも 2 マス先までしか見えない', () => {
    for (let seed = 970; seed < 990; seed++) {
      const s = new GameSession(seed, { floorConfig: PLAIN });
      const st = s.state;
      const room = st.map.roomAt(st.player.pos)!;
      const far = [...room.tiles()].find((t) => chebyshev(t, st.player.pos) >= 3);
      if (!far) continue;
      expect(st.visibility.isVisible(far)).toBe(true);
      st.fog = true;
      st.visibility.sightRadius = effectiveSightRadius(st);
      st.visibility.update(st.player.pos);
      expect(st.visibility.isVisible(far)).toBe(false);
      const near = [...room.tiles()].find((t) => chebyshev(t, st.player.pos) <= 2)!;
      expect(st.visibility.isVisible(near)).toBe(true);
      return;
    }
  });

  it('松明は毎ターン減り、0 で視界が 1 マスになる。たいまつで回復する', () => {
    const s = new GameSession(991, { floorConfig: PLAIN, startingItems: ['torch'] });
    const st = s.state;
    st.monsters = [];
    st.player.torch = 1;
    s.execute({ type: 'wait' });
    expect(st.player.torch).toBe(0);
    expect(st.visibility.sightRadius).toBe(1);
    expect(s.log.all.some((m) => m.includes('松明が消えた'))).toBe(true);
    s.execute({ type: 'use', index: 0 });
    expect(st.player.torch).toBeGreaterThanOrEqual(199);
    expect(st.visibility.sightRadius).toBeUndefined();
    expect(s.log.all.some((m) => m.includes('火が灯った'))).toBe(true);
  });
});

describe('危険度と転がる岩', () => {
  it('フロア滞在が長いほど湧き間隔が短くなる（下限 8）', () => {
    const s = new GameSession(1000, { floorConfig: PLAIN });
    expect(s.respawnInterval()).toBe(DEFAULT_FLOOR_CONFIG.respawnInterval);
    s.state.floorTurns = 300;
    expect(s.respawnInterval()).toBe(DEFAULT_FLOOR_CONFIG.respawnInterval - 16);
    s.state.floorTurns = 100000;
    expect(s.respawnInterval()).toBe(8);
  });

  it('岩は毎ターン進み、端で反転し、当たると 10 ダメージ', () => {
    for (let seed = 1001; seed < 1020; seed++) {
      const s = new GameSession(seed, { floorConfig: PLAIN });
      const st = s.state;
      st.monsters = [];
      const room = st.map.roomAt(st.player.pos)!;
      if (room.w < 6) continue;
      const y = room.y;
      const lane = [0, 1, 2, 3, 4, 5].map((i) => ({ x: room.x + i, y }));
      st.player.pos = { x: room.right, y: room.bottom };
      for (const t of lane) {
        st.removeFeatureAt(t);
        st.removeItemAt(t);
      }
      const ev = new RollingRockEvent(st, lane);
      st.events.push(ev);
      expect(st.featureAt(lane[0]!)?.kind).toBe('rock');
      s.execute({ type: 'wait' });
      expect(st.featureAt(lane[1]!)?.kind).toBe('rock');
      expect(st.featureAt(lane[0]!)).toBeUndefined();
      for (let i = 0; i < 4; i++) s.execute({ type: 'wait' });
      expect(st.featureAt(lane[5]!)?.kind).toBe('rock');
      s.execute({ type: 'wait' });
      expect(st.featureAt(lane[4]!)?.kind).toBe('rock');
      expect(ev.dir).toBe('W');
      // プレイヤーを進路に置く
      st.player.pos = lane[2]!;
      st.player.hp = 50;
      st.player.maxHp = 50;
      s.execute({ type: 'wait' }); // 岩 → lane[3]
      s.execute({ type: 'wait' }); // 岩 → lane[2] にぶつかる
      expect(st.player.hp).toBeLessThanOrEqual(40);
      expect(s.log.all.some((m) => m.includes('転がる岩が'))).toBe(true);
      return;
    }
  });

  it('3F 以降に直線通路があれば岩が置かれる', () => {
    let placed = 0;
    for (let seed = 1020; seed < 1040; seed++) {
      const s = toFloor(seed, 3, { ...PLAIN, rollingRockChance: 1 });
      if (s.state.events.some((e) => e instanceof RollingRockEvent)) placed++;
    }
    expect(placed).toBeGreaterThan(0);
  });
});

describe('闇市', () => {
  it('店主がおらず商品に値札が無く、出口に番人が眠っている', () => {
    let built = 0;
    for (let seed = 1040; seed < 1070; seed++) {
      const s = toFloor(seed, 4, { ...PLAIN, blackMarketChance: 1 });
      const st = s.state;
      if (!st.blackMarket) continue;
      built++;
      expect(st.shop).toBeUndefined();
      const room = st.blackMarket.room;
      const goods = [...st.groundItems].filter(([k]) => room.contains(parse(k)));
      expect(goods.length).toBeGreaterThanOrEqual(3);
      for (const [, it] of goods) expect(it.price).toBeUndefined();
      const guards = st.monsters.filter((m) => m.guardian);
      expect(guards.length).toBeGreaterThan(0);
      for (const g of guards) {
        expect(g.asleep).toBe(true);
        expect(st.map.get(g.pos)).toBe(TileType.Corridor);
        expect(room.contains(g.pos)).toBe(false);
      }
      expect(s.log.all.some((m) => m.includes('店主のいない店'))).toBe(true);
    }
    expect(built).toBeGreaterThan(0);
  });
});

describe('レイアウトと新テーマ', () => {
  it('迷路・大部屋・街のいずれも全床が連結し、階段がある', () => {
    const gen = new DungeonGenerator();
    for (const layout of ['maze', 'bigRoom', 'town'] as const) {
      for (let seed = 0; seed < 30; seed++) {
        const map = gen.generate(new SeededRng(seed), TileType.Wall, layout);
        const walkable = [...map.walkableTiles()];
        expect(walkable.length).toBeGreaterThan(20);
        const reach = reachableFrom(map, map.stairs);
        for (const t of walkable) expect(reach.has(keyOf(t))).toBe(true);
        expect(map.rooms.length).toBeGreaterThanOrEqual(layout === 'bigRoom' ? 1 : layout === 'maze' ? 3 : 12);
        if (layout === 'bigRoom') expect(map.rooms.length).toBe(1);
      }
    }
  });

  it('大部屋では開始位置が階段から遠く、敵は離れた場所に湧く', () => {
    for (let seed = 1100; seed < 1110; seed++) {
      const s = toFloor(seed, 3, { ...PLAIN, bigRoomChance: 1 });
      const st = s.state;
      expect(st.layout).toBe('bigRoom');
      expect(chebyshev(st.player.pos, st.map.stairs)).toBeGreaterThan(15);
      for (const m of st.monsters) expect(chebyshev(m.pos, st.player.pos)).toBeGreaterThanOrEqual(8);
      expect(s.log.all.some((m) => m.includes('巨大な一部屋'))).toBe(true);
    }
  });

  it('迷路フロアでは広間が部屋になり、階段に到達できる', () => {
    for (let seed = 1110; seed < 1120; seed++) {
      const s = toFloor(seed, 3, { ...PLAIN, mazeChance: 1 });
      const st = s.state;
      expect(st.layout).toBe('maze');
      expect(reachableFrom(st.map, st.player.pos).has(keyOf(st.map.stairs))).toBe(true);
    }
  });

  it('5〜6F は氷か廃墟、7〜8F は火山か暗黒が抽選され、既定は従来どおり', () => {
    expect(themeForFloor(5).id).toBe('ice');
    expect(themeForFloor(7).id).toBe('volcano');
    expect(themesForFloor(5).map((t) => t.id)).toEqual(['ice', 'ruins']);
    expect(themesForFloor(7).map((t) => t.id)).toEqual(['volcano', 'dark']);
    const seen = new Set<string>();
    for (let seed = 1200; seed < 1230; seed++) {
      const s = toFloor(seed, 5, { ...PLAIN, alternativeThemes: true });
      seen.add(s.state.theme.id);
      if (s.state.theme.id === 'ruins') {
        expect(s.state.layout).toBe('town');
        expect(s.state.map.rooms.length).toBe(12);
      }
    }
    expect(seen.has('ice') && seen.has('ruins')).toBe(true);
  });

  it('暗黒では視界が 1 マスで、敵の攻撃力が +3', () => {
    let found = false;
    for (let seed = 1300; seed < 1340 && !found; seed++) {
      const s = toFloor(seed, 7, { ...PLAIN, alternativeThemes: true });
      const st = s.state;
      if (st.theme.id !== 'dark') continue;
      found = true;
      expect(st.visibility.sightRadius).toBe(1);
      const room = st.map.roomAt(st.player.pos)!;
      const far = [...room.tiles()].find((t) => chebyshev(t, st.player.pos) >= 2);
      if (far) expect(st.visibility.isVisible(far)).toBe(false);
      for (const m of st.monsters) expect(m.atk).toBe(m.definition.atk + 3);
    }
    expect(found).toBe(true);
  });

  it('鏡は壁テーマの 2F 以降で部屋の外周に置かれる', () => {
    let placed = 0;
    for (let seed = 1400; seed < 1420; seed++) {
      const s = toFloor(seed, 2, { ...PLAIN, mirrorChance: 1 });
      const st = s.state;
      const mirrors: Vec2[] = [];
      for (let y = 0; y < st.map.height; y++) for (let x = 0; x < st.map.width; x++) if (st.map.get({ x, y }) === TileType.Mirror) mirrors.push({ x, y });
      if (mirrors.length === 0) continue;
      placed++;
      for (const m of mirrors) {
        expect(st.map.isWalkable(m)).toBe(false);
        expect(st.map.passesProjectile(m)).toBe(false);
        expect(st.map.rooms.some((r) => r.containsWithBorder(m) && !r.contains(m))).toBe(true);
      }
    }
    expect(placed).toBeGreaterThan(0);
  });
});
