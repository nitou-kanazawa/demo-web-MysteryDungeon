import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { SeededRng } from '../src/domain/core/Rng';
import { DEFAULT_FLOOR_CONFIG } from '../src/domain/data/spawnTables';
import { DIRECTIONS, DIR_VEC, addVec, chebyshev } from '../src/domain/core/Vec2';
import { Monster } from '../src/domain/entity/Monster';
import { MONSTER_MAP } from '../src/domain/data/monsters';
import { Npc } from '../src/domain/entity/Npc';
import { BLACKSMITH_DEF, smithCost } from '../src/domain/data/npcs';
import { findFreeTileNear } from '../src/domain/game/Placement';
import type { TrapKind } from '../src/domain/game/TileFeature';

/** プレイヤーの隣の歩けるマスと方向 */
function neighbor(s: GameSession) {
  const st = s.state;
  for (const d of DIRECTIONS) {
    const p = addVec(st.player.pos, DIR_VEC[d]);
    if (st.map.canStep(st.player.pos, d) && !st.isOccupied(p) && !st.itemAt(p) && !st.featureAt(p)) return { p, d };
  }
  return undefined;
}

function stepOnTrap(seed: number, trap: TrapKind, items: string[] = []) {
  const s = new GameSession(seed, { startingItems: items });
  const st = s.state;
  st.monsters = [];
  const n = neighbor(s)!;
  st.placeFeature(n.p, { kind: 'trap', trap, hidden: true });
  s.execute({ type: 'move', dir: n.d });
  return { s, st, pos: n.p };
}

describe('罠', () => {
  it('2F 以降に隠し罠が置かれ、開始部屋には無い', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = new GameSession(seed);
      s.state.player.pos = s.state.map.stairs;
      s.execute({ type: 'descend' });
      const traps = [...s.state.allFeatures].filter(([, f]) => f.kind === 'trap');
      expect(traps.length).toBeGreaterThanOrEqual(2);
      const start = s.state.map.roomAt(s.state.player.pos)!;
      for (const [k, f] of traps) {
        expect(f.kind === 'trap' && f.hidden).toBe(true);
        const [x, y] = k.split(',').map(Number);
        expect(start.contains({ x: x!, y: y! })).toBe(false);
      }
    }
  });

  it('踏むと可視化され、睡眠ガスで 3 ターン動けない', () => {
    const { s, st, pos } = stepOnTrap(60, 'sleepGas');
    const f = st.featureAt(pos);
    expect(f?.kind === 'trap' && f.hidden).toBe(false);
    expect(st.player.hasStatus('sleep')).toBe(true);
    expect(s.execute({ type: 'move', dir: 'E' }).message).toContain('動かない');
  });

  it('落とし穴で次の階へ落ちる', () => {
    const { st } = stepOnTrap(61, 'pitfall');
    expect(st.floor).toBe(2);
  });

  it('地雷は周囲にダメージを与え、床のアイテムを消し、罠も消える', () => {
    const { s, st, pos } = stepOnTrap(62, 'mine');
    expect(st.player.hp).toBeLessThanOrEqual(st.player.maxHp - 20 + 1);
    expect(st.featureAt(pos)).toBeUndefined();
    expect(s.log.all.some((m) => m.includes('爆発'))).toBe(true);
  });

  it('錆びの罠は装備中の武器の修正値を下げる', () => {
    const s = new GameSession(63, { startingItems: ['copper_sword'] });
    s.execute({ type: 'equip', index: 0 });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s)!;
    st.placeFeature(n.p, { kind: 'trap', trap: 'rust', hidden: true });
    s.execute({ type: 'move', dir: n.d });
    expect(st.player.weapon?.plus).toBe(-1);
  });

  it('召喚の罠で敵が現れ、罠は消える', () => {
    const { st, pos } = stepOnTrap(64, 'summon');
    expect(st.monsters.length).toBeGreaterThan(0);
    expect(st.featureAt(pos)).toBeUndefined();
  });

  it('敵は罠を踏んでも発動しない', () => {
    const s = new GameSession(65);
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s)!;
    st.placeFeature(n.p, { kind: 'trap', trap: 'mine', hidden: true });
    const m = new Monster(700, MONSTER_MAP.get('slime')!, n.p);
    st.monsters.push(m);
    s.execute({ type: 'wait' });
    expect(st.featureAt(n.p)).toBeDefined();
    expect(m.isAlive).toBe(true);
  });

  it('罠見破りの巻物でフロアの罠が全部見える', () => {
    const s = new GameSession(66, { startingItems: ['scroll_search'] });
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    const tiles = [...room.tiles()].filter((t) => !st.itemAt(t) && !st.isOccupied(t)).slice(0, 3);
    for (const t of tiles) st.placeFeature(t, { kind: 'trap', trap: 'warp', hidden: true });
    s.execute({ type: 'use', index: 0 });
    for (const t of tiles) expect(st.featureAt(t)?.kind === 'trap' && (st.featureAt(t) as { hidden: boolean }).hidden).toBe(false);
    expect(s.log.all.some((m) => m.includes('3個の罠'))).toBe(true);
  });

  it('トラップの杖: 当たった敵の足元に罠を作って発動する', () => {
    const s = new GameSession(67, { startingItems: ['staff_trap'] });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s)!;
    const m = new Monster(701, MONSTER_MAP.get('golem')!, n.p);
    st.monsters.push(m);
    st.player.facing = n.d;
    s.execute({ type: 'use', index: 0 });
    expect(s.log.all.some((x) => x.includes('足元に') && x.includes('罠が現れた'))).toBe(true);
  });

  it('罠の発動はリプレイで再現される（フロア生成の罠をランダム歩行で踏む）', () => {
    const floorConfig = { ...DEFAULT_FLOOR_CONFIG, trapsPerFloor: [40, 40] as const, monsterHouseChance: 0, shopChance: 0 };
    const s = new GameSession(68, { floorConfig });
    s.state.player.pos = s.state.map.stairs; // 生成直後の位置調整はリプレイ側でも同じ seed で同じ位置になる
    // ↑ ただしコマンド外の変更はリプレイに残らないので、階段へは移動コマンドで行けないケースを避けるため
    //   ここでは「1F の階段の上から始まる」ことを再現側でも同様に行う
    s.execute({ type: 'descend' });
    const rng = new SeededRng(1);
    for (let i = 0; i < 200 && s.state.status === 'playing'; i++) s.execute({ type: 'move', dir: rng.pick(DIRECTIONS) });
    const r = new GameSession(68, { floorConfig });
    r.state.player.pos = r.state.map.stairs;
    for (const c of s.history) r.execute(c);
    expect(r.state.floor).toBe(s.state.floor);
    expect(r.state.player.pos).toEqual(s.state.player.pos);
    expect(r.log.all).toEqual(s.log.all);
  });
});

