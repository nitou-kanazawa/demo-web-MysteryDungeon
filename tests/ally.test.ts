import { describe, expect, it } from 'vitest';
import { Ally } from '../src/domain/entity/Ally';
import { Monster } from '../src/domain/entity/Monster';
import { MONSTER_MAP } from '../src/domain/data/monsters';
import { SKILL_MAP } from '../src/domain/data/skills';
import { GameSession } from '../src/domain/game/GameSession';
import { SeededRng } from '../src/domain/core/Rng';
import { DIRECTIONS, DIR_VEC, addVec, chebyshev } from '../src/domain/core/Vec2';
import { findFreeTileNear } from '../src/domain/game/Placement';
import { DEFAULT_HOME_CONFIG, HomeBase } from '../src/domain/base/HomeBase';
import { Campaign } from '../src/domain/base/Campaign';
import { AllyAI } from '../src/domain/ai/AllyAI';
import { MonsterAI } from '../src/domain/ai/MonsterAI';

const slime = MONSTER_MAP.get('slime')!;
const chimaera = MONSTER_MAP.get('chimaera')!;

/** プレイヤーの隣（歩ける方向）にアクターを置くための座標と方向 */
function adjacentTo(s: GameSession, preferred: 'E' | 'W' = 'E') {
  const st = s.state;
  const pos = findFreeTileNear(st, addVec(st.player.pos, DIR_VEC[preferred]))!;
  const dir = DIRECTIONS.find((d) => {
    const p = addVec(st.player.pos, DIR_VEC[d]);
    return p.x === pos.x && p.y === pos.y && st.map.canStep(st.player.pos, d);
  });
  return { pos, dir };
}

describe('Ally', () => {
  it('種族・レベル・配合ボーナスからステータスが決まり、レベルで特技を覚える', () => {
    const a = new Ally(1, slime, { x: 0, y: 0 }, { level: 1, exp: 0, bonusHp: 5, bonusAtk: 2, bonusDef: 1 });
    expect(a.maxHp).toBe(slime.hp + 5);
    expect(a.atk).toBe(slime.atk + 2);
    expect(a.def).toBe(slime.def + 1);
    expect(a.skills.map((s) => s.id)).toEqual([]);
    a.gainExp(1000);
    expect(a.level).toBeGreaterThanOrEqual(2);
    expect(a.skills.map((s) => s.id)).toEqual(['hoimi']);
    expect(a.skillsLearnedAt(2).map((s) => s.id)).toEqual(['hoimi']);
  });

  it('スナップショットに往復できる', () => {
    const a = new Ally(1, chimaera, { x: 0, y: 0 }, { uid: 'a7', level: 4, exp: 3, bonusHp: 1, bonusAtk: 0, bonusDef: 2 });
    const snap = a.toSnapshot();
    expect(snap).toEqual({ uid: 'a7', defId: 'chimaera', level: 4, exp: 3, bonusHp: 1, bonusAtk: 0, bonusDef: 2 });
    const b = new Ally(2, chimaera, { x: 1, y: 1 }, snap);
    expect(b.recordId).toBe('a7');
    expect(b.maxHp).toBe(a.maxHp);
  });

  it('クールダウンはターンで回復する', () => {
    const a = new Ally(1, slime, { x: 0, y: 0 });
    expect(a.isSkillReady('hoimi')).toBe(true);
    a.setCooldown('hoimi', 2);
    expect(a.isSkillReady('hoimi')).toBe(false);
    a.tickCooldowns();
    expect(a.isSkillReady('hoimi')).toBe(false);
    a.tickCooldowns();
    expect(a.isSkillReady('hoimi')).toBe(true);
  });
});

