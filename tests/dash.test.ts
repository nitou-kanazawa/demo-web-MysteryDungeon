import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { DashRunner } from '../src/domain/game/Dash';
import { TileType } from '../src/domain/map/Tile';
import { DIRECTIONS, type Direction, type Vec2 } from '../src/domain/core/Vec2';
import { Monster } from '../src/domain/entity/Monster';
import { MONSTER_MAP } from '../src/domain/data/monsters';

/** 通路タイルのうち、隣接する歩行可能マスが 2 つ（一本道の途中）のものを探す */
function findCorridorSpot(s: GameSession): { pos: Vec2; dir: Direction } | undefined {
  const m = s.state.map;
  for (const p of m.walkableTiles()) {
    if (m.get(p) !== TileType.Corridor) continue;
    const exits = DIRECTIONS.filter((d) => d.length === 1 && m.canStep(p, d));
    if (exits.length === 2) return { pos: p, dir: exits[0]! };
  }
  return undefined;
}

describe('通路ダッシュ', () => {
  it('一本道の通路を曲がり角も含めて追従し、部屋の出入口か分岐で止まる', () => {
    let checked = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = new GameSession(seed);
      const st = s.state;
      st.monsters = [];
      const spot = findCorridorSpot(s);
      if (!spot) continue;
      st.player.pos = spot.pos;
      st.visibility.update(spot.pos);
      const runner = new DashRunner(s);
      runner.start(spot.dir);
      let steps = 0;
      while (runner.step()) steps++;
      steps++;
      expect(runner.isRunning).toBe(false);
      expect(steps).toBeGreaterThanOrEqual(1);
      // 停止位置は「部屋の床」「分岐（3 方向以上）」「行き止まり」のどれか
      const p = st.player.pos;
      const tile = st.map.get(p);
      const exits = DIRECTIONS.filter((d) => st.map.canStep(p, d)).length;
      const valid = tile !== TileType.Corridor || exits >= 3 || exits === 1 || s.log.all.length > 1;
      expect(valid).toBe(true);
      // 全部 move コマンドとして記録されている
      expect(s.history.every((c) => c.type === 'move')).toBe(true);
      expect(s.history.length).toBe(steps);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('敵が見えていると走り出さない', () => {
    const s = new GameSession(3);
    const st = s.state;
    const room = st.map.roomAt(st.player.pos)!;
    const free = [...room.tiles()].find((t) => !st.isOccupied(t) && t.x !== st.player.pos.x)!;
    st.monsters = [new Monster(900, MONSTER_MAP.get('slime')!, free)];
    st.visibility.update(st.player.pos);
    const runner = new DashRunner(s);
    runner.start('E');
    expect(runner.step()).toBe(false);
    expect(s.history.length).toBe(0);
  });

  it('コマンドだけで進むので、リプレイで同じ位置に着く', () => {
    const s = new GameSession(4);
    s.state.monsters = [];
    const runner = new DashRunner(s);
    const dir = DIRECTIONS.find((d) => s.state.map.canStep(s.state.player.pos, d)) ?? 'E';
    runner.start(dir);
    while (runner.step()) {
      /* 止まるまで */
    }
    expect(runner.isRunning).toBe(false);
    expect(s.history.length).toBeGreaterThan(0);
    const r = GameSession.replay(s.toReplay());
    expect(r.state.player.pos).toEqual(s.state.player.pos);
    expect(r.state.turn).toBe(s.state.turn);
  });
});

describe('持ち物の整頓', () => {
  it('装備中 → 種類順 → 名前 → 修正値の順に並び、ターンを消費しない', () => {
    const snap = (id: string, plus = 0) => ({ id, ...(plus ? { plus } : {}) });
    const startingInventory = [
      snap('herb'), snap('bread'), snap('iron_sword'), snap('copper_sword', 1), snap('scale_shield'),
      snap('pot_storage'), snap('staff_blow'), snap('copper_sword', 3), snap('scroll_light'), snap('iron_lump'),
    ];
    const s = new GameSession(5, { startingInventory });
    const p = s.state.player;
    s.execute({ type: 'equip', index: 4 }); // うろこのたて
    const turn = s.state.turn;
    const r = s.execute({ type: 'sort' });
    expect(r.consumedTurn).toBe(false);
    expect(s.state.turn).toBe(turn);
    expect(p.inventory.items.map((i) => i.displayName)).toEqual([
      'うろこのたて',
      'てつのつるぎ',
      'どうのつるぎ+3',
      'どうのつるぎ+1',
      'ふきとばしの杖[5]',
      '保存の壺[0/4]',
      'やくそう',
      'パン',
      'あかりの巻物',
      'てつのかたまり',
    ]);
    expect(p.shield?.def.id).toBe('scale_shield');
    // 初期所持品はリプレイに含まれるので、整頓後の並びも再現される
    const rep = GameSession.replay(s.toReplay());
    expect(rep.state.player.inventory.items.map((i) => i.displayName)).toEqual(p.inventory.items.map((i) => i.displayName));
    expect(rep.state.player.shield?.def.id).toBe('scale_shield');
  });
});
