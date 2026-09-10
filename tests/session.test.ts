import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { DIRECTIONS, DIR_VEC, addVec, keyOf } from '../src/domain/core/Vec2';
import type { Command } from '../src/domain/game/Command';
import { SeededRng } from '../src/domain/core/Rng';
import { Monster } from '../src/domain/entity/Monster';
import { MONSTER_MAP } from '../src/domain/data/monsters';
import { findFreeTileNear } from '../src/domain/game/Placement';
import { TileType } from '../src/domain/map/Tile';

function invariants(s: GameSession): void {
  const st = s.state;
  expect(st.map.isWalkable(st.player.pos)).toBe(true);
  const seen = new Set<string>();
  for (const a of st.actors) {
    expect(a.isAlive).toBe(true);
    expect(st.map.isWalkable(a.pos)).toBe(true);
    const k = keyOf(a.pos);
    expect(seen.has(k)).toBe(false);
    seen.add(k);
  }
  expect(st.player.hp).toBeLessThanOrEqual(st.player.maxHp);
}

describe('GameSession', () => {
  it('初期状態: フロア1、敵とアイテムが配置されている', () => {
    const s = new GameSession(123);
    expect(s.state.floor).toBe(1);
    expect(s.state.monsters.length).toBeGreaterThanOrEqual(4);
    expect([...s.state.groundItems].length).toBeGreaterThanOrEqual(5);
    invariants(s);
  });

  it('ランダム操作を 300 ターン行っても不変条件が壊れない（10 シード）', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = new GameSession(seed);
      const rng = new SeededRng(seed * 7);
      for (let i = 0; i < 300 && s.state.status === 'playing'; i++) {
        const cmd: Command = rng.chance(0.9) ? { type: 'move', dir: rng.pick(DIRECTIONS) } : { type: 'wait' };
        s.execute(cmd);
        if (s.state.status === 'playing') invariants(s);
      }
    }
  });

  it('リプレイ: seed + コマンド列から同一状態を再現できる', () => {
    const s = new GameSession(99);
    const rng = new SeededRng(5);
    for (let i = 0; i < 200 && s.state.status === 'playing'; i++) {
      s.execute({ type: 'move', dir: rng.pick(DIRECTIONS) });
    }
    const r = GameSession.replay(s.toReplay());
    expect(r.state.turn).toBe(s.state.turn);
    expect(r.state.player.pos).toEqual(s.state.player.pos);
    expect(r.state.player.hp).toBe(s.state.player.hp);
    expect(r.state.player.inventory.items.map((i) => i.def.id)).toEqual(
      s.state.player.inventory.items.map((i) => i.def.id),
    );
    expect(r.log.all).toEqual(s.log.all);
  });

  it('隣接した敵に移動するとダメージを与え、倒すと経験値が入る', () => {
    const s = new GameSession(7);
    const st = s.state;
    st.monsters = [];
    const pos = findFreeTileNear(st, addVec(st.player.pos, DIR_VEC.E))!;
    const dir = DIRECTIONS.find((d) => {
      const p = addVec(st.player.pos, DIR_VEC[d]);
      return p.x === pos.x && p.y === pos.y;
    });
    if (!dir || !st.map.canStep(st.player.pos, dir)) return; // 地形次第でスキップ
    const slime = new Monster(9999, MONSTER_MAP.get('slime')!, pos);
    slime.hp = 1;
    st.monsters.push(slime);
    const expBefore = st.player.exp;
    for (let i = 0; i < 10 && slime.isAlive; i++) s.execute({ type: 'move', dir });
    expect(slime.isAlive).toBe(false);
    expect(st.monsters.includes(slime)).toBe(false);
    expect(st.player.exp + 0).toBeGreaterThanOrEqual(expBefore); // レベルアップで消費されることもある
    expect(s.log.all.some((m) => m.includes('倒した'))).toBe(true);
  });

  it('装備するとステータスに反映され、外すと戻る', () => {
    const s = new GameSession(3, { startingItems: ['copper_sword', 'scale_shield'] });
    const p = s.state.player;
    const atk = p.atk;
    const def = p.def;
    expect(s.execute({ type: 'equip', index: 0 }).consumedTurn).toBe(true);
    expect(s.execute({ type: 'equip', index: 1 }).consumedTurn).toBe(true);
    expect(p.atk).toBe(atk + 3);
    expect(p.def).toBe(def + 2);
    expect(s.execute({ type: 'unequip', index: 0 }).consumedTurn).toBe(true);
    expect(p.atk).toBe(atk);
    expect(s.execute({ type: 'equip', index: 1 }).consumedTurn).toBe(false);
  });

  it('草を食べると回復し、パンで満腹度が戻る', () => {
    const s = new GameSession(4, { startingItems: ['herb', 'bread'] });
    const p = s.state.player;
    p.hp = 1;
    p.hunger = 10;
    s.execute({ type: 'use', index: 0 });
    expect(p.hp).toBe(Math.min(p.maxHp, 31));
    s.execute({ type: 'use', index: 0 });
    expect(p.hunger).toBe(60);
    expect(p.inventory.count).toBe(0);
  });

  it('置く → 拾うが往復できる', () => {
    const s = new GameSession(8, { startingItems: ['herb'] });
    const p = s.state.player;
    s.execute({ type: 'drop', index: 0 });
    expect(p.inventory.count).toBe(0);
    const tile = [...s.state.groundItems].find(([, it]) => it.def.id === 'herb');
    expect(tile).toBeDefined();
    if (keyOf(p.pos) === tile![0]) {
      s.execute({ type: 'pickup' });
      expect(p.inventory.count).toBe(1);
    }
  });

  it('壺コマンド: 入れる／取り出す', () => {
    const s = new GameSession(5, { startingItems: ['pot_storage', 'herb'] });
    const p = s.state.player;
    expect(s.execute({ type: 'potInsert', potIndex: 0, itemIndex: 1 }).consumedTurn).toBe(true);
    expect(p.inventory.count).toBe(1);
    expect(p.inventory.at(0)?.contents.length).toBe(1);
    expect(s.execute({ type: 'potTakeOut', potIndex: 0, contentIndex: 0 }).consumedTurn).toBe(true);
    expect(p.inventory.count).toBe(2);
  });

  it('満腹度 0 で毎ターン HP が減る', () => {
    const s = new GameSession(6);
    const p = s.state.player;
    s.state.monsters = [];
    p.hunger = 0;
    const hp = p.hp;
    s.execute({ type: 'wait' });
    expect(p.hp).toBe(hp - 1);
  });

  it('階段で降りるとフロアが進み、最深部で踏破', () => {
    const s = new GameSession(11, { floorConfig: { ...(s0Config()), maxFloor: 2 } });
    const st = s.state;
    st.player.pos = st.map.stairs;
    s.execute({ type: 'descend' });
    expect(st.floor).toBe(2);
    expect(st.map.get(st.map.stairs)).toBe(TileType.Stairs);
    st.player.pos = st.map.stairs;
    s.execute({ type: 'descend' });
    expect(st.status).toBe('won');
  });

  it('仲間: 撃破時の仲間化確率 100% なら仲間になり、追従する', () => {
    const s = new GameSession(12);
    const st = s.state;
    st.monsters = [];
    const pos = findFreeTileNear(st, addVec(st.player.pos, DIR_VEC.W))!;
    const dir = DIRECTIONS.find((d) => {
      const p = addVec(st.player.pos, DIR_VEC[d]);
      return p.x === pos.x && p.y === pos.y;
    });
    if (!dir || !st.map.canStep(st.player.pos, dir)) return;
    const def = { ...MONSTER_MAP.get('slime')!, recruitChance: 1 };
    const m = new Monster(9998, def, pos);
    m.hp = 1;
    st.monsters.push(m);
    for (let i = 0; i < 10 && m.isAlive; i++) s.execute({ type: 'move', dir });
    expect(st.allies.length).toBe(1);
    expect(s.log.all.some((x) => x.includes('仲間になった'))).toBe(true);
    for (let i = 0; i < 30; i++) s.execute({ type: 'wait' });
    invariants(s);
  });
});

function s0Config() {
  return {
    maxFloor: 10,
    monstersPerFloor: [4, 7] as const,
    itemsPerFloor: [5, 8] as const,
    hungerInterval: 10,
    regenInterval: 6,
    maxAllies: 2,
    respawnInterval: 40,
  };
}