describe('特技', () => {
  it('ホイミ: 傷ついた主人公を回復する（仲間 AI が選ぶ）', () => {
    const s = new GameSession(31);
    const st = s.state;
    st.monsters = [];
    const { pos } = adjacentTo(s);
    const ally = new Ally(999, MONSTER_MAP.get('shebeth')!, pos);
    st.allies.push(ally);
    st.player.hp = 1;
    s.execute({ type: 'wait' });
    expect(st.player.hp).toBeGreaterThan(1);
    expect(s.log.all.some((m) => m.includes('ホイミ'))).toBe(true);
    expect(ally.isSkillReady('hoimi')).toBe(false);
  });

  it('火の息: 直線上の敵にダメージ（敵 AI も使う）', () => {
    const s = new GameSession(32);
    const st = s.state;
    st.monsters = [];
    // プレイヤーの東 2 マスにキメラ（直線・射程内）
    const p2 = addVec(st.player.pos, { x: 2, y: 0 });
    if (!st.map.isWalkable(p2) || !st.map.canStep(st.player.pos, 'E') || !st.map.canStep(addVec(st.player.pos, DIR_VEC.E), 'E')) return;
    const m = new Monster(998, chimaera, p2);
    st.monsters.push(m);
    const hp = st.player.hp;
    s.execute({ type: 'wait' });
    expect(s.log.all.some((x) => x.includes('火の息'))).toBe(true);
    expect(st.player.hp).toBeLessThanOrEqual(hp - SKILL_MAP.get('fire_breath')!.power + 0);
  });

  it('すいとる: 与えたダメージの半分を回復する', () => {
    const s = new GameSession(33);
    const st = s.state;
    st.monsters = [];
    const { pos } = adjacentTo(s);
    const m = new Monster(997, MONSTER_MAP.get('dracky')!, pos);
    m.hp = 1;
    m.maxHp = 50;
    st.monsters.push(m);
    st.player.hp = st.player.maxHp;
    s.execute({ type: 'wait' });
    expect(s.log.all.some((x) => x.includes('すいとる'))).toBe(true);
    expect(m.hp).toBeGreaterThan(1);
  });

  it('痛恨の一撃: 通常より大きいダメージ', () => {
    const s = new GameSession(34);
    const st = s.state;
    st.monsters = [];
    const { pos } = adjacentTo(s);
    const m = new Monster(996, MONSTER_MAP.get('golem')!, pos);
    st.monsters.push(m);
    st.player.hp = 500;
    st.player.maxHp = 500;
    s.execute({ type: 'wait' });
    expect(s.log.all.some((x) => x.includes('痛恨の一撃'))).toBe(true);
    const dmg = 500 - st.player.hp;
    // 通常ダメージの上限 (14 - 0.5) * 1.125 ≈ 15 を超える
    expect(dmg).toBeGreaterThan(15);
  });
});

describe('作戦', () => {
  function setup(seed: number) {
    const s = new GameSession(seed);
    const st = s.state;
    st.monsters = [];
    const { pos } = adjacentTo(s, 'W');
    const ally = new Ally(995, slime, pos, { level: 1, exp: 0, bonusHp: 0, bonusAtk: 0, bonusDef: 0 });
    st.allies.push(ally);
    // 部屋の中で 4 マス離れた敵
    const room = st.map.roomAt(st.player.pos)!;
    const far = [...room.tiles()].find((t) => chebyshev(t, st.player.pos) === 4 && !st.isOccupied(t));
    return { s, st, ally, far };
  }

  it('ついてこい: 離れた敵を追わず主人公のそばに留まる', () => {
    const { s, st, ally, far } = setup(35);
    if (!far) return;
    st.monsters.push(new Monster(994, MONSTER_MAP.get('slime')!, far));
    s.execute({ type: 'tactic', tactic: 'follow' });
    const ai = new AllyAI();
    const act = ai.decide(ally, st, new SeededRng(1), 'follow');
    expect(act.type === 'attack' || act.type === 'skill').toBe(false);
    if (act.type === 'move') {
      const next = addVec(ally.pos, DIR_VEC[act.dir]);
      expect(chebyshev(next, st.player.pos)).toBeLessThanOrEqual(1);
    }
  });

  it('ガンガンいこうぜ: 敵に向かって進む', () => {
    const { st, ally, far } = setup(36);
    if (!far) return;
    st.monsters.push(new Monster(993, MONSTER_MAP.get('slime')!, far));
    const act = new AllyAI().decide(ally, st, new SeededRng(1), 'aggressive');
    expect(act.type).toBe('move');
    if (act.type === 'move') {
      const next = addVec(ally.pos, DIR_VEC[act.dir]);
      expect(chebyshev(next, far)).toBeLessThan(chebyshev(ally.pos, far));
    }
  });

  it('いのちだいじに: HP が低いと隣接した敵から退く', () => {
    const s = new GameSession(37);
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    const center = room.center;
    st.player.pos = center;
    const ally = new Ally(992, slime, addVec(center, { x: 1, y: 0 }));
    ally.hp = 1;
    st.allies.push(ally);
    st.monsters.push(new Monster(991, MONSTER_MAP.get('slime')!, addVec(center, { x: 2, y: 0 })));
    const act = new AllyAI().decide(ally, st, new SeededRng(1), 'defensive');
    expect(act.type).toBe('move');
  });

  it('作戦コマンドはターンを消費せず、リプレイに残る', () => {
    const s = new GameSession(38);
    const r = s.execute({ type: 'tactic', tactic: 'defensive' });
    expect(r.consumedTurn).toBe(false);
    expect(s.state.tactic).toBe('defensive');
    expect(GameSession.replay(s.toReplay()).state.tactic).toBe('defensive');
  });
});

