import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/domain/game/GameSession';
import { DIRECTIONS, DIR_VEC, addVec } from '../src/domain/core/Vec2';
import { Monster } from '../src/domain/entity/Monster';
import { MONSTER_MAP } from '../src/domain/data/monsters';
import { findFreeTileNear } from '../src/domain/game/Placement';

function adjacent(s: GameSession) {
  const st = s.state;
  for (const d of DIRECTIONS) {
    const p = addVec(st.player.pos, DIR_VEC[d]);
    if (st.map.canStep(st.player.pos, d) && !st.isOccupied(p) && !st.itemAt(p) && !st.featureAt(p)) return { p, d };
  }
  return undefined;
}

describe('演出イベント（VisualSink）', () => {
  it('移動すると move イベントが出て、drain すると空になる', () => {
    const s = new GameSession(400);
    s.state.monsters = [];
    const n = adjacent(s)!;
    s.execute({ type: 'move', dir: n.d });
    const evs = s.visuals.drain();
    const move = evs.find((e) => e.type === 'move');
    expect(move && move.type === 'move' && move.actorId).toBe(s.state.player.id);
    expect(s.visuals.drain().length).toBe(0);
  });

  it('攻撃すると attack → damage（または miss）→ 撃破で death が出る', () => {
    const s = new GameSession(401);
    const st = s.state;
    st.monsters = [];
    const n = adjacent(s)!;
    const m = new Monster(1200, MONSTER_MAP.get('slime')!, n.p);
    m.hp = 1;
    st.monsters.push(m);
    st.player.baseAtk = 999;
    for (let i = 0; i < 10 && m.isAlive; i++) s.execute({ type: 'move', dir: n.d });
    const types = s.visuals.drain().map((e) => e.type);
    expect(types).toContain('attack');
    expect(types.some((t) => t === 'damage' || t === 'miss')).toBe(true);
    expect(types).toContain('death');
    expect(types.indexOf('attack')).toBeLessThan(types.indexOf('death'));
  });

  it('投げると projectile(item)、杖を振ると projectile(bolt)、階段で floor', () => {
    const s = new GameSession(402, { startingItems: ['herb', 'staff_thunder'] });
    const st = s.state;
    st.monsters = [];
    st.player.facing = 'E';
    s.execute({ type: 'throw', index: 0 });
    let evs = s.visuals.drain();
    expect(evs.some((e) => e.type === 'projectile' && e.kind === 'item' && e.itemDefId === 'herb')).toBe(true);
    s.execute({ type: 'use', index: 0 });
    evs = s.visuals.drain();
    expect(evs.some((e) => e.type === 'projectile' && e.kind === 'bolt')).toBe(true);
    st.player.pos = st.map.stairs;
    s.execute({ type: 'descend' });
    expect(s.visuals.drain().some((e) => e.type === 'floor')).toBe(true);
  });

  it('回復・仲間化・レベルアップはポップアップになる', () => {
    const s = new GameSession(403, { startingItems: ['herb'] });
    const st = s.state;
    st.monsters = [];
    st.player.hp = 1;
    s.execute({ type: 'use', index: 0 });
    expect(s.visuals.drain().some((e) => e.type === 'heal')).toBe(true);
    const n = adjacent(s)!;
    const m = new Monster(1201, { ...MONSTER_MAP.get('slime')!, recruitChance: 1, exp: 1000 }, n.p);
    m.hp = 1;
    st.monsters.push(m);
    st.player.baseAtk = 999;
    for (let i = 0; i < 10 && m.isAlive; i++) s.execute({ type: 'move', dir: n.d });
    const popups = s.visuals.drain().filter((e) => e.type === 'popup').map((e) => (e.type === 'popup' ? e.text : ''));
    expect(popups.some((t) => t.includes('LEVEL UP'))).toBe(true);
    expect(popups.some((t) => t.includes('仲間になった'))).toBe(true);
  });

  it('演出イベントはロジックに影響しない（リプレイ結果が同じ）', () => {
    const s = new GameSession(404);
    for (let i = 0; i < 30; i++) s.execute({ type: 'move', dir: i % 2 ? 'E' : 'S' });
    s.visuals.drain();
    const r = GameSession.replay(s.toReplay());
    expect(r.state.player.pos).toEqual(s.state.player.pos);
    expect(r.log.all).toEqual(s.log.all);
    void findFreeTileNear;
  });
});