describe('鍛冶屋', () => {
  it('ぶつかるとゴールドで装備中の武器を +1、足りなければ断られる', () => {
    const s = new GameSession(70, { startingItems: ['copper_sword'] });
    s.execute({ type: 'equip', index: 0 });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s)!;
    st.npcs.push(new Npc(800, 'blacksmith', BLACKSMITH_DEF, n.p));
    st.player.gold = 0;
    s.execute({ type: 'move', dir: n.d });
    expect(st.player.weapon?.plus).toBe(0);
    expect(s.log.all.at(-1)).toContain('足りねえ');
    st.player.gold = smithCost(0);
    s.execute({ type: 'move', dir: n.d });
    expect(st.player.weapon?.plus).toBe(1);
    expect(st.player.gold).toBe(0);
  });

  it('攻撃すると敵になる', () => {
    const s = new GameSession(71, { startingItems: ['staff_thunder'] });
    const st = s.state;
    st.monsters = [];
    const n = neighbor(s)!;
    st.npcs.push(new Npc(801, 'blacksmith', BLACKSMITH_DEF, n.p));
    st.player.facing = n.d;
    s.execute({ type: 'use', index: 0 });
    expect(st.npcs.length).toBe(0);
    expect(st.monsters.some((m) => m.definition.id === 'blacksmith')).toBe(true);
  });
});

describe('番人', () => {
  function withGuardian(seed: number) {
    const s = new GameSession(seed, { floorConfig: { ...DEFAULT_FLOOR_CONFIG, guardianChance: 1, monsterHouseChance: 0, shopChance: 0, blackMarketChance: 0, mazeChance: 0, bigRoomChance: 0 } });
    for (let i = 0; i < 3; i++) {
      s.state.player.pos = s.state.map.stairs;
      s.execute({ type: 'descend' });
    }
    return s;
  }

  it('4F 以降、階段の近くに HP2倍の眠った番人がいる', () => {
    let found = 0;
    for (let seed = 80; seed < 90; seed++) {
      const s = withGuardian(seed);
      const g = s.state.monsters.find((m) => m.guardian);
      if (!g) continue; // 開始部屋＝階段の部屋のときは出ない
      found++;
      expect(g.asleep).toBe(true);
      expect(g.maxHp).toBe(g.definition.hp * 2);
      expect(chebyshev(g.pos, s.state.map.stairs)).toBeLessThanOrEqual(2);
      expect(g.displayName.startsWith('番人の')).toBe(true);
    }
    expect(found).toBeGreaterThan(3);
  });

  it('隣接すると目を覚まし、倒すと戦利品を落とす', () => {
    const s = withGuardian(91);
    const st = s.state;
    const g = st.monsters.find((m) => m.guardian);
    if (!g) return;
    st.monsters = [g];
    // 番人から 2 マス離れた直線上に立ち、1 歩近づいて隣接する
    const approach = DIRECTIONS.map((d) => ({ d, mid: addVec(g.pos, DIR_VEC[d]), far: addVec(g.pos, { x: DIR_VEC[d].x * 2, y: DIR_VEC[d].y * 2 }) })).find(
      ({ mid, far }) => st.map.isWalkable(mid) && st.map.isWalkable(far) && !st.isOccupied(mid) && !st.isOccupied(far) && !st.featureAt(mid) && !st.featureAt(far),
    );
    if (!approach) return;
    st.player.pos = approach.far;
    st.player.hp = 9999;
    st.player.maxHp = 9999;
    const toward = DIRECTIONS.find((d) => { const p = addVec(st.player.pos, DIR_VEC[d]); return p.x === approach.mid.x && p.y === approach.mid.y; })!;
    if (!st.map.canStep(st.player.pos, toward)) return;
    s.execute({ type: 'move', dir: toward });
    expect(g.asleep).toBe(false);
    expect(s.log.all.some((m) => m.includes('目を覚ました'))).toBe(true);
    // 撃破
    g.hp = 1;
    st.player.baseAtk = 999;
    const itemsBefore = [...st.groundItems].length;
    const atkDir = DIRECTIONS.find((d) => { const p = addVec(st.player.pos, DIR_VEC[d]); return p.x === g.pos.x && p.y === g.pos.y && st.map.canStep(st.player.pos, d); });
    if (!atkDir) return;
    for (let i = 0; i < 10 && g.isAlive; i++) s.execute({ type: 'move', dir: atkDir });
    expect(g.isAlive).toBe(false);
    expect([...st.groundItems].length).toBeGreaterThanOrEqual(itemsBefore + 1);
    expect(s.log.all.some((m) => m.includes('番人を倒した'))).toBe(true);
  });
});