describe('仲間化', () => {
  it('撃破後に起き上がって仲間になる。最大 3 体まで', () => {
    const s = new GameSession(39);
    const st = s.state;
    st.monsters = [];
    for (let i = 0; i < 3; i++) st.allies.push(new Ally(900 + i, slime, findFreeTileNear(st, st.player.pos, 6)!));
    const { pos, dir } = adjacentTo(s);
    if (!dir) return;
    const def = { ...slime, recruitChance: 1 };
    const m = new Monster(989, def, pos);
    m.hp = 1;
    st.monsters.push(m);
    for (let i = 0; i < 10 && m.isAlive; i++) s.execute({ type: 'move', dir });
    expect(st.allies.length).toBe(3); // 満員なので増えない

    st.allies.pop();
    const m2 = new Monster(988, def, findFreeTileNear(st, addVec(st.player.pos, DIR_VEC[dir]))!);
    m2.hp = 1;
    st.monsters.push(m2);
    for (let i = 0; i < 10 && m2.isAlive; i++) s.execute({ type: 'move', dir });
    expect(st.allies.length).toBe(3);
    expect(s.log.all.some((x) => x.includes('起き上がり'))).toBe(true);
    const joined = st.allies[2]!;
    expect(joined.joinedTurn).toBeGreaterThanOrEqual(0);
    expect(joined.recordId).toBeUndefined();
  });

  it('敵 AI は仲間も標的にする', () => {
    const s = new GameSession(40);
    const st = s.state;
    st.monsters = [];
    const room = st.map.roomAt(st.player.pos)!;
    const c = room.center;
    st.player.pos = addVec(c, { x: -2, y: 0 });
    const ally = new Ally(987, slime, c);
    st.allies.push(ally);
    const m = new Monster(986, MONSTER_MAP.get('hammerhood')!, addVec(c, { x: 1, y: 0 }));
    st.monsters.push(m);
    const act = new MonsterAI().decide(m, st, new SeededRng(1));
    expect((act.type === 'attack' || act.type === 'skill') && act.target === ally).toBe(true);
  });
});

describe('牧場と配合', () => {
  const snap = (defId: string, level = 1) => ({ defId, level, exp: 0, bonusHp: 0, bonusAtk: 0, bonusDef: 0 });

  it('牧場の定員と連れて行く上限', () => {
    const b = HomeBase.createNew({ ...DEFAULT_HOME_CONFIG, ranchCapacity: 2, partySize: 1 });
    expect(b.addAlly(snap('slime'))).toBeDefined();
    expect(b.addAlly(snap('dracky'))).toBeDefined();
    expect(b.addAlly(snap('slime'))).toBeUndefined();
    expect(b.toggleParty(0).ok).toBe(true);
    expect(b.toggleParty(1).ok).toBe(false);
    expect(b.partyCount).toBe(1);
    expect(b.release(0).ok).toBe(true);
    expect(b.allies.length).toBe(1);
  });

  it('配合: レシピがあれば新種族、なければランクの高い方。ボーナスを継承し両親は消える', () => {
    const b = HomeBase.createNew();
    b.addAlly(snap('slime', 4));
    b.addAlly(snap('slime', 4));
    const r = b.breed(0, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.defId).toBe('king_slime');
    expect(r.value.level).toBe(1);
    expect(r.value.bonusHp).toBe(2); // (4+4)/4
    expect(r.value.bonusAtk).toBe(1); // (4+4)/6
    expect(b.allies.length).toBe(1);
    expect(b.codex.monsters.has('king_slime')).toBe(true);

    b.addAlly(snap('ghost', 2)); // スライム系×ゾンビ系は系統レシピ無し → ランクの高い方
    const r2 = b.breed(0, 1);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.defId).toBe('king_slime'); // rank 5 > 2
    expect(b.allies.length).toBe(1);
    expect(b.breed(0, 0).ok).toBe(false);
  });

  it('JSON に保存・復元される', () => {
    const b = HomeBase.createNew();
    b.addAlly(snap('chimaera', 3), true);
    const r = HomeBase.fromJSON(JSON.parse(JSON.stringify(b.toJSON())));
    expect(r.allies).toEqual(b.allies);
    expect(r.addAlly(snap('slime'))?.uid).toBe('a2');
  });
});

describe('出撃と帰還（仲間）', () => {
  const snap = (defId: string, level = 1) => ({ defId, level, exp: 0, bonusHp: 0, bonusAtk: 0, bonusDef: 0 });

  it('連れて行った仲間がダンジョンに現れ、帰還で成長が書き戻される', () => {
    const b = HomeBase.createNew();
    b.addAlly(snap('slime', 2), true);
    b.addAlly(snap('dracky', 1), false);
    const c = new Campaign(b);
    const s = c.startSortie(41);
    expect(s.state.allies.length).toBe(1);
    expect(s.state.allies[0]!.definition.id).toBe('slime');
    expect(s.state.allies[0]!.recordId).toBe('a1');
    expect(chebyshev(s.state.allies[0]!.pos, s.state.player.pos)).toBeLessThanOrEqual(6);
    s.state.allies[0]!.gainExp(1000);
    const lv = s.state.allies[0]!.level;
    s.state.status = 'escaped';
    const r = c.endSortie(s);
    expect(r.status).toBe('escaped');
    expect(b.findAlly('a1')?.level).toBe(lv);
    expect(b.allies.length).toBe(2);
  });

  it('道中で仲間にした魔物は牧場に加わり、戦死した仲間は消える', () => {
    const b = HomeBase.createNew();
    b.addAlly(snap('slime', 2), true);
    const c = new Campaign(b);
    const s = c.startSortie(42);
    s.state.allies[0]!.hp = 0; // 戦死
    s.state.removeDeadMonsters();
    s.state.allies.push(new Ally(555, chimaera, s.state.player.pos));
    s.state.status = 'won';
    const r = c.endSortie(s);
    expect(r.allyNotes.some((n) => n.includes('帰ってこなかった'))).toBe(true);
    expect(r.allyNotes.some((n) => n.includes('牧場に加わった'))).toBe(true);
    expect(b.allies.map((a) => a.defId)).toEqual(['chimaera']);
  });

  it('死亡時は牧場の記録が出撃前のまま残る', () => {
    const b = HomeBase.createNew();
    b.addAlly(snap('slime', 2), true);
    const c = new Campaign(b);
    const s = c.startSortie(43);
    s.state.allies[0]!.gainExp(1000);
    s.state.allies.push(new Ally(556, chimaera, s.state.player.pos));
    s.state.status = 'dead';
    c.endSortie(s);
    expect(b.allies.length).toBe(1);
    expect(b.allies[0]!.level).toBe(2);
  });

  it('連れて行った仲間込みでリプレイが再現できる', () => {
    const b = HomeBase.createNew();
    b.addAlly(snap('slime', 3), true);
    const c = new Campaign(b);
    const s = c.startSortie(44);
    for (let i = 0; i < 40; i++) s.execute({ type: 'move', dir: i % 2 ? 'E' : 'S' });
    const r = GameSession.replay(s.toReplay());
    expect(r.state.allies.map((a) => [a.definition.id, a.level, a.hp])).toEqual(
      s.state.allies.map((a) => [a.definition.id, a.level, a.hp]),
    );
    expect(r.log.all).toEqual(s.log.all);
  });
});
